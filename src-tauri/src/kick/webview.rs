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
            if name == "kick_session" {
                session = Some(cookie.value().to_string());
            } else if name == "XSRF-TOKEN" {
                xsrf = Some(cookie.value().to_string());
            } else if name == "session_token" {
                let val = cookie.value().to_string();
                let decoded = urlencoding::decode(&val)
                    .unwrap_or(std::borrow::Cow::Borrowed(&val))
                    .into_owned();
                session_token = Some(decoded);
            }
        }

        match (session, xsrf) {
            (Some(s), Some(x)) => {
                if s.is_empty() || x.is_empty() {
                    Err("Cookies da Kick encontrados, mas vazios. Conclua o login na janela primeiro.".into())
                } else {
                    Ok(KickCredentials {
                        kick_session: s,
                        xsrf_token: x,
                        session_token,
                    })
                }
            }
            (None, _) => Err("Cookie 'kick_session' ainda não encontrado. Faça o login na janela aberta.".into()),
            (_, None) => Err("Cookie 'XSRF-TOKEN' ainda não encontrado. Aguarde o carregamento da página da Kick.".into()),
        }
    }
}
