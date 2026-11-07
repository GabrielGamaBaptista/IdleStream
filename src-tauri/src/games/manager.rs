use std::collections::HashMap;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
#[cfg(desktop)]
use tauri::{LogicalPosition, LogicalSize, Rect, WebviewBuilder, WebviewUrl};
use tokio::sync::Mutex;

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
    pub current_layout: Mutex<ViewLayoutMode>,
    pub current_rect: Mutex<Option<ViewportRect>>,
    pub eco_mode: Mutex<bool>,
    pub current_fps: Mutex<u32>,
}

impl GameLayoutManager {
    pub fn new(app: AppHandle) -> Self {
        Self {
            app,
            active_slots: Mutex::new(HashMap::new()),
            current_layout: Mutex::new(ViewLayoutMode::Grid2x2),
            current_rect: Mutex::new(None),
            eco_mode: Mutex::new(true),
            current_fps: Mutex::new(30),
        }
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

            // Se já existe uma webview com este ID, fechamos antes
            if let Some(existing) = self.app.get_webview(slot_id) {
                let _ = existing.close();
                tokio::time::sleep(std::time::Duration::from_millis(150)).await;
            }

            let builder = WebviewBuilder::new(slot_id, WebviewUrl::External(parsed_url))
                .data_directory(profile_dir)
                .initialization_script(&full_init_script)
                .auto_resize();

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
        #[cfg(desktop)]
        if let Some(wv) = self.app.get_webview(slot_id) {
            let _ = wv.close();
        }

        let mut slots = self.active_slots.lock().await;
        slots.remove(slot_id);
        drop(slots);

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

        if slot_keys.is_empty() {
            return Ok(());
        }

        #[cfg(desktop)]
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
                        if idx < 4 {
                            let (px, py) = positions[idx];
                            let _ = wv.set_bounds(Rect {
                                position: LogicalPosition::new(px, py).into(),
                                size: LogicalSize::new(half_w, half_h).into(),
                            });
                            let _ = wv.show();
                            let _ = wv.eval("if (typeof window.__setIdleStreamSlotHidden === 'function') { window.__setIdleStreamSlotHidden(false); }");
                        } else {
                            let _ = wv.hide();
                            let _ = wv.eval("if (typeof window.__setIdleStreamSlotHidden === 'function') { window.__setIdleStreamSlotHidden(true); }");
                        }
                    }
                }
            }
            ViewLayoutMode::FocusSingle(focused_id) => {
                for slot_id in &slot_keys {
                    if let Some(wv) = self.app.get_webview(slot_id) {
                        if slot_id == focused_id {
                            let _ = wv.set_bounds(Rect {
                                position: LogicalPosition::new(rect.x, rect.y).into(),
                                size: LogicalSize::new(rect.width, rect.height).into(),
                            });
                            let _ = wv.show();
                            let _ = wv.eval("if (typeof window.__setIdleStreamSlotHidden === 'function') { window.__setIdleStreamSlotHidden(false); }");
                        } else {
                            // IMPORTANTE: Em vez de destroy, apenas ocultamos e reduzimos para 1 FPS
                            let _ = wv.hide();
                            let _ = wv.eval("if (typeof window.__setIdleStreamSlotHidden === 'function') { window.__setIdleStreamSlotHidden(true); }");
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
                    let _ = wv.set_bounds(Rect {
                        position: LogicalPosition::new(rect.x, rect.y).into(),
                        size: LogicalSize::new(main_w, rect.height).into(),
                    });
                    let _ = wv.show();
                    let _ = wv.eval("if (typeof window.__setIdleStreamSlotHidden === 'function') { window.__setIdleStreamSlotHidden(false); }");
                }

                // Slots secundários na coluna direita
                for (idx, slot_id) in side_slots.iter().enumerate() {
                    if let Some(wv) = self.app.get_webview(slot_id) {
                        let _ = wv.set_bounds(Rect {
                            position: LogicalPosition::new(
                                rect.x + main_w,
                                rect.y + (idx as f64 * side_h),
                            )
                            .into(),
                            size: LogicalSize::new(side_w, side_h).into(),
                        });
                        let _ = wv.show();
                        let _ = wv.eval("if (typeof window.__setIdleStreamSlotHidden === 'function') { window.__setIdleStreamSlotHidden(false); }");
                    }
                }
            }
        }

        Ok(())
    }

    /// Atualiza os limites de exibição de cada slot individualmente calculados pelo React
    pub async fn update_slots_bounds(&self, bounds_list: Vec<SlotBounds>) -> Result<(), String> {
        #[cfg(desktop)]
        for b in bounds_list {
            if let Some(wv) = self.app.get_webview(&b.slot_id) {
                if b.visible && b.width > 10.0 && b.height > 10.0 {
                    let _ = wv.set_bounds(Rect {
                        position: LogicalPosition::new(b.x, b.y).into(),
                        size: LogicalSize::new(b.width, b.height).into(),
                    });
                    let _ = wv.show();
                    let _ = wv.eval("if (typeof window.__setIdleStreamSlotHidden === 'function') { window.__setIdleStreamSlotHidden(false); }");
                } else {
                    // Oculta e reduz para 1 FPS sem parar o farm
                    let _ = wv.hide();
                    let _ = wv.eval("if (typeof window.__setIdleStreamSlotHidden === 'function') { window.__setIdleStreamSlotHidden(true); }");
                }
            }
        }
        Ok(())
    }

    /// Recarrega a página de um slot específico e reaplica as configurações de performance
    pub async fn reload_slot(&self, slot_id: &str) -> Result<(), String> {
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
            let _ = wv.eval(&format!("document.body.style.zoom = '{:.2}';", zoom));
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
        *self.current_fps.lock().await = fps;
        *self.eco_mode.lock().await = fps < 60;

        #[cfg(desktop)]
        {
            let script = format!(
                "if (typeof window.__setIdleStreamFps === 'function') {{ window.__setIdleStreamFps({}); }}",
                fps
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

    /// Alterna o Modo Ultra Economia oficial do PokeIdle (card escuro de estatísticas)
    pub async fn toggle_pokeidle_ultra(&self, slot_id: Option<&str>, enabled: Option<bool>) -> Result<(), String> {
        #[cfg(desktop)]
        {
            let script = match enabled {
                Some(en) => format!("if (typeof window.__togglePokeIdleUltra === 'function') {{ window.__togglePokeIdleUltra({}); }}", en),
                None => "if (typeof window.__togglePokeIdleUltra === 'function') {{ window.__togglePokeIdleUltra(); }}".to_string(),
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
            let slots_map = self.active_slots.lock().await;
            for slot_id in slots_map.keys() {
                if let Some(wv) = self.app.get_webview(slot_id) {
                    let _ = wv.hide();
                    let _ = wv.eval("if (typeof window.__setIdleStreamSlotHidden === 'function') { window.__setIdleStreamSlotHidden(true); }");
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
}
