use std::sync::mpsc;
use std::thread;
use std::time::Duration;
use tiny_http::{Response, Server};

// Public client id commonly used or standard Twitch CLI client id
const DEFAULT_CLIENT_ID: &str = "gp762nuuoqcoxypju8c569th9wz7q5";

pub fn run_oauth_flow(custom_client_id: Option<String>) -> Result<String, String> {
    let client_id = custom_client_id.unwrap_or_else(|| DEFAULT_CLIENT_ID.to_string());
    let server = Server::http("127.0.0.1:0").map_err(|e| format!("Failed to bind local server: {}", e))?;
    let port = server.server_addr().to_ip().map(|addr| addr.port()).unwrap_or(17584);
    let redirect_uri = format!("http://localhost:{}", port);

    let auth_url = format!(
        "https://id.twitch.tv/oauth2/authorize?client_id={}&redirect_uri={}&response_type=token&scope=chat:read+chat:edit",
        client_id, redirect_uri
    );

    // Open user's default browser (Desktop only)
    #[cfg(not(target_os = "android"))]
    if let Err(e) = open::that(&auth_url) {
        return Err(format!("Failed to open browser: {}", e));
    }

    let (tx, rx) = mpsc::channel::<String>();

    thread::spawn(move || {
        for request in server.incoming_requests() {
            let url = request.url().to_string();

            if url.starts_with("/token?") {
                // Parse token parameter
                let query = &url[7..];
                let mut captured_token = None;
                for pair in query.split('&') {
                    let mut parts = pair.split('=');
                    if let (Some(key), Some(val)) = (parts.next(), parts.next()) {
                        if key == "token" {
                            captured_token = Some(val.to_string());
                            break;
                        }
                    }
                }

                let response = Response::from_string("OK")
                    .with_header(tiny_http::Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap());
                let _ = request.respond(response);

                if let Some(token) = captured_token {
                    let _ = tx.send(token);
                    break;
                }
            } else {
                // Serve HTML helper to extract token from URL hash fragment
                let html = r#"<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Chatter - Twitch Auth</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f0f13; color: #efeff1; }
  .card { text-align: center; padding: 2rem; border-radius: 8px; background: #18181b; border: 1px solid #303036; }
</style>
</head>
<body>
<div class="card">
  <h2>Conectando conta Twitch...</h2>
  <p id="msg">Aguarde a validação do token.</p>
</div>
<script>
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const token = params.get('access_token');
  if (token) {
    fetch('/token?token=' + encodeURIComponent(token))
      .then(() => {
        document.getElementById('msg').innerHTML = '<span style="color: #00f59b; font-weight: bold;">Autenticação realizada com sucesso!</span><br>Você já pode fechar esta aba.';
      })
      .catch(() => {
        document.getElementById('msg').innerText = 'Erro ao enviar token para a aplicação.';
      });
  } else {
    document.getElementById('msg').innerText = 'Nenhum token encontrado na resposta do Twitch.';
  }
</script>
</body>
</html>"#;
                let response = Response::from_string(html)
                    .with_header(tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..]).unwrap());
                let _ = request.respond(response);
            }
        }
    });

    // Wait up to 120 seconds for user to complete OAuth in browser
    match rx.recv_timeout(Duration::from_secs(120)) {
        Ok(token) => Ok(token),
        Err(_) => Err("Tempo limite esgotado para login da Twitch.".into()),
    }
}
