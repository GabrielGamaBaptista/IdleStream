use crate::accounts::models::{AccountHealthState, AccountHealthStatus};
use crate::accounts::session_sync::decode_kick_session_token_for_bearer;
use crate::config::Account;
use crate::twitch::gql::{BROWSER_USER_AGENT, TWITCH_GQL_URL, TWITCH_WEB_CLIENT_ID};
use chrono::Utc;
use serde_json::json;

const KICK_USER_URL: &str = "https://kick.com/api/v1/user";
const TWITCH_VALIDATE_URL: &str = "https://id.twitch.tv/oauth2/validate";
const KICK_BROWSER_UA: &str =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum KickAuthProbeResult {
    Authenticated {
        username: Option<String>,
        user_id: Option<u64>,
    },
    Unauthorized,
    RateLimited,
    UnexpectedHttp(u16),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TwitchAuthProbeResult {
    Authenticated {
        username: String,
        user_id: String,
    },
    Unauthorized,
    RateLimited,
    UnexpectedHttp(u16),
}

pub fn parse_kick_user_response(status: u16, body: &str) -> KickAuthProbeResult {
    if status == 401 || status == 403 {
        return KickAuthProbeResult::Unauthorized;
    }
    if status == 429 {
        return KickAuthProbeResult::RateLimited;
    }

    let trimmed = body.trim();
    if trimmed.contains("\"Unauthenticated\"") || trimmed.contains("\"Unauthorized\"") {
        return KickAuthProbeResult::Unauthorized;
    }

    if (200..=299).contains(&status) {
        if trimmed.is_empty() || trimmed == "{}" || trimmed == "[]" {
            return KickAuthProbeResult::Unauthorized;
        }
        let Ok(v) = serde_json::from_str::<serde_json::Value>(trimmed) else {
            return KickAuthProbeResult::UnexpectedHttp(status);
        };
        let obj = v.get("data").filter(|d| d.is_object()).unwrap_or(&v);
        let user_id = obj.get("id").and_then(|x| x.as_u64()).filter(|&id| id > 0);
        let username = obj
            .get("username")
            .and_then(|x| x.as_str())
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string());

        if user_id.is_none() && username.is_none() {
            return KickAuthProbeResult::Unauthorized;
        }

        return KickAuthProbeResult::Authenticated { username, user_id };
    }

    KickAuthProbeResult::UnexpectedHttp(status)
}

pub fn parse_twitch_gql_user_response(status: u16, body: &str) -> TwitchAuthProbeResult {
    if status == 401 || status == 403 {
        return TwitchAuthProbeResult::Unauthorized;
    }
    if status == 429 {
        return TwitchAuthProbeResult::RateLimited;
    }

    let trimmed = body.trim();
    if (200..=299).contains(&status) {
        let Ok(v) = serde_json::from_str::<serde_json::Value>(trimmed) else {
            return TwitchAuthProbeResult::UnexpectedHttp(status);
        };
        let cu = v.pointer("/data/currentUser");
        match cu {
            Some(user) if user.is_object() => {
                let user_id = user
                    .get("id")
                    .and_then(|x| x.as_str())
                    .map(str::trim)
                    .filter(|s| !s.is_empty())
                    .map(|s| s.to_string());
                let username = user
                    .get("login")
                    .and_then(|x| x.as_str())
                    .or_else(|| user.get("displayName").and_then(|x| x.as_str()))
                    .map(str::trim)
                    .filter(|s| !s.is_empty())
                    .map(|s| s.to_string());

                if let (Some(uid), Some(uname)) = (user_id, username) {
                    return TwitchAuthProbeResult::Authenticated {
                        username: uname,
                        user_id: uid,
                    };
                }
                return TwitchAuthProbeResult::Unauthorized;
            }
            Some(_) => return TwitchAuthProbeResult::Unauthorized,
            None => return TwitchAuthProbeResult::Unauthorized,
        }
    }

    TwitchAuthProbeResult::UnexpectedHttp(status)
}

pub fn parse_twitch_oauth_validate_response(status: u16, body: &str) -> TwitchAuthProbeResult {
    if status == 401 || status == 403 {
        return TwitchAuthProbeResult::Unauthorized;
    }
    if status == 429 {
        return TwitchAuthProbeResult::RateLimited;
    }

    let trimmed = body.trim();
    if (200..=299).contains(&status) {
        let Ok(v) = serde_json::from_str::<serde_json::Value>(trimmed) else {
            return TwitchAuthProbeResult::UnexpectedHttp(status);
        };
        let user_id = v
            .get("user_id")
            .and_then(|x| x.as_str())
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string());
        let username = v
            .get("login")
            .and_then(|x| x.as_str())
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string());

        if let (Some(uid), Some(uname)) = (user_id, username) {
            return TwitchAuthProbeResult::Authenticated {
                username: uname,
                user_id: uid,
            };
        }
        return TwitchAuthProbeResult::Unauthorized;
    }

    TwitchAuthProbeResult::UnexpectedHttp(status)
}

fn check_username_match(configured: &str, authenticated: Option<&str>) -> Option<bool> {
    let cfg = configured.trim();
    let auth = authenticated.map(str::trim).filter(|s| !s.is_empty())?;
    if cfg.is_empty() {
        return Some(true);
    }
    Some(cfg.eq_ignore_ascii_case(auth))
}

pub fn evaluate_kick_probe_result(
    account: &Account,
    probe: KickAuthProbeResult,
    http_status: Option<u16>,
    checked_at: i64,
) -> AccountHealthStatus {
    let has_ks = account
        .kick_session
        .as_deref()
        .map(|s| !s.trim().is_empty())
        .unwrap_or(false);
    let has_st = account
        .session_token
        .as_deref()
        .map(|s| !s.trim().is_empty())
        .unwrap_or(false);

    match probe {
        KickAuthProbeResult::Authenticated { username, .. } => {
            let username_matches = check_username_match(&account.username, username.as_deref());
            if !has_ks {
                return AccountHealthStatus {
                    account_id: account.id.clone(),
                    platform: account.platform,
                    label: account.label.clone(),
                    username: account.username.clone(),
                    state: AccountHealthState::Invalid,
                    authenticated_username: username,
                    username_matches,
                    has_redeem_session: false,
                    http_status,
                    message: "Cookie kick_session ausente para resgate WebView. Refaça a captura de sessão.".into(),
                    checked_at,
                    requires_reauth: true,
                };
            }

            let msg = match (&username, username_matches) {
                (Some(auth_name), Some(false)) => format!(
                    "Conectada como @{} (configurado: @{})",
                    auth_name, account.username
                ),
                (Some(auth_name), _) => format!("Conectada (@{}) e pronta para resgates", auth_name),
                (None, _) => "Sessão Kick ativa e pronta para resgates".into(),
            };

            AccountHealthStatus {
                account_id: account.id.clone(),
                platform: account.platform,
                label: account.label.clone(),
                username: account.username.clone(),
                state: AccountHealthState::Healthy,
                authenticated_username: username,
                username_matches,
                has_redeem_session: true,
                http_status,
                message: msg,
                checked_at,
                requires_reauth: false,
            }
        }
        KickAuthProbeResult::Unauthorized => AccountHealthStatus {
            account_id: account.id.clone(),
            platform: account.platform,
            label: account.label.clone(),
            username: account.username.clone(),
            state: AccountHealthState::Invalid,
            authenticated_username: None,
            username_matches: None,
            has_redeem_session: has_ks && has_st,
            http_status,
            message: "Sessão da Kick expirada ou desconectada. Refaça o login nesta conta.".into(),
            checked_at,
            requires_reauth: true,
        },
        KickAuthProbeResult::RateLimited => AccountHealthStatus {
            account_id: account.id.clone(),
            platform: account.platform,
            label: account.label.clone(),
            username: account.username.clone(),
            state: AccountHealthState::RateLimited,
            authenticated_username: None,
            username_matches: None,
            has_redeem_session: has_ks && has_st,
            http_status,
            message: "Limite temporário (HTTP 429) da Kick durante verificação. Tentará novamente em breve.".into(),
            checked_at,
            requires_reauth: false,
        },
        KickAuthProbeResult::UnexpectedHttp(code) => AccountHealthStatus {
            account_id: account.id.clone(),
            platform: account.platform,
            label: account.label.clone(),
            username: account.username.clone(),
            state: AccountHealthState::NetworkError,
            authenticated_username: None,
            username_matches: None,
            has_redeem_session: has_ks && has_st,
            http_status: http_status.or(Some(code)),
            message: format!("Resposta inesperada HTTP {} ao verificar conta Kick.", code),
            checked_at,
            requires_reauth: false,
        },
    }
}

pub async fn verify_kick_account(account: &Account) -> AccountHealthStatus {
    let now = Utc::now().timestamp();
    let has_ks = account
        .kick_session
        .as_deref()
        .map(|s| !s.trim().is_empty())
        .unwrap_or(false);
    let bearer_raw = account.session_token.as_deref().unwrap_or("").trim();
    let bearer = decode_kick_session_token_for_bearer(bearer_raw);

    if bearer.is_empty() {
        return AccountHealthStatus {
            account_id: account.id.clone(),
            platform: account.platform,
            label: account.label.clone(),
            username: account.username.clone(),
            state: AccountHealthState::MissingCredentials,
            authenticated_username: None,
            username_matches: None,
            has_redeem_session: false,
            http_status: None,
            message: if has_ks {
                "Cookie session_token ausente. Capture novamente a sessão na Kick.".into()
            } else {
                "Login na Kick pendente. Abra a janela de login e capture a sessão.".into()
            },
            checked_at: now,
            requires_reauth: true,
        };
    }

    let auth_header = format!("Bearer {}", bearer);
    let headers = [
        ("Authorization", auth_header.as_str()),
        ("Accept", "application/json"),
        ("Referer", "https://kick.com/"),
        ("Origin", "https://kick.com"),
        ("User-Agent", KICK_BROWSER_UA),
    ];

    match crate::kick::http::kick_http_request("GET", KICK_USER_URL, Some(&headers), None, 10).await
    {
        Ok((status, body)) => {
            let probe = parse_kick_user_response(status, &body);
            evaluate_kick_probe_result(account, probe, Some(status), now)
        }
        Err(err) => AccountHealthStatus {
            account_id: account.id.clone(),
            platform: account.platform,
            label: account.label.clone(),
            username: account.username.clone(),
            state: AccountHealthState::NetworkError,
            authenticated_username: None,
            username_matches: None,
            has_redeem_session: has_ks,
            http_status: None,
            message: format!("Erro de rede ao verificar Kick: {}", err),
            checked_at: now,
            requires_reauth: false,
        },
    }
}

pub async fn verify_twitch_account(http: &reqwest::Client, account: &Account) -> AccountHealthStatus {
    let now = Utc::now().timestamp();
    let clean_token = account
        .oauth_token
        .as_deref()
        .map(|t| t.trim_start_matches("oauth:").trim().to_string())
        .unwrap_or_default();

    if clean_token.is_empty() {
        return AccountHealthStatus {
            account_id: account.id.clone(),
            platform: account.platform,
            label: account.label.clone(),
            username: account.username.clone(),
            state: AccountHealthState::MissingCredentials,
            authenticated_username: None,
            username_matches: None,
            has_redeem_session: false,
            http_status: None,
            message: "Token OAuth da Twitch ausente. Faça login ou salve sua sessão.".into(),
            checked_at: now,
            requires_reauth: true,
        };
    }

    // 1. Primary probe via GQL currentUser (works both with web auth-token cookies and first-party tokens)
    let gql_query = json!({
        "query": "query { currentUser { id login displayName } }"
    });

    let gql_resp = http
        .post(TWITCH_GQL_URL)
        .header("Client-Id", TWITCH_WEB_CLIENT_ID)
        .header("Authorization", format!("OAuth {}", clean_token))
        .header("User-Agent", BROWSER_USER_AGENT)
        .json(&gql_query)
        .send()
        .await;

    let mut primary_http_status: Option<u16> = None;
    let mut primary_network_err: Option<String> = None;

    let primary_probe = match gql_resp {
        Ok(resp) => {
            let code = resp.status().as_u16();
            primary_http_status = Some(code);
            let body = resp.text().await.unwrap_or_default();
            parse_twitch_gql_user_response(code, &body)
        }
        Err(e) => {
            primary_network_err = Some(e.to_string());
            TwitchAuthProbeResult::UnexpectedHttp(0)
        }
    };

    if let TwitchAuthProbeResult::Authenticated { username, .. } = primary_probe {
        let username_matches = check_username_match(&account.username, Some(&username));
        let msg = if username_matches == Some(false) {
            format!(
                "Conectada como @{} (configurado: @{})",
                username, account.username
            )
        } else {
            format!("Conectada (@{}) e pronta para resgates", username)
        };
        return AccountHealthStatus {
            account_id: account.id.clone(),
            platform: account.platform,
            label: account.label.clone(),
            username: account.username.clone(),
            state: AccountHealthState::Healthy,
            authenticated_username: Some(username),
            username_matches,
            has_redeem_session: true,
            http_status: primary_http_status,
            message: msg,
            checked_at: now,
            requires_reauth: false,
        };
    }

    // 2. Fallback probe via official /oauth2/validate (for external third-party OAuth tokens)
    let val_resp = http
        .get(TWITCH_VALIDATE_URL)
        .header("Authorization", format!("OAuth {}", clean_token))
        .header("User-Agent", BROWSER_USER_AGENT)
        .send()
        .await;

    match val_resp {
        Ok(resp) => {
            let code = resp.status().as_u16();
            let body = resp.text().await.unwrap_or_default();
            match parse_twitch_oauth_validate_response(code, &body) {
                TwitchAuthProbeResult::Authenticated { username, .. } => {
                    let username_matches = check_username_match(&account.username, Some(&username));
                    let msg = if username_matches == Some(false) {
                        format!(
                            "Conectada via OAuth como @{} (configurado: @{})",
                            username, account.username
                        )
                    } else {
                        format!("Conectada (@{})", username)
                    };
                    AccountHealthStatus {
                        account_id: account.id.clone(),
                        platform: account.platform,
                        label: account.label.clone(),
                        username: account.username.clone(),
                        state: AccountHealthState::Healthy,
                        authenticated_username: Some(username),
                        username_matches,
                        has_redeem_session: true,
                        http_status: Some(code),
                        message: msg,
                        checked_at: now,
                        requires_reauth: false,
                    }
                }
                TwitchAuthProbeResult::Unauthorized => AccountHealthStatus {
                    account_id: account.id.clone(),
                    platform: account.platform,
                    label: account.label.clone(),
                    username: account.username.clone(),
                    state: AccountHealthState::Invalid,
                    authenticated_username: None,
                    username_matches: None,
                    has_redeem_session: false,
                    http_status: Some(code),
                    message: "Token da Twitch expirado ou revogado. Refaça o login nesta conta.".into(),
                    checked_at: now,
                    requires_reauth: true,
                },
                TwitchAuthProbeResult::RateLimited => AccountHealthStatus {
                    account_id: account.id.clone(),
                    platform: account.platform,
                    label: account.label.clone(),
                    username: account.username.clone(),
                    state: AccountHealthState::RateLimited,
                    authenticated_username: None,
                    username_matches: None,
                    has_redeem_session: true,
                    http_status: Some(code),
                    message: "Limite temporário da Twitch ao validar token.".into(),
                    checked_at: now,
                    requires_reauth: false,
                },
                TwitchAuthProbeResult::UnexpectedHttp(val_code) => {
                    if matches!(primary_probe, TwitchAuthProbeResult::Unauthorized) {
                        AccountHealthStatus {
                            account_id: account.id.clone(),
                            platform: account.platform,
                            label: account.label.clone(),
                            username: account.username.clone(),
                            state: AccountHealthState::Invalid,
                            authenticated_username: None,
                            username_matches: None,
                            has_redeem_session: false,
                            http_status: primary_http_status,
                            message: "Sessão da Twitch inválida ou desconectada. Refaça o login.".into(),
                            checked_at: now,
                            requires_reauth: true,
                        }
                    } else {
                        AccountHealthStatus {
                            account_id: account.id.clone(),
                            platform: account.platform,
                            label: account.label.clone(),
                            username: account.username.clone(),
                            state: AccountHealthState::NetworkError,
                            authenticated_username: None,
                            username_matches: None,
                            has_redeem_session: true,
                            http_status: Some(val_code),
                            message: format!("Erro HTTP {} ao validar conta Twitch.", val_code),
                            checked_at: now,
                            requires_reauth: false,
                        }
                    }
                }
            }
        }
        Err(e) => {
            if matches!(primary_probe, TwitchAuthProbeResult::Unauthorized) {
                AccountHealthStatus {
                    account_id: account.id.clone(),
                    platform: account.platform,
                    label: account.label.clone(),
                    username: account.username.clone(),
                    state: AccountHealthState::Invalid,
                    authenticated_username: None,
                    username_matches: None,
                    has_redeem_session: false,
                    http_status: primary_http_status,
                    message: "Sessão da Twitch inválida ou desconectada. Refaça o login.".into(),
                    checked_at: now,
                    requires_reauth: true,
                }
            } else {
                AccountHealthStatus {
                    account_id: account.id.clone(),
                    platform: account.platform,
                    label: account.label.clone(),
                    username: account.username.clone(),
                    state: AccountHealthState::NetworkError,
                    authenticated_username: None,
                    username_matches: None,
                    has_redeem_session: true,
                    http_status: primary_http_status,
                    message: format!(
                        "Erro de rede ao verificar Twitch: {}",
                        primary_network_err.unwrap_or_else(|| e.to_string())
                    ),
                    checked_at: now,
                    requires_reauth: false,
                }
            }
        }
    }
}
