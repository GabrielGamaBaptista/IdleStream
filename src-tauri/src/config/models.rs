use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Platform {
    Twitch,
    Kick,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    pub id: String,
    pub platform: Platform,
    pub label: String,               // e.g. "Main Account", "Smurf 1"
    pub username: String,            // Twitch username or Kick display username
    #[serde(default)]
    pub oauth_token: Option<String>, // Twitch oauth token (without "oauth:" prefix)
    #[serde(default)]
    pub kick_session: Option<String>, // Kick authentication session cookie
    #[serde(default)]
    pub xsrf_token: Option<String>,   // Kick XSRF-TOKEN cookie
    #[serde(default)]
    pub session_token: Option<String>, // Kick Bearer session token
    #[serde(default)]
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamConfig {
    pub id: String,
    pub platform: Platform,
    pub channel_slug: String, // e.g. "xqc" or "pokeidle_streamer"
    #[serde(default)]
    pub account_ids: Vec<String>, // References to Account.id
    #[serde(default)]
    pub selected_account_id: Option<String>, // Active account for Kick rewards
    #[serde(default)]
    pub auto_start: bool,     // Auto-start when application launches
    #[serde(default, skip_serializing)]
    pub account_id: Option<String>, // Legacy single account backward compatibility
}

impl StreamConfig {
    pub fn ensure_migrated(&mut self) {
        if self.account_ids.is_empty() {
            if let Some(ref legacy_id) = self.account_id {
                if !legacy_id.is_empty() {
                    self.account_ids.push(legacy_id.clone());
                }
            }
        }
        if self.selected_account_id.is_none() && !self.account_ids.is_empty() {
            self.selected_account_id = self.account_ids.first().cloned();
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub minimize_to_tray: bool,
    pub start_with_windows: bool,
    pub auto_reconnect: bool,
    pub reconnect_delay_secs: u64,
    pub auto_live_only: bool, // Se true: só inicializa player/IRC quando o streamer estiver ao vivo!
    pub kick_mute_audio: bool,
    pub kick_hide_chat: bool,
    pub kick_lowest_quality: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            minimize_to_tray: true,
            start_with_windows: false,
            auto_reconnect: true,
            reconnect_delay_secs: 10,
            auto_live_only: true, // Padrão: só roda quando estiver ao vivo para máxima economia!
            kick_mute_audio: true,
            kick_hide_chat: true,
            kick_lowest_quality: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppConfig {
    pub accounts: Vec<Account>,
    pub streams: Vec<StreamConfig>,
    pub settings: AppSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum StatusKind {
    Disconnected,
    Standby,   // Em espera / vigília (streamer offline, 0 MB consumo)
    Connecting,
    Connected, // Ao vivo (assistindo / acumulando pontos)
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamRuntimeStatus {
    pub stream_id: String,
    pub status: StatusKind,
    pub is_live: bool,
    pub message: Option<String>,
    pub uptime_seconds: u64,
    pub estimated_ram_mb: u32,
    pub connected_at: Option<i64>,
    pub channel_points: Option<String>, // Saldo de pontos detectado no Kick (ex: "1,6 mil")
    #[serde(default)]
    pub account_points: HashMap<String, String>, // account_id -> points
}
