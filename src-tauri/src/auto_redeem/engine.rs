use crate::auto_redeem::catalog::pick_catalog_reward_for_budget;
use crate::auto_redeem::executor::{
    execute_kick_redeem, execute_twitch_redeem, fetch_twitch_channel_and_rewards_detailed,
    find_twitch_reward_by_name, is_reward_not_found_error, resolve_twitch_channel_id,
    TwitchCustomReward,
};
use crate::auto_redeem::models::{
    AutoRedeemErrorPayload, AutoRedeemExecutedPayload, AutoRedeemGoalReachedPayload,
    AutoRedeemRewardResolvedPayload, RedeemError, RedeemResult,
};
use crate::config::{Account, AutoRedeemConfig, Platform, RedeemMode};
use crate::state::AppState;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::Emitter;
use tokio::sync::mpsc;

pub struct AutoRedeemHandle {
    stop_tx: Option<mpsc::Sender<()>>,
}

impl AutoRedeemHandle {
    pub fn stop(&mut self) {
        if let Some(tx) = self.stop_tx.take() {
            let _ = tx.try_send(());
        }
    }
}

pub struct RedeemExecutionOutcome {
    pub result: RedeemResult,
    pub used_title: String,
    pub used_cost: i64,
    pub used_duration_hours: Option<f64>,
    pub newly_resolved_cache: Option<(String, String)>,
}

/// Verifica se o resgate deve ser tentado agora dado o saldo atual, custo e cooldown.
pub fn should_attempt_redeem(
    balance: Option<i64>,
    cost: i64,
    next_available_at: Option<i64>,
    now: i64,
) -> bool {
    if cost <= 0 {
        return false;
    }
    match balance {
        Some(b) if b >= cost => {}
        _ => return false,
    }
    if let Some(next_at) = next_available_at {
        if now < next_at {
            return false;
        }
    }
    true
}

/// Faz parsing seguro de string de saldo de pontos (ex: "2450", "2.450").
pub fn parse_points_balance(raw: &str) -> Option<i64> {
    let digits: String = raw.chars().filter(|c| c.is_ascii_digit()).collect();
    if digits.is_empty() {
        return None;
    }
    digits.parse::<i64>().ok()
}

/// Calcula o cooldown em segundos baseado na duração do bônus (RN-07).
/// Aplica 60 segundos de antecedência para evitar gaps entre expirações.
pub fn compute_duration_cooldown_secs(duration_hours: Option<f64>) -> i64 {
    duration_hours
        .filter(|h| h.is_finite() && *h > 0.0)
        .map(|h| ((h * 3600.0).round() as i64).saturating_sub(60).max(5))
        .unwrap_or(5)
}

/// Gera a chave composta persistente do cache de `reward_id` para `(channel_slug, reward_title)`.
pub fn reward_cache_key(channel_slug: &str, reward_title: &str) -> String {
    format!(
        "{}::{}",
        channel_slug.trim().trim_start_matches('#').to_lowercase(),
        reward_title.trim().to_lowercase()
    )
}

/// Consulta o `reward_id` persistido em cache para `(channel_slug, reward_title)`.
pub fn lookup_cached_reward_id(
    cfg: &AutoRedeemConfig,
    channel_slug: &str,
    reward_title: &str,
) -> Option<String> {
    lookup_cached_twitch_reward(cfg, channel_slug, reward_title).map(|r| r.id)
}

fn parse_cached_reward_entry(raw: &str, fallback_title: &str, fallback_cost: i64) -> Option<TwitchCustomReward> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }
    if trimmed.starts_with('{') {
        if let Ok(parsed) = serde_json::from_str::<TwitchCustomReward>(trimmed) {
            if !parsed.id.trim().is_empty() {
                return Some(parsed);
            }
        }
    }
    Some(TwitchCustomReward {
        id: trimmed.to_string(),
        title: fallback_title.to_string(),
        cost: fallback_cost,
        prompt: String::new(),
    })
}

fn lookup_cached_twitch_reward(
    cfg: &AutoRedeemConfig,
    channel_slug: &str,
    reward_title: &str,
) -> Option<TwitchCustomReward> {
    let composite = reward_cache_key(channel_slug, reward_title);
    if let Some(raw) = cfg.resolved_reward_ids.get(&composite) {
        if let Some(parsed) = parse_cached_reward_entry(raw, reward_title, cfg.cost) {
            return Some(parsed);
        }
    }
    if !cfg.auto_select_package {
        let slug_key = channel_slug.trim().trim_start_matches('#').to_lowercase();
        if let Some(raw) = cfg.resolved_reward_ids.get(&slug_key) {
            if let Some(parsed) = parse_cached_reward_entry(raw, reward_title, cfg.cost) {
                return Some(parsed);
            }
        }
    }
    None
}

/// Atualiza contadores, cooldown, acumulador de horas e pausa automática (Q2 / RN-07 / RN-10)
/// em cima do `AutoRedeemConfig` após um resgate bem-sucedido.
/// Retorna `(new_total, next_available_at, goal_reached)`.
pub fn record_redeem_success_on_config(
    cfg: &mut AutoRedeemConfig,
    channel_slug: &str,
    redeemed_at: i64,
    duration_hours_used: Option<f64>,
) -> (u32, Option<i64>, bool) {
    cfg.total_redeems = cfg.total_redeems.saturating_add(1);
    cfg.last_redeemed_at = Some(redeemed_at);
    cfg.last_error = None;

    let effective_duration = duration_hours_used
        .or(cfg.duration_hours)
        .filter(|h| h.is_finite() && *h > 0.0);

    let cooldown_secs = if cfg.auto_select_package {
        5
    } else {
        compute_duration_cooldown_secs(effective_duration)
    };
    let next_at = redeemed_at + cooldown_secs;

    let slug_key = channel_slug.trim().trim_start_matches('#').to_lowercase();
    cfg.channel_cooldowns.insert(slug_key, next_at);
    if !cfg.all_channels {
        cfg.next_available_at = Some(next_at);
    } else {
        cfg.next_available_at = None;
    }

    if let Some(added) = effective_duration {
        cfg.accumulated_hours += added;
    }

    let mut goal_reached = false;
    if cfg.redeem_mode == RedeemMode::Duration {
        if let Some(target) = cfg.target_duration_hours {
            if cfg.accumulated_hours + 1e-6 >= target {
                cfg.enabled = false;
                goal_reached = true;
            }
        }
    }

    (cfg.total_redeems, Some(next_at), goal_reached)
}

async fn get_or_resolve_twitch_id(
    http: &reqwest::Client,
    channel_slug: &str,
    token: &str,
    cache: &mut HashMap<String, String>,
) -> Result<String, RedeemError> {
    let key = channel_slug.trim().trim_start_matches('#').to_lowercase();
    if let Some(cached) = cache.get(&key) {
        return Ok(cached.clone());
    }
    let cid = resolve_twitch_channel_id(http, &key, Some(token))
        .await
        .map_err(RedeemError::NetworkError)?;
    cache.insert(key, cid.clone());
    Ok(cid)
}

/// Resolve `(channel_id, TwitchCustomReward)` para Twitch considerando:
/// 1. `reward_id` manual explícito (RN-12, quando `!auto_select_package`)
/// 2. Cache persistido `resolved_reward_ids` (Q1 / AR-32)
/// 3. Consulta GQL `customRewards` com match por nome/custo e `prompt` exato (RN-05 / RN-13)
pub async fn resolve_twitch_ids_for_channel(
    cfg: &AutoRedeemConfig,
    channel_slug: &str,
    token: &str,
    target_title: &str,
    target_cost: i64,
    http: &reqwest::Client,
    channel_id_cache: &mut HashMap<String, String>,
    force_refresh: bool,
) -> Result<(String, TwitchCustomReward, Option<String>, bool), RedeemError> {
    let slug_key = channel_slug.trim().trim_start_matches('#').to_lowercase();

    // RN-12: reward_id manual explícito tem precedência quando não é seleção dinâmica de pacotes
    if !cfg.auto_select_package {
        if let Some(explicit_id) = cfg
            .reward_id
            .as_deref()
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
        {
            let resolved_cid = if !cfg.all_channels {
                if let Some(cid) = cfg.channel_id.as_deref().map(|s| s.trim()).filter(|s| !s.is_empty()) {
                    cid.to_string()
                } else {
                    get_or_resolve_twitch_id(http, &slug_key, token, channel_id_cache).await?
                }
            } else {
                get_or_resolve_twitch_id(http, &slug_key, token, channel_id_cache).await?
            };
            return Ok((
                resolved_cid,
                TwitchCustomReward {
                    id: explicit_id.to_string(),
                    title: target_title.to_string(),
                    cost: target_cost,
                    prompt: String::new(),
                },
                None,
                false,
            ));
        }
    }

    // Q1: Tenta usar o cache persistido primeiro (a menos que force_refresh=true)
    if !force_refresh {
        if let Some(cached_reward) = lookup_cached_twitch_reward(cfg, &slug_key, target_title) {
            let resolved_cid = if !cfg.all_channels {
                if let Some(cid) = cfg.channel_id.as_deref().map(|s| s.trim()).filter(|s| !s.is_empty()) {
                    cid.to_string()
                } else {
                    get_or_resolve_twitch_id(http, &slug_key, token, channel_id_cache).await?
                }
            } else {
                get_or_resolve_twitch_id(http, &slug_key, token, channel_id_cache).await?
            };
            return Ok((resolved_cid, cached_reward, None, true));
        }
    }

    // Cache MISS ou refresh forçado após troca de ID/propriedades pelo streamer: consulta GQL customRewards
    let (maybe_cid, rewards) =
        fetch_twitch_channel_and_rewards_detailed(http, &slug_key, Some(token)).await?;

    let resolved_cid = if let Some(cid) = maybe_cid {
        channel_id_cache.insert(slug_key.clone(), cid.clone());
        cid
    } else {
        get_or_resolve_twitch_id(http, &slug_key, token, channel_id_cache).await?
    };

    let found_reward = find_twitch_reward_by_name(&rewards, target_title, target_cost)
        .cloned()
        .ok_or_else(|| {
            RedeemError::RewardNotFound(format!(
                "'{}' não encontrada no canal {}",
                target_title, slug_key
            ))
        })?;

    let serialized = serde_json::to_string(&found_reward).unwrap_or_else(|_| found_reward.id.clone());
    Ok((resolved_cid, found_reward, Some(serialized), false))
}

/// Executa um único resgate para um canal específico (com auto-resolução e auto-invalidação de cache na Twitch).
pub async fn execute_single_redeem_for_channel(
    cfg: &AutoRedeemConfig,
    account: &Account,
    channel_slug: &str,
    http: &reqwest::Client,
    channel_id_cache: &mut HashMap<String, String>,
    balance_hint: Option<i64>,
) -> Result<RedeemExecutionOutcome, RedeemError> {
    let (target_title, target_cost, target_duration) = if cfg.auto_select_package {
        let bonus_type = cfg.bonus_type.ok_or_else(|| {
            RedeemError::Unknown("Tipo de bônus não definido para seleção automática".to_string())
        })?;
        let remaining = cfg
            .target_duration_hours
            .map(|t| (t - cfg.accumulated_hours).max(0.0))
            .unwrap_or(0.0);
        let effective_bal = balance_hint.unwrap_or(i64::MAX / 4);
        let picked = pick_catalog_reward_for_budget(cfg.platform, bonus_type, remaining, effective_bal)
            .ok_or_else(|| RedeemError::InsufficientPoints {
                balance: balance_hint.unwrap_or(0),
                required: cfg.cost.max(1),
            })?;
        (
            picked.reward_title.to_string(),
            picked.cost,
            Some(picked.duration_hours),
        )
    } else {
        (cfg.reward_title.clone(), cfg.cost, cfg.duration_hours)
    };

    match cfg.platform {
        Platform::Twitch => {
            let token = account
                .oauth_token
                .as_deref()
                .map(|s| s.trim())
                .filter(|s| !s.is_empty())
                .ok_or_else(|| RedeemError::AuthError("Token Twitch ausente".to_string()))?;

            let (cid, reward, mut newly_resolved, used_cache) = resolve_twitch_ids_for_channel(
                cfg,
                channel_slug,
                token,
                &target_title,
                target_cost,
                http,
                channel_id_cache,
                false,
            )
            .await?;

            let text_input = cfg.text_input.as_deref().unwrap_or("");
            match execute_twitch_redeem(
                http,
                token,
                &cid,
                &reward.id,
                &reward.title,
                reward.cost,
                &reward.prompt,
                text_input,
            )
            .await
            {
                Ok(res) => {
                    let cache_entry = newly_resolved
                        .take()
                        .map(|val| (reward_cache_key(channel_slug, &target_title), val));
                    Ok(RedeemExecutionOutcome {
                        result: res,
                        used_title: reward.title,
                        used_cost: reward.cost,
                        used_duration_hours: target_duration,
                        newly_resolved_cache: cache_entry,
                    })
                }
                Err(err) if used_cache && is_reward_not_found_error(&err) => {
                    // Q1 / RN-14: O ID ou propriedades em cache expiraram/mudaram; re-resolve uma vez via GQL
                    let (fresh_cid, fresh_reward, fresh_resolved, _) =
                        resolve_twitch_ids_for_channel(
                            cfg,
                            channel_slug,
                            token,
                            &target_title,
                            target_cost,
                            http,
                            channel_id_cache,
                            true,
                        )
                        .await?;

                    let res = execute_twitch_redeem(
                        http,
                        token,
                        &fresh_cid,
                        &fresh_reward.id,
                        &fresh_reward.title,
                        fresh_reward.cost,
                        &fresh_reward.prompt,
                        text_input,
                    )
                    .await?;

                    let cache_entry = fresh_resolved
                        .map(|val| (reward_cache_key(channel_slug, &target_title), val));
                    Ok(RedeemExecutionOutcome {
                        result: res,
                        used_title: fresh_reward.title,
                        used_cost: fresh_reward.cost,
                        used_duration_hours: target_duration,
                        newly_resolved_cache: cache_entry,
                    })
                }
                Err(err) => Err(err),
            }
        }
        Platform::Kick => {
            let bearer = account
                .session_token
                .as_deref()
                .map(|s| s.trim())
                .filter(|s| !s.is_empty())
                .ok_or_else(|| RedeemError::AuthError("Session token Kick ausente".to_string()))?;

            let explicit_id = cfg
                .reward_id
                .as_deref()
                .map(|s| s.trim())
                .filter(|s| !s.is_empty())
                .ok_or_else(|| {
                    RedeemError::RewardNotFound(
                        "ID da recompensa (reward_id) não informado para Kick".to_string(),
                    )
                })?;

            let res = execute_kick_redeem(bearer, channel_slug, explicit_id).await?;
            Ok(RedeemExecutionOutcome {
                result: res,
                used_title: target_title,
                used_cost: target_cost,
                used_duration_hours: target_duration,
                newly_resolved_cache: None,
            })
        }
    }
}

/// Inicia o loop contínuo de auto-resgate para uma configuração específica.
pub fn start_auto_redeem_loop(redeem_id: String, app_state: Arc<AppState>) -> AutoRedeemHandle {
    let (stop_tx, mut stop_rx) = mpsc::channel::<()>(1);

    tokio::spawn(async move {
        // Pequeno jitter inicial para escalonar múltiplas tasks no boot
        let jitter_ms = (redeem_id.bytes().map(|b| b as u64).sum::<u64>() % 5) * 600 + 500;
        tokio::select! {
            _ = stop_rx.recv() => return,
            _ = tokio::time::sleep(std::time::Duration::from_millis(jitter_ms)) => {}
        }

        let mut channel_id_cache: HashMap<String, String> = HashMap::new();
        let mut channel_cooldowns: HashMap<String, i64> = HashMap::new();
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));

        loop {
            tokio::select! {
                _ = stop_rx.recv() => {
                    crate::audit_log!("AUTO_REDEEM", "INFO", "Loop encerrado para redeem_id={}", redeem_id);
                    break;
                }
                _ = interval.tick() => {}
            }

            let (mut cfg, account, target_streams) = {
                let mut config_guard = app_state.config.lock().await;
                let cfg_opt = config_guard
                    .auto_redeems
                    .iter()
                    .find(|r| r.id == redeem_id)
                    .cloned();

                let mut cfg = match cfg_opt {
                    Some(c) if c.enabled => c,
                    _ => break, // Removido ou desabilitado
                };

                // Se já atingiu a meta anteriormente, garante pausa limpa
                if cfg.redeem_mode == RedeemMode::Duration {
                    if let Some(target) = cfg.target_duration_hours {
                        if cfg.accumulated_hours + 1e-6 >= target {
                            if let Some(item) = config_guard
                                .auto_redeems
                                .iter_mut()
                                .find(|r| r.id == redeem_id)
                            {
                                item.enabled = false;
                            }
                            let _ = app_state.config_store.save(&config_guard);
                            break;
                        }
                    }
                }

                // Sincroniza cooldowns persistidos
                for (k, v) in &cfg.channel_cooldowns {
                    channel_cooldowns
                        .entry(k.clone())
                        .and_modify(|curr| {
                            if *v > *curr {
                                *curr = *v;
                            }
                        })
                        .or_insert(*v);
                }

                let acc_opt = config_guard
                    .accounts
                    .iter()
                    .find(|a| a.id == cfg.account_id)
                    .cloned();

                let account = match acc_opt {
                    Some(a) => a,
                    None => break,
                };

                let streams: Vec<(String, String)> = config_guard
                    .streams
                    .iter()
                    .filter(|s| {
                        s.platform == cfg.platform
                            && s.account_ids.contains(&cfg.account_id)
                            && cfg.matches_channel(&s.channel_slug)
                    })
                    .map(|s| (s.id.clone(), s.channel_slug.clone()))
                    .collect();

                let _ = &mut cfg;
                (cfg, account, streams)
            };

            if target_streams.is_empty() {
                continue;
            }

            for (stream_id, channel_slug) in target_streams {
                if stop_rx.try_recv().is_ok() {
                    return;
                }

                // Caso já tenha atingido a meta em uma stream anterior do mesmo tick
                if cfg.redeem_mode == RedeemMode::Duration {
                    if let Some(target) = cfg.target_duration_hours {
                        if cfg.accumulated_hours + 1e-6 >= target {
                            return;
                        }
                    }
                }

                let now = chrono::Utc::now().timestamp();
                let balance = {
                    let statuses = app_state.statuses.lock().await;
                    statuses
                        .get(&stream_id)
                        .and_then(|st| st.account_points.get(&cfg.account_id))
                        .and_then(|raw| parse_points_balance(raw))
                };

                let slug_key = channel_slug.trim().trim_start_matches('#').to_lowercase();
                let effective_cooldown = channel_cooldowns
                    .get(&slug_key)
                    .copied()
                    .or_else(|| cfg.channel_cooldowns.get(&slug_key).copied())
                    .or(if !cfg.all_channels {
                        cfg.next_available_at
                    } else {
                        None
                    });

                // Em modo auto_select_package, escolhe o melhor pacote que cabe no saldo + horas restantes
                let required_cost = if cfg.auto_select_package {
                    let Some(bonus_type) = cfg.bonus_type else {
                        continue;
                    };
                    let remaining = cfg
                        .target_duration_hours
                        .map(|t| (t - cfg.accumulated_hours).max(0.0))
                        .unwrap_or(0.0);
                    let Some(bal) = balance else {
                        continue;
                    };
                    match pick_catalog_reward_for_budget(cfg.platform, bonus_type, remaining, bal) {
                        Some(pkg) => pkg.cost,
                        None => continue,
                    }
                } else {
                    cfg.cost
                };

                if !should_attempt_redeem(balance, required_cost, effective_cooldown, now) {
                    continue;
                }

                match execute_single_redeem_for_channel(
                    &cfg,
                    &account,
                    &channel_slug,
                    &app_state.http_client,
                    &mut channel_id_cache,
                    balance,
                )
                .await
                {
                    Ok(outcome) => {
                        // Deduz o custo real do pacote resgatado em memória
                        if let Some(prev_bal) = balance {
                            let new_bal = prev_bal.saturating_sub(outcome.used_cost);
                            let mut statuses = app_state.statuses.lock().await;
                            if let Some(st) = statuses.get_mut(&stream_id) {
                                st.account_points
                                    .insert(cfg.account_id.clone(), new_bal.to_string());
                                if st.channel_points.is_some() {
                                    st.channel_points = Some(new_bal.to_string());
                                }
                            }
                        }

                        if let Some((ref cache_key, ref resolved_id)) = outcome.newly_resolved_cache {
                            let _ = app_state.app_handle.emit(
                                "auto-redeem-reward-resolved",
                                AutoRedeemRewardResolvedPayload {
                                    redeem_id: redeem_id.clone(),
                                    channel_slug: channel_slug.clone(),
                                    reward_title: outcome.used_title.clone(),
                                    reward_id: resolved_id.clone(),
                                },
                            );
                            cfg.resolved_reward_ids
                                .insert(cache_key.clone(), resolved_id.clone());
                        }

                        let (new_total, next_at, goal_reached) = {
                            let mut config_guard = app_state.config.lock().await;
                            let res_tuple = if let Some(item) = config_guard
                                .auto_redeems
                                .iter_mut()
                                .find(|r| r.id == redeem_id)
                            {
                                if let Some((cache_key, resolved_id)) = outcome.newly_resolved_cache.clone() {
                                    item.resolved_reward_ids.insert(cache_key, resolved_id);
                                }
                                let out = record_redeem_success_on_config(
                                    item,
                                    &channel_slug,
                                    outcome.result.redeemed_at,
                                    outcome.used_duration_hours,
                                );
                                cfg = item.clone();
                                out
                            } else {
                                record_redeem_success_on_config(
                                    &mut cfg,
                                    &channel_slug,
                                    outcome.result.redeemed_at,
                                    outcome.used_duration_hours,
                                )
                            };
                            let _ = app_state.config_store.save(&config_guard);
                            res_tuple
                        };

                        if let Some(next_ts) = next_at {
                            channel_cooldowns.insert(slug_key.clone(), next_ts);
                        }

                        crate::audit_log!(
                            "AUTO_REDEEM",
                            "INFO",
                            "Resgate automático concluído: '{}' ({}) em {} | total={} | acumulado={:.1}h",
                            outcome.used_title,
                            outcome.used_cost,
                            channel_slug,
                            new_total,
                            cfg.accumulated_hours
                        );

                        let _ = app_state.app_handle.emit(
                            "auto-redeem-executed",
                            AutoRedeemExecutedPayload {
                                redeem_id: redeem_id.clone(),
                                account_id: cfg.account_id.clone(),
                                channel_slug: channel_slug.clone(),
                                success: true,
                                message: format!("Resgatado '{}' em {}", outcome.used_title, channel_slug),
                                new_total,
                                redeemed_at: Some(outcome.result.redeemed_at),
                                next_available_at: next_at,
                                hours_added: outcome.used_duration_hours,
                            },
                        );

                        if goal_reached {
                            let target_hours = cfg.target_duration_hours.unwrap_or(0.0);
                            crate::audit_log!(
                                "AUTO_REDEEM",
                                "INFO",
                                "Meta de duração atingida ({:.1}h / {:.1}h) para '{}'. Auto-resgate pausado.",
                                cfg.accumulated_hours,
                                target_hours,
                                cfg.reward_title
                            );

                            let _ = app_state.app_handle.emit(
                                "auto-redeem-goal-reached",
                                AutoRedeemGoalReachedPayload {
                                    redeem_id: redeem_id.clone(),
                                    account_id: cfg.account_id.clone(),
                                    channel_slug: channel_slug.clone(),
                                    target_hours,
                                    accumulated_hours: cfg.accumulated_hours,
                                },
                            );
                            return; // Meta concluída: encerra o loop
                        }
                    }
                    Err(RedeemError::RewardNotFound(msg)) => {
                        // Invalida eventual cache antigo e coloca o canal em cooldown de 15 min
                        let stale_key = reward_cache_key(&slug_key, &cfg.reward_title);
                        channel_cooldowns.insert(slug_key.clone(), now + 900);

                        crate::audit_log!(
                            "AUTO_REDEEM",
                            "INFO",
                            "Canal {} pulado para '{}': {}",
                            channel_slug,
                            cfg.reward_title,
                            msg
                        );

                        {
                            let mut config_guard = app_state.config.lock().await;
                            if let Some(item) = config_guard
                                .auto_redeems
                                .iter_mut()
                                .find(|r| r.id == redeem_id)
                            {
                                item.resolved_reward_ids.remove(&stale_key);
                                // Em modo global (todos os canais), não exibe erro na UI ao pular um streamer sem a recompensa
                                if !item.all_channels {
                                    item.last_error = Some(msg.clone());
                                }
                            }
                            let _ = app_state.config_store.save(&config_guard);
                        }

                        if !cfg.all_channels {
                            let _ = app_state.app_handle.emit(
                                "auto-redeem-error",
                                AutoRedeemErrorPayload {
                                    redeem_id: redeem_id.clone(),
                                    account_id: cfg.account_id.clone(),
                                    error_kind: "reward_not_found".to_string(),
                                    message: msg,
                                },
                            );
                        }
                    }
                    Err(RedeemError::CooldownActive { retry_after_secs }) => {
                        let wait_secs = retry_after_secs.unwrap_or(300) as i64;
                        let next_at = now + wait_secs;
                        channel_cooldowns.insert(slug_key.clone(), next_at);

                        let total = {
                            let mut config_guard = app_state.config.lock().await;
                            let mut t = cfg.total_redeems;
                            if let Some(item) = config_guard
                                .auto_redeems
                                .iter_mut()
                                .find(|r| r.id == redeem_id)
                            {
                                item.channel_cooldowns.insert(slug_key.clone(), next_at);
                                if !item.all_channels {
                                    item.next_available_at = Some(next_at);
                                }
                                item.last_error = None;
                                t = item.total_redeems;
                            }
                            let _ = app_state.config_store.save(&config_guard);
                            t
                        };

                        let _ = app_state.app_handle.emit(
                            "auto-redeem-executed",
                            AutoRedeemExecutedPayload {
                                redeem_id: redeem_id.clone(),
                                account_id: cfg.account_id.clone(),
                                channel_slug: channel_slug.clone(),
                                success: false,
                                message: format!(
                                    "Cooldown ativo em {} (aguardando {}s)",
                                    channel_slug, wait_secs
                                ),
                                new_total: total,
                                redeemed_at: None,
                                next_available_at: Some(next_at),
                                hours_added: None,
                            },
                        );
                    }
                    Err(RedeemError::AuthError(msg)) => {
                        {
                            let mut config_guard = app_state.config.lock().await;
                            if let Some(item) = config_guard
                                .auto_redeems
                                .iter_mut()
                                .find(|r| r.id == redeem_id)
                            {
                                item.last_error = Some(msg.clone());
                            }
                            let _ = app_state.config_store.save(&config_guard);
                        }

                        crate::audit_log!(
                            "AUTO_REDEEM",
                            "ERROR",
                            "Erro de autenticação no auto-resgate {}: {}",
                            redeem_id,
                            msg
                        );

                        let _ = app_state.app_handle.emit(
                            "auto-redeem-error",
                            AutoRedeemErrorPayload {
                                redeem_id: redeem_id.clone(),
                                account_id: cfg.account_id.clone(),
                                error_kind: "auth_error".to_string(),
                                message: msg,
                            },
                        );
                        return; // Para o loop em caso de erro de autenticação
                    }
                    Err(RedeemError::LimitReached) => {
                        channel_cooldowns.insert(slug_key.clone(), now + 900);
                    }
                    Err(err) => {
                        let err_msg = err.to_string();
                        let mut config_guard = app_state.config.lock().await;
                        if let Some(item) = config_guard
                            .auto_redeems
                            .iter_mut()
                            .find(|r| r.id == redeem_id)
                        {
                            item.last_error = Some(err_msg);
                        }
                        let _ = app_state.config_store.save(&config_guard);
                    }
                }
            }
        }
    });

    AutoRedeemHandle {
        stop_tx: Some(stop_tx),
    }
}
