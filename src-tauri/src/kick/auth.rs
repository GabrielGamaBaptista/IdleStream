use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KickCredentials {
    pub kick_session: String,
    pub xsrf_token: Option<String>,
    pub session_token: Option<String>,
}

/// Autentica a subscrição de um canal no Laravel Broadcasting da Kick via POST /broadcasting/auth
/// Retorna o auth signature (ex: "32cbd69e4b950bf97679:hash...") necessário para o pusher:subscribe
pub async fn authenticate_pusher_channel(
    creds: &KickCredentials,
    socket_id: &str,
    channel_name: &str,
) -> Result<String, String> {
    let kick_session = creds.kick_session.clone();
    let xsrf_raw = creds.xsrf_token.clone().unwrap_or_default();
    let decoded_xsrf = urlencoding::decode(&xsrf_raw)
        .unwrap_or(std::borrow::Cow::Borrowed(&xsrf_raw))
        .into_owned();

    let cookie_header = format!("kick_session={}; XSRF-TOKEN={}", kick_session, xsrf_raw);
    let post_body = format!("socket_id={}&channel_name={}", socket_id, channel_name);

    let headers = [
        ("Cookie", cookie_header.as_str()),
        ("X-XSRF-TOKEN", decoded_xsrf.as_str()),
        ("Content-Type", "application/x-www-form-urlencoded"),
        ("Accept", "application/json, text/plain, */*"),
        ("Referer", "https://kick.com/"),
        ("Origin", "https://kick.com"),
        ("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"),
    ];

    let (_, body) = crate::kick::http::kick_http_request(
        "POST",
        "https://kick.com/broadcasting/auth",
        Some(&headers),
        Some(&post_body),
        10,
    ).await?;

    let json: serde_json::Value = serde_json::from_str(&body)
        .map_err(|e| format!("Auth parse error: {} - body: {}", e, body))?;

    json["auth"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| format!("Campo 'auth' ausente na resposta: {}", body))
}
