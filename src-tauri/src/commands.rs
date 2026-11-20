use crate::accounts::models::{AccountHealthStatus, AccountsHealthSummary};
#[cfg(desktop)]
use crate::accounts::session_sync::{
    compute_kick_credentials_hash, compute_twitch_credentials_hash, write_profile_sync_hash,
};
use crate::config::{Account, AppConfig, RuntimeSessionState, StreamConfig, StreamRuntimeStatus};
use crate::kick::KickManager;
use crate::state::AppState;
#[cfg(not(target_os = "android"))]
use crate::twitch::run_oauth_flow;
use std::sync::Arc;
#[cfg(desktop)]
use tauri::Manager;
use tauri::{AppHandle, Emitter, State};

type StateHandle<'a> = State<'a, Arc<AppState>>;

#[tauri::command]
pub async fn get_config(state: StateHandle<'_>) -> Result<AppConfig, String> {
    let cfg = state.config.lock().await;
    Ok(cfg.clone())
}

#[tauri::command]
pub async fn get_runtime_state(state: StateHandle<'_>) -> Result<RuntimeSessionState, String> {
    Ok(state.get_runtime_state().await)
}

#[tauri::command]
pub async fn set_runtime_ui_state(
    state: StateHandle<'_>,
    last_active_tab: Option<String>,
    desired_active_game_slots: Option<Vec<String>>,
) -> Result<RuntimeSessionState, String> {
    state
        .set_runtime_ui_state(last_active_tab, desired_active_game_slots)
        .await
}

#[tauri::command]
pub async fn update_game_slot(
    state: StateHandle<'_>,
    slot: crate::config::GameSlotConfig,
) -> Result<AppConfig, String> {
    let mut cfg = state.config.lock().await;
    if let Some(existing) = cfg.game_slots.iter_mut().find(|s| s.id == slot.id) {
        *existing = slot;
    } else {
        cfg.game_slots.push(slot);
    }
    state.config_store.save(&cfg)?;
    Ok(cfg.clone())
}

#[tauri::command]
pub async fn save_config(state: StateHandle<'_>, config: AppConfig) -> Result<(), String> {
    let mut cfg = state.config.lock().await;
    *cfg = config.clone();
    state.config_store.save(&config)
}

#[tauri::command]
pub async fn add_account(state: StateHandle<'_>, account: Account) -> Result<AppConfig, String> {
    crate::audit_log!(
        "ACCOUNTS",
        "INFO",
        "Conta adicionada: [{}] (@{}) - {:?}",
        account.label,
        account.username,
        account.platform
    );
    let account_id = account.id.clone();
    let out_cfg = {
        let mut cfg = state.config.lock().await;
        cfg.accounts.retain(|a| a.id != account.id);
        cfg.accounts.push(account);
        state.config_store.save(&cfg)?;
        cfg.clone()
    };
    let state_arc = state.inner().clone();
    tauri::async_runtime::spawn(async move {
        let _ = state_arc.verify_single_account(&account_id).await;
    });
    Ok(out_cfg)
}

#[tauri::command]
pub async fn remove_account(state: StateHandle<'_>, account_id: String) -> Result<AppConfig, String> {
    crate::audit_log!("ACCOUNTS", "INFO", "Conta removida: ID {}", account_id);
    let out_cfg = {
        let mut cfg = state.config.lock().await;
        cfg.accounts.retain(|a| a.id != account_id);

        let mut empty_stream_ids = Vec::new();
        for stream in &mut cfg.streams {
            if stream.account_ids.contains(&account_id) {
                state.stop_account_in_stream(&stream.id, &account_id).await;
                stream.account_ids.retain(|id| id != &account_id);
                if stream.selected_account_id.as_deref() == Some(&account_id) {
                    stream.selected_account_id = stream.account_ids.first().cloned();
                }
                if stream.account_ids.is_empty() {
                    empty_stream_ids.push(stream.id.clone());
                }
            }
        }

        for sid in empty_stream_ids {
            state.stop_stream(&sid).await;
            cfg.streams.retain(|s| s.id != sid);
            let mut statuses = state.statuses.lock().await;
            statuses.remove(&sid);
        }

        state.config_store.save(&cfg)?;
        cfg.clone()
    };
    state.remove_account_health(&account_id).await;
    Ok(out_cfg)
}

#[tauri::command]
pub async fn update_account_info(
    state: StateHandle<'_>,
    account_id: String,
    label: String,
    username: String,
) -> Result<AppConfig, String> {
    let trimmed_label = label.trim().to_string();
    let trimmed_username = username.trim().to_string();
    crate::audit_log!(
        "ACCOUNTS",
        "INFO",
        "Conta atualizada: ID {}, Rótulo: '{}', Usuário: '@{}'",
        account_id,
        trimmed_label,
        trimmed_username
    );

    let out_cfg = {
        let mut cfg = state.config.lock().await;
        let account = cfg
            .accounts
            .iter_mut()
            .find(|a| a.id == account_id)
            .ok_or_else(|| format!("Conta '{}' não encontrada", account_id))?;

        account.label = trimmed_label.clone();
        account.username = trimmed_username.clone();

        state.config_store.save(&cfg)?;
        cfg.clone()
    };

    // Atualiza também o cache de status de saúde se a conta existir lá
    {
        let mut map = state.account_health.lock().await;
        if let Some(health) = map.get_mut(&account_id) {
            health.label = trimmed_label;
            health.username = trimmed_username;
        }
    }

    let _ = state.emit_accounts_health().await;
    let _ = state.app_handle.emit("accounts-config-synced", ());

    Ok(out_cfg)
}

#[tauri::command]
pub async fn add_stream(state: StateHandle<'_>, mut stream: StreamConfig) -> Result<AppConfig, String> {
    stream.ensure_migrated();
    let mut cfg = state.config.lock().await;
    cfg.streams.retain(|s| s.id != stream.id);
    cfg.streams.push(stream.clone());
    state.config_store.save(&cfg)?;

    let mut statuses = state.statuses.lock().await;
    if !statuses.contains_key(&stream.id) {
        statuses.insert(
            stream.id.clone(),
            StreamRuntimeStatus {
                stream_id: stream.id,
                status: crate::config::StatusKind::Disconnected,
                is_live: false,
                is_farming: false,
                message: None,
                uptime_seconds: 0,
                estimated_ram_mb: 0,
                connected_at: None,
                channel_points: None,
                account_points: std::collections::HashMap::new(),
            },
        );
    }

    Ok(cfg.clone())
}

#[tauri::command]
pub async fn update_stream(state: StateHandle<'_>, mut stream: StreamConfig) -> Result<AppConfig, String> {
    stream.ensure_migrated();
    let old_stream = {
        let mut cfg = state.config.lock().await;
        let old = cfg.streams.iter().find(|s| s.id == stream.id).cloned();

        if let Some(pos) = cfg.streams.iter().position(|s| s.id == stream.id) {
            cfg.streams[pos] = stream.clone();
        } else {
            cfg.streams.push(stream.clone());
        }
        state.config_store.save(&cfg)?;
        old
    };

    // If stream is currently running, handle removed and added accounts
    let current_status = {
        let statuses = state.statuses.lock().await;
        statuses.get(&stream.id).cloned()
    };

    if let Some(status) = current_status {
        if let Some(old) = old_stream {
            // Se o canal ou a plataforma mudou, reinicia a stream se estiver ativa/vigília
            if old.channel_slug != stream.channel_slug || old.platform != stream.platform {
                let was_running = status.status == crate::config::StatusKind::Connected
                    || status.status == crate::config::StatusKind::Standby
                    || status.status == crate::config::StatusKind::Connecting;

                state.stop_stream(&stream.id).await;

                if was_running {
                    let _ = state.start_stream(&stream.id).await;
                }
            } else {
                // Stop removed accounts
                for old_acc_id in &old.account_ids {
                    if !stream.account_ids.contains(old_acc_id) {
                        state.stop_account_in_stream(&stream.id, old_acc_id).await;
                    }
                }

                // If running / connected, start newly added accounts
                if status.status == crate::config::StatusKind::Connected {
                    let newly_added_ids: Vec<String> = stream
                        .account_ids
                        .iter()
                        .filter(|id| !old.account_ids.contains(id))
                        .cloned()
                        .collect();

                    if !newly_added_ids.is_empty() {
                        let cfg = state.config.lock().await;
                        let accounts: Vec<crate::config::Account> = cfg
                            .accounts
                            .iter()
                            .filter(|a| newly_added_ids.contains(&a.id))
                            .cloned()
                            .collect();
                        drop(cfg);

                        let state_arc = state.inner().clone();
                        let _ = state_arc
                            .activate_online_stream(&stream.id, &stream.platform, &stream.channel_slug, &accounts)
                            .await;
                    }
                }
            }
        }

        // Update active account points
        if let Some(ref sel_id) = stream.selected_account_id {
            state.update_selected_account(&stream.id, sel_id).await;
        }
    }

    let cfg = state.config.lock().await;
    Ok(cfg.clone())
}

#[tauri::command]
pub async fn set_selected_account(
    state: StateHandle<'_>,
    stream_id: String,
    account_id: String,
) -> Result<AppConfig, String> {
    {
        let mut cfg = state.config.lock().await;
        if let Some(s) = cfg.streams.iter_mut().find(|s| s.id == stream_id) {
            if s.account_ids.contains(&account_id) {
                s.selected_account_id = Some(account_id.clone());
                state.config_store.save(&cfg)?;
            }
        }
    }

    state.update_selected_account(&stream_id, &account_id).await;

    let cfg = state.config.lock().await;
    Ok(cfg.clone())
}

#[tauri::command]
pub async fn remove_stream(state: StateHandle<'_>, stream_id: String) -> Result<AppConfig, String> {
    state.stop_stream(&stream_id).await;

    let mut cfg = state.config.lock().await;
    cfg.streams.retain(|s| s.id != stream_id);
    state.config_store.save(&cfg)?;

    let mut statuses = state.statuses.lock().await;
    statuses.remove(&stream_id);

    Ok(cfg.clone())
}

#[tauri::command]
pub async fn start_stream(state: StateHandle<'_>, stream_id: String) -> Result<(), String> {
    let state_arc = state.inner().clone();
    state_arc.start_stream(&stream_id).await
}

#[tauri::command]
pub async fn stop_stream(state: StateHandle<'_>, stream_id: String) -> Result<(), String> {
    state.stop_stream(&stream_id).await;
    Ok(())
}

#[tauri::command]
pub async fn start_all_streams(state: StateHandle<'_>) -> Result<(), String> {
    let streams: Vec<String> = {
        let cfg = state.config.lock().await;
        cfg.streams.iter().map(|s| s.id.clone()).collect()
    };

    let state_arc = state.inner().clone();
    for sid in streams {
        let _ = state_arc.start_stream(&sid).await;
    }
    Ok(())
}

#[tauri::command]
pub async fn stop_all_streams(state: StateHandle<'_>) -> Result<(), String> {
    let streams: Vec<String> = {
        let cfg = state.config.lock().await;
        cfg.streams.iter().map(|s| s.id.clone()).collect()
    };

    for sid in streams {
        state.stop_stream(&sid).await;
    }
    Ok(())
}

#[tauri::command]
pub async fn get_all_stream_statuses(state: StateHandle<'_>) -> Result<Vec<StreamRuntimeStatus>, String> {
    Ok(state.get_all_statuses().await)
}

#[tauri::command]
pub async fn start_twitch_oauth(
    state: StateHandle<'_>,
    account_id: String,
    client_id: Option<String>,
) -> Result<String, String> {
    #[cfg(target_os = "android")]
    {
        return Err("No Android, a autenticação da Twitch deve ser realizada via TwitchLoginActivity.".to_string());
    }

    #[cfg(not(target_os = "android"))]
    {
        let token = tauri::async_runtime::spawn_blocking(move || run_oauth_flow(client_id))
            .await
            .map_err(|e| e.to_string())??;

        {
            let mut cfg = state.config.lock().await;
            if let Some(acc) = cfg.accounts.iter_mut().find(|a| a.id == account_id) {
                acc.oauth_token = Some(token.clone());
                state.config_store.save(&cfg)?;
            }
        }

        let state_arc = state.inner().clone();
        let _ = state_arc.verify_single_account(&account_id).await;

        Ok(token)
    }
}

#[tauri::command]
pub async fn open_kick_login(
    app: AppHandle,
    state: StateHandle<'_>,
    account_id: String,
) -> Result<(), String> {
    let label = {
        let cfg = state.config.lock().await;
        cfg.accounts
            .iter()
            .find(|a| a.id == account_id)
            .map(|a| a.label.clone())
            .unwrap_or_else(|| "Kick Account".to_string())
    };

    KickManager::open_login_window(&app, &account_id, &label)
}

#[tauri::command]
pub async fn save_kick_session(
    app: AppHandle,
    state: StateHandle<'_>,
    account_id: String,
) -> Result<AppConfig, String> {
    let creds = KickManager::extract_cookies_native(&app, &account_id).await?;

    #[cfg(desktop)]
    let sync_hash = compute_kick_credentials_hash(
        Some(&creds.kick_session),
        creds.session_token.as_deref(),
        creds.xsrf_token.as_deref(),
    );

    {
        let mut cfg = state.config.lock().await;
        if let Some(acc) = cfg.accounts.iter_mut().find(|a| a.id == account_id) {
            acc.kick_session = Some(creds.kick_session);
            acc.xsrf_token = creds.xsrf_token;
            if let Some(st) = creds.session_token {
                acc.session_token = Some(st);
            }
            state.config_store.save(&cfg)?;
        }
    }

    #[cfg(desktop)]
    {
        let profile_dir = KickManager::get_profile_dir(&app, &account_id);
        write_profile_sync_hash(&profile_dir, &sync_hash);

        // Fecha a janela de login graciosamente (sem destroy()) para WebView2 persistir cookies SQLite em disco
        let label = format!("kick_login_{}", account_id);
        if let Some(win) = app.get_webview_window(&label) {
            let _ = win.close();
            tokio::time::sleep(std::time::Duration::from_millis(250)).await;
        }
    }

    let state_arc = state.inner().clone();
    let _ = state_arc.verify_single_account(&account_id).await;

    let cfg = state.config.lock().await;
    Ok(cfg.clone())
}

#[tauri::command]
pub async fn save_twitch_token(
    state: StateHandle<'_>,
    account_id: String,
    token: String,
) -> Result<AppConfig, String> {
    {
        let mut cfg = state.config.lock().await;
        if let Some(acc) = cfg.accounts.iter_mut().find(|a| a.id == account_id) {
            acc.oauth_token = Some(token);
            state.config_store.save(&cfg)?;
        }
    }
    let state_arc = state.inner().clone();
    let _ = state_arc.verify_single_account(&account_id).await;

    let cfg = state.config.lock().await;
    Ok(cfg.clone())
}

#[tauri::command]
pub async fn open_twitch_login(
    app: AppHandle,
    state: StateHandle<'_>,
    account_id: String,
) -> Result<(), String> {
    let label = {
        let cfg = state.config.lock().await;
        cfg.accounts
            .iter()
            .find(|a| a.id == account_id)
            .map(|a| a.label.clone())
            .unwrap_or_else(|| "Twitch Account".to_string())
    };

    crate::twitch::webview::TwitchWebManager::open_login_window(&app, &account_id, &label)
}

#[tauri::command]
pub async fn save_twitch_session(
    app: AppHandle,
    state: StateHandle<'_>,
    account_id: String,
) -> Result<AppConfig, String> {
    let creds =
        crate::twitch::webview::TwitchWebManager::extract_cookies_native(&app, &account_id).await?;

    #[cfg(desktop)]
    let sync_hash = compute_twitch_credentials_hash(Some(&creds.auth_token));

    {
        let mut cfg = state.config.lock().await;
        if let Some(acc) = cfg.accounts.iter_mut().find(|a| a.id == account_id) {
            acc.oauth_token = Some(creds.auth_token);
            state.config_store.save(&cfg)?;
        }
    }

    #[cfg(desktop)]
    {
        let profile_dir = crate::twitch::webview::TwitchWebManager::get_profile_dir(&app, &account_id);
        write_profile_sync_hash(&profile_dir, &sync_hash);

        let label = format!("twitch_login_{}", account_id);
        if let Some(win) = app.get_webview_window(&label) {
            let _ = win.close();
            tokio::time::sleep(std::time::Duration::from_millis(250)).await;
        }
    }

    let state_arc = state.inner().clone();
    let _ = state_arc.verify_single_account(&account_id).await;

    let cfg = state.config.lock().await;
    Ok(cfg.clone())
}

#[tauri::command]
pub async fn get_twitch_account_streamers_ranking(
    state: StateHandle<'_>,
    account_id: String,
) -> Result<Vec<crate::twitch::models::TwitchStreamerStats>, String> {
    let stats = state.twitch_coordinator.get_account_streamers(&account_id).await;
    Ok(stats)
}

#[tauri::command]
pub async fn save_kick_credentials_direct(
    state: StateHandle<'_>,
    account_id: String,
    kick_session: String,
    session_token: Option<String>,
    xsrf_token: Option<String>,
) -> Result<AppConfig, String> {
    {
        let mut cfg = state.config.lock().await;
        if let Some(acc) = cfg.accounts.iter_mut().find(|a| a.id == account_id) {
            acc.kick_session = Some(kick_session);
            if let Some(st) = session_token {
                if !st.is_empty() {
                    acc.session_token = Some(st);
                }
            }
            if let Some(xt) = xsrf_token {
                if !xt.is_empty() {
                    acc.xsrf_token = Some(xt);
                }
            }
            state.config_store.save(&cfg)?;
        }
    }

    let state_arc = state.inner().clone();
    let _ = state_arc.verify_single_account(&account_id).await;

    let cfg = state.config.lock().await;
    Ok(cfg.clone())
}

#[tauri::command]
pub async fn verify_all_accounts(state: StateHandle<'_>) -> Result<AccountsHealthSummary, String> {
    let state_arc = state.inner().clone();
    Ok(state_arc.verify_all_accounts().await)
}

#[tauri::command]
pub async fn verify_account(
    state: StateHandle<'_>,
    account_id: String,
) -> Result<AccountHealthStatus, String> {
    let state_arc = state.inner().clone();
    state_arc.verify_single_account(&account_id).await
}

#[tauri::command]
pub async fn get_accounts_health(state: StateHandle<'_>) -> Result<AccountsHealthSummary, String> {
    Ok(state.get_accounts_health_summary().await)
}

#[tauri::command]
pub async fn open_stream_redeem(
    app: AppHandle,
    state: StateHandle<'_>,
    stream_id: String,
    account_id: String,
) -> Result<(), String> {
    let (platform, channel_slug, account) = {
        let cfg = state.config.lock().await;
        let stream = cfg
            .streams
            .iter()
            .find(|s| s.id == stream_id)
            .ok_or_else(|| format!("Stream '{}' não encontrada", stream_id))?;
        let account = cfg
            .accounts
            .iter()
            .find(|a| a.id == account_id)
            .ok_or_else(|| format!("Conta '{}' não encontrada", account_id))?;
        (stream.platform.clone(), stream.channel_slug.clone(), account.clone())
    };

    #[cfg(desktop)]
    {
        match platform {
            crate::config::Platform::Twitch => {
                crate::twitch::webview::TwitchWebManager::open_redeem_window(
                    &app,
                    &account.id,
                    &account.label,
                    &account.username,
                    &channel_slug,
                    account.oauth_token.as_deref(),
                )
                .await?;
            }
            crate::config::Platform::Kick => {
                crate::kick::webview::KickManager::open_redeem_window(
                    &app,
                    &account.id,
                    &account.label,
                    &account.username,
                    &channel_slug,
                    account.session_token.as_deref(),
                    account.kick_session.as_deref(),
                    account.xsrf_token.as_deref(),
                )
                .await?;
            }
        }
    }

    #[cfg(not(desktop))]
    {
        let _ = (app, stream_id, account_id, platform, channel_slug, account);
    }

    Ok(())
}

#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
pub async fn get_audit_logs(
    filter_category: Option<String>,
    filter_level: Option<String>,
    search: Option<String>,
) -> Result<String, String> {
    if let Some(logger) = crate::logger::get_global_logger() {
        logger.get_logs(
            filter_category.as_deref(),
            filter_level.as_deref(),
            search.as_deref(),
        )
    } else {
        Err("Logger de auditoria não inicializado".to_string())
    }
}

#[tauri::command]
pub async fn clear_audit_logs() -> Result<(), String> {
    if let Some(logger) = crate::logger::get_global_logger() {
        logger.clear_logs()
    } else {
        Err("Logger de auditoria não inicializado".to_string())
    }
}

#[tauri::command]
pub async fn write_audit_log(
    category: String,
    level: String,
    message: String,
) -> Result<(), String> {
    if let Some(logger) = crate::logger::get_global_logger() {
        logger.log(&category, &level, &message);
    }
    Ok(())
}

#[tauri::command]
pub async fn get_safety_state(
    safety: State<'_, Arc<crate::safety::SafetyNet>>,
) -> Result<crate::safety::StartResult, String> {
    Ok(safety.get_start_result())
}

#[tauri::command]
pub async fn backup_configs_now(
    safety: State<'_, Arc<crate::safety::SafetyNet>>,
) -> Result<crate::safety::BackupInfo, String> {
    safety.backup_configs("manual")
}

#[tauri::command]
pub async fn list_backups(
    safety: State<'_, Arc<crate::safety::SafetyNet>>,
) -> Result<Vec<crate::safety::BackupInfo>, String> {
    Ok(safety.list_backups())
}

#[tauri::command]
pub async fn restore_backup(
    safety: State<'_, Arc<crate::safety::SafetyNet>>,
    id: String,
    app: AppHandle,
) -> Result<(), String> {
    safety.restore_backup(&id)?;
    app.restart();
}

#[tauri::command]
pub async fn update_alert_config(
    state: StateHandle<'_>,
    config: crate::alerts::AlertConfig,
) -> Result<(), String> {
    state.alert_dispatcher.update_config(config.clone()).await;
    let cfg_to_save = {
        let mut cfg = state.config.lock().await;
        cfg.settings.alert_config = config;
        cfg.clone()
    };
    state.config_store.save(&cfg_to_save)
}

#[tauri::command]
pub async fn test_alert(state: StateHandle<'_>) -> Result<(), String> {
    state
        .alert_dispatcher
        .send(crate::alerts::AlertEvent::Test)
        .await;
    Ok(())
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct NightStreamSummary {
    pub channel: String,
    pub platform: String,
    pub was_live: bool,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MorningReport {
    pub duration_minutes: u64,
    pub active_game_slots: Vec<String>,
    pub streams_summary: Vec<NightStreamSummary>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct NightModeStatus {
    pub active: bool,
    pub started_at: Option<i64>,
    pub duration_minutes: u64,
}

#[tauri::command]
pub async fn toggle_night_mode(
    state: StateHandle<'_>,
    game_state: State<'_, Arc<crate::games::manager::GameLayoutManager>>,
    enable: bool,
) -> Result<Option<MorningReport>, String> {
    let now = chrono::Utc::now().timestamp();
    if enable {
        let current_fps = *game_state.current_fps.lock().await;
        let current_eco = *game_state.eco_mode.lock().await;

        {
            let mut rt = state.runtime_state.lock().await;
            rt.night_mode_active = true;
            rt.night_mode_started_at = Some(now);
            rt.pre_night_fps = Some(current_fps);
            rt.pre_night_eco = Some(current_eco);
            let _ = state.config_store.save_runtime_state(&rt);
        }

        // Aplicar 10 FPS e Ultra Mode em todos os slots de jogo
        game_state.set_fps(10).await?;
        game_state.toggle_pokeidle_ultra(None, Some(true)).await?;

        crate::audit_log!("NIGHT_MODE", "INFO", "Modo Noturno ativado: 10 FPS + Ultra Mode");
        Ok(None)
    } else {
        let (started_at, pre_fps, pre_eco) = {
            let mut rt = state.runtime_state.lock().await;
            let started_at = rt.night_mode_started_at;
            let pre_fps = rt.pre_night_fps.unwrap_or(30);
            let pre_eco = rt.pre_night_eco.unwrap_or(true);

            rt.night_mode_active = false;
            rt.night_mode_started_at = None;
            rt.pre_night_fps = None;
            rt.pre_night_eco = None;
            let _ = state.config_store.save_runtime_state(&rt);

            (started_at, pre_fps, pre_eco)
        };

        // Restaurar FPS e desativar Ultra Mode forçado
        game_state.set_fps(pre_fps).await?;
        game_state.set_eco_mode(pre_eco).await?;
        game_state.toggle_pokeidle_ultra(None, Some(false)).await?;

        let duration_minutes = started_at
            .map(|st| (now.saturating_sub(st).max(0) / 60) as u64)
            .unwrap_or(0);

        let active_slots: Vec<String> = {
            let map = game_state.active_slots.lock().await;
            map.keys().cloned().collect()
        };

        let streams_summary: Vec<NightStreamSummary> = {
            let cfg = state.config.lock().await;
            let statuses = state.statuses.lock().await;
            cfg.streams
                .iter()
                .map(|s| {
                    let st = statuses.get(&s.id);
                    NightStreamSummary {
                        channel: s.channel_slug.clone(),
                        platform: format!("{:?}", s.platform),
                        was_live: st.map(|x| x.is_live).unwrap_or(false),
                    }
                })
                .collect()
        };

        let report = MorningReport {
            duration_minutes,
            active_game_slots: active_slots,
            streams_summary,
        };

        crate::audit_log!(
            "NIGHT_MODE",
            "INFO",
            "Modo Noturno desativado após {} min. Relatório: {} slots ativos, {} streams",
            report.duration_minutes,
            report.active_game_slots.len(),
            report.streams_summary.len()
        );

        Ok(Some(report))
    }
}

#[tauri::command]
pub async fn get_night_mode_status(state: StateHandle<'_>) -> Result<NightModeStatus, String> {
    let now = chrono::Utc::now().timestamp();
    let rt = state.runtime_state.lock().await;
    let duration_minutes = rt
        .night_mode_started_at
        .map(|st| (now.saturating_sub(st).max(0) / 60) as u64)
        .unwrap_or(0);

    Ok(NightModeStatus {
        active: rt.night_mode_active,
        started_at: rt.night_mode_started_at,
        duration_minutes,
    })
}

#[tauri::command]
pub async fn device_set_sync_id(
    state: StateHandle<'_>,
    sync_id: Option<String>,
) -> Result<AppConfig, String> {
    let sanitized = sync_id.and_then(|s| {
        let trimmed = s.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    });

    let mut cfg = state.config.lock().await;
    cfg.device_sync_id = sanitized;
    state.config_store.save(&cfg)?;
    Ok(cfg.clone())
}

#[tauri::command]
pub async fn device_get_sync_id(state: StateHandle<'_>) -> Result<Option<String>, String> {
    let cfg = state.config.lock().await;
    Ok(cfg.device_sync_id.clone())
}

#[tauri::command]
pub async fn toggle_overlay_server(
    overlay: State<'_, Arc<crate::overlay::OverlayServer>>,
    state: StateHandle<'_>,
    enable: bool,
) -> Result<crate::overlay::OverlayStatus, String> {
    if enable {
        overlay.start()?;
    } else {
        overlay.stop();
    }
    {
        let mut cfg = state.config.lock().await;
        cfg.settings.overlay_enabled = enable;
        let _ = state.config_store.save(&cfg);
    }
    Ok(overlay.get_status())
}

#[tauri::command]
pub async fn get_overlay_status(
    overlay: State<'_, Arc<crate::overlay::OverlayServer>>,
) -> Result<crate::overlay::OverlayStatus, String> {
    Ok(overlay.get_status())
}

#[tauri::command]
pub async fn start_session_export(
    export: State<'_, Arc<crate::session_export::SessionExportServer>>,
    pin: String,
) -> Result<crate::session_export::ExportStatus, String> {
    export.start(pin)
}

#[tauri::command]
pub async fn stop_session_export(
    export: State<'_, Arc<crate::session_export::SessionExportServer>>,
) -> Result<crate::session_export::ExportStatus, String> {
    export.stop();
    Ok(export.get_status())
}

#[tauri::command]
pub async fn get_session_export_status(
    export: State<'_, Arc<crate::session_export::SessionExportServer>>,
) -> Result<crate::session_export::ExportStatus, String> {
    Ok(export.get_status())
}




