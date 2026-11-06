use crate::kick::auth::KickCredentials;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

pub struct KickManager;

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
        let label = format!("kick_login_{}", account_id);

        if let Some(existing) = app.get_webview_window(&label) {
            let _ = existing.show();
            let _ = existing.set_focus();
            return Ok(());
        }

        #[cfg(desktop)]
        {
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
    pub fn extract_cookies_native(
        app: &AppHandle,
        account_id: &str,
    ) -> Result<KickCredentials, String> {
        let label = format!("kick_login_{}", account_id);
        let win = app
            .get_webview_window(&label)
            .ok_or_else(|| "Janela de login não encontrada. Abra a janela de login primeiro.".to_string())?;

        let cookies = win
            .cookies()
            .map_err(|e| format!("Erro ao ler cookies nativos: {}", e))?;

        let mut session: Option<String> = None;
        let mut xsrf: Option<String> = None;
        let mut session_token: Option<String> = None;

        for cookie in cookies {
            let name = cookie.name();
            if name.eq_ignore_ascii_case("kick_session") {
                session = Some(cookie.value().to_string());
            } else if name.eq_ignore_ascii_case("XSRF-TOKEN") {
                xsrf = Some(cookie.value().to_string());
            } else if name.eq_ignore_ascii_case("session_token") {
                let val = cookie.value().to_string();
                let decoded = urlencoding::decode(&val)
                    .unwrap_or(std::borrow::Cow::Borrowed(&val))
                    .into_owned();
                session_token = Some(decoded);
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

    /// Abre a WebView da live da Kick para resgatar pontos/recompensas com a conta especificada
    pub fn open_redeem_window(
        app: &AppHandle,
        account_id: &str,
        account_label: &str,
        account_username: &str,
        channel_slug: &str,
        session_token: Option<&str>,
        kick_session: Option<&str>,
        xsrf_token: Option<&str>,
    ) -> Result<(), String> {
        let clean_id: String = account_id
            .chars()
            .filter(|c| c.is_alphanumeric() || *c == '_' || *c == '-')
            .collect();
        let label = format!("kick_redeem_{}", clean_id);
        let target_url = format!("https://kick.com/{}", channel_slug.trim());
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
            let st_json = session_token
                .filter(|s| !s.trim().is_empty())
                .map(|s| serde_json::to_string(s.trim()).unwrap_or_default())
                .unwrap_or_else(|| "null".into());
            let ks_json = kick_session
                .filter(|s| !s.trim().is_empty())
                .map(|s| serde_json::to_string(s.trim()).unwrap_or_default())
                .unwrap_or_else(|| "null".into());
            let xt_json = xsrf_token
                .filter(|s| !s.trim().is_empty())
                .map(|s| serde_json::to_string(s.trim()).unwrap_or_default())
                .unwrap_or_else(|| "null".into());

            let init_script = format!(
                r#"
                (function() {{
                    try {{
                        const st = {st_json};
                        const ks = {ks_json};
                        const xt = {xt_json};
                        if (st) document.cookie = "session_token=" + st + "; domain=.kick.com; path=/; Secure";
                        if (ks) document.cookie = "kick_session=" + ks + "; domain=.kick.com; path=/; Secure";
                        if (xt) document.cookie = "XSRF-TOKEN=" + xt + "; domain=.kick.com; path=/; Secure";
                    }} catch(e) {{}}
                }})();
                "#
            );

            let mut builder = WebviewWindowBuilder::new(app, &label, WebviewUrl::External(url_parsed))
                .title(format!(
                    "IdleStream - Resgatar Pontos: {} (@{}) em Kick/{}",
                    account_label, account_username, channel_slug
                ))
                .data_directory(profile_dir)
                .inner_size(1050.0, 720.0)
                .center()
                .visible(true);

            builder = builder.initialization_script(&init_script);

            builder
                .build()
                .map_err(|e| format!("Falha ao abrir janela de resgate Kick: {}", e))?;
        }

        #[cfg(not(desktop))]
        {
            let _ = (app, account_id, account_label, account_username, channel_slug, session_token, kick_session, xsrf_token);
        }

        Ok(())
    }
}
