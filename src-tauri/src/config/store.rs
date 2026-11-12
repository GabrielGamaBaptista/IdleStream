use super::models::{Account, AppConfig, AppSettings, RuntimeSessionState, StreamConfig};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

pub struct ConfigStore {
    file_path: PathBuf,
    runtime_file_path: PathBuf,
}

impl ConfigStore {
    pub fn new(app: &AppHandle) -> Self {
        let dir = app
            .path()
            .app_config_dir()
            .unwrap_or_else(|_| PathBuf::from("./config"));

        if !dir.exists() {
            let _ = fs::create_dir_all(&dir);
        }

        Self {
            file_path: dir.join("config.json"),
            runtime_file_path: dir.join("runtime_state.json"),
        }
    }

    #[cfg(test)]
    pub fn new_with_path(file_path: PathBuf) -> Self {
        let runtime_file_path = file_path.with_file_name("runtime_state.json");
        Self {
            file_path,
            runtime_file_path,
        }
    }

    pub fn load(&self) -> AppConfig {
        eprintln!("[ConfigStore] Checking path: {:?}, exists: {}", self.file_path, self.file_path.exists());
        if !self.file_path.exists() {
            return AppConfig::default();
        }

        match fs::read_to_string(&self.file_path) {
            Ok(content) => {
                let clean_content = content.trim_start_matches('\u{feff}');
                match serde_json::from_str::<AppConfig>(clean_content) {
                    Ok(mut config) => {
                        for stream in &mut config.streams {
                            stream.ensure_migrated();
                        }
                        for slot in &mut config.game_slots {
                            if slot.url.is_empty() || slot.url.contains("pokeidle.net") {
                                slot.url = "https://pokeidle.io/app".to_string();
                            }
                        }
                        if config.vote_accounts.is_empty() {
                            config.vote_accounts = crate::config::default_vote_accounts();
                        } else {
                            for vote in &mut config.vote_accounts {
                                if vote.base_url.trim().is_empty() {
                                    vote.base_url = crate::config::DEFAULT_TOPIDLE_GAME_URL.to_string();
                                }
                            }
                        }
                        eprintln!("[ConfigStore] Loaded {} streams successfully", config.streams.len());
                        config
                    }
                    Err(e) => {
                        eprintln!("[ConfigStore] Direct deserialization warning: {}! Attempting lenient fallback...", e);
                        if let Ok(val) = serde_json::from_str::<serde_json::Value>(clean_content) {
                            let accounts: Vec<Account> = val.get("accounts")
                                .and_then(|a| serde_json::from_value(a.clone()).ok())
                                .unwrap_or_default();
                            let mut streams: Vec<StreamConfig> = val.get("streams")
                                .and_then(|s| serde_json::from_value(s.clone()).ok())
                                .unwrap_or_default();
                            for stream in &mut streams {
                                stream.ensure_migrated();
                            }
                            let settings: AppSettings = val.get("settings")
                                .and_then(|s| serde_json::from_value(s.clone()).ok())
                                .unwrap_or_default();
                            let mut game_slots: Vec<crate::config::GameSlotConfig> = val.get("game_slots")
                                .and_then(|g| serde_json::from_value(g.clone()).ok())
                                .unwrap_or_else(crate::config::default_game_slots);
                            for slot in &mut game_slots {
                                if slot.url.is_empty() || slot.url.contains("pokeidle.net") {
                                    slot.url = "https://pokeidle.io/app".to_string();
                                }
                            }
                            let mut vote_accounts: Vec<crate::config::VoteAccountConfig> = val.get("vote_accounts")
                                .and_then(|v| serde_json::from_value(v.clone()).ok())
                                .unwrap_or_else(crate::config::default_vote_accounts);
                            if vote_accounts.is_empty() {
                                vote_accounts = crate::config::default_vote_accounts();
                            } else {
                                for vote in &mut vote_accounts {
                                    if vote.base_url.trim().is_empty() {
                                        vote.base_url = crate::config::DEFAULT_TOPIDLE_GAME_URL.to_string();
                                    }
                                }
                            }
                            eprintln!("[ConfigStore] Lenient fallback salvaged {} accounts and {} streams", accounts.len(), streams.len());
                            AppConfig { accounts, streams, settings, game_slots, vote_accounts }
                        } else {
                            eprintln!("[ConfigStore] JSON DESERIALIZATION FAILED completely: {}! Content: {}", e, clean_content);
                            AppConfig::default()
                        }
                    }
                }
            }
            Err(e) => {
                eprintln!("Failed to read config file: {}", e);
                AppConfig::default()
            }
        }
    }

    fn write_atomic(path: &PathBuf, content: &str) -> Result<(), String> {
        if let Some(parent) = path.parent() {
            if !parent.exists() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
        }
        let tmp_path = path.with_extension("json.tmp");
        fs::write(&tmp_path, content).map_err(|e| e.to_string())?;
        fs::rename(&tmp_path, path).map_err(|e| {
            let _ = fs::remove_file(&tmp_path);
            e.to_string()
        })
    }

    pub fn save(&self, config: &AppConfig) -> Result<(), String> {
        let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
        Self::write_atomic(&self.file_path, &json)
    }

    pub fn load_runtime_state(&self) -> RuntimeSessionState {
        if !self.runtime_file_path.exists() {
            return RuntimeSessionState::default();
        }
        match fs::read_to_string(&self.runtime_file_path) {
            Ok(content) => {
                let clean = content.trim_start_matches('\u{feff}');
                serde_json::from_str::<RuntimeSessionState>(clean).unwrap_or_default()
            }
            Err(_) => RuntimeSessionState::default(),
        }
    }

    pub fn save_runtime_state(&self, state: &RuntimeSessionState) -> Result<(), String> {
        let json = serde_json::to_string_pretty(state).map_err(|e| e.to_string())?;
        Self::write_atomic(&self.runtime_file_path, &json)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{Account, Platform, StreamConfig};

    #[test]
    fn test_config_serialization() {
        let temp_dir = std::env::temp_dir().join(format!("chatter_test_{}", uuid::Uuid::new_v4()));
        let _ = fs::create_dir_all(&temp_dir);
        let config_file = temp_dir.join("test_config.json");

        let store = ConfigStore::new_with_path(config_file.clone());

        // Default empty config
        let initial = store.load();
        assert_eq!(initial.accounts.len(), 0);
        assert_eq!(initial.streams.len(), 0);

        // Save account and stream
        let mut updated = initial;
        updated.accounts.push(Account {
            id: "acc-1".into(),
            platform: Platform::Twitch,
            label: "Main Twitch".into(),
            username: "tester".into(),
            oauth_token: Some("token123".into()),
            kick_session: None,
            xsrf_token: None,
            session_token: None,
            enabled: true,
        });

        updated.streams.push(StreamConfig {
            id: "stream-1".into(),
            platform: Platform::Twitch,
            channel_slug: "pokeidle_stream".into(),
            account_ids: vec!["acc-1".into()],
            selected_account_id: Some("acc-1".into()),
            auto_start: true,
            account_id: None,
        });

        store.save(&updated).expect("Save should succeed");

        // Reload and verify
        let reloaded = store.load();
        assert_eq!(reloaded.accounts.len(), 1);
        assert_eq!(reloaded.streams.len(), 1);
        assert_eq!(reloaded.accounts[0].username, "tester");
        assert_eq!(reloaded.streams[0].channel_slug, "pokeidle_stream");
        assert_eq!(reloaded.streams[0].account_ids, vec!["acc-1"]);
        assert_eq!(reloaded.streams[0].selected_account_id, Some("acc-1".into()));

        // Clean up
        let _ = fs::remove_dir_all(temp_dir);
    }

    #[test]
    fn test_legacy_single_account_migration() {
        let temp_dir = std::env::temp_dir().join(format!("chatter_test_legacy_{}", uuid::Uuid::new_v4()));
        let _ = fs::create_dir_all(&temp_dir);
        let config_file = temp_dir.join("legacy_config.json");

        // Simulate an old config.json created prior to multi-account update
        let legacy_json = r#"{
            "accounts": [
                {
                    "id": "acc-legacy-1",
                    "platform": "kick",
                    "label": "Old Account",
                    "username": "legacy_user",
                    "enabled": true
                }
            ],
            "streams": [
                {
                    "id": "stream-legacy-1",
                    "platform": "kick",
                    "channel_slug": "kick_streamer",
                    "account_id": "acc-legacy-1",
                    "auto_start": true
                }
            ],
            "settings": {
                "minimize_to_tray": true,
                "start_with_windows": false,
                "auto_reconnect": true,
                "reconnect_delay_secs": 10,
                "auto_live_only": true,
                "kick_mute_audio": true,
                "kick_hide_chat": true,
                "kick_lowest_quality": true
            }
        }"#;

        fs::write(&config_file, legacy_json).expect("Write legacy json");

        let store = ConfigStore::new_with_path(config_file);
        let loaded = store.load();

        assert_eq!(loaded.streams.len(), 1);
        let stream = &loaded.streams[0];
        assert_eq!(stream.id, "stream-legacy-1");
        assert_eq!(stream.account_ids, vec!["acc-legacy-1"]);
        assert_eq!(stream.selected_account_id, Some("acc-legacy-1".into()));

        let _ = fs::remove_dir_all(temp_dir);
    }

    #[test]
    fn test_multi_account_stream() {
        let temp_dir = std::env::temp_dir().join(format!("chatter_test_multi_{}", uuid::Uuid::new_v4()));
        let _ = fs::create_dir_all(&temp_dir);
        let config_file = temp_dir.join("multi_config.json");

        let store = ConfigStore::new_with_path(config_file);
        let mut cfg = AppConfig::default();

        cfg.accounts.push(Account {
            id: "acc-1".into(),
            platform: Platform::Kick,
            label: "Main".into(),
            username: "main_user".into(),
            oauth_token: None,
            kick_session: None,
            xsrf_token: None,
            session_token: None,
            enabled: true,
        });

        cfg.accounts.push(Account {
            id: "acc-2".into(),
            platform: Platform::Kick,
            label: "Alt 1".into(),
            username: "alt_user".into(),
            oauth_token: None,
            kick_session: None,
            xsrf_token: None,
            session_token: None,
            enabled: true,
        });

        cfg.streams.push(StreamConfig {
            id: "stream-multi-1".into(),
            platform: Platform::Kick,
            channel_slug: "top_streamer".into(),
            account_ids: vec!["acc-1".into(), "acc-2".into()],
            selected_account_id: Some("acc-1".into()),
            auto_start: true,
            account_id: None,
        });

        store.save(&cfg).expect("Save multi-account config");
        let reloaded = store.load();

        assert_eq!(reloaded.streams[0].account_ids.len(), 2);
        assert_eq!(reloaded.streams[0].account_ids, vec!["acc-1", "acc-2"]);
        assert_eq!(reloaded.streams[0].selected_account_id, Some("acc-1".into()));

        let _ = fs::remove_dir_all(temp_dir);
    }

    #[test]
    fn test_runtime_state_persistence_and_atomic_save() {
        let temp_dir = std::env::temp_dir().join(format!("chatter_test_runtime_{}", uuid::Uuid::new_v4()));
        let _ = fs::create_dir_all(&temp_dir);
        let config_file = temp_dir.join("config.json");

        let store = ConfigStore::new_with_path(config_file);
        let empty = store.load_runtime_state();
        assert!(empty.desired_active_stream_ids.is_empty());
        assert!(empty.desired_active_game_slots.is_empty());
        assert_eq!(empty.last_active_tab, None);

        let rt = RuntimeSessionState {
            desired_active_stream_ids: vec!["s-1".into(), "s-2".into()],
            desired_active_game_slots: vec!["slot-1".into(), "slot-3".into()],
            last_active_tab: Some("games".into()),
        };
        store.save_runtime_state(&rt).expect("Save runtime state should succeed");

        // Ensure temp file was cleaned up / renamed cleanly
        assert!(!temp_dir.join("runtime_state.json.tmp").exists());

        let reloaded = store.load_runtime_state();
        assert_eq!(reloaded, rt);

        let _ = fs::remove_dir_all(temp_dir);
    }
}
