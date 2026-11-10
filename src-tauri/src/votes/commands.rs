use crate::config::{AppConfig, VoteAccountConfig};
use crate::state::AppState;
use crate::votes::manager::{VoteBounds, VoteManager};
use crate::votes::notifier::{dispatch_os_vote_notification, VoteReadyNotificationPayload};
use crate::votes::policy::next_vote_timestamp;
use chrono::Utc;
use std::sync::Arc;
use tauri::{Emitter, State};

#[tauri::command]
pub async fn vote_update_account(
    state: State<'_, Arc<AppState>>,
    account: VoteAccountConfig,
) -> Result<AppConfig, String> {
    let mut cfg = state.config.lock().await;
    if let Some(existing) = cfg.vote_accounts.iter_mut().find(|v| v.id == account.id) {
        *existing = account;
    } else {
        cfg.vote_accounts.push(account);
    }
    state.config_store.save(&cfg)?;
    Ok(cfg.clone())
}

#[tauri::command]
pub async fn vote_open_webview(
    app_state: State<'_, Arc<AppState>>,
    vote_manager: State<'_, Arc<VoteManager>>,
    account_id: String,
    bounds: Option<VoteBounds>,
) -> Result<String, String> {
    let account = {
        let cfg = app_state.config.lock().await;
        cfg.vote_accounts
            .iter()
            .find(|v| v.id == account_id)
            .cloned()
            .ok_or_else(|| format!("Conta de voto '{}' não encontrada.", account_id))?
    };

    vote_manager.open_vote_webview(&account, bounds).await
}

#[tauri::command]
pub async fn vote_close_webview(
    vote_manager: State<'_, Arc<VoteManager>>,
) -> Result<(), String> {
    vote_manager.close_vote_webview().await
}

#[tauri::command]
pub async fn vote_update_bounds(
    vote_manager: State<'_, Arc<VoteManager>>,
    bounds: VoteBounds,
) -> Result<(), String> {
    vote_manager.update_bounds(bounds).await
}

#[tauri::command]
pub async fn vote_hide_webview(
    vote_manager: State<'_, Arc<VoteManager>>,
) -> Result<(), String> {
    vote_manager.hide_vote_webview().await
}

#[tauri::command]
pub async fn vote_reload_webview(
    vote_manager: State<'_, Arc<VoteManager>>,
) -> Result<(), String> {
    vote_manager.reload_vote_webview().await
}

#[tauri::command]
pub async fn vote_clear_topidle_session(
    app_state: State<'_, Arc<AppState>>,
    vote_manager: State<'_, Arc<VoteManager>>,
    account_id: String,
) -> Result<(), String> {
    let account = {
        let cfg = app_state.config.lock().await;
        cfg.vote_accounts
            .iter()
            .find(|v| v.id == account_id)
            .cloned()
            .ok_or_else(|| format!("Conta de voto '{}' não encontrada.", account_id))?
    };

    vote_manager.clear_topidle_session(&account).await
}

#[tauri::command]
pub async fn vote_get_active(
    vote_manager: State<'_, Arc<VoteManager>>,
) -> Result<Option<String>, String> {
    Ok(vote_manager.get_active_account_id().await)
}

#[tauri::command]
pub async fn vote_mark_completed(
    state: State<'_, Arc<AppState>>,
    account_id: String,
    voted_at: Option<i64>,
) -> Result<AppConfig, String> {
    let now = voted_at.unwrap_or_else(|| Utc::now().timestamp());
    let mut cfg = state.config.lock().await;
    let account = cfg
        .vote_accounts
        .iter_mut()
        .find(|v| v.id == account_id)
        .ok_or_else(|| format!("Conta de voto '{}' não encontrada.", account_id))?;

    account.last_voted_at = Some(now);
    account.last_notified_for_vote_at = None;
    account.total_votes = account.total_votes.saturating_add(1);

    state.config_store.save(&cfg)?;
    Ok(cfg.clone())
}

#[tauri::command]
pub async fn vote_reset_timer(
    state: State<'_, Arc<AppState>>,
    account_id: String,
) -> Result<AppConfig, String> {
    let mut cfg = state.config.lock().await;
    let account = cfg
        .vote_accounts
        .iter_mut()
        .find(|v| v.id == account_id)
        .ok_or_else(|| format!("Conta de voto '{}' não encontrada.", account_id))?;

    account.last_voted_at = None;
    account.last_notified_for_vote_at = None;

    state.config_store.save(&cfg)?;
    Ok(cfg.clone())
}

#[tauri::command]
pub async fn vote_test_notification(
    state: State<'_, Arc<AppState>>,
    account_id: Option<String>,
) -> Result<VoteReadyNotificationPayload, String> {
    let now = Utc::now().timestamp();
    let cfg = state.config.lock().await;
    let acc = if let Some(ref id) = account_id {
        cfg.vote_accounts.iter().find(|v| &v.id == id).cloned()
    } else {
        cfg.vote_accounts.first().cloned()
    }
    .unwrap_or_else(|| VoteAccountConfig {
        id: "vote-1".into(),
        label: "GGB2006".into(),
        player_identifier: "GGB2006".into(),
        base_url: crate::config::DEFAULT_TOPIDLE_GAME_URL.into(),
        linked_game_slot_id: Some("slot-1".into()),
        share_game_profile: true,
        google_hint: None,
        color: "#6366F1".into(),
        last_voted_at: None,
        last_notified_for_vote_at: None,
        total_votes: 0,
        notifications_enabled: true,
    });
    drop(cfg);

    let player_display = if acc.player_identifier.trim().is_empty() {
        acc.label.clone()
    } else {
        acc.player_identifier.clone()
    };

    let payload = VoteReadyNotificationPayload {
        account_id: acc.id,
        label: acc.label.clone(),
        player_identifier: player_display.clone(),
        last_voted_at: now,
        ready_at: next_vote_timestamp(now),
        title: format!("🔔 Teste de Alerta: Voto ({})", acc.label),
        body: format!(
            "Notificação ativa! Quando completar 24h 01m, você será avisado para votar com '{}'.",
            player_display
        ),
        is_test: true,
    };

    let _ = state.app_handle.emit("vote-ready-notification", &payload);
    dispatch_os_vote_notification(&payload);

    Ok(payload)
}
