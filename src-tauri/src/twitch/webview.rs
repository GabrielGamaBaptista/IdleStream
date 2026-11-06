use std::path::PathBuf;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

#[derive(Debug, Clone)]
pub struct TwitchCredentials {
    pub auth_token: String,
    pub unique_id: Option<String>,
}

pub struct TwitchWebManager;

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
}
