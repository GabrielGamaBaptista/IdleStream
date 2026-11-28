use crate::auto_redeem::models::{RedeemError, RedeemResult};
use crate::twitch::gql::{
    BROWSER_USER_AGENT, TWITCH_ANDROID_CLIENT_ID, TWITCH_GQL_URL, TWITCH_WEB_CLIENT_ID,
};
use serde_json::json;

/// Decodifica `%7C` para `|` em tokens Bearer da Kick sem causar dupla decodificação.
pub fn decode_kick_bearer(token: &str) -> String {
    token.trim().replace("%7C", "|").replace("%7c", "|")
}

/// Normaliza título de recompensa removendo acentos, pontuação secundária e espaços extras.
fn normalize_reward_title(raw: &str) -> String {
    let mut out = String::with_capacity(raw.len());
    let mut prev_space = true;
    for ch in raw.trim().to_lowercase().chars() {
        let mapped = match ch {
            'á' | 'à' | 'â' | 'ã' | 'ä' => 'a',
            'é' | 'è' | 'ê' | 'ë' => 'e',
            'í' | 'ì' | 'î' | 'ï' => 'i',
            'ó' | 'ò' | 'ô' | 'õ' | 'ö' => 'o',
            'ú' | 'ù' | 'û' | 'ü' => 'u',
            'ç' => 'c',
            c if c.is_alphanumeric() || c == '+' || c == '%' => c,
            _ => ' ',
        };
        if mapped == ' ' {
            if !prev_space {
                out.push(' ');
                prev_space = true;
            }
        } else {
            out.push(mapped);
            prev_space = false;
        }
    }
    out.trim().to_string()
}

fn significant_tokens(normalized: &str) -> Vec<String> {
    normalized
        .split_whitespace()
        .filter(|tok| !matches!(*tok, "de" | "da" | "do" | "e" | "a" | "o"))
        .map(|s| s.to_string())
        .collect()
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct TwitchCustomReward {
    pub id: String,
    pub title: String,
    pub cost: i64,
    #[serde(default)]
    pub prompt: String,
}

/// Faz o parsing detalhado da lista de `customRewards` a partir de resposta GraphQL da Twitch.
pub fn parse_twitch_rewards_detailed_response(json: &serde_json::Value) -> Vec<TwitchCustomReward> {
    let rewards_arr = json
        .pointer("/data/user/channel/communityPointsSettings/customRewards")
        .or_else(|| json.pointer("/data/channel/communityPointsSettings/customRewards"))
        .or_else(|| json.pointer("/data/community/channel/communityPointsSettings/customRewards"))
        .or_else(|| json.pointer("/data/user/communityPointsSettings/customRewards"))
        .and_then(|v| v.as_array());

    let Some(arr) = rewards_arr else {
        return Vec::new();
    };

    arr.iter()
        .filter_map(|item| {
            let is_enabled = item
                .get("isEnabled")
                .and_then(|v| v.as_bool())
                .unwrap_or(true);
            let is_paused = item
                .get("isPaused")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            if !is_enabled || is_paused {
                return None;
            }

            let id = item.get("id").and_then(|v| v.as_str())?.trim().to_string();
            let title = item.get("title").and_then(|v| v.as_str())?.trim().to_string();
            let cost = item.get("cost").and_then(|v| v.as_i64()).unwrap_or(0);
            let prompt = item
                .get("prompt")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            if id.is_empty() || title.is_empty() {
                return None;
            }
            Some(TwitchCustomReward {
                id,
                title,
                cost,
                prompt,
            })
        })
        .collect()
}

/// Faz o parsing da lista de customRewards a partir de resposta GraphQL da Twitch.
/// Retorna tuplas `(reward_id, title, cost)`.
pub fn parse_twitch_rewards_list_response(json: &serde_json::Value) -> Vec<(String, String, i64)> {
    parse_twitch_rewards_detailed_response(json)
        .into_iter()
        .map(|r| (r.id, r.title, r.cost))
        .collect()
}

/// Faz o parsing da lista de recompensas da Kick a partir de resposta REST `GET /rewards`.
pub fn parse_kick_rewards_list_response(
    status: u16,
    body: &str,
) -> Result<Vec<(String, String, i64)>, String> {
    if !(200..=299).contains(&status) {
        return Err(format!("Kick HTTP {}: {}", status, body));
    }

    let val: serde_json::Value =
        serde_json::from_str(body).map_err(|e| format!("JSON inválido Kick rewards: {}", e))?;

    let arr = val
        .get("data")
        .and_then(|d| d.as_array())
        .or_else(|| val.as_array())
        .ok_or_else(|| "Lista de recompensas Kick ausente no JSON".to_string())?;

    let parsed = arr
        .iter()
        .filter_map(|item| {
            let enabled = item
                .get("is_enabled")
                .or_else(|| item.get("enabled"))
                .and_then(|v| v.as_bool())
                .unwrap_or(true);
            if !enabled {
                return None;
            }
            let id = item.get("id").and_then(|v| {
                v.as_str()
                    .map(|s| s.trim().to_string())
                    .or_else(|| v.as_u64().map(|n| n.to_string()))
            })?;
            let title = item
                .get("title")
                .or_else(|| item.get("name"))
                .and_then(|v| v.as_str())?
                .trim()
                .to_string();
            let cost = item
                .get("cost")
                .or_else(|| item.get("points"))
                .and_then(|v| v.as_i64())
                .unwrap_or(0);
            if id.is_empty() || title.is_empty() {
                return None;
            }
            Some((id, title, cost))
        })
        .collect();

    Ok(parsed)
}

/// Resolve `reward_id` a partir da lista `(id, title, cost)` pelo título exato (case-insensitive)
/// com fallback normalizado por título semelhante + custo exato (RN-05 / RN-13).
pub fn find_reward_id_by_name(
    rewards: &[(String, String, i64)],
    title: &str,
    cost: i64,
) -> Option<String> {
    let target_trimmed = title.trim();
    if target_trimmed.is_empty() {
        return None;
    }

    // 1. Match exato (case-insensitive) + custo exato
    if cost > 0 {
        if let Some((id, _, _)) = rewards
            .iter()
            .find(|(_, r_title, r_cost)| r_title.trim().eq_ignore_ascii_case(target_trimmed) && *r_cost == cost)
        {
            return Some(id.clone());
        }
    }

    // 2. Match exato (case-insensitive) ignorando variação de custo
    if let Some((id, _, _)) = rewards
        .iter()
        .find(|(_, r_title, _)| r_title.trim().eq_ignore_ascii_case(target_trimmed))
    {
        return Some(id.clone());
    }

    // 3. Fallback normalizado (sem acentos / pontuação)
    let norm_target = normalize_reward_title(target_trimmed);
    if cost > 0 {
        if let Some((id, _, _)) = rewards
            .iter()
            .find(|(_, r_title, r_cost)| *r_cost == cost && normalize_reward_title(r_title) == norm_target)
        {
            return Some(id.clone());
        }
    }

    if let Some((id, _, _)) = rewards
        .iter()
        .find(|(_, r_title, _)| normalize_reward_title(r_title) == norm_target)
    {
        return Some(id.clone());
    }

    // 4. Fallback por similaridade de tokens + custo exato (RN-13)
    if cost > 0 {
        let target_tokens = significant_tokens(&norm_target);
        if !target_tokens.is_empty() {
            let mut best: Option<(&str, usize)> = None;
            for (id, r_title, r_cost) in rewards {
                if *r_cost != cost {
                    continue;
                }
                let r_tokens = significant_tokens(&normalize_reward_title(r_title));
                let overlap = target_tokens
                    .iter()
                    .filter(|t| r_tokens.contains(t))
                    .count();
                let min_len = target_tokens.len().min(r_tokens.len());
                // Exige ao menos 2 tokens significativos em comum e cobertura >= 60% do menor título
                if overlap >= 2 && overlap * 10 >= min_len * 6 {
                    if best.map_or(true, |(_, best_ov)| overlap > best_ov) {
                        best = Some((id.as_str(), overlap));
                    }
                }
            }
            if let Some((id, _)) = best {
                return Some(id.to_string());
            }
        }
    }

    None
}

/// Resolve a recompensa detalhada (`TwitchCustomReward`) pelo nome/custo.
pub fn find_twitch_reward_by_name<'a>(
    rewards: &'a [TwitchCustomReward],
    title: &str,
    cost: i64,
) -> Option<&'a TwitchCustomReward> {
    let tuples: Vec<(String, String, i64)> = rewards
        .iter()
        .map(|r| (r.id.clone(), r.title.clone(), r.cost))
        .collect();
    let matched_id = find_reward_id_by_name(&tuples, title, cost)?;
    rewards.iter().find(|r| r.id == matched_id)
}

/// Verifica se uma mensagem de erro da Twitch indica que o `rewardID` ou suas propriedades em cache mudaram.
pub fn is_reward_not_found_error(err: &RedeemError) -> bool {
    match err {
        RedeemError::RewardNotFound(_) => true,
        RedeemError::Unknown(msg) => {
            let u = msg.to_uppercase();
            u.contains("REWARD_NOT_FOUND")
                || u.contains("CUSTOM_REWARD_NOT_FOUND")
                || u.contains("INVALID_REWARD")
                || u.contains("DOES_NOT_EXIST")
                || u.contains("NOT_FOUND")
                || u.contains("PROPERTIES_MISMATCH")
        }
        _ => false,
    }
}

/// Faz o parsing da resposta GraphQL `RedeemCustomReward` (`redeemCommunityPointsCustomReward`) da Twitch.
pub fn parse_twitch_redeem_response(json: &serde_json::Value) -> Result<RedeemResult, RedeemError> {
    if let Some(errors) = json.get("errors").and_then(|e| e.as_array()) {
        if !errors.is_empty() {
            let msg = errors
                .iter()
                .filter_map(|e| e.get("message").and_then(|m| m.as_str()))
                .collect::<Vec<_>>()
                .join(" | ");
            return Err(classify_twitch_redeem_error(&msg));
        }
    }

    if let Some(payload_obj) = json
        .pointer("/data/redeemCommunityPointsCustomReward")
        .filter(|v| v.is_object())
    {
        if let Some(err_code) = payload_obj.pointer("/error/code").and_then(|c| c.as_str()) {
            return Err(classify_twitch_redeem_error(err_code));
        }
        // A persistedQuery `RedeemCustomReward` retorna `{"__typename":"RedeemCommunityPointsCustomRewardPayload","error":null}` quando o resgate é concluído com sucesso.
        if payload_obj.get("error").map_or(false, |e| e.is_null()) {
            let id = payload_obj
                .pointer("/redemption/id")
                .and_then(|i| i.as_str())
                .unwrap_or("twitch_ok")
                .to_string();
            return Ok(RedeemResult {
                redemption_id: id,
                redeemed_at: chrono::Utc::now().timestamp(),
            });
        }
    }

    if let Some(redemption) = json
        .pointer("/data/redeemCommunityPointsCustomReward/redemption")
        .or_else(|| json.pointer("/data/redeemCustomReward/redemption"))
    {
        if !redemption.is_null() {
            let id = redemption
                .get("id")
                .and_then(|i| i.as_str())
                .unwrap_or("ok")
                .to_string();
            return Ok(RedeemResult {
                redemption_id: id,
                redeemed_at: chrono::Utc::now().timestamp(),
            });
        }
    }

    Err(RedeemError::Unknown(format!(
        "Resposta inesperada do GQL Twitch: {}",
        json
    )))
}

fn classify_twitch_redeem_error(msg: &str) -> RedeemError {
    let upper = msg.to_uppercase();

    if upper.contains("COOLDOWN") {
        return RedeemError::CooldownActive {
            retry_after_secs: Some(300),
        };
    }
    if upper.contains("NOT_ENOUGH_POINTS") || upper.contains("INSUFFICIENT") {
        return RedeemError::InsufficientPoints {
            balance: 0,
            required: 0,
        };
    }
    if upper.contains("REWARD_NOT_FOUND")
        || upper.contains("CUSTOM_REWARD_NOT_FOUND")
        || upper.contains("INVALID_REWARD")
        || upper.contains("REWARD_DISABLED")
        || upper.contains("NOT_FOUND")
    {
        return RedeemError::RewardNotFound(msg.to_string());
    }
    if upper.contains("LIMIT")
        || upper.contains("MAX_PER_STREAM")
        || upper.contains("MAX_PER_USER")
    {
        return RedeemError::LimitReached;
    }
    if upper.contains("UNAUTHENTICATED")
        || upper.contains("INVALID_TOKEN")
        || upper.contains("UNAUTHORIZED")
    {
        return RedeemError::AuthError(msg.to_string());
    }
    RedeemError::Unknown(if msg.is_empty() {
        "Erro desconhecido na mutação Twitch".to_string()
    } else {
        msg.to_string()
    })
}

/// Faz o parsing da resposta HTTP do endpoint de resgate da Kick.
pub fn parse_kick_redeem_response(status: u16, body: &str) -> Result<RedeemResult, RedeemError> {
    if (200..=299).contains(&status) {
        let parsed = serde_json::from_str::<serde_json::Value>(body).ok();
        let id = parsed
            .as_ref()
            .and_then(|v| {
                v.pointer("/data/id")
                    .or_else(|| v.get("id"))
                    .and_then(|x| {
                        x.as_str()
                            .map(|s| s.to_string())
                            .or_else(|| x.as_u64().map(|n| n.to_string()))
                    })
            })
            .unwrap_or_else(|| "kick_ok".to_string());

        return Ok(RedeemResult {
            redemption_id: id,
            redeemed_at: chrono::Utc::now().timestamp(),
        });
    }

    let lower = body.to_lowercase();
    match status {
        401 => Err(RedeemError::AuthError("Sessão Kick expirada (HTTP 401)".to_string())),
        403 => {
            if lower.contains("unauthenticated") {
                Err(RedeemError::AuthError("Sessão Kick não autenticada (HTTP 403)".to_string()))
            } else {
                Err(RedeemError::CooldownActive {
                    retry_after_secs: Some(300),
                })
            }
        }
        404 => Err(RedeemError::RewardNotFound(format!(
            "Recompensa Kick não encontrada (HTTP 404): {}",
            body
        ))),
        422 | 400 => {
            if lower.contains("enough") || lower.contains("insufficient") || lower.contains("points") {
                Err(RedeemError::InsufficientPoints {
                    balance: 0,
                    required: 0,
                })
            } else if lower.contains("cooldown") {
                Err(RedeemError::CooldownActive {
                    retry_after_secs: Some(300),
                })
            } else if lower.contains("limit") {
                Err(RedeemError::LimitReached)
            } else {
                Err(RedeemError::Unknown(format!("Kick HTTP {}: {}", status, body)))
            }
        }
        429 => Err(RedeemError::CooldownActive {
            retry_after_secs: Some(60),
        }),
        _ => Err(RedeemError::NetworkError(format!("Kick HTTP {}: {}", status, body))),
    }
}

/// Resolve o `channel_id` numérico da Twitch a partir do `channel_slug` via GQL.
pub async fn resolve_twitch_channel_id(
    http: &reqwest::Client,
    channel_slug: &str,
    oauth_token: Option<&str>,
) -> Result<String, String> {
    let clean_slug = channel_slug.trim().trim_start_matches('#').to_lowercase();
    let payload = json!({
        "query": "query($login: String!) { user(login: $login) { id } }",
        "variables": { "login": clean_slug }
    });

    let mut req = http
        .post(TWITCH_GQL_URL)
        .header("Client-Id", TWITCH_WEB_CLIENT_ID)
        .header("User-Agent", BROWSER_USER_AGENT)
        .json(&payload);

    if let Some(tok) = oauth_token {
        let clean = tok.trim_start_matches("oauth:").trim();
        if !clean.is_empty() {
            req = req.header("Authorization", format!("OAuth {}", clean));
        }
    }

    let resp = req
        .send()
        .await
        .map_err(|e| format!("Falha ao resolver channel_id Twitch: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("GQL retornou HTTP {} ao resolver canal", resp.status()));
    }

    let data: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("JSON inválido ao resolver channel_id: {}", e))?;

    data.pointer("/data/user/id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| format!("Canal Twitch '{}' não encontrado", clean_slug))
}

/// Consulta `channel_id` e lista detalhada de `customRewards` (incluindo `prompt`) de um canal Twitch via GraphQL.
pub async fn fetch_twitch_channel_and_rewards_detailed(
    http: &reqwest::Client,
    channel_slug: &str,
    oauth_token: Option<&str>,
) -> Result<(Option<String>, Vec<TwitchCustomReward>), RedeemError> {
    let clean_slug = channel_slug.trim().trim_start_matches('#').to_lowercase();
    let payload = json!({
        "query": "query ChannelCustomRewards($login: String!) { user(login: $login) { id channel { id communityPointsSettings { customRewards { id title cost prompt isEnabled isPaused } } } } }",
        "variables": { "login": clean_slug }
    });

    let clean_token = oauth_token
        .map(|t| t.trim_start_matches("oauth:").trim())
        .filter(|t| !t.is_empty());

    let mut web_req = http
        .post(TWITCH_GQL_URL)
        .header("Client-Id", TWITCH_WEB_CLIENT_ID)
        .header("User-Agent", BROWSER_USER_AGENT)
        .header("Origin", "https://www.twitch.tv")
        .header("Referer", "https://www.twitch.tv/")
        .json(&payload);

    if let Some(tok) = clean_token {
        web_req = web_req.header("Authorization", format!("OAuth {}", tok));
    }

    let resp = web_req
        .send()
        .await
        .map_err(|e| RedeemError::NetworkError(format!("Falha ao listar recompensas Twitch: {}", e)))?;

    if resp.status().as_u16() == 401 {
        return Err(RedeemError::AuthError("Token Twitch inválido ou expirado (401)".to_string()));
    }
    if !resp.status().is_success() {
        return Err(RedeemError::NetworkError(format!(
            "GQL retornou HTTP {} ao listar recompensas",
            resp.status()
        )));
    }

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| RedeemError::NetworkError(format!("JSON inválido ao listar recompensas: {}", e)))?;

    let has_errors = json
        .get("errors")
        .and_then(|e| e.as_array())
        .map(|a| !a.is_empty())
        .unwrap_or(false);

    let mut channel_id = json
        .pointer("/data/user/id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let mut rewards = parse_twitch_rewards_detailed_response(&json);

    // Fallback com Android Client-Id caso o Web Client receba erro/integridade e não retorne recompensas
    if rewards.is_empty() && has_errors {
        let mut android_req = http
            .post(TWITCH_GQL_URL)
            .header("Client-Id", TWITCH_ANDROID_CLIENT_ID)
            .header("User-Agent", "okhttp/4.12.0")
            .json(&payload);

        if let Some(tok) = clean_token {
            android_req = android_req.header("Authorization", format!("OAuth {}", tok));
        }

        if let Ok(a_resp) = android_req.send().await {
            if a_resp.status().is_success() {
                if let Ok(a_json) = a_resp.json::<serde_json::Value>().await {
                    if channel_id.is_none() {
                        channel_id = a_json
                            .pointer("/data/user/id")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());
                    }
                    rewards = parse_twitch_rewards_detailed_response(&a_json);
                }
            }
        }
    }

    Ok((channel_id, rewards))
}

/// Consulta `channel_id` e lista `customRewards` de um canal Twitch via GraphQL.
pub async fn fetch_twitch_channel_and_rewards(
    http: &reqwest::Client,
    channel_slug: &str,
    oauth_token: Option<&str>,
) -> Result<(Option<String>, Vec<(String, String, i64)>), RedeemError> {
    let (cid, detailed) =
        fetch_twitch_channel_and_rewards_detailed(http, channel_slug, oauth_token).await?;
    let tuples = detailed
        .into_iter()
        .map(|r| (r.id, r.title, r.cost))
        .collect();
    Ok((cid, tuples))
}

/// Consulta apenas as recompensas personalizadas de um canal Twitch via GraphQL.
pub async fn list_twitch_rewards(
    http: &reqwest::Client,
    channel_slug: &str,
    oauth_token: Option<&str>,
) -> Result<Vec<(String, String, i64)>, RedeemError> {
    let (_, rewards) = fetch_twitch_channel_and_rewards(http, channel_slug, oauth_token).await?;
    Ok(rewards)
}

pub const REDEEM_CUSTOM_REWARD_HASH: &str =
    "d56249a7adb4978898ea3412e196688d4ac3cea1c0c2dfd65561d229ea5dcc42";

/// Executa a mutação `RedeemCustomReward` (`redeemCommunityPointsCustomReward`) na Twitch via GraphQL.
pub async fn execute_twitch_redeem(
    http: &reqwest::Client,
    oauth_token: &str,
    channel_id: &str,
    reward_id: &str,
    reward_title: &str,
    cost: i64,
    prompt: &str,
    text_input: &str,
) -> Result<RedeemResult, RedeemError> {
    let clean_token = oauth_token.trim_start_matches("oauth:").trim();
    if clean_token.is_empty() {
        return Err(RedeemError::AuthError("Token OAuth Twitch ausente".to_string()));
    }

    let tx_id = uuid::Uuid::new_v4().to_string().replace('-', "");
    let mut input = json!({
        "channelID": channel_id,
        "rewardID": reward_id,
        "cost": cost,
        "title": reward_title,
        "prompt": prompt,
        "transactionID": tx_id,
    });
    if !text_input.trim().is_empty() {
        input["textInput"] = json!(text_input.trim());
    }

    let payload = json!({
        "operationName": "RedeemCustomReward",
        "variables": {
            "input": input
        },
        "extensions": {
            "persistedQuery": {
                "version": 1,
                "sha256Hash": REDEEM_CUSTOM_REWARD_HASH
            }
        }
    });

    // Tenta primeiro com TWITCH_WEB_CLIENT_ID e faz fallback para TWITCH_ANDROID_CLIENT_ID em erro de integridade
    let web_resp = http
        .post(TWITCH_GQL_URL)
        .header("Client-Id", TWITCH_WEB_CLIENT_ID)
        .header("Authorization", format!("OAuth {}", clean_token))
        .header("Content-Type", "application/json")
        .header("Origin", "https://www.twitch.tv")
        .header("Referer", "https://www.twitch.tv/")
        .header("User-Agent", BROWSER_USER_AGENT)
        .json(&payload)
        .send()
        .await
        .map_err(|e| RedeemError::NetworkError(e.to_string()))?;

    let status = web_resp.status();
    if status.as_u16() == 401 {
        return Err(RedeemError::AuthError("Token Twitch inválido ou expirado (401)".to_string()));
    }

    let web_json: serde_json::Value = web_resp
        .json()
        .await
        .map_err(|e| RedeemError::NetworkError(format!("JSON inválido: {}", e)))?;

    match parse_twitch_redeem_response(&web_json) {
        Ok(res) => Ok(res),
        Err(RedeemError::Unknown(ref msg)) if msg.to_lowercase().contains("integrity") => {
            // Fallback para Client-Id Android oficial caso Kasada/Integrity bloqueie o Web Client
            let android_resp = http
                .post(TWITCH_GQL_URL)
                .header("Client-Id", TWITCH_ANDROID_CLIENT_ID)
                .header("Authorization", format!("OAuth {}", clean_token))
                .header("User-Agent", "okhttp/4.12.0")
                .header("Content-Type", "application/json")
                .json(&payload)
                .send()
                .await
                .map_err(|e| RedeemError::NetworkError(e.to_string()))?;

            let android_json: serde_json::Value = android_resp
                .json()
                .await
                .map_err(|e| RedeemError::NetworkError(format!("JSON inválido: {}", e)))?;

            parse_twitch_redeem_response(&android_json)
        }
        Err(e) => Err(e),
    }
}

/// Executa o resgate de recompensa na Kick via `kick_http_request` (curl.exe / OkHttp).
pub async fn execute_kick_redeem(
    bearer_token: &str,
    channel_slug: &str,
    reward_id: &str,
) -> Result<RedeemResult, RedeemError> {
    let decoded_token = decode_kick_bearer(bearer_token);
    if decoded_token.is_empty() {
        return Err(RedeemError::AuthError("Token Bearer Kick ausente".to_string()));
    }

    let clean_slug = channel_slug.trim().trim_start_matches('/').to_lowercase();
    let url = format!(
        "https://kick.com/api/v2/channels/{}/rewards/{}/redeem",
        clean_slug,
        reward_id.trim()
    );
    let auth_header = format!("Bearer {}", decoded_token);
    let referer = format!("https://kick.com/{}", clean_slug);

    let headers = [
        ("Authorization", auth_header.as_str()),
        ("Content-Type", "application/json"),
        ("Accept", "application/json"),
        ("Origin", "https://kick.com"),
        ("Referer", referer.as_str()),
        ("User-Agent", BROWSER_USER_AGENT),
    ];

    let (status, body) =
        crate::kick::http::kick_http_request("POST", &url, Some(&headers), Some("{}"), 12)
            .await
            .map_err(RedeemError::NetworkError)?;

    parse_kick_redeem_response(status, &body)
}
