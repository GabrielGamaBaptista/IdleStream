use crate::accounts::models::{
    aggregate_accounts_health, AccountHealthState, AccountHealthStatus, AccountsHealthSummary,
};
use crate::accounts::session_sync::{
    compute_twitch_credentials_hash, detect_kick_cookie_rotation, detect_twitch_cookie_rotation,
    write_profile_sync_hash, StoredCookieSnapshot,
};
use crate::accounts::verifier::{verify_kick_account, verify_twitch_account};
use crate::config::{
    AppConfig, ConfigStore, Platform, RuntimeSessionState, StatusKind, StreamRuntimeStatus,
};
use crate::live_check::{check_kick_live, check_twitch_live};
use crate::twitch::{TwitchSession, TwitchSessionConfig};
use chrono::Utc;
use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;

pub fn compute_streams_to_restore(config: &AppConfig, runtime: &RuntimeSessionState) -> Vec<String> {
    let mut ids = Vec::new();
    for stream in &config.streams {
        if stream.auto_start || runtime.desired_active_stream_ids.contains(&stream.id) {
            if !ids.contains(&stream.id) {
                ids.push(stream.id.clone());
            }
        }
    }
    ids
}

pub struct AppState {
    pub config: Mutex<AppConfig>,
    pub runtime_state: Mutex<RuntimeSessionState>,
    pub config_store: ConfigStore,
    pub twitch_sessions: Mutex<HashMap<String, TwitchSession>>,
    pub twitch_watchers: Mutex<HashMap<String, crate::twitch::watcher::TwitchWatcherHandle>>,
    pub twitch_coordinator: crate::twitch::coordinator::AccountPriorityCoordinator,
    pub kick_watchers: Mutex<HashMap<String, crate::kick::watcher::KickWatcherHandle>>,
    pub kick_coordinator: crate::kick::coordinator::KickPriorityCoordinator,
    pub statuses: Mutex<HashMap<String, StreamRuntimeStatus>>,
    pub account_health: Mutex<HashMap<String, AccountHealthStatus>>,
    pub account_health_last_checked: Mutex<i64>,
    pub verify_all_lock: Mutex<()>,
    pub http_client: reqwest::Client,
    pub app_handle: AppHandle,
    pub device_sync_tracker: Mutex<crate::device_sync::DeviceSyncTracker>,
    pub device_sync_op_lock: Mutex<()>,
    pub android_active_game_slots: Mutex<Vec<String>>,
    pub takeover_shutting_down: std::sync::atomic::AtomicBool,
}

impl AppState {
    pub fn new(app_handle: AppHandle) -> Self {
        let config_store = ConfigStore::new(&app_handle);
        let config = config_store.load();
        let mut runtime_state = config_store.load_runtime_state();

        let device_link_id = match runtime_state
            .device_link_id
            .clone()
            .filter(|s| !s.trim().is_empty())
        {
            Some(id) => id,
            None => {
                let raw_uuid = uuid::Uuid::new_v4().to_string().replace('-', "");
                let generated = format!("dev_{}", &raw_uuid[..9]);
                runtime_state.device_link_id = Some(generated.clone());
                let _ = config_store.save_runtime_state(&runtime_state);
                generated
            }
        };
        let device_sync_tracker = Mutex::new(crate::device_sync::DeviceSyncTracker::new(
            device_link_id,
            crate::device_sync::current_device_type(),
        ));

        let mut statuses = HashMap::new();
        for stream in &config.streams {
            statuses.insert(
                stream.id.clone(),
                StreamRuntimeStatus {
                    stream_id: stream.id.clone(),
                    status: StatusKind::Disconnected,
                    is_live: false,
                    is_farming: false,
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
            runtime_state: Mutex::new(runtime_state),
            config_store,
            twitch_sessions: Mutex::new(HashMap::new()),
            twitch_watchers: Mutex::new(HashMap::new()),
            twitch_coordinator: crate::twitch::coordinator::AccountPriorityCoordinator::new(),
            kick_watchers: Mutex::new(HashMap::new()),
            kick_coordinator: crate::kick::coordinator::KickPriorityCoordinator::new(),
            statuses: Mutex::new(statuses),
            account_health: Mutex::new(HashMap::new()),
            account_health_last_checked: Mutex::new(0),
            verify_all_lock: Mutex::new(()),
            http_client,
            app_handle,
            device_sync_tracker,
            device_sync_op_lock: Mutex::new(()),
            android_active_game_slots: Mutex::new(Vec::new()),
            takeover_shutting_down: std::sync::atomic::AtomicBool::new(false),
        }
    }

    pub async fn emit_status(&self, status: &StreamRuntimeStatus) {
        if self
            .takeover_shutting_down
            .load(std::sync::atomic::Ordering::SeqCst)
        {
            return;
        }
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

        let mut twitch_watchers = self.twitch_watchers.lock().await;
        if let Some(mut tw) = twitch_watchers.remove(&session_key) {
            tw.stop();
        }
        drop(twitch_watchers);

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

    pub async fn mark_stream_desired_active(&self, stream_id: &str, active: bool) {
        let mut rt = self.runtime_state.lock().await;
        let changed = if active {
            if !rt.desired_active_stream_ids.iter().any(|id| id == stream_id) {
                rt.desired_active_stream_ids.push(stream_id.to_string());
                true
            } else {
                false
            }
        } else {
            let before = rt.desired_active_stream_ids.len();
            rt.desired_active_stream_ids.retain(|id| id != stream_id);
            rt.desired_active_stream_ids.len() != before
        };
        if changed {
            let _ = self.config_store.save_runtime_state(&rt);
        }
    }

    pub async fn get_runtime_state(&self) -> RuntimeSessionState {
        self.runtime_state.lock().await.clone()
    }

    pub async fn set_runtime_ui_state(
        &self,
        last_active_tab: Option<String>,
        desired_active_game_slots: Option<Vec<String>>,
    ) -> Result<RuntimeSessionState, String> {
        let mut rt = self.runtime_state.lock().await;
        if let Some(tab) = last_active_tab {
            rt.last_active_tab = Some(tab);
        }
        if let Some(slots) = desired_active_game_slots {
            rt.desired_active_game_slots = slots;
        }
        self.config_store.save_runtime_state(&rt)?;
        Ok(rt.clone())
    }

    pub async fn get_streams_to_restore(&self) -> Vec<String> {
        let cfg = self.config.lock().await;
        let rt = self.runtime_state.lock().await;
        compute_streams_to_restore(&cfg, &rt)
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

        crate::audit_log!(
            "LIVES",
            "INFO",
            "Iniciando monitoramento de stream: [{}] ({:?}) com {} conta(s)",
            stream.channel_slug,
            stream.platform,
            accounts.len()
        );

        // Persiste intenção ativa imediatamente para auto-retomada após recriação/reinício
        self.mark_stream_desired_active(stream_id, true).await;

        // Reivindica posse exclusiva no Elo PC <-> Celular assim que qualquer live iniciar
        let this_claim = Arc::clone(self);
        tauri::async_runtime::spawn(async move {
            this_claim.notify_farming_started().await;
        });

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
                is_farming: false,
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

            // Consulta assíncrona inicial de pontos para todas as contas em modo vigília
            let this = Arc::clone(self);
            let s_id = stream_id.to_string();
            let slug = stream.channel_slug.clone();
            let plat = stream.platform;
            let accs = accounts.clone();

            tauri::async_runtime::spawn(async move {
                for acc in accs {
                    match plat {
                        Platform::Twitch => {
                            if let Some(ref token) = acc.oauth_token {
                                if !token.is_empty() {
                                    if let Ok(bal) = crate::twitch::gql::fetch_channel_points_only(&this.http_client, &slug, token).await {
                                        this.update_points(&s_id, &acc.id, &bal.to_string()).await;
                                    }
                                }
                            }
                        }
                        Platform::Kick => {
                            if let Some(ref st) = acc.session_token {
                                if !st.is_empty() {
                                    if let Ok(pts) = crate::kick::watcher::fetch_channel_points(st, &slug).await {
                                        this.update_points(&s_id, &acc.id, &pts.to_string()).await;
                                    }
                                }
                            }
                        }
                    }
                }
            });

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
                        is_farming: false,
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
                    let this_irc_auth = Arc::clone(self);
                    let acc_id_irc = account.id.clone();

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
                        let auth_state = Arc::clone(&this_irc_auth);
                        let auth_acc = acc_id_irc.clone();
                        tauri::async_runtime::spawn(async move {
                            if status_kind == StatusKind::Error {
                                if let Some(ref m) = msg {
                                    if m.contains("Login authentication failed") {
                                        let m_clone = m.clone();
                                        let a_state = Arc::clone(&auth_state);
                                        let a_id = auth_acc.clone();
                                        tauri::async_runtime::spawn(async move {
                                            a_state.handle_watcher_auth_failure(&a_id, m_clone).await;
                                        });
                                    }
                                }
                            }
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
                                    current.is_farming = true;
                                    if msg.is_some() {
                                        current.message = msg;
                                    }
                                    if current.connected_at.is_none() {
                                        current.connected_at = connected_at;
                                    }
                                } else if status_kind == StatusKind::Error && current.status != StatusKind::Connected {
                                    current.status = StatusKind::Error;
                                    current.is_farming = false;
                                    current.message = msg;
                                }
                                let cloned = current.clone();
                                drop(map);
                                this_inner.emit_status(&cloned).await;
                            }
                        });
                    });

                    self.twitch_sessions.lock().await.insert(session_key.clone(), session);

                    // Inicia o watcher nativo de pontos de canal da Twitch com rotação de prioridade
                    {
                        let mut watchers = self.twitch_watchers.lock().await;
                        if let Some(mut existing) = watchers.remove(&session_key) {
                            existing.stop();
                        }
                    }

                    let this_tw = Arc::clone(self);
                    let s_id = stream_id.to_string();
                    let a_id = account.id.clone();

                    let on_status: crate::twitch::watcher::StatusCallback = Arc::new(
                        move |status_kind, msg, points| {
                            let this_cb = Arc::clone(&this_tw);
                            let s_id_cb = s_id.clone();
                            let a_id_cb = a_id.clone();
                            tauri::async_runtime::spawn(async move {
                                let now = Utc::now().timestamp();
                                let selected_id = {
                                    let cfg = this_cb.config.lock().await;
                                    cfg.streams
                                        .iter()
                                        .find(|s| s.id == s_id_cb)
                                        .and_then(|s| {
                                            s.selected_account_id.clone().or_else(|| {
                                                s.account_ids.iter().find(|id| {
                                                    cfg.accounts.iter().any(|a| {
                                                        &a.id == *id
                                                            && a.oauth_token
                                                                .as_ref()
                                                                .map(|t| !t.trim().is_empty())
                                                                .unwrap_or(false)
                                                    })
                                                }).cloned()
                                            }).or_else(|| s.account_ids.first().cloned())
                                        })
                                };
                                let is_selected_or_first = selected_id.as_deref() == Some(&a_id_cb);
                                let mut map = this_cb.statuses.lock().await;
                                if let Some(current) = map.get_mut(&s_id_cb) {
                                    if let Some(pts) = points {
                                        let pts_str = pts.to_string();
                                        current.account_points.insert(a_id_cb.clone(), pts_str.clone());
                                        if is_selected_or_first || current.channel_points.is_none() {
                                            current.channel_points = Some(pts_str);
                                        }
                                    }

                                    current.estimated_ram_mb = 1;

                                    match status_kind {
                                        StatusKind::Connected => {
                                            current.status = StatusKind::Connected;
                                            current.is_live = true;
                                            current.is_farming = true;
                                            if msg.is_some() {
                                                current.message = msg;
                                            }
                                            if current.connected_at.is_none() {
                                                current.connected_at = Some(now);
                                            }
                                        }
                                        StatusKind::Standby => {
                                            if is_selected_or_first {
                                                current.status = StatusKind::Standby;
                                                current.is_farming = false;
                                                // Se mensagem indica fila de espera (streamer online na Twitch), mantém is_live = true
                                                let is_waiting_in_queue = msg.as_deref().map(|m| m.contains("Fila de espera") || m.contains("fila")).unwrap_or(false);
                                                current.is_live = is_waiting_in_queue;
                                                current.message = msg;
                                                current.connected_at = None;
                                            }
                                        }
                                        StatusKind::Connecting => {
                                            if current.status != StatusKind::Connected {
                                                current.status = StatusKind::Connecting;
                                                current.is_farming = false;
                                                if is_selected_or_first || current.message.is_none() {
                                                    current.message = msg;
                                                }
                                            }
                                        }
                                        StatusKind::Error => {
                                            if current.status != StatusKind::Connected {
                                                if is_selected_or_first || current.status == StatusKind::Connecting || current.status == StatusKind::Disconnected {
                                                    current.status = StatusKind::Error;
                                                    current.is_farming = false;
                                                    current.message = msg;
                                                }
                                            }
                                        }
                                        StatusKind::Disconnected => {
                                            if is_selected_or_first && current.status != StatusKind::Connected {
                                                current.status = StatusKind::Disconnected;
                                                current.is_farming = false;
                                                current.message = msg;
                                            }
                                        }
                                    }

                                    let cloned = current.clone();
                                    drop(map);
                                    this_cb.emit_status(&cloned).await;
                                }
                            });
                        },
                    );

                    let this_tw_auth = Arc::clone(self);
                    let acc_id_tw_auth = account.id.clone();
                    let on_twitch_auth_failure: crate::twitch::watcher::AuthFailureCallback = Arc::new(move |err| {
                        let st = Arc::clone(&this_tw_auth);
                        let aid = acc_id_tw_auth.clone();
                        tauri::async_runtime::spawn(async move {
                            st.handle_watcher_auth_failure(&aid, err).await;
                        });
                    });

                    let watcher = crate::twitch::watcher::start_twitch_watcher(
                        stream_id.to_string(),
                        account.id.clone(),
                        account.oauth_token.clone().unwrap_or_default(),
                        channel_slug.to_string(),
                        None,
                        None,
                        self.twitch_coordinator.clone(),
                        on_status,
                        Some(self.app_handle.clone()),
                        Some(on_twitch_auth_failure),
                    );

                    self.twitch_watchers.lock().await.insert(session_key, watcher);
                }

                let (prev_pts, prev_acc_pts) = {
                    let map = self.statuses.lock().await;
                    if let Some(s) = map.get(stream_id) {
                        (s.channel_points.clone(), s.account_points.clone())
                    } else {
                        (None, HashMap::new())
                    }
                };

                let ram = (accounts_with_tokens.len() as u32) * 1;
                let status = StreamRuntimeStatus {
                    stream_id: stream_id.to_string(),
                    status: StatusKind::Connecting,
                    is_live: true,
                    is_farming: false,
                    message: Some("Aguardando verificação de prioridade Twitch...".into()),
                    uptime_seconds: 0,
                    estimated_ram_mb: ram,
                    connected_at: None,
                    channel_points: prev_pts,
                    account_points: prev_acc_pts,
                };

                self.statuses.lock().await.insert(stream_id.to_string(), status.clone());
                self.emit_status(&status).await;
                Ok(())
            }
            Platform::Kick => {
                let this = Arc::clone(self);

                let valid_accounts: Vec<crate::config::Account> = accounts
                    .iter()
                    .filter(|a| a.session_token.as_ref().map(|t| !t.trim().is_empty()).unwrap_or(false))
                    .cloned()
                    .collect();

                if valid_accounts.is_empty() {
                    let mut stat_lock = self.statuses.lock().await;
                    let st = StreamRuntimeStatus {
                        stream_id: stream_id.to_string(),
                        status: StatusKind::Error,
                        is_live: true,
                        is_farming: false,
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

                // Preserva pontos conhecidos e emite status inicial Connecting antes de iniciar os watchers
                let (prev_pts, prev_acc_pts) = {
                    let map = self.statuses.lock().await;
                    if let Some(s) = map.get(stream_id) {
                        (s.channel_points.clone(), s.account_points.clone())
                    } else {
                        (None, HashMap::new())
                    }
                };

                let connecting_status = StreamRuntimeStatus {
                    stream_id: stream_id.to_string(),
                    status: StatusKind::Connecting,
                    is_live: true,
                    is_farming: false,
                    message: None,
                    uptime_seconds: 0,
                    estimated_ram_mb: (valid_accounts.len() as u32) * 1,
                    connected_at: None,
                    channel_points: prev_pts,
                    account_points: prev_acc_pts,
                };
                self.statuses.lock().await.insert(stream_id.to_string(), connecting_status.clone());
                self.emit_status(&connecting_status).await;

                for (idx, account) in valid_accounts.iter().enumerate() {
                    let session_token = match &account.session_token {
                        Some(t) if !t.is_empty() => t.clone(),
                        _ => continue,
                    };

                    if idx > 0 {
                        // Escalonamento de 2.5s entre contas para evitar rate-limit (429) na Kick
                        tokio::time::sleep(tokio::time::Duration::from_millis(2500)).await;
                    }

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
                                        .and_then(|s| {
                                            s.selected_account_id.clone().or_else(|| {
                                                s.account_ids.iter().find(|id| {
                                                    cfg.accounts.iter().any(|a| {
                                                        &a.id == *id
                                                            && a.session_token
                                                                .as_ref()
                                                                .map(|t| !t.trim().is_empty())
                                                                .unwrap_or(false)
                                                    })
                                                }).cloned()
                                            }).or_else(|| s.account_ids.first().cloned())
                                        })
                                };
                                let is_selected_or_first = selected_id.as_deref() == Some(&a_id_cb);
                                let mut map = this_cb.statuses.lock().await;
                                if let Some(current) = map.get_mut(&s_id_cb) {
                                    if let Some(pts) = points {
                                        let pts_str = pts.to_string();
                                        current.account_points.insert(a_id_cb.clone(), pts_str.clone());
                                        if is_selected_or_first || current.channel_points.is_none() {
                                            current.channel_points = Some(pts_str);
                                        }
                                    }

                                    current.estimated_ram_mb = 1;

                                    match status_kind {
                                        StatusKind::Connected => {
                                            // Se QUALQUER conta conectou com sucesso, a stream está ativa e farmando!
                                            current.status = StatusKind::Connected;
                                            current.is_live = true;
                                            current.is_farming = true;
                                            if msg.is_some() {
                                                current.message = msg;
                                            }
                                            if current.connected_at.is_none() {
                                                current.connected_at = Some(now);
                                            }
                                        }
                                        StatusKind::Standby => {
                                            if is_selected_or_first {
                                                current.status = StatusKind::Standby;
                                                current.is_farming = false;
                                                // Se mensagem indica fila de vigília Kick (streamer online), mantém is_live = true
                                                let is_waiting_in_queue = msg.as_deref().map(|m| m.contains("vigília Kick") || m.contains("fila")).unwrap_or(false);
                                                current.is_live = is_waiting_in_queue;
                                                current.message = msg;
                                                current.connected_at = None;
                                            }
                                        }
                                        StatusKind::Connecting => {
                                            if current.status != StatusKind::Connected {
                                                current.status = StatusKind::Connecting;
                                                current.is_farming = false;
                                                if is_selected_or_first || current.message.is_none() {
                                                    current.message = msg;
                                                }
                                            }
                                        }
                                        StatusKind::Error => {
                                            if current.status != StatusKind::Connected {
                                                if is_selected_or_first || current.status == StatusKind::Connecting || current.status == StatusKind::Disconnected {
                                                    current.status = StatusKind::Error;
                                                    current.is_farming = false;
                                                    current.message = msg;
                                                }
                                            }
                                        }
                                        StatusKind::Disconnected => {
                                            if is_selected_or_first && current.status != StatusKind::Connected {
                                                current.status = StatusKind::Disconnected;
                                                current.is_farming = false;
                                                current.message = msg;
                                            }
                                        }
                                    }

                                    let cloned = current.clone();
                                    drop(map);
                                    this_cb.emit_status(&cloned).await;
                                }
                            });
                        },
                    );

                    let this_kick_auth = Arc::clone(&this);
                    let acc_id_kick_auth = account.id.clone();
                    let on_kick_auth_failure: crate::kick::watcher::AuthFailureCallback = Arc::new(move |err| {
                        let st = Arc::clone(&this_kick_auth);
                        let aid = acc_id_kick_auth.clone();
                        tauri::async_runtime::spawn(async move {
                            st.handle_watcher_auth_failure(&aid, err).await;
                        });
                    });

                    let watcher = crate::kick::watcher::start_kick_watcher(
                        stream_id.to_string(),
                        account.id.clone(),
                        session_token,
                        channel_slug.to_string(),
                        self.kick_coordinator.clone(),
                        on_status,
                        Some(on_kick_auth_failure),
                    );

                    self.kick_watchers.lock().await.insert(session_key, watcher);
                }

                Ok(())
            }
        }
    }

    pub async fn stop_stream(&self, stream_id: &str) {
        crate::audit_log!("LIVES", "INFO", "Stream finalizada manualmente: ID {}", stream_id);
        self.mark_stream_desired_active(stream_id, false).await;

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
            let mut watchers = self.twitch_watchers.lock().await;
            let keys: Vec<String> = watchers
                .keys()
                .filter(|k| k.starts_with(&prefix) || *k == stream_id)
                .cloned()
                .collect();
            for k in keys {
                if let Some(mut w) = watchers.remove(&k) {
                    w.stop();
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

        // Garante remoção imediata dos streamers dos coordenadores de prioridade
        let stream_info = {
            let cfg = self.config.lock().await;
            cfg.streams.iter().find(|s| s.id == stream_id).cloned()
        };
        if let Some(stream) = stream_info {
            let clean_slug = stream.channel_slug.trim().trim_start_matches('/').to_lowercase();
            for acc_id in &stream.account_ids {
                if stream.platform == Platform::Kick {
                    self.kick_coordinator.remove_streamer(acc_id, &clean_slug).await;
                } else if stream.platform == Platform::Twitch {
                    self.twitch_coordinator.remove_streamer(acc_id, &clean_slug).await;
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
            is_farming: false,
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
            let mut first_pass = true;
            loop {
                // Primeira verificação rápida após 15s (recuperação ágil após reinício), depois a cada 300s (5 min)
                let delay = if first_pass {
                    first_pass = false;
                    Duration::from_secs(15)
                } else {
                    Duration::from_secs(300)
                };
                tokio::time::sleep(delay).await;

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

                    // Only monitor streams that are active or in standby/connecting/error (ignore manually Disconnected streams)
                    if curr.status == StatusKind::Disconnected {
                        continue;
                    }

                    let is_live = match stream.platform {
                        Platform::Twitch => check_twitch_live(&this.http_client, &stream.channel_slug).await,
                        Platform::Kick => check_kick_live(&this.http_client, &stream.channel_slug).await,
                    };

                    let has_active_watchers = if stream.platform == Platform::Kick {
                        let prefix = format!("{}:", stream.id);
                        let watchers = this.kick_watchers.lock().await;
                        watchers.keys().any(|k| k.starts_with(&prefix) || k.as_str() == stream.id)
                    } else {
                        let prefix = format!("{}:", stream.id);
                        let watchers = this.twitch_watchers.lock().await;
                        watchers.keys().any(|k| k.starts_with(&prefix) || k.as_str() == stream.id)
                    };

                    if is_live {
                        // Stream está ONLINE: ativa apenas se transitou de offline ou se não possui watcher ativo
                        if !has_active_watchers || (!curr.is_live && curr.status == StatusKind::Standby) {
                            crate::audit_log!(
                                "LIVES",
                                "INFO",
                                "Stream [{}] ({:?}) entrou AO VIVO! Iniciando farm ativo.",
                                stream.channel_slug,
                                stream.platform
                            );
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
                        }
                    } else if (curr.status == StatusKind::Connected || curr.status == StatusKind::Connecting || curr.is_live || has_active_watchers) && !is_live {
                        // Stream encerrou a transmissão (OFFLINE)! Encerra players e entra em vigília (0 MB)
                        crate::audit_log!(
                            "LIVES",
                            "INFO",
                            "Stream [{}] ({:?}) encerrou transmissão. Entrando em Modo Vigília (0 MB RAM).",
                            stream.channel_slug,
                            stream.platform
                        );
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
                            drop(sessions);

                            let mut watchers = this.twitch_watchers.lock().await;
                            let w_keys: Vec<String> = watchers
                                .keys()
                                .filter(|k| k.starts_with(&prefix) || k.as_str() == stream.id)
                                .cloned()
                                .collect();
                            for k in w_keys {
                                if let Some(mut w) = watchers.remove(&k) {
                                    w.stop();
                                }
                            }
                            drop(watchers);
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
                            is_farming: false,
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

    pub async fn get_accounts_health_summary(&self) -> AccountsHealthSummary {
        let accounts = {
            let cfg = self.config.lock().await;
            cfg.accounts.clone()
        };
        let statuses = self.account_health.lock().await.clone();
        let last_checked = *self.account_health_last_checked.lock().await;
        aggregate_accounts_health(&accounts, &statuses, last_checked)
    }

    pub async fn emit_accounts_health(&self) -> AccountsHealthSummary {
        let summary = self.get_accounts_health_summary().await;
        let _ = self.app_handle.emit("accounts-health-updated", &summary);
        summary
    }

    async fn maybe_update_account_username(&self, account_id: &str, authenticated_username: Option<&str>) {
        let Some(auth_name) = authenticated_username.map(str::trim).filter(|s| !s.is_empty()) else {
            return;
        };
        let mut cfg = self.config.lock().await;
        if let Some(acc) = cfg.accounts.iter_mut().find(|a| a.id == account_id) {
            if acc.username.trim().is_empty() {
                acc.username = auth_name.to_string();
                let _ = self.config_store.save(&cfg);
                drop(cfg);
                let _ = self.app_handle.emit("accounts-config-synced", ());
            }
        }
    }

    pub async fn remove_account_health(&self, account_id: &str) {
        self.account_health.lock().await.remove(account_id);
        let _ = self.emit_accounts_health().await;
    }

    pub async fn verify_single_account(
        self: &Arc<Self>,
        account_id: &str,
    ) -> Result<AccountHealthStatus, String> {
        let account = {
            let cfg = self.config.lock().await;
            cfg.accounts
                .iter()
                .find(|a| a.id == account_id)
                .cloned()
                .ok_or_else(|| format!("Conta '{}' não encontrada", account_id))?
        };

        let now = Utc::now().timestamp();
        {
            let mut map = self.account_health.lock().await;
            map.insert(
                account.id.clone(),
                AccountHealthStatus {
                    account_id: account.id.clone(),
                    platform: account.platform,
                    label: account.label.clone(),
                    username: account.username.clone(),
                    state: AccountHealthState::Checking,
                    authenticated_username: None,
                    username_matches: None,
                    has_redeem_session: match account.platform {
                        Platform::Kick => {
                            account.kick_session.as_deref().map(|s| !s.trim().is_empty()).unwrap_or(false)
                                && account.session_token.as_deref().map(|s| !s.trim().is_empty()).unwrap_or(false)
                        }
                        Platform::Twitch => account
                            .oauth_token
                            .as_deref()
                            .map(|s| !s.trim().is_empty())
                            .unwrap_or(false),
                    },
                    http_status: None,
                    message: "Verificando autenticação...".into(),
                    checked_at: now,
                    requires_reauth: false,
                },
            );
        }
        let _ = self.emit_accounts_health().await;

        let status = match tokio::time::timeout(
            Duration::from_secs(8),
            async {
                match account.platform {
                    Platform::Kick => verify_kick_account(&account).await,
                    Platform::Twitch => verify_twitch_account(&self.http_client, &account).await,
                }
            },
        )
        .await
        {
            Ok(s) => s,
            Err(_) => AccountHealthStatus {
                account_id: account.id.clone(),
                platform: account.platform,
                label: account.label.clone(),
                username: account.username.clone(),
                state: AccountHealthState::NetworkError,
                authenticated_username: None,
                username_matches: None,
                has_redeem_session: match account.platform {
                    Platform::Kick => {
                        account.kick_session.as_deref().map(|s| !s.trim().is_empty()).unwrap_or(false)
                            && account.session_token.as_deref().map(|s| !s.trim().is_empty()).unwrap_or(false)
                    }
                    Platform::Twitch => account
                        .oauth_token
                        .as_deref()
                        .map(|s| !s.trim().is_empty())
                        .unwrap_or(false),
                },
                http_status: Some(408),
                message: "Tempo limite (8s) esgotado ao verificar conta com o servidor.".into(),
                checked_at: now,
                requires_reauth: false,
            },
        };

        self.maybe_update_account_username(&account.id, status.authenticated_username.as_deref())
            .await;

        let log_level = if status.requires_reauth { "WARN" } else { "INFO" };
        crate::audit_log!(
            "ACCOUNTS",
            log_level,
            "Verificação [{}] (@{}) -> {:?}: {}",
            account.label,
            account.username,
            status.state,
            status.message
        );

        {
            let mut map = self.account_health.lock().await;
            map.insert(account.id.clone(), status.clone());
        }
        *self.account_health_last_checked.lock().await = Utc::now().timestamp();
        let _ = self.emit_accounts_health().await;

        Ok(status)
    }

    pub async fn verify_all_accounts(self: &Arc<Self>) -> AccountsHealthSummary {
        let _guard = self.verify_all_lock.lock().await;

        let accounts = {
            let cfg = self.config.lock().await;
            cfg.accounts.clone()
        };

        let now = Utc::now().timestamp();
        {
            let mut map = self.account_health.lock().await;
            let valid_ids: std::collections::HashSet<&str> =
                accounts.iter().map(|a| a.id.as_str()).collect();
            map.retain(|k, _| valid_ids.contains(k.as_str()));

            for acc in &accounts {
                map.entry(acc.id.clone()).and_modify(|existing| {
                    existing.state = AccountHealthState::Checking;
                    existing.message = "Verificando autenticação...".into();
                }).or_insert_with(|| AccountHealthStatus {
                    account_id: acc.id.clone(),
                    platform: acc.platform,
                    label: acc.label.clone(),
                    username: acc.username.clone(),
                    state: AccountHealthState::Checking,
                    authenticated_username: None,
                    username_matches: None,
                    has_redeem_session: false,
                    http_status: None,
                    message: "Verificando autenticação...".into(),
                    checked_at: now,
                    requires_reauth: false,
                });
            }
        }
        let _ = self.emit_accounts_health().await;

        let mut kick_index = 0usize;
        for acc in &accounts {
            if acc.platform == Platform::Kick {
                if kick_index > 0 {
                    tokio::time::sleep(Duration::from_millis(650)).await;
                }
                kick_index += 1;
            }

            let status = match tokio::time::timeout(
                Duration::from_secs(8),
                async {
                    match acc.platform {
                        Platform::Kick => verify_kick_account(acc).await,
                        Platform::Twitch => verify_twitch_account(&self.http_client, acc).await,
                    }
                },
            )
            .await
            {
                Ok(s) => s,
                Err(_) => AccountHealthStatus {
                    account_id: acc.id.clone(),
                    platform: acc.platform,
                    label: acc.label.clone(),
                    username: acc.username.clone(),
                    state: AccountHealthState::NetworkError,
                    authenticated_username: None,
                    username_matches: None,
                    has_redeem_session: match acc.platform {
                        Platform::Kick => {
                            acc.kick_session.as_deref().map(|s| !s.trim().is_empty()).unwrap_or(false)
                                && acc.session_token.as_deref().map(|s| !s.trim().is_empty()).unwrap_or(false)
                        }
                        Platform::Twitch => acc
                            .oauth_token
                            .as_deref()
                            .map(|s| !s.trim().is_empty())
                            .unwrap_or(false),
                    },
                    http_status: Some(408),
                    message: "Tempo limite (8s) esgotado ao verificar conta com o servidor.".into(),
                    checked_at: Utc::now().timestamp(),
                    requires_reauth: false,
                },
            };

            self.maybe_update_account_username(&acc.id, status.authenticated_username.as_deref())
                .await;

            let log_level = if status.requires_reauth { "WARN" } else { "INFO" };
            crate::audit_log!(
                "ACCOUNTS",
                log_level,
                "Verificação [{}] (@{}) -> {:?}: {}",
                acc.label,
                acc.username,
                status.state,
                status.message
            );

            {
                let mut map = self.account_health.lock().await;
                map.insert(acc.id.clone(), status);
            }
            *self.account_health_last_checked.lock().await = Utc::now().timestamp();
            let _ = self.emit_accounts_health().await;
        }

        // Cleanup guard: assegurar que nenhuma conta termine o ciclo no estado Checking

        {
            let mut map = self.account_health.lock().await;
            for st in map.values_mut() {
                if st.state == AccountHealthState::Checking {
                    st.state = AccountHealthState::NetworkError;
                    st.message = "Verificação interrompida ou com tempo esgotado.".into();
                }
            }
        }

        self.emit_accounts_health().await
    }

    pub async fn sync_kick_cookies_from_webview(
        &self,
        account_id: &str,
        profile_dir: &Path,
        snapshots: &[StoredCookieSnapshot],
    ) -> bool {
        let mut updated = false;
        {
            let mut cfg = self.config.lock().await;
            if let Some(acc) = cfg.accounts.iter_mut().find(|a| a.id == account_id) {
                if let Some(rot) = detect_kick_cookie_rotation(snapshots, acc) {
                    if let Some(ks) = rot.kick_session {
                        acc.kick_session = Some(ks);
                    }
                    if let Some(st) = rot.session_token {
                        acc.session_token = Some(st);
                    }
                    if let Some(xs) = rot.xsrf_token {
                        acc.xsrf_token = Some(xs);
                    }
                    let _ = self.config_store.save(&cfg);
                    write_profile_sync_hash(profile_dir, &rot.updated_hash);
                    updated = true;
                }
            }
        }
        if updated {
            let _ = self.app_handle.emit("accounts-config-synced", ());
        }
        updated
    }

    pub async fn sync_twitch_auth_from_webview(
        &self,
        account_id: &str,
        profile_dir: &Path,
        snapshots: &[StoredCookieSnapshot],
    ) -> bool {
        let mut updated = false;
        {
            let mut cfg = self.config.lock().await;
            if let Some(acc) = cfg.accounts.iter_mut().find(|a| a.id == account_id) {
                if let Some(new_tok) = detect_twitch_cookie_rotation(snapshots, acc) {
                    acc.oauth_token = Some(new_tok.clone());
                    let _ = self.config_store.save(&cfg);
                    let hash = compute_twitch_credentials_hash(Some(&new_tok));
                    write_profile_sync_hash(profile_dir, &hash);
                    updated = true;
                }
            }
        }
        if updated {
            let _ = self.app_handle.emit("accounts-config-synced", ());
        }
        updated
    }

    pub async fn handle_watcher_auth_failure(self: &Arc<Self>, account_id: &str, _reason: String) {
        let now = Utc::now().timestamp();
        let should_verify = {
            let map = self.account_health.lock().await;
            match map.get(account_id) {
                Some(st) => {
                    // Se já estiver confirmado como inválida, sem credenciais ou verificando no momento,
                    // ignora re-verificações automáticas agressivas de watchers para não entrar em loop.
                    if matches!(
                        st.state,
                        AccountHealthState::Checking
                            | AccountHealthState::Invalid
                            | AccountHealthState::MissingCredentials
                    ) {
                        false
                    } else {
                        // Se era Healthy, RateLimited ou NetworkError, só re-verifica se passaram mais de 900s (15 min) ou se era Healthy
                        now - st.checked_at >= 900 || st.state == AccountHealthState::Healthy
                    }
                }
                None => true,
            }
        };
        if !should_verify {
            return;
        }
        let _ = self.verify_single_account(account_id).await;
    }

    pub fn start_account_health_loop(self: &Arc<Self>) {
        let this = Arc::clone(self);
        tauri::async_runtime::spawn(async move {
            // Breve atraso inicial para permitir que a interface se conecte aos listeners Tauri
            tokio::time::sleep(Duration::from_millis(2500)).await;
            this.verify_all_accounts().await;

            loop {
                // Reverificação periódica silenciosa a cada 10 minutos
                tokio::time::sleep(Duration::from_secs(600)).await;
                this.verify_all_accounts().await;
            }
        });
    }

    pub async fn is_locally_farming(&self) -> bool {
        let stream_active = {
            let map = self.statuses.lock().await;
            map.values().any(|s| {
                matches!(
                    s.status,
                    StatusKind::Connected | StatusKind::Connecting | StatusKind::Standby
                ) || s.is_farming
            })
        };
        if stream_active {
            return true;
        }

        if let Some(gm) = tauri::Manager::try_state::<Arc<crate::games::manager::GameLayoutManager>>(&self.app_handle) {
            if !gm.active_slots.lock().await.is_empty() {
                return true;
            }
        }

        #[cfg(target_os = "android")]
        {
            if !self.android_active_game_slots.lock().await.is_empty() {
                return true;
            }
            if crate::kick::http::get_android_active_game_slots_count() > 0 {
                return true;
            }
        }

        false
    }

    pub async fn set_android_active_game_slots(self: &Arc<Self>, slots: Vec<String>) {
        let has_slots = !slots.is_empty();
        *self.android_active_game_slots.lock().await = slots;
        if has_slots {
            self.notify_farming_started().await;
        }
    }

    pub async fn stop_all_streams_for_takeover(&self) {
        let stream_ids: Vec<String> = {
            let cfg = self.config.lock().await;
            cfg.streams.iter().map(|s| s.id.clone()).collect()
        };

        {
            let mut sessions = self.twitch_sessions.lock().await;
            for (_, mut sess) in sessions.drain() {
                sess.stop();
            }
        }
        {
            let mut watchers = self.twitch_watchers.lock().await;
            for (_, mut w) in watchers.drain() {
                w.stop();
            }
        }
        {
            let mut watchers = self.kick_watchers.lock().await;
            for (_, mut w) in watchers.drain() {
                w.stop();
            }
        }

        let streams_copy = {
            let cfg = self.config.lock().await;
            cfg.streams.clone()
        };
        for stream in &streams_copy {
            let clean_slug = stream.channel_slug.trim().trim_start_matches('/').to_lowercase();
            for acc_id in &stream.account_ids {
                if stream.platform == Platform::Kick {
                    self.kick_coordinator.remove_streamer(acc_id, &clean_slug).await;
                } else {
                    self.twitch_coordinator.remove_streamer(acc_id, &clean_slug).await;
                }
            }
        }

        for sid in stream_ids {
            let (prev_points, prev_account_points) = {
                let map = self.statuses.lock().await;
                if let Some(s) = map.get(&sid) {
                    (s.channel_points.clone(), s.account_points.clone())
                } else {
                    (None, HashMap::new())
                }
            };
            let status = StreamRuntimeStatus {
                stream_id: sid.clone(),
                status: StatusKind::Disconnected,
                is_live: false,
                is_farming: false,
                message: Some("Encerrado pelo outro dispositivo conectado.".into()),
                uptime_seconds: 0,
                estimated_ram_mb: 0,
                connected_at: None,
                channel_points: prev_points,
                account_points: prev_account_points,
            };
            self.statuses.lock().await.insert(sid, status.clone());
            self.emit_status(&status).await;
        }
    }

    pub async fn get_device_sync_info(&self) -> crate::device_sync::DeviceSyncInfo {
        let sync_id = {
            let cfg = self.config.lock().await;
            cfg.device_sync_id
                .as_ref()
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
        };
        let (device_id, device_type) = {
            let tracker = self.device_sync_tracker.lock().await;
            (tracker.device_id.clone(), tracker.device_type)
        };
        let remote_state = if let Some(ref sid) = sync_id {
            if let Ok(Some(raw)) = crate::device_sync::fetch_raw_remote_state(
                &self.http_client,
                crate::device_sync::KEYVAL_API_URL,
                sid,
            )
            .await
            {
                Some(crate::device_sync::build_remote_state_view(
                    sid,
                    &raw,
                    &device_id,
                    device_type,
                    crate::device_sync::now_unix_secs(),
                ))
            } else {
                None
            }
        } else {
            None
        };

        crate::device_sync::DeviceSyncInfo {
            sync_id,
            device_id,
            device_type,
            remote_state,
        }
    }

    pub async fn notify_farming_started(self: &Arc<Self>) {
        let sync_id = {
            let cfg = self.config.lock().await;
            cfg.device_sync_id
                .as_ref()
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
        };
        let already_recently_claimed = {
            let mut tracker = self.device_sync_tracker.lock().await;
            if tracker.shutdown_triggered {
                return;
            }
            let now = crate::device_sync::now_unix_secs();
            if tracker.local_claim_nonce.is_some()
                && tracker.last_remote_nonce.as_deref() == tracker.local_claim_nonce.as_deref()
                && (now - tracker.last_heartbeat_at) < crate::device_sync::HEARTBEAT_INTERVAL_SECS
            {
                true
            } else {
                tracker.pending_claim = true;
                false
            }
        };
        if sync_id.is_some() && !already_recently_claimed {
            let _ = self.claim_device_active().await;
        }
    }

    pub async fn claim_device_active(self: &Arc<Self>) -> Result<bool, String> {
        let sync_id = {
            let cfg = self.config.lock().await;
            cfg.device_sync_id
                .as_ref()
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
        };
        let Some(sync_id) = sync_id else {
            return Ok(false);
        };

        let _op_guard = self.device_sync_op_lock.lock().await;
        let now = crate::device_sync::now_unix_secs();

        let (nonce, dev_id, dev_type) = {
            let mut tracker = self.device_sync_tracker.lock().await;
            if tracker.shutdown_triggered {
                return Ok(false);
            }
            let nonce = tracker.prepare_local_claim(now);
            (nonce, tracker.device_id.clone(), tracker.device_type)
        };

        let payload = crate::device_sync::DeviceSyncRawData {
            active_device: Some(dev_type),
            device_id: dev_id.clone(),
            device_type: dev_type,
            updated_at: now,
            claim_nonce: nonce.clone(),
        };

        match crate::device_sync::post_raw_sync_state(
            &self.http_client,
            crate::device_sync::KEYVAL_API_URL,
            &sync_id,
            &payload,
        )
        .await
        {
            Ok(()) => {
                {
                    let mut tracker = self.device_sync_tracker.lock().await;
                    tracker.mark_claim_succeeded(&nonce, now);
                }
                let view = crate::device_sync::build_remote_state_view(
                    &sync_id,
                    &payload,
                    &dev_id,
                    dev_type,
                    now,
                );
                let _ = self.app_handle.emit("device-sync-state-updated", &view);
                crate::audit_log!(
                    "SYNC",
                    "INFO",
                    "Elo PC↔Celular: dispositivo ({}) assumiu o farm (nonce={})",
                    dev_type.as_str(),
                    nonce
                );
                Ok(true)
            }
            Err(e) => {
                let mut tracker = self.device_sync_tracker.lock().await;
                tracker.pending_claim = true;
                Err(e)
            }
        }
    }

    pub async fn release_device_active_if_owner(&self, force_if_paired: bool) -> Result<bool, String> {
        let sync_id = {
            let cfg = self.config.lock().await;
            cfg.device_sync_id
                .as_ref()
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
        };
        let Some(sync_id) = sync_id else {
            return Ok(false);
        };

        let _op_guard = self.device_sync_op_lock.lock().await;
        let now = crate::device_sync::now_unix_secs();

        let (should_release, dev_id, dev_type) = {
            let tracker = self.device_sync_tracker.lock().await;
            let allowed = if force_if_paired {
                !tracker.shutdown_triggered
            } else {
                tracker.should_release_on_manual_exit()
            };
            (allowed, tracker.device_id.clone(), tracker.device_type)
        };

        if !should_release {
            return Ok(false);
        }

        let payload = crate::device_sync::DeviceSyncRawData {
            active_device: None,
            device_id: dev_id.clone(),
            device_type: dev_type,
            updated_at: now,
            claim_nonce: format!("rel_{}", now),
        };

        crate::device_sync::post_raw_sync_state(
            &self.http_client,
            crate::device_sync::KEYVAL_API_URL,
            &sync_id,
            &payload,
        )
        .await?;

        {
            let mut tracker = self.device_sync_tracker.lock().await;
            tracker.mark_released();
        }
        let view = crate::device_sync::build_remote_state_view(
            &sync_id,
            &payload,
            &dev_id,
            dev_type,
            now,
        );
        let _ = self.app_handle.emit("device-sync-state-updated", &view);
        Ok(true)
    }

    pub async fn poll_device_sync_once(
        self: &Arc<Self>,
        sync_id: &str,
    ) -> Result<Option<crate::device_sync::DeviceSyncRemoteState>, String> {
        let _op_guard = self.device_sync_op_lock.lock().await;
        let raw_opt = crate::device_sync::fetch_raw_remote_state(
            &self.http_client,
            crate::device_sync::KEYVAL_API_URL,
            sync_id,
        )
        .await?;

        let is_farming = self.is_locally_farming().await;
        let now = crate::device_sync::now_unix_secs();

        let (action, dev_id, dev_type, view_opt) = {
            let mut tracker = self.device_sync_tracker.lock().await;
            let dev_id = tracker.device_id.clone();
            let dev_type = tracker.device_type;
            let view = raw_opt.as_ref().map(|raw| {
                crate::device_sync::build_remote_state_view(sync_id, raw, &dev_id, dev_type, now)
            });
            let action = tracker.evaluate_poll(raw_opt.as_ref(), is_farming, now);
            (action, dev_id, dev_type, view)
        };

        if let Some(ref view) = view_opt {
            let _ = self.app_handle.emit("device-sync-state-updated", view);
        }

        match action {
            crate::device_sync::PollAction::TriggerRemoteTakeoverShutdown => {
                let this_shutdown = Arc::clone(self);
                tauri::async_runtime::spawn(async move {
                    crate::device_sync::execute_remote_takeover_shutdown(&this_shutdown).await;
                });
                Ok(view_opt)
            }
            crate::device_sync::PollAction::SendHeartbeat { nonce } => {
                let payload = crate::device_sync::DeviceSyncRawData {
                    active_device: Some(dev_type),
                    device_id: dev_id.clone(),
                    device_type: dev_type,
                    updated_at: now,
                    claim_nonce: nonce.clone(),
                };
                match crate::device_sync::post_raw_sync_state(
                    &self.http_client,
                    crate::device_sync::KEYVAL_API_URL,
                    sync_id,
                    &payload,
                )
                .await
                {
                    Ok(()) => {
                        {
                            let mut tracker = self.device_sync_tracker.lock().await;
                            tracker.mark_claim_succeeded(&nonce, now);
                        }
                        let view = crate::device_sync::build_remote_state_view(
                            sync_id,
                            &payload,
                            &dev_id,
                            dev_type,
                            now,
                        );
                        let _ = self.app_handle.emit("device-sync-state-updated", &view);
                        Ok(Some(view))
                    }
                    Err(e) => {
                        let mut tracker = self.device_sync_tracker.lock().await;
                        tracker.pending_claim = true;
                        Err(e)
                    }
                }
            }
            crate::device_sync::PollAction::None => Ok(view_opt),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{AppConfig, Platform, RuntimeSessionState, StreamConfig};

    fn make_stream(id: &str, auto_start: bool) -> StreamConfig {
        StreamConfig {
            id: id.into(),
            platform: Platform::Twitch,
            channel_slug: format!("chan_{}", id),
            account_ids: vec!["acc-1".into()],
            selected_account_id: Some("acc-1".into()),
            auto_start,
            account_id: None,
        }
    }

    #[test]
    fn test_compute_streams_to_restore_unions_autostart_and_desired_without_dups() {
        let mut cfg = AppConfig::default();
        cfg.streams.push(make_stream("s-auto", true));
        cfg.streams.push(make_stream("s-manual-active", false));
        cfg.streams.push(make_stream("s-stopped", false));

        let rt = RuntimeSessionState {
            desired_active_stream_ids: vec![
                "s-auto".into(),
                "s-manual-active".into(),
                "s-deleted-stale".into(),
            ],
            desired_active_game_slots: vec!["slot-1".into()],
            last_active_tab: Some("games".into()),
            ..Default::default()
        };

        let result = compute_streams_to_restore(&cfg, &rt);
        assert_eq!(result, vec!["s-auto", "s-manual-active"]);
    }
}
