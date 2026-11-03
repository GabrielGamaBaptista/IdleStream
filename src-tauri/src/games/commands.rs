use std::sync::Arc;
use tauri::State;
use super::manager::{GameLayoutManager, SlotBounds, ViewLayoutMode, ViewportRect};

#[tauri::command]
pub async fn game_start_slot(
    state: State<'_, Arc<GameLayoutManager>>,
    slot_id: String,
    url: String,
    zoom: Option<f64>,
) -> Result<(), String> {
    state.start_game_slot(&slot_id, &url, zoom).await
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
