#[cfg(desktop)]
use crate::accounts::session_sync::{
    plan_twitch_cookie_seeding, read_profile_sync_hash, write_profile_sync_hash, SeedingPlan,
    StoredCookieSnapshot,
};
#[cfg(desktop)]
use crate::state::AppState;
#[cfg(desktop)]
use std::path::Path;
use std::path::PathBuf;
#[cfg(desktop)]
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
#[cfg(desktop)]
use std::sync::Arc;
#[cfg(desktop)]
use tauri::webview::PageLoadEvent;
#[cfg(desktop)]
use tauri::{WebviewUrl, WebviewWindowBuilder, WindowEvent};
use tauri::{AppHandle, Manager};

#[cfg(desktop)]
static ACTIVE_HEADLESS_CLAIMS: AtomicUsize = AtomicUsize::new(0);
#[cfg(desktop)]
const MAX_CONCURRENT_HEADLESS_CLAIMS: usize = 1;

#[derive(Debug, Clone)]
pub struct TwitchCredentials {
    pub auth_token: String,
    pub unique_id: Option<String>,
}

pub struct TwitchWebManager;

const AUTO_CLAIM_TWITCH_SCRIPT: &str = r#"
(function() {
    if (window._idlestreamClaimerInjected) return;
    window._idlestreamClaimerInjected = true;

    let lastClaimTime = 0;
    let debounceTimer = null;

    function clickChest() {
        try {
            // Se a gaveta/menu de resgates estiver aberto pelo usuário, não clica para não fechar a interface
            if (document.querySelector('[data-test-selector="community-points-rewards"], .rewards-list, [data-test-selector="reward-list-item"]')) {
                return false;
            }

            const now = Date.now();
            if (now - lastClaimTime < 3000) return false;

            const selectors = [
                'button[aria-label="Claim Bonus"]',
                'button[aria-label="Resgatar bônus"]',
                'button[aria-label*="Claim Bonus" i]',
                'button[aria-label*="Resgatar bônus" i]',
                '[data-test-selector="community-points-claim-summary"] button',
                '[data-test-selector="community-points-claim-summary"]',
                '.claimable-bonus__icon'
            ];
            for (let i = 0; i < selectors.length; i++) {
                const el = document.querySelector(selectors[i]);
                if (el && (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0)) {
                    console.log('[IdleStream] Baú de bônus Twitch detectado! Clicando...');
                    lastClaimTime = Date.now();
                    el.click();
                    return true;
                }
            }
        } catch(e) {
            console.error('[IdleStream] Erro no auto-claim:', e);
        }
        return false;
    }

    clickChest();
    setInterval(clickChest, 2000);

    const observer = new MutationObserver(function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(clickChest, 400);
    });
    if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
    }
})();
"#;

#[cfg(desktop)]
fn to_twitch_snapshots(cookies: &[tauri::webview::Cookie<'static>]) -> Vec<StoredCookieSnapshot> {
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
async fn read_twitch_snapshots(
    win: &tauri::WebviewWindow,
) -> Result<Vec<StoredCookieSnapshot>, String> {
    let win_clone = win.clone();
    let twitch_url = "https://www.twitch.tv"
        .parse::<url::Url>()
        .map_err(|e| format!("URL error: {}", e))?;
    let cookies = tokio::task::spawn_blocking(move || win_clone.cookies_for_url(twitch_url))
        .await
        .map_err(|e| format!("Task join error: {}", e))?
        .map_err(|e| format!("Erro ao ler cookies da Twitch: {}", e))?;
    Ok(to_twitch_snapshots(&cookies))
}

#[cfg(desktop)]
fn apply_twitch_seeding_plan(
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

impl TwitchWebManager {
    pub fn build_redeem_init_script() -> String {
        AUTO_CLAIM_TWITCH_SCRIPT.to_string()
    }

    pub fn get_profile_dir(app: &AppHandle, account_id: &str) -> PathBuf {
        let base = app
            .path()
            .app_local_data_dir()
            .unwrap_or_else(|_| PathBuf::from("./data"));
        base.join("twitch_profiles").join(account_id)
    }

    pub fn open_login_window(
        app: &AppHandle,
        account_id: &str,
        account_label: &str,
    ) -> Result<(), String> {
        #[cfg(desktop)]
        {
            let label = format!("twitch_login_{}", account_id);

            if let Some(existing) = app.get_webview_window(&label) {
                let _ = existing.unminimize();
                let _ = existing.show();
                let _ = existing.set_focus();
                return Ok(());
            }

            let profile_dir = Self::get_profile_dir(app, account_id);
            let url_parsed = "https://www.twitch.tv/login"
                .parse()
                .map_err(|e| format!("URL error: {}", e))?;

            let builder = WebviewWindowBuilder::new(app, &label, WebviewUrl::External(url_parsed))
                .title(format!("IdleStream - Login Twitch ({})", account_label))
                .data_directory(profile_dir)
                .inner_size(900.0, 700.0)
                .center()
                .visible(true);

            builder
                .build()
                .map_err(|e| format!("Failed to create Twitch login window: {}", e))?;
        }

        #[cfg(not(desktop))]
        {
            let _ = (app, account_id, account_label);
        }

        Ok(())
    }

    /// Extrai os cookies da janela de login usando a API nativa de cookies do Tauri v2
    pub async fn extract_cookies_native(
        app: &AppHandle,
        account_id: &str,
    ) -> Result<TwitchCredentials, String> {
        let label = format!("twitch_login_{}", account_id);
        let win = app
            .get_webview_window(&label)
            .ok_or_else(|| "Janela de login não encontrada. Abra a janela de login primeiro.".to_string())?;

        let cookies = tokio::task::spawn_blocking(move || win.cookies())
            .await
            .map_err(|e| format!("Task join error ao ler cookies: {}", e))?
            .map_err(|e| format!("Erro ao ler cookies nativos: {}", e))?;

        let mut auth_token: Option<String> = None;
        let mut unique_id: Option<String> = None;

        for cookie in cookies {
            let name = cookie.name();
            if name.eq_ignore_ascii_case("auth-token") {
                let val = cookie.value().to_string();
                let decoded = urlencoding::decode(&val)
                    .unwrap_or(std::borrow::Cow::Borrowed(&val))
                    .into_owned();
                if !decoded.trim().is_empty() {
                    auth_token = Some(decoded);
                }
            } else if name.eq_ignore_ascii_case("unique_id") {
                unique_id = Some(cookie.value().to_string());
            }
        }

        match auth_token {
            Some(tok) if !tok.is_empty() => Ok(TwitchCredentials {
                auth_token: tok,
                unique_id,
            }),
            _ => Err("Cookie 'auth-token' não encontrado ou vazio. Conclua o login na janela primeiro.".into()),
        }
    }

    /// Abre a WebView da live da Twitch para resgatar pontos do canal com a conta especificada.
    /// Usa Cookies Nativos persistentes (Profile-First) sem injetar document.cookie no init script.
    pub async fn open_redeem_window(
        app: &AppHandle,
        account_id: &str,
        account_label: &str,
        account_username: &str,
        channel_slug: &str,
        auth_token: Option<&str>,
    ) -> Result<(), String> {
        let clean_slug = channel_slug.trim().trim_start_matches('#').to_lowercase();
        let clean_id: String = account_id
            .chars()
            .filter(|c| c.is_alphanumeric() || *c == '_' || *c == '-')
            .collect();
        let label = format!("twitch_redeem_{}", clean_id);
        let target_url = format!("https://www.twitch.tv/popout/{}/chat?popout=", clean_slug);
        let url_parsed = target_url
            .parse::<url::Url>()
            .map_err(|e| format!("URL error: {}", e))?;

        #[cfg(desktop)]
        {
            let profile_dir = Self::get_profile_dir(app, account_id);

            if let Some(existing) = app.get_webview_window(&label) {
                if let Ok(snaps) = read_twitch_snapshots(&existing).await {
                    if let Some(state) = app.try_state::<Arc<AppState>>() {
                        state
                            .sync_twitch_auth_from_webview(account_id, &profile_dir, &snaps)
                            .await;
                    }
                    let saved_hash = read_profile_sync_hash(&profile_dir);
                    let latest_token = if let Some(state) = app.try_state::<Arc<AppState>>() {
                        let cfg = state.config.lock().await;
                        cfg.accounts
                            .iter()
                            .find(|a| a.id == account_id)
                            .and_then(|a| a.oauth_token.clone())
                    } else {
                        None
                    };
                    let plan = plan_twitch_cookie_seeding(
                        &snaps,
                        latest_token.as_deref().or(auth_token),
                        saved_hash.as_deref(),
                    );
                    if apply_twitch_seeding_plan(&existing, &profile_dir, &plan) {
                        tokio::time::sleep(std::time::Duration::from_millis(40)).await;
                    }
                }
                let _ = existing.set_title(&format!(
                    "IdleStream - Chat & Pontos: {} (@{}) em Twitch/{}",
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
                    "IdleStream - Chat & Pontos: {} (@{}) em Twitch/{}",
                    account_label, account_username, clean_slug
                ))
                .data_directory(profile_dir.clone())
                .inner_size(520.0, 720.0)
                .center()
                .visible(false)
                .initialization_script(&Self::build_redeem_init_script())
                .on_page_load(move |webview_win, payload| {
                    if payload.event() != PageLoadEvent::Finished {
                        return;
                    }
                    if payload.url().as_str().starts_with("about:") {
                        return;
                    }
                    let app_cb = app_load.clone();
                    let acc_cb = acc_id_load.clone();
                    let dir_cb = profile_load.clone();
                    let win_cb = webview_win.clone();
                    tauri::async_runtime::spawn(async move {
                        if let Ok(snaps) = read_twitch_snapshots(&win_cb).await {
                            if let Some(state) = app_cb.try_state::<Arc<AppState>>() {
                                state
                                    .sync_twitch_auth_from_webview(&acc_cb, &dir_cb, &snaps)
                                    .await;
                            }
                        }
                    });
                });

            let win = builder
                .build()
                .map_err(|e| format!("Falha ao abrir janela de resgate Twitch: {}", e))?;

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
                                read_twitch_snapshots(&win_done),
                            )
                            .await
                            {
                                if let Some(state) = app_done.try_state::<Arc<AppState>>() {
                                    state
                                        .sync_twitch_auth_from_webview(&acc_done, &dir_done, &snaps)
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

            let existing_snaps = read_twitch_snapshots(&win).await.unwrap_or_default();
            let saved_hash = read_profile_sync_hash(&profile_dir);
            let plan = plan_twitch_cookie_seeding(
                &existing_snaps,
                auth_token,
                saved_hash.as_deref(),
            );
            if apply_twitch_seeding_plan(&win, &profile_dir, &plan) {
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
                auth_token,
                url_parsed,
                label,
            );
        }

        Ok(())
    }

    /// Dispara uma janela WebView oculta em segundo plano para auto-resgatar o baú de +50 pontos
    /// com validação genuína de JavaScript e Kasada anti-bot, preservando cookies persistentes.
    pub fn trigger_background_chest_claim(
        app: &AppHandle,
        account_id: &str,
        channel_slug: &str,
        auth_token: Option<&str>,
    ) {
        #[cfg(desktop)]
        {
            let clean_slug = channel_slug.trim().trim_start_matches('#').to_lowercase();
            let clean_id: String = account_id
                .chars()
                .filter(|c| c.is_alphanumeric() || *c == '_' || *c == '-')
                .collect();
            let label = format!("twitch_claim_{}_{}", clean_id, clean_slug);

            // Se já existe janela ativa de resgate visível para esta conta, deixa ela cuidar do claim
            let redeem_label = format!("twitch_redeem_{}", clean_id);
            if app.get_webview_window(&redeem_label).is_some() {
                return;
            }

            // Se já existe um claim headless rodando para essa conta/stream, não cria outro simultâneo
            if app.get_webview_window(&label).is_some() {
                return;
            }

            // Limite global de janelas headless de claim ativas simultaneamente
            if ACTIVE_HEADLESS_CLAIMS.load(Ordering::Relaxed) >= MAX_CONCURRENT_HEADLESS_CLAIMS {
                return;
            }

            let target_url = format!("https://www.twitch.tv/popout/{}/chat?popout=", clean_slug);
            let Ok(url_parsed) = target_url.parse::<url::Url>() else {
                return;
            };
            let Ok(blank_url) = "about:blank".parse::<url::Url>() else {
                return;
            };

            let app_owned = app.clone();
            let acc_id_owned = account_id.to_string();
            let tok_owned = auth_token.map(|t| t.to_string());
            let profile_dir = Self::get_profile_dir(app, account_id);

            ACTIVE_HEADLESS_CLAIMS.fetch_add(1, Ordering::Relaxed);
            tauri::async_runtime::spawn(async move {
                let builder =
                    WebviewWindowBuilder::new(&app_owned, &label, WebviewUrl::External(blank_url))
                        .title(format!("IdleStream Claim Headless - {}", clean_slug))
                        .data_directory(profile_dir.clone())
                        .inner_size(800.0, 600.0)
                        .visible(false)
                        .initialization_script(&Self::build_redeem_init_script());

                if let Ok(win) = builder.build() {
                    let existing_snaps = read_twitch_snapshots(&win).await.unwrap_or_default();
                    let saved_hash = read_profile_sync_hash(&profile_dir);
                    let plan = plan_twitch_cookie_seeding(
                        &existing_snaps,
                        tok_owned.as_deref(),
                        saved_hash.as_deref(),
                    );
                    if apply_twitch_seeding_plan(&win, &profile_dir, &plan) {
                        tokio::time::sleep(tokio::time::Duration::from_millis(40)).await;
                    }
                    let _ = win.navigate(url_parsed);
                    println!(
                        "[Twitch] Disparado auto-claim headless para conta {} em {}",
                        acc_id_owned, clean_slug
                    );
                    // Mantém a janela oculta ativa por 25 segundos para completar Kasada e clique do baú
                    tokio::time::sleep(tokio::time::Duration::from_secs(25)).await;
                    let _ = win.close();
                }
                ACTIVE_HEADLESS_CLAIMS.fetch_sub(1, Ordering::Relaxed);
            });
        }

        #[cfg(not(desktop))]
        {
            let _ = (app, account_id, channel_slug, auth_token);
        }
    }
}
