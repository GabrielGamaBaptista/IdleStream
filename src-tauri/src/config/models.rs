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
    #[serde(default)]
    pub label: String,               // e.g. "Main Account", "Smurf 1"
    #[serde(default)]
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
#[serde(default)]
pub struct AppSettings {
    #[serde(default = "default_minimize_to_tray")]
    pub minimize_to_tray: bool,
    #[serde(default)]
    pub start_with_windows: bool,
    #[serde(default = "default_auto_reconnect")]
    pub auto_reconnect: bool,
    #[serde(default = "default_reconnect_delay_secs")]
    pub reconnect_delay_secs: u64,
    #[serde(default = "default_auto_live_only")]
    pub auto_live_only: bool, // Se true: só inicializa player/IRC quando o streamer estiver ao vivo!
    #[serde(default = "default_kick_mute_audio")]
    pub kick_mute_audio: bool,
    #[serde(default = "default_kick_hide_chat")]
    pub kick_hide_chat: bool,
    #[serde(default = "default_kick_lowest_quality")]
    pub kick_lowest_quality: bool,
}

fn default_minimize_to_tray() -> bool { true }
fn default_auto_reconnect() -> bool { true }
fn default_reconnect_delay_secs() -> u64 { 10 }
fn default_auto_live_only() -> bool { true }
fn default_kick_mute_audio() -> bool { true }
fn default_kick_hide_chat() -> bool { true }
fn default_kick_lowest_quality() -> bool { true }

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameSlotConfig {
    pub id: String,
    #[serde(default)]
    pub label: String,
    #[serde(default)]
    pub url: String,
    #[serde(default = "default_game_color")]
    pub color: String,
    #[serde(default)]
    pub auto_start: bool,
    #[serde(default = "default_true")]
    pub enable_hunt_extension: bool,
    #[serde(default = "default_zoom")]
    pub zoom: f64,
}

fn default_zoom() -> f64 {
    1.0
}

fn default_true() -> bool {
    true
}

fn default_game_color() -> String {
    "#6366F1".to_string()
}

pub fn default_game_slots() -> Vec<GameSlotConfig> {
    vec![
        GameSlotConfig {
            id: "slot-1".into(),
            label: "Conta 1".into(),
            url: "https://pokeidle.io/app".into(),
            color: "#6366F1".into(),
            auto_start: false,
            enable_hunt_extension: true,
            zoom: 1.0,
        },
        GameSlotConfig {
            id: "slot-2".into(),
            label: "Conta 2".into(),
            url: "https://pokeidle.io/app".into(),
            color: "#10B981".into(),
            auto_start: false,
            enable_hunt_extension: true,
            zoom: 1.0,
        },
        GameSlotConfig {
            id: "slot-3".into(),
            label: "Conta 3".into(),
            url: "https://pokeidle.io/app".into(),
            color: "#F59E0B".into(),
            auto_start: false,
            enable_hunt_extension: true,
            zoom: 1.0,
        },
        GameSlotConfig {
            id: "slot-4".into(),
            label: "Conta 4".into(),
            url: "https://pokeidle.io/app".into(),
            color: "#EF4444".into(),
            auto_start: false,
            enable_hunt_extension: true,
            zoom: 1.0,
        },
    ]
}

pub const DEFAULT_TOPIDLE_GAME_URL: &str = "https://topidle.com/jogo/pokeidle-io-5f9969";
/// 24 horas e 1 minuto em segundos = 86.460s
pub const VOTE_COOLDOWN_SECONDS: i64 = 24 * 60 * 60 + 60;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoteAccountConfig {
    pub id: String,
    #[serde(default)]
    pub label: String,
    #[serde(default)]
    pub player_identifier: String,
    #[serde(default = "default_vote_base_url")]
    pub base_url: String,
    #[serde(default)]
    pub linked_game_slot_id: Option<String>,
    #[serde(default = "default_true")]
    pub share_game_profile: bool,
    #[serde(default)]
    pub google_hint: Option<String>,
    #[serde(default = "default_game_color")]
    pub color: String,
    #[serde(default)]
    pub last_voted_at: Option<i64>,
    #[serde(default)]
    pub last_notified_for_vote_at: Option<i64>,
    #[serde(default)]
    pub total_votes: u32,
    #[serde(default = "default_true")]
    pub notifications_enabled: bool,
}

fn default_vote_base_url() -> String {
    DEFAULT_TOPIDLE_GAME_URL.to_string()
}

pub fn default_vote_accounts() -> Vec<VoteAccountConfig> {
    vec![
        VoteAccountConfig {
            id: "vote-1".into(),
            label: "GGB2006".into(),
            player_identifier: "GGB2006".into(),
            base_url: DEFAULT_TOPIDLE_GAME_URL.into(),
            linked_game_slot_id: Some("slot-1".into()),
            share_game_profile: true,
            google_hint: None,
            color: "#6366F1".into(),
            last_voted_at: None,
            last_notified_for_vote_at: None,
            total_votes: 0,
            notifications_enabled: true,
        },
        VoteAccountConfig {
            id: "vote-2".into(),
            label: "GGB2006_2".into(),
            player_identifier: "GGB2006_2".into(),
            base_url: DEFAULT_TOPIDLE_GAME_URL.into(),
            linked_game_slot_id: Some("slot-2".into()),
            share_game_profile: true,
            google_hint: None,
            color: "#10B981".into(),
            last_voted_at: None,
            last_notified_for_vote_at: None,
            total_votes: 0,
            notifications_enabled: true,
        },
        VoteAccountConfig {
            id: "vote-3".into(),
            label: "GGB2006_3".into(),
            player_identifier: "GGB2006_3".into(),
            base_url: DEFAULT_TOPIDLE_GAME_URL.into(),
            linked_game_slot_id: Some("slot-3".into()),
            share_game_profile: true,
            google_hint: None,
            color: "#F59E0B".into(),
            last_voted_at: None,
            last_notified_for_vote_at: None,
            total_votes: 0,
            notifications_enabled: true,
        },
        VoteAccountConfig {
            id: "vote-4".into(),
            label: "GGB2006_4".into(),
            player_identifier: "GGB2006_4".into(),
            base_url: DEFAULT_TOPIDLE_GAME_URL.into(),
            linked_game_slot_id: Some("slot-4".into()),
            share_game_profile: true,
            google_hint: None,
            color: "#EF4444".into(),
            last_voted_at: None,
            last_notified_for_vote_at: None,
            total_votes: 0,
            notifications_enabled: true,
        },
    ]
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    #[serde(default)]
    pub accounts: Vec<Account>,
    #[serde(default)]
    pub streams: Vec<StreamConfig>,
    #[serde(default)]
    pub settings: AppSettings,
    #[serde(default = "default_game_slots")]
    pub game_slots: Vec<GameSlotConfig>,
    #[serde(default = "default_vote_accounts")]
    pub vote_accounts: Vec<VoteAccountConfig>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            accounts: Vec::new(),
            streams: Vec::new(),
            settings: AppSettings::default(),
            game_slots: default_game_slots(),
            vote_accounts: default_vote_accounts(),
        }
    }
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
