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
            .initialization_script(KICK_INIT_JS)
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
            tokio::time::sleep(std::time::Duration::from_secs(4)).await;

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

const KICK_INIT_JS: &str = r#"
(function() {
    'use strict';
    try {
        // 1. Force low quality keys in storage immediately
        try {
            sessionStorage.setItem('stream_quality', '160');
            localStorage.setItem('stream_quality', '160');
            sessionStorage.setItem('stream_quality_cookie', '160');
            sessionStorage.setItem('video_quality', '160');
            localStorage.setItem('video_quality', '160');
        } catch(e) {}

        if (typeof Storage !== 'undefined' && Storage.prototype) {
            const origGetItem = Storage.prototype.getItem;
            Storage.prototype.getItem = function(key) {
                if (key === 'stream_quality' || key === 'stream_quality_cookie' || key === 'video_quality') {
                    return '160';
                }
                return origGetItem.apply(this, arguments);
            };
        }

        // 2. Intercept Amazon IVS Web Player SDK
        let ivsProtoCaptured = false;
        const hookIvsPlayer = function(player) {
            if (!player || player.__idlestream_hooked) return;
            player.__idlestream_hooked = true;
            window.__IDLESTREAM_IVS_PLAYER__ = player;

            const enforceLowest = () => {
                try {
                    if (typeof player.getQualities !== 'function') return;
                    const qs = player.getQualities();
                    if (!qs || qs.length === 0) return;

                    // Sort ascending by height (160p, 360p, 480p, 720p, 1080p)
                    const sorted = [...qs].sort((a, b) => ((a && a.height) || 9999) - ((b && b.height) || 9999));
                    const lowest = sorted[0];
                    if (!lowest) return;

                    const cur = typeof player.getQuality === 'function' ? player.getQuality() : null;
                    if (!cur || cur.height !== lowest.height) {
                        console.log('[IdleStream] Locking IVS Player to lowest quality:', lowest.name || lowest.height);
                        if (typeof player.setQuality === 'function') {
                            player.setQuality(lowest, false);
                        }
                    }
                    if (typeof player.setAutoQualityMode === 'function') {
                        player.setAutoQualityMode(false);
                    }
                } catch(err) {
                    console.error('[IdleStream] enforceLowest error:', err);
                }
            };

            // Lock setAutoQualityMode so Kick cannot switch to Auto
            const origSetAuto = player.setAutoQualityMode;
            player.setAutoQualityMode = function() {
                if (origSetAuto) return origSetAuto.call(this, false);
            };

            // Clamp setAutoMaxQuality to lowest rendition
            const origSetMax = player.setAutoMaxQuality;
            player.setAutoMaxQuality = function(q) {
                if (typeof player.getQualities === 'function') {
                    const qs = player.getQualities();
                    if (qs && qs.length > 0) {
                        const lowest = [...qs].sort((a, b) => ((a && a.height) || 9999) - ((b && b.height) || 9999))[0];
                        if (origSetMax && lowest) return origSetMax.call(this, lowest);
                    }
                }
                if (origSetMax) return origSetMax.call(this, q);
            };

            // Event listeners
            if (typeof player.addEventListener === 'function') {
                try {
                    player.addEventListener('PlayerStateChange', enforceLowest);
                    player.addEventListener('PlayerEventType.INITIALIZED', enforceLowest);
                    player.addEventListener('QualityChanged', enforceLowest);
                    player.addEventListener('Playing', enforceLowest);
                    player.addEventListener('Ready', enforceLowest);
                } catch(e) {}
            }

            // Periodic enforcement
            let count = 0;
            const t = setInterval(() => {
                count++;
                enforceLowest();
                if (count > 60) clearInterval(t);
            }, 2000);

            enforceLowest();
        };

        // Trap prototype property assignment of attachHTMLVideoElement on Amazon IVS player
        Object.defineProperty(Object.prototype, 'attachHTMLVideoElement', {
            set: function(origFn) {
                if (!ivsProtoCaptured) {
                    ivsProtoCaptured = true;
                    const proto = this;

                    // Block setAutoQualityMode on prototype
                    const protoOrigAuto = proto.setAutoQualityMode;
                    proto.setAutoQualityMode = function() {
                        if (protoOrigAuto) return protoOrigAuto.call(this, false);
                    };

                    Object.defineProperty(proto, 'attachHTMLVideoElement', {
                        value: function(videoEl) {
                            try {
                                hookIvsPlayer(this);
                            } catch(e) {}
                            return origFn.apply(this, arguments);
                        },
                        writable: true,
                        configurable: true,
                        enumerable: true
                    });
                } else {
                    Object.defineProperty(this, 'attachHTMLVideoElement', {
                        value: origFn,
                        writable: true,
                        configurable: true,
                        enumerable: true
                    });
                }
            },
            configurable: true
        });

        // 3. Audio mute on media element play
        if (typeof HTMLMediaElement !== 'undefined' && HTMLMediaElement.prototype) {
            const origPlay = HTMLMediaElement.prototype.play;
            HTMLMediaElement.prototype.play = function() {
                try {
                    this.muted = true;
                    this.volume = 0;
                    if (!this.__idlestream_muted) {
                        this.__idlestream_muted = true;
                        this.addEventListener('volumechange', () => {
                            this.muted = true;
                            this.volume = 0;
                        });
                    }
                } catch(e) {}
                return origPlay.apply(this, arguments);
            };
        }
    } catch(err) {
        console.error('[IdleStream] Init script error:', err);
    }
})();
"#;

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

        // 4. Force Lowest Video Quality
        let qualityLocked = false;

        const forceLowestQuality = () => {
            if (qualityLocked) return;

            // Attempt A: Direct IVS Player reference if available
            try {
                const player = window.__IDLESTREAM_IVS_PLAYER__;
                if (player && typeof player.getQualities === 'function') {
                    const qs = player.getQualities();
                    if (qs && qs.length > 0) {
                        const lowest = [...qs].sort((a, b) => ((a && a.height) || 9999) - ((b && b.height) || 9999))[0];
                        if (lowest) {
                            if (typeof player.setQuality === 'function') {
                                player.setQuality(lowest, false);
                            }
                            if (typeof player.setAutoQualityMode === 'function') {
                                player.setAutoQualityMode(false);
                            }
                            qualityLocked = true;
                            console.log('[IdleStream] IVS direct quality locked to:', lowest.name || lowest.height);
                            return;
                        }
                    }
                }
            } catch (e) {}

            // Attempt B: Full DOM Automation (Simulate Hover -> Click Settings -> Click Quality -> Click Lowest)
            try {
                const video = document.querySelector('video');
                if (!video) return;

                const vr = video.getBoundingClientRect();
                const vcx = Math.round(vr.left + vr.width / 2);
                const vcy = Math.round(vr.top + vr.height / 2);

                // Dispatch hover events to reveal player controls
                const hoverEvents = ['mouseenter', 'mouseover', 'mousemove'];
                hoverEvents.forEach(type => {
                    const ev = new MouseEvent(type, { bubbles: true, cancelable: true, view: window, clientX: vcx, clientY: vcy });
                    video.dispatchEvent(ev);
                    if (video.parentElement) video.parentElement.dispatchEvent(ev);
                });

                // Find settings button
                const settingsBtn = document.querySelector(
                    'button[aria-label*="Setting" i], button[aria-label*="Configura" i], button[aria-label*="Ayarlar" i], button[data-testid*="settings"], svg[data-ds-icon="Settings"]'
                ) || Array.from(document.querySelectorAll('button')).find(b => {
                    const l = (b.getAttribute('aria-label') || b.getAttribute('title') || '').toLowerCase();
                    return l.includes('setting') || l.includes('configura') || l.includes('ayarlar') || l.includes('gear');
                });

                const targetBtn = settingsBtn ? (settingsBtn.tagName === 'BUTTON' ? settingsBtn : settingsBtn.closest('button')) : null;
                if (!targetBtn) return;

                const robustClick = (el) => {
                    if (!el) return;
                    const r = el.getBoundingClientRect();
                    const cx = Math.round(r.left + r.width / 2);
                    const cy = Math.round(r.top + r.height / 2);
                    const opts = { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy, pointerId: 1, isPrimary: true, button: 0 };
                    
                    try { el.focus(); } catch (e) {}
                    el.dispatchEvent(new PointerEvent('pointerdown', opts));
                    el.dispatchEvent(new MouseEvent('mousedown', opts));
                    el.dispatchEvent(new PointerEvent('pointerup', opts));
                    el.dispatchEvent(new MouseEvent('mouseup', opts));
                    el.dispatchEvent(new MouseEvent('click', opts));
                    if (typeof el.click === 'function') {
                        try { el.click(); } catch(e) {}
                    }
                };

                robustClick(targetBtn);

                setTimeout(() => {
                    const findLowestItem = () => {
                        const items = Array.from(document.querySelectorAll(
                            '[role="menuitemradio"], [data-testid="player-quality-option"], [role="menuitem"], div[role="button"], button'
                        ));
                        // Priority: 160p, then 360p, then 480p, then 720p
                        return items.find(el => /\b160p?\b/i.test(el.textContent || ''))
                            || items.find(el => /\b360p?\b/i.test(el.textContent || ''))
                            || items.find(el => /\b480p?\b/i.test(el.textContent || ''))
                            || items.find(el => /\b720p?\b/i.test(el.textContent || ''));
                    };

                    let lowestEl = findLowestItem();
                    if (lowestEl) {
                        robustClick(lowestEl);
                        qualityLocked = true;
                        console.log('[IdleStream] Clicked lowest resolution in DOM:', lowestEl.textContent.trim());
                        setTimeout(() => robustClick(targetBtn), 200);
                    } else {
                        // If qualities are not on the main menu, look for "Qualidade" or "Quality"
                        const qualityMenuEntry = Array.from(document.querySelectorAll('[role="menuitem"], div[role="button"], button'))
                            .find(el => {
                                const txt = (el.textContent || '').trim().toLowerCase();
                                return txt.includes('qualidade') || txt.includes('quality');
                            });

                        if (qualityMenuEntry) {
                            robustClick(qualityMenuEntry);
                            setTimeout(() => {
                                const subLowest = findLowestItem();
                                if (subLowest) {
                                    robustClick(subLowest);
                                    qualityLocked = true;
                                    console.log('[IdleStream] Clicked lowest resolution in submenu:', subLowest.textContent.trim());
                                    setTimeout(() => robustClick(targetBtn), 200);
                                } else {
                                    robustClick(targetBtn);
                                }
                            }, 400);
                        } else {
                            // Close menu
                            robustClick(targetBtn);
                        }
                    }
                }, 400);
            } catch (err) {
                console.error('[IdleStream] DOM quality error:', err);
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
