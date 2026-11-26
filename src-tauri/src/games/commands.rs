use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, Manager, State};
use super::manager::{GameLayoutManager, PokeIdleGameState, SlotBounds, ViewLayoutMode, ViewportRect};

#[tauri::command]
pub async fn game_start_slot(
    state: State<'_, Arc<GameLayoutManager>>,
    app_state: State<'_, Arc<crate::state::AppState>>,
    slot_id: String,
    url: String,
    zoom: Option<f64>,
) -> Result<(), String> {
    state.start_game_slot(&slot_id, &url, zoom).await?;
    let app_st = app_state.inner().clone();
    tauri::async_runtime::spawn(async move {
        app_st.notify_farming_started().await;
    });
    Ok(())
}

#[tauri::command]
pub async fn game_stop_slot(
    state: State<'_, Arc<GameLayoutManager>>,
    slot_id: String,
) -> Result<(), String> {
    state.stop_game_slot(&slot_id).await
}

#[tauri::command]
pub async fn game_apply_layout(
    state: State<'_, Arc<GameLayoutManager>>,
    rect: ViewportRect,
    mode: ViewLayoutMode,
) -> Result<(), String> {
    state.apply_layout(rect, mode).await
}

#[tauri::command]
pub async fn game_hide_all(
    state: State<'_, Arc<GameLayoutManager>>,
) -> Result<(), String> {
    state.hide_all_game_views().await
}

#[tauri::command]
pub async fn game_refresh_views(
    state: State<'_, Arc<GameLayoutManager>>,
) -> Result<(), String> {
    state.refresh_visible_views().await
}

#[tauri::command]
pub async fn game_trim_memory(
    state: State<'_, Arc<GameLayoutManager>>,
) -> Result<(), String> {
    state.trim_memory().await
}

#[tauri::command]
pub async fn game_get_active_slots(
    state: State<'_, Arc<GameLayoutManager>>,
) -> Result<Vec<String>, String> {
    let slots = state.active_slots.lock().await;
    Ok(slots.keys().cloned().collect())
}

#[tauri::command]
pub async fn game_update_slots_bounds(
    state: State<'_, Arc<GameLayoutManager>>,
    bounds: Vec<SlotBounds>,
) -> Result<(), String> {
    state.update_slots_bounds(bounds).await
}

#[tauri::command]
pub async fn game_reload_slot(
    state: State<'_, Arc<GameLayoutManager>>,
    slot_id: String,
) -> Result<(), String> {
    state.reload_slot(&slot_id).await
}

#[tauri::command]
pub async fn game_set_slot_zoom(
    state: State<'_, Arc<GameLayoutManager>>,
    slot_id: String,
    zoom: f64,
) -> Result<(), String> {
    state.set_slot_zoom(&slot_id, zoom).await
}

#[tauri::command]
pub async fn game_set_eco_mode(
    state: State<'_, Arc<GameLayoutManager>>,
    enabled: bool,
) -> Result<(), String> {
    state.set_eco_mode(enabled).await
}

#[tauri::command]
pub async fn game_get_eco_mode(
    state: State<'_, Arc<GameLayoutManager>>,
) -> Result<bool, String> {
    Ok(*state.eco_mode.lock().await)
}

#[tauri::command]
pub async fn game_set_fps(
    state: State<'_, Arc<GameLayoutManager>>,
    fps: u32,
) -> Result<(), String> {
    state.set_fps(fps).await
}

#[tauri::command]
pub async fn game_toggle_pokeidle_ultra(
    state: State<'_, Arc<GameLayoutManager>>,
    slot_id: Option<String>,
    enabled: Option<bool>,
) -> Result<(), String> {
    state.toggle_pokeidle_ultra(slot_id.as_deref(), enabled).await
}

#[tauri::command]
pub async fn game_trigger_battle_pass_claim(
    state: State<'_, Arc<GameLayoutManager>>,
    slot_id: String,
) -> Result<(), String> {
    state.trigger_battle_pass_claim(&slot_id).await
}

#[tauri::command]
pub async fn game_mark_battle_pass_claimed(
    app_state: State<'_, Arc<crate::state::AppState>>,
    slot_id: String,
    claimed_at: Option<i64>,
    next_available_at: Option<i64>,
    day_key: Option<String>,
    increment_total: Option<bool>,
) -> Result<crate::config::AppConfig, String> {
    let now = claimed_at.unwrap_or_else(|| chrono::Utc::now().timestamp());
    let mut cfg = app_state.config.lock().await;
    let slot = cfg
        .game_slots
        .iter_mut()
        .find(|s| s.id == slot_id)
        .ok_or_else(|| format!("Slot de jogo '{}' não encontrado.", slot_id))?;

    slot.last_pass_claimed_at = Some(now);
    // Padrão confirmado: 24h 05m (86.700s) se não houver timestamp exato do servidor
    slot.next_pass_available_at = Some(next_available_at.unwrap_or(now + 86_700));
    if let Some(dk) = day_key {
        if !dk.trim().is_empty() {
            slot.last_pass_day_key = Some(dk);
        }
    }
    if increment_total.unwrap_or(true) {
        slot.total_pass_claims = slot.total_pass_claims.saturating_add(1);
    }

    crate::audit_log!(
        "GAMES",
        "INFO",
        "Passe de Batalha sincronizado/resgatado para [{}] (Total: {}, Dia: {:?})",
        slot.label,
        slot.total_pass_claims,
        slot.last_pass_day_key
    );

    app_state.config_store.save(&cfg)?;
    Ok(cfg.clone())
}

#[tauri::command]
pub async fn game_reset_battle_pass_timer(
    app_state: State<'_, Arc<crate::state::AppState>>,
    slot_id: String,
) -> Result<crate::config::AppConfig, String> {
    let mut cfg = app_state.config.lock().await;
    let slot = cfg
        .game_slots
        .iter_mut()
        .find(|s| s.id == slot_id)
        .ok_or_else(|| format!("Slot de jogo '{}' não encontrado.", slot_id))?;

    slot.last_pass_claimed_at = None;
    slot.next_pass_available_at = None;
    slot.last_pass_day_key = None;

    crate::audit_log!("GAMES", "INFO", "Timer do Passe de Batalha resetado para [{}]", slot.label);
    app_state.config_store.save(&cfg)?;
    Ok(cfg.clone())
}

#[tauri::command]
pub async fn game_read_slot_state(
    state: State<'_, Arc<GameLayoutManager>>,
    slot_id: String,
) -> Result<Option<PokeIdleGameState>, String> {
    Ok(state.get_game_state(&slot_id).await)
}

#[tauri::command]
pub async fn game_get_all_states(
    state: State<'_, Arc<GameLayoutManager>>,
) -> Result<HashMap<String, PokeIdleGameState>, String> {
    Ok(state.get_all_game_states().await)
}

#[tauri::command]
pub async fn game_freeze_slot(
    state: State<'_, Arc<GameLayoutManager>>,
    slot_id: String,
) -> Result<Option<String>, String> {
    state.freeze_slot(&slot_id).await
}

#[tauri::command]
pub async fn game_unfreeze_slot(
    state: State<'_, Arc<GameLayoutManager>>,
    slot_id: String,
) -> Result<(), String> {
    state.unfreeze_slot(&slot_id).await
}

#[tauri::command]
pub async fn game_get_slot_snapshot(
    state: State<'_, Arc<GameLayoutManager>>,
    slot_id: String,
) -> Result<Option<String>, String> {
    Ok(state.get_slot_snapshot(&slot_id).await)
}

#[tauri::command]
pub async fn game_get_all_snapshots(
    state: State<'_, Arc<GameLayoutManager>>,
) -> Result<HashMap<String, String>, String> {
    Ok(state.get_all_snapshots().await)
}

#[tauri::command]
pub fn game_get_system_idle_seconds() -> u64 {
    #[cfg(target_os = "windows")]
    {
        use std::mem::size_of;
        #[repr(C)]
        struct LASTINPUTINFO {
            cb_size: u32,
            dw_time: u32,
        }
        extern "system" {
            fn GetLastInputInfo(plii: *mut LASTINPUTINFO) -> i32;
            fn GetTickCount() -> u32;
        }
        unsafe {
            let mut lii = LASTINPUTINFO {
                cb_size: size_of::<LASTINPUTINFO>() as u32,
                dw_time: 0,
            };
            if GetLastInputInfo(&mut lii) != 0 {
                let now = GetTickCount();
                return (now.wrapping_sub(lii.dw_time) as u64) / 1000;
            }
        }
    }
    0
}

#[tauri::command]
pub fn game_is_window_foreground(app: AppHandle) -> bool {
    #[cfg(desktop)]
    {
        if let Some(win) = app.get_window("main") {
            if win.is_minimized().unwrap_or(false) || !win.is_visible().unwrap_or(true) {
                return false;
            }
            #[cfg(target_os = "windows")]
            {
                if let Ok(hwnd) = win.hwnd() {
                    extern "system" {
                        fn GetForegroundWindow() -> isize;
                        fn IsChild(hwnd_parent: isize, hwnd: isize) -> i32;
                    }
                    let main_hwnd = hwnd.0 as isize;
                    unsafe {
                        let fg = GetForegroundWindow();
                        return fg != 0 && (fg == main_hwnd || IsChild(main_hwnd, fg) != 0);
                    }
                }
            }
            return win.is_focused().unwrap_or(true);
        }
    }
    true
}

#[tauri::command]
pub fn game_get_last_activity_ms(
    state: State<'_, Arc<GameLayoutManager>>,
) -> Result<u64, String> {
    Ok(state.get_last_activity_ms())
}

