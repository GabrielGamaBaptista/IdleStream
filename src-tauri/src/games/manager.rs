use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
#[cfg(desktop)]
use tauri::{LogicalPosition, LogicalSize, Rect, WebviewBuilder, WebviewUrl};
use tokio::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PokeIdleGameState {
    #[serde(default)]
    pub slot_id: String,
    #[serde(default)]
    pub nick: Option<String>,
    #[serde(default)]
    pub level: Option<u32>,
    #[serde(default)]
    pub xp: Option<u64>,
    #[serde(default)]
    pub gold: Option<u64>,
    #[serde(default)]
    pub diamonds: Option<u64>,
    #[serde(default)]
    pub hunt_slug: Option<String>,
    #[serde(default)]
    pub bonus_twitch_secs: Option<u64>,
    #[serde(default)]
    pub bonus_kick_secs: Option<u64>,
    #[serde(default)]
    pub xp_rate_per_hour: Option<u64>,
    #[serde(default)]
    pub ultra_active: Option<bool>,
    #[serde(default)]
    pub updated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ViewportRect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlotBounds {
    pub slot_id: String,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub visible: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum ViewLayoutMode {
    Grid2x2,
    FocusSingle(String),  // slot_id
    FocusSidebar(String), // slot_id principal
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameSlotInfo {
    pub id: String,
    pub label: String,
    pub url: String,
    pub is_running: bool,
    pub memory_mb: u32,
    pub uptime_seconds: u64,
}

pub struct GameLayoutManager {
    app: AppHandle,
    pub active_slots: Mutex<HashMap<String, String>>, // slot_id -> url
    pub game_states: Arc<Mutex<HashMap<String, PokeIdleGameState>>>, // slot_id -> game_state
    pub slot_snapshots: Arc<Mutex<HashMap<String, String>>>, // slot_id -> base64 dataUrl
    pub last_bounds: Arc<Mutex<HashMap<String, SlotBounds>>>, // slot_id -> last applied bounds
    pub current_layout: Mutex<ViewLayoutMode>,
    pub current_rect: Mutex<Option<ViewportRect>>,
    pub eco_mode: Mutex<bool>,
    pub current_fps: Mutex<u32>,
    pub last_activity_ms: Arc<AtomicU64>,
    last_activity_emit_ms: Arc<AtomicU64>,
}

fn now_epoch_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

/// Preserva as dimensões lógicas do WebView ao mover para offscreen, evitando que o
/// Chromium destrua a swapchain DirectComposition ao redimensionar para 1x1.
pub fn compute_offscreen_size(prev: Option<&SlotBounds>) -> (f64, f64) {
    if let Some(p) = prev {
        if p.width > 50.0 && p.height > 50.0 {
            return (p.width, p.height);
        }
    }
    (1024.0, 680.0)
}

/// Indica se ao restaurar um slot visível é necessário aplicar um nudge de 1px
/// para forçar WM_SIZE / recriação da superfície DirectComposition quando as dimensões
/// permaneceram idênticas às do estado offscreen.
pub fn should_nudge_on_restore(prev: Option<&SlotBounds>, next: &SlotBounds) -> bool {
    if !next.visible || next.width <= 20.0 || next.height <= 20.0 {
        return false;
    }
    match prev {
        Some(p) if !p.visible => (p.width - next.width).abs() < 1.0 && (p.height - next.height).abs() < 1.0,
        None => true,
        _ => false,
    }
}

#[cfg(desktop)]
fn apply_webview_visible_bounds<R: tauri::Runtime>(
    wv: &tauri::Webview<R>,
    b: &SlotBounds,
    nudge_compositor: bool,
    last_bounds_arc: &Arc<Mutex<HashMap<String, SlotBounds>>>,
) {
    if nudge_compositor && b.width > 20.0 && b.height > 20.0 {
        let _ = wv.set_bounds(Rect {
            position: LogicalPosition::new(b.x, b.y).into(),
            size: LogicalSize::new((b.width - 1.0).max(10.0), b.height).into(),
        });
        let wv_restore = wv.clone();
        let target = b.clone();
        let lb_arc = Arc::clone(last_bounds_arc);
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_millis(60)).await;
            let still_visible_same = {
                let map = lb_arc.lock().await;
                map.get(&target.slot_id).map_or(false, |cur| {
                    cur.visible
                        && (cur.x - target.x).abs() < 1.0
                        && (cur.y - target.y).abs() < 1.0
                        && (cur.width - target.width).abs() < 1.0
                        && (cur.height - target.height).abs() < 1.0
                })
            };
            if still_visible_same {
                let _ = wv_restore.set_bounds(Rect {
                    position: LogicalPosition::new(target.x, target.y).into(),
                    size: LogicalSize::new(target.width, target.height).into(),
                });
                let _ = wv_restore.eval(
                    "if (typeof window.__setIdleStreamSlotHidden === 'function') { window.__setIdleStreamSlotHidden(false); } \
                     if (typeof window.__idlestreamForceRepaint === 'function') { window.__idlestreamForceRepaint(); }",
                );
            }
        });
    } else {
        let _ = wv.set_bounds(Rect {
            position: LogicalPosition::new(b.x, b.y).into(),
            size: LogicalSize::new(b.width, b.height).into(),
        });
    }
    let _ = wv.eval(
        "if (typeof window.__setIdleStreamSlotHidden === 'function') { window.__setIdleStreamSlotHidden(false); } \
         if (typeof window.__idlestreamForceRepaint === 'function') { window.__idlestreamForceRepaint(); }",
    );
}

#[cfg(desktop)]
fn apply_webview_offscreen_bounds<R: tauri::Runtime>(
    wv: &tauri::Webview<R>,
    slot_id: &str,
    prev: Option<&SlotBounds>,
) -> SlotBounds {
    let (off_w, off_h) = compute_offscreen_size(prev);
    let hidden_bounds = SlotBounds {
        slot_id: slot_id.to_string(),
        x: -99999.0,
        y: -99999.0,
        width: off_w,
        height: off_h,
        visible: false,
    };
    let _ = wv.set_bounds(Rect {
        position: LogicalPosition::new(-99999.0, -99999.0).into(),
        size: LogicalSize::new(off_w, off_h).into(),
    });
    let _ = wv.eval(
        "if (typeof window.__setIdleStreamSlotHidden === 'function') { window.__setIdleStreamSlotHidden(true); }",
    );
    hidden_bounds
}

impl GameLayoutManager {
    pub fn new(app: AppHandle) -> Self {
        let now_ms = now_epoch_ms();
        Self {
            app,
            active_slots: Mutex::new(HashMap::new()),
            game_states: Arc::new(Mutex::new(HashMap::new())),
            slot_snapshots: Arc::new(Mutex::new(HashMap::new())),
            last_bounds: Arc::new(Mutex::new(HashMap::new())),
            current_layout: Mutex::new(ViewLayoutMode::Grid2x2),
            current_rect: Mutex::new(None),
            eco_mode: Mutex::new(true),
            current_fps: Mutex::new(30),
            last_activity_ms: Arc::new(AtomicU64::new(now_ms)),
            last_activity_emit_ms: Arc::new(AtomicU64::new(0)),
        }
    }

    pub fn get_last_activity_ms(&self) -> u64 {
        self.last_activity_ms.load(Ordering::Relaxed)
    }

    /// Retorna o diretório isolado de perfil para este slot de jogo
    pub fn get_slot_profile_dir(&self, slot_id: &str) -> PathBuf {
        let base = self
            .app
            .path()
            .app_local_data_dir()
            .unwrap_or_else(|_| PathBuf::from("./data"));
        base.join("game_profiles").join(slot_id)
    }

    /// Abre ou inicia uma conta de jogo idle em uma Child Webview
    pub async fn start_game_slot(&self, slot_id: &str, url: &str, zoom: Option<f64>) -> Result<(), String> {
        crate::audit_log!("GAMES", "INFO", "Iniciando WebView do slot [{}] com URL: {}", slot_id, url);
        #[cfg(desktop)]
        {
            let profile_dir = self.get_slot_profile_dir(slot_id);
            let parsed_url = url
                .parse::<url::Url>()
                .map_err(|e| format!("URL inválida: {}", e))?;

            let anti_sleep_script = include_str!("anti_sleep.js");
            let hunt_extension_script = include_str!("hunt_extension.js");

            let current_fps = *self.current_fps.lock().await;
            let mut full_init_script = anti_sleep_script.replace("let targetFps = 30;", &format!("let targetFps = {};", current_fps));
            if url.contains("pokeidle.io") {
                full_init_script.push_str("\n\n// === /hunt for PokeIdle Extension ===\n");
                full_init_script.push_str(hunt_extension_script);
            }

            let win = self
                .app
                .get_window("main")
                .ok_or_else(|| "Janela principal não encontrada".to_string())?;

            // Se já existe uma webview com este ID e está viva, reaproveitamos sem recriar
            if let Some(existing) = self.app.get_webview(slot_id) {
                let _ = existing.eval(&format!(
                    "if (window.location.href !== '{}') {{ window.location.href = '{}'; }}",
                    url, url
                ));
                if let Some(z) = zoom {
                    let _ = self.set_slot_zoom(slot_id, z).await;
                }
                let mut slots = self.active_slots.lock().await;
                slots.insert(slot_id.to_string(), url.to_string());
                drop(slots);

                let rect_opt = self.current_rect.lock().await.clone();
                let layout_opt = self.current_layout.lock().await.clone();
                if let Some(rect) = rect_opt {
                    let _ = self.apply_layout(rect, layout_opt).await;
                }
                return Ok(());
            }

            let app_title = self.app.clone();
            let slot_id_title = slot_id.to_string();
            let states_clone = self.game_states.clone();
            let snapshots_clone = self.slot_snapshots.clone();
            let activity_ms_clone = self.last_activity_ms.clone();
            let activity_emit_clone = self.last_activity_emit_ms.clone();

            let builder = WebviewBuilder::new(slot_id, WebviewUrl::External(parsed_url))
                .data_directory(profile_dir)
                .initialization_script(&full_init_script)
                .on_document_title_changed(move |_wv, title| {
                    if title.starts_with("__IDLESTREAM_USER_ACTIVITY__|") {
                        let now_ms = now_epoch_ms();
                        activity_ms_clone.store(now_ms, Ordering::Relaxed);
                        let prev_emit = activity_emit_clone.load(Ordering::Relaxed);
                        if now_ms.saturating_sub(prev_emit) >= 800 {
                            activity_emit_clone.store(now_ms, Ordering::Relaxed);
                            let _ = app_title.emit("game-user-activity", serde_json::json!({
                                "slotId": slot_id_title,
                                "timestampMs": now_ms,
                            }));
                        }
                    } else if let Some(json_str) = title.strip_prefix("__IDLESTREAM_GAME_STATE__|") {
                        if let Ok(mut state) = serde_json::from_str::<PokeIdleGameState>(json_str) {
                            state.slot_id = slot_id_title.clone();
                            let state_clone = state.clone();
                            let states_lock = states_clone.clone();
                            let app_emit = app_title.clone();
                            let sid = slot_id_title.clone();
                            tauri::async_runtime::spawn(async move {
                                {
                                    let mut map = states_lock.lock().await;
                                    map.insert(sid, state_clone.clone());
                                }
                                let _ = app_emit.emit("game-state-update", &state_clone);
                            });
                        }
                    } else if let Some(snap_data) = title.strip_prefix("__IDLESTREAM_SLOT_SNAPSHOT__|") {
                        let sid = slot_id_title.clone();
                        let snap_str = snap_data.to_string();
                        let snapshots_lock = snapshots_clone.clone();
                        let app_emit = app_title.clone();
                        tauri::async_runtime::spawn(async move {
                            {
                                let mut map = snapshots_lock.lock().await;
                                map.insert(sid.clone(), snap_str.clone());
                            }
                            let _ = app_emit.emit("slot-snapshot-update", serde_json::json!({
                                "slotId": sid,
                                "snapshot": snap_str,
                            }));
                        });
                    } else if let Some(bp_json) = title.strip_prefix("__IDLESTREAM_BATTLE_PASS__|") {
                        let sid = slot_id_title.clone();
                        if let Ok(mut payload) = serde_json::from_str::<serde_json::Value>(bp_json) {
                            if let Some(obj) = payload.as_object_mut() {
                                obj.insert("slotId".to_string(), serde_json::Value::String(sid.clone()));
                            }
                            let _ = app_title.emit("game-battle-pass-update", &payload);
                        }
                    } else if let Some(dbg_json) = title.strip_prefix("__IDLESTREAM_DEBUG_REPORT__|") {
                        crate::audit_log!("GAMES", "INFO", "[{}] ULTRA_TRACE: {}", slot_id_title, dbg_json);
                    }
                });

            // Adiciona a Child Webview à janela principal
            win.add_child(
                builder,
                LogicalPosition::new(0.0, 0.0),
                LogicalSize::new(100.0, 100.0),
            )
            .map_err(|e| format!("Falha ao criar Child Webview: {}", e))?;

            if let Some(z) = zoom {
                let _ = self.set_slot_zoom(slot_id, z).await;
            }

            if let Some(wv) = self.app.get_webview(slot_id) {
                let _ = wv.eval(&format!(
                    "if (typeof window.__setIdleStreamFps === 'function') {{ window.__setIdleStreamFps({}); }}",
                    current_fps
                ));
            }
        }

        let mut slots = self.active_slots.lock().await;
        slots.insert(slot_id.to_string(), url.to_string());
        drop(slots);

        #[cfg(desktop)]
        {
            // Se já temos um rect configurado, reaplicamos o layout
            let rect_opt = self.current_rect.lock().await.clone();
            let layout_opt = self.current_layout.lock().await.clone();
            if let Some(rect) = rect_opt {
                let _ = self.apply_layout(rect, layout_opt).await;
            }
        }

        Ok(())
    }

    /// Para um slot de jogo e destrói sua Child Webview
    pub async fn stop_game_slot(&self, slot_id: &str) -> Result<(), String> {
        crate::audit_log!("GAMES", "INFO", "Encerrando WebView do slot [{}]", slot_id);
        #[cfg(desktop)]
        if let Some(wv) = self.app.get_webview(slot_id) {
            let _ = wv.close();
        }

        let mut slots = self.active_slots.lock().await;
        slots.remove(slot_id);
        drop(slots);
        self.last_bounds.lock().await.remove(slot_id);

        #[cfg(desktop)]
        {
            let rect_opt = self.current_rect.lock().await.clone();
            let layout_opt = self.current_layout.lock().await.clone();
            if let Some(rect) = rect_opt {
                let _ = self.apply_layout(rect, layout_opt).await;
            }
        }

        Ok(())
    }

    /// Aplica o posicionamento geométrico para as child webviews ativas
    pub async fn apply_layout(&self, rect: ViewportRect, mode: ViewLayoutMode) -> Result<(), String> {
        let slots_map = self.active_slots.lock().await;
        let mut slot_keys: Vec<String> = slots_map.keys().cloned().collect();
        drop(slots_map);

        slot_keys.sort();

        // Salvar rect e modo atual
        *self.current_rect.lock().await = Some(rect.clone());
        *self.current_layout.lock().await = mode.clone();

        crate::audit_log!("GAMES", "INFO", "Aplicando layout dos slots: {:?} ({} ativo(s))", mode, slot_keys.len());

        if slot_keys.is_empty() {
            return Ok(());
        }

        #[cfg(desktop)]
        {
            let mut last_bounds = self.last_bounds.lock().await;
            match &mode {
                ViewLayoutMode::Grid2x2 => {
                    let half_w = (rect.width / 2.0).max(10.0);
                    let half_h = (rect.height / 2.0).max(10.0);

                    let positions = [
                        (rect.x, rect.y),                   // Top-Left
                        (rect.x + half_w, rect.y),          // Top-Right
                        (rect.x, rect.y + half_h),          // Bottom-Left
                        (rect.x + half_w, rect.y + half_h), // Bottom-Right
                    ];

                    for (idx, slot_id) in slot_keys.iter().enumerate() {
                        if let Some(wv) = self.app.get_webview(slot_id) {
                            let prev = last_bounds.get(slot_id).cloned();
                            if idx < 4 {
                                let (px, py) = positions[idx];
                                let b = SlotBounds {
                                    slot_id: slot_id.clone(),
                                    x: px,
                                    y: py,
                                    width: half_w,
                                    height: half_h,
                                    visible: true,
                                };
                                let nudge = should_nudge_on_restore(prev.as_ref(), &b);
                                apply_webview_visible_bounds(&wv, &b, nudge, &self.last_bounds);
                                last_bounds.insert(slot_id.clone(), b);
                            } else {
                                let hidden = apply_webview_offscreen_bounds(&wv, slot_id, prev.as_ref());
                                last_bounds.insert(slot_id.clone(), hidden);
                            }
                        }
                    }
                }
                ViewLayoutMode::FocusSingle(focused_id) => {
                    for slot_id in &slot_keys {
                        if let Some(wv) = self.app.get_webview(slot_id) {
                            let prev = last_bounds.get(slot_id).cloned();
                            if slot_id == focused_id {
                                let b = SlotBounds {
                                    slot_id: slot_id.clone(),
                                    x: rect.x,
                                    y: rect.y,
                                    width: rect.width,
                                    height: rect.height,
                                    visible: true,
                                };
                                let nudge = should_nudge_on_restore(prev.as_ref(), &b);
                                apply_webview_visible_bounds(&wv, &b, nudge, &self.last_bounds);
                                last_bounds.insert(slot_id.clone(), b);
                            } else {
                                // Move para offscreen preservando dimensões e DirectComposition sem tela preta/TDR
                                let hidden = apply_webview_offscreen_bounds(&wv, slot_id, prev.as_ref());
                                last_bounds.insert(slot_id.clone(), hidden);
                            }
                        }
                    }
                }
                ViewLayoutMode::FocusSidebar(focused_id) => {
                    let main_w = (rect.width * 0.72).max(10.0);
                    let side_w = (rect.width - main_w).max(10.0);
                    let side_slots: Vec<&String> = slot_keys.iter().filter(|s| *s != focused_id).collect();
                    let side_h = if side_slots.is_empty() {
                        rect.height
                    } else {
                        (rect.height / (side_slots.len() as f64)).max(10.0)
                    };

                    // Focused slot na esquerda
                    if let Some(wv) = self.app.get_webview(focused_id) {
                        let prev = last_bounds.get(focused_id).cloned();
                        let b = SlotBounds {
                            slot_id: focused_id.clone(),
                            x: rect.x,
                            y: rect.y,
                            width: main_w,
                            height: rect.height,
                            visible: true,
                        };
                        let nudge = should_nudge_on_restore(prev.as_ref(), &b);
                        apply_webview_visible_bounds(&wv, &b, nudge, &self.last_bounds);
                        last_bounds.insert(focused_id.clone(), b);
                    }

                    // Slots secundários na coluna direita
                    for (idx, slot_id) in side_slots.iter().enumerate() {
                        if let Some(wv) = self.app.get_webview(slot_id) {
                            let prev = last_bounds.get(*slot_id).cloned();
                            let b = SlotBounds {
                                slot_id: (*slot_id).clone(),
                                x: rect.x + main_w,
                                y: rect.y + (idx as f64 * side_h),
                                width: side_w,
                                height: side_h,
                                visible: true,
                            };
                            let nudge = should_nudge_on_restore(prev.as_ref(), &b);
                            apply_webview_visible_bounds(&wv, &b, nudge, &self.last_bounds);
                            last_bounds.insert((*slot_id).clone(), b);
                        }
                    }
                }
            }
        }

        Ok(())
    }

    /// Atualiza os limites de exibição de cada slot individualmente calculados pelo React
    pub async fn update_slots_bounds(&self, bounds_list: Vec<SlotBounds>) -> Result<(), String> {
        #[cfg(desktop)]
        {
            let mut last_bounds = self.last_bounds.lock().await;
            for b in bounds_list {
                // Checa se as coordenadas e visibilidade realmente mudaram antes de acionar DirectComposition
                let prev_opt = last_bounds.get(&b.slot_id).cloned();
                if let Some(prev) = &prev_opt {
                    if prev.visible == b.visible
                        && (prev.x - b.x).abs() < 1.0
                        && (prev.y - b.y).abs() < 1.0
                        && (prev.width - b.width).abs() < 1.0
                        && (prev.height - b.height).abs() < 1.0
                    {
                        continue; // Sem alteração de layout, evita refazer o swapchain do WebView2
                    }
                }

                if let Some(wv) = self.app.get_webview(&b.slot_id) {
                    if b.visible && b.width > 10.0 && b.height > 10.0 {
                        let nudge = should_nudge_on_restore(prev_opt.as_ref(), &b);
                        apply_webview_visible_bounds(&wv, &b, nudge, &self.last_bounds);
                        last_bounds.insert(b.slot_id.clone(), b.clone());
                    } else {
                        // Oculta movendo para fora da tela (offscreen) sem chamar wv.hide() e sem encolher para 1x1
                        // Isso preserva o tamanho e a árvore DirectComposition do Windows DWM, prevenindo tela preta
                        let hidden = apply_webview_offscreen_bounds(&wv, &b.slot_id, prev_opt.as_ref());
                        last_bounds.insert(b.slot_id.clone(), hidden);
                    }
                } else {
                    last_bounds.insert(b.slot_id.clone(), b.clone());
                }
            }
        }
        Ok(())
    }

    /// Recarrega a página de um slot específico e reaplica as configurações de performance
    pub async fn reload_slot(&self, slot_id: &str) -> Result<(), String> {
        crate::audit_log!("GAMES", "INFO", "Recarregando WebView do slot [{}]", slot_id);
        #[cfg(desktop)]
        if let Some(wv) = self.app.get_webview(slot_id) {
            let current_fps = *self.current_fps.lock().await;
            let _ = wv.eval("window.location.reload();");
            // Re-injeta FPS atualizado pós-reload
            let script = format!(
                "setTimeout(() => {{ if (typeof window.__setIdleStreamFps === 'function') {{ window.__setIdleStreamFps({}); }} }}, 500);",
                current_fps
            );
            let _ = wv.eval(&script);
        }
        Ok(())
    }

    /// Ajusta o nível de zoom de uma child webview específica
    pub async fn set_slot_zoom(&self, slot_id: &str, zoom: f64) -> Result<(), String> {
        #[cfg(desktop)]
        if let Some(wv) = self.app.get_webview(slot_id) {
            let _ = wv.set_zoom(zoom);
        }
        Ok(())
    }

    /// Altera o Modo Econômico para todas as child webviews ativas em tempo real
    pub async fn set_eco_mode(&self, enabled: bool) -> Result<(), String> {
        *self.eco_mode.lock().await = enabled;
        let fps = if enabled { 30 } else { 60 };
        *self.current_fps.lock().await = fps;

        #[cfg(desktop)]
        {
            let script = format!(
                "if (typeof window.__setIdleStreamEcoMode === 'function') {{ window.__setIdleStreamEcoMode({}); }}",
                enabled
            );

            let slots_map = self.active_slots.lock().await;
            for slot_id in slots_map.keys() {
                if let Some(wv) = self.app.get_webview(slot_id) {
                    let _ = wv.eval(&script);
                }
            }
        }
        Ok(())
    }

    /// Altera o limite de FPS (60, 30 ou 10 Super Economia) em todas as child webviews ativas
    pub async fn set_fps(&self, fps: u32) -> Result<(), String> {
        crate::audit_log!("GAMES", "INFO", "Ajustando taxa de quadros (FPS) para: {} FPS", fps);
        let prev_fps = {
            let mut guard = self.current_fps.lock().await;
            let prev = *guard;
            *guard = fps;
            prev
        };
        *self.eco_mode.lock().await = fps < 60;

        #[cfg(desktop)]
        {
            let script = format!(
                "if (typeof window.__setIdleStreamFps === 'function') {{ window.__setIdleStreamFps({}); }}",
                fps
            );
            if fps >= 60 {
                let last_bounds = self.last_bounds.lock().await;
                let slots_map = self.active_slots.lock().await;
                let woke_from_sleep = prev_fps <= 1;
                for slot_id in slots_map.keys() {
                    if let Some(wv) = self.app.get_webview(slot_id) {
                        if let Some(b) = last_bounds.get(slot_id) {
                            if b.visible {
                                let full_script = format!(
                                    "{}; if (typeof window.__setIdleStreamSlotHidden === 'function') {{ window.__setIdleStreamSlotHidden(false); }} \
                                     if (typeof window.__idlestreamForceRepaint === 'function') {{ window.__idlestreamForceRepaint(); }}",
                                    script
                                );
                                let _ = wv.eval(&full_script);
                                if woke_from_sleep {
                                    apply_webview_visible_bounds(&wv, b, true, &self.last_bounds);
                                }
                                continue;
                            }
                        }
                        let _ = wv.eval(&script);
                    }
                }
            } else {
                let slots_map = self.active_slots.lock().await;
                for slot_id in slots_map.keys() {
                    if let Some(wv) = self.app.get_webview(slot_id) {
                        let _ = wv.eval(&script);
                    }
                }
            }
        }
        Ok(())
    }

    /// Dispara a tentativa de resgate do Passe de Batalha do PokeIdle em um slot ativo
    pub async fn trigger_battle_pass_claim(&self, slot_id: &str) -> Result<(), String> {
        #[cfg(desktop)]
        if let Some(wv) = self.app.get_webview(slot_id) {
            let _ = wv.eval("if (typeof window.__claimPokeIdleBattlePass === 'function') { window.__claimPokeIdleBattlePass(true); }");
        }
        #[cfg(not(desktop))]
        let _ = slot_id;
        Ok(())
    }

    /// Alterna o Modo Ultra Economia oficial do PokeIdle (card escuro de estatísticas)
    pub async fn toggle_pokeidle_ultra(&self, slot_id: Option<&str>, enabled: Option<bool>) -> Result<(), String> {
        crate::audit_log!(
            "GAMES",
            "INFO",
            "toggle_pokeidle_ultra(slot={:?}, enabled={:?})",
            slot_id,
            enabled
        );
        #[cfg(desktop)]
        {
            let script = match enabled {
                Some(en) => format!("if (typeof window.__togglePokeIdleUltra === 'function') {{ window.__togglePokeIdleUltra({}); }}", en),
                None => "if (typeof window.__togglePokeIdleUltra === 'function') { window.__togglePokeIdleUltra(); }".to_string(),
            };

            let slots_map = self.active_slots.lock().await;
            if let Some(sid) = slot_id {
                if let Some(wv) = self.app.get_webview(sid) {
                    let _ = wv.eval(&script);
                }
            } else {
                for sid in slots_map.keys() {
                    if let Some(wv) = self.app.get_webview(sid) {
                        let _ = wv.eval(&script);
                    }
                }
            }
        }
        Ok(())
    }

    /// Oculta todas as child webviews quando o usuário sai da aba de Jogos (ex: vai para Streams)
    /// ou quando a janela é minimizada/enviada para a bandeja.
    /// Reduz a renderização para 1 FPS enquanto mantém farms e timers de background ativos!
    pub async fn hide_all_game_views(&self) -> Result<(), String> {
        #[cfg(desktop)]
        {
            *self.current_fps.lock().await = 1;
            *self.eco_mode.lock().await = true;

            let mut last_bounds = self.last_bounds.lock().await;
            let slots_map = self.active_slots.lock().await;
            for slot_id in slots_map.keys() {
                let prev = last_bounds.get(slot_id).cloned();
                if let Some(wv) = self.app.get_webview(slot_id) {
                    let hidden = apply_webview_offscreen_bounds(&wv, slot_id, prev.as_ref());
                    last_bounds.insert(slot_id.clone(), hidden);
                    let _ = wv.eval("if (typeof window.__setIdleStreamFps === 'function') { window.__setIdleStreamFps(1); }");
                } else {
                    let (off_w, off_h) = compute_offscreen_size(prev.as_ref());
                    last_bounds.insert(
                        slot_id.clone(),
                        SlotBounds {
                            slot_id: slot_id.clone(),
                            x: -99999.0,
                            y: -99999.0,
                            width: off_w,
                            height: off_h,
                            visible: false,
                        },
                    );
                }
            }
        }

        let _ = self.trim_memory().await;
        Ok(())
    }

    /// Força atualização visual (compositor nudge de 1px + repaint JS) em todas as WebViews
    /// atualmente visíveis, prevenindo telas pretas após Sleep/DWM/mudança de foco sem exigir troca de layout.
    pub async fn refresh_visible_views(&self) -> Result<(), String> {
        crate::audit_log!("GAMES", "INFO", "refresh_visible_views acionado");
        #[cfg(desktop)]
        {
            let slots_map = self.active_slots.lock().await;
            let last_bounds = self.last_bounds.lock().await;
            for slot_id in slots_map.keys() {
                if let Some(b) = last_bounds.get(slot_id) {
                    if b.visible && b.width > 20.0 && b.height > 20.0 {
                        if let Some(wv) = self.app.get_webview(slot_id) {
                            apply_webview_visible_bounds(&wv, b, true, &self.last_bounds);
                        }
                    }
                }
            }
        }
        Ok(())
    }

    /// Executa coleta de lixo forçada em todas as WebViews e esvazia páginas
    /// limpas da memória de trabalho (working set) para o pool standby do Windows
    pub async fn trim_memory(&self) -> Result<(), String> {
        crate::audit_log!("GAMES", "INFO", "Executando purga e otimização de memória RAM...");
        #[cfg(desktop)]
        {
            let slots_map = self.active_slots.lock().await;
            for slot_id in slots_map.keys() {
                if let Some(wv) = self.app.get_webview(slot_id) {
                    let _ = wv.eval("if (typeof window.gc === 'function') { try { window.gc(); } catch(_) {} }");
                }
            }
            if let Some(main_wv) = self.app.get_webview("main") {
                let _ = main_wv.eval("if (typeof window.gc === 'function') { try { window.gc(); } catch(_) {} }");
            }
        }

        #[cfg(target_os = "windows")]
        {
            // Só executa purga física de working set em Sleep (<= 1 FPS) e com cooldown de 60s
            let current_fps = *self.current_fps.lock().await;
            if current_fps <= 1 {
                static LAST_TRIM_SECS: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs();
                let prev = LAST_TRIM_SECS.load(std::sync::atomic::Ordering::Relaxed);
                if now.saturating_sub(prev) >= 60 {
                    LAST_TRIM_SECS.store(now, std::sync::atomic::Ordering::Relaxed);
                    extern "system" {
                        fn GetCurrentProcess() -> isize;
                        fn SetProcessWorkingSetSize(h_process: isize, min: usize, max: usize) -> i32;
                    }
                    unsafe {
                        // (SIZE_T)-1 esvazia páginas de memória RAM física limpas de volta para a lista standby do Windows
                        SetProcessWorkingSetSize(GetCurrentProcess(), usize::MAX, usize::MAX);
                    }
                }
            }
        }

        Ok(())
    }

    /// Restaura o layout atual para as child webviews
    pub async fn restore_current_layout(&self) -> Result<(), String> {
        #[cfg(desktop)]
        {
            let rect_opt = self.current_rect.lock().await.clone();
            let layout_opt = self.current_layout.lock().await.clone();
            if let Some(rect) = rect_opt {
                return self.apply_layout(rect, layout_opt).await;
            }
        }
        Ok(())
    }

    /// Retorna o estado lido do PokeIdle para um slot específico
    pub async fn get_game_state(&self, slot_id: &str) -> Option<PokeIdleGameState> {
        let map = self.game_states.lock().await;
        map.get(slot_id).cloned()
    }

    /// Retorna todos os estados ativos de jogos PokeIdle
    pub async fn get_all_game_states(&self) -> HashMap<String, PokeIdleGameState> {
        let map = self.game_states.lock().await;
        map.clone()
    }

    /// Congela um slot individual: força captura de snapshot, move offscreen e suspende ticks (0% GPU)
    pub async fn freeze_slot(&self, slot_id: &str) -> Result<Option<String>, String> {
        crate::audit_log!("GAMES", "INFO", "Congelando slot [{}] (0% GPU)", slot_id);
        #[cfg(desktop)]
        if let Some(wv) = self.app.get_webview(slot_id) {
            let mut last_bounds = self.last_bounds.lock().await;
            let prev = last_bounds.get(slot_id).cloned();
            let hidden = apply_webview_offscreen_bounds(&wv, slot_id, prev.as_ref());
            last_bounds.insert(slot_id.to_string(), hidden);
        }
        let map = self.slot_snapshots.lock().await;
        Ok(map.get(slot_id).cloned())
    }

    /// Descongela um slot: restaura ticks e reaplica o layout
    pub async fn unfreeze_slot(&self, slot_id: &str) -> Result<(), String> {
        crate::audit_log!("GAMES", "INFO", "Descongelando slot [{}]", slot_id);
        #[cfg(desktop)]
        if let Some(wv) = self.app.get_webview(slot_id) {
            let _ = wv.eval("if (typeof window.__setIdleStreamSlotHidden === 'function') { window.__setIdleStreamSlotHidden(false); }");
        }
        self.restore_current_layout().await
    }

    /// Retorna o último snapshot base64 capturado para um slot
    pub async fn get_slot_snapshot(&self, slot_id: &str) -> Option<String> {
        let map = self.slot_snapshots.lock().await;
        map.get(slot_id).cloned()
    }

    /// Retorna todos os snapshots capturados
    pub async fn get_all_snapshots(&self) -> HashMap<String, String> {
        let map = self.slot_snapshots.lock().await;
        map.clone()
    }
}
