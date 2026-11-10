use crate::config::VoteAccountConfig;
use crate::votes::policy::build_vote_target_url;
#[cfg(desktop)]
use crate::votes::policy::{ensure_google_select_account, is_allowed_vote_navigation};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
#[cfg(desktop)]
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Manager};
#[cfg(desktop)]
use tauri::{Emitter, LogicalPosition, LogicalSize, Rect, WebviewBuilder, WebviewUrl, WebviewWindowBuilder};
use tokio::sync::Mutex;

pub const VOTE_WEBVIEW_LABEL: &str = "vote-active";
#[cfg(desktop)]
static POPUP_COUNTER: AtomicU64 = AtomicU64::new(1);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoteBounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub visible: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoteUrlChangedPayload {
    pub account_id: String,
    pub url: String,
    pub loading: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoteBlockedPayload {
    pub account_id: String,
    pub blocked_url: String,
    pub host: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoteDetectedHintPayload {
    pub account_id: String,
    pub reason: String,
}

pub struct VoteManager {
    app: AppHandle,
    pub active_account_id: Mutex<Option<String>>,
    pub last_bounds: Mutex<Option<VoteBounds>>,
    pub popup_labels: Arc<std::sync::Mutex<Vec<String>>>,
}

impl VoteManager {
    pub fn new(app: AppHandle) -> Self {
        Self {
            app,
            active_account_id: Mutex::new(None),
            last_bounds: Mutex::new(None),
            popup_labels: Arc::new(std::sync::Mutex::new(Vec::new())),
        }
    }

    pub fn resolve_profile_dir(&self, account: &VoteAccountConfig) -> PathBuf {
        let base = self
            .app
            .path()
            .app_local_data_dir()
            .unwrap_or_else(|_| PathBuf::from("./data"));
        if account.share_game_profile {
            if let Some(ref slot_id) = account.linked_game_slot_id {
                let clean = slot_id.trim();
                if !clean.is_empty() {
                    return base.join("game_profiles").join(clean);
                }
            }
        }
        base.join("vote_profiles").join(&account.id)
    }

    fn close_tracked_popups(&self) {
        let labels = {
            let mut lock = self.popup_labels.lock().unwrap();
            let list = lock.clone();
            lock.clear();
            list
        };
        #[cfg(desktop)]
        for label in labels {
            if let Some(win) = self.app.get_webview_window(&label) {
                let _ = win.destroy();
            }
        }
        #[cfg(not(desktop))]
        let _ = labels;
    }

    pub async fn open_vote_webview(
        &self,
        account: &VoteAccountConfig,
        bounds: Option<VoteBounds>,
    ) -> Result<String, String> {
        let target_url = build_vote_target_url(&account.base_url, &account.player_identifier)?;

        #[cfg(desktop)]
        {
            self.close_tracked_popups();
            if let Some(existing) = self.app.get_webview(VOTE_WEBVIEW_LABEL) {
                let _ = existing.close();
                tokio::time::sleep(std::time::Duration::from_millis(120)).await;
            }

            let profile_dir = self.resolve_profile_dir(account);
            let win = self
                .app
                .get_window("main")
                .ok_or_else(|| "Janela principal não encontrada".to_string())?;

            let acc_id_nav = account.id.clone();
            let app_nav = self.app.clone();

            let acc_id_popup = account.id.clone();
            let app_popup = self.app.clone();
            let popups_ref = Arc::clone(&self.popup_labels);

            let acc_id_load = account.id.clone();
            let app_load = self.app.clone();

            let acc_id_title = account.id.clone();
            let app_title = self.app.clone();

            let builder = WebviewBuilder::new(VOTE_WEBVIEW_LABEL, WebviewUrl::External(target_url.clone()))
                .data_directory(profile_dir)
                .initialization_script(include_str!("vote_observer.js"))
                .on_navigation(move |url| {
                    if !is_allowed_vote_navigation(url, false) {
                        let _ = app_nav.emit(
                            "vote-navigation-blocked",
                            VoteBlockedPayload {
                                account_id: acc_id_nav.clone(),
                                blocked_url: url.to_string(),
                                host: url.host_str().unwrap_or("desconhecido").to_string(),
                            },
                        );
                        return false;
                    }

                    if let Some(modified_oauth) = ensure_google_select_account(url) {
                        let app_redir = app_nav.clone();
                        tauri::async_runtime::spawn(async move {
                            tokio::time::sleep(std::time::Duration::from_millis(10)).await;
                            if let Some(wv) = app_redir.get_webview(VOTE_WEBVIEW_LABEL) {
                                let _ = wv.navigate(modified_oauth);
                            }
                        });
                        return false;
                    }

                    true
                })
                .on_new_window(move |url, features| {
                    if !is_allowed_vote_navigation(&url, true) {
                        let _ = app_popup.emit(
                            "vote-navigation-blocked",
                            VoteBlockedPayload {
                                account_id: acc_id_popup.clone(),
                                blocked_url: url.to_string(),
                                host: url.host_str().unwrap_or("desconhecido").to_string(),
                            },
                        );
                        return tauri::webview::NewWindowResponse::Deny;
                    }

                    let seq = POPUP_COUNTER.fetch_add(1, Ordering::Relaxed);
                    let popup_label = format!("vote_popup_{}", seq);
                    let acc_id_child_nav = acc_id_popup.clone();
                    let app_child_nav = app_popup.clone();
                    let popup_label_nav = popup_label.clone();

                    let blank = "about:blank".parse::<url::Url>().unwrap();
                    let popup_builder = WebviewWindowBuilder::new(
                        &app_popup,
                        &popup_label,
                        WebviewUrl::External(blank),
                    )
                    .window_features(features)
                    .title(format!("IdleStream - Autenticação TopIdle ({})", url.host_str().unwrap_or("OAuth")))
                    .inner_size(520.0, 680.0)
                    .center()
                    .on_navigation(move |nav_url| {
                        if !is_allowed_vote_navigation(nav_url, true) {
                            let _ = app_child_nav.emit(
                                "vote-navigation-blocked",
                                VoteBlockedPayload {
                                    account_id: acc_id_child_nav.clone(),
                                    blocked_url: nav_url.to_string(),
                                    host: nav_url.host_str().unwrap_or("desconhecido").to_string(),
                                },
                            );
                            return false;
                        }
                        if let Some(modified_oauth) = ensure_google_select_account(nav_url) {
                            let app_redir = app_child_nav.clone();
                            let lbl_redir = popup_label_nav.clone();
                            tauri::async_runtime::spawn(async move {
                                tokio::time::sleep(std::time::Duration::from_millis(10)).await;
                                if let Some(win_p) = app_redir.get_webview_window(&lbl_redir) {
                                    let _ = win_p.navigate(modified_oauth);
                                }
                            });
                            return false;
                        }
                        true
                    });

                    match popup_builder.build() {
                        Ok(window) => {
                            popups_ref.lock().unwrap().push(popup_label);
                            tauri::webview::NewWindowResponse::Create { window }
                        }
                        Err(_) => tauri::webview::NewWindowResponse::Deny,
                    }
                })
                .on_page_load(move |_wv, payload| {
                    let loading = matches!(payload.event(), tauri::webview::PageLoadEvent::Started);
                    let _ = app_load.emit(
                        "vote-url-changed",
                        VoteUrlChangedPayload {
                            account_id: acc_id_load.clone(),
                            url: payload.url().to_string(),
                            loading,
                        },
                    );
                })
                .on_document_title_changed(move |_wv, title| {
                    if let Some(rest) = title.strip_prefix("__IDLESTREAM_VOTE_HINT__|") {
                        let reason = rest.split('|').next().unwrap_or("vote_confirmed").to_string();
                        let _ = app_title.emit(
                            "vote-detected-hint",
                            VoteDetectedHintPayload {
                                account_id: acc_id_title.clone(),
                                reason,
                            },
                        );
                    }
                });

            let (init_x, init_y, init_w, init_h) = match &bounds {
                Some(b) if b.visible && b.width > 10.0 && b.height > 10.0 => {
                    (b.x, b.y, b.width, b.height)
                }
                _ => (-99999.0, -99999.0, 1.0, 1.0),
            };

            win.add_child(
                builder,
                LogicalPosition::new(init_x, init_y),
                LogicalSize::new(init_w, init_h),
            )
            .map_err(|e| format!("Falha ao abrir WebView de votação: {}", e))?;
        }

        *self.active_account_id.lock().await = Some(account.id.clone());
        if let Some(b) = bounds {
            *self.last_bounds.lock().await = Some(b);
        }

        Ok(target_url.to_string())
    }

    pub async fn close_vote_webview(&self) -> Result<(), String> {
        self.close_tracked_popups();

        #[cfg(desktop)]
        if let Some(wv) = self.app.get_webview(VOTE_WEBVIEW_LABEL) {
            let _ = wv.close();
        }

        *self.active_account_id.lock().await = None;
        *self.last_bounds.lock().await = None;
        Ok(())
    }

    pub async fn update_bounds(&self, bounds: VoteBounds) -> Result<(), String> {
        *self.last_bounds.lock().await = Some(bounds.clone());

        #[cfg(desktop)]
        if let Some(wv) = self.app.get_webview(VOTE_WEBVIEW_LABEL) {
            if bounds.visible && bounds.width > 10.0 && bounds.height > 10.0 {
                let _ = wv.set_bounds(Rect {
                    position: LogicalPosition::new(bounds.x, bounds.y).into(),
                    size: LogicalSize::new(bounds.width, bounds.height).into(),
                });
            } else {
                // Move para offscreen sem put_IsVisible(false) preservando DWM sem tela preta
                let _ = wv.set_bounds(Rect {
                    position: LogicalPosition::new(-99999.0, -99999.0).into(),
                    size: LogicalSize::new(1.0, 1.0).into(),
                });
            }
        }
        Ok(())
    }

    pub async fn hide_vote_webview(&self) -> Result<(), String> {
        #[cfg(desktop)]
        if let Some(wv) = self.app.get_webview(VOTE_WEBVIEW_LABEL) {
            let _ = wv.set_bounds(Rect {
                position: LogicalPosition::new(-99999.0, -99999.0).into(),
                size: LogicalSize::new(1.0, 1.0).into(),
            });
        }
        Ok(())
    }

    pub async fn reload_vote_webview(&self) -> Result<(), String> {
        #[cfg(desktop)]
        if let Some(wv) = self.app.get_webview(VOTE_WEBVIEW_LABEL) {
            wv.reload().map_err(|e| format!("Falha ao recarregar página de voto: {}", e))?;
        }
        Ok(())
    }

    /// Limpa cookies e storage exclusivamente de topidle.com, preservando logins de jogos (pokeidle.io)
    /// e cookies do Google do slot compartilhado.
    pub async fn clear_topidle_session(&self, account: &VoteAccountConfig) -> Result<(), String> {
        let target_url = build_vote_target_url(&account.base_url, &account.player_identifier)?;

        #[cfg(desktop)]
        if let Some(wv) = self.app.get_webview(VOTE_WEBVIEW_LABEL) {
            let wv_cookies = wv.clone();
            let topidle_url = url::Url::parse("https://topidle.com/").unwrap();
            let _ = tokio::task::spawn_blocking(move || {
                if let Ok(cookies) = wv_cookies.cookies_for_url(topidle_url) {
                    for cookie in cookies {
                        let domain = cookie.domain().unwrap_or_default().to_ascii_lowercase();
                        if domain.is_empty() || domain.contains("topidle.com") {
                            let _ = wv_cookies.delete_cookie(cookie);
                        }
                    }
                }
            })
            .await;

            let _ = wv.eval(
                "try { if (location.hostname.endsWith('topidle.com')) { localStorage.clear(); sessionStorage.clear(); } } catch(_) {}",
            );
            let _ = wv.navigate(target_url);
        }

        #[cfg(not(desktop))]
        let _ = target_url;

        Ok(())
    }

    pub async fn get_active_account_id(&self) -> Option<String> {
        self.active_account_id.lock().await.clone()
    }
}
