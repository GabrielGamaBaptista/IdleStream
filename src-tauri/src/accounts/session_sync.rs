use crate::config::Account;
use std::path::Path;

pub const DEFAULT_COOKIE_MAX_AGE_SECS: i64 = 90 * 24 * 60 * 60;
pub const PROFILE_SYNC_HASH_FILENAME: &str = ".profile_sync_hash";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StoredCookieSnapshot {
    pub name: String,
    pub value: String,
    pub domain: Option<String>,
    pub path: Option<String>,
    pub http_only: Option<bool>,
    pub is_session: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DesiredCookie {
    pub name: String,
    pub value: String,
    pub domain: String,
    pub path: String,
    pub http_only: bool,
    pub secure: bool,
    pub same_site_lax: bool,
    pub max_age_secs: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SeedingPlan {
    pub cookies_to_delete: Vec<StoredCookieSnapshot>,
    pub cookies_to_set: Vec<DesiredCookie>,
    pub target_hash: Option<String>,
    pub reason: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AccountSessionUpdate {
    pub kick_session: Option<String>,
    pub session_token: Option<String>,
    pub xsrf_token: Option<String>,
    pub updated_hash: String,
}

fn fnv1a_64_hex(input: &str) -> String {
    let mut hash: u64 = 0xcbf29ce484222325;
    for byte in input.as_bytes() {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("{:016x}", hash)
}

pub fn decode_kick_session_token_for_bearer(raw: &str) -> String {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    urlencoding::decode(trimmed)
        .map(|s| s.into_owned())
        .unwrap_or_else(|_| trimmed.to_string())
}

pub fn encode_kick_session_token_for_cookie(raw: &str) -> String {
    let decoded = decode_kick_session_token_for_bearer(raw);
    if decoded.is_empty() {
        return String::new();
    }
    decoded.replace('|', "%7C")
}

pub fn compute_kick_credentials_hash(
    kick_session: Option<&str>,
    session_token: Option<&str>,
    xsrf_token: Option<&str>,
) -> String {
    let ks = kick_session.map(str::trim).unwrap_or("");
    let st = session_token
        .map(decode_kick_session_token_for_bearer)
        .unwrap_or_default();
    let xs = xsrf_token.map(str::trim).unwrap_or("");
    fnv1a_64_hex(&format!("kick|{}|{}|{}", ks, st, xs))
}

pub fn compute_twitch_credentials_hash(auth_token: Option<&str>) -> String {
    let tok = auth_token
        .map(|t| t.trim_start_matches("oauth:").trim())
        .unwrap_or("");
    fnv1a_64_hex(&format!("twitch|{}", tok))
}

fn non_empty_trimmed(val: Option<&str>) -> Option<String> {
    val.map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
}

fn matches_kick_domain(domain: Option<&str>) -> bool {
    match domain.map(|d| d.trim().to_ascii_lowercase()) {
        None => true,
        Some(d) => d == ".kick.com" || d == "kick.com" || d.ends_with(".kick.com"),
    }
}

fn matches_twitch_domain(domain: Option<&str>) -> bool {
    match domain.map(|d| d.trim().to_ascii_lowercase()) {
        None => true,
        Some(d) => d == ".twitch.tv" || d == "twitch.tv" || d.ends_with(".twitch.tv"),
    }
}

pub fn plan_kick_cookie_seeding(
    profile_cookies: &[StoredCookieSnapshot],
    kick_session: Option<&str>,
    session_token: Option<&str>,
    xsrf_token: Option<&str>,
    saved_sync_hash: Option<&str>,
) -> SeedingPlan {
    let ks = non_empty_trimmed(kick_session);
    let st_raw = non_empty_trimmed(session_token);
    let xs = non_empty_trimmed(xsrf_token);

    if ks.is_none() && st_raw.is_none() {
        return SeedingPlan {
            cookies_to_delete: Vec::new(),
            cookies_to_set: Vec::new(),
            target_hash: None,
            reason: "no_kick_credentials".into(),
        };
    }

    let target_hash = compute_kick_credentials_hash(ks.as_deref(), st_raw.as_deref(), xs.as_deref());
    let hash_matches = saved_sync_hash
        .map(|h| h.trim() == target_hash)
        .unwrap_or(false);

    let kick_cookies: Vec<&StoredCookieSnapshot> = profile_cookies
        .iter()
        .filter(|c| matches_kick_domain(c.domain.as_deref()))
        .collect();

    let mut degraded: Vec<StoredCookieSnapshot> = Vec::new();
    let mut has_valid_ks = false;
    let mut has_valid_st = false;

    for c in &kick_cookies {
        let val_ok = !c.value.trim().is_empty();
        if c.name.eq_ignore_ascii_case("kick_session") {
            let domain_ok = c
                .domain
                .as_deref()
                .map(|d| d.eq_ignore_ascii_case(".kick.com"))
                .unwrap_or(true);
            let is_degraded =
                c.is_session || c.http_only != Some(true) || !domain_ok || !val_ok || has_valid_ks;
            if is_degraded {
                degraded.push((*c).clone());
            } else {
                has_valid_ks = true;
            }
        } else if c.name.eq_ignore_ascii_case("session_token") {
            let domain_ok = c
                .domain
                .as_deref()
                .map(|d| d.eq_ignore_ascii_case(".kick.com"))
                .unwrap_or(true);
            let is_degraded = c.is_session || !domain_ok || !val_ok || has_valid_st;
            if is_degraded {
                degraded.push((*c).clone());
            } else {
                has_valid_st = true;
            }
        } else if c.name.eq_ignore_ascii_case("XSRF-TOKEN") {
            let domain_ok = c
                .domain
                .as_deref()
                .map(|d| d.eq_ignore_ascii_case(".kick.com"))
                .unwrap_or(true);
            if c.is_session || !domain_ok || !val_ok {
                degraded.push((*c).clone());
            }
        }
    }

    let needs_ks = ks.is_some() && !has_valid_ks;
    let needs_st = st_raw.is_some() && !has_valid_st;
    let profile_valid_and_complete = !needs_ks && !needs_st && degraded.is_empty();

    if hash_matches && profile_valid_and_complete {
        return SeedingPlan {
            cookies_to_delete: Vec::new(),
            cookies_to_set: Vec::new(),
            target_hash: Some(target_hash),
            reason: "profile_first_kept".into(),
        };
    }

    let mut cookies_to_delete = degraded;
    if !hash_matches {
        // Explicit credential update: remove all pre-existing auth cookies to guarantee clean replacement
        for c in &kick_cookies {
            if (c.name.eq_ignore_ascii_case("kick_session")
                || c.name.eq_ignore_ascii_case("session_token")
                || c.name.eq_ignore_ascii_case("XSRF-TOKEN"))
                && !cookies_to_delete.iter().any(|d| {
                    d.name.eq_ignore_ascii_case(&c.name) && d.domain == c.domain && d.path == c.path
                })
            {
                cookies_to_delete.push((*c).clone());
            }
        }
    }

    let mut cookies_to_set = Vec::new();
    if let Some(st_val) = st_raw {
        let encoded_st = encode_kick_session_token_for_cookie(&st_val);
        if !encoded_st.is_empty() {
            cookies_to_set.push(DesiredCookie {
                name: "session_token".into(),
                value: encoded_st,
                domain: ".kick.com".into(),
                path: "/".into(),
                http_only: false,
                secure: true,
                same_site_lax: true,
                max_age_secs: DEFAULT_COOKIE_MAX_AGE_SECS,
            });
        }
    }
    if let Some(ks_val) = ks {
        cookies_to_set.push(DesiredCookie {
            name: "kick_session".into(),
            value: ks_val,
            domain: ".kick.com".into(),
            path: "/".into(),
            http_only: true,
            secure: true,
            same_site_lax: true,
            max_age_secs: DEFAULT_COOKIE_MAX_AGE_SECS,
        });
    }
    if let Some(xs_val) = xs {
        cookies_to_set.push(DesiredCookie {
            name: "XSRF-TOKEN".into(),
            value: xs_val,
            domain: ".kick.com".into(),
            path: "/".into(),
            http_only: false,
            secure: true,
            same_site_lax: true,
            max_age_secs: DEFAULT_COOKIE_MAX_AGE_SECS,
        });
    }

    let reason = if !hash_matches {
        "credentials_hash_changed_or_initial_seed"
    } else {
        "repaired_degraded_or_missing_cookies"
    };

    SeedingPlan {
        cookies_to_delete,
        cookies_to_set,
        target_hash: Some(target_hash),
        reason: reason.into(),
    }
}

pub fn plan_twitch_cookie_seeding(
    profile_cookies: &[StoredCookieSnapshot],
    auth_token: Option<&str>,
    saved_sync_hash: Option<&str>,
) -> SeedingPlan {
    let clean_tok = auth_token
        .map(|t| t.trim_start_matches("oauth:").trim())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string());

    let Some(tok) = clean_tok else {
        return SeedingPlan {
            cookies_to_delete: Vec::new(),
            cookies_to_set: Vec::new(),
            target_hash: None,
            reason: "no_twitch_token".into(),
        };
    };

    let target_hash = compute_twitch_credentials_hash(Some(&tok));
    let hash_matches = saved_sync_hash
        .map(|h| h.trim() == target_hash)
        .unwrap_or(false);

    let twitch_cookies: Vec<&StoredCookieSnapshot> = profile_cookies
        .iter()
        .filter(|c| matches_twitch_domain(c.domain.as_deref()))
        .collect();

    let mut degraded: Vec<StoredCookieSnapshot> = Vec::new();
    let mut has_valid_auth = false;

    for c in &twitch_cookies {
        if c.name.eq_ignore_ascii_case("auth-token") {
            let domain_ok = c
                .domain
                .as_deref()
                .map(|d| d.eq_ignore_ascii_case(".twitch.tv"))
                .unwrap_or(true);
            let val_ok = !c.value.trim().is_empty();
            if c.is_session || !domain_ok || !val_ok || has_valid_auth {
                degraded.push((*c).clone());
            } else {
                has_valid_auth = true;
            }
        }
    }

    if hash_matches && has_valid_auth && degraded.is_empty() {
        return SeedingPlan {
            cookies_to_delete: Vec::new(),
            cookies_to_set: Vec::new(),
            target_hash: Some(target_hash),
            reason: "profile_first_kept".into(),
        };
    }

    let mut cookies_to_delete = degraded;
    if !hash_matches {
        for c in &twitch_cookies {
            if c.name.eq_ignore_ascii_case("auth-token")
                && !cookies_to_delete.iter().any(|d| {
                    d.name.eq_ignore_ascii_case(&c.name) && d.domain == c.domain && d.path == c.path
                })
            {
                cookies_to_delete.push((*c).clone());
            }
        }
    }

    let cookies_to_set = vec![DesiredCookie {
        name: "auth-token".into(),
        value: tok,
        domain: ".twitch.tv".into(),
        path: "/".into(),
        http_only: false,
        secure: true,
        same_site_lax: true,
        max_age_secs: DEFAULT_COOKIE_MAX_AGE_SECS,
    }];

    SeedingPlan {
        cookies_to_delete,
        cookies_to_set,
        target_hash: Some(target_hash),
        reason: if !hash_matches {
            "credentials_hash_changed_or_initial_seed".into()
        } else {
            "repaired_degraded_twitch_cookie".into()
        },
    }
}

pub fn detect_kick_cookie_rotation(
    profile_cookies: &[StoredCookieSnapshot],
    account: &Account,
) -> Option<AccountSessionUpdate> {
    let mut best_ks: Option<&StoredCookieSnapshot> = None;
    let mut best_st: Option<&StoredCookieSnapshot> = None;
    let mut best_xs: Option<&StoredCookieSnapshot> = None;

    for c in profile_cookies {
        if !matches_kick_domain(c.domain.as_deref()) || c.value.trim().is_empty() {
            continue;
        }
        if c.name.eq_ignore_ascii_case("kick_session") {
            let prefer = best_ks.map_or(true, |prev| {
                (c.http_only == Some(true) && prev.http_only != Some(true))
                    || (!c.is_session && prev.is_session)
            });
            if prefer {
                best_ks = Some(c);
            }
        } else if c.name.eq_ignore_ascii_case("session_token") {
            let prefer = best_st.map_or(true, |prev| !c.is_session && prev.is_session);
            if prefer {
                best_st = Some(c);
            }
        } else if c.name.eq_ignore_ascii_case("XSRF-TOKEN") {
            let prefer = best_xs.map_or(true, |prev| !c.is_session && prev.is_session);
            if prefer {
                best_xs = Some(c);
            }
        }
    }

    let obs_ks = best_ks.map(|c| c.value.trim().to_string()).filter(|s| !s.is_empty());
    let obs_st = best_st
        .map(|c| decode_kick_session_token_for_bearer(&c.value))
        .filter(|s| !s.is_empty());
    let obs_xs = best_xs.map(|c| c.value.trim().to_string()).filter(|s| !s.is_empty());

    // Need at least one primary auth cookie to consider this a valid authenticated snapshot
    if obs_ks.is_none() && obs_st.is_none() {
        return None;
    }

    let cur_ks = non_empty_trimmed(account.kick_session.as_deref());
    let cur_st = account
        .session_token
        .as_deref()
        .map(decode_kick_session_token_for_bearer)
        .filter(|s| !s.is_empty());
    let cur_xs = non_empty_trimmed(account.xsrf_token.as_deref());

    let ks_changed = matches!((&obs_ks, &cur_ks), (Some(n), Some(o)) if n != o)
        || matches!((&obs_ks, &cur_ks), (Some(_), None));
    let st_changed = matches!((&obs_st, &cur_st), (Some(n), Some(o)) if n != o)
        || matches!((&obs_st, &cur_st), (Some(_), None));
    let xs_changed = matches!((&obs_xs, &cur_xs), (Some(n), Some(o)) if n != o);

    if !ks_changed && !st_changed && !xs_changed {
        return None;
    }

    let merged_ks = obs_ks.or(cur_ks);
    let merged_st = obs_st.or(cur_st);
    let merged_xs = obs_xs.or(cur_xs);

    let updated_hash = compute_kick_credentials_hash(
        merged_ks.as_deref(),
        merged_st.as_deref(),
        merged_xs.as_deref(),
    );

    Some(AccountSessionUpdate {
        kick_session: merged_ks,
        session_token: merged_st,
        xsrf_token: merged_xs,
        updated_hash,
    })
}

pub fn detect_twitch_cookie_rotation(
    profile_cookies: &[StoredCookieSnapshot],
    account: &Account,
) -> Option<String> {
    let mut best_auth: Option<&StoredCookieSnapshot> = None;
    for c in profile_cookies {
        if !matches_twitch_domain(c.domain.as_deref()) || c.value.trim().is_empty() {
            continue;
        }
        if c.name.eq_ignore_ascii_case("auth-token") {
            let prefer = best_auth.map_or(true, |prev| {
                let c_root = c
                    .domain
                    .as_deref()
                    .map(|d| d.eq_ignore_ascii_case(".twitch.tv"))
                    .unwrap_or(false);
                let p_root = prev
                    .domain
                    .as_deref()
                    .map(|d| d.eq_ignore_ascii_case(".twitch.tv"))
                    .unwrap_or(false);
                (c_root && !p_root) || (!c.is_session && prev.is_session)
            });
            if prefer {
                best_auth = Some(c);
            }
        }
    }

    let raw = best_auth?.value.trim();
    let decoded = urlencoding::decode(raw)
        .map(|s| s.into_owned())
        .unwrap_or_else(|_| raw.to_string());
    let clean = decoded.trim_start_matches("oauth:").trim().to_string();
    if clean.is_empty() {
        return None;
    }

    let current = account
        .oauth_token
        .as_deref()
        .map(|t| t.trim_start_matches("oauth:").trim())
        .unwrap_or("");

    if clean != current {
        Some(clean)
    } else {
        None
    }
}

pub fn read_profile_sync_hash(profile_dir: &Path) -> Option<String> {
    let path = profile_dir.join(PROFILE_SYNC_HASH_FILENAME);
    std::fs::read_to_string(path)
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

pub fn write_profile_sync_hash(profile_dir: &Path, hash: &str) {
    if std::fs::create_dir_all(profile_dir).is_ok() {
        let path = profile_dir.join(PROFILE_SYNC_HASH_FILENAME);
        let _ = std::fs::write(path, hash.trim());
    }
}
