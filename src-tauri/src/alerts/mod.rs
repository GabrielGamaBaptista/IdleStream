use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::RwLock;

fn default_true() -> bool {
    true
}

fn default_milestone_val() -> u64 {
    10_000
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertConfig {
    #[serde(default = "default_true")]
    pub desktop_notifications: bool,
    #[serde(default)]
    pub ntfy_enabled: bool,
    #[serde(default)]
    pub ntfy_topic: Option<String>,
    #[serde(default)]
    pub discord_enabled: bool,
    #[serde(default)]
    pub discord_webhook: Option<String>,
    #[serde(default)]
    pub events: AlertEventConfig,
}

impl Default for AlertConfig {
    fn default() -> Self {
        Self {
            desktop_notifications: true,
            ntfy_enabled: false,
            ntfy_topic: None,
            discord_enabled: false,
            discord_webhook: None,
            events: AlertEventConfig::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertEventConfig {
    #[serde(default = "default_true")]
    pub stream_offline: bool,
    #[serde(default = "default_true")]
    pub auth_failure: bool,
    #[serde(default = "default_true")]
    pub redeem_failed: bool,
    #[serde(default)]
    pub points_milestone: bool,
    #[serde(default = "default_milestone_val")]
    pub points_milestone_value: u64,
}

impl Default for AlertEventConfig {
    fn default() -> Self {
        Self {
            stream_offline: true,
            auth_failure: true,
            redeem_failed: true,
            points_milestone: false,
            points_milestone_value: 10_000,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertPayload {
    pub title: String,
    pub body: String,
    pub event_type: String,
    pub timestamp: i64,
    pub priority: u8,
}

#[derive(Debug, Clone)]
pub enum AlertEvent {
    StreamOffline { channel: String, platform: String },
    AuthFailure { account_label: String, platform: String },
    RedeemFailed { channel: String, reason: String },
    PointsMilestone { account_label: String, points: u64 },
    Test,
}

impl AlertEvent {
    pub fn title(&self) -> String {
        match self {
            AlertEvent::StreamOffline { channel, platform } => {
                format!("🔴 Stream Offline: {} ({})", channel, platform)
            }
            AlertEvent::AuthFailure {
                account_label,
                platform,
            } => {
                format!("⚠️ Falha de Autenticação: {} ({})", account_label, platform)
            }
            AlertEvent::RedeemFailed { channel, .. } => {
                format!("❌ Falha ao Resgatar Bônus: {}", channel)
            }
            AlertEvent::PointsMilestone {
                account_label,
                points,
            } => {
                format!("🎉 Meta de Pontos: {} ({} pts)", account_label, points)
            }
            AlertEvent::Test => "🔔 Notificação de Teste - IdleStream".to_string(),
        }
    }

    pub fn body(&self) -> String {
        match self {
            AlertEvent::StreamOffline { channel, platform } => {
                format!(
                    "A stream de {} na {} ficou offline. O IdleStream entrou em modo vigília para economizar recursos.",
                    channel, platform
                )
            }
            AlertEvent::AuthFailure {
                account_label,
                platform,
            } => {
                format!(
                    "A sessão da conta '{}' na {} expirou ou foi revogada. É necessário reconectar para continuar farmando.",
                    account_label, platform
                )
            }
            AlertEvent::RedeemFailed { channel, reason } => {
                format!(
                    "Não foi possível resgatar o bônus no canal {}: {}",
                    channel, reason
                )
            }
            AlertEvent::PointsMilestone {
                account_label,
                points,
            } => {
                format!(
                    "A conta '{}' ultrapassou o marco configurado de {} pontos de canal!",
                    account_label, points
                )
            }
            AlertEvent::Test => {
                "O sistema de alertas multicanal do IdleStream está funcionando perfeitamente!".to_string()
            }
        }
    }

    pub fn event_type(&self) -> &str {
        match self {
            AlertEvent::StreamOffline { .. } => "stream_offline",
            AlertEvent::AuthFailure { .. } => "auth_failure",
            AlertEvent::RedeemFailed { .. } => "redeem_failed",
            AlertEvent::PointsMilestone { .. } => "points_milestone",
            AlertEvent::Test => "test",
        }
    }

    pub fn priority(&self) -> u8 {
        match self {
            AlertEvent::AuthFailure { .. } => 4,
            AlertEvent::RedeemFailed { .. } => 3,
            AlertEvent::StreamOffline { .. } => 2,
            AlertEvent::PointsMilestone { .. } => 3,
            AlertEvent::Test => 3,
        }
    }

    pub fn is_enabled(&self, cfg: &AlertEventConfig) -> bool {
        match self {
            AlertEvent::StreamOffline { .. } => cfg.stream_offline,
            AlertEvent::AuthFailure { .. } => cfg.auth_failure,
            AlertEvent::RedeemFailed { .. } => cfg.redeem_failed,
            AlertEvent::PointsMilestone { .. } => cfg.points_milestone,
            AlertEvent::Test => true,
        }
    }
}

pub struct AlertDispatcher {
    config: Arc<RwLock<AlertConfig>>,
    http: reqwest::Client,
    app: AppHandle,
}

impl AlertDispatcher {
    pub fn new(app: AppHandle, initial_config: AlertConfig) -> Arc<Self> {
        let http = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(8))
            .build()
            .unwrap_or_default();

        Arc::new(Self {
            config: Arc::new(RwLock::new(initial_config)),
            http,
            app,
        })
    }

    pub async fn update_config(&self, new_config: AlertConfig) {
        let mut w = self.config.write().await;
        *w = new_config;
    }

    pub async fn get_config(&self) -> AlertConfig {
        self.config.read().await.clone()
    }

    pub async fn send(&self, event: AlertEvent) {
        let cfg = self.get_config().await;
        if !event.is_enabled(&cfg.events) {
            return;
        }

        let title = event.title();
        let body = event.body();
        let event_type = event.event_type().to_string();
        let priority = event.priority();
        let timestamp = Utc::now().timestamp();

        let payload = AlertPayload {
            title: title.clone(),
            body: body.clone(),
            event_type,
            timestamp,
            priority,
        };

        // 1. Desktop Notification via Tauri event
        if cfg.desktop_notifications {
            let _ = self.app.emit("app-alert", &payload);
            crate::audit_log!("ALERT", "INFO", "Desktop alert emitido: {}", title);
        }

        // 2. ntfy.sh push notification
        if cfg.ntfy_enabled {
            if let Some(ref raw_topic) = cfg.ntfy_topic {
                let topic = raw_topic.trim().trim_start_matches('/').to_string();
                if !topic.is_empty() {
                    let client = self.http.clone();
                    let url = format!("https://ntfy.sh/{}", topic);
                    let title_clone = title.clone();
                    let body_clone = body.clone();
                    let prio_header = priority.to_string();

                    tauri::async_runtime::spawn(async move {
                        let res = client
                            .post(&url)
                            .header("Title", title_clone)
                            .header("Priority", prio_header)
                            .body(body_clone)
                            .send()
                            .await;

                        if let Err(e) = res {
                            eprintln!("[AlertDispatcher] Falha ao enviar para ntfy.sh: {}", e);
                            crate::audit_log!("ALERT", "WARN", "Falha no ntfy.sh: {}", e);
                        } else {
                            crate::audit_log!("ALERT", "INFO", "ntfy.sh enviado com sucesso para tópico {}", topic);
                        }
                    });
                }
            }
        }

        // 3. Discord Webhook notification
        if cfg.discord_enabled {
            if let Some(ref webhook_url) = cfg.discord_webhook {
                let url = webhook_url.trim().to_string();
                if url.starts_with("https://discord.com/api/webhooks/")
                    || url.starts_with("https://discordapp.com/api/webhooks/")
                {
                    let client = self.http.clone();
                    let color = match event {
                        AlertEvent::AuthFailure { .. } => 0xef4444, // Red
                        AlertEvent::RedeemFailed { .. } => 0xf97316, // Orange
                        AlertEvent::StreamOffline { .. } => 0x64748b, // Slate
                        AlertEvent::PointsMilestone { .. } => 0x10b981, // Emerald
                        AlertEvent::Test => 0x6366f1, // Indigo
                    };

                    let discord_payload = serde_json::json!({
                        "username": "IdleStream Alertas",
                        "embeds": [{
                            "title": title,
                            "description": body,
                            "color": color,
                            "footer": {
                                "text": "IdleStream • Monitoramento Ativo 24/7"
                            },
                            "timestamp": Utc::now().to_rfc3339()
                        }]
                    });

                    tauri::async_runtime::spawn(async move {
                        let res = client.post(&url).json(&discord_payload).send().await;
                        if let Err(e) = res {
                            eprintln!("[AlertDispatcher] Falha ao enviar webhook Discord: {}", e);
                            crate::audit_log!("ALERT", "WARN", "Falha no webhook Discord: {}", e);
                        } else {
                            crate::audit_log!("ALERT", "INFO", "Discord webhook disparado com sucesso");
                        }
                    });
                }
            }
        }
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;

    #[test]
    fn test_alert_event_properties() {
        let ev = AlertEvent::StreamOffline {
            channel: "pokeidle".to_string(),
            platform: "Twitch".to_string(),
        };
        assert_eq!(ev.event_type(), "stream_offline");
        assert_eq!(ev.priority(), 2);
        assert!(ev.title().contains("Stream Offline"));
        assert!(ev.body().contains("pokeidle"));

        let auth_ev = AlertEvent::AuthFailure {
            account_label: "ContaPrincipal".to_string(),
            platform: "Kick".to_string(),
        };
        assert_eq!(auth_ev.event_type(), "auth_failure");
        assert_eq!(auth_ev.priority(), 4);
        assert!(auth_ev.title().contains("Falha de Autenticação"));
    }

    #[test]
    fn test_alert_event_filtering() {
        let mut cfg = AlertEventConfig::default();
        cfg.stream_offline = false;
        cfg.points_milestone = true;

        let offline_ev = AlertEvent::StreamOffline {
            channel: "x".into(),
            platform: "Twitch".into(),
        };
        assert!(!offline_ev.is_enabled(&cfg));

        let milestone_ev = AlertEvent::PointsMilestone {
            account_label: "x".into(),
            points: 15_000,
        };
        assert!(milestone_ev.is_enabled(&cfg));

        let test_ev = AlertEvent::Test;
        assert!(test_ev.is_enabled(&cfg)); // Teste sempre passa
    }
}
