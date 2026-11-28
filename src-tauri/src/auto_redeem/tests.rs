#[cfg(test)]
mod tests {
    use crate::auto_redeem::catalog::{
        pick_catalog_reward_for_budget, plan_duration_redeems, REWARD_CATALOG,
    };
    use crate::auto_redeem::engine::{
        compute_duration_cooldown_secs, lookup_cached_reward_id, parse_points_balance,
        record_redeem_success_on_config, reward_cache_key, should_attempt_redeem,
    };
    use crate::auto_redeem::executor::{
        decode_kick_bearer, find_reward_id_by_name, is_reward_not_found_error,
        parse_kick_redeem_response, parse_kick_rewards_list_response,
        parse_twitch_redeem_response, parse_twitch_rewards_list_response,
    };
    use crate::auto_redeem::models::{apply_add_auto_redeem_rules, RedeemError};
    use crate::config::{AppConfig, AutoRedeemConfig, BonusType, Platform, RedeemMode};
    use serde_json::json;
    use std::collections::HashMap;

    fn make_cfg(
        id: &str,
        account_id: &str,
        platform: Platform,
        all_channels: bool,
        channel_slug: Option<&str>,
    ) -> AutoRedeemConfig {
        AutoRedeemConfig {
            id: id.to_string(),
            account_id: account_id.to_string(),
            platform,
            all_channels,
            channel_slug: channel_slug.map(|s| s.to_string()),
            channel_id: Some("190359081".to_string()),
            reward_id: Some("ecac50be-b6a2-4c5e-964b-0866b780537f".to_string()),
            reward_title: "Bônus +15% XP PokeIdle (10h)".to_string(),
            cost: 3000,
            duration_hours: Some(10.0),
            bonus_type: Some(BonusType::Xp),
            auto_select_package: false,
            text_input: None,
            resolved_reward_ids: HashMap::new(),
            enabled: true,
            redeem_mode: RedeemMode::Forever,
            target_duration_hours: None,
            accumulated_hours: 0.0,
            last_redeemed_at: None,
            total_redeems: 0,
            last_error: None,
            next_available_at: None,
            channel_cooldowns: HashMap::new(),
        }
    }

    // AR-01
    #[test]
    fn test_twitch_redeem_success_response_parsing() {
        let resp = json!({
            "data": {
                "redeemCustomReward": {
                    "redemption": {
                        "id": "redemp-123",
                        "status": "FULFILLED",
                        "reward": { "id": "rw-1", "title": "XP 10h", "cost": 2000 }
                    }
                }
            }
        });
        let res = parse_twitch_redeem_response(&resp).expect("deveria parsear sucesso");
        assert_eq!(res.redemption_id, "redemp-123");
    }

    // AR-02
    #[test]
    fn test_twitch_redeem_error_cooldown_parsing() {
        let resp = json!({
            "errors": [{ "message": "COOLDOWN_ACTIVE" }]
        });
        let err = parse_twitch_redeem_response(&resp).unwrap_err();
        assert!(matches!(err, RedeemError::CooldownActive { .. }));
    }

    // AR-03
    #[test]
    fn test_twitch_redeem_error_insufficient_points() {
        let resp = json!({
            "errors": [{ "message": "NOT_ENOUGH_POINTS" }]
        });
        let err = parse_twitch_redeem_response(&resp).unwrap_err();
        assert!(matches!(err, RedeemError::InsufficientPoints { .. }));
    }

    // AR-04
    #[test]
    fn test_kick_redeem_success_200() {
        let body = r#"{"data":{"id":"998877","status":"completed"}}"#;
        let res = parse_kick_redeem_response(200, body).expect("deveria retornar sucesso");
        assert_eq!(res.redemption_id, "998877");
    }

    // AR-05
    #[test]
    fn test_kick_redeem_error_403_cooldown() {
        let err = parse_kick_redeem_response(403, r#"{"message":"Reward on cooldown"}"#).unwrap_err();
        assert!(matches!(err, RedeemError::CooldownActive { .. }));
    }

    // AR-06
    #[test]
    fn test_kick_redeem_error_401_auth() {
        let err = parse_kick_redeem_response(401, r#"{"message":"Unauthenticated"}"#).unwrap_err();
        assert!(matches!(err, RedeemError::AuthError(_)));
    }

    // AR-07
    #[test]
    fn test_engine_does_not_fire_when_points_insufficient() {
        assert!(!should_attempt_redeem(Some(1000), 2000, None, 10_000));
        assert!(!should_attempt_redeem(None, 2000, None, 10_000));
    }

    // AR-08
    #[test]
    fn test_engine_does_not_fire_during_cooldown() {
        let now = 1_700_000_000;
        assert!(!should_attempt_redeem(Some(5000), 2000, Some(now + 300), now));
    }

    // AR-09
    #[test]
    fn test_engine_fires_after_cooldown_expires() {
        let now = 1_700_000_000;
        assert!(should_attempt_redeem(Some(5000), 2000, Some(now - 1), now));
        assert!(should_attempt_redeem(Some(2000), 2000, None, now));
    }

    // AR-16
    #[test]
    fn test_config_backward_compat_no_auto_redeems_field() {
        let raw = r#"{"accounts":[],"streams":[]}"#;
        let parsed: AppConfig = serde_json::from_str(raw).expect("deveria desserializar sem auto_redeems");
        assert!(parsed.auto_redeems.is_empty());
    }

    // AR-17
    #[test]
    fn test_kick_redeem_uses_decoded_bearer_token() {
        assert_eq!(decode_kick_bearer("12345%7Cabcdef"), "12345|abcdef");
        assert_eq!(decode_kick_bearer("12345|abcdef"), "12345|abcdef");
    }

    // AR-18 (RN-01)
    #[test]
    fn test_rn01_reject_second_all_channels_config() {
        let mut list = vec![make_cfg("r1", "acc1", Platform::Twitch, true, None)];
        let second = make_cfg("r2", "acc1", Platform::Twitch, true, None);
        let res = apply_add_auto_redeem_rules(&mut list, second, false);
        assert!(res.is_err());
        assert_eq!(list.len(), 1);
    }

    // AR-19 (RN-02)
    #[test]
    fn test_rn02_reject_duplicate_channel_slug_config() {
        let mut list = vec![make_cfg("r1", "acc1", Platform::Twitch, false, Some("xqc"))];
        let dup = make_cfg("r2", "acc1", Platform::Twitch, false, Some("XQC"));
        let res = apply_add_auto_redeem_rules(&mut list, dup, false);
        assert!(res.is_err());
        assert_eq!(list.len(), 1);
    }

    // AR-15 (RN-02 múltiplas streams diferentes)
    #[test]
    fn test_multiple_redeems_same_account_different_channels() {
        let mut list = vec![make_cfg("r1", "acc1", Platform::Twitch, false, Some("xqc"))];
        let other = make_cfg("r2", "acc1", Platform::Twitch, false, Some("gaules"));
        let res = apply_add_auto_redeem_rules(&mut list, other, false);
        assert!(res.is_ok());
        assert_eq!(list.len(), 2);
    }

    // AR-20 (RN-03)
    #[test]
    fn test_rn03_global_replaces_specific_configs() {
        let mut list = vec![
            make_cfg("r1", "acc1", Platform::Twitch, false, Some("xqc")),
            make_cfg("r2", "acc1", Platform::Twitch, false, Some("gaules")),
            make_cfg("r3", "acc2", Platform::Kick, false, Some("pokeidle")),
        ];
        let global = make_cfg("r_global", "acc1", Platform::Twitch, true, None);
        let removed = apply_add_auto_redeem_rules(&mut list, global, true)
            .expect("deveria substituir configs específicas de acc1");
        assert_eq!(removed, vec!["r1".to_string(), "r2".to_string()]);
        assert_eq!(list.len(), 2); // r3 (acc2) + r_global (acc1)
        assert!(list.iter().any(|c| c.id == "r_global" && c.all_channels));
        assert!(list.iter().any(|c| c.id == "r3"));
    }

    // AR-21, AR-22, AR-23
    #[test]
    fn test_matches_channel_logic() {
        let global = make_cfg("g", "acc1", Platform::Twitch, true, None);
        assert!(global.matches_channel("qualquer_canal"));
        assert!(global.matches_channel("gaules"));

        let specific = make_cfg("s", "acc1", Platform::Twitch, false, Some("xqc"));
        assert!(specific.matches_channel("xqc"));
        assert!(specific.matches_channel("#XQC"));
        assert!(!specific.matches_channel("pokeidle"));
    }

    #[test]
    fn test_parse_points_balance_formats() {
        assert_eq!(parse_points_balance("2450"), Some(2450));
        assert_eq!(parse_points_balance("2.450"), Some(2450));
        assert_eq!(parse_points_balance(""), None);
    }

    // AR-25
    #[test]
    fn test_catalog_reward_title_match_case_insensitive() {
        let rewards = vec![
            ("uuid-1h".to_string(), "Bônus +15% XP PokeIdle".to_string(), 300),
            ("uuid-10h".to_string(), "Bônus +15% XP PokeIdle (10h)".to_string(), 3000),
        ];
        let found = find_reward_id_by_name(&rewards, "bônus +15% xp pokeidle (10h)", 3000);
        assert_eq!(found, Some("uuid-10h".to_string()));
    }

    // AR-26
    #[test]
    fn test_catalog_reward_title_fallback_by_cost() {
        let rewards = vec![
            ("uuid-hydrate".to_string(), "Beber Água".to_string(), 3000),
            ("uuid-xp10".to_string(), "Bonus XP PokeIdle (10h)".to_string(), 3000),
        ];
        let found = find_reward_id_by_name(&rewards, "Bônus +15% XP PokeIdle (10h)", 3000);
        assert_eq!(found, Some("uuid-xp10".to_string()));
    }

    // AR-27
    #[test]
    fn test_catalog_reward_not_found_returns_none() {
        let rewards = vec![
            ("uuid-hydrate".to_string(), "Hydrate".to_string(), 300),
            ("uuid-other".to_string(), "Destacar Mensagem".to_string(), 500),
        ];
        assert_eq!(
            find_reward_id_by_name(&rewards, "Bônus +15% Secret Lure (10h)", 10000),
            None
        );
        // Mesmo custo (300), mas título totalmente diferente não deve dar falso positivo
        assert_eq!(
            find_reward_id_by_name(&rewards, "Bônus +15% XP PokeIdle", 300),
            None
        );
    }

    // AR-28
    #[test]
    fn test_duration_cooldown_calculation() {
        assert_eq!(compute_duration_cooldown_secs(Some(10.0)), 10 * 3600 - 60);
        assert_eq!(compute_duration_cooldown_secs(Some(1.0)), 3600 - 60);
        assert_eq!(compute_duration_cooldown_secs(None), 5);

        let mut cfg = make_cfg("c1", "acc1", Platform::Twitch, false, Some("gaules"));
        let redeemed_at = 1_700_000_000;
        let (_, next_at, reached) = record_redeem_success_on_config(&mut cfg, "gaules", redeemed_at, Some(10.0));
        assert!(!reached);
        assert_eq!(next_at, Some(redeemed_at + 10 * 3600 - 60));
        assert_eq!(cfg.next_available_at, Some(redeemed_at + 10 * 3600 - 60));
    }

    // AR-29
    #[test]
    fn test_accumulated_hours_increments_on_success() {
        let mut cfg = make_cfg("c1", "acc1", Platform::Twitch, true, None);
        assert_eq!(cfg.accumulated_hours, 0.0);
        record_redeem_success_on_config(&mut cfg, "stream1", 1_700_000_000, Some(10.0));
        assert!((cfg.accumulated_hours - 10.0).abs() < 1e-6);
        assert_eq!(cfg.total_redeems, 1);
    }

    // AR-30
    #[test]
    fn test_duration_mode_pauses_on_goal() {
        let mut cfg = make_cfg("c1", "acc1", Platform::Twitch, true, None);
        cfg.redeem_mode = RedeemMode::Duration;
        cfg.target_duration_hours = Some(20.0);
        cfg.duration_hours = Some(10.0);

        let (_, _, reached1) = record_redeem_success_on_config(&mut cfg, "stream1", 1_700_000_000, Some(10.0));
        assert!(!reached1);
        assert!(cfg.enabled);
        assert!((cfg.accumulated_hours - 10.0).abs() < 1e-6);

        let (_, _, reached2) = record_redeem_success_on_config(&mut cfg, "stream2", 1_700_005_000, Some(10.0));
        assert!(reached2);
        assert!(!cfg.enabled); // Q2: pausado ao atingir a meta, mantido na lista
        assert!((cfg.accumulated_hours - 20.0).abs() < 1e-6);
    }

    // AR-31
    #[test]
    fn test_forever_mode_never_pauses() {
        let mut cfg = make_cfg("c1", "acc1", Platform::Twitch, true, None);
        cfg.redeem_mode = RedeemMode::Forever;
        for i in 0..10 {
            let (_, _, reached) =
                record_redeem_success_on_config(&mut cfg, "stream1", 1_700_000_000 + i * 36000, Some(10.0));
            assert!(!reached);
            assert!(cfg.enabled);
        }
        assert_eq!(cfg.total_redeems, 10);
    }

    // AR-32
    #[test]
    fn test_reward_id_cache_hit_and_invalidation_detection() {
        let mut cfg = make_cfg("c1", "acc1", Platform::Twitch, true, None);
        cfg.reward_id = None;
        let key = reward_cache_key("Gaules", "Bônus +15% XP PokeIdle (10h)");
        cfg.resolved_reward_ids.insert(key, "cached-uuid-999".to_string());

        let hit = lookup_cached_reward_id(&cfg, "gaules", "bônus +15% xp pokeidle (10h)");
        assert_eq!(hit, Some("cached-uuid-999".to_string()));

        // Valida detecção de erro para auto-invalidação (Q1)
        let err_resp = json!({ "errors": [{ "message": "CUSTOM_REWARD_NOT_FOUND" }] });
        let err = parse_twitch_redeem_response(&err_resp).unwrap_err();
        assert!(matches!(err, RedeemError::RewardNotFound(_)));
        assert!(is_reward_not_found_error(&err));
    }

    // AR-33
    #[test]
    fn test_parse_twitch_rewards_list_response() {
        let resp = json!({
            "data": {
                "user": {
                    "id": "190359081",
                    "channel": {
                        "id": "190359081",
                        "communityPointsSettings": {
                            "customRewards": [
                                { "id": "rw-1", "title": "Bônus +15% XP PokeIdle", "cost": 300, "isEnabled": true, "isPaused": false },
                                { "id": "rw-paused", "title": "Pausado", "cost": 500, "isEnabled": true, "isPaused": true },
                                { "id": "rw-off", "title": "Desativado", "cost": 100, "isEnabled": false, "isPaused": false },
                                { "id": "rw-2", "title": "Bônus de +15% Secret Lure (10h)", "cost": 10000 }
                            ]
                        }
                    }
                }
            }
        });
        let parsed = parse_twitch_rewards_list_response(&resp);
        assert_eq!(parsed.len(), 2);
        assert_eq!(parsed[0], ("rw-1".to_string(), "Bônus +15% XP PokeIdle".to_string(), 300));
        assert_eq!(parsed[1], ("rw-2".to_string(), "Bônus de +15% Secret Lure (10h)".to_string(), 10000));
    }

    // AR-34
    #[test]
    fn test_parse_kick_rewards_list_response() {
        let body = r#"{
            "data": [
                { "id": 101, "title": "Bônus +15% XP PokeIdle", "cost": 200, "is_enabled": true },
                { "id": "102", "title": "Desabilitado", "cost": 500, "is_enabled": false },
                { "id": 103, "title": "Bônus de +15% Capture Boost (5h)", "cost": 2500 }
            ]
        }"#;
        let parsed = parse_kick_rewards_list_response(200, body).expect("deveria parsear Kick rewards");
        assert_eq!(parsed.len(), 2);
        assert_eq!(parsed[0], ("101".to_string(), "Bônus +15% XP PokeIdle".to_string(), 200));
        assert_eq!(parsed[1], ("103".to_string(), "Bônus de +15% Capture Boost (5h)".to_string(), 2500));
    }

    // AR-35
    #[test]
    fn test_config_backward_compat_reward_id_optional() {
        let old_json = r#"{
            "id": "ar-legacy",
            "account_id": "acc1",
            "platform": "twitch",
            "all_channels": false,
            "channel_slug": "xqc",
            "reward_id": "legacy-uuid-123",
            "reward_title": "XP 10h",
            "cost": 3000
        }"#;
        let parsed: AutoRedeemConfig = serde_json::from_str(old_json).expect("deveria desserializar legado");
        assert_eq!(parsed.reward_id, Some("legacy-uuid-123".to_string()));
        assert_eq!(parsed.redeem_mode, RedeemMode::Forever);
        assert_eq!(parsed.accumulated_hours, 0.0);
        assert!(parsed.resolved_reward_ids.is_empty());
    }

    // AR-36
    #[test]
    fn test_config_new_catalog_mode_reward_id_none() {
        let twitch_json = r#"{
            "id": "ar-cat",
            "account_id": "acc1",
            "platform": "twitch",
            "all_channels": true,
            "reward_title": "Bônus +15% XP PokeIdle (10h)",
            "cost": 3000,
            "duration_hours": 10.0,
            "redeem_mode": "duration",
            "target_duration_hours": 20.0
        }"#;
        let parsed: AutoRedeemConfig = serde_json::from_str(twitch_json).expect("deveria desserializar catálogo");
        assert_eq!(parsed.reward_id, None);
        assert_eq!(parsed.redeem_mode, RedeemMode::Duration);
        assert_eq!(parsed.target_duration_hours, Some(20.0));

        // Twitch sem reward_id passa nas regras
        let mut list = Vec::new();
        assert!(apply_add_auto_redeem_rules(&mut list, parsed, false).is_ok());

        // Kick sem reward_id é rejeitada conforme Q4
        let mut kick_cfg = make_cfg("ar-k", "acc2", Platform::Kick, true, None);
        kick_cfg.reward_id = None;
        let mut kick_list = Vec::new();
        assert!(apply_add_auto_redeem_rules(&mut kick_list, kick_cfg, false).is_err());
    }

    // AR-37
    #[test]
    fn test_redeem_mode_default_is_forever() {
        assert_eq!(RedeemMode::default(), RedeemMode::Forever);
    }

    // AR-38 (Q3)
    #[test]
    fn test_rust_catalog_completeness_and_duration_planner() {
        assert_eq!(REWARD_CATALOG.len(), 24);
        assert_eq!(
            REWARD_CATALOG.iter().filter(|r| r.platform == Platform::Twitch).count(),
            12
        );
        assert_eq!(
            REWARD_CATALOG.iter().filter(|r| r.platform == Platform::Kick).count(),
            12
        );

        let plan = plan_duration_redeems(Platform::Twitch, BonusType::Xp, 7.0, 5000)
            .expect("deveria gerar plano 7h");
        assert_eq!(plan.total_hours, 7.0);
        assert_eq!(plan.total_cost, 2100);
        assert!(plan.enough_points);
        assert_eq!(plan.steps.len(), 2); // 5h (x1) + 1h (x2)
        assert_eq!(plan.steps[0].duration_hours, 5.0);
        assert_eq!(plan.steps[0].count, 1);
        assert_eq!(plan.steps[1].duration_hours, 1.0);
        assert_eq!(plan.steps[1].count, 2);
    }

    // AR-39 (seleção automática considerando horas restantes + pontos por live)
    #[test]
    fn test_pick_catalog_reward_for_budget_respects_balance_and_remaining() {
        // Restam 7h e saldo 1000 pts -> 10h (>7h), 5h (1500 > 1000) -> escolhe 3h (900 <= 1000)
        let p1 = pick_catalog_reward_for_budget(Platform::Twitch, BonusType::Xp, 7.0, 1000)
            .expect("deveria escolher 3h");
        assert_eq!(p1.duration_hours, 3.0);
        assert_eq!(p1.cost, 900);

        // Restam 2h e saldo 5000 pts -> nunca excede 2h (pula 3h/5h/10h), escolhe 1h
        let p2 = pick_catalog_reward_for_budget(Platform::Twitch, BonusType::Xp, 2.0, 5000)
            .expect("deveria escolher 1h sem exceder");
        assert_eq!(p2.duration_hours, 1.0);

        // Saldo insuficiente até para o menor (300 pts) -> None
        assert!(pick_catalog_reward_for_budget(Platform::Twitch, BonusType::Xp, 5.0, 250).is_none());
    }

    // AR-40 (payload moderno redeemCommunityPointsCustomReward)
    #[test]
    fn test_twitch_community_points_custom_reward_response_parsing() {
        let ok_resp = json!({
            "data": {
                "redeemCommunityPointsCustomReward": {
                    "redemption": {
                        "id": "cp-redemp-456",
                        "status": "FULFILLED"
                    },
                    "error": null
                }
            }
        });
        let res = parse_twitch_redeem_response(&ok_resp).expect("deveria parsear sucesso moderno");
        assert_eq!(res.redemption_id, "cp-redemp-456");

        let err_resp = json!({
            "data": {
                "redeemCommunityPointsCustomReward": {
                    "redemption": null,
                    "error": { "code": "NOT_ENOUGH_POINTS" }
                }
            }
        });
        let err = parse_twitch_redeem_response(&err_resp).unwrap_err();
        assert!(matches!(err, RedeemError::InsufficientPoints { .. }));

        let mismatch_err = RedeemError::Unknown("PROPERTIES_MISMATCH".to_string());
        assert!(is_reward_not_found_error(&mismatch_err));

        // Resposta real da Twitch para persistedQuery RedeemCustomReward quando sucesso sem campo `redemption`
        let persisted_ok = json!({
            "data": {
                "redeemCommunityPointsCustomReward": {
                    "__typename": "RedeemCommunityPointsCustomRewardPayload",
                    "error": null
                }
            }
        });
        let ok_res = parse_twitch_redeem_response(&persisted_ok)
            .expect("error: null no payload deve ser tratado como sucesso");
        assert_eq!(ok_res.redemption_id, "twitch_ok");
    }
}
