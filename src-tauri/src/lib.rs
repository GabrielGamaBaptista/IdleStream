pub mod commands;
pub mod config;
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
use tauri::Manager;
#[cfg(desktop)]
use tauri::WindowEvent;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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
                                        let _ = win.show();
                                        let _ = win.set_focus();
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
                            if let TrayIconEvent::Click {
                                button: MouseButton::Left,
                                button_state: MouseButtonState::Up,
                                ..
                            } = event
                            {
                                let app = tray.app_handle();
                                if let Some(win) = app.get_webview_window("main") {
                                    let _ = win.show();
                                    let _ = win.set_focus();
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
            open_kick_login,
            save_kick_session,
            save_twitch_token,
            save_kick_credentials_direct,
            get_app_version,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
