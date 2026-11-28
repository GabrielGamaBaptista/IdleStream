use crate::config::{BonusType, Platform};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy)]
pub struct CatalogReward {
    pub key: &'static str,
    pub platform: Platform,
    pub reward_title: &'static str,
    pub cost: i64,
    pub duration_hours: f64,
    pub bonus_type: BonusType,
}

/// Catálogo oficial completo (12 Twitch + 12 Kick) com nomes exatos, custos e durações.
pub const REWARD_CATALOG: &[CatalogReward] = &[
    // ── TWITCH ──────────────────────────────────────────────────────────────
    CatalogReward { key: "twitch_xp_1h",   platform: Platform::Twitch, reward_title: "Bônus +15% XP PokeIdle",       cost: 300,   duration_hours: 1.0,  bonus_type: BonusType::Xp },
    CatalogReward { key: "twitch_xp_3h",   platform: Platform::Twitch, reward_title: "Bônus +15% XP PokeIdle (3h)",  cost: 900,   duration_hours: 3.0,  bonus_type: BonusType::Xp },
    CatalogReward { key: "twitch_xp_5h",   platform: Platform::Twitch, reward_title: "Bônus +15% XP PokeIdle (5h)",  cost: 1500,  duration_hours: 5.0,  bonus_type: BonusType::Xp },
    CatalogReward { key: "twitch_xp_10h",  platform: Platform::Twitch, reward_title: "Bônus +15% XP PokeIdle (10h)", cost: 3000,  duration_hours: 10.0, bonus_type: BonusType::Xp },

    CatalogReward { key: "twitch_cap_1h",  platform: Platform::Twitch, reward_title: "Bônus de +15% Capture Boost",       cost: 500,  duration_hours: 1.0,  bonus_type: BonusType::Capture },
    CatalogReward { key: "twitch_cap_3h",  platform: Platform::Twitch, reward_title: "Bônus de +15% Capture Boost (3h)",  cost: 1500, duration_hours: 3.0,  bonus_type: BonusType::Capture },
    CatalogReward { key: "twitch_cap_5h",  platform: Platform::Twitch, reward_title: "Bônus de +15% Capture Boost (5h)",  cost: 2500, duration_hours: 5.0,  bonus_type: BonusType::Capture },
    CatalogReward { key: "twitch_cap_10h", platform: Platform::Twitch, reward_title: "Bônus de +15% Capture Boost (10h)", cost: 5000, duration_hours: 10.0, bonus_type: BonusType::Capture },

    CatalogReward { key: "twitch_lure_1h",  platform: Platform::Twitch, reward_title: "Bônus de +15% Secret Lure",       cost: 1000,  duration_hours: 1.0,  bonus_type: BonusType::Lure },
    CatalogReward { key: "twitch_lure_3h",  platform: Platform::Twitch, reward_title: "Bônus de +15% Secret Lure (3h)",  cost: 3000,  duration_hours: 3.0,  bonus_type: BonusType::Lure },
    CatalogReward { key: "twitch_lure_5h",  platform: Platform::Twitch, reward_title: "Bônus de +15% Secret Lure (5h)",  cost: 5000,  duration_hours: 5.0,  bonus_type: BonusType::Lure },
    CatalogReward { key: "twitch_lure_10h", platform: Platform::Twitch, reward_title: "Bônus de +15% Secret Lure (10h)", cost: 10000, duration_hours: 10.0, bonus_type: BonusType::Lure },

    // ── KICK ────────────────────────────────────────────────────────────────
    CatalogReward { key: "kick_xp_1h",   platform: Platform::Kick, reward_title: "Bônus +15% XP PokeIdle",       cost: 200,  duration_hours: 1.0,  bonus_type: BonusType::Xp },
    CatalogReward { key: "kick_xp_3h",   platform: Platform::Kick, reward_title: "Bônus +15% XP PokeIdle (3h)",  cost: 600,  duration_hours: 3.0,  bonus_type: BonusType::Xp },
    CatalogReward { key: "kick_xp_5h",   platform: Platform::Kick, reward_title: "Bônus +15% XP PokeIdle (5h)",  cost: 1000, duration_hours: 5.0,  bonus_type: BonusType::Xp },
    CatalogReward { key: "kick_xp_10h",  platform: Platform::Kick, reward_title: "Bônus +15% XP PokeIdle (10h)", cost: 2000, duration_hours: 10.0, bonus_type: BonusType::Xp },

    CatalogReward { key: "kick_cap_1h",  platform: Platform::Kick, reward_title: "Bônus de +15% Capture Boost",       cost: 500,  duration_hours: 1.0,  bonus_type: BonusType::Capture },
    CatalogReward { key: "kick_cap_3h",  platform: Platform::Kick, reward_title: "Bônus de +15% Capture Boost (3h)",  cost: 1500, duration_hours: 3.0,  bonus_type: BonusType::Capture },
    CatalogReward { key: "kick_cap_5h",  platform: Platform::Kick, reward_title: "Bônus de +15% Capture Boost (5h)",  cost: 2500, duration_hours: 5.0,  bonus_type: BonusType::Capture },
    CatalogReward { key: "kick_cap_10h", platform: Platform::Kick, reward_title: "Bônus de +15% Capture Boost (10h)", cost: 5000, duration_hours: 10.0, bonus_type: BonusType::Capture },

    CatalogReward { key: "kick_lure_1h",  platform: Platform::Kick, reward_title: "Bônus de +15% Secret Lure",       cost: 1000,  duration_hours: 1.0,  bonus_type: BonusType::Lure },
    CatalogReward { key: "kick_lure_3h",  platform: Platform::Kick, reward_title: "Bônus de +15% Secret Lure (3h)",  cost: 3000,  duration_hours: 3.0,  bonus_type: BonusType::Lure },
    CatalogReward { key: "kick_lure_5h",  platform: Platform::Kick, reward_title: "Bônus de +15% Secret Lure (5h)",  cost: 5000,  duration_hours: 5.0,  bonus_type: BonusType::Lure },
    CatalogReward { key: "kick_lure_10h", platform: Platform::Kick, reward_title: "Bônus de +15% Secret Lure (10h)", cost: 10000, duration_hours: 10.0, bonus_type: BonusType::Lure },
];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlannedStepDto {
    pub key: String,
    pub reward_title: String,
    pub cost: i64,
    pub duration_hours: f64,
    pub count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DurationPlanDto {
    pub steps: Vec<PlannedStepDto>,
    pub total_cost: i64,
    pub total_hours: f64,
    pub available_points: i64,
    pub enough_points: bool,
}

/// Retorna todas as variantes do catálogo para a plataforma e tipo de bônus em ordem decrescente de duração.
pub fn variants_desc(platform: Platform, bonus_type: BonusType) -> Vec<&'static CatalogReward> {
    let mut list: Vec<&'static CatalogReward> = REWARD_CATALOG
        .iter()
        .filter(|r| r.platform == platform && r.bonus_type == bonus_type)
        .collect();
    list.sort_by(|a, b| {
        b.duration_hours
            .partial_cmp(&a.duration_hours)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    list
}

/// Seleciona dinamicamente o maior pacote do catálogo que cabe tanto no tempo restante quanto no saldo atual.
pub fn pick_catalog_reward_for_budget(
    platform: Platform,
    bonus_type: BonusType,
    remaining_hours: f64,
    balance: i64,
) -> Option<&'static CatalogReward> {
    if remaining_hours <= 1e-6 || balance <= 0 {
        return None;
    }
    variants_desc(platform, bonus_type)
        .into_iter()
        .find(|r| r.duration_hours <= remaining_hours + 1e-6 && r.cost <= balance)
}

/// Retorna o menor custo de pacote para um determinado tipo de bônus na plataforma.
pub fn min_cost_for_bonus(platform: Platform, bonus_type: BonusType) -> Option<i64> {
    REWARD_CATALOG
        .iter()
        .filter(|r| r.platform == platform && r.bonus_type == bonus_type)
        .map(|r| r.cost)
        .min()
}

/// Calcula o plano guloso descendente sem exceder `target_hours`.
pub fn plan_duration_redeems(
    platform: Platform,
    bonus_type: BonusType,
    target_hours: f64,
    available_points: i64,
) -> Result<DurationPlanDto, String> {
    if !target_hours.is_finite() || target_hours <= 0.0 {
        return Err("A meta de horas deve ser maior que zero.".to_string());
    }

    let desc = variants_desc(platform, bonus_type);
    let smallest = desc
        .last()
        .copied()
        .ok_or_else(|| "Nenhuma variante disponível para este bônus/plataforma.".to_string())?;

    let mut counts: Vec<(&'static CatalogReward, u32)> = Vec::new();
    let mut remaining = target_hours;
    let mut total_cost: i64 = 0;

    while remaining > 1e-6 {
        let pick = desc
            .iter()
            .copied()
            .find(|v| v.duration_hours <= remaining + 1e-6)
            .unwrap_or(smallest);

        if let Some((_, c)) = counts.iter_mut().find(|(r, _)| r.key == pick.key) {
            *c += 1;
        } else {
            counts.push((pick, 1));
        }
        total_cost = total_cost.saturating_add(pick.cost);
        remaining -= pick.duration_hours;

        if pick.duration_hours <= 0.0 {
            break;
        }
    }

    let steps: Vec<PlannedStepDto> = counts
        .into_iter()
        .map(|(r, count)| PlannedStepDto {
            key: r.key.to_string(),
            reward_title: r.reward_title.to_string(),
            cost: r.cost,
            duration_hours: r.duration_hours,
            count,
        })
        .collect();

    let total_hours: f64 = steps
        .iter()
        .map(|s| s.duration_hours * (s.count as f64))
        .sum();

    Ok(DurationPlanDto {
        steps,
        total_cost,
        total_hours,
        available_points,
        enough_points: available_points >= total_cost,
    })
}
