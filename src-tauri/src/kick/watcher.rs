use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::Message;
use crate::config::StatusKind;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KickChannelInfo {
    pub channel_id: u64,
    pub user_id: u64,
    pub livestream_id: Option<u64>,
    pub is_live: bool,
}

const BROWSER_USER_AGENT: &str =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/// Busca informações do canal via API oficial da Kick
pub async fn fetch_channel_info(channel_slug: &str) -> Result<KickChannelInfo, String> {
    let clean_slug = channel_slug.trim().trim_start_matches('/').to_lowercase();
    let url = format!("https://kick.com/api/v2/channels/{}", clean_slug);

    let headers = [
        ("User-Agent", BROWSER_USER_AGENT),
        ("Accept", "application/json"),
        ("Referer", "https://kick.com/"),
        ("Origin", "https://kick.com"),
    ];

    let (_, body) = crate::kick::http::kick_http_request("GET", &url, Some(&headers), None, 10).await?;

    let json: serde_json::Value = serde_json::from_str(&body)
        .map_err(|e| format!("JSON inválido da Kick: {} (resp: {})", e, &body[..body.len().min(120)]))?;

    let channel_id = json["id"].as_u64().ok_or("channel id não encontrado")?;
    let user_id = json["user"]["id"]
        .as_u64()
        .or_else(|| json["user_id"].as_u64())
        .unwrap_or(channel_id);

    let (is_live, livestream_id) = match json.get("livestream") {
        Some(live) if !live.is_null() => {
            let is_l = live["is_live"].as_bool().unwrap_or(true);
            let lid = live["id"].as_u64();
            (is_l, lid)
        }
        _ => (false, None),
    };

    Ok(KickChannelInfo {
        channel_id,
        user_id,
        livestream_id,
        is_live,
    })
}

/// Obtém o viewer WebSocket token para contabilizar watch time e farmar pontos
pub async fn fetch_viewer_ws_token(
    session_token: &str,
    channel_slug: &str,
    channel_id: u64,
    user_id: u64,
) -> Result<String, String> {
    let slug = channel_slug.to_string();
    let auth_header = format!("Bearer {}", session_token);
    let chatroom_header = channel_id.to_string();
    let user_id_header = user_id.to_string();
    let referer = format!("https://kick.com/{}/", slug);

    let headers = [
        ("Authorization", auth_header.as_str()),
        ("X-Chatroom", chatroom_header.as_str()),
        ("X-User-Id", user_id_header.as_str()),
        ("X-Client-Token", "e1393935a959b4020a4491574f6490129f678acdaa92760471263db43487f823"),
        ("Referer", referer.as_str()),
        ("Origin", "https://kick.com"),
        ("User-Agent", BROWSER_USER_AGENT),
        ("Accept", "application/json"),
    ];

    let (_, body) = crate::kick::http::kick_http_request(
        "GET",
        "https://websockets.kick.com/viewer/v1/token",
        Some(&headers),
        None,
        10,
    ).await?;

    let json: serde_json::Value = serde_json::from_str(&body)
        .map_err(|e| format!("JSON de WS token inválido: {} (resp: {})", e, &body[..body.len().min(120)]))?;

    let token = json["data"]["token"]
        .as_str()
        .or_else(|| json["token"].as_str())
        .ok_or_else(|| format!("Campo token não encontrado na resposta: {}", body))?;

    Ok(token.to_string())
}

/// Consulta o saldo atual de pontos de canal na Kick
pub async fn fetch_channel_points(session_token: &str, channel_slug: &str) -> Result<i64, String> {
    let url = format!("https://kick.com/api/v2/channels/{}/points", channel_slug);
    let auth_header = format!("Bearer {}", session_token);
    let referer = format!("https://kick.com/{}/", channel_slug);

    let headers = [
        ("Authorization", auth_header.as_str()),
        ("Referer", referer.as_str()),
        ("Origin", "https://kick.com"),
        ("User-Agent", BROWSER_USER_AGENT),
        ("Accept", "application/json"),
    ];

    let (_, body) = crate::kick::http::kick_http_request("GET", &url, Some(&headers), None, 10).await?;

    let json: serde_json::Value = serde_json::from_str(&body)
        .map_err(|e| format!("JSON de pontos inválido: {} (resp: {})", e, &body[..body.len().min(120)]))?;

    let points = json["data"]["points"]
        .as_i64()
        .or_else(|| json["points"].as_i64())
        .unwrap_or(0);

    Ok(points)
}

pub struct KickWatcherHandle {
    stop_tx: Option<mpsc::Sender<()>>,
}

impl KickWatcherHandle {
    pub fn stop(&mut self) {
        if let Some(tx) = self.stop_tx.take() {
            let _ = tx.try_send(());
        }
    }
}

pub type StatusCallback = Arc<dyn Fn(StatusKind, Option<String>, Option<i64>) + Send + Sync + 'static>;

/// Inicia o watcher nativo ultraleve de transmissão Kick via viewer WebSocket
pub fn start_kick_watcher(
    _stream_id: String,
    _account_id: String,
    session_token: String,
    channel_slug: String,
    on_status: StatusCallback,
) -> KickWatcherHandle {
    let (stop_tx, mut stop_rx) = mpsc::channel::<()>(1);

    tokio::spawn(async move {
        let mut retry_delay_secs = 5u64;

        loop {
            // Verifica sinal de parada
            if stop_rx.try_recv().is_ok() {
                break;
            }

            // 1. Obtém dados do canal
            let slug = channel_slug.clone();
            let ch_info = match fetch_channel_info(&slug).await {
                Ok(info) => info,
                Err(e) => {
                    on_status(StatusKind::Error, Some(format!("Erro Kick: {}", e)), None);
                    tokio::select! {
                        _ = stop_rx.recv() => break,
                        _ = tokio::time::sleep(tokio::time::Duration::from_secs(retry_delay_secs)) => {
                            retry_delay_secs = (retry_delay_secs * 2).min(60);
                            continue;
                        }
                    }
                }
            };

            // Se o canal estiver offline, notifica e aguarda
            if !ch_info.is_live || ch_info.livestream_id.is_none() {
                on_status(StatusKind::Standby, Some("Streamer offline no Kick (vigília ativa - 300s)".into()), None);
                tokio::select! {
                    _ = stop_rx.recv() => break,
                    _ = tokio::time::sleep(tokio::time::Duration::from_secs(300)) => continue,
                }
            }

            let livestream_id = ch_info.livestream_id.unwrap();
            let channel_id = ch_info.channel_id;
            let user_id = ch_info.user_id;

            // 2. Consulta pontos iniciais
            let token_clone = session_token.clone();
            let slug_clone = channel_slug.clone();
            let initial_points = fetch_channel_points(&token_clone, &slug_clone).await.ok();

            // 3. Obtém o viewer WS token
            let token_clone = session_token.clone();
            let slug_clone = channel_slug.clone();
            let ws_token = match fetch_viewer_ws_token(&token_clone, &slug_clone, channel_id, user_id).await {
                Ok(t) => t,
                Err(e) => {
                    on_status(StatusKind::Error, Some(format!("Erro WS Token: {}", e)), initial_points);
                    tokio::select! {
                        _ = stop_rx.recv() => break,
                        _ = tokio::time::sleep(tokio::time::Duration::from_secs(retry_delay_secs)) => {
                            retry_delay_secs = (retry_delay_secs * 2).min(60);
                            continue;
                        }
                    }
                }
            };

            // 4. Conecta ao WebSocket do viewer
            let ws_url = format!("wss://websockets.kick.com/viewer/v1/connect?token={}", ws_token);
            let ws_stream = match tokio_tungstenite::connect_async(&ws_url).await {
                Ok((ws, _)) => ws,
                Err(e) => {
                    on_status(StatusKind::Error, Some(format!("Falha ao conectar WS Kick: {}", e)), initial_points);
                    tokio::select! {
                        _ = stop_rx.recv() => break,
                        _ = tokio::time::sleep(tokio::time::Duration::from_secs(retry_delay_secs)) => {
                            retry_delay_secs = (retry_delay_secs * 2).min(60);
                            continue;
                        }
                    }
                }
            };

            // Conectado com sucesso! Reseta backoff
            retry_delay_secs = 5;
            on_status(StatusKind::Connected, None, initial_points);

            let (mut ws_write, mut ws_read) = ws_stream.split();

            // Envia handshake e ping inicial
            let handshake_payload = serde_json::json!({
                "type": "channel_handshake",
                "data": {
                    "message": {
                        "channelId": channel_id
                    }
                }
            }).to_string();

            if ws_write.send(Message::Text(handshake_payload.into())).await.is_err() {
                continue;
            }
            let _ = ws_write.send(Message::Text(serde_json::json!({"type": "ping"}).to_string().into())).await;

            // Loops periódicos
            let mut tracking_interval = tokio::time::interval(tokio::time::Duration::from_secs(10));
            let mut handshake_interval = tokio::time::interval(tokio::time::Duration::from_secs(30));
            let mut points_interval = tokio::time::interval(tokio::time::Duration::from_secs(120));

            // Descarta o primeiro tick imediato dos intervalos
            tracking_interval.tick().await;
            handshake_interval.tick().await;
            points_interval.tick().await;

            let mut current_points = initial_points;

            loop {
                tokio::select! {
                    _ = stop_rx.recv() => {
                        let _ = ws_write.close().await;
                        return;
                    }
                    _ = tracking_interval.tick() => {
                        let user_event = serde_json::json!({
                            "type": "user_event",
                            "data": {
                                "message": {
                                    "name": "tracking.user.watch.livestream",
                                    "channel_id": channel_id,
                                    "livestream_id": livestream_id
                                }
                            }
                        }).to_string();

                        if ws_write.send(Message::Text(user_event.into())).await.is_err() {
                            break; // Conexão caiu, reconecta
                        }
                    }
                    _ = handshake_interval.tick() => {
                        let hs = serde_json::json!({
                            "type": "channel_handshake",
                            "data": {
                                "message": {
                                    "channelId": channel_id
                                }
                            }
                        }).to_string();

                        if ws_write.send(Message::Text(hs.into())).await.is_err() {
                            break;
                        }
                        let _ = ws_write.send(Message::Text(serde_json::json!({"type": "ping"}).to_string().into())).await;
                    }
                    _ = points_interval.tick() => {
                        let token_c = session_token.clone();
                        let slug_c = channel_slug.clone();
                        if let Ok(new_pts) = fetch_channel_points(&token_c, &slug_c).await {
                            current_points = Some(new_pts);
                            on_status(StatusKind::Connected, None, current_points);
                        }
                    }
                    msg_res = ws_read.next() => {
                        match msg_res {
                            Some(Ok(Message::Text(text))) => {
                                if text.trim() == "ping" || text.contains("\"type\":\"ping\"") {
                                    let _ = ws_write.send(Message::Text(serde_json::json!({"type": "pong"}).to_string().into())).await;
                                }
                            }
                            Some(Ok(Message::Close(_))) | None => {
                                break; // Servidor fechou a conexão
                            }
                            Some(Err(_)) => {
                                break;
                            }
                            _ => {}
                        }
                    }
                }
            }

            on_status(StatusKind::Connecting, Some("Reconectando watcher Kick...".into()), current_points);
            tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
        }
    });

    KickWatcherHandle {
        stop_tx: Some(stop_tx),
    }
}
