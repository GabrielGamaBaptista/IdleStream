use crate::config::StatusKind;
use crate::twitch::coordinator::{AccountPriorityCoordinator, StreamerSlotNotification};
use crate::twitch::models::MiningSlotState;
use crate::twitch::gql::{
    claim_community_points, fetch_channel_points_context, fetch_client_integrity,
    fetch_current_user_id, fetch_streamer_uptime_avg,
};
use crate::twitch::spade::send_spade_minute_watched;
use std::sync::Arc;
use tokio::sync::mpsc;

pub struct TwitchWatcherHandle {
    stop_tx: Option<mpsc::Sender<()>>,
}

impl TwitchWatcherHandle {
    pub fn stop(&mut self) {
        if let Some(tx) = self.stop_tx.take() {
            let _ = tx.try_send(());
        }
    }
}

pub type StatusCallback = Arc<dyn Fn(StatusKind, Option<String>, Option<i64>) + Send + Sync + 'static>;
pub type AuthFailureCallback = Arc<dyn Fn(String) + Send + Sync + 'static>;

fn apply_status(
    on_status: &StatusCallback,
    slot_state: MiningSlotState,
    rank: usize,
    avg_hours: f64,
    current_points: Option<i64>,
    chest_available: bool,
) {
    match slot_state {
        MiningSlotState::Offline => {
            let msg = format!("Streamer offline na Twitch (Rank #{} • Média: {:.1}h)", rank, avg_hours);
            on_status(StatusKind::Standby, Some(msg), current_points);
        }
        MiningSlotState::StandbyVigil => {
            let msg = format!("Fila de espera (Prioridade #{} • Média: {:.1}h)", rank, avg_hours);
            on_status(StatusKind::Standby, Some(msg), current_points);
        }
        MiningSlotState::ActiveMining => {
            let msg = if chest_available {
                format!("🪙 Baú de +50 disponível! (Rank #{} • Média: {:.1}h)", rank, avg_hours)
            } else {
                format!("Minerando pontos (Prioridade #{} • Média: {:.1}h)", rank, avg_hours)
            };
            on_status(StatusKind::Connected, Some(msg), current_points);
        }
    }
}

/// Inicia o watcher nativo ultraleve de transmissão Twitch via GQL + Usher HLS + Spade com prioridade reativa
pub fn start_twitch_watcher(
    _stream_id: String,
    account_id: String,
    oauth_token: String,
    channel_slug: String,
    user_id_override: Option<String>,
    device_id_override: Option<String>,
    coordinator: AccountPriorityCoordinator,
    on_status: StatusCallback,
    app_handle: Option<tauri::AppHandle>,
    on_auth_failure: Option<AuthFailureCallback>,
) -> TwitchWatcherHandle {
    let (stop_tx, mut stop_rx) = mpsc::channel::<()>(1);

    tokio::spawn(async move {
        let http = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .unwrap_or_default();

        let clean_slug = channel_slug.trim().trim_start_matches('#').to_lowercase();
        let clean_token = oauth_token.trim_start_matches("oauth:").trim().to_string();

        // Canal de escuta reativa para repriorização instantânea disparada pelo coordenador
        let (notify_tx, mut notify_rx) = mpsc::unbounded_channel::<StreamerSlotNotification>();
        coordinator.register_listener(&account_id, &clean_slug, notify_tx).await;

        // Obtém ou resolve o user_id do visualizador
        let mut resolved_user_id = user_id_override.unwrap_or_default();
        if resolved_user_id.is_empty() && !clean_token.is_empty() {
            match fetch_current_user_id(&http, &clean_token).await {
                Ok(uid) => {
                    resolved_user_id = uid;
                }
                Err(ref err) => {
                    if err.contains("currentUser") || err.contains("401") || err.contains("403") {
                        if let Some(ref cb) = on_auth_failure {
                            cb(err.clone());
                        }
                    }
                }
            }
        }

        let device_id = device_id_override.unwrap_or_else(|| {
            uuid::Uuid::new_v4().to_string().replace('-', "")[..32].to_string()
        });

        // 1. Calcula a média inicial de tempo online do streamer (últimos VODs)
        let mut avg_hours = fetch_streamer_uptime_avg(&http, &clean_slug, Some(&clean_token))
            .await
            .unwrap_or(4.0);

        let mut integrity_token: Option<String> = None;
        let mut last_integrity_fetch = std::time::Instant::now();
        let mut current_points: Option<i64> = None;
        let mut last_vod_check = std::time::Instant::now();

        // Sessão ativa HLS para registro no CDN da Twitch (essencial para farm passivo contínuo)
        let mut cached_hls_stream_url: Option<String> = None;
        let mut last_hls_fetch = std::time::Instant::now()
            .checked_sub(std::time::Duration::from_secs(3600))
            .unwrap_or_else(std::time::Instant::now);

        let mut slot_state;
        let mut rank;

        loop {
            // Verifica sinal de parada
            if stop_rx.try_recv().is_ok() {
                coordinator.remove_streamer(&account_id, &clean_slug).await;
                break;
            }

            // A cada 6 horas, atualiza a média histórica de VODs
            if last_vod_check.elapsed() > std::time::Duration::from_secs(6 * 3600) {
                if let Ok(new_avg) = fetch_streamer_uptime_avg(&http, &clean_slug, Some(&clean_token)).await {
                    avg_hours = new_avg;
                }
                last_vod_check = std::time::Instant::now();
            }

            // 2. Consulta o status da live e pontos do canal
            let context = match fetch_channel_points_context(&http, &clean_slug, Some(&clean_token)).await {
                Ok(ctx) => ctx,
                Err(e) => {
                    if e.contains("401") || e.contains("403") || e.contains("Unauthorized") {
                        if let Some(ref cb) = on_auth_failure {
                            cb(e.clone());
                        }
                    }
                    on_status(StatusKind::Error, Some(format!("Erro ao checar Twitch: {}", e)), current_points);
                    tokio::select! {
                        _ = stop_rx.recv() => {
                            coordinator.remove_streamer(&account_id, &clean_slug).await;
                            break;
                        }
                        _ = tokio::time::sleep(tokio::time::Duration::from_secs(30)) => continue,
                    }
                }
            };

            if let Some(pts) = context.balance {
                current_points = Some(pts);
            }

            // 3. Atualiza o coordenador de prioridade (Ranqueia pelo tempo online da maior para menor)
            let (new_slot_state, new_rank) = coordinator
                .update_streamer_status(
                    &account_id,
                    &clean_slug,
                    Some(context.channel_id.clone()),
                    avg_hours,
                    context.is_live,
                    current_points,
                )
                .await;

            slot_state = new_slot_state;
            rank = new_rank;

            // 4. Executa de acordo com o estado do slot
            match slot_state {
                MiningSlotState::Offline => {
                    cached_hls_stream_url = None;
                    apply_status(&on_status, slot_state, rank, avg_hours, current_points, false);

                    let sleep = tokio::time::sleep(tokio::time::Duration::from_secs(120));
                    tokio::pin!(sleep);
                    loop {
                        tokio::select! {
                            _ = stop_rx.recv() => {
                                coordinator.remove_streamer(&account_id, &clean_slug).await;
                                return;
                            }
                            Some(notif) = notify_rx.recv() => {
                                let mut latest = notif;
                                while let Ok(n) = notify_rx.try_recv() {
                                    latest = n;
                                }
                                if latest.slot_state != slot_state || latest.priority_rank != rank {
                                    slot_state = latest.slot_state;
                                    rank = latest.priority_rank;
                                    apply_status(&on_status, slot_state, rank, avg_hours, current_points, false);
                                    break;
                                }
                            }
                            _ = &mut sleep => {
                                break;
                            }
                        }
                    }
                }
                MiningSlotState::StandbyVigil => {
                    cached_hls_stream_url = None;
                    let mut chest_available = context.available_claim_id.is_some();

                    // Mesmo em fila de espera (Standby), se houver baú de bônus (+50 pontos) disponível, resgata
                    if let Some(ref claim_id) = context.available_claim_id {
                        if integrity_token.is_none() || last_integrity_fetch.elapsed() > std::time::Duration::from_secs(3 * 3600) {
                            if let Ok(tok) = fetch_client_integrity(&http, &device_id, Some(&clean_token)).await {
                                integrity_token = Some(tok);
                                last_integrity_fetch = std::time::Instant::now();
                            }
                        }

                        match claim_community_points(
                            &http,
                            &context.channel_id,
                            claim_id,
                            &clean_token,
                            integrity_token.as_deref(),
                            Some(&device_id),
                        ).await {
                            Ok(claim_res) => {
                                println!("[Twitch] Sucesso ao resgatar baú em standby de +{} pontos em {}", claim_res.points, clean_slug);
                                if let Some(cur) = current_points {
                                    current_points = Some(cur + claim_res.points);
                                }
                                chest_available = false;
                            }
                            Err(_) => {
                                // GQL falhou: fallback headless no Desktop
                                #[cfg(desktop)]
                                if let Some(ref app) = app_handle {
                                    crate::twitch::webview::TwitchWebManager::trigger_background_chest_claim(
                                        app,
                                        &account_id,
                                        &clean_slug,
                                        Some(&clean_token),
                                    );
                                }
                            }
                        }
                    }

                    apply_status(&on_status, slot_state, rank, avg_hours, current_points, chest_available);

                    // Canal está online, mas é 3º ou inferior na lista de prioridade.
                    // Aguarda notificação reativa ou timer de 45s para reavaliação.
                    let sleep = tokio::time::sleep(tokio::time::Duration::from_secs(45));
                    tokio::pin!(sleep);
                    loop {
                        tokio::select! {
                            _ = stop_rx.recv() => {
                                coordinator.remove_streamer(&account_id, &clean_slug).await;
                                return;
                            }
                            Some(notif) = notify_rx.recv() => {
                                let mut latest = notif;
                                while let Ok(n) = notify_rx.try_recv() {
                                    latest = n;
                                }
                                if latest.slot_state != slot_state || latest.priority_rank != rank {
                                    slot_state = latest.slot_state;
                                    rank = latest.priority_rank;
                                    apply_status(&on_status, slot_state, rank, avg_hours, current_points, false);
                                    break;
                                }
                            }
                            _ = &mut sleep => {
                                break;
                            }
                        }
                    }
                }
                MiningSlotState::ActiveMining => {
                    // É UMA DAS 2 LIVES PRIORITÁRIAS ATIVAS DESTA CONTA!
                    // 4.1. Garante sessão de vídeo HLS ativa (renova a cada 30 minutos)
                    if cached_hls_stream_url.is_none() || last_hls_fetch.elapsed() > std::time::Duration::from_secs(30 * 60) {
                        if let Ok((tok_val, tok_sig)) = crate::twitch::gql::fetch_stream_playback_token(&http, &clean_slug, Some(&clean_token)).await {
                            if let Ok(stream_url) = crate::twitch::gql::fetch_usher_stream_url(&http, &clean_slug, &tok_val, &tok_sig).await {
                                cached_hls_stream_url = Some(stream_url);
                                last_hls_fetch = std::time::Instant::now();
                            }
                        }
                    }

                    // 4.2. Se houver baú de bônus (+50 pontos) disponível para resgate
                    let mut chest_available = context.available_claim_id.is_some();
                    if let Some(ref claim_id) = context.available_claim_id {
                        let mut demoted = false;
                        tokio::select! {
                            _ = stop_rx.recv() => {
                                coordinator.remove_streamer(&account_id, &clean_slug).await;
                                return;
                            }
                            Some(notif) = notify_rx.recv() => {
                                let mut latest = notif;
                                while let Ok(n) = notify_rx.try_recv() {
                                    latest = n;
                                }
                                if latest.slot_state != slot_state || latest.priority_rank != rank {
                                    slot_state = latest.slot_state;
                                    rank = latest.priority_rank;
                                    apply_status(&on_status, slot_state, rank, avg_hours, current_points, false);
                                    demoted = true;
                                }
                            }
                            _ = tokio::time::sleep(tokio::time::Duration::from_secs(2)) => {}
                        }

                        if demoted {
                            continue;
                        }

                        // Garante token de integridade válido (renova a cada 3 horas)
                        if integrity_token.is_none() || last_integrity_fetch.elapsed() > std::time::Duration::from_secs(3 * 3600) {
                            if let Ok(tok) = fetch_client_integrity(&http, &device_id, Some(&clean_token)).await {
                                integrity_token = Some(tok);
                                last_integrity_fetch = std::time::Instant::now();
                            }
                        }

                        // Tenta primeiro via chamada GQL direta sem abrir janela
                        match claim_community_points(
                            &http,
                            &context.channel_id,
                            claim_id,
                            &clean_token,
                            integrity_token.as_deref(),
                            Some(&device_id),
                        ).await {
                            Ok(claim_res) => {
                                println!("[Twitch] Sucesso ao resgatar baú de +{} pontos em {}", claim_res.points, clean_slug);
                                if let Some(cur) = current_points {
                                    current_points = Some(cur + claim_res.points);
                                }
                                chest_available = false;
                            }
                            Err(_) => {
                                // GQL falhou: fallback headless no Desktop com WebView2 genuíno
                                #[cfg(desktop)]
                                if let Some(ref app) = app_handle {
                                    crate::twitch::webview::TwitchWebManager::trigger_background_chest_claim(
                                        app,
                                        &account_id,
                                        &clean_slug,
                                        Some(&clean_token),
                                    );
                                }
                            }
                        }
                    }

                    apply_status(&on_status, slot_state, rank, avg_hours, current_points, chest_available);

                    // 4.3. Loop ativo de ~60 segundos com pings HLS periódicos (~20s) e envio final de Spade minute-watched
                    let mut demoted = false;
                    for step in 0..3 {
                        if let Some(ref stream_url) = cached_hls_stream_url {
                            let _ = crate::twitch::gql::ping_twitch_hls_stream(&http, stream_url, &clean_slug).await;
                        }

                        let sleep = tokio::time::sleep(tokio::time::Duration::from_secs(20));
                        tokio::pin!(sleep);
                        loop {
                            tokio::select! {
                                _ = stop_rx.recv() => {
                                    coordinator.remove_streamer(&account_id, &clean_slug).await;
                                    return;
                                }
                                Some(notif) = notify_rx.recv() => {
                                    let mut latest = notif;
                                    while let Ok(n) = notify_rx.try_recv() {
                                        latest = n;
                                    }
                                    if latest.slot_state != slot_state || latest.priority_rank != rank {
                                        slot_state = latest.slot_state;
                                        rank = latest.priority_rank;
                                        apply_status(&on_status, slot_state, rank, avg_hours, current_points, false);
                                        demoted = true;
                                        break;
                                    }
                                }
                                _ = &mut sleep => {
                                    break;
                                }
                            }
                        }

                        if demoted {
                            break;
                        }

                        if step == 2 {
                            // Concluiu os ~60s ativos: envia o heartbeat minute-watched oficial autenticado
                            if let Some(ref broadcast_id) = context.broadcast_id {
                                let uid = if resolved_user_id.is_empty() { "0" } else { &resolved_user_id };
                                let _ = send_spade_minute_watched(
                                    &http,
                                    &clean_slug,
                                    &context.channel_id,
                                    broadcast_id,
                                    uid,
                                    Some(&clean_token),
                                    None,
                                ).await;
                            }
                        }
                    }

                    if demoted {
                        continue;
                    }
                }
            }
        }
    });

    TwitchWatcherHandle {
        stop_tx: Some(stop_tx),
    }
}
