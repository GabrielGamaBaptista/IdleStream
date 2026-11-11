use crate::accounts::models::*;
use crate::accounts::session_sync::*;
use crate::accounts::verifier::*;
use crate::config::{Account, Platform};
use std::collections::HashMap;

fn make_kick_account(id: &str, label: &str, username: &str, kick_session: Option<&str>, session_token: Option<&str>) -> Account {
    Account {
        id: id.into(),
        platform: Platform::Kick,
        label: label.into(),
        username: username.into(),
        oauth_token: None,
        kick_session: kick_session.map(|s| s.to_string()),
        xsrf_token: Some("xsrf_abc".into()),
        session_token: session_token.map(|s| s.to_string()),
        enabled: true,
    }
}

fn make_twitch_account(id: &str, label: &str, username: &str, oauth_token: Option<&str>) -> Account {
    Account {
        id: id.into(),
        platform: Platform::Twitch,
        label: label.into(),
        username: username.into(),
        oauth_token: oauth_token.map(|s| s.to_string()),
        kick_session: None,
        xsrf_token: None,
        session_token: None,
        enabled: true,
    }
}

#[test]
fn test_kick_user_empty_object_http_200_is_unauthorized() {
    // TDD-01: https://kick.com/api/v1/user retorna HTTP 200 com `{}` quando o token e invalido!
    let res = parse_kick_user_response(200, "{}");
    assert_eq!(res, KickAuthProbeResult::Unauthorized);

    let res_ws = parse_kick_user_response(200, "  { } \n");
    assert_eq!(res_ws, KickAuthProbeResult::Unauthorized);

    let res_unauth = parse_kick_user_response(401, r#"{"message":"Unauthenticated."}"#);
    assert_eq!(res_unauth, KickAuthProbeResult::Unauthorized);

    let res_429 = parse_kick_user_response(429, "Too Many Requests");
    assert_eq!(res_429, KickAuthProbeResult::RateLimited);
}

#[test]
fn test_kick_user_valid_json_extracts_username() {
    // TDD-02
    let body = r#"{"id": 98765, "username": "player1", "email": "a@b.com"}"#;
    let res = parse_kick_user_response(200, body);
    assert_eq!(
        res,
        KickAuthProbeResult::Authenticated {
            username: Some("player1".to_string()),
            user_id: Some(98765),
        }
    );
}

#[test]
fn test_kick_missing_kick_session_flags_redeem_incomplete() {
    // TDD-03: Mesmo com Bearer valido, ausencia de kick_session impede resgate WebView.
    let acc = make_kick_account("k1", "Kick 1", "player1", None, Some("12345|validbearer"));
    let status = evaluate_kick_probe_result(
        &acc,
        KickAuthProbeResult::Authenticated {
            username: Some("player1".into()),
            user_id: Some(99),
        },
        Some(200),
        1_700_000_000,
    );
    assert_eq!(status.state, AccountHealthState::Invalid);
    assert!(!status.has_redeem_session);
    assert!(status.requires_reauth);
}

#[test]
fn test_twitch_gql_and_oauth_validate_parsers() {
    // TDD-04
    let gql_ok = r#"{"data":{"currentUser":{"id":"42","login":"streamer_ok","displayName":"Streamer_OK"}}}"#;
    assert_eq!(
        parse_twitch_gql_user_response(200, gql_ok),
        TwitchAuthProbeResult::Authenticated {
            username: "streamer_ok".into(),
            user_id: "42".into(),
        }
    );

    let gql_null = r#"{"data":{"currentUser":null}}"#;
    assert_eq!(parse_twitch_gql_user_response(200, gql_null), TwitchAuthProbeResult::Unauthorized);
    assert_eq!(parse_twitch_gql_user_response(401, r#"{"status":401}"#), TwitchAuthProbeResult::Unauthorized);
    assert_eq!(parse_twitch_gql_user_response(429, "rate limit"), TwitchAuthProbeResult::RateLimited);

    let validate_ok = r#"{"client_id":"abc","login":"ext_user","scopes":[],"user_id":"777","expires_in":3600}"#;
    assert_eq!(
        parse_twitch_oauth_validate_response(200, validate_ok),
        TwitchAuthProbeResult::Authenticated {
            username: "ext_user".into(),
            user_id: "777".into(),
        }
    );
    assert_eq!(
        parse_twitch_oauth_validate_response(401, r#"{"status":401,"message":"invalid access token"}"#),
        TwitchAuthProbeResult::Unauthorized
    );
}

#[test]
fn test_aggregate_eight_accounts_health_summary() {
    // TDD-05: 4 Twitch + 4 Kick = 8 contas monitoradas em tempo integral
    let mut accounts = Vec::new();
    let mut statuses = HashMap::new();

    for i in 1..=4 {
        let tid = format!("tw-{}", i);
        let acc = make_twitch_account(&tid, &format!("Twitch {}", i), &format!("tuser{}", i), Some("tok"));
        statuses.insert(
            tid.clone(),
            AccountHealthStatus {
                account_id: tid,
                platform: Platform::Twitch,
                label: acc.label.clone(),
                username: acc.username.clone(),
                state: AccountHealthState::Healthy,
                authenticated_username: Some(acc.username.clone()),
                username_matches: Some(true),
                has_redeem_session: true,
                http_status: Some(200),
                message: "Conectada".into(),
                checked_at: 1000,
                requires_reauth: false,
            },
        );
        accounts.push(acc);

        let kid = format!("kk-{}", i);
        let kacc = make_kick_account(&kid, &format!("Kick {}", i), &format!("kuser{}", i), Some("ks"), Some("123|st"));
        statuses.insert(
            kid.clone(),
            AccountHealthStatus {
                account_id: kid,
                platform: Platform::Kick,
                label: kacc.label.clone(),
                username: kacc.username.clone(),
                state: AccountHealthState::Healthy,
                authenticated_username: Some(kacc.username.clone()),
                username_matches: Some(true),
                has_redeem_session: true,
                http_status: Some(200),
                message: "Conectada".into(),
                checked_at: 1000,
                requires_reauth: false,
            },
        );
        accounts.push(kacc);
    }

    let ok_summary = aggregate_accounts_health(&accounts, &statuses, 1000);
    assert_eq!(ok_summary.total, 8);
    assert_eq!(ok_summary.healthy, 8);
    assert_eq!(ok_summary.failing, 0);
    assert!(ok_summary.all_healthy);

    // 1 das 8 contas falha -> summary deve refletir exatamente 7 healthy e 1 failing
    if let Some(st) = statuses.get_mut("kk-2") {
        st.state = AccountHealthState::Invalid;
        st.requires_reauth = true;
    }
    let degraded = aggregate_accounts_health(&accounts, &statuses, 1005);
    assert_eq!(degraded.total, 8);
    assert_eq!(degraded.healthy, 7);
    assert_eq!(degraded.failing, 1);
    assert!(!degraded.all_healthy);
}

#[test]
fn test_profile_first_never_overwrites_rotated_kick_cookies() {
    // TDD-06: Quando perfil ja possui cookies validos e persistentes e o hash bate com o ultimo sync,
    // NUNCA sobrescrever cookies rotacionados na Live #1!
    let hash = compute_kick_credentials_hash(Some("ks_orig"), Some("123|st_orig"), Some("xsrf_orig"));
    let profile_cookies = vec![
        StoredCookieSnapshot {
            name: "kick_session".into(),
            value: "ks_rotated_by_server".into(),
            domain: Some(".kick.com".into()),
            path: Some("/".into()),
            http_only: Some(true),
            is_session: false,
        },
        StoredCookieSnapshot {
            name: "session_token".into(),
            value: "123%7Cst_orig".into(),
            domain: Some(".kick.com".into()),
            path: Some("/".into()),
            http_only: Some(false),
            is_session: false,
        },
    ];

    let plan_keep = plan_kick_cookie_seeding(
        &profile_cookies,
        Some("ks_orig"),
        Some("123|st_orig"),
        Some("xsrf_orig"),
        Some(&hash),
    );
    assert!(plan_keep.cookies_to_set.is_empty(), "Profile-First nao deve sobrescrever cookies validos existentes");

    // Se session_token foi perdido (session-only apagado ao fechar live) OU kick_session esta nao-HttpOnly (legado v4.0.0),
    // DEVE limpar cookies degradados e gravar com Max-Age=7776000 + HttpOnly=true em kick_session!
    let degraded_profile = vec![
        StoredCookieSnapshot {
            name: "kick_session".into(),
            value: "ks_shadow_non_httponly".into(),
            domain: Some(".kick.com".into()),
            path: Some("/".into()),
            http_only: Some(false),
            is_session: true,
        },
    ];
    let plan_repair = plan_kick_cookie_seeding(
        &degraded_profile,
        Some("ks_orig"),
        Some("123|st_orig"),
        Some("xsrf_orig"),
        Some(&hash),
    );
    assert_eq!(plan_repair.cookies_to_delete.len(), 1);
    let ks_set = plan_repair
        .cookies_to_set
        .iter()
        .find(|c| c.name == "kick_session")
        .expect("kick_session precisa ser re-gravado");
    assert!(ks_set.http_only, "kick_session DEVE ser HttpOnly");
    assert_eq!(ks_set.max_age_secs, DEFAULT_COOKIE_MAX_AGE_SECS);
}

#[test]
fn test_kick_cookie_encoding_preserves_pct_and_decodes_bearer() {
    // TDD-07
    assert_eq!(decode_kick_session_token_for_bearer("12345%7Cabc"), "12345|abc");
    assert_eq!(decode_kick_session_token_for_bearer("12345|abc"), "12345|abc");
    assert_eq!(encode_kick_session_token_for_cookie("12345|abc"), "12345%7Cabc");
    assert_eq!(encode_kick_session_token_for_cookie("12345%7Cabc"), "12345%7Cabc");
}

#[test]
fn test_kick_cookie_rotation_sync_detects_updated_session() {
    // TDD-08
    let acc = make_kick_account("k1", "Kick 1", "player1", Some("ks_old"), Some("123|st_old"));
    let unchanged = vec![
        StoredCookieSnapshot {
            name: "kick_session".into(),
            value: "ks_old".into(),
            domain: Some(".kick.com".into()),
            path: Some("/".into()),
            http_only: Some(true),
            is_session: false,
        },
        StoredCookieSnapshot {
            name: "session_token".into(),
            value: "123%7Cst_old".into(),
            domain: Some(".kick.com".into()),
            path: Some("/".into()),
            http_only: Some(false),
            is_session: false,
        },
    ];
    assert!(detect_kick_cookie_rotation(&unchanged, &acc).is_none());

    let rotated = vec![
        StoredCookieSnapshot {
            name: "kick_session".into(),
            value: "ks_new_from_live1".into(),
            domain: Some(".kick.com".into()),
            path: Some("/".into()),
            http_only: Some(true),
            is_session: false,
        },
        StoredCookieSnapshot {
            name: "session_token".into(),
            value: "123%7Cst_new".into(),
            domain: Some(".kick.com".into()),
            path: Some("/".into()),
            http_only: Some(false),
            is_session: false,
        },
    ];
    let update = detect_kick_cookie_rotation(&rotated, &acc).expect("Rotacao deve ser detectada");
    assert_eq!(update.kick_session.as_deref(), Some("ks_new_from_live1"));
    assert_eq!(update.session_token.as_deref(), Some("123|st_new"));
}
