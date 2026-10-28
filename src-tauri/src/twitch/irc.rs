use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::watch;
use tokio_tungstenite::{connect_async, tungstenite::Message};

const TWITCH_IRC_WS: &str = "wss://irc-ws.chat.twitch.tv:443";

#[derive(Debug, Clone)]
pub struct TwitchSessionConfig {
    pub stream_id: String,
    pub username: String,
    pub oauth_token: String,
    pub channel_slug: String,
    pub auto_reconnect: bool,
    pub reconnect_delay_secs: u64,
}

pub struct TwitchSession {
    pub stream_id: String,
    shutdown_tx: Option<watch::Sender<bool>>,
}

impl TwitchSession {
    pub fn start<F>(config: TwitchSessionConfig, on_status_change: F) -> Self
    where
        F: Fn(crate::config::StatusKind, Option<String>) + Send + Sync + 'static,
    {
        let (shutdown_tx, shutdown_rx) = watch::channel(false);
        let stream_id = config.stream_id.clone();
        let on_status = Arc::new(on_status_change);

        tauri::async_runtime::spawn(async move {
            let mut rx = shutdown_rx;
            loop {
                if *rx.borrow() {
                    break;
                }

                on_status(crate::config::StatusKind::Connecting, None);

                match connect_async(TWITCH_IRC_WS).await {
                    Ok((ws_stream, _)) => {
                        let (mut write, mut read) = ws_stream.split();

                        // Clean token format: strip "oauth:" if user included it
                        let clean_token = config.oauth_token.trim_start_matches("oauth:").trim();
                        let clean_channel = config.channel_slug.trim_start_matches('#').to_lowercase();
                        let clean_username = config.username.trim().to_lowercase();

                        let pass_cmd = format!("PASS oauth:{}\r\n", clean_token);
                        let nick_cmd = format!("NICK {}\r\n", clean_username);
                        // Solicitar apenas membership (presença). Remove o flood massivo de tags de chat que sobrecarregava CPU e RAM durante a noite
                        let cap_cmd = "CAP REQ :twitch.tv/membership\r\n";
                        let join_cmd = format!("JOIN #{}\r\n", clean_channel);

                        let mut auth_ok = true;
                        for cmd in [&pass_cmd, &nick_cmd, cap_cmd, &join_cmd] {
                            if let Err(e) = write.send(Message::Text(cmd.to_string())).await {
                                on_status(crate::config::StatusKind::Error, Some(format!("Auth send failed: {}", e)));
                                auth_ok = false;
                                break;
                            }
                        }

                        if !auth_ok {
                            tokio::time::sleep(Duration::from_secs(config.reconnect_delay_secs)).await;
                            continue;
                        }

                        on_status(crate::config::StatusKind::Connected, None);

                        // Message pump loop
                        let mut disconnected = false;
                        while !disconnected {
                            tokio::select! {
                                _ = rx.changed() => {
                                    if *rx.borrow() {
                                        let _ = write.send(Message::Text(format!("PART #{}\r\n", clean_channel))).await;
                                        let _ = write.close().await;
                                        on_status(crate::config::StatusKind::Disconnected, None);
                                        return;
                                    }
                                }
                                msg = read.next() => {
                                    match msg {
                                        Some(Ok(Message::Text(text))) => {
                                            for line in text.lines() {
                                                if line.starts_with("PING") {
                                                    let pong = format!("PONG {}\r\n", &line[4..].trim());
                                                    let _ = write.send(Message::Text(pong)).await;
                                                } else if line.contains(":Login authentication failed") {
                                                    on_status(crate::config::StatusKind::Error, Some("Login authentication failed (token inválido)".into()));
                                                    disconnected = true;
                                                    break;
                                                }
                                            }
                                        }
                                        Some(Ok(Message::Ping(payload))) => {
                                            let _ = write.send(Message::Pong(payload)).await;
                                        }
                                        Some(Ok(Message::Close(_))) | None => {
                                            disconnected = true;
                                        }
                                        Some(Err(e)) => {
                                            eprintln!("[Twitch IRC {}] Read error: {}", config.channel_slug, e);
                                            disconnected = true;
                                        }
                                        _ => {}
                                    }
                                }
                            }
                        }

                        if *rx.borrow() {
                            on_status(crate::config::StatusKind::Disconnected, None);
                            return;
                        }

                        on_status(crate::config::StatusKind::Error, Some("Conexão interrompida. Tentando reconectar...".into()));
                    }
                    Err(e) => {
                        on_status(crate::config::StatusKind::Error, Some(format!("Falha na conexão: {}", e)));
                    }
                }

                if !config.auto_reconnect || *rx.borrow() {
                    break;
                }

                tokio::time::sleep(Duration::from_secs(config.reconnect_delay_secs)).await;
            }

            on_status(crate::config::StatusKind::Disconnected, None);
        });

        Self {
            stream_id,
            shutdown_tx: Some(shutdown_tx),
        }
    }

    pub fn stop(&mut self) {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(true);
        }
    }
}
