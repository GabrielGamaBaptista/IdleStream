pub mod commands;
pub mod config;
pub mod games;
pub mod kick;
pub mod live_check;
pub mod state;
pub mod twitch;

use commands::*;
use state::AppState;
use std::sync::Arc;

#[cfg(desktop)]
use tauri::menu::{Menu, MenuItem};
#[cfg(desktop)]
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
#[cfg(desktop)]
use tauri::Emitter;
use tauri::Manager;
#[cfg(desktop)]
use tauri::WindowEvent;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "windows")]
    {
        // === BANCO DE FLAGS DE HIPER-PERFORMANCE, ESTABILIDADE & ANTI-BLACKOUT (WEBVIEW2) ===
        // 1. Anti-Sleep: Garante que timers e farm continuem 24/7 sem suspensão de background
        // 2. Resiliência de GPU: Processo out-of-process com auto-recuperação sem blackout em Device Loss
        // 3. RAM Balanceada: Heap do V8 de 512MB prevenindo WebGL Context Lost com mínimo overhead
        // 4. Bloat Disabler: Desativa spare renderers, media router, autofill e tradução
        std::env::set_var(
            "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
            "--disable-background-timer-throttling \
             --disable-renderer-backgrounding \
             --disable-backgrounding-occluded-windows \
             --disable-gpu-process-crash-limit \
             --disable-features=CalculateNativeWinOcclusion,SpareRendererForSitePerProcess,TranslateUI,MediaRouter,AutofillServerCommunication \
             --enable-features=SharedArrayBuffer \
             --renderer-process-limit=6 \
             --disable-extensions \
             --disable-default-apps \
             --no-default-browser-check \
             --js-flags=\"--max-old-space-size=512 --optimize-for-size --expose-gc\""
        );
    }

    std::panic::set_hook(Box::new(|panic_info| {
        let msg = format!("[RUST PANIC] Fatal panic in Rust: {:?}", panic_info);
        eprintln!("{}", msg);
        #[cfg(target_os = "android")]
        {
            let _ = std::fs::write("/data/user/0/com.idlestream.app/files/panic.log", &msg);
        }
    }));

    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init());

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
        builder = builder.on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        });
    }

    builder
        .setup(|app| {
            let app_handle = app.handle().clone();
            let app_state = Arc::new(AppState::new(app_handle.clone()));
            app.manage(app_state.clone());

            let game_manager = Arc::new(games::manager::GameLayoutManager::new(app_handle.clone()));
            app.manage(game_manager.clone());

            // Start background vigilance loop (Auto-Live detection & standby recovery)
            app_state.start_vigilance_loop();

            #[cfg(desktop)]
            {
                // Build Tray Menu
                let quit_i = MenuItem::with_id(app, "quit", "Sair do IdleStream", true, None::<&str>)?;
                let show_i = MenuItem::with_id(app, "show", "Abrir Painel IdleStream", true, None::<&str>)?;
                let start_all_i = MenuItem::with_id(app, "start_all", "▶ Iniciar Modo Vigília (Todas)", true, None::<&str>)?;
                let stop_all_i = MenuItem::with_id(app, "stop_all", "⏹ Parar Todas as Streams", true, None::<&str>)?;

                let tray_menu = Menu::with_items(
                    app,
                    &[&show_i, &start_all_i, &stop_all_i, &quit_i],
                )?;

                let app_handle_tray = app_handle.clone();
                let state_for_tray = app_state.clone();

                if let Some(icon) = app.default_window_icon() {
                    let tray = TrayIconBuilder::new()
                        .icon(icon.clone())
                        .menu(&tray_menu)
                        .tooltip("IdleStream - Stream Presence & XP Manager")
                        .on_menu_event(move |_app, event| {
                            match event.id.as_ref() {
                                "show" => {
                                    if let Some(win) = app_handle_tray.get_webview_window("main") {
                                        let _ = win.unminimize();
                                        let _ = win.show();
                                        let _ = win.set_focus();
                                        let _ = win.emit("window-restored", ());
                                    } else if let Some(win) = app_handle_tray.get_window("main") {
                                        let _ = win.unminimize();
                                        let _ = win.show();
                                        let _ = win.set_focus();
                                        let _ = win.emit("window-restored", ());
                                    }
                                }
                                "start_all" => {
                                    let state = state_for_tray.clone();
                                    tauri::async_runtime::spawn(async move {
                                        let streams: Vec<String> = {
                                            let cfg = state.config.lock().await;
                                            cfg.streams.iter().map(|s| s.id.clone()).collect()
                                        };
                                        for sid in streams {
                                            let _ = state.start_stream(&sid).await;
                                        }
                                    });
                                }
                                "stop_all" => {
                                    let state = state_for_tray.clone();
                                    tauri::async_runtime::spawn(async move {
                                        let streams: Vec<String> = {
                                            let cfg = state.config.lock().await;
                                            cfg.streams.iter().map(|s| s.id.clone()).collect()
                                        };
                                        for sid in streams {
                                            state.stop_stream(&sid).await;
                                        }
                                    });
                                }
                                "quit" => {
                                    std::process::exit(0);
                                }
                                _ => {}
                            }
                        })
                        .on_tray_icon_event(|tray, event| {
                            let should_restore = match event {
                                TrayIconEvent::Click {
                                    button: MouseButton::Left,
                                    button_state: MouseButtonState::Up,
                                    ..
                                } => true,
                                TrayIconEvent::DoubleClick {
                                    button: MouseButton::Left,
                                    ..
                                } => true,
                                _ => false,
                            };

                            if should_restore {
                                let app = tray.app_handle();
                                if let Some(win) = app.get_webview_window("main") {
                                    let _ = win.unminimize();
                                    let _ = win.show();
                                    let _ = win.set_focus();
                                    let _ = win.emit("window-restored", ());
                                } else if let Some(win) = app.get_window("main") {
                                    let _ = win.unminimize();
                                    let _ = win.show();
                                    let _ = win.set_focus();
                                    let _ = win.emit("window-restored", ());
                                }
                            }
                        })
                        .build(app)?;

                    app.manage(tray);
                }
            }

            // Auto-start streams marked with auto_start
            let auto_start_state = app_state.clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
                let auto_ids: Vec<String> = {
                    let cfg = auto_start_state.config.lock().await;
                    eprintln!("[AutoStart] Found {} total streams, checking auto_start...", cfg.streams.len());
                    cfg.streams
                        .iter()
                        .filter(|s| s.auto_start)
                        .map(|s| s.id.clone())
                        .collect()
                };
                eprintln!("[AutoStart] Starting {} auto-start streams: {:?}", auto_ids.len(), auto_ids);
                for sid in auto_ids {
                    let res = auto_start_state.start_stream(&sid).await;
                    eprintln!("[AutoStart] Stream {} start result: {:?}", sid, res);
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            save_config,
            add_account,
            remove_account,
            add_stream,
            update_stream,
            set_selected_account,
            remove_stream,
            start_stream,
            stop_stream,
            start_all_streams,
            stop_all_streams,
            get_all_stream_statuses,
            start_twitch_oauth,
            open_twitch_login,
            save_twitch_session,
            get_twitch_account_streamers_ranking,
            open_kick_login,
            save_kick_session,
            save_twitch_token,
            save_kick_credentials_direct,
            get_app_version,
            update_game_slot,
            games::commands::game_start_slot,
            games::commands::game_stop_slot,
            games::commands::game_apply_layout,
            games::commands::game_update_slots_bounds,
            games::commands::game_reload_slot,
            games::commands::game_set_slot_zoom,
            games::commands::game_set_eco_mode,
            games::commands::game_get_eco_mode,
            games::commands::game_set_fps,
            games::commands::game_toggle_pokeidle_ultra,
            games::commands::game_hide_all,
            games::commands::game_get_active_slots,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
