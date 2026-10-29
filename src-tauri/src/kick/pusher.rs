use crate::kick::auth::{authenticate_pusher_channel, KickCredentials};
use futures_util::{SinkExt, StreamExt};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{mpsc, watch, Mutex};
use tokio_tungstenite::{connect_async, tungstenite::Message};

pub const KICK_PUSHER_WS: &str =
    "wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=7.6.0&flash=false";
pub const KICK_API_CHANNEL: &str = "https://kick.com/api/v2/channels/";

/// Resolve o chatroom_id numérico de uma live pelo slug usando curl com bypass TLS/Cloudflare
pub async fn resolve_chatroom_id(channel_slug: &str) -> Result<u64, String> {
    let clean = channel_slug.trim().trim_start_matches('/').to_lowercase();
    let url = format!("{}{}", KICK_API_CHANNEL, clean);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .build()
        .unwrap_or_default();

    if let Ok(resp) = client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .header("Accept", "application/json")
        .send()
        .await
    {
        if resp.status().is_success() {
            if let Ok(v) = resp.json::<serde_json::Value>().await {
                if let Some(id) = v["chatroom"]["id"].as_u64() {
                    return Ok(id);
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        tokio::task::spawn_blocking(move || {
            let mut cmd = std::process::Command::new("curl.exe");
            cmd.args([
                "-s", "-m", "10",
                "-A", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                &url,
            ]);

            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000); // Sem janela de console

            match cmd.output() {
                Ok(out) if out.status.success() => {
                    let v: serde_json::Value = serde_json::from_slice(&out.stdout)
                        .map_err(|e| format!("JSON parse error: {}", e))?;
                    v["chatroom"]["id"].as_u64().ok_or_else(|| {
                        format!("chatroom.id ausente na resposta da API para {}", clean)
                    })
                }
                Ok(out) => Err(format!("curl falhou com status: {}", out.status)),
                Err(e) => Err(format!("Erro ao executar curl: {}", e)),
            }
        })
        .await
        .map_err(|e| e.to_string())?
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err(format!("Não foi possível resolver chatroom_id para {}", clean))
    }
}

#[derive(Debug, Clone)]
pub struct KickSub {
    pub stream_id: String,
    pub channel_slug: String,
    pub chatroom_id: u64,
}

enum SessionCommand {
    Subscribe(KickSub),
    Unsubscribe { stream_id: String, chatroom_id: u64 },
}

/// Sessão WebSocket multiplexada única por Conta Kick.
/// Mantém uma única conexão TCP/WebSocket e gerencia até 16 lives simultâneas.
pub struct KickAccountSession {
    pub account_id: String,
    pub subscriptions: Arc<Mutex<HashMap<String, KickSub>>>,
    cmd_tx: Option<mpsc::Sender<SessionCommand>>,
    shutdown_tx: Option<watch::Sender<bool>>,
}

impl KickAccountSession {
    pub fn new(account_id: &str) -> Self {
        Self {
            account_id: account_id.to_string(),
            subscriptions: Arc::new(Mutex::new(HashMap::new())),
            cmd_tx: None,
            shutdown_tx: None,
        }
    }

    pub async fn add_stream(
        &mut self,
        stream_id: &str,
        channel_slug: &str,
        chatroom_id: u64,
        creds: KickCredentials,
        on_status: Arc<dyn Fn(&str, crate::config::StatusKind, Option<String>) + Send + Sync + 'static>,
    ) {
        let sub = KickSub {
            stream_id: stream_id.to_string(),
            channel_slug: channel_slug.to_string(),
            chatroom_id,
        };

        {
            let mut s = self.subscriptions.lock().await;
            s.insert(stream_id.to_string(), sub.clone());
        }

        // Se o WebSocket já está ativo, envia o comando direto no canal
        if let Some(ref tx) = self.cmd_tx {
            let _ = tx.send(SessionCommand::Subscribe(sub)).await;
        } else {
            // Inicia o WebSocket da conta se ainda não estava rodando
            self.start(creds, on_status);
        }
    }

    pub async fn remove_stream(&mut self, stream_id: &str) {
        let chatroom_id = {
            let mut s = self.subscriptions.lock().await;
            s.remove(stream_id).map(|sub| sub.chatroom_id)
        };

        if let Some(c_id) = chatroom_id {
            if let Some(ref tx) = self.cmd_tx {
                let _ = tx
                    .send(SessionCommand::Unsubscribe {
                        stream_id: stream_id.to_string(),
                        chatroom_id: c_id,
                    })
                    .await;
            }
        }

        let is_empty = self.subscriptions.lock().await.is_empty();
        if is_empty {
            self.stop();
        }
    }

    pub async fn has_streams(&self) -> bool {
        !self.subscriptions.lock().await.is_empty()
    }

    pub fn start(
        &mut self,
        creds: KickCredentials,
        on_status: Arc<dyn Fn(&str, crate::config::StatusKind, Option<String>) + Send + Sync + 'static>,
    ) {
        if self.shutdown_tx.is_some() {
            return;
        }

        let (shutdown_tx, shutdown_rx) = watch::channel(false);
        let (cmd_tx, mut cmd_rx) = mpsc::channel::<SessionCommand>(32);

        self.shutdown_tx = Some(shutdown_tx);
        self.cmd_tx = Some(cmd_tx);

        let subs = Arc::clone(&self.subscriptions);
        let acc_id = self.account_id.clone();

        tauri::async_runtime::spawn(async move {
            let mut rx = shutdown_rx;

            loop {
                if *rx.borrow() {
                    break;
                }

                let current_subs: Vec<KickSub> = subs.lock().await.values().cloned().collect();
                if current_subs.is_empty() {
                    break;
                }

                for sub in &current_subs {
                    on_status(&sub.stream_id, crate::config::StatusKind::Connecting, None);
                }

                match connect_async(KICK_PUSHER_WS).await {
                    Ok((ws_stream, _)) => {
                        let (mut write, mut read) = ws_stream.split();

                        // 1. Handshake inicial: aguardar connection_established e extrair socket_id
                        let mut socket_id = None;
                        while let Some(msg_result) = read.next().await {
                            match msg_result {
                                Ok(Message::Text(init_msg)) => {
                                    if let Ok(val) =
                                        serde_json::from_str::<serde_json::Value>(&init_msg)
                                    {
                                        if val["event"].as_str()
                                            == Some("pusher:connection_established")
                                        {
                                            if let Ok(inner) =
                                                serde_json::from_str::<serde_json::Value>(
                                                    val["data"].as_str().unwrap_or("{}"),
                                                )
                                            {
                                                socket_id = inner["socket_id"]
                                                    .as_str()
                                                    .map(|s| s.to_string());
                                                break;
                                            }
                                        }
                                    }
                                }
                                Ok(Message::Ping(p)) => {
                                    let _ = write.send(Message::Pong(p)).await;
                                }
                                _ => {}
                            }
                        }

                        let Some(sid) = socket_id else {
                            eprintln!("[Kick Pusher Acc {}] Falha ao capturar socket_id", acc_id);
                            tokio::time::sleep(Duration::from_secs(5)).await;
                            continue;
                        };

                        // 2. Subscrever todas as streams ativas desta conta
                        let active_subs: Vec<KickSub> = subs.lock().await.values().cloned().collect();
                        for sub in &active_subs {
                            let channel_name = format!("chatrooms.{}.v2", sub.chatroom_id);
                            let auth_token =
                                authenticate_pusher_channel(&creds, &sid, &channel_name)
                                    .await
                                    .unwrap_or_default();

                            let sub_payload = serde_json::json!({
                                "event": "pusher:subscribe",
                                "data": {
                                    "auth": auth_token,
                                    "channel": channel_name
                                }
                            });

                            if let Err(e) = write.send(Message::Text(sub_payload.to_string())).await {
                                eprintln!("[Kick Pusher Acc {}] Erro ao subscrever: {}", acc_id, e);
                            } else {
                                on_status(
                                    &sub.stream_id,
                                    crate::config::StatusKind::Connected,
                                    None,
                                );
                            }
                        }

                        // 3. Loop principal de leitura e envio de comandos
                        let mut disconnect = false;
                        while !disconnect {
                            tokio::select! {
                                _ = rx.changed() => {
                                    if *rx.borrow() {
                                        let _ = write.close().await;
                                        return;
                                    }
                                }
                                cmd = cmd_rx.recv() => {
                                    match cmd {
                                        Some(SessionCommand::Subscribe(new_sub)) => {
                                            let channel_name = format!("chatrooms.{}.v2", new_sub.chatroom_id);
                                            let auth_token = authenticate_pusher_channel(&creds, &sid, &channel_name)
                                                .await
                                                .unwrap_or_default();

                                            let sub_payload = serde_json::json!({
                                                "event": "pusher:subscribe",
                                                "data": {
                                                    "auth": auth_token,
                                                    "channel": channel_name
                                                }
                                            });
                                            let _ = write.send(Message::Text(sub_payload.to_string())).await;
                                            on_status(&new_sub.stream_id, crate::config::StatusKind::Connected, None);
                                        }
                                        Some(SessionCommand::Unsubscribe { stream_id, chatroom_id }) => {
                                            let channel_name = format!("chatrooms.{}.v2", chatroom_id);
                                            let unsub_payload = serde_json::json!({
                                                "event": "pusher:unsubscribe",
                                                "data": {
                                                    "channel": channel_name
                                                }
                                            });
                                            let _ = write.send(Message::Text(unsub_payload.to_string())).await;
                                            on_status(&stream_id, crate::config::StatusKind::Disconnected, None);
                                        }
                                        None => {
                                            disconnect = true;
                                        }
                                    }
                                }
                                msg = read.next() => {
                                    match msg {
                                        Some(Ok(Message::Text(txt))) => {
                                            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&txt) {
                                                if v["event"].as_str() == Some("pusher:ping") {
                                                    let pong = serde_json::json!({"event": "pusher:pong", "data": {}});
                                                    let _ = write.send(Message::Text(pong.to_string())).await;
                                                }
                                            }
                                        }
                                        Some(Ok(Message::Ping(p))) => {
                                            let _ = write.send(Message::Pong(p)).await;
                                        }
                                        Some(Ok(Message::Close(_))) | None => {
                                            disconnect = true;
                                        }
                                        Some(Err(e)) => {
                                            eprintln!("[Kick Pusher Acc {}] WebSocket read error: {}", acc_id, e);
                                            disconnect = true;
                                        }
                                        _ => {}
                                    }
                                }
                            }
                        }

                        if *rx.borrow() {
                            return;
                        }

                        let re_subs: Vec<KickSub> = subs.lock().await.values().cloned().collect();
                        for sub in &re_subs {
                            on_status(
                                &sub.stream_id,
                                crate::config::StatusKind::Error,
                                Some("Reconectando socket...".into()),
                            );
                        }
                    }
                    Err(e) => {
                        eprintln!("[Kick Pusher Acc {}] Falha de conexão: {}", acc_id, e);
                        let err_subs: Vec<KickSub> = subs.lock().await.values().cloned().collect();
                        for sub in &err_subs {
                            on_status(
                                &sub.stream_id,
                                crate::config::StatusKind::Error,
                                Some(format!("Falha Pusher: {}", e)),
                            );
                        }
                    }
                }

                tokio::time::sleep(Duration::from_secs(5)).await;
            }
        });
    }

    pub fn stop(&mut self) {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(true);
        }
        self.cmd_tx = None;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_resolve_kick_chatroom() {
        let chatroom_id = resolve_chatroom_id("xqc").await;
        println!("xqc chatroom_id: {:?}", chatroom_id);
        assert!(chatroom_id.is_ok(), "Deve resolver o chatroom_id do xqc");
        assert!(chatroom_id.unwrap() > 0);
    }
}
