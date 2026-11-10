use crate::config::{
    default_vote_accounts, ConfigStore, VoteAccountConfig, DEFAULT_TOPIDLE_GAME_URL,
    VOTE_COOLDOWN_SECONDS,
};
use crate::votes::policy::{
    build_vote_target_url, ensure_google_select_account, is_allowed_vote_navigation,
    next_vote_timestamp, remaining_cooldown_seconds, should_notify_for_vote,
};
use url::Url;

#[test]
fn test_default_vote_accounts_initialization() {
    let accounts = default_vote_accounts();
    assert_eq!(accounts.len(), 4, "Devem existir exatamente 4 contas de voto padrão");

    let expected_names = ["GGB2006", "GGB2006_2", "GGB2006_3", "GGB2006_4"];
    let expected_slots = ["slot-1", "slot-2", "slot-3", "slot-4"];

    for (idx, acc) in accounts.iter().enumerate() {
        assert_eq!(acc.id, format!("vote-{}", idx + 1));
        assert_eq!(acc.label, expected_names[idx]);
        assert_eq!(acc.player_identifier, expected_names[idx]);
        assert_eq!(acc.base_url, DEFAULT_TOPIDLE_GAME_URL);
        assert_eq!(acc.linked_game_slot_id.as_deref(), Some(expected_slots[idx]));
        assert!(acc.share_game_profile);
        assert!(acc.notifications_enabled);
        assert_eq!(acc.total_votes, 0);
        assert_eq!(acc.last_voted_at, None);
    }
}

#[test]
fn test_build_vote_target_url_normalization() {
    let url1 = build_vote_target_url(DEFAULT_TOPIDLE_GAME_URL, "GGB2006_3").unwrap();
    assert_eq!(
        url1.as_str(),
        "https://topidle.com/jogo/pokeidle-io-5f9969?playerIdentifier=GGB2006_3"
    );

    // Mesmo que a URL base já contenha playerIdentifier antigo, deve substituir sem duplicar
    let url2 = build_vote_target_url(
        "https://topidle.com/jogo/pokeidle-io-5f9969?playerIdentifier=OLD&ref=idle",
        "GGB2006_4",
    )
    .unwrap();
    assert_eq!(
        url2.as_str(),
        "https://topidle.com/jogo/pokeidle-io-5f9969?ref=idle&playerIdentifier=GGB2006_4"
    );

    // Aceita domínio sem esquema e completa com https://
    let url3 = build_vote_target_url("topidle.com/jogo/pokeidle-io-5f9969", "GGB2006").unwrap();
    assert_eq!(
        url3.as_str(),
        "https://topidle.com/jogo/pokeidle-io-5f9969?playerIdentifier=GGB2006"
    );

    // Rejeita domínios externos e esquemas inseguros
    assert!(build_vote_target_url("https://pokeidle.io/app", "GGB2006").is_err());
    assert!(build_vote_target_url("http://topidle.com/jogo/pokeidle-io-5f9969", "GGB2006").is_err());
    assert!(build_vote_target_url("https://evil-topidle.com/", "GGB2006").is_err());
}

#[test]
fn test_strict_vote_navigation_whitelist() {
    let allow = [
        "https://topidle.com/jogo/pokeidle-io-5f9969?playerIdentifier=GGB2006_3",
        "https://www.topidle.com/api/auth/callback/google",
        "https://accounts.google.com/o/oauth2/v2/auth?client_id=123&redirect_uri=https://topidle.com",
        "https://accounts.youtube.com/accounts/SetSID",
        "https://myaccount.google.com/",
        "https://challenges.cloudflare.com/cdn-cgi/challenge-platform",
        "https://www.google.com/recaptcha/api2/anchor",
        "https://www.recaptcha.net/recaptcha/api2/bframe",
        "https://newassets.hcaptcha.com/captcha/v1/test",
    ];
    for raw in allow {
        let u = Url::parse(raw).unwrap();
        assert!(is_allowed_vote_navigation(&u, false), "Deveria permitir {}", raw);
    }

    assert!(is_allowed_vote_navigation(&Url::parse("about:blank").unwrap(), true));
    assert!(!is_allowed_vote_navigation(&Url::parse("about:blank").unwrap(), false));

    let block = [
        "http://topidle.com/jogo/pokeidle-io-5f9969",
        "https://pokeidle.io/app",
        "https://www.google.com/search?q=pokeidle",
        "https://www.youtube.com/watch?v=123",
        "https://discord.com/invite/pokeidle",
        "https://evil-topidle.com/login",
        "https://topidle.com.attacker.net/phish",
        "javascript:alert(1)",
    ];
    for raw in block {
        let u = Url::parse(raw).unwrap();
        assert!(!is_allowed_vote_navigation(&u, false), "Deveria bloquear {}", raw);
    }
}

#[test]
fn test_ensure_google_select_account() {
    let u1 = Url::parse("https://accounts.google.com/o/oauth2/v2/auth?client_id=123&redirect_uri=https://topidle.com").unwrap();
    let m1 = ensure_google_select_account(&u1).expect("Deve adicionar prompt=select_account");
    assert!(m1.as_str().contains("prompt=select_account"));
    assert!(m1.as_str().contains("client_id=123"));

    let u2 = Url::parse("https://accounts.google.com/o/oauth2/v2/auth?client_id=123&prompt=consent").unwrap();
    let m2 = ensure_google_select_account(&u2).expect("Deve combinar select_account + consent");
    assert!(m2.as_str().contains("select_account+consent") || m2.as_str().contains("select_account%20consent"));

    let u3 = Url::parse("https://accounts.google.com/o/oauth2/v2/auth?client_id=123&prompt=select_account").unwrap();
    assert!(ensure_google_select_account(&u3).is_none());

    let u_challenge = Url::parse("https://accounts.google.com/signin/v2/challenge/pwd").unwrap();
    assert!(ensure_google_select_account(&u_challenge).is_none());

    let u_gsi = Url::parse("https://accounts.google.com/gsi/iframe/select").unwrap();
    assert!(ensure_google_select_account(&u_gsi).is_none());
}

#[test]
fn test_exact_24h_01m_cooldown_and_notification_deduplication() {
    assert_eq!(VOTE_COOLDOWN_SECONDS, 86_460, "Cooldown exato deve ser 24h01m = 86.460s");

    let base_vote_ts: i64 = 1_794_300_000;
    assert_eq!(next_vote_timestamp(base_vote_ts), base_vote_ts + 86_460);

    let mut acc = VoteAccountConfig {
        id: "vote-3".into(),
        label: "GGB2006_3".into(),
        player_identifier: "GGB2006_3".into(),
        base_url: DEFAULT_TOPIDLE_GAME_URL.into(),
        linked_game_slot_id: Some("slot-3".into()),
        share_game_profile: true,
        google_hint: None,
        color: "#F59E0B".into(),
        last_voted_at: Some(base_vote_ts),
        last_notified_for_vote_at: None,
        total_votes: 1,
        notifications_enabled: true,
    };

    // Com exatas 24h (86400s): faltam ainda 60s -> NÃO notifica ainda!
    let at_24h = base_vote_ts + 86_400;
    assert_eq!(remaining_cooldown_seconds(acc.last_voted_at, at_24h), 60);
    assert!(!should_notify_for_vote(&acc, at_24h));

    // Com 24h 00m 59s (86459s): falta 1s -> NÃO notifica!
    let at_24h_59s = base_vote_ts + 86_459;
    assert_eq!(remaining_cooldown_seconds(acc.last_voted_at, at_24h_59s), 1);
    assert!(!should_notify_for_vote(&acc, at_24h_59s));

    // Exatamente em 24h 01m (86460s): liberado -> NOTIFICA!
    let at_24h_01m = base_vote_ts + 86_460;
    assert_eq!(remaining_cooldown_seconds(acc.last_voted_at, at_24h_01m), 0);
    assert!(should_notify_for_vote(&acc, at_24h_01m));

    // Após marcar notificação enviada para este voto, não deve duplicar
    acc.last_notified_for_vote_at = Some(base_vote_ts);
    assert!(!should_notify_for_vote(&acc, at_24h_01m + 300));

    // Novo voto registrado re-arma o próximo ciclo de 24h 01m
    let next_vote_ts = at_24h_01m + 120;
    acc.last_voted_at = Some(next_vote_ts);
    acc.last_notified_for_vote_at = None;
    assert!(!should_notify_for_vote(&acc, next_vote_ts + 86_459));
    assert!(should_notify_for_vote(&acc, next_vote_ts + 86_460));
}

#[test]
fn test_config_store_vote_accounts_migration_and_persistence() {
    let temp_dir = std::env::temp_dir().join(format!("idlestream_vote_test_{}", uuid::Uuid::new_v4()));
    let _ = std::fs::create_dir_all(&temp_dir);
    let config_file = temp_dir.join("test_vote_config.json");

    // 1. Simula config v3.2.8 antiga sem campo vote_accounts
    let legacy_v3 = r#"{
        "accounts": [],
        "streams": [],
        "settings": {
            "minimize_to_tray": true,
            "start_with_windows": false,
            "auto_reconnect": true,
            "reconnect_delay_secs": 10,
            "auto_live_only": true,
            "kick_mute_audio": true,
            "kick_hide_chat": true,
            "kick_lowest_quality": true
        }
    }"#;
    std::fs::write(&config_file, legacy_v3).unwrap();

    let store = ConfigStore::new_with_path(config_file.clone());
    let mut cfg = store.load();
    assert_eq!(cfg.vote_accounts.len(), 4);
    assert_eq!(cfg.vote_accounts[0].player_identifier, "GGB2006");
    assert_eq!(cfg.vote_accounts[1].player_identifier, "GGB2006_2");
    assert_eq!(cfg.vote_accounts[2].player_identifier, "GGB2006_3");
    assert_eq!(cfg.vote_accounts[3].player_identifier, "GGB2006_4");

    // 2. Persiste alteração de voto e valida reload
    cfg.vote_accounts[2].last_voted_at = Some(1_794_346_552);
    cfg.vote_accounts[2].total_votes = 5;
    store.save(&cfg).unwrap();

    let reloaded = store.load();
    assert_eq!(reloaded.vote_accounts[2].last_voted_at, Some(1_794_346_552));
    assert_eq!(reloaded.vote_accounts[2].total_votes, 5);

    let _ = std::fs::remove_dir_all(&temp_dir);
}
