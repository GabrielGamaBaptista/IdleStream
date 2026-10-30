use std::time::Duration;

const BROWSER_USER_AGENT: &str =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

pub async fn check_twitch_live(client: &reqwest::Client, channel_slug: &str) -> bool {
    let clean_channel = channel_slug.trim().trim_start_matches('#').to_lowercase();
    let url = format!("https://decapi.me/twitch/uptime/{}", clean_channel);

    #[cfg(target_os = "android")]
    {
        match crate::kick::http::kick_http_request("GET", &url, None, None, 6).await {
            Ok((status, text)) if (200..=299).contains(&status) => {
                let trimmed = text.trim().to_lowercase();
                !trimmed.contains("is offline") && !trimmed.contains("not found") && !trimmed.is_empty()
            }
            _ => false,
        }
    }
    #[cfg(not(target_os = "android"))]
    {
        match client
            .get(&url)
            .timeout(Duration::from_secs(6))
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
                eprintln!("[LiveCheck Twitch] Error for {}: {}", clean_channel, e);
                false
            }
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
