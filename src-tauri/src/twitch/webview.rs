use std::path::PathBuf;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

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

    function clickChest() {
        try {
            const selectors = [
                'button[aria-label="Claim Bonus"]',
                'button[aria-label="Resgatar bônus"]',
                'button[aria-label*="bônus" i]',
                'button[aria-label*="bonus" i]',
                '.community-points-summary button',
                '[data-test-selector="community-points-claim-summary"] button',
                '[data-test-selector="community-points-claim-summary"]',
                '.claimable-bonus__icon'
            ];
            for (let i = 0; i < selectors.length; i++) {
                const el = document.querySelector(selectors[i]);
                if (el && (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0)) {
                    console.log('[IdleStream] Baú de pontos Twitch detectado! Clicando...');
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
    setInterval(clickChest, 1500);

    const observer = new MutationObserver(function() {
        clickChest();
    });
    if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
    }
})();
"#;

impl TwitchWebManager {
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
        let label = format!("twitch_login_{}", account_id);

        if let Some(existing) = app.get_webview_window(&label) {
            let _ = existing.show();
            let _ = existing.set_focus();
            return Ok(());
        }

        #[cfg(desktop)]
        {
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
    pub fn extract_cookies_native(
        app: &AppHandle,
        account_id: &str,
    ) -> Result<TwitchCredentials, String> {
        let label = format!("twitch_login_{}", account_id);
        let win = app
            .get_webview_window(&label)
            .ok_or_else(|| "Janela de login não encontrada. Abra a janela de login primeiro.".to_string())?;

        let cookies = win
            .cookies()
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
                auth_token = Some(decoded);
            } else if name.eq_ignore_ascii_case("unique_id") {
                unique_id = Some(cookie.value().to_string());
            }
        }

        match auth_token {
            Some(tok) if !tok.is_empty() => {
                let _ = win.close();
                Ok(TwitchCredentials {
                    auth_token: tok,
                    unique_id,
                })
            }
            _ => Err("Cookie 'auth-token' não encontrado ou vazio. Conclua o login na janela primeiro.".into()),
        }
    }

    /// Abre a WebView da live da Twitch para resgatar pontos do canal com a conta especificada
    pub fn open_redeem_window(
        app: &AppHandle,
        account_id: &str,
        account_label: &str,
        account_username: &str,
        channel_slug: &str,
        auth_token: Option<&str>,
    ) -> Result<(), String> {
        let clean_id: String = account_id
            .chars()
            .filter(|c| c.is_alphanumeric() || *c == '_' || *c == '-')
            .collect();
        let label = format!("twitch_redeem_{}", clean_id);
        let target_url = format!("https://www.twitch.tv/{}", channel_slug.trim());
        let url_parsed = target_url
            .parse::<url::Url>()
            .map_err(|e| format!("URL error: {}", e))?;

        if let Some(existing) = app.get_webview_window(&label) {
            let _ = existing.navigate(url_parsed);
            let _ = existing.show();
            let _ = existing.set_focus();
            return Ok(());
        }

        #[cfg(desktop)]
        {
            let profile_dir = Self::get_profile_dir(app, account_id);
            let mut init_script = String::new();
            if let Some(tok) = auth_token {
                let trimmed = tok.trim();
                if !trimmed.is_empty() {
                    let tok_json = serde_json::to_string(trimmed).unwrap_or_default();
                    init_script = format!(
                        r#"
                        (function() {{
                            try {{
                                const tok = {tok_json};
                                if (tok) {{
                                    document.cookie = "auth-token=" + tok + "; domain=.twitch.tv; path=/; SameSite=Lax; Secure";
                                    document.cookie = "auth-token=" + tok + "; domain=www.twitch.tv; path=/; SameSite=Lax; Secure";
                                }}
                            }} catch(e) {{}}
                        }})();
                        "#
                    );
                }
            }
            init_script.push_str(AUTO_CLAIM_TWITCH_SCRIPT);

            let mut builder = WebviewWindowBuilder::new(app, &label, WebviewUrl::External(url_parsed))
                .title(format!(
                    "IdleStream - Resgatar Pontos: {} (@{}) em Twitch/{}",
                    account_label, account_username, channel_slug
                ))
                .data_directory(profile_dir)
                .inner_size(1050.0, 720.0)
                .center()
                .visible(true);

            if !init_script.is_empty() {
                builder = builder.initialization_script(&init_script);
            }

            builder
                .build()
                .map_err(|e| format!("Falha ao abrir janela de resgate Twitch: {}", e))?;
        }

        #[cfg(not(desktop))]
        {
            let _ = (app, account_id, account_label, account_username, channel_slug, auth_token);
        }

        Ok(())
    }
}
