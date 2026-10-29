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
    let sid = socket_id.to_string();
    let ch = channel_name.to_string();

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .unwrap_or_default();

    let form_params = [
        ("socket_id", sid.as_str()),
        ("channel_name", ch.as_str()),
    ];

    let req = client
        .post("https://kick.com/broadcasting/auth")
        .header("Cookie", format!("kick_session={}; XSRF-TOKEN={}", kick_session, xsrf_raw))
        .header("X-XSRF-TOKEN", &decoded_xsrf)
        .header("Content-Type", "application/x-www-form-urlencoded")
        .header("Accept", "application/json, text/plain, */*")
        .header("Referer", "https://kick.com/")
        .header("Origin", "https://kick.com")
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .form(&form_params);

    if let Ok(resp) = req.send().await {
        if resp.status().is_success() {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                if let Some(auth) = json["auth"].as_str() {
                    return Ok(auth.to_string());
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        tokio::task::spawn_blocking(move || {
            let mut cmd = std::process::Command::new("curl.exe");
            cmd.args([
                "-s", "-m", "10",
                "-X", "POST",
                "https://kick.com/broadcasting/auth",
                "-H", &format!("Cookie: kick_session={}; XSRF-TOKEN={}", kick_session, xsrf_raw),
                "-H", &format!("X-XSRF-TOKEN: {}", decoded_xsrf),
                "-H", "Content-Type: application/x-www-form-urlencoded",
                "-H", "Accept: application/json, text/plain, */*",
                "-H", "Referer: https://kick.com/",
                "-H", "Origin: https://kick.com",
                "-H", "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "-d", &format!("socket_id={}&channel_name={}", sid, ch),
            ]);

            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

            match cmd.output() {
                Ok(output) if output.status.success() => {
                    let body = String::from_utf8_lossy(&output.stdout);
                    let json: serde_json::Value = serde_json::from_str(&body)
                        .map_err(|e| format!("Auth parse error: {} - body: {}", e, body))?;
                    json["auth"]
                        .as_str()
                        .map(|s| s.to_string())
                        .ok_or_else(|| format!("Campo 'auth' ausente na resposta: {}", body))
                }
                Ok(o) => {
                    let stdout = String::from_utf8_lossy(&o.stdout);
                    let stderr = String::from_utf8_lossy(&o.stderr);
                    Err(format!("broadcasting/auth falhou: status={}, stdout={}, stderr={}", o.status, stdout, stderr))
                }
                Err(e) => Err(format!("curl error: {}", e)),
            }
        })
        .await
        .map_err(|e| format!("Task error: {}", e))?
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Falha na autenticação pusher via reqwest".to_string())
    }
}
