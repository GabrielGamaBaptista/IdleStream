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
    pub is_priority: bool,
}

#[derive(Default)]
struct AccountState {
    streamers: Vec<TwitchStreamerStats>,
    listeners: HashMap<String, mpsc::UnboundedSender<StreamerSlotNotification>>,
    last_sent: HashMap<String, (MiningSlotState, usize, bool)>,
    priority_overrides: HashMap<String, bool>,
}

/// Calcula a ordem de prioridade (do 1º ao último):
/// 1º: lives marcadas manualmente como prioritárias (`is_priority == true`)
/// 2º: média de tempo online decrescente (`avg_duration_hours`)
/// 3º: ordem alfabética de `channel_slug` para desempate determinístico
pub fn compute_priority_ranks(streamers: &mut [TwitchStreamerStats]) {
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

    fn recompute_and_notify(acc_state: &mut AccountState, skip_slug: Option<&str>) -> HashMap<String, MiningSlotState> {
        compute_priority_ranks(&mut acc_state.streamers);
        let slot_states = reconcile_account_slots(&acc_state.streamers);

        for streamer in acc_state.streamers.iter() {
            let state = slot_states
                .get(&streamer.channel_slug)
                .copied()
                .unwrap_or(MiningSlotState::Offline);
            let now = (state, streamer.priority_rank, streamer.is_priority);
            let changed = acc_state.last_sent.get(&streamer.channel_slug) != Some(&now);
            acc_state.last_sent.insert(streamer.channel_slug.clone(), now);

            if changed && skip_slug != Some(streamer.channel_slug.as_str()) {
                if let Some(tx) = acc_state.listeners.get(&streamer.channel_slug) {
                    let _ = tx.send(StreamerSlotNotification {
                        slot_state: state,
                        priority_rank: streamer.priority_rank,
                        is_priority: streamer.is_priority,
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
            acc_state.streamers.push(TwitchStreamerStats {
                channel_slug: clean_slug.clone(),
                channel_id,
                avg_duration_hours: avg_hours,
                priority_rank: next_rank,
                is_live,
                current_points: points,
                is_priority: effective_priority,
            });
        }

        let slot_states = Self::recompute_and_notify(acc_state, Some(&clean_slug));

        let my_state = slot_states
            .get(&clean_slug)
            .copied()
            .unwrap_or(MiningSlotState::Offline);

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
            Self::recompute_and_notify(acc_state, None);
        }
    }

    /// Remove um streamer da lista de monitoramento da conta e reprioriza os restantes instantaneamente
    pub async fn remove_streamer(&self, account_id: &str, channel_slug: &str) {
        let mut map = self.inner.lock().await;
        if let Some(acc_state) = map.get_mut(account_id) {
            let clean = channel_slug.to_lowercase();
            acc_state.streamers.retain(|s| s.channel_slug != clean);
            acc_state.listeners.remove(&clean);
            acc_state.last_sent.remove(&clean);
            acc_state.priority_overrides.remove(&clean);
            Self::recompute_and_notify(acc_state, None);
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
