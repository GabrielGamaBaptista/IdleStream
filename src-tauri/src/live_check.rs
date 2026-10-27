use std::time::Duration;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

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

pub async fn check_kick_live(_client: &reqwest::Client, channel_slug: &str) -> bool {
    let clean_slug = channel_slug.trim().trim_start_matches('/').to_lowercase();
    let url = format!("https://kick.com/api/v2/channels/{}", clean_slug);

    tokio::task::spawn_blocking(move || {
        let mut cmd = std::process::Command::new("curl.exe");
        cmd.args([
            "-s",
            "-m", "6",
            "-A", BROWSER_USER_AGENT,
            &url,
        ]);

        #[cfg(target_os = "windows")]
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW flag

        match cmd.output() {
            Ok(output) => {
                if output.status.success() {
                    if let Ok(json) = serde_json::from_slice::<serde_json::Value>(&output.stdout) {
                        let livestream = &json["livestream"];
                        return !livestream.is_null();
                    }
                }
                false
            }
            Err(e) => {
                eprintln!("[LiveCheck Kick] curl execution error: {}", e);
                // Fallback to true if curl fails so the stream isn't blocked
                true
            }
        }
    })
    .await
    .unwrap_or(true)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_kick_rodil() {
        let client = reqwest::Client::new();
        let is_live = check_kick_live(&client, "rodil").await;
        println!("Rodil is_live via curl: {}", is_live);
        assert!(is_live, "rodil should be live!");
    }
}
