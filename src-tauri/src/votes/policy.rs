use crate::config::{VoteAccountConfig, DEFAULT_TOPIDLE_GAME_URL, VOTE_COOLDOWN_SECONDS};
use url::Url;

/// Constrói e valida a URL de destino do voto no TopIdle, garantindo HTTPS,
/// domínio restrito ao TopIdle e inclusão única de `?playerIdentifier=...`.
pub fn build_vote_target_url(base_url: &str, player_identifier: &str) -> Result<Url, String> {
    let raw = base_url.trim();
    let normalized = if raw.is_empty() {
        DEFAULT_TOPIDLE_GAME_URL.to_string()
    } else if raw.contains("://") {
        raw.to_string()
    } else {
        format!("https://{}", raw.trim_start_matches('/'))
    };

    let mut parsed = Url::parse(&normalized).map_err(|e| format!("URL de voto inválida: {}", e))?;

    if parsed.scheme() != "https" {
        return Err("Somente URLs HTTPS do TopIdle são permitidas nesta seção.".to_string());
    }

    let host = parsed
        .host_str()
        .map(|h| h.to_ascii_lowercase())
        .ok_or_else(|| "Domínio inválido na URL de voto.".to_string())?;

    if host != "topidle.com" && !host.ends_with(".topidle.com") {
        return Err(format!(
            "Domínio não permitido '{}': o navegador de votos aceita apenas topidle.com.",
            host
        ));
    }

    if parsed.path().is_empty() || parsed.path() == "/" {
        parsed.set_path("/jogo/pokeidle-io-5f9969");
    }

    let clean_player = player_identifier.trim();
    let existing_pairs: Vec<(String, String)> = parsed
        .query_pairs()
        .filter(|(k, _)| !k.eq_ignore_ascii_case("playerIdentifier"))
        .map(|(k, v)| (k.into_owned(), v.into_owned()))
        .collect();

    {
        let mut qp = parsed.query_pairs_mut();
        qp.clear();
        for (k, v) in &existing_pairs {
            qp.append_pair(k, v);
        }
        if !clean_player.is_empty() {
            qp.append_pair("playerIdentifier", clean_player);
        }
    }

    if parsed.query() == Some("") {
        parsed.set_query(None);
    }

    Ok(parsed)
}

/// Whitelist rigorosa para navegação top-level da WebView de votos.
/// Permite exclusivamente TopIdle, endpoints de autenticação Google OAuth e frames/desafios de CAPTCHA.
pub fn is_allowed_vote_navigation(url: &Url, is_popup: bool) -> bool {
    if is_popup && url.as_str() == "about:blank" {
        return true;
    }

    if url.scheme() != "https" {
        return false;
    }

    let Some(host_raw) = url.host_str() else {
        return false;
    };
    let host = host_raw.to_ascii_lowercase();
    let path = url.path();

    // 1. Site oficial de votação
    if host == "topidle.com" || host.ends_with(".topidle.com") {
        return true;
    }

    // 2. Autenticação Google OAuth (para usar as 4 contas Google no TopIdle)
    if matches!(
        host.as_str(),
        "accounts.google.com"
            | "accounts.youtube.com"
            | "myaccount.google.com"
            | "gds.google.com"
            | "apis.google.com"
            | "consent.google.com"
            | "consent.youtube.com"
    ) {
        return true;
    }

    // 3. Infraestrutura de CAPTCHA interativo (Turnstile, hCaptcha, reCAPTCHA)
    if host == "challenges.cloudflare.com"
        || host == "hcaptcha.com"
        || host.ends_with(".hcaptcha.com")
        || host == "recaptcha.net"
        || host.ends_with(".recaptcha.net")
        || host.ends_with(".gstatic.com")
    {
        return true;
    }

    if (host == "www.google.com" || host == "google.com") && path.starts_with("/recaptcha") {
        return true;
    }

    false
}

/// Detecta endpoints de autorização OAuth do Google onde `prompt=select_account`
/// deve ser garantido para permitir escolher entre as 4 contas Google sem interferir
/// em fluxos internos de desafio/2FA/GSI.
pub fn ensure_google_select_account(url: &Url) -> Option<Url> {
    let host = url.host_str()?.to_ascii_lowercase();
    if host != "accounts.google.com" {
        return None;
    }

    let lower = url.as_str().to_ascii_lowercase();
    let is_oauth_endpoint = lower.contains("/o/oauth2/")
        || lower.contains("/oauth2/")
        || lower.contains("/signin/oauth");
    let has_oauth_params = lower.contains("response_type=")
        || (lower.contains("client_id=") && lower.contains("redirect_uri="));

    let is_internal_google_nav = lower.contains("/oauthchooseaccount")
        || lower.contains("/signin/v2/challenge")
        || lower.contains("/signin/challenge")
        || lower.contains("/gsi/");

    if !((is_oauth_endpoint || has_oauth_params) && !is_internal_google_nav) {
        return None;
    }

    let mut pairs: Vec<(String, String)> = url
        .query_pairs()
        .map(|(k, v)| (k.into_owned(), v.into_owned()))
        .collect();

    let mut prompt_found = false;
    let mut modified = false;

    for (k, v) in &mut pairs {
        if k.eq_ignore_ascii_case("prompt") {
            prompt_found = true;
            let lower_v = v.to_ascii_lowercase();
            if lower_v.contains("select_account") {
                return None;
            }
            if v.trim().is_empty() {
                *v = "select_account".to_string();
            } else {
                *v = format!("select_account {}", v.trim());
            }
            modified = true;
            break;
        }
    }

    if !prompt_found {
        pairs.push(("prompt".to_string(), "select_account".to_string()));
        modified = true;
    }

    if !modified {
        return None;
    }

    let mut next = url.clone();
    {
        let mut qp = next.query_pairs_mut();
        qp.clear();
        for (k, v) in &pairs {
            qp.append_pair(k, v);
        }
    }
    Some(next)
}

/// Retorna o timestamp Unix (segundos) em que a conta estará liberada (+24h 01m).
pub fn next_vote_timestamp(last_voted_at: i64) -> i64 {
    last_voted_at.saturating_add(VOTE_COOLDOWN_SECONDS)
}

/// Retorna quantos segundos faltam para liberar o próximo voto (`0` se já pronto).
pub fn remaining_cooldown_seconds(last_voted_at: Option<i64>, now_secs: i64) -> i64 {
    match last_voted_at {
        Some(ts) => {
            let ready_at = next_vote_timestamp(ts);
            if now_secs >= ready_at {
                0
            } else {
                ready_at - now_secs
            }
        }
        None => 0,
    }
}

/// Determina se a conta atingiu >= 24h 01m desde o último voto e ainda não foi notificada neste ciclo.
pub fn should_notify_for_vote(account: &VoteAccountConfig, now_secs: i64) -> bool {
    if !account.notifications_enabled {
        return false;
    }
    let Some(last_voted_at) = account.last_voted_at else {
        return false;
    };
    if account.last_notified_for_vote_at == Some(last_voted_at) {
        return false;
    }
    now_secs >= next_vote_timestamp(last_voted_at)
}
