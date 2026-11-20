pub mod accounts;
pub mod alerts;
pub mod commands;
pub mod config;
pub mod games;
pub mod kick;
pub mod live_check;
pub mod logger;
pub mod overlay;
pub mod safety;
pub mod session_export;
pub mod state;
pub mod twitch;
pub mod votes;

use commands::*;
use state::AppState;
use std::path::PathBuf;
use std::sync::{Arc, OnceLock};

static PANIC_LOG_PATH: OnceLock<PathBuf> = OnceLock::new();

#[cfg(desktop)]
use tauri::menu::{Menu, MenuItem};
#[cfg(desktop)]
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
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
             --disable-gpu-watchdog \
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
            if let Some(p) = PANIC_LOG_PATH.get() {
                let _ = std::fs::write(p, &msg);
            } else {
                let _ = std::fs::write("/data/user/0/com.idlestream.app/files/panic.log", &msg);
            }
        }
    }));

    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init());

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
        builder = builder.on_window_event(|window, event| {
            match event {
                WindowEvent::CloseRequested { api, .. } => {
                    if window.label() == "main" {
                        let app = window.app_handle().clone();
                        let should_minimize = if let Some(state) = app.try_state::<Arc<AppState>>() {
                            state.config.blocking_lock().settings.minimize_to_tray
                        } else {
                            true
                        };

                        if should_minimize {
                            api.prevent_close();
                            let _ = window.hide();
                            if let Some(gm) = app.try_state::<Arc<games::manager::GameLayoutManager>>() {
                                let gm = Arc::clone(&gm);
                                tauri::async_runtime::spawn(async move {
                                    let _ = gm.hide_all_game_views().await;
                                });
                            }
                            if let Some(vm) = app.try_state::<Arc<votes::manager::VoteManager>>() {
                                let vm = Arc::clone(&vm);
                                tauri::async_runtime::spawn(async move {
                                    let _ = vm.hide_vote_webview().await;
                                });
                            }
                        } else {
                            if let Some(safety) = app.try_state::<Arc<safety::SafetyNet>>() {
                                safety.mark_ok();
                            }
                            std::process::exit(0);
                        }
                    }
                }
                _ => {}
            }
        });
    }

    builder
        .setup(|app| {
            let app_handle = app.handle().clone();
            if let Ok(data_dir) = app.path().app_data_dir() {
                let _ = std::fs::create_dir_all(&data_dir);
                let _ = PANIC_LOG_PATH.set(data_dir.join("panic.log"));
                logger::init_global_logger(data_dir.join("audit"));
                audit_log!("SYSTEM", "INFO", "IdleStream inicializado com sucesso (Audit Logger ativo - 6h rotativo em disco)");
            }

            let config_dir = app
                .path()
                .app_config_dir()
                .unwrap_or_else(|_| PathBuf::from("./config"));
            let safety = safety::SafetyNet::new(config_dir, env!("CARGO_PKG_VERSION").to_string());
            app.manage(safety.clone());

            let start_result = safety.before_start();
            audit_log!(
                "SAFETY",
                "INFO",
                "SafetyNet ativo: crash_count={}, last_good_version={:?}",
                start_result.crash_count,
                start_result.last_good_version
            );

            // Backup diário automático se necessário
            if safety.needs_daily_backup() {
                match safety.backup_configs("daily") {
                    Ok(bkp) => {
                        audit_log!(
                            "SAFETY",
                            "INFO",
                            "Backup diário automático criado com sucesso: id={}, arquivos={}",
                            bkp.id,
                            bkp.file_count
                        );
                    }
                    Err(e) => {
                        audit_log!(
                            "SAFETY",
                            "WARN",
                            "Falha ao criar backup diário automático: {}",
                            e
                        );
                    }
                }
            }

            // Marcar como OK após 120s de estabilidade
            let safety_ok = safety.clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_secs(120)).await;
                safety_ok.mark_ok();
                audit_log!("SAFETY", "INFO", "Sessão marcada como estável (crash_count resetado a 0)");
            });

            // Crash-loop guard: avisar frontend se crash_count >= 3
            if start_result.crash_count >= 3 {
                let app_clone = app_handle.clone();
                let result_clone = start_result.clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
                    let _ = app_clone.emit("crash-loop-detected", &result_clone);
                    audit_log!(
                        "SAFETY",
                        "WARN",
                        "Crash-loop detectado! {} crashes consecutivos sem estabilidade",
                        result_clone.crash_count
                    );
                });
            }

            let app_state = Arc::new(AppState::new(app_handle.clone()));
            app.manage(app_state.clone());

            let game_manager = Arc::new(games::manager::GameLayoutManager::new(app_handle.clone()));
            app.manage(game_manager.clone());

            let vote_manager = Arc::new(votes::manager::VoteManager::new(app_handle.clone()));
            app.manage(vote_manager.clone());

            let overlay_server = Arc::new(overlay::OverlayServer::new(app_handle.clone(), None));
            app.manage(overlay_server.clone());

            let session_export = Arc::new(session_export::SessionExportServer::new(app_handle.clone()));
            app.manage(session_export.clone());
            {
                let cfg_overlay = app_state.clone();
                let srv_overlay = overlay_server.clone();
                tauri::async_runtime::spawn(async move {
                    let enabled = cfg_overlay.config.lock().await.settings.overlay_enabled;
                    if enabled {
                        let _ = srv_overlay.start();
                    }
                });
            }

            // Start background vigilance loop (Auto-Live detection & standby recovery)
            app_state.start_vigilance_loop();

            // Start account session health verifier (startup check + 10m background refresh)
            app_state.start_account_health_loop();

            // Start background daily vote scheduler (24h 01m notification alerts)
            votes::notifier::start_vote_scheduler(app_state.clone());

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
                                    if let Some(safety) = app_handle_tray.try_state::<Arc<safety::SafetyNet>>() {
                                        safety.mark_ok();
                                    }
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

            // Auto-start streams marked with auto_start OR persisted as desired active before restart
            let auto_start_state = app_state.clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_millis(1200)).await;
                let auto_ids = auto_start_state.get_streams_to_restore().await;
                eprintln!("[AutoStart] Restoring {} streams (auto_start + active session): {:?}", auto_ids.len(), auto_ids);
                for (idx, sid) in auto_ids.into_iter().enumerate() {
                    if idx > 0 {
                        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                    }
                    let res = auto_start_state.start_stream(&sid).await;
                    eprintln!("[AutoStart] Stream {} restore result: {:?}", sid, res);
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            get_runtime_state,
            set_runtime_ui_state,
            save_config,
            add_account,
            remove_account,
            update_account_info,
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
            verify_all_accounts,
            verify_account,
            get_accounts_health,
            open_stream_redeem,
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
            games::commands::game_get_system_idle_seconds,
            games::commands::game_read_slot_state,
            games::commands::game_get_all_states,
            games::commands::game_freeze_slot,
            games::commands::game_unfreeze_slot,
            games::commands::game_get_slot_snapshot,
            games::commands::game_get_all_snapshots,
            votes::commands::vote_update_account,
            votes::commands::vote_open_webview,
            votes::commands::vote_close_webview,
            votes::commands::vote_update_bounds,
            votes::commands::vote_hide_webview,
            votes::commands::vote_reload_webview,
            votes::commands::vote_clear_topidle_session,
            votes::commands::vote_get_active,
            votes::commands::vote_mark_completed,
            votes::commands::vote_reset_timer,
            votes::commands::vote_test_notification,
            votes::commands::vote_set_sync_id,
            votes::commands::vote_get_sync_id,
            get_audit_logs,
            clear_audit_logs,
            write_audit_log,
            get_safety_state,
            backup_configs_now,
            list_backups,
            restore_backup,
            update_alert_config,
            test_alert,
            toggle_night_mode,
            get_night_mode_status,
            device_set_sync_id,
            device_get_sync_id,
            toggle_overlay_server,
            get_overlay_status,
            start_session_export,
            stop_session_export,
            get_session_export_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
