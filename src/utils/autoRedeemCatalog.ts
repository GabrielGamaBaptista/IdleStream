import { BonusType, Platform } from '../types';

export type { BonusType };

export interface CatalogReward {
  key: string;            // Identificador único interno, ex: "twitch_xp_10h"
  platform: Platform;
  reward_title: string;   // Nome EXATO igual ao da plataforma
  cost: number;           // Custo em pontos
  duration_hours: number; // Duração do bônus em horas
  bonus_type: BonusType;
}

export const REWARD_CATALOG: CatalogReward[] = [
  // ── TWITCH ──────────────────────────────────────────────────────────────────
  // XP PokeIdle
  { key: 'twitch_xp_1h',   platform: 'twitch', reward_title: 'Bônus +15% XP PokeIdle',       cost: 300,   duration_hours: 1,  bonus_type: 'xp' },
  { key: 'twitch_xp_3h',   platform: 'twitch', reward_title: 'Bônus +15% XP PokeIdle (3h)',  cost: 900,   duration_hours: 3,  bonus_type: 'xp' },
  { key: 'twitch_xp_5h',   platform: 'twitch', reward_title: 'Bônus +15% XP PokeIdle (5h)',  cost: 1500,  duration_hours: 5,  bonus_type: 'xp' },
  { key: 'twitch_xp_10h',  platform: 'twitch', reward_title: 'Bônus +15% XP PokeIdle (10h)', cost: 3000,  duration_hours: 10, bonus_type: 'xp' },
  // Capture Boost
  { key: 'twitch_cap_1h',  platform: 'twitch', reward_title: 'Bônus de +15% Capture Boost',       cost: 500,  duration_hours: 1,  bonus_type: 'capture' },
  { key: 'twitch_cap_3h',  platform: 'twitch', reward_title: 'Bônus de +15% Capture Boost (3h)',  cost: 1500, duration_hours: 3,  bonus_type: 'capture' },
  { key: 'twitch_cap_5h',  platform: 'twitch', reward_title: 'Bônus de +15% Capture Boost (5h)',  cost: 2500, duration_hours: 5,  bonus_type: 'capture' },
  { key: 'twitch_cap_10h', platform: 'twitch', reward_title: 'Bônus de +15% Capture Boost (10h)', cost: 5000, duration_hours: 10, bonus_type: 'capture' },
  // Secret Lure
  { key: 'twitch_lure_1h',  platform: 'twitch', reward_title: 'Bônus de +15% Secret Lure',       cost: 1000,  duration_hours: 1,  bonus_type: 'lure' },
  { key: 'twitch_lure_3h',  platform: 'twitch', reward_title: 'Bônus de +15% Secret Lure (3h)',  cost: 3000,  duration_hours: 3,  bonus_type: 'lure' },
  { key: 'twitch_lure_5h',  platform: 'twitch', reward_title: 'Bônus de +15% Secret Lure (5h)',  cost: 5000,  duration_hours: 5,  bonus_type: 'lure' },
  { key: 'twitch_lure_10h', platform: 'twitch', reward_title: 'Bônus de +15% Secret Lure (10h)', cost: 10000, duration_hours: 10, bonus_type: 'lure' },

  // ── KICK ────────────────────────────────────────────────────────────────────
  // XP PokeIdle
  { key: 'kick_xp_1h',   platform: 'kick', reward_title: 'Bônus +15% XP PokeIdle',       cost: 200,  duration_hours: 1,  bonus_type: 'xp' },
  { key: 'kick_xp_3h',   platform: 'kick', reward_title: 'Bônus +15% XP PokeIdle (3h)',  cost: 600,  duration_hours: 3,  bonus_type: 'xp' },
  { key: 'kick_xp_5h',   platform: 'kick', reward_title: 'Bônus +15% XP PokeIdle (5h)',  cost: 1000, duration_hours: 5,  bonus_type: 'xp' },
  { key: 'kick_xp_10h',  platform: 'kick', reward_title: 'Bônus +15% XP PokeIdle (10h)', cost: 2000, duration_hours: 10, bonus_type: 'xp' },
  // Capture Boost
  { key: 'kick_cap_1h',  platform: 'kick', reward_title: 'Bônus de +15% Capture Boost',       cost: 500,  duration_hours: 1,  bonus_type: 'capture' },
  { key: 'kick_cap_3h',  platform: 'kick', reward_title: 'Bônus de +15% Capture Boost (3h)',  cost: 1500, duration_hours: 3,  bonus_type: 'capture' },
  { key: 'kick_cap_5h',  platform: 'kick', reward_title: 'Bônus de +15% Capture Boost (5h)',  cost: 2500, duration_hours: 5,  bonus_type: 'capture' },
  { key: 'kick_cap_10h', platform: 'kick', reward_title: 'Bônus de +15% Capture Boost (10h)', cost: 5000, duration_hours: 10, bonus_type: 'capture' },
  // Secret Lure
  { key: 'kick_lure_1h',  platform: 'kick', reward_title: 'Bônus de +15% Secret Lure',       cost: 1000,  duration_hours: 1,  bonus_type: 'lure' },
  { key: 'kick_lure_3h',  platform: 'kick', reward_title: 'Bônus de +15% Secret Lure (3h)',  cost: 3000,  duration_hours: 3,  bonus_type: 'lure' },
  { key: 'kick_lure_5h',  platform: 'kick', reward_title: 'Bônus de +15% Secret Lure (5h)',  cost: 5000,  duration_hours: 5,  bonus_type: 'lure' },
  { key: 'kick_lure_10h', platform: 'kick', reward_title: 'Bônus de +15% Secret Lure (10h)', cost: 10000, duration_hours: 10, bonus_type: 'lure' },
];

/** Retorna as variantes de um tipo de bônus/plataforma em ordem crescente de horas. */
export function getVariantsForBonusType(platform: Platform, bonus_type: BonusType): CatalogReward[] {
  return REWARD_CATALOG
    .filter((r) => r.platform === platform && r.bonus_type === bonus_type)
    .sort((a, b) => a.duration_hours - b.duration_hours);
}

/** Busca uma entrada do catálogo pela chave única. */
export function getCatalogByKey(key: string): CatalogReward | undefined {
  return REWARD_CATALOG.find((r) => r.key === key);
}

/** Busca uma entrada pelo título exato (case-insensitive) e plataforma. */
export function getCatalogByTitle(platform: Platform, title: string): CatalogReward | undefined {
  const t = title.trim().toLowerCase();
  return REWARD_CATALOG.find((r) => r.platform === platform && r.reward_title.toLowerCase() === t);
}

export interface DurationPlanStep {
  reward: CatalogReward;
  count: number; // quantas vezes resgatar este pacote
}

export interface DurationPlan {
  steps: DurationPlanStep[];
  total_cost: number;
  total_hours: number;
}

export interface DurationPlanError {
  error: string;
}

/**
 * RN-DUR-01: Calcula o plano de resgates para atingir `target_hours` sem exceder,
 * usando estratégia gulosa descendente (maior pacote que ainda cabe).
 *
 * Regras:
 * - Escolhe o maior pacote cujas `duration_hours <= remaining`
 * - Se `remaining < menor_pacote` (ex: remaining = 0.5 e menor = 1h), usa o menor
 *   para fechar a meta (extrapola o mínimo possível)
 * - Verifica se `total_cost <= available_points`
 */
export function planDurationRedeems(
  platform: Platform,
  bonus_type: BonusType,
  target_hours: number,
  available_points: number
): DurationPlan | DurationPlanError {
  if (target_hours <= 0) {
    return { error: 'A meta de horas deve ser maior que zero.' };
  }

  const variants = getVariantsForBonusType(platform, bonus_type);
  if (variants.length === 0) {
    return { error: 'Nenhuma variante disponível para este bônus/plataforma.' };
  }

  // Descendente: do maior para o menor
  const desc = [...variants].sort((a, b) => b.duration_hours - a.duration_hours);
  const smallest = variants[0]; // já ordenado crescente, logo [0] é o menor

  const stepMap = new Map<string, DurationPlanStep>();
  let remaining = target_hours;
  let total_cost = 0;

  while (remaining > 0) {
    const pick = desc.find((v) => v.duration_hours <= remaining) ?? smallest;
    const key = pick.key;
    const existing = stepMap.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      stepMap.set(key, { reward: pick, count: 1 });
    }
    total_cost += pick.cost;
    remaining -= pick.duration_hours;
    // Evitar loop infinito se duration_hours for 0 (nunca deve acontecer no catálogo)
    if (pick.duration_hours <= 0) break;
  }

  if (total_cost > available_points) {
    return {
      error: `Pontos insuficientes. Necessário: ${total_cost.toLocaleString('pt-BR')}, disponível: ${available_points.toLocaleString('pt-BR')}.`,
    };
  }

  const steps = [...stepMap.values()].sort((a, b) => b.reward.duration_hours - a.reward.duration_hours);
  const total_hours = steps.reduce((acc, s) => acc + s.reward.duration_hours * s.count, 0);

  return { steps, total_cost, total_hours };
}

/** Formata horas como "1h", "3h", "10h" */
export function formatHours(hours: number): string {
  if (hours === 1) return '1h';
  return `${hours}h`;
}

/** Formata custo com pontuação pt-BR: 1500 → "1.500" */
export function formatPoints(cost: number): string {
  return cost.toLocaleString('pt-BR');
}

/** Label bonusType legível */
export const BONUS_TYPE_LABELS: Record<BonusType, string> = {
  xp: 'XP PokeIdle',
  capture: 'Capture Boost',
  lure: 'Secret Lure',
};
