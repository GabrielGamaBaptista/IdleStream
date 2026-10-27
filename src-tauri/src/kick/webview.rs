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
            builder = builder.additional_browser_args(
                "--mute-audio --disable-speech-api --enable-low-res-tiling"
            );
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
        // 1. Efficient Mute & Play (Event-driven, NO heavy body MutationObserver)
        const muteAndPlay = () => {
            document.querySelectorAll('video').forEach(v => {
                v.muted = true;
                v.volume = 0;
                if (v.paused) {
                    v.play().catch(() => {});
                }
                if (!v.__idle_bound) {
                    v.__idle_bound = true;
                    v.addEventListener('volumechange', () => {
                        v.muted = true;
                        v.volume = 0;
                    });
                    v.addEventListener('pause', () => {
                        v.play().catch(() => {});
                    });
                }
            });
        };
        muteAndPlay();
        setInterval(muteAndPlay, 4000);

        // 2. Hide heavy DOM elements & freeze CSS keyframe animations
        const css = `
            #chat-messages, .chat-messages-container, 
            [class*="chat-message"], [class*="viewer-list"],
            aside:not(:has([class*="channel-points"])),
            [class*="sidebar"], [class*="banner"], [class*="leaderboard"] {
                display: none !important;
            }
            *, *::before, *::after {
                animation-duration: 0.001ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.001ms !important;
            }
        `;
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);

        // 3. Clear chat DOM accumulation to free memory
        setInterval(() => {
            const chat = document.querySelector('#chat-messages, .chat-messages-container');
            if (chat && chat.children.length > 5) {
                while (chat.children.length > 5) {
                    chat.removeChild(chat.firstChild);
                }
            }
        }, 8000);

        // 4. Force Lowest Video Quality (160p / 360p)
        let qualityLocked = false;

        const forceLowestQuality = () => {
            if (qualityLocked) return;

            // Attempt A: Video.js qualityLevels API
            try {
                if (window.videojs && window.videojs.players) {
                    const players = Object.values(window.videojs.players);
                    for (const player of players) {
                        if (player && typeof player.qualityLevels === 'function') {
                            const ql = player.qualityLevels();
                            if (ql && ql.length > 0) {
                                let minHeight = 999999;
                                for (let i = 0; i < ql.length; i++) {
                                    if (ql[i].height && ql[i].height < minHeight) {
                                        minHeight = ql[i].height;
                                    }
                                }
                                for (let i = 0; i < ql.length; i++) {
                                    ql[i].enabled = (ql[i].height === minHeight);
                                }
                                qualityLocked = true;
                                console.log('[IdleStream] Video.js quality locked to min height:', minHeight);
                                return;
                            }
                        }
                    }
                }
            } catch (e) {}

            // Attempt B: Full DOM Interaction (Click Settings -> Quality -> Lowest)
            try {
                const video = document.querySelector('video');
                if (!video) return;

                // Reveal controls
                const container = video.closest('.video-player, #quick-play, [data-v-player], .relative') || video.parentElement;
                if (container) {
                    container.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true }));
                }

                // Find settings button
                const settingsBtn = document.querySelector(
                    'button[aria-label*="Setting" i], button[aria-label*="Configura" i], button[data-testid*="settings"], [class*="settings"] button'
                ) || Array.from(document.querySelectorAll('button')).find(b => {
                    const l = (b.getAttribute('aria-label') || '').toLowerCase();
                    return l.includes('setting') || l.includes('configura') || l.includes('gear');
                });

                if (!settingsBtn) return;

                const simClick = (el) => {
                    el.focus();
                    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
                    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                    el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
                    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
                    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                };

                simClick(settingsBtn);

                setTimeout(() => {
                    const findLowestOption = () => {
                        const items = Array.from(document.querySelectorAll('[role="menuitemradio"], [role="menuitem"], button, div[role="button"]'));
                        return items.find(el => /\b160p\b/i.test(el.textContent || ''))
                            || items.find(el => /\b360p\b/i.test(el.textContent || ''))
                            || items.find(el => /\b480p\b/i.test(el.textContent || ''));
                    };

                    let lowest = findLowestOption();
                    if (lowest) {
                        simClick(lowest);
                        qualityLocked = true;
                        console.log('[IdleStream] Clicked lowest resolution:', lowest.textContent.trim());
                        setTimeout(() => simClick(settingsBtn), 150);
                    } else {
                        // In main menu: look for "Quality" or "Qualidade" option
                        const qualityOption = Array.from(document.querySelectorAll('[role="menuitem"], button, div[role="button"]'))
                            .find(el => {
                                const txt = (el.textContent || '').trim().toLowerCase();
                                return txt.includes('qualidade') || txt.includes('quality');
                            });

                        if (qualityOption) {
                            simClick(qualityOption);
                            setTimeout(() => {
                                const subLowest = findLowestOption();
                                if (subLowest) {
                                    simClick(subLowest);
                                    qualityLocked = true;
                                    console.log('[IdleStream] Clicked lowest resolution in submenu:', subLowest.textContent.trim());
                                    setTimeout(() => simClick(settingsBtn), 150);
                                } else {
                                    simClick(settingsBtn);
                                }
                            }, 350);
                        } else {
                            simClick(settingsBtn);
                        }
                    }
                }, 300);
            } catch (err) {
                console.error('[IdleStream] Error setting quality:', err);
            }
        };

        // Try setting quality every 3s until locked, and re-check every 30s
        setInterval(forceLowestQuality, 3000);
        setInterval(() => { qualityLocked = false; forceLowestQuality(); }, 30000);
        forceLowestQuality();

        // 5. Points reader function
        window.__readPoints = function() {
            try {
                const candidate = Array.from(document.querySelectorAll('span, p, div, button'))
                    .find(el => {
                        const txt = (el.innerText || '').trim();
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
