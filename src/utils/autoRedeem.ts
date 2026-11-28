import {
  AutoRedeemConfig,
  AutoRedeemErrorPayload,
  AutoRedeemExecutedPayload,
  AutoRedeemGoalReachedPayload,
  BonusType,
  Platform,
  RedeemMode,
} from '../types';

export interface AutoRedeemFormInput {
  accountId: string;
  platform: Platform;
  allChannels: boolean;
  channelSlug: string;
  channelId: string;
  rewardId: string;
  rewardTitle: string;
  cost: number;
  textInput: string;
  isCatalogMode?: boolean;
  catalogKey?: string | null;
  durationHours?: number | null;
  bonusType?: BonusType | null;
  autoSelectPackage?: boolean;
  redeemMode?: RedeemMode;
  targetDurationHours?: number | null;
}

export interface AutoRedeemValidationResult {
  valid: boolean;
  error: string | null;
  requiresReplaceConfirmation: boolean;
  specificCountToReplace: number;
}

/**
 * Valida os dados do formulário de Auto-Resgate aplicando as regras RN-01..RN-14 e Q4.
 */
export function validateAutoRedeemForm(
  input: AutoRedeemFormInput,
  existingConfigs: AutoRedeemConfig[],
  editingId?: string | null
): AutoRedeemValidationResult {
  const fail = (error: string): AutoRedeemValidationResult => ({
    valid: false,
    error,
    requiresReplaceConfirmation: false,
    specificCountToReplace: 0,
  });

  const redeemMode: RedeemMode = input.redeemMode ?? 'forever';
  const isAutoSelect = Boolean(input.autoSelectPackage);
  const isCatalog = Boolean(input.isCatalogMode || input.catalogKey);

  if (isAutoSelect) {
    if (input.platform !== 'twitch') {
      return fail('A seleção automática por saldo e duração está disponível apenas na Twitch no momento.');
    }
    if (!input.bonusType) {
      return fail('Selecione o tipo de bônus para o modo automático.');
    }
    if (redeemMode !== 'duration') {
      return fail('O modo automático por saldo requer uma meta de duração em horas.');
    }
  } else {
    if (!input.rewardTitle.trim()) {
      return fail('Informe o nome da recompensa.');
    }
    if (input.platform === 'kick' && !input.rewardId.trim()) {
      return fail(
        'Na Kick, informe o ID da recompensa (resolução automática por nome disponível apenas na Twitch).'
      );
    }
    if (!isCatalog && !input.rewardId.trim()) {
      return fail('Informe o ID da recompensa (reward_id).');
    }
    if (!Number.isFinite(input.cost) || input.cost <= 0) {
      return fail('O custo em pontos deve ser maior que zero.');
    }
  }

  if (redeemMode === 'duration') {
    const target = input.targetDurationHours ?? 0;
    if (!Number.isFinite(target) || target <= 0) {
      return fail('Informe uma meta de horas maior que zero.');
    }
  }

  const others = existingConfigs.filter(
    (c) => c.account_id === input.accountId && c.id !== editingId
  );

  if (input.allChannels) {
    const hasGlobal = others.some((c) => c.all_channels);
    if (hasGlobal) {
      return fail('RN-01: Já existe um resgate global configurado para esta conta.');
    }

    const specificList = others.filter((c) => !c.all_channels);
    if (specificList.length > 0 && !editingId) {
      return {
        valid: true,
        error: null,
        requiresReplaceConfirmation: true,
        specificCountToReplace: specificList.length,
      };
    }
  } else {
    const cleanSlug = input.channelSlug.trim().replace(/^#/, '').toLowerCase();
    if (!cleanSlug) {
      return fail('Informe o canal específico ou marque "Todos os canais".');
    }

    const hasGlobal = others.some((c) => c.all_channels);
    if (hasGlobal) {
      return fail('RN-01: Esta conta já possui um resgate global ativo.');
    }

    const dup = others.some(
      (c) => !c.all_channels && (c.channel_slug || '').trim().replace(/^#/, '').toLowerCase() === cleanSlug
    );
    if (dup) {
      return fail(`RN-02: Já existe um resgate configurado para o canal "${cleanSlug}".`);
    }
  }

  return {
    valid: true,
    error: null,
    requiresReplaceConfirmation: false,
    specificCountToReplace: 0,
  };
}

/**
 * Verifica se a conta pode adicionar um novo auto-resgate (RN-01).
 */
export function canAddAutoRedeemForAccount(
  accountId: string,
  existingConfigs: AutoRedeemConfig[]
): boolean {
  return !existingConfigs.some((c) => c.account_id === accountId && c.all_channels);
}

/**
 * Formata horas inteiras ou decimais de modo limpo (ex: 15 -> "15", 1.5 -> "1.5").
 */
function fmtHoursVal(val: number): string {
  return Number.isInteger(val) ? String(val) : val.toFixed(1);
}

/**
 * Formata o resumo textual do badge de auto-resgate para exibição na UI.
 */
export function formatAutoRedeemBadgeText(cfg: AutoRedeemConfig): string {
  const total = cfg.total_redeems ?? 0;
  const scope = cfg.all_channels
    ? 'todos os canais'
    : cfg.channel_slug || 'canal';
  const redeemWord = total === 1 ? 'resgate' : 'resgates';

  if (cfg.redeem_mode === 'duration' && cfg.target_duration_hours != null && cfg.target_duration_hours > 0) {
    const acc = cfg.accumulated_hours ?? 0;
    const target = cfg.target_duration_hours;
    const goalReached = !cfg.enabled && acc + 1e-6 >= target;
    const progress = `${fmtHoursVal(acc)} / ${fmtHoursVal(target)}h`;
    const stateLabel = goalReached ? 'meta atingida' : cfg.enabled ? 'ativa' : 'pausado';
    return `${total} ${redeemWord} • ${progress} • ${scope} • ${stateLabel}`;
  }

  const stateLabel = cfg.enabled ? 'ativa' : 'pausado';
  return `${total} ${redeemWord} • ${scope} • ${stateLabel}`;
}

/**
 * Soma total de pontos disponíveis para uma conta nas streams ativas da plataforma.
 */
export function getAccountAvailablePoints(
  accountId: string,
  platform: Platform,
  streams: { id: string; platform: Platform; account_ids: string[] }[],
  statuses: Record<string, { account_points?: Record<string, string> }>
): number {
  let total = 0;
  for (const s of streams) {
    if (s.platform !== platform || !s.account_ids.includes(accountId)) continue;
    const raw = statuses[s.id]?.account_points?.[accountId];
    if (!raw) continue;
    const digits = raw.replace(/\D/g, '');
    if (digits) {
      const n = Number(digits);
      if (Number.isFinite(n)) total += n;
    }
  }
  return total;
}

/**
 * Aplica o payload de evento `auto-redeem-executed` sobre a lista de configs.
 */
export function applyAutoRedeemExecutedEvent(
  list: AutoRedeemConfig[] | undefined,
  payload: AutoRedeemExecutedPayload
): AutoRedeemConfig[] {
  if (!list) return [];
  return list.map((r) => {
    if (r.id !== payload.redeem_id) return r;
    const added = payload.success
      ? payload.hours_added ?? r.duration_hours ?? 0
      : 0;
    return {
      ...r,
      total_redeems: payload.new_total,
      last_redeemed_at: payload.redeemed_at ?? r.last_redeemed_at,
      next_available_at: payload.next_available_at ?? r.next_available_at,
      accumulated_hours: (r.accumulated_hours ?? 0) + added,
      last_error: payload.success ? null : payload.message,
    };
  });
}

/**
 * Aplica o payload de evento `auto-redeem-error` sobre a lista de configs.
 */
export function applyAutoRedeemErrorEvent(
  list: AutoRedeemConfig[] | undefined,
  payload: AutoRedeemErrorPayload
): AutoRedeemConfig[] {
  if (!list) return [];
  return list.map((r) =>
    r.id === payload.redeem_id
      ? {
          ...r,
          last_error: payload.message,
        }
      : r
  );
}

/**
 * Aplica o payload de evento `auto-redeem-goal-reached` pausando a config (Q2).
 */
export function applyAutoRedeemGoalReachedEvent(
  list: AutoRedeemConfig[] | undefined,
  payload: AutoRedeemGoalReachedPayload
): AutoRedeemConfig[] {
  if (!list) return [];
  return list.map((r) =>
    r.id === payload.redeem_id
      ? {
          ...r,
          enabled: false,
          accumulated_hours: payload.accumulated_hours,
          last_error: null,
        }
      : r
  );
}
