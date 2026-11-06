use crate::twitch::models::{MiningSlotState, TwitchStreamerStats};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

pub const MAX_CONCURRENT_ACTIVE_SLOTS_PER_ACCOUNT: usize = 2;

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
    inner: Arc<Mutex<HashMap<String, Vec<TwitchStreamerStats>>>>,
}

impl AccountPriorityCoordinator {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Atualiza ou insere o status de um streamer para determinada conta e retorna:
    /// (Estado do slot: ActiveMining/StandbyVigil/Offline, Rank atual do streamer)
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
        let list = map.entry(account_id.to_string()).or_default();

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

    /// Remove um streamer da lista de monitoramento da conta
    pub async fn remove_streamer(&self, account_id: &str, channel_slug: &str) {
        let mut map = self.inner.lock().await;
        if let Some(list) = map.get_mut(account_id) {
            let clean = channel_slug.to_lowercase();
            list.retain(|s| s.channel_slug != clean);
            compute_priority_ranks(list);
        }
    }

    /// Retorna as estatísticas e rankings atuais de todos os streamers de uma conta
    pub async fn get_account_streamers(&self, account_id: &str) -> Vec<TwitchStreamerStats> {
        let map = self.inner.lock().await;
        map.get(account_id).cloned().unwrap_or_default()
    }
}
