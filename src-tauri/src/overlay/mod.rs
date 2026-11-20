use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tiny_http::{Header, Response, Server, StatusCode};
use tauri::{AppHandle, Manager};
use crate::state::AppState;
use crate::games::manager::GameLayoutManager;

pub const DEFAULT_OVERLAY_PORT: u16 = 47850;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlayStreamItem {
    pub channel: String,
    pub platform: String,
    pub status: String,
    pub points: String,
    pub is_live: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlayGameSlotItem {
    pub slot_id: String,
    pub nick: Option<String>,
    pub level: Option<u32>,
    pub xp_rate_per_hour: Option<u64>,
    pub bonus_twitch_secs: Option<u64>,
    pub bonus_kick_secs: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlayPayload {
    pub streams: Vec<OverlayStreamItem>,
    pub game_slots: Vec<OverlayGameSlotItem>,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlayStatus {
    pub running: bool,
    pub port: u16,
    pub url: String,
}

pub struct OverlayServer {
    is_running: Arc<AtomicBool>,
    port: u16,
    app_handle: AppHandle,
}

impl OverlayServer {
    pub fn new(app_handle: AppHandle, port: Option<u16>) -> Self {
        Self {
            is_running: Arc::new(AtomicBool::new(false)),
            port: port.unwrap_or(DEFAULT_OVERLAY_PORT),
            app_handle,
        }
    }

    pub fn is_running(&self) -> bool {
        self.is_running.load(Ordering::SeqCst)
    }

    pub fn get_url(&self) -> String {
        format!("http://127.0.0.1:{}/overlay", self.port)
    }

    pub fn get_status(&self) -> OverlayStatus {
        OverlayStatus {
            running: self.is_running(),
            port: self.port,
            url: self.get_url(),
        }
    }

    pub fn start(&self) -> Result<(), String> {
        if self.is_running.swap(true, Ordering::SeqCst) {
            return Ok(()); // Já em execução
        }

        let is_running_clone = self.is_running.clone();
        let app_handle_clone = self.app_handle.clone();
        let port = self.port;
        let addr = format!("127.0.0.1:{}", port);

        let server = Server::http(&addr).map_err(|e| {
            self.is_running.store(false, Ordering::SeqCst);
            format!("Falha ao iniciar servidor HTTP na porta {}: {}", port, e)
        })?;

        crate::audit_log!("OVERLAY", "INFO", "Servidor Overlay OBS iniciado em http://{}", addr);

        thread::spawn(move || {
            while is_running_clone.load(Ordering::SeqCst) {
                match server.recv_timeout(Duration::from_millis(500)) {
                    Ok(Some(request)) => {
                        handle_request(request, &app_handle_clone);
                    }
                    Ok(None) => {}
                    Err(e) => {
                        eprintln!("[OverlayServer] Erro na recepção HTTP: {}", e);
                    }
                }
            }
            crate::audit_log!("OVERLAY", "INFO", "Servidor Overlay OBS finalizado");
        });

        Ok(())
    }

    pub fn stop(&self) {
        self.is_running.store(false, Ordering::SeqCst);
        crate::audit_log!("OVERLAY", "INFO", "Sinal de parada enviado ao servidor Overlay OBS");
    }
}

fn handle_request(request: tiny_http::Request, app_handle: &AppHandle) {
    let url_raw = request.url().to_string();
    let path = url_raw.split('?').next().unwrap_or("/");

    let cors_origin = Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap();
    let cors_methods = Header::from_bytes(&b"Access-Control-Allow-Methods"[..], &b"GET, OPTIONS"[..]).unwrap();
    let cors_headers = Header::from_bytes(&b"Access-Control-Allow-Headers"[..], &b"Content-Type"[..]).unwrap();

    if request.method() == &tiny_http::Method::Options {
        let resp = Response::empty(StatusCode(204))
            .with_header(cors_origin)
            .with_header(cors_methods)
            .with_header(cors_headers);
        let _ = request.respond(resp);
        return;
    }

    match path {
        "/overlay" | "/" => {
            let html = include_str!("overlay.html");
            let content_type = Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..]).unwrap();
            let resp = Response::from_string(html)
                .with_header(content_type)
                .with_header(cors_origin);
            let _ = request.respond(resp);
        }
        "/overlay/data" | "/api/state" => {
            let data = collect_overlay_data(app_handle);
            let json = serde_json::to_string(&data).unwrap_or_else(|_| "{}".to_string());
            let content_type = Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap();
            let resp = Response::from_string(json)
                .with_header(content_type)
                .with_header(cors_origin);
            let _ = request.respond(resp);
        }
        _ => {
            let resp = Response::from_string("Not Found")
                .with_status_code(StatusCode(404))
                .with_header(cors_origin);
            let _ = request.respond(resp);
        }
    }
}

fn collect_overlay_data(app: &AppHandle) -> OverlayPayload {
    let mut streams = Vec::new();
    let mut game_slots = Vec::new();

    // 1. Coleta dados de streams do AppState
    if let Some(state) = app.try_state::<Arc<AppState>>() {
        let streams_config: HashMap<String, (String, String)> = if let Ok(cfg) = state.config.try_lock() {
            cfg.streams
                .iter()
                .map(|s| {
                    let plat = match s.platform {
                        crate::config::Platform::Twitch => "twitch".to_string(),
                        crate::config::Platform::Kick => "kick".to_string(),
                    };
                    (s.id.clone(), (s.channel_slug.clone(), plat))
                })
                .collect()
        } else {
            HashMap::new()
        };

        if let Ok(guard) = state.statuses.try_lock() {
            for (sid, s) in guard.iter() {
                let (channel, platform) = streams_config
                    .get(sid)
                    .cloned()
                    .unwrap_or_else(|| (sid.clone(), "stream".to_string()));

                let points_str = s.channel_points.clone().or_else(|| {
                    s.account_points.values().next().cloned()
                }).unwrap_or_else(|| "0".to_string());

                let status_str = match &s.status {
                    crate::config::StatusKind::Connected => "connected",
                    crate::config::StatusKind::Standby => "standby",
                    crate::config::StatusKind::Connecting => "connecting",
                    crate::config::StatusKind::Error => "error",
                    crate::config::StatusKind::Disconnected => "disconnected",
                };

                streams.push(OverlayStreamItem {
                    channel,
                    platform,
                    status: status_str.to_string(),
                    points: points_str,
                    is_live: s.is_live,
                });
            }
        }
        streams.sort_by(|a, b| a.channel.cmp(&b.channel));
    }

    // 2. Coleta dados de jogos PokeIdle do GameLayoutManager
    if let Some(gm) = app.try_state::<Arc<GameLayoutManager>>() {
        if let Ok(guard) = gm.game_states.try_lock() {
            for (sid, st) in guard.iter() {
                game_slots.push(OverlayGameSlotItem {
                    slot_id: sid.clone(),
                    nick: st.nick.clone(),
                    level: st.level,
                    xp_rate_per_hour: st.xp_rate_per_hour,
                    bonus_twitch_secs: st.bonus_twitch_secs,
                    bonus_kick_secs: st.bonus_kick_secs,
                });
            }
        }
        game_slots.sort_by(|a, b| a.slot_id.cmp(&b.slot_id));
    }

    OverlayPayload {
        streams,
        game_slots,
        updated_at: Utc::now().timestamp(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_overlay_payload_serialization() {
        let payload = OverlayPayload {
            streams: vec![OverlayStreamItem {
                channel: "loud_coringa".to_string(),
                platform: "twitch".to_string(),
                status: "connected".to_string(),
                points: "125.400".to_string(),
                is_live: true,
            }],
            game_slots: vec![OverlayGameSlotItem {
                slot_id: "slot-1".to_string(),
                nick: Some("Ash".to_string()),
                level: Some(78),
                xp_rate_per_hour: Some(45000),
                bonus_twitch_secs: Some(1200),
                bonus_kick_secs: None,
            }],
            updated_at: 1700000000,
        };

        let json = serde_json::to_string(&payload).expect("Falha ao serializar OverlayPayload");
        assert!(json.contains("loud_coringa"));
        assert!(json.contains("Ash"));
        assert!(json.contains("xpRatePerHour"));
    }
}
