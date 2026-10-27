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

    pub fn start_stream(
        app: &AppHandle,
        stream_id: &str,
        account_id: &str,
        channel_slug: &str,
        visible: bool,
    ) -> Result<(), String> {
        let window_label = format!(
            "kick_st_{}_{}",
            stream_id.replace('-', "_"),
            account_id.replace('-', "_")
        );

        if let Some(existing) = app.get_webview_window(&window_label) {
            if visible {
                let _ = existing.show();
                let _ = existing.set_focus();
            }
            return Ok(());
        }

        let profile_dir = Self::get_profile_dir(app, account_id);
        let clean_slug = channel_slug.trim().trim_start_matches('/');
        let url_str = format!("https://kick.com/{}", clean_slug);
        let url_parsed = url_str
            .parse()
            .map_err(|e| format!("URL parse error: {}", e))?;

        let mut builder = WebviewWindowBuilder::new(app, &window_label, WebviewUrl::External(url_parsed))
            .title(format!("IdleStream Kick: {}", clean_slug))
            .data_directory(profile_dir)
            .inner_size(540.0, 420.0)
            .visible(visible);

        #[cfg(target_os = "windows")]
        {
            builder = builder.additional_browser_args("--disable-gpu-vsync --disable-background-timer-throttling");
        }

        let window = builder
            .build()
            .map_err(|e| format!("Failed to create Kick stream window: {}", e))?;

        // Intercept close event to hide window instead of destroying, keeping the stream alive!
        let win_for_close = window.clone();
        window.on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = win_for_close.hide();
            }
        });

        // Script injection with stream_id and account_id parameters
        let win_clone = window.clone();
        let sid = stream_id.to_string();
        let aid = account_id.to_string();
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_secs(6)).await;

            let js_with_id = format!(
                "window.__IDLESTREAM_STREAM_ID__ = '{}';\nwindow.__IDLESTREAM_ACCOUNT_ID__ = '{}';\n{}",
                sid, aid, KICK_OPTIMIZE_JS
            );
            let _ = win_clone.eval(&js_with_id);

            // Periodic heartbeat to prevent browser background sleeping
            for _ in 0..120 {
                tokio::time::sleep(std::time::Duration::from_secs(20)).await;
                let _ = win_clone.eval(r#"
                    (function() {
                        const vids = document.querySelectorAll('video');
                        vids.forEach(v => {
                            if (v.paused) v.play().catch(() => {});
                            v.muted = true;
                            v.volume = 0;
                        });
                        // Try reading points
                        if (typeof window.__readPoints === 'function') {
                            window.__readPoints();
                        }
                    })();
                "#);
            }
        });

        Ok(())
    }

    pub fn open_rewards_modal(app: &AppHandle, stream_id: &str, account_id: &str) -> Result<(), String> {
        let window_label = format!(
            "kick_st_{}_{}",
            stream_id.replace('-', "_"),
            account_id.replace('-', "_")
        );
        let win = app.get_webview_window(&window_label)
            .or_else(|| {
                let prefix = format!("kick_st_{}_", stream_id.replace('-', "_"));
                app.webview_windows().into_iter().find(|(k, _)| k.starts_with(&prefix)).map(|(_, w)| w)
            })
            .or_else(|| {
                let legacy_label = format!("kick_st_{}", stream_id.replace('-', "_"));
                app.get_webview_window(&legacy_label)
            });

        if let Some(win) = win {
            let _ = win.set_size(tauri::Size::Logical(tauri::LogicalSize {
                width: 820.0,
                height: 650.0,
            }));
            let _ = win.center();
            let _ = win.show();
            let _ = win.set_focus();

            // Trigger click on points icon to open the rewards modal
            let _ = win.eval(r#"
                (function() {
                    setTimeout(() => {
                        const btn = document.querySelector('button[aria-label*="Pontos" i], button[aria-label*="Points" i], [class*="channel-points"] button');
                        if (btn) {
                            btn.click();
                        }
                    }, 300);
                })();
            "#);

            Ok(())
        } else {
            Err("Stream da Kick não está ativa no momento. Ative-a primeiro.".into())
        }
    }

    pub fn set_stream_visibility(app: &AppHandle, stream_id: &str, account_id: &str, visible: bool) -> Result<(), String> {
        let window_label = format!(
            "kick_st_{}_{}",
            stream_id.replace('-', "_"),
            account_id.replace('-', "_")
        );
        let win = app.get_webview_window(&window_label)
            .or_else(|| {
                let prefix = format!("kick_st_{}_", stream_id.replace('-', "_"));
                app.webview_windows().into_iter().find(|(k, _)| k.starts_with(&prefix)).map(|(_, w)| w)
            })
            .or_else(|| {
                let legacy_label = format!("kick_st_{}", stream_id.replace('-', "_"));
                app.get_webview_window(&legacy_label)
            });

        if let Some(win) = win {
            if visible {
                let _ = win.show();
                let _ = win.set_focus();
            } else {
                let _ = win.hide();
            }
            Ok(())
        } else {
            Err("Stream window not found".into())
        }
    }

    pub fn stop_stream(app: &AppHandle, stream_id: &str) {
        let prefix = format!("kick_st_{}_", stream_id.replace('-', "_"));
        let legacy_label = format!("kick_st_{}", stream_id.replace('-', "_"));
        for (label, win) in app.webview_windows() {
            if label.starts_with(&prefix) || label == legacy_label {
                let _ = win.destroy();
            }
        }
    }

    pub fn stop_stream_account(app: &AppHandle, stream_id: &str, account_id: &str) {
        let window_label = format!(
            "kick_st_{}_{}",
            stream_id.replace('-', "_"),
            account_id.replace('-', "_")
        );
        if let Some(win) = app.get_webview_window(&window_label) {
            let _ = win.destroy();
        }
    }
}

const KICK_OPTIMIZE_JS: &str = r#"
(function() {
    try {
        // 1. Mute all existing video elements and keep playing
        const muteAll = () => {
            document.querySelectorAll('video').forEach(v => {
                v.muted = true;
                v.volume = 0;
                if (v.paused) {
                    v.play().catch(() => {});
                }
            });
        };
        muteAll();

        const observer = new MutationObserver(() => muteAll());
        observer.observe(document.body, { childList: true, subtree: true });

        // 2. Hide heavy chat message list and side navigation, BUT KEEP Channel Points footer and modal!
        const css = `
            #chat-messages, .chat-messages-container, 
            [class*="chat-message"], [class*="viewer-list"],
            aside:not(:has([class*="channel-points"])) {
                display: none !important;
            }
        `;
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);

        // 3. Lowest quality selection
        setTimeout(() => {
            const settingsBtn = document.querySelector('button[aria-label="Settings"], button[aria-label="Configurações"]');
            if (settingsBtn) {
                settingsBtn.click();
                setTimeout(() => {
                    const qualityBtns = Array.from(document.querySelectorAll('button, div[role="menuitem"]'))
                        .filter(el => /160p|360p|480p/i.test(el.textContent || ''));
                    if (qualityBtns.length > 0) {
                        qualityBtns[0].click();
                    } else {
                        settingsBtn.click();
                    }
                }, 400);
            }
        }, 3000);

        // 4. Points reader function
        window.__readPoints = function() {
            try {
                // Find element showing balance (green pill / points count)
                const candidate = Array.from(document.querySelectorAll('span, p, div, button'))
                    .find(el => {
                        const txt = (el.innerText || '').trim();
                        // Matches patterns like "1,6 mil", "1.6k", "300", etc. located near points
                        return /^[0-9]+([.,][0-9]+)?(\s*(mil|k))?$/i.test(txt) && 
                               (el.closest('[class*="points"]') || el.parentElement.querySelector('svg, img'));
                    });

                if (candidate && window.__TAURI_INTERNALS__) {
                    const pointsStr = candidate.innerText.trim();
                    window.__TAURI_INTERNALS__.invoke('report_kick_points', {
                        streamId: window.__IDLESTREAM_STREAM_ID__,
                        accountId: window.__IDLESTREAM_ACCOUNT_ID__ || '',
                        points: pointsStr
                    }).catch(() => {});
                }
            } catch(err) {
                console.error('Points read error:', err);
            }
        };

        setInterval(window.__readPoints, 12000);
        window.__readPoints();
    } catch(e) {
        console.error('IdleStream Kick optimization error:', e);
    }
})();
"#;
