use super::models::AppConfig;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

pub struct ConfigStore {
    file_path: PathBuf,
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
        }
    }

    #[cfg(test)]
    pub fn new_with_path(file_path: PathBuf) -> Self {
        Self { file_path }
    }

    pub fn load(&self) -> AppConfig {
        if !self.file_path.exists() {
            return AppConfig::default();
        }

        match fs::read_to_string(&self.file_path) {
            Ok(content) => {
                let mut config: AppConfig = serde_json::from_str(&content).unwrap_or_default();
                for stream in &mut config.streams {
                    stream.ensure_migrated();
                }
                config
            }
            Err(e) => {
                eprintln!("Failed to read config file: {}", e);
                AppConfig::default()
            }
        }
    }

    pub fn save(&self, config: &AppConfig) -> Result<(), String> {
        let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
        fs::write(&self.file_path, json).map_err(|e| e.to_string())
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
}
