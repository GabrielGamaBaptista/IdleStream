use serde::{Deserialize, Serialize};
pub use crate::twitch::models::MiningSlotState;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct KickStreamerStats {
    pub channel_slug: String,
    pub channel_id: Option<String>,
    pub avg_duration_hours: f64,
    pub priority_rank: usize,
    pub is_live: bool,
    pub current_points: Option<i64>,
}

/// Notificação reativa enviada para os watchers da Kick quando a prioridade ou estado do slot muda
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct KickSlotNotification {
    pub slot_state: MiningSlotState,
    pub priority_rank: usize,
}
