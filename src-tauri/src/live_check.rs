use std::time::Duration;

const BROWSER_USER_AGENT: &str =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

pub async fn check_twitch_live(client: &reqwest::Client, channel_slug: &str) -> bool {
    let clean_channel = channel_slug.trim().trim_start_matches('#').to_lowercase();
    let url = format!("https://decapi.me/twitch/uptime/{}", clean_channel);

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

pub async fn check_kick_live(client: &reqwest::Client, channel_slug: &str) -> bool {
    let clean_slug = channel_slug.trim().trim_start_matches('/').to_lowercase();
    let url = format!("https://kick.com/api/v2/channels/{}", clean_slug);

    match client
        .get(&url)
        .header("User-Agent", BROWSER_USER_AGENT)
        .header("Accept", "application/json")
        .header("Referer", "https://kick.com/")
        .header("Origin", "https://kick.com")
        .timeout(Duration::from_secs(6))
        .send()
        .await
    {
        Ok(resp) if resp.status().is_success() => {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                let livestream = &json["livestream"];
                return !livestream.is_null();
            }
            false
        }
        Ok(resp) => {
            eprintln!("[LiveCheck Kick] Status {} for {}", resp.status(), clean_slug);
            #[cfg(target_os = "windows")]
            {
                // Fallback para curl no Windows se o Cloudflare rejeitar TLS
                tokio::task::spawn_blocking(move || {
                    let mut cmd = std::process::Command::new("curl.exe");
                    cmd.args(["-s", "-m", "6", "-A", BROWSER_USER_AGENT, &url]);
                    use std::os::windows::process::CommandExt;
                    cmd.creation_flags(0x08000000);
                    if let Ok(output) = cmd.output() {
                        if output.status.success() {
                            if let Ok(json) = serde_json::from_slice::<serde_json::Value>(&output.stdout) {
                                return !json["livestream"].is_null();
                            }
                        }
                    }
                    false
                }).await.unwrap_or(false)
            }
            #[cfg(not(target_os = "windows"))]
            {
                false
            }
        }
        Err(e) => {
            eprintln!("[LiveCheck Kick] HTTP error for {}: {}", clean_slug, e);
            true // Fallback seguro
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
        let is_live = check_kick_live(&client, "rodil").await;
        println!("Rodil is_live: {}", is_live);
    }
}
