use base64::prelude::*;
use serde_json::json;

pub const DEFAULT_SPADE_URL: &str = "https://spade.twitch.tv/track";

/// Constrói o payload codificado em base64 com a telemetria completa do evento `minute-watched`
pub fn build_spade_payload(
    channel_slug: &str,
    channel_id: &str,
    broadcast_id: &str,
    user_id: &str,
) -> String {
    let now = chrono::Utc::now().timestamp_millis() as f64 / 1000.0;
    let event = json!([{
        "event": "minute-watched",
        "properties": {
            "broadcast_id": broadcast_id,
            "channel_id": channel_id,
            "channel": channel_slug,
            "client_time": now,
            "hidden": false,
            "is_live": true,
            "live": true,
            "logged_in": true,
            "minutes_logged": 1,
            "muted": false,
            "player": "site",
            "user_id": user_id
        }
    }]);

    let json_bytes = event.to_string();
    BASE64_STANDARD.encode(json_bytes.as_bytes())
}

/// Envia o heartbeat de visualização (minute-watched) autenticado para os servidores Spade da Twitch
pub async fn send_spade_minute_watched(
    http: &reqwest::Client,
    channel_slug: &str,
    channel_id: &str,
    broadcast_id: &str,
    user_id: &str,
    auth_token: Option<&str>,
    spade_url: Option<&str>,
) -> Result<bool, String> {
    let encoded = build_spade_payload(channel_slug, channel_id, broadcast_id, user_id);
    let url = spade_url.unwrap_or(DEFAULT_SPADE_URL);

    let form_body = format!("data={}", urlencoding::encode(&encoded));
    let referer = format!("https://www.twitch.tv/{}", channel_slug);

    let mut req = http
        .post(url)
        .header("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
        .header("User-Agent", crate::twitch::gql::BROWSER_USER_AGENT)
        .header("Origin", "https://www.twitch.tv")
        .header("Referer", referer)
        .header("Client-Id", crate::twitch::gql::TWITCH_WEB_CLIENT_ID);

    if let Some(tok) = auth_token {
        let clean = tok.trim_start_matches("oauth:").trim();
        if !clean.is_empty() {
            req = req
                .header("Authorization", format!("OAuth {}", clean))
                .header("Cookie", format!("auth-token={}", clean));
        }
    }

    let resp = req
        .body(form_body)
        .send()
        .await
        .map_err(|e| format!("Falha de conexão com Spade: {}", e))?;

    let status = resp.status();
    // Spade costuma responder com 200 OK ou 204 No Content
    Ok(status.is_success())
}
