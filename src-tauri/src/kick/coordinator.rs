use crate::kick::models::{KickSlotNotification, KickStreamerStats, MiningSlotState};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex};

/// Na Kick, o coordenador permite o acúmulo de watch time e pontos para até 2 lives simultâneas por conta.
pub const MAX_CONCURRENT_KICK_SLOTS_PER_ACCOUNT: usize = 2;

#[derive(Default)]
struct KickAccountState {
    streamers: Vec<KickStreamerStats>,
    listeners: HashMap<String, mpsc::UnboundedSender<KickSlotNotification>>,
    last_sent: HashMap<String, (MiningSlotState, usize, bool)>,
    priority_overrides: HashMap<String, bool>,
}

/// Calcula a ordem de prioridade (do 1º ao último):
/// 1º: lives marcadas manualmente como prioritárias (`is_priority == true`)
/// 2º: média de tempo online decrescente (`avg_duration_hours`)
/// 3º: ordem alfabética de `channel_slug` para desempate determinístico
pub fn compute_kick_priority_ranks(streamers: &mut [KickStreamerStats]) {
    streamers.sort_by(|a, b| {
        b.is_priority
            .cmp(&a.is_priority)
            .then_with(|| {
                b.avg_duration_hours
                    .partial_cmp(&a.avg_duration_hours)
                    .unwrap_or(std::cmp::Ordering::Equal)
            })
            .then_with(|| a.channel_slug.cmp(&b.channel_slug))
    });

    // Atribui o rank (1 para o mais prioritário, até N)
    for (idx, streamer) in streamers.iter_mut().enumerate() {
        streamer.priority_rank = idx + 1;
    }
}

/// Reconcilia os slots de mineração para uma conta Kick:
/// - As lives top 2 na prioridade (dentre as que estão ONLINE) contam pontos (`ActiveMining`)
/// - Demais lives online aguardam vaga em `StandbyVigil` sem consumir conexão de viewer
/// - Lives offline permanecem em `Offline`
pub fn reconcile_kick_account_slots(
    streamers: &[KickStreamerStats],
) -> HashMap<String, MiningSlotState> {
    let mut states = HashMap::new();

    // Filtra apenas os streamers que estão online
    let mut online_streamers: Vec<&KickStreamerStats> = streamers
        .iter()
        .filter(|s| s.is_live)
        .collect();

    // Ordena os online pelo rank de prioridade (rank 1, 2, 3...)
    online_streamers.sort_by_key(|s| s.priority_rank);

    // Identifica os slugs dos top 2 online na Kick
    let active_slugs: Vec<String> = online_streamers
        .iter()
        .take(MAX_CONCURRENT_KICK_SLOTS_PER_ACCOUNT)
        .map(|s| s.channel_slug.clone())
        .collect();

    for streamer in streamers {
        let state = if !streamer.is_live {
            MiningSlotState::Offline
        } else if active_slugs.contains(&streamer.channel_slug) {
            MiningSlotState::ActiveMining
        } else {
            MiningSlotState::StandbyVigil
        };

        states.insert(streamer.channel_slug.clone(), state);
    }

    states
}

/// Coordenador thread-safe compartilhado para gerenciar as prioridades por conta na Kick
#[derive(Clone, Default)]
pub struct KickPriorityCoordinator {
    inner: Arc<Mutex<HashMap<String, KickAccountState>>>,
}

impl KickPriorityCoordinator {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Registra um canal de escuta para um streamer de determinada conta
    pub async fn register_listener(
        &self,
        account_id: &str,
        channel_slug: &str,
        sender: mpsc::UnboundedSender<KickSlotNotification>,
    ) {
        let mut map = self.inner.lock().await;
        let acc_state = map.entry(account_id.to_string()).or_default();
        let clean = channel_slug.to_lowercase();
        acc_state.listeners.insert(clean.clone(), sender);
        acc_state.last_sent.remove(&clean);
    }

    fn recompute_and_notify(acc_state: &mut KickAccountState) -> HashMap<String, MiningSlotState> {
        compute_kick_priority_ranks(&mut acc_state.streamers);
        let slot_states = reconcile_kick_account_slots(&acc_state.streamers);

        for streamer in acc_state.streamers.iter() {
            let slug = &streamer.channel_slug;
            let current_state = *slot_states.get(slug).unwrap_or(&MiningSlotState::Offline);
            let current_rank = streamer.priority_rank;
            let current_priority = streamer.is_priority;
            let now = (current_state, current_rank, current_priority);

            if acc_state.last_sent.get(slug) != Some(&now) {
                acc_state.last_sent.insert(slug.clone(), now);
                if let Some(tx) = acc_state.listeners.get(slug) {
                    let _ = tx.send(KickSlotNotification {
                        slot_state: current_state,
                        priority_rank: current_rank,
                        is_priority: current_priority,
                    });
                }
            }
        }

        slot_states
    }

    /// Atualiza ou insere o status de um streamer para determinada conta e retorna:
    /// (Estado do slot: ActiveMining/StandbyVigil/Offline, Rank atual do streamer)
    /// Notifica imediatamente os listeners da conta caso haja alteração de rank, vaga ou prioridade
    pub async fn update_streamer_status(
        &self,
        account_id: &str,
        channel_slug: &str,
        channel_id: Option<String>,
        avg_hours: f64,
        is_live: bool,
        points: Option<i64>,
        is_priority: bool,
    ) -> (MiningSlotState, usize) {
        let mut map = self.inner.lock().await;
        let acc_state = map.entry(account_id.to_string()).or_default();
        let clean_slug = channel_slug.to_lowercase();
        let effective_priority = acc_state
            .priority_overrides
            .get(&clean_slug)
            .copied()
            .unwrap_or(is_priority);

        if let Some(existing) = acc_state.streamers.iter_mut().find(|s| s.channel_slug == clean_slug) {
            existing.avg_duration_hours = avg_hours;
            existing.is_live = is_live;
            existing.is_priority = effective_priority;
            if channel_id.is_some() {
                existing.channel_id = channel_id;
            }
            if points.is_some() {
                existing.current_points = points;
            }
        } else {
            let next_rank = acc_state.streamers.len() + 1;
            acc_state.streamers.push(KickStreamerStats {
                channel_slug: clean_slug.clone(),
                channel_id,
                avg_duration_hours: avg_hours,
                priority_rank: next_rank,
                is_live,
                current_points: points,
                is_priority: effective_priority,
            });
        }

        let slot_states = Self::recompute_and_notify(acc_state);

        let my_state = *slot_states
            .get(&clean_slug)
            .unwrap_or(&MiningSlotState::Offline);
        let my_rank = acc_state
            .streamers
            .iter()
            .find(|s| s.channel_slug == clean_slug)
            .map(|s| s.priority_rank)
            .unwrap_or(1);

        (my_state, my_rank)
    }

    /// Atualiza a flag de prioridade manual de um streamer em tempo real e notifica todos os watchers afetados
    pub async fn set_streamer_priority(
        &self,
        account_id: &str,
        channel_slug: &str,
        is_priority: bool,
    ) {
        let mut map = self.inner.lock().await;
        let acc_state = map.entry(account_id.to_string()).or_default();
        let clean_slug = channel_slug.to_lowercase();
        acc_state.priority_overrides.insert(clean_slug.clone(), is_priority);

        if let Some(existing) = acc_state.streamers.iter_mut().find(|s| s.channel_slug == clean_slug) {
            existing.is_priority = is_priority;
            Self::recompute_and_notify(acc_state);
        }
    }

    /// Remove um streamer da lista de monitoramento da conta e re-reconcilia vagas
    pub async fn remove_streamer(&self, account_id: &str, channel_slug: &str) {
        let mut map = self.inner.lock().await;
        if let Some(acc_state) = map.get_mut(account_id) {
            let clean_slug = channel_slug.to_lowercase();
            acc_state.listeners.remove(&clean_slug);
            acc_state.last_sent.remove(&clean_slug);
            acc_state.priority_overrides.remove(&clean_slug);
            acc_state.streamers.retain(|s| s.channel_slug != clean_slug);

            Self::recompute_and_notify(acc_state);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_kick_priority_ranks_descending() {
        let mut streamers = vec![
            KickStreamerStats {
                channel_slug: "streamer_a".into(),
                channel_id: None,
                avg_duration_hours: 2.5,
                priority_rank: 0,
                is_live: true,
                current_points: None,
                is_priority: false,
            },
            KickStreamerStats {
                channel_slug: "streamer_b".into(),
                channel_id: None,
                avg_duration_hours: 8.0,
                priority_rank: 0,
                is_live: true,
                current_points: None,
                is_priority: false,
            },
            KickStreamerStats {
                channel_slug: "streamer_c".into(),
                channel_id: None,
                avg_duration_hours: 5.0,
                priority_rank: 0,
                is_live: false,
                current_points: None,
                is_priority: false,
            },
        ];

        compute_kick_priority_ranks(&mut streamers);

        // Deve ordenar: B (8.0h) -> Rank 1, C (5.0h) -> Rank 2, A (2.5h) -> Rank 3
        assert_eq!(streamers[0].channel_slug, "streamer_b");
        assert_eq!(streamers[0].priority_rank, 1);

        assert_eq!(streamers[1].channel_slug, "streamer_c");
        assert_eq!(streamers[1].priority_rank, 2);

        assert_eq!(streamers[2].channel_slug, "streamer_a");
        assert_eq!(streamers[2].priority_rank, 3);
    }

    #[test]
    fn test_kick_reconcile_dual_active_slots() {
        let mut streamers = vec![
            KickStreamerStats {
                channel_slug: "streamer_1".into(),
                channel_id: None,
                avg_duration_hours: 10.0,
                priority_rank: 1,
                is_live: true,
                current_points: None,
                is_priority: false,
            },
            KickStreamerStats {
                channel_slug: "streamer_2".into(),
                channel_id: None,
                avg_duration_hours: 7.0,
                priority_rank: 2,
                is_live: true,
                current_points: None,
                is_priority: false,
            },
            KickStreamerStats {
                channel_slug: "streamer_3".into(),
                channel_id: None,
                avg_duration_hours: 4.0,
                priority_rank: 3,
                is_live: true,
                current_points: None,
                is_priority: false,
            },
            KickStreamerStats {
                channel_slug: "streamer_4".into(),
                channel_id: None,
                avg_duration_hours: 2.0,
                priority_rank: 4,
                is_live: false,
                current_points: None,
                is_priority: false,
            },
        ];

        let states = reconcile_kick_account_slots(&streamers);

        // streamer_1 (Rank 1 e online) -> ActiveMining
        assert_eq!(states.get("streamer_1"), Some(&MiningSlotState::ActiveMining));
        // streamer_2 (Rank 2 e online) -> ActiveMining (2 slots simultâneos)
        assert_eq!(states.get("streamer_2"), Some(&MiningSlotState::ActiveMining));
        // streamer_3 (Rank 3 e online) -> StandbyVigil (Aguardando vaga no Top 2)
        assert_eq!(states.get("streamer_3"), Some(&MiningSlotState::StandbyVigil));
        // streamer_4 (offline) -> Offline
        assert_eq!(states.get("streamer_4"), Some(&MiningSlotState::Offline));

        // Se streamer_1 cair (offline):
        streamers[0].is_live = false;
        let states_after = reconcile_kick_account_slots(&streamers);

        // streamer_1 -> Offline
        assert_eq!(states_after.get("streamer_1"), Some(&MiningSlotState::Offline));
        // streamer_2 continua em ActiveMining
        assert_eq!(states_after.get("streamer_2"), Some(&MiningSlotState::ActiveMining));
        // streamer_3 é promovido imediatamente para ActiveMining!
        assert_eq!(states_after.get("streamer_3"), Some(&MiningSlotState::ActiveMining));
    }

    #[tokio::test]
    async fn test_kick_manual_priority_and_realtime_switch() {
        let coordinator = KickPriorityCoordinator::new();
        let (tx_low, mut rx_low) = tokio::sync::mpsc::unbounded_channel();
        coordinator.register_listener("acc_kick", "kick_low", tx_low).await;

        coordinator
            .update_streamer_status("acc_kick", "kick_12h", None, 12.0, true, None, false)
            .await;
        coordinator
            .update_streamer_status("acc_kick", "kick_8h", None, 8.0, true, None, false)
            .await;
        let (state_low, rank_low) = coordinator
            .update_streamer_status("acc_kick", "kick_low", None, 1.5, true, None, false)
            .await;
        assert_eq!(state_low, MiningSlotState::StandbyVigil);
        assert_eq!(rank_low, 3);
        let _ = rx_low.try_recv(); // consome notificação inicial

        // Marca kick_low como prioritária em tempo real
        coordinator.set_streamer_priority("acc_kick", "kick_low", true).await;
        let notif = rx_low.recv().await.expect("kick_low deve ser promovida");
        assert_eq!(notif.slot_state, MiningSlotState::ActiveMining);
        assert_eq!(notif.priority_rank, 1);
        assert!(notif.is_priority);

        // Se ficar offline, volta para Offline e libera vaga
        let (off_state, _) = coordinator
            .update_streamer_status("acc_kick", "kick_low", None, 1.5, false, None, true)
            .await;
        assert_eq!(off_state, MiningSlotState::Offline);
    }
}
