use crate::config::{
    AppConfig, ConfigStore, Platform, StatusKind, StreamRuntimeStatus,
};
use crate::live_check::{check_kick_live, check_twitch_live};
use crate::twitch::{TwitchSession, TwitchSessionConfig};
use chrono::Utc;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;

pub struct AppState {
    pub config: Mutex<AppConfig>,
    pub config_store: ConfigStore,
    pub twitch_sessions: Mutex<HashMap<String, TwitchSession>>,
    pub kick_watchers: Mutex<HashMap<String, crate::kick::watcher::KickWatcherHandle>>,
    pub statuses: Mutex<HashMap<String, StreamRuntimeStatus>>,
    pub http_client: reqwest::Client,
    pub app_handle: AppHandle,
}

impl AppState {
    pub fn new(app_handle: AppHandle) -> Self {
        let config_store = ConfigStore::new(&app_handle);
        let config = config_store.load();

        let mut statuses = HashMap::new();
        for stream in &config.streams {
            statuses.insert(
                stream.id.clone(),
                StreamRuntimeStatus {
                    stream_id: stream.id.clone(),
                    status: StatusKind::Disconnected,
                    is_live: false,
                    message: None,
                    uptime_seconds: 0,
                    estimated_ram_mb: 0,
                    connected_at: None,
                    channel_points: None,
                    account_points: HashMap::new(),
                },
            );
        }

        let http_client = reqwest::Client::builder()
            .timeout(Duration::from_secs(8))
            .build()
            .unwrap_or_default();

        Self {
            config: Mutex::new(config),
            config_store,
            twitch_sessions: Mutex::new(HashMap::new()),
            kick_watchers: Mutex::new(HashMap::new()),
            statuses: Mutex::new(statuses),
            http_client,
            app_handle,
        }
    }

    pub async fn emit_status(&self, status: &StreamRuntimeStatus) {
        let _ = self.app_handle.emit("stream-status-update", status);

        let map = self.statuses.lock().await;
        let active_count = map.values().filter(|s| s.status == StatusKind::Connected).count();
        let standby_count = map.values().filter(|s| s.status == StatusKind::Standby).count();
        let points = map.values().find_map(|s| s.channel_points.clone());
        drop(map);

        let title = format!("IdleStream ({} live • {} vigília)", active_count, standby_count);
        let text = match points {
            Some(pts) => format!("Pontos: {} • Rodando em segundo plano", pts),
            None => "Monitorando streams em segundo plano • 24/7".to_string(),
        };
        crate::kick::http::update_android_notification(&title, &text);
    }

    pub async fn update_points(&self, stream_id: &str, account_id: &str, points: &str) {
        let selected_id = {
            let cfg = self.config.lock().await;
            cfg.streams
                .iter()
                .find(|s| s.id == stream_id)
                .and_then(|s| s.selected_account_id.clone().or_else(|| s.account_ids.first().cloned()))
        };

        let mut map = self.statuses.lock().await;
        if let Some(status) = map.get_mut(stream_id) {
            status.account_points.insert(account_id.to_string(), points.to_string());
            if selected_id.as_deref() == Some(account_id) || status.channel_points.is_none() {
                status.channel_points = Some(points.to_string());
            }
            let cloned = status.clone();
            drop(map);
            self.emit_status(&cloned).await;
        }
    }

    pub async fn update_selected_account(&self, stream_id: &str, account_id: &str) {
        let mut map = self.statuses.lock().await;
        if let Some(status) = map.get_mut(stream_id) {
            if let Some(pts) = status.account_points.get(account_id) {
                status.channel_points = Some(pts.clone());
            }
            let cloned = status.clone();
            drop(map);
            self.emit_status(&cloned).await;
        }
    }

    pub async fn stop_account_in_stream(&self, stream_id: &str, account_id: &str) {
        let session_key = format!("{}:{}", stream_id, account_id);
        let mut sessions = self.twitch_sessions.lock().await;
        if let Some(mut sess) = sessions.remove(&session_key) {
            sess.stop();
        }
        drop(sessions);

        let mut kick_watchers = self.kick_watchers.lock().await;
        if let Some(mut watcher) = kick_watchers.remove(&session_key) {
            watcher.stop();
        }
    }

    pub async fn get_all_statuses(&self) -> Vec<StreamRuntimeStatus> {
        let mut map = self.statuses.lock().await;
        let now = Utc::now().timestamp();

        for status in map.values_mut() {
            if status.status == StatusKind::Connected {
                if let Some(conn_time) = status.connected_at {
                    status.uptime_seconds = (now - conn_time).max(0) as u64;
                }
            }
        }

        map.values().cloned().collect()
    }

    pub async fn start_stream(self: &Arc<Self>, stream_id: &str) -> Result<(), String> {
        let (stream, accounts, settings) = {
            let cfg = self.config.lock().await;
            let stream = cfg
                .streams
                .iter()
                .find(|s| s.id == stream_id)
                .cloned()
                .ok_or_else(|| "Stream não encontrada".to_string())?;

            let accounts: Vec<crate::config::Account> = cfg
                .accounts
                .iter()
                .filter(|a| stream.account_ids.contains(&a.id))
                .cloned()
                .collect();

            if accounts.is_empty() {
                return Err("Nenhuma conta associada encontrada para esta stream".to_string());
            }

            (stream, accounts, cfg.settings.clone())
        };

        // 1. Check live status if auto_live_only is enabled
        let is_live = match stream.platform {
            Platform::Twitch => check_twitch_live(&self.http_client, &stream.channel_slug).await,
            Platform::Kick => check_kick_live(&self.http_client, &stream.channel_slug).await,
        };

        if settings.auto_live_only && !is_live {
            // Streamer is OFFLINE: Put in Standby (Vigília) mode with 0 MB consumption!
            let (prev_points, prev_account_points) = {
                let map = self.statuses.lock().await;
                if let Some(s) = map.get(stream_id) {
                    (s.channel_points.clone(), s.account_points.clone())
                } else {
                    (None, HashMap::new())
                }
            };

            let mut map = self.statuses.lock().await;
            let standby_status = StreamRuntimeStatus {
                stream_id: stream_id.to_string(),
                status: StatusKind::Standby,
                is_live: false,
                message: Some("Canal offline. Em modo vigília aguardando a live iniciar...".into()),
                uptime_seconds: 0,
                estimated_ram_mb: 0,
                connected_at: None,
                channel_points: prev_points,
                account_points: prev_account_points,
            };
            map.insert(stream_id.to_string(), standby_status.clone());
            drop(map);
            self.emit_status(&standby_status).await;
            return Ok(());
        }

        // 2. Streamer is ONLINE: Start actual connections / WebViews
        self.activate_online_stream(&stream.id, &stream.platform, &stream.channel_slug, &accounts).await
    }

    pub async fn activate_online_stream(
        self: &Arc<Self>,
        stream_id: &str,
        platform: &Platform,
        channel_slug: &str,
        accounts: &[crate::config::Account],
    ) -> Result<(), String> {
        let settings = {
            let cfg = self.config.lock().await;
            cfg.settings.clone()
        };

        match platform {
            Platform::Twitch => {
                let accounts_with_tokens: Vec<&crate::config::Account> = accounts
                    .iter()
                    .filter(|a| a.oauth_token.as_ref().map(|t| !t.is_empty()).unwrap_or(false))
                    .collect();

                if accounts_with_tokens.is_empty() {
                    let mut stat_lock = self.statuses.lock().await;
                    let st = StreamRuntimeStatus {
                        stream_id: stream_id.to_string(),
                        status: StatusKind::Error,
                        is_live: true,
                        message: Some("Nenhuma conta com token OAuth. Faça o login primeiro.".into()),
                        uptime_seconds: 0,
                        estimated_ram_mb: 0,
                        connected_at: None,
                        channel_points: None,
                        account_points: HashMap::new(),
                    };
                    stat_lock.insert(stream_id.to_string(), st.clone());
                    drop(stat_lock);
                    self.emit_status(&st).await;
                    return Err("Nenhuma conta com token OAuth configurado".into());
                }

                for account in &accounts_with_tokens {
                    let session_key = format!("{}:{}", stream_id, account.id);
                    {
                        let mut sessions = self.twitch_sessions.lock().await;
                        if let Some(mut existing) = sessions.remove(&session_key) {
                            existing.stop();
                        }
                    }

                    let this = Arc::clone(self);
                    let sid = stream_id.to_string();

                    let session_config = TwitchSessionConfig {
                        stream_id: stream_id.to_string(),
                        username: account.username.clone(),
                        oauth_token: account.oauth_token.clone().unwrap_or_default(),
                        channel_slug: channel_slug.to_string(),
                        auto_reconnect: settings.auto_reconnect,
                        reconnect_delay_secs: settings.reconnect_delay_secs,
                    };

                    let session = TwitchSession::start(session_config, move |status_kind, msg| {
                        let this_inner = Arc::clone(&this);
                        let sid_inner = sid.clone();
                        tauri::async_runtime::spawn(async move {
                            let now = Utc::now().timestamp();
                            let mut map = this_inner.statuses.lock().await;

                            let prev_conn = map.get(&sid_inner).and_then(|s| s.connected_at);
                            let connected_at = if status_kind == StatusKind::Connected {
                                prev_conn.or(Some(now))
                            } else {
                                None
                            };

                            if let Some(current) = map.get_mut(&sid_inner) {
                                if status_kind == StatusKind::Connected {
                                    current.status = StatusKind::Connected;
                                    current.is_live = true;
                                    current.message = None;
                                    if current.connected_at.is_none() {
                                        current.connected_at = connected_at;
                                    }
                                } else if status_kind == StatusKind::Error && current.status != StatusKind::Connected {
                                    current.status = StatusKind::Error;
                                    current.message = msg;
                                }
                                let cloned = current.clone();
                                drop(map);
                                this_inner.emit_status(&cloned).await;
                            }
                        });
                    });

                    self.twitch_sessions.lock().await.insert(session_key, session);
                }

                let now = Utc::now().timestamp();
                let ram = (accounts_with_tokens.len() as u32) * 1;
                let status = StreamRuntimeStatus {
                    stream_id: stream_id.to_string(),
                    status: StatusKind::Connected,
                    is_live: true,
                    message: None,
                    uptime_seconds: 0,
                    estimated_ram_mb: ram,
                    connected_at: Some(now),
                    channel_points: None,
                    account_points: HashMap::new(),
                };

                self.statuses.lock().await.insert(stream_id.to_string(), status.clone());
                self.emit_status(&status).await;
                Ok(())
            }
            Platform::Kick => {
                let this = Arc::clone(self);
                let mut started_count = 0;

                for account in accounts {
                    let session_token = match &account.session_token {
                        Some(t) if !t.is_empty() => t.clone(),
                        _ => {
                            eprintln!("[Kick] Conta '{}' sem session_token configurado.", account.label);
                            continue;
                        }
                    };

                    let session_key = format!("{}:{}", stream_id, account.id);
                    {
                        let mut watchers = self.kick_watchers.lock().await;
                        if let Some(mut existing) = watchers.remove(&session_key) {
                            existing.stop();
                        }
                    }

                    let this_inner = Arc::clone(&this);
                    let s_id = stream_id.to_string();
                    let a_id = account.id.clone();

                    let on_status: crate::kick::watcher::StatusCallback = Arc::new(
                        move |status_kind, msg, points| {
                            let this_cb = Arc::clone(&this_inner);
                            let s_id_cb = s_id.clone();
                            let a_id_cb = a_id.clone();
                            tauri::async_runtime::spawn(async move {
                                let now = Utc::now().timestamp();
                                let selected_id = {
                                    let cfg = this_cb.config.lock().await;
                                    cfg.streams
                                        .iter()
                                        .find(|s| s.id == s_id_cb)
                                        .and_then(|s| s.selected_account_id.clone().or_else(|| s.account_ids.first().cloned()))
                                };
                                let mut map = this_cb.statuses.lock().await;
                                if let Some(current) = map.get_mut(&s_id_cb) {
                                    let is_conn = status_kind == StatusKind::Connected;
                                    current.status = status_kind;
                                    current.message = msg;
                                    current.estimated_ram_mb = 1;
                                    if is_conn {
                                        current.is_live = true;
                                        if current.connected_at.is_none() {
                                            current.connected_at = Some(now);
                                        }
                                    }
                                    if let Some(pts) = points {
                                        let pts_str = pts.to_string();
                                        current.account_points.insert(a_id_cb.clone(), pts_str.clone());
                                        if selected_id.as_deref() == Some(&a_id_cb) || current.channel_points.is_none() {
                                            current.channel_points = Some(pts_str);
                                        }
                                    }
                                    let cloned = current.clone();
                                    drop(map);
                                    this_cb.emit_status(&cloned).await;
                                }
                            });
                        },
                    );

                    let watcher = crate::kick::watcher::start_kick_watcher(
                        stream_id.to_string(),
                        account.id.clone(),
                        session_token,
                        channel_slug.to_string(),
                        on_status,
                    );

                    self.kick_watchers.lock().await.insert(session_key, watcher);
                    started_count += 1;
                }

                if started_count == 0 {
                    let mut stat_lock = self.statuses.lock().await;
                    let st = StreamRuntimeStatus {
                        stream_id: stream_id.to_string(),
                        status: StatusKind::Error,
                        is_live: true,
                        message: Some("Nenhuma conta com login da Kick configurado. Vá em 'Contas' e faça o login.".into()),
                        uptime_seconds: 0,
                        estimated_ram_mb: 0,
                        connected_at: None,
                        channel_points: None,
                        account_points: HashMap::new(),
                    };
                    stat_lock.insert(stream_id.to_string(), st.clone());
                    drop(stat_lock);
                    self.emit_status(&st).await;
                    return Err("Nenhuma conta Kick autenticada com cookies válidos".into());
                }

                let now = Utc::now().timestamp();
                let status = StreamRuntimeStatus {
                    stream_id: stream_id.to_string(),
                    status: StatusKind::Connecting,
                    is_live: true,
                    message: Some("Iniciando watcher nativo da Kick...".into()),
                    uptime_seconds: 0,
                    estimated_ram_mb: (started_count as u32) * 1,
                    connected_at: Some(now),
                    channel_points: None,
                    account_points: HashMap::new(),
                };

                self.statuses.lock().await.insert(stream_id.to_string(), status.clone());
                self.emit_status(&status).await;
                Ok(())
            }
        }
    }

    pub async fn stop_stream(&self, stream_id: &str) {
        {
            let prefix = format!("{}:", stream_id);
            let mut sessions = self.twitch_sessions.lock().await;
            let keys: Vec<String> = sessions
                .keys()
                .filter(|k| k.starts_with(&prefix) || *k == stream_id)
                .cloned()
                .collect();
            for k in keys {
                if let Some(mut sess) = sessions.remove(&k) {
                    sess.stop();
                }
            }
        }

        {
            let prefix = format!("{}:", stream_id);
            let mut watchers = self.kick_watchers.lock().await;
            let keys: Vec<String> = watchers
                .keys()
                .filter(|k| k.starts_with(&prefix) || *k == stream_id)
                .cloned()
                .collect();
            for k in keys {
                if let Some(mut watcher) = watchers.remove(&k) {
                    watcher.stop();
                }
            }
        }

        let (prev_points, prev_account_points) = {
            let map = self.statuses.lock().await;
            if let Some(s) = map.get(stream_id) {
                (s.channel_points.clone(), s.account_points.clone())
            } else {
                (None, HashMap::new())
            }
        };

        let status = StreamRuntimeStatus {
            stream_id: stream_id.to_string(),
            status: StatusKind::Disconnected,
            is_live: false,
            message: None,
            uptime_seconds: 0,
            estimated_ram_mb: 0,
            connected_at: None,
            channel_points: prev_points,
            account_points: prev_account_points,
        };

        self.statuses.lock().await.insert(stream_id.to_string(), status.clone());
        self.emit_status(&status).await;
    }

    /// Periodic background watcher that monitors live status for streams in Standby or Connected
    pub fn start_vigilance_loop(self: &Arc<Self>) {
        let this = Arc::clone(self);
        tauri::async_runtime::spawn(async move {
            loop {
                // Intervalo de vigília: 300 segundos (5 minutos) para economia extrema de bateria e dados
                tokio::time::sleep(Duration::from_secs(300)).await;

                let streams = {
                    let cfg = this.config.lock().await;
                    cfg.streams.clone()
                };

                for stream in streams {
                    let current_status = {
                        let map = this.statuses.lock().await;
                        map.get(&stream.id).cloned()
                    };

                    let Some(curr) = current_status else { continue };

                    // Only monitor streams that are in Standby or Connected (ignore manually Disconnected streams)
                    if curr.status != StatusKind::Standby && curr.status != StatusKind::Connected {
                        continue;
                    }

                    let is_live = match stream.platform {
                        Platform::Twitch => check_twitch_live(&this.http_client, &stream.channel_slug).await,
                        Platform::Kick => check_kick_live(&this.http_client, &stream.channel_slug).await,
                    };

                    if curr.status == StatusKind::Standby && is_live {
                        // Stream came ONLINE! Activate player / IRC for all associated accounts
                        let accounts = {
                            let cfg = this.config.lock().await;
                            cfg.accounts
                                .iter()
                                .filter(|a| stream.account_ids.contains(&a.id))
                                .cloned()
                                .collect::<Vec<_>>()
                        };
                        if !accounts.is_empty() {
                            let _ = this.activate_online_stream(&stream.id, &stream.platform, &stream.channel_slug, &accounts).await;
                        }
                    } else if curr.status == StatusKind::Connected && !is_live {
                        // Stream went OFFLINE! Stop players to free up RAM, transition to Standby
                        if stream.platform == Platform::Kick {
                            let prefix = format!("{}:", stream.id);
                            let mut watchers = this.kick_watchers.lock().await;
                            let keys: Vec<String> = watchers
                                .keys()
                                .filter(|k| k.starts_with(&prefix) || k.as_str() == stream.id)
                                .cloned()
                                .collect();
                            for k in keys {
                                if let Some(mut watcher) = watchers.remove(&k) {
                                    watcher.stop();
                                }
                            }
                        } else {
                            let prefix = format!("{}:", stream.id);
                            let mut sessions = this.twitch_sessions.lock().await;
                            let keys: Vec<String> = sessions
                                .keys()
                                .filter(|k| k.starts_with(&prefix) || k.as_str() == stream.id)
                                .cloned()
                                .collect();
                            for k in keys {
                                if let Some(mut sess) = sessions.remove(&k) {
                                    sess.stop();
                                }
                            }
                        }

                        let (prev_points, prev_account_points) = {
                            let map = this.statuses.lock().await;
                            if let Some(s) = map.get(&stream.id) {
                                (s.channel_points.clone(), s.account_points.clone())
                            } else {
                                (None, HashMap::new())
                            }
                        };

                        let standby_status = StreamRuntimeStatus {
                            stream_id: stream.id.clone(),
                            status: StatusKind::Standby,
                            is_live: false,
                            message: Some("Stream encerrou. Em vigília aguardando próximo broadcast...".into()),
                            uptime_seconds: 0,
                            estimated_ram_mb: 0,
                            connected_at: None,
                            channel_points: prev_points,
                            account_points: prev_account_points,
                        };

                        this.statuses.lock().await.insert(stream.id.clone(), standby_status.clone());
                        this.emit_status(&standby_status).await;
                    }
                }
            }
        });
    }
}
