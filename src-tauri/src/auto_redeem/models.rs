use crate::config::{AutoRedeemConfig, Platform, RedeemMode};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RedeemResult {
    pub redemption_id: String,
    pub redeemed_at: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RedeemError {
    CooldownActive { retry_after_secs: Option<u64> },
    InsufficientPoints { balance: i64, required: i64 },
    RewardNotFound(String),
    NetworkError(String),
    AuthError(String),
    LimitReached,
    Unknown(String),
}

impl std::fmt::Display for RedeemError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RedeemError::CooldownActive { retry_after_secs } => {
                if let Some(secs) = retry_after_secs {
                    write!(f, "Cooldown ativo (tente novamente em {}s)", secs)
                } else {
                    write!(f, "Cooldown ativo na recompensa")
                }
            }
            RedeemError::InsufficientPoints { balance, required } => {
                write!(f, "Pontos insuficientes ({} < {})", balance, required)
            }
            RedeemError::RewardNotFound(msg) => write!(f, "Recompensa não encontrada: {}", msg),
            RedeemError::NetworkError(msg) => write!(f, "Erro de rede: {}", msg),
            RedeemError::AuthError(msg) => write!(f, "Erro de autenticação: {}", msg),
            RedeemError::LimitReached => write!(f, "Limite de resgates da transmissão atingido"),
            RedeemError::Unknown(msg) => write!(f, "{}", msg),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoRedeemExecutedPayload {
    pub redeem_id: String,
    pub account_id: String,
    pub channel_slug: String,
    pub success: bool,
    pub message: String,
    pub new_total: u32,
    pub redeemed_at: Option<i64>,
    pub next_available_at: Option<i64>,
    #[serde(default)]
    pub hours_added: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoRedeemErrorPayload {
    pub redeem_id: String,
    pub account_id: String,
    pub error_kind: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoRedeemGoalReachedPayload {
    pub redeem_id: String,
    pub account_id: String,
    pub channel_slug: String,
    pub target_hours: f64,
    pub accumulated_hours: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoRedeemRewardResolvedPayload {
    pub redeem_id: String,
    pub channel_slug: String,
    pub reward_title: String,
    pub reward_id: String,
}

/// Valida os campos básicos de recompensa e duração para criação/edição.
pub fn validate_auto_redeem_fields(cfg: &AutoRedeemConfig) -> Result<(), String> {
    if cfg.reward_title.trim().is_empty() {
        return Err("O nome da recompensa (reward_title) não pode ser vazio".to_string());
    }

    let has_reward_id = cfg
        .reward_id
        .as_deref()
        .map(|s| !s.trim().is_empty())
        .unwrap_or(false);

    if cfg.auto_select_package {
        if cfg.platform != Platform::Twitch {
            return Err(
                "A seleção automática de pacotes por saldo está disponível apenas na Twitch no momento."
                    .to_string(),
            );
        }
        if cfg.bonus_type.is_none() {
            return Err("Selecione o tipo de bônus para o modo automático por duração.".to_string());
        }
        if cfg.redeem_mode != RedeemMode::Duration {
            return Err("O modo automático por saldo requer uma meta de duração em horas.".to_string());
        }
    } else {
        if cfg.platform == Platform::Kick && !has_reward_id {
            return Err(
                "Na Kick, informe o ID da recompensa (reward_id). A resolução automática por nome está disponível apenas na Twitch."
                    .to_string(),
            );
        }
        if cfg.cost <= 0 {
            return Err("O custo da recompensa deve ser maior que zero".to_string());
        }
    }

    if cfg.redeem_mode == RedeemMode::Duration {
        let target = cfg.target_duration_hours.unwrap_or(0.0);
        if !target.is_finite() || target <= 0.0 {
            return Err("Informe uma meta de duração em horas maior que zero".to_string());
        }
    }

    Ok(())
}

/// Valida e aplica as regras de negócio RN-01, RN-02 e RN-03 ao adicionar um AutoRedeemConfig.
/// Retorna a lista de IDs de configs removidas (caso replace_existing=true para RN-03).
pub fn apply_add_auto_redeem_rules(
    existing: &mut Vec<AutoRedeemConfig>,
    new_cfg: AutoRedeemConfig,
    replace_existing: bool,
) -> Result<Vec<String>, String> {
    validate_auto_redeem_fields(&new_cfg)?;

    let mut removed_ids = Vec::new();

    if new_cfg.all_channels {
        // RN-01: se já existe uma config global para esta conta, rejeita
        let has_global = existing
            .iter()
            .any(|c| c.account_id == new_cfg.account_id && c.all_channels);
        if has_global {
            return Err("Já existe um resgate global para esta conta".to_string());
        }

        // RN-03: se existem configs específicas para esta conta, só permite substituir com replace_existing=true
        let has_specific = existing
            .iter()
            .any(|c| c.account_id == new_cfg.account_id && !c.all_channels);
        if has_specific {
            if !replace_existing {
                return Err(
                    "Esta conta já possui resgates específicos por canal. Confirme a substituição para ativar o modo global."
                        .to_string(),
                );
            }
            existing.retain(|c| {
                if c.account_id == new_cfg.account_id {
                    removed_ids.push(c.id.clone());
                    false
                } else {
                    true
                }
            });
        }
    } else {
        let slug = new_cfg
            .channel_slug
            .as_deref()
            .map(|s| s.trim().trim_start_matches('#').to_lowercase())
            .unwrap_or_default();
        if slug.is_empty() {
            return Err("Informe o canal específico ou marque 'Todos os canais'".to_string());
        }

        // RN-01: se já existe config global para esta conta, não pode adicionar específica
        let has_global = existing
            .iter()
            .any(|c| c.account_id == new_cfg.account_id && c.all_channels);
        if has_global {
            return Err(
                "Já existe um resgate global ativo para esta conta. Remova-o ou desative-o antes de adicionar um canal específico."
                    .to_string(),
            );
        }

        // RN-02: não permite duplicata no mesmo account_id + channel_slug
        let duplicate = existing.iter().any(|c| {
            c.account_id == new_cfg.account_id
                && !c.all_channels
                && c.channel_slug
                    .as_deref()
                    .map(|s| s.trim().trim_start_matches('#').eq_ignore_ascii_case(&slug))
                    .unwrap_or(false)
        });
        if duplicate {
            return Err("Já existe resgate configurado para este canal".to_string());
        }
    }

    existing.push(new_cfg);
    Ok(removed_ids)
}
