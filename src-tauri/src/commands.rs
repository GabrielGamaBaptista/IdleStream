use crate::config::{Account, AppConfig, StreamConfig, StreamRuntimeStatus};
use crate::kick::KickManager;
use crate::state::AppState;
use crate::twitch::run_oauth_flow;
use std::sync::Arc;
use tauri::{AppHandle, Manager, State};

type StateHandle<'a> = State<'a, Arc<AppState>>;

#[tauri::command]
pub async fn get_config(state: StateHandle<'_>) -> Result<AppConfig, String> {
    let cfg = state.config.lock().await;
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
    let mut cfg = state.config.lock().await;
    cfg.accounts.retain(|a| a.id != account.id);
    cfg.accounts.push(account);
    state.config_store.save(&cfg)?;
    Ok(cfg.clone())
}

#[tauri::command]
pub async fn remove_account(state: StateHandle<'_>, account_id: String) -> Result<AppConfig, String> {
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
    Ok(cfg.clone())
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

        // Update active rewards account points
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
    let token = tauri::async_runtime::spawn_blocking(move || run_oauth_flow(client_id))
        .await
        .map_err(|e| e.to_string())??;

    let mut cfg = state.config.lock().await;
    if let Some(acc) = cfg.accounts.iter_mut().find(|a| a.id == account_id) {
        acc.oauth_token = Some(token.clone());
        state.config_store.save(&cfg)?;
    }

    Ok(token)
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
    let creds = KickManager::extract_cookies_native(&app, &account_id)?;

    let mut cfg = state.config.lock().await;
    if let Some(acc) = cfg.accounts.iter_mut().find(|a| a.id == account_id) {
        acc.kick_session = Some(creds.kick_session);
        acc.xsrf_token = creds.xsrf_token;
        if let Some(st) = creds.session_token {
            acc.session_token = Some(st);
        }
        state.config_store.save(&cfg)?;
    }

    // Fecha a janela de login após salvar a sessão com sucesso
    let label = format!("kick_login_{}", account_id);
    if let Some(win) = app.get_webview_window(&label) {
        let _ = win.destroy();
    }

    Ok(cfg.clone())
}
