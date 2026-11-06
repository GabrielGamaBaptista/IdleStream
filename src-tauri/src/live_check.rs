use std::time::Duration;

const BROWSER_USER_AGENT: &str =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

pub async fn check_twitch_live(client: &reqwest::Client, channel_slug: &str) -> bool {
    let clean_channel = channel_slug.trim().trim_start_matches('#').to_lowercase();

    // 1. Consulta primária direta via GQL oficial da Twitch (~20ms, funciona em Desktop e Android)
    let gql_query = serde_json::json!({
        "query": "query($login: String!) { user(login: $login) { id stream { id type } } }",
        "variables": { "login": clean_channel }
    });

    if let Ok(resp) = client
        .post(crate::twitch::gql::TWITCH_GQL_URL)
        .header("Client-Id", crate::twitch::gql::TWITCH_WEB_CLIENT_ID)
        .header("User-Agent", BROWSER_USER_AGENT)
        .timeout(Duration::from_secs(4))
        .json(&gql_query)
        .send()
        .await
    {
        if resp.status().is_success() {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                if let Some(stream) = json.pointer("/data/user/stream") {
                    if !stream.is_null() {
                        let stream_type = stream.get("type").and_then(|t| t.as_str()).unwrap_or("");
                        let has_id = stream.get("id").and_then(|id| id.as_str()).is_some();
                        return stream_type == "live" || has_id;
                    }
                    return false;
                }
            }
        }
    }

    // 2. Fallback secundário decapi.me
    let url = format!("https://decapi.me/twitch/uptime/{}", clean_channel);
    match client
        .get(&url)
        .timeout(Duration::from_secs(4))
        .send()
        .await
    {
        Ok(resp) => {
            if let Ok(text) = resp.text().await {
                let trimmed = text.trim().to_lowercase();
                !trimmed.contains("is offline") && !trimmed.contains("not found") && !trimmed.is_empty()
            } else {
                false
            }
        }
        Err(e) => {
            eprintln!("[LiveCheck Twitch Fallback] Error for {}: {}", clean_channel, e);
            false
        }
    }
}

pub async fn check_kick_live(_client: &reqwest::Client, channel_slug: &str) -> bool {
    let clean_slug = channel_slug.trim().trim_start_matches('/').to_lowercase();
    let url = format!("https://kick.com/api/v2/channels/{}", clean_slug);

    let headers = [
        ("User-Agent", BROWSER_USER_AGENT),
        ("Accept", "application/json"),
        ("Referer", "https://kick.com/"),
        ("Origin", "https://kick.com"),
    ];

    match crate::kick::http::kick_http_request("GET", &url, Some(&headers), None, 8).await {
        Ok((status, body)) if (200..=299).contains(&status) => {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&body) {
                let livestream = &json["livestream"];
                return !livestream.is_null();
            }
            false
        }
        Ok((status, _)) => {
            eprintln!("[LiveCheck Kick] Status {} for {}", status, clean_slug);
            false
        }
        Err(e) => {
            eprintln!("[LiveCheck Kick] HTTP error for {}: {}", clean_slug, e);
            false
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore = "requer streamer ativo na Kick e conexao externa"]
    async fn test_kick_rodil() {
        let client = reqwest::Client::new();
        let is_live = check_kick_live(&client, "surskity").await;
        println!("surskity is_live: {}", is_live);
        assert!(is_live, "surskity deveria ser detectado como ao vivo");
    }
}
