use crate::accounts::session_sync::decode_kick_session_token_for_bearer;
#[cfg(desktop)]
use crate::accounts::session_sync::{
    plan_kick_cookie_seeding, read_profile_sync_hash, write_profile_sync_hash, SeedingPlan,
    StoredCookieSnapshot,
};
use crate::kick::auth::KickCredentials;
#[cfg(desktop)]
use crate::state::AppState;
#[cfg(desktop)]
use std::path::Path;
use std::path::PathBuf;
#[cfg(desktop)]
use std::sync::atomic::{AtomicBool, Ordering};
#[cfg(desktop)]
use std::sync::Arc;
#[cfg(desktop)]
use tauri::webview::PageLoadEvent;
#[cfg(desktop)]
use tauri::{WebviewUrl, WebviewWindowBuilder, WindowEvent};
use tauri::{AppHandle, Manager};

pub struct KickManager;

#[cfg(desktop)]
fn to_cookie_snapshots(cookies: &[tauri::webview::Cookie<'static>]) -> Vec<StoredCookieSnapshot> {
    cookies
        .iter()
        .map(|c| StoredCookieSnapshot {
            name: c.name().to_string(),
            value: c.value().to_string(),
            domain: c.domain().map(|s| s.to_string()),
            path: c.path().map(|s| s.to_string()),
            http_only: c.http_only(),
            is_session: matches!(
                c.expires(),
                Some(tauri::webview::cookie::Expiration::Session) | None
            ),
        })
        .collect()
}

#[cfg(desktop)]
async fn read_kick_snapshots(win: &tauri::WebviewWindow) -> Result<Vec<StoredCookieSnapshot>, String> {
    let win_clone = win.clone();
    let kick_url = "https://kick.com"
        .parse::<url::Url>()
        .map_err(|e| format!("URL error: {}", e))?;
    let cookies = tokio::task::spawn_blocking(move || win_clone.cookies_for_url(kick_url))
        .await
        .map_err(|e| format!("Task join error: {}", e))?
        .map_err(|e| format!("Erro ao ler cookies da Kick: {}", e))?;
    Ok(to_cookie_snapshots(&cookies))
}

#[cfg(desktop)]
fn apply_seeding_plan(
    win: &tauri::WebviewWindow,
    profile_dir: &Path,
    plan: &SeedingPlan,
) -> bool {
    let mut changed = false;

    for snap in &plan.cookies_to_delete {
        let mut cb =
            tauri::webview::cookie::Cookie::build((snap.name.clone(), snap.value.clone()));
        if let Some(ref dom) = snap.domain {
            cb = cb.domain(dom.clone());
        }
        if let Some(ref p) = snap.path {
            cb = cb.path(p.clone());
        }
        let _ = win.delete_cookie(cb.build());
        changed = true;
    }

    for dc in &plan.cookies_to_set {
        let mut cb = tauri::webview::cookie::Cookie::build((dc.name.clone(), dc.value.clone()))
            .domain(dc.domain.clone())
            .path(dc.path.clone())
            .http_only(dc.http_only)
            .secure(dc.secure)
            .max_age(tauri::webview::cookie::time::Duration::seconds(
                dc.max_age_secs,
            ));
        if dc.same_site_lax {
            cb = cb.same_site(tauri::webview::cookie::SameSite::Lax);
        }
        if win.set_cookie(cb.build()).is_ok() {
            changed = true;
        }
    }

    if let Some(ref hash) = plan.target_hash {
        write_profile_sync_hash(profile_dir, hash);
    }

    changed
}

impl KickManager {
    pub fn get_profile_dir(app: &AppHandle, account_id: &str) -> PathBuf {
        let base = app
            .path()
            .app_local_data_dir()
            .unwrap_or_else(|_| PathBuf::from("./data"));
        base.join("kick_profiles").join(account_id)
    }

    pub fn open_login_window(
        app: &AppHandle,
        account_id: &str,
        account_label: &str,
    ) -> Result<(), String> {
        #[cfg(desktop)]
        {
            let label = format!("kick_login_{}", account_id);

            if let Some(existing) = app.get_webview_window(&label) {
                let _ = existing.unminimize();
                let _ = existing.show();
                let _ = existing.set_focus();
                return Ok(());
            }

            let profile_dir = Self::get_profile_dir(app, account_id);
            let url_parsed = "https://kick.com/login"
                .parse()
                .map_err(|e| format!("URL error: {}", e))?;

            let builder = WebviewWindowBuilder::new(app, &label, WebviewUrl::External(url_parsed))
                .title(format!("IdleStream - Login Kick ({})", account_label))
                .data_directory(profile_dir)
                .inner_size(900.0, 700.0)
                .center()
                .visible(true);

            builder
                .build()
                .map_err(|e| format!("Failed to create Kick login window: {}", e))?;
        }

        #[cfg(not(desktop))]
        {
            let _ = (app, account_id, account_label);
        }

        Ok(())
    }

    /// Extrai os cookies HttpOnly e normais da janela de login usando a API nativa de cookies do Tauri v2
    pub async fn extract_cookies_native(
        app: &AppHandle,
        account_id: &str,
    ) -> Result<KickCredentials, String> {
        let label = format!("kick_login_{}", account_id);
        let win = app
            .get_webview_window(&label)
            .ok_or_else(|| "Janela de login não encontrada. Abra a janela de login primeiro.".to_string())?;

        let cookies = tokio::task::spawn_blocking(move || win.cookies())
            .await
            .map_err(|e| format!("Task join error ao ler cookies: {}", e))?
            .map_err(|e| format!("Erro ao ler cookies nativos: {}", e))?;

        let mut session: Option<String> = None;
        let mut xsrf: Option<String> = None;
        let mut session_token: Option<String> = None;

        for cookie in cookies {
            let name = cookie.name();
            if name.eq_ignore_ascii_case("kick_session") {
                if !cookie.value().trim().is_empty() {
                    session = Some(cookie.value().to_string());
                }
            } else if name.eq_ignore_ascii_case("XSRF-TOKEN") {
                if !cookie.value().trim().is_empty() {
                    xsrf = Some(cookie.value().to_string());
                }
            } else if name.eq_ignore_ascii_case("session_token") {
                let decoded = decode_kick_session_token_for_bearer(cookie.value());
                if !decoded.is_empty() {
                    session_token = Some(decoded);
                }
            }
        }

        // O cookie essencial para farmar e monitorar lives autenticado na Kick é o `session_token`.
        // A Kick moderna não requer nem emite o cookie 'XSRF-TOKEN'.
        match (session, session_token) {
            (Some(s), Some(st)) => {
                if s.is_empty() || st.is_empty() {
                    Err("Cookies da Kick encontrados, mas vazios. Conclua o login na janela primeiro.".into())
                } else {
                    Ok(KickCredentials {
                        kick_session: s,
                        xsrf_token: xsrf,
                        session_token: Some(st),
                    })
                }
            }
            (None, _) => Err("Sessão da Kick ('kick_session') ainda não encontrada. Faça o login na janela aberta.".into()),
            (_, None) => Err("Login da Kick ainda não concluído. Conclua o login com seu usuário e senha na janela aberta e aguarde a página carregar.".into()),
        }
    }

    /// Abre a WebView da live da Kick para resgatar pontos/recompensas com a conta especificada,
    /// usando Cookies Nativos persistentes (Profile-First) sem sobrescrita via document.cookie.
    pub async fn open_redeem_window(
        app: &AppHandle,
        account_id: &str,
        account_label: &str,
        account_username: &str,
        channel_slug: &str,
        session_token: Option<&str>,
        kick_session: Option<&str>,
        xsrf_token: Option<&str>,
    ) -> Result<(), String> {
        let clean_slug = channel_slug.trim().trim_start_matches('/').to_string();
        let clean_id: String = account_id
            .chars()
            .filter(|c| c.is_alphanumeric() || *c == '_' || *c == '-')
            .collect();
        let label = format!("kick_redeem_{}", clean_id);
        let target_url = format!("https://kick.com/{}", clean_slug);
        let url_parsed = target_url
            .parse::<url::Url>()
            .map_err(|e| format!("URL error: {}", e))?;

        #[cfg(desktop)]
        {
            let profile_dir = Self::get_profile_dir(app, account_id);

            if let Some(existing) = app.get_webview_window(&label) {
                if let Ok(snaps) = read_kick_snapshots(&existing).await {
                    if let Some(state) = app.try_state::<Arc<AppState>>() {
                        state
                            .sync_kick_cookies_from_webview(account_id, &profile_dir, &snaps)
                            .await;
                    }
                    let saved_hash = read_profile_sync_hash(&profile_dir);
                    let latest_creds = if let Some(state) = app.try_state::<Arc<AppState>>() {
                        let cfg = state.config.lock().await;
                        cfg.accounts.iter().find(|a| a.id == account_id).cloned()
                    } else {
                        None
                    };
                    let plan = plan_kick_cookie_seeding(
                        &snaps,
                        latest_creds
                            .as_ref()
                            .and_then(|a| a.kick_session.as_deref())
                            .or(kick_session),
                        latest_creds
                            .as_ref()
                            .and_then(|a| a.session_token.as_deref())
                            .or(session_token),
                        latest_creds
                            .as_ref()
                            .and_then(|a| a.xsrf_token.as_deref())
                            .or(xsrf_token),
                        saved_hash.as_deref(),
                    );
                    if apply_seeding_plan(&existing, &profile_dir, &plan) {
                        tokio::time::sleep(std::time::Duration::from_millis(40)).await;
                    }
                }
                let _ = existing.set_title(&format!(
                    "IdleStream - Resgatar Pontos: {} (@{}) em Kick/{}",
                    account_label, account_username, clean_slug
                ));
                let _ = existing.navigate(url_parsed);
                let _ = existing.unminimize();
                let _ = existing.show();
                let _ = existing.set_focus();
                return Ok(());
            }

            let blank_url = "about:blank"
                .parse::<url::Url>()
                .map_err(|e| format!("URL error: {}", e))?;

            let allow_close = Arc::new(AtomicBool::new(false));
            let closing_started = Arc::new(AtomicBool::new(false));
            let acc_id_load = account_id.to_string();
            let app_load = app.clone();
            let profile_load = profile_dir.clone();

            let builder = WebviewWindowBuilder::new(app, &label, WebviewUrl::External(blank_url))
                .title(format!(
                    "IdleStream - Resgatar Pontos: {} (@{}) em Kick/{}",
                    account_label, account_username, clean_slug
                ))
                .data_directory(profile_dir.clone())
                .inner_size(1050.0, 720.0)
                .center()
                .visible(false)
                .on_page_load(move |webview_win, payload| {
                    if payload.event() != PageLoadEvent::Finished {
                        return;
                    }
                    let url_str = payload.url().as_str();
                    if url_str.starts_with("about:") {
                        return;
                    }
                    let app_cb = app_load.clone();
                    let acc_cb = acc_id_load.clone();
                    let dir_cb = profile_load.clone();
                    let win_cb = webview_win.clone();
                    tauri::async_runtime::spawn(async move {
                        if let Ok(snaps) = read_kick_snapshots(&win_cb).await {
                            if let Some(state) = app_cb.try_state::<Arc<AppState>>() {
                                state
                                    .sync_kick_cookies_from_webview(&acc_cb, &dir_cb, &snaps)
                                    .await;
                            }
                        }
                    });
                });

            let win = builder
                .build()
                .map_err(|e| format!("Falha ao abrir janela de resgate Kick: {}", e))?;

            // Intercepta CloseRequested uma única vez para sincronizar cookies rotacionados e persistir disco
            let allow_close_ev = Arc::clone(&allow_close);
            let closing_ev = Arc::clone(&closing_started);
            let app_close = app.clone();
            let acc_close = account_id.to_string();
            let dir_close = profile_dir.clone();
            let win_ev = win.clone();
            win.on_window_event(move |event| {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    if allow_close_ev.load(Ordering::SeqCst) {
                        return;
                    }
                    api.prevent_close();
                    if closing_ev
                        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
                        .is_ok()
                    {
                        let allow_done = Arc::clone(&allow_close_ev);
                        let win_done = win_ev.clone();
                        let app_done = app_close.clone();
                        let acc_done = acc_close.clone();
                        let dir_done = dir_close.clone();
                        tauri::async_runtime::spawn(async move {
                            if let Ok(Ok(snaps)) = tokio::time::timeout(
                                std::time::Duration::from_millis(1500),
                                read_kick_snapshots(&win_done),
                            )
                            .await
                            {
                                if let Some(state) = app_done.try_state::<Arc<AppState>>() {
                                    state
                                        .sync_kick_cookies_from_webview(&acc_done, &dir_done, &snaps)
                                        .await;
                                }
                            }
                            tokio::time::sleep(std::time::Duration::from_millis(150)).await;
                            allow_done.store(true, Ordering::SeqCst);
                            let _ = win_done.close();
                        });
                    }
                }
            });

            // Aplica estratégia Profile-First ANTES de navegar para kick.com
            let existing_snaps = read_kick_snapshots(&win).await.unwrap_or_default();
            let saved_hash = read_profile_sync_hash(&profile_dir);
            let plan = plan_kick_cookie_seeding(
                &existing_snaps,
                kick_session,
                session_token,
                xsrf_token,
                saved_hash.as_deref(),
            );
            if apply_seeding_plan(&win, &profile_dir, &plan) {
                tokio::time::sleep(std::time::Duration::from_millis(40)).await;
            }

            let _ = win.navigate(url_parsed);
            let _ = win.unminimize();
            let _ = win.show();
            let _ = win.set_focus();
        }

        #[cfg(not(desktop))]
        {
            let _ = (
                app,
                account_id,
                account_label,
                account_username,
                channel_slug,
                session_token,
                kick_session,
                xsrf_token,
                url_parsed,
                label,
            );
        }

        Ok(())
    }
}
