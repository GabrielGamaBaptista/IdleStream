use crate::twitch::models::{ChannelPointsContext, ClaimResult};
use serde_json::json;

pub const TWITCH_WEB_CLIENT_ID: &str = "kimne78kx3ncx6brgo4mv6wki5h1ko";
pub const TWITCH_ANDROID_CLIENT_ID: &str = "kd1unb4b3q4t58fwlpcbzcbnm76a8fp";
pub const TWITCH_SMARTTV_CLIENT_ID: &str = "ue6666qo983tsx6so1t0vnawi233wa";
pub const TWITCH_GQL_URL: &str = "https://gql.twitch.tv/gql";
pub const TWITCH_INTEGRITY_URL: &str = "https://gql.twitch.tv/integrity";

pub const BROWSER_USER_AGENT: &str =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

/// Extrai a média de horas de live a partir do JSON de vídeos (VODs) da Twitch
pub fn parse_uptime_from_videos_json(json: &serde_json::Value) -> Option<f64> {
    let edges = json
        .get("data")
        .and_then(|d| d.get("user"))
        .and_then(|u| u.get("videos"))
        .and_then(|v| v.get("edges"))
        .and_then(|e| e.as_array())?;

    if edges.is_empty() {
        return None;
    }

    let mut total_seconds: u64 = 0;
    let mut count: u64 = 0;

    for edge in edges {
        if let Some(sec) = edge.get("node").and_then(|n| n.get("lengthSeconds")).and_then(|s| s.as_u64()) {
            total_seconds += sec;
            count += 1;
        }
    }

    if count == 0 {
        return None;
    }

    let avg_hours = (total_seconds as f64 / count as f64) / 3600.0;
    Some((avg_hours * 10.0).round() / 10.0)
}

/// Extrai os dados de ChannelPointsContext a partir da resposta GQL
pub fn parse_channel_points_context(json: &serde_json::Value) -> Result<ChannelPointsContext, String> {
    let user = json
        .get("data")
        .and_then(|d| d.get("user"))
        .ok_or_else(|| "Campo user não encontrado na resposta GQL".to_string())?;

    let channel_id = user
        .get("id")
        .and_then(|i| i.as_str())
        .ok_or_else(|| "Campo user.id não encontrado".to_string())?
        .to_string();

    let stream = user.get("stream");
    let (is_live, broadcast_id) = match stream {
        Some(s) if !s.is_null() => {
            let stream_type = s.get("type").and_then(|t| t.as_str()).unwrap_or("");
            let b_id = s.get("id").and_then(|id| id.as_str()).map(|s| s.to_string());
            (stream_type == "live" || b_id.is_some(), b_id)
        }
        _ => (false, None),
    };

    // Twitch pode aninhar communityPoints em user.channel.self.communityPoints,
    // community.channel.self.communityPoints, user.channel.communityPoints ou user.communityPoints
    let comm_points = user
        .pointer("/channel/self/communityPoints")
        .or_else(|| user.pointer("/channel/communityPoints"))
        .or_else(|| user.get("communityPoints"))
        .or_else(|| json.pointer("/data/community/channel/self/communityPoints"))
        .or_else(|| json.pointer("/data/channel/self/communityPoints"));

    let balance = comm_points
        .and_then(|cp| cp.get("balance"))
        .and_then(|b| b.as_i64());

    let available_claim_id = comm_points
        .and_then(|cp| cp.get("availableClaim"))
        .and_then(|ac| if ac.is_null() { None } else { ac.get("id") })
        .and_then(|id| id.as_str())
        .map(|s| s.to_string());

    Ok(ChannelPointsContext {
        is_live,
        channel_id,
        broadcast_id,
        balance,
        available_claim_id,
    })
}

/// Consulta o histórico recente de VODs e calcula a média de tempo online em horas
pub async fn fetch_streamer_uptime_avg(
    http: &reqwest::Client,
    channel_slug: &str,
    auth_token: Option<&str>,
) -> Result<f64, String> {
    let clean_slug = channel_slug.trim().trim_start_matches('#').to_lowercase();
    let query = json!({
        "query": "query($login: String!) { user(login: $login) { id videos(first: 10, types: [ARCHIVE]) { edges { node { id lengthSeconds publishedAt } } } } }",
        "variables": { "login": clean_slug }
    });

    let mut req = http
        .post(TWITCH_GQL_URL)
        .header("Client-Id", TWITCH_WEB_CLIENT_ID)
        .header("User-Agent", BROWSER_USER_AGENT)
        .json(&query);

    if let Some(token) = auth_token {
        let clean = token.trim_start_matches("oauth:").trim();
        if !clean.is_empty() {
            req = req.header("Authorization", format!("OAuth {}", clean));
        }
    }

    let resp = req.send().await.map_err(|e| format!("Falha de conexão com GQL: {}", e))?;
    let status = resp.status();
    if !status.is_success() {
        return Err(format!("GQL retornou status HTTP {}", status));
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| format!("JSON inválido: {}", e))?;
    Ok(parse_uptime_from_videos_json(&json).unwrap_or(4.0)) // Padrão de 4 horas se não houver VODs
}

pub const CHANNEL_POINTS_CONTEXT_HASH: &str =
    "7fe050e3761eb2cf258d70ee1a21cbd76fa8cf3d7e7b12fc437e7029d446b5e3";

/// Consulta o status da live e pontos de canal (status, saldo, e baú disponível)
pub async fn fetch_channel_points_context(
    http: &reqwest::Client,
    channel_slug: &str,
    auth_token: Option<&str>,
) -> Result<ChannelPointsContext, String> {
    let clean_slug = channel_slug.trim().trim_start_matches('#').to_lowercase();

    // 1. Consulta pública e garantida do canal e status da transmissão
    let base_query = json!({
        "query": "query($login: String!) { user(login: $login) { id stream { id type } } }",
        "variables": { "login": clean_slug }
    });

    let mut req = http
        .post(TWITCH_GQL_URL)
        .header("Client-Id", TWITCH_WEB_CLIENT_ID)
        .header("User-Agent", BROWSER_USER_AGENT)
        .json(&base_query);

    if let Some(token) = auth_token {
        let clean = token.trim_start_matches("oauth:").trim();
        if !clean.is_empty() {
            req = req.header("Authorization", format!("OAuth {}", clean));
        }
    }

    let resp = req.send().await.map_err(|e| format!("Falha ao consultar status da live: {}", e))?;
    let status = resp.status();
    if !status.is_success() {
        return Err(format!("GQL retornou HTTP {}", status));
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| format!("JSON inválido: {}", e))?;
    let mut ctx = parse_channel_points_context(&json)?;

    // 2. Se houver token autenticado, tenta enriquecer com o saldo de pontos e baú disponível
    if let Some(token) = auth_token {
        let clean = token.trim_start_matches("oauth:").trim();
        if !clean.is_empty() {
            let cp_payload = json!({
                "operationName": "ChannelPointsContext",
                "variables": { "channelLogin": clean_slug },
                "extensions": {
                    "persistedQuery": {
                        "version": 1,
                        "sha256Hash": CHANNEL_POINTS_CONTEXT_HASH
                    }
                }
            });

            if let Ok(cp_resp) = http
                .post(TWITCH_GQL_URL)
                .header("Client-Id", TWITCH_WEB_CLIENT_ID)
                .header("Authorization", format!("OAuth {}", clean))
                .header("User-Agent", BROWSER_USER_AGENT)
                .json(&cp_payload)
                .send()
                .await
            {
                if cp_resp.status().is_success() {
                    if let Ok(cp_json) = cp_resp.json::<serde_json::Value>().await {
                        let comm_points = cp_json
                            .pointer("/data/community/channel/self/communityPoints")
                            .or_else(|| cp_json.pointer("/data/community/self/communityPoints"))
                            .or_else(|| cp_json.pointer("/data/channel/self/communityPoints"))
                            .or_else(|| cp_json.pointer("/data/user/channel/self/communityPoints"))
                            .or_else(|| cp_json.pointer("/data/user/channel/communityPoints"))
                            .or_else(|| cp_json.pointer("/data/communityPoints"))
                            .or_else(|| {
                                cp_json
                                    .get("data")
                                    .and_then(|d| d.get("channel"))
                                    .and_then(|c| c.get("communityPoints"))
                            });

                        if let Some(cp) = comm_points {
                            if let Some(bal) = cp.get("balance").and_then(|b| b.as_i64()) {
                                ctx.balance = Some(bal);
                            }
                            if let Some(claim) = cp.get("availableClaim").and_then(|c| if c.is_null() { None } else { c.get("id") }) {
                                ctx.available_claim_id = claim.as_str().map(|s| s.to_string());
                            }
                        }
                    }
                }
            }

            // 3. Fallback: Se o persisted query não retornou saldo, tenta a query direta de ChannelPointsBalance
            if ctx.balance.is_none() {
                if let Ok(direct_bal) = fetch_channel_points_only(http, &clean_slug, clean).await {
                    ctx.balance = Some(direct_bal);
                }
            }
        }
    }

    Ok(ctx)
}

/// Executa a mutação para resgatar o baú de +50 pontos testando estratégias multi-client
pub async fn claim_community_points(
    http: &reqwest::Client,
    channel_id: &str,
    claim_id: &str,
    auth_token: &str,
    client_integrity: Option<&str>,
    device_id: Option<&str>,
) -> Result<ClaimResult, String> {
    let clean_token = auth_token.trim_start_matches("oauth:").trim();
    let payload = json!({
        "operationName": "ClaimCommunityPoints",
        "variables": {
            "input": {
                "channelID": channel_id,
                "claimID": claim_id
            }
        },
        "extensions": {
            "persistedQuery": {
                "version": 1,
                "sha256Hash": "46aaeebe02c99afdf4fc97c7c0cba964124bf6b0af229395f1f6d1feed05b3d0"
            }
        }
    });

    // Estratégia 1: Cliente Android Oficial (não impõe o desafio Kasada anti-bot)
    let android_resp = http
        .post(TWITCH_GQL_URL)
        .header("Client-Id", TWITCH_ANDROID_CLIENT_ID)
        .header("Authorization", format!("OAuth {}", clean_token))
        .header("User-Agent", "okhttp/4.12.0")
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await;

    if let Ok(resp) = android_resp {
        if resp.status().is_success() {
            if let Ok(body_text) = resp.text().await {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&body_text) {
                    let has_errors = json
                        .get("errors")
                        .and_then(|e| e.as_array())
                        .map(|a| !a.is_empty())
                        .unwrap_or(false);
                    if !has_errors {
                        let pts = json["data"]["claimCommunityPoints"]["points"]
                            .as_i64()
                            .unwrap_or(50);
                        return Ok(ClaimResult {
                            claim_id: claim_id.to_string(),
                            points: pts,
                        });
                    }
                }
            }
        }
    }

    // Estratégia 2: Cliente Web padrão com integridade
    let mut req_web = http
        .post(TWITCH_GQL_URL)
        .header("Client-Id", TWITCH_WEB_CLIENT_ID)
        .header("Authorization", format!("OAuth {}", clean_token))
        .header("User-Agent", BROWSER_USER_AGENT)
        .header("Content-Type", "application/json")
        .json(&payload);

    if let Some(ci) = client_integrity {
        req_web = req_web.header("Client-Integrity", ci);
    }
    if let Some(dev) = device_id {
        req_web = req_web.header("X-Device-Id", dev);
    }

    let resp_web = req_web
        .send()
        .await
        .map_err(|e| format!("Falha ao enviar claim Web GQL: {}", e))?;
    let status_web = resp_web.status();
    let body_web = resp_web
        .text()
        .await
        .map_err(|e| format!("Erro ao ler corpo do claim: {}", e))?;

    if !status_web.is_success() {
        return Err(format!("Claim Web GQL retornou HTTP {}: {}", status_web, body_web));
    }

    let json_web: serde_json::Value = serde_json::from_str(&body_web)
        .map_err(|e| format!("JSON de claim inválido: {} (resp: {})", e, body_web))?;

    if let Some(errors) = json_web.get("errors").and_then(|e| e.as_array()) {
        if !errors.is_empty() {
            let msg = errors[0]["message"].as_str().unwrap_or("Erro desconhecido");
            return Err(format!("Erro da Twitch no claim: {}", msg));
        }
    }

    let points = json_web["data"]["claimCommunityPoints"]["points"]
        .as_i64()
        .unwrap_or(50);
    Ok(ClaimResult {
        claim_id: claim_id.to_string(),
        points,
    })
}

/// Solicita um token de integridade da Twitch para acompanhar mutações GQL
pub async fn fetch_client_integrity(
    http: &reqwest::Client,
    device_id: &str,
    auth_token: Option<&str>,
) -> Result<String, String> {
    let mut req = http
        .post(TWITCH_INTEGRITY_URL)
        .header("Client-Id", TWITCH_WEB_CLIENT_ID)
        .header("X-Device-Id", device_id)
        .header("User-Agent", BROWSER_USER_AGENT)
        .header("Content-Type", "application/json");

    if let Some(token) = auth_token {
        let clean = token.trim_start_matches("oauth:").trim();
        if !clean.is_empty() {
            req = req.header("Authorization", format!("OAuth {}", clean));
        }
    }

    let resp = req.send().await.map_err(|e| format!("Falha de conexão com endpoint de integridade: {}", e))?;
    let status = resp.status();
    let body = resp.text().await.map_err(|e| format!("Erro ao ler resposta de integridade: {}", e))?;

    if !status.is_success() {
        return Err(format!("Endpoint de integridade retornou HTTP {}: {}", status, body));
    }

    let json: serde_json::Value = serde_json::from_str(&body)
        .map_err(|e| format!("JSON de integridade inválido: {} (resp: {})", e, body))?;

    let token = json["token"]
        .as_str()
        .ok_or_else(|| format!("Campo token não encontrado na resposta de integridade: {}", body))?;

    Ok(token.to_string())
}

/// Consulta o user_id numérico da conta autenticada atualmente
pub async fn fetch_current_user_id(
    http: &reqwest::Client,
    auth_token: &str,
) -> Result<String, String> {
    let clean = auth_token.trim_start_matches("oauth:").trim();
    let query = serde_json::json!({
        "query": "query { currentUser { id login } }"
    });

    let resp = http
        .post(TWITCH_GQL_URL)
        .header("Client-Id", TWITCH_WEB_CLIENT_ID)
        .header("Authorization", format!("OAuth {}", clean))
        .header("User-Agent", BROWSER_USER_AGENT)
        .json(&query)
        .send()
        .await
        .map_err(|e| format!("Falha ao consultar usuário atual: {}", e))?;

    let json: serde_json::Value = resp.json().await.map_err(|e| format!("JSON inválido: {}", e))?;
    let id = json["data"]["currentUser"]["id"]
        .as_str()
        .ok_or_else(|| "currentUser.id não encontrado".to_string())?;

    Ok(id.to_string())
}

/// Consulta diretamente apenas o saldo de pontos de canal na Twitch
pub async fn fetch_channel_points_only(
    http: &reqwest::Client,
    channel_slug: &str,
    auth_token: &str,
) -> Result<i64, String> {
    let clean_slug = channel_slug.trim().trim_start_matches('#').to_lowercase();
    let clean_token = auth_token.trim_start_matches("oauth:").trim();
    if clean_token.is_empty() {
        return Err("Token vazio".to_string());
    }

    let query = json!({
        "query": "query ChannelPointsBalance($channelLogin: String!) { channel(name: $channelLogin) { id self { communityPoints { balance } } } }",
        "variables": { "channelLogin": clean_slug }
    });

    let resp = http
        .post(TWITCH_GQL_URL)
        .header("Client-Id", TWITCH_WEB_CLIENT_ID)
        .header("Authorization", format!("OAuth {}", clean_token))
        .header("User-Agent", BROWSER_USER_AGENT)
        .json(&query)
        .send()
        .await
        .map_err(|e| format!("Falha ao consultar pontos Twitch: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("GQL retornou status HTTP {}", resp.status()));
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| format!("JSON inválido: {}", e))?;
    let balance = json
        .pointer("/data/channel/self/communityPoints/balance")
        .or_else(|| json.pointer("/data/community/channel/self/communityPoints/balance"))
        .and_then(|b| b.as_i64())
        .ok_or_else(|| "Saldo de pontos não encontrado na resposta".to_string())?;

    Ok(balance)
}
