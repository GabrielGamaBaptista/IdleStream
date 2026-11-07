use crate::twitch::models::{MiningSlotState, TwitchStreamerStats};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex};

pub const MAX_CONCURRENT_ACTIVE_SLOTS_PER_ACCOUNT: usize = 2;

/// Notificação reativa enviada para os watchers quando a prioridade ou estado do slot muda
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct StreamerSlotNotification {
    pub slot_state: MiningSlotState,
    pub priority_rank: usize,
}

#[derive(Default)]
struct AccountState {
    streamers: Vec<TwitchStreamerStats>,
    listeners: HashMap<String, mpsc::UnboundedSender<StreamerSlotNotification>>,
    last_sent: HashMap<String, (MiningSlotState, usize)>,
}

/// Calcula a ordem de prioridade (do 1º ao último) com base na média de tempo online
pub fn compute_priority_ranks(streamers: &mut [TwitchStreamerStats]) {
    // Ordena do maior tempo médio para o menor (decrescente)
    streamers.sort_by(|a, b| {
        b.avg_duration_hours
            .partial_cmp(&a.avg_duration_hours)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| a.channel_slug.cmp(&b.channel_slug))
    });

    // Atribui o rank (1 para o que mais fica online, até N)
    for (idx, streamer) in streamers.iter_mut().enumerate() {
        streamer.priority_rank = idx + 1;
    }
}

/// Reconcilia os slots de mineração para uma conta:
/// - Apenas as lives 1 e 2 na prioridade (dentre as que estão ONLINE) contam pontos (`ActiveMining`)
/// - Demais lives online aguardam vaga em `StandbyVigil`
/// - Lives offline permanecem em `Offline`
pub fn reconcile_account_slots(
    streamers: &[TwitchStreamerStats],
) -> HashMap<String, MiningSlotState> {
    let mut states = HashMap::new();

    // Filtra apenas os que estão online
    let mut online_streamers: Vec<&TwitchStreamerStats> = streamers
        .iter()
        .filter(|s| s.is_live)
        .collect();

    // Ordena os online pelo rank de prioridade (rank 1, 2, 3...)
    online_streamers.sort_by_key(|s| s.priority_rank);

    // Identifica os slugs dos top 2 online
    let active_slugs: Vec<String> = online_streamers
        .iter()
        .take(MAX_CONCURRENT_ACTIVE_SLOTS_PER_ACCOUNT)
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

/// Coordenador thread-safe compartilhado para gerenciar as prioridades por conta
#[derive(Clone, Default)]
pub struct AccountPriorityCoordinator {
    inner: Arc<Mutex<HashMap<String, AccountState>>>,
}

impl AccountPriorityCoordinator {
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
        sender: mpsc::UnboundedSender<StreamerSlotNotification>,
    ) {
        let mut map = self.inner.lock().await;
        let acc_state = map.entry(account_id.to_string()).or_default();
        let clean = channel_slug.to_lowercase();
        acc_state
            .listeners
            .insert(clean.clone(), sender);
        acc_state.last_sent.remove(&clean);
    }

    /// Atualiza ou insere o status de um streamer para determinada conta e retorna:
    /// (Estado do slot: ActiveMining/StandbyVigil/Offline, Rank atual do streamer)
    /// Notifica imediatamente os listeners da conta caso haja alteração de rank ou vaga
    pub async fn update_streamer_status(
        &self,
        account_id: &str,
        channel_slug: &str,
        channel_id: Option<String>,
        avg_hours: f64,
        is_live: bool,
        points: Option<i64>,
    ) -> (MiningSlotState, usize) {
        let mut map = self.inner.lock().await;
        let acc_state = map.entry(account_id.to_string()).or_default();
        let list = &mut acc_state.streamers;

        let clean_slug = channel_slug.to_lowercase();
        if let Some(existing) = list.iter_mut().find(|s| s.channel_slug == clean_slug) {
            existing.avg_duration_hours = avg_hours;
            existing.is_live = is_live;
            if channel_id.is_some() {
                existing.channel_id = channel_id;
            }
            if points.is_some() {
                existing.current_points = points;
            }
        } else {
            list.push(TwitchStreamerStats {
                channel_slug: clean_slug.clone(),
                channel_id,
                avg_duration_hours: avg_hours,
                priority_rank: list.len() + 1,
                is_live,
                current_points: points,
            });
        }

        // Recalcula ranks (1º ao último pela média de tempo online)
        compute_priority_ranks(list);

        // Reconcilia quem fica com vaga ativa (Top 2 online)
        let slot_states = reconcile_account_slots(list);

        // Notifica reativamente apenas peers cujo estado ou rank mudou
        for streamer in list.iter() {
            let state = slot_states
                .get(&streamer.channel_slug)
                .copied()
                .unwrap_or(MiningSlotState::Offline);
            let now = (state, streamer.priority_rank);
            let changed = acc_state.last_sent.get(&streamer.channel_slug) != Some(&now);
            acc_state.last_sent.insert(streamer.channel_slug.clone(), now);

            // Não notifica o próprio chamador (ele recebe o retorno direto)
            // e só notifica outros watchers se houver mudança real de estado/rank
            if changed && streamer.channel_slug != clean_slug {
                if let Some(tx) = acc_state.listeners.get(&streamer.channel_slug) {
                    let _ = tx.send(StreamerSlotNotification {
                        slot_state: state,
                        priority_rank: streamer.priority_rank,
                    });
                }
            }
        }

        let my_state = slot_states
            .get(&clean_slug)
            .copied()
            .unwrap_or(MiningSlotState::Offline);

        let my_rank = list
            .iter()
            .find(|s| s.channel_slug == clean_slug)
            .map(|s| s.priority_rank)
            .unwrap_or(1);

        (my_state, my_rank)
    }

    /// Remove um streamer da lista de monitoramento da conta e reprioriza os restantes instantaneamente
    pub async fn remove_streamer(&self, account_id: &str, channel_slug: &str) {
        let mut map = self.inner.lock().await;
        if let Some(acc_state) = map.get_mut(account_id) {
            let clean = channel_slug.to_lowercase();
            acc_state.streamers.retain(|s| s.channel_slug != clean);
            acc_state.listeners.remove(&clean);
            acc_state.last_sent.remove(&clean);
            compute_priority_ranks(&mut acc_state.streamers);
            let slot_states = reconcile_account_slots(&acc_state.streamers);

            // Notifica os streamers restantes apenas se o estado/rank mudou
            for streamer in acc_state.streamers.iter() {
                let state = slot_states
                    .get(&streamer.channel_slug)
                    .copied()
                    .unwrap_or(MiningSlotState::Offline);
                let now = (state, streamer.priority_rank);
                let changed = acc_state.last_sent.get(&streamer.channel_slug) != Some(&now);
                acc_state.last_sent.insert(streamer.channel_slug.clone(), now);

                if changed {
                    if let Some(tx) = acc_state.listeners.get(&streamer.channel_slug) {
                        let _ = tx.send(StreamerSlotNotification {
                            slot_state: state,
                            priority_rank: streamer.priority_rank,
                        });
                    }
                }
            }
        }
    }

    /// Retorna as estatísticas e rankings atuais de todos os streamers de uma conta
    pub async fn get_account_streamers(&self, account_id: &str) -> Vec<TwitchStreamerStats> {
        let map = self.inner.lock().await;
        map.get(account_id)
            .map(|a| a.streamers.clone())
            .unwrap_or_default()
    }
}
