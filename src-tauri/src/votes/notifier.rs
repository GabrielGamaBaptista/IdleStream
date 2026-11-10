use crate::votes::policy::{next_vote_timestamp, should_notify_for_vote};
use crate::state::AppState;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Duration;
use tauri::Emitter;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoteReadyNotificationPayload {
    pub account_id: String,
    pub label: String,
    pub player_identifier: String,
    pub last_voted_at: i64,
    pub ready_at: i64,
    pub title: String,
    pub body: String,
    pub is_test: bool,
}

pub fn dispatch_os_vote_notification(payload: &VoteReadyNotificationPayload) {
    let title = payload.title.clone();
    let body = payload.body.clone();

    #[cfg(target_os = "windows")]
    {
        let title_win = title.clone();
        let body_win = body.clone();
        std::thread::spawn(move || {
            send_windows_toast(&title_win, &body_win);
        });
    }

    #[cfg(target_os = "android")]
    {
        let account_id = payload.account_id.clone();
        let dedup_vote_at = if payload.is_test { 0 } else { payload.last_voted_at };
        crate::kick::http::send_android_vote_notification(&account_id, &title, &body, dedup_vote_at);
    }

    #[cfg(not(any(target_os = "windows", target_os = "android")))]
    {
        let _ = (title, body, &payload.account_id);
    }
}

#[cfg(target_os = "windows")]
fn send_windows_toast(title: &str, body: &str) {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    let ps_script = r#"
$ErrorActionPreference = 'SilentlyContinue'
$titleText = $env:IDLESTREAM_TOAST_TITLE
$bodyText = $env:IDLESTREAM_TOAST_BODY
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml('<toast duration="long"><visual><binding template="ToastGeneric"><text></text><text></text></binding></visual><audio src="ms-winsoundevent:Notification.Reminder" /></toast>')
$nodes = $xml.GetElementsByTagName('text')
$nodes.Item(0).AppendChild($xml.CreateTextNode($titleText)) | Out-Null
$nodes.Item(1).AppendChild($xml.CreateTextNode($bodyText)) | Out-Null
$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
$appIds = @('com.idlestream.app', '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe')
foreach ($id in $appIds) {
  try {
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($id).Show($toast)
    break
  } catch {}
}
"#;

    let _ = std::process::Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", ps_script])
        .env("IDLESTREAM_TOAST_TITLE", title)
        .env("IDLESTREAM_TOAST_BODY", body)
        .creation_flags(CREATE_NO_WINDOW)
        .output();
}

pub async fn evaluate_due_vote_notifications(state: &Arc<AppState>) {
    let now = Utc::now().timestamp();
    let mut payloads: Vec<VoteReadyNotificationPayload> = Vec::new();
    let mut changed = false;

    {
        let mut cfg = state.config.lock().await;
        for acc in &mut cfg.vote_accounts {
            if should_notify_for_vote(acc, now) {
                let last_voted = acc.last_voted_at.unwrap_or(now);
                let ready_at = next_vote_timestamp(last_voted);
                let player_display = if acc.player_identifier.trim().is_empty() {
                    acc.label.clone()
                } else {
                    acc.player_identifier.clone()
                };
                acc.last_notified_for_vote_at = Some(last_voted);
                changed = true;

                payloads.push(VoteReadyNotificationPayload {
                    account_id: acc.id.clone(),
                    label: acc.label.clone(),
                    player_identifier: player_display.clone(),
                    last_voted_at: last_voted,
                    ready_at,
                    title: format!("🗳️ Voto Liberado: {}", acc.label),
                    body: format!(
                        "Já se passaram 24h 01m! Você já pode votar no TopIdle com a conta '{}'.",
                        player_display
                    ),
                    is_test: false,
                });
            }
        }
        if changed {
            let _ = state.config_store.save(&cfg);
        }
    }

    for payload in payloads {
        let _ = state.app_handle.emit("vote-ready-notification", &payload);
        dispatch_os_vote_notification(&payload);
    }
}

/// Inicia o scheduler em background que monitora ciclos de 24h 01m para as 4 contas.
pub fn start_vote_scheduler(state: Arc<AppState>) {
    tauri::async_runtime::spawn(async move {
        // Checagem inicial pouco após boot (captura votos que venceram com o app fechado)
        tokio::time::sleep(Duration::from_secs(3)).await;
        loop {
            evaluate_due_vote_notifications(&state).await;
            tokio::time::sleep(Duration::from_secs(15)).await;
        }
    });
}
