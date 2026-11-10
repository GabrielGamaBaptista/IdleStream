use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::Message;
use crate::config::StatusKind;
use crate::kick::models::MiningSlotState;

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

    let (status, body) = crate::kick::http::kick_http_request("GET", &url, Some(&headers), None, 10).await?;

    if status == 429 {
        return Err(format!("Rate limit da Kick (HTTP 429) ao consultar canal {}", clean_slug));
    }
    if !(200..=299).contains(&status) {
        return Err(format!("Erro HTTP {} ao consultar canal {}: {}", status, clean_slug, &body[..body.len().min(100)]));
    }

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

/// Extrai a média de horas de duração a partir do JSON de vídeos/VODs da Kick
pub fn parse_kick_uptime_from_videos_json(json: &serde_json::Value) -> Option<f64> {
    let arr = json.as_array()?;
    if arr.is_empty() {
        return None;
    }

    let mut total_hours = 0.0;
    let mut count = 0;

    for item in arr.iter().take(10) {
        let is_live = item["is_live"].as_bool().unwrap_or(false);
        if is_live {
            continue;
        }

        if let Some(dur_ms) = item["duration"].as_u64() {
            if dur_ms > 0 {
                let hours = (dur_ms as f64) / 3_600_000.0;
                total_hours += hours;
                count += 1;
            }
        }
    }

    if count == 0 {
        return None;
    }

    let avg = total_hours / (count as f64);
    Some((avg * 10.0).round() / 10.0)
}

/// Consulta o histórico recente de VODs da Kick e calcula a média de tempo online em horas
pub async fn fetch_kick_streamer_uptime_avg(channel_slug: &str) -> Result<f64, String> {
    let clean_slug = channel_slug.trim().trim_start_matches('/').to_lowercase();
    let url = format!("https://kick.com/api/v2/channels/{}/videos", clean_slug);

    let headers = [
        ("User-Agent", BROWSER_USER_AGENT),
        ("Accept", "application/json"),
        ("Referer", "https://kick.com/"),
        ("Origin", "https://kick.com"),
    ];

    let (status, body) = crate::kick::http::kick_http_request("GET", &url, Some(&headers), None, 10).await?;
    if !(200..=299).contains(&status) {
        return Ok(4.0); // Fallback padrão de 4 horas
    }

    let json: serde_json::Value = serde_json::from_str(&body).map_err(|e| format!("JSON inválido: {}", e))?;
    Ok(parse_kick_uptime_from_videos_json(&json).unwrap_or(4.0))
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

    let (status, body) = crate::kick::http::kick_http_request(
        "GET",
        "https://websockets.kick.com/viewer/v1/token",
        Some(&headers),
        None,
        10,
    ).await?;

    if status == 429 {
        return Err(format!("Rate limit da Kick (HTTP 429): muitas requisições simultâneas ao obter token (resp: {})", body));
    }
    if status == 401 || status == 403 || body.contains("\"Forbidden\"") || body.contains("\"Unauthenticated\"") {
        return Err(format!("Sessão da Kick inválida ou expirada (HTTP {}). Reautentique sua conta.", status));
    }
    if !(200..=299).contains(&status) {
        return Err(format!("Erro HTTP {} ao obter WS token: {}", status, &body[..body.len().min(120)]));
    }

    let json: serde_json::Value = serde_json::from_str(&body)
        .map_err(|e| format!("JSON de WS token inválido: {} (resp: {})", e, &body[..body.len().min(120)]))?;

    let token = json["data"]["token"]
        .as_str()
        .or_else(|| json["token"].as_str())
        .ok_or_else(|| format!("Campo token não encontrado na resposta (status {}): {}", status, body))?;

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

    let (status, body) = crate::kick::http::kick_http_request("GET", &url, Some(&headers), None, 10).await?;

    if status == 429 {
        return Err("Rate limit da Kick (HTTP 429) em pontos".to_string());
    }
    if status == 401 || status == 403 || body.contains("\"Unauthenticated\"") {
        return Err("Sessão Kick não autenticada para pontos".to_string());
    }
    if !(200..=299).contains(&status) {
        return Err(format!("HTTP {} ao consultar pontos", status));
    }

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

fn apply_kick_status(
    on_status: &StatusCallback,
    state: MiningSlotState,
    rank: usize,
    avg_hours: f64,
    current_points: Option<i64>,
) {
    match state {
        MiningSlotState::Offline => {
            on_status(
                StatusKind::Standby,
                Some(format!("Streamer offline no Kick (Rank #{} • Média: {:.1}h)", rank, avg_hours)),
                current_points,
            );
        }
        MiningSlotState::StandbyVigil => {
            on_status(
                StatusKind::Standby,
                Some(format!("Em fila de vigília Kick (Rank #{} • Média: {:.1}h)", rank, avg_hours)),
                current_points,
            );
        }
        MiningSlotState::ActiveMining => {
            on_status(
                StatusKind::Connected,
                Some(format!("Minerando pontos no Kick (Prioridade #{} • Média: {:.1}h)", rank, avg_hours)),
                current_points,
            );
        }
    }
}

/// Inicia o watcher nativo de transmissão Kick integrado ao Coordenador de Prioridade Multi-Stream
pub fn start_kick_watcher(
    _stream_id: String,
    account_id: String,
    session_token: String,
    channel_slug: String,
    coordinator: crate::kick::coordinator::KickPriorityCoordinator,
    on_status: StatusCallback,
) -> KickWatcherHandle {
    let (stop_tx, mut stop_rx) = mpsc::channel::<()>(1);

    tokio::spawn(async move {
        let clean_slug = channel_slug.trim().trim_start_matches('/').to_lowercase();
        let (notify_tx, mut notify_rx) = mpsc::unbounded_channel::<crate::kick::models::KickSlotNotification>();
        coordinator.register_listener(&account_id, &clean_slug, notify_tx).await;

        let mut avg_hours = fetch_kick_streamer_uptime_avg(&clean_slug).await.unwrap_or(4.0);
        let mut last_vod_check = std::time::Instant::now();
        let mut current_points: Option<i64> = None;
        let mut retry_delay_secs = 5u64;

        let mut slot_state;
        let mut rank;

        loop {
            // Verifica sinal de parada
            if stop_rx.try_recv().is_ok() {
                coordinator.remove_streamer(&account_id, &clean_slug).await;
                break;
            }

            // A cada 6 horas, atualiza a média histórica de VODs
            if last_vod_check.elapsed() > std::time::Duration::from_secs(6 * 3600) {
                if let Ok(new_avg) = fetch_kick_streamer_uptime_avg(&clean_slug).await {
                    avg_hours = new_avg;
                }
                last_vod_check = std::time::Instant::now();
            }

            // 1. Obtém dados do canal
            let ch_info = match fetch_channel_info(&clean_slug).await {
                Ok(info) => info,
                Err(e) => {
                    let is_429 = e.contains("429") || e.contains("Rate limit");
                    let backoff = if is_429 {
                        retry_delay_secs = (retry_delay_secs.max(30) * 2).min(180);
                        retry_delay_secs
                    } else {
                        retry_delay_secs = (retry_delay_secs * 2).min(60);
                        retry_delay_secs
                    };
                    let user_msg = if is_429 {
                        format!("Rate limit Kick (429): aguardando {}s para tentar novamente...", backoff)
                    } else {
                        format!("Erro Kick: {}", e)
                    };
                    on_status(StatusKind::Error, Some(user_msg), current_points);
                    tokio::select! {
                        _ = stop_rx.recv() => {
                            coordinator.remove_streamer(&account_id, &clean_slug).await;
                            break;
                        }
                        _ = tokio::time::sleep(tokio::time::Duration::from_secs(backoff)) => {
                            continue;
                        }
                    }
                }
            };

            // Consulta pontos atuais se tivermos token
            if let Ok(pts) = fetch_channel_points(&session_token, &clean_slug).await {
                current_points = Some(pts);
            }

            let is_online = ch_info.is_live && ch_info.livestream_id.is_some();
            let channel_id = ch_info.channel_id;
            let user_id = ch_info.user_id;
            let livestream_id = ch_info.livestream_id.unwrap_or(0);

            // 2. Atualiza coordenador de prioridade (Ranqueia pelo tempo online da maior para menor)
            let (new_slot_state, new_rank) = coordinator
                .update_streamer_status(
                    &account_id,
                    &clean_slug,
                    Some(channel_id.to_string()),
                    avg_hours,
                    is_online,
                    current_points,
                )
                .await;

            slot_state = new_slot_state;
            rank = new_rank;

            // 3. Executa de acordo com o estado do slot
            match slot_state {
                MiningSlotState::Offline => {
                    apply_kick_status(&on_status, slot_state, rank, avg_hours, current_points);

                    let sleep = tokio::time::sleep(tokio::time::Duration::from_secs(120));
                    tokio::pin!(sleep);
                    loop {
                        tokio::select! {
                            _ = stop_rx.recv() => {
                                coordinator.remove_streamer(&account_id, &clean_slug).await;
                                return;
                            }
                            Some(notif) = notify_rx.recv() => {
                                let mut latest = notif;
                                while let Ok(n) = notify_rx.try_recv() {
                                    latest = n;
                                }
                                if latest.slot_state != slot_state || latest.priority_rank != rank {
                                    slot_state = latest.slot_state;
                                    rank = latest.priority_rank;
                                    apply_kick_status(&on_status, slot_state, rank, avg_hours, current_points);
                                    break;
                                }
                            }
                            _ = &mut sleep => {
                                break;
                            }
                        }
                    }
                }
                MiningSlotState::StandbyVigil => {
                    apply_kick_status(&on_status, slot_state, rank, avg_hours, current_points);

                    // Em StandbyVigil, aguarda vaga no Top 1 online sem abrir viewer WebSocket (0 MB extra)
                    let sleep = tokio::time::sleep(tokio::time::Duration::from_secs(30));
                    tokio::pin!(sleep);
                    loop {
                        tokio::select! {
                            _ = stop_rx.recv() => {
                                coordinator.remove_streamer(&account_id, &clean_slug).await;
                                return;
                            }
                            Some(notif) = notify_rx.recv() => {
                                let mut latest = notif;
                                while let Ok(n) = notify_rx.try_recv() {
                                    latest = n;
                                }
                                if latest.slot_state != slot_state || latest.priority_rank != rank {
                                    slot_state = latest.slot_state;
                                    rank = latest.priority_rank;
                                    apply_kick_status(&on_status, slot_state, rank, avg_hours, current_points);
                                    break;
                                }
                            }
                            _ = &mut sleep => {
                                break;
                            }
                        }
                    }
                }
                MiningSlotState::ActiveMining => {
                    apply_kick_status(&on_status, slot_state, rank, avg_hours, current_points);

                    // Conecta no Viewer WebSocket para computar pontos
                    let ws_token = match fetch_viewer_ws_token(&session_token, &clean_slug, channel_id, user_id).await {
                        Ok(t) => t,
                        Err(e) => {
                            let is_429 = e.contains("429") || e.contains("Rate limit");
                            let backoff = if is_429 {
                                retry_delay_secs = (retry_delay_secs.max(30) * 2).min(180);
                                retry_delay_secs
                            } else {
                                retry_delay_secs = (retry_delay_secs * 2).min(60);
                                retry_delay_secs
                            };
                            let user_msg = if is_429 {
                                format!("Rate limit Kick (429): aguardando {}s para reobter token...", backoff)
                            } else {
                                format!("Erro WS Token: {}", e)
                            };
                            on_status(StatusKind::Error, Some(user_msg), current_points);
                            tokio::select! {
                                _ = stop_rx.recv() => {
                                    coordinator.remove_streamer(&account_id, &clean_slug).await;
                                    break;
                                }
                                _ = tokio::time::sleep(tokio::time::Duration::from_secs(backoff)) => {
                                    continue;
                                }
                            }
                        }
                    };

                    let ws_url = format!("wss://websockets.kick.com/viewer/v1/connect?token={}", ws_token);
                    let ws_req = match ws_url.as_str().into_client_request() {
                        Ok(mut req) => {
                            if let Ok(origin) = "https://kick.com".parse() {
                                req.headers_mut().insert("Origin", origin);
                            }
                            if let Ok(ua) = BROWSER_USER_AGENT.parse() {
                                req.headers_mut().insert("User-Agent", ua);
                            }
                            req
                        }
                        Err(e) => {
                            on_status(StatusKind::Error, Some(format!("URL de WS Kick inválida: {}", e)), current_points);
                            tokio::time::sleep(tokio::time::Duration::from_secs(retry_delay_secs)).await;
                            continue;
                        }
                    };

                    let ws_stream = match tokio_tungstenite::connect_async(ws_req).await {
                        Ok((ws, _)) => ws,
                        Err(e) => {
                            on_status(StatusKind::Error, Some(format!("Falha ao conectar WS Kick: {}", e)), current_points);
                            tokio::select! {
                                _ = stop_rx.recv() => {
                                    coordinator.remove_streamer(&account_id, &clean_slug).await;
                                    break;
                                }
                                _ = tokio::time::sleep(tokio::time::Duration::from_secs(retry_delay_secs)) => {
                                    retry_delay_secs = (retry_delay_secs * 2).min(60);
                                    continue;
                                }
                            }
                        }
                    };

                    retry_delay_secs = 5;
                    apply_kick_status(&on_status, MiningSlotState::ActiveMining, rank, avg_hours, current_points);

                    let (mut ws_write, mut ws_read) = ws_stream.split();

                    let handshake_payload = serde_json::json!({
                        "type": "channel_handshake",
                        "data": {
                            "message": {
                                "channelId": channel_id
                            }
                        }
                    }).to_string();

                    let _ = ws_write.send(Message::Text(handshake_payload.into())).await;
                    let _ = ws_write.send(Message::Text(serde_json::json!({"type": "ping"}).to_string().into())).await;

                    let mut tracking_interval = tokio::time::interval(tokio::time::Duration::from_secs(10));
                    let mut handshake_interval = tokio::time::interval(tokio::time::Duration::from_secs(30));
                    let mut points_interval = tokio::time::interval(tokio::time::Duration::from_secs(120));

                    tracking_interval.tick().await;
                    handshake_interval.tick().await;
                    points_interval.tick().await;

                    loop {
                        tokio::select! {
                            _ = stop_rx.recv() => {
                                let _ = ws_write.close().await;
                                coordinator.remove_streamer(&account_id, &clean_slug).await;
                                return;
                            }
                            Some(notif) = notify_rx.recv() => {
                                let mut latest = notif;
                                while let Ok(n) = notify_rx.try_recv() {
                                    latest = n;
                                }
                                if latest.slot_state != MiningSlotState::ActiveMining {
                                    // Demovido para StandbyVigil ou Offline: fecha WebSocket com elegância
                                    let _ = ws_write.close().await;
                                    apply_kick_status(&on_status, latest.slot_state, latest.priority_rank, avg_hours, current_points);
                                    break;
                                }
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
                                    break;
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
                                if let Ok(new_pts) = fetch_channel_points(&session_token, &clean_slug).await {
                                    current_points = Some(new_pts);
                                    apply_kick_status(&on_status, MiningSlotState::ActiveMining, rank, avg_hours, current_points);
                                }
                            }
                            msg_res = ws_read.next() => {
                                match msg_res {
                                    Some(Ok(Message::Text(text))) => {
                                        if text.trim() == "ping" || text.contains("\"type\":\"ping\"") {
                                            let _ = ws_write.send(Message::Text(serde_json::json!({"type": "pong"}).to_string().into())).await;
                                        }
                                    }
                                    Some(Ok(Message::Close(_))) | None | Some(Err(_)) => {
                                        break;
                                    }
                                    _ => {}
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    KickWatcherHandle {
        stop_tx: Some(stop_tx),
    }
}
