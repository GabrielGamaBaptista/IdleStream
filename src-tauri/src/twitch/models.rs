use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TwitchStreamerStats {
    pub channel_slug: String,
    pub channel_id: Option<String>,
    pub avg_duration_hours: f64,
    pub priority_rank: usize,
    pub is_live: bool,
    pub current_points: Option<i64>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MiningSlotState {
    ActiveMining,
    StandbyVigil,
    Offline,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelPointsContext {
    pub is_live: bool,
    pub channel_id: String,
    pub broadcast_id: Option<String>,
    pub balance: Option<i64>,
    pub available_claim_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaimResult {
    pub claim_id: String,
    pub points: i64,
}
