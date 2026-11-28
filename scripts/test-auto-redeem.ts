import assert from 'node:assert';
import { AutoRedeemConfig } from '../src/types/index.ts';
import {
  applyAutoRedeemErrorEvent,
  applyAutoRedeemExecutedEvent,
  applyAutoRedeemGoalReachedEvent,
  canAddAutoRedeemForAccount,
  formatAutoRedeemBadgeText,
  getAccountAvailablePoints,
  validateAutoRedeemForm,
} from '../src/utils/autoRedeem.ts';
import {
  getVariantsForBonusType,
  planDurationRedeems,
  REWARD_CATALOG,
} from '../src/utils/autoRedeemCatalog.ts';

console.log('🧪 Iniciando testes TDD de Auto-Resgate (Catálogo, Duração & Twitch/Kick)...\n');

const makeCfg = (overrides: Partial<AutoRedeemConfig> = {}): AutoRedeemConfig => ({
  id: 'ar-1',
  account_id: 'acc-1',
  platform: 'twitch',
  all_channels: false,
  channel_slug: 'xqc',
  channel_id: '190359081',
  reward_id: 'ecac50be-b6a2-4c5e-964b-0866b780537f',
  reward_title: 'Bônus +15% XP PokeIdle (10h)',
  cost: 3000,
  duration_hours: 10,
  enabled: true,
  redeem_mode: 'forever',
  accumulated_hours: 0,
  total_redeems: 5,
  last_redeemed_at: null,
  last_error: null,
  next_available_at: null,
  ...overrides,
});

// AR-TS-01: badge canal específico
{
  const cfg = makeCfg({ total_redeems: 5, all_channels: false, channel_slug: 'xqc', enabled: true });
  assert.strictEqual(formatAutoRedeemBadgeText(cfg), '5 resgates • xqc • ativa');
  console.log('✅ AR-TS-01: badge canal específico renderiza corretamente');
}

// AR-TS-02: badge todos os canais
{
  const cfg = makeCfg({ total_redeems: 12, all_channels: true, enabled: true });
  assert.strictEqual(formatAutoRedeemBadgeText(cfg), '12 resgates • todos os canais • ativa');
  console.log('✅ AR-TS-02: badge modo global renderiza corretamente');
}

// AR-TS-03: badge pausado
{
  const cfg = makeCfg({ total_redeems: 1, all_channels: true, enabled: false });
  assert.strictEqual(formatAutoRedeemBadgeText(cfg), '1 resgate • todos os canais • pausado');
  console.log('✅ AR-TS-03: badge pausado renderiza corretamente');
}

// AR-TS-04 & AR-TS-06: validação reward_id vazio (modo personalizado) e cost <= 0
{
  const emptyReward = validateAutoRedeemForm(
    {
      accountId: 'acc-1',
      platform: 'twitch',
      allChannels: true,
      channelSlug: '',
      channelId: '',
      rewardId: '   ',
      rewardTitle: 'XP 10h',
      cost: 2000,
      textInput: '',
      isCatalogMode: false,
    },
    []
  );
  assert.strictEqual(emptyReward.valid, false);

  const zeroCost = validateAutoRedeemForm(
    {
      accountId: 'acc-1',
      platform: 'twitch',
      allChannels: true,
      channelSlug: '',
      channelId: '',
      rewardId: 'uuid-123',
      rewardTitle: 'XP 10h',
      cost: 0,
      textInput: '',
      isCatalogMode: false,
    },
    []
  );
  assert.strictEqual(zeroCost.valid, false);
  console.log('✅ AR-TS-04/06: validação bloqueia reward_id vazio (custom) e cost <= 0');
}

// AR-TS-09: Kick/Twitch com allChannels=false exige channelSlug
{
  const res = validateAutoRedeemForm(
    {
      accountId: 'acc-2',
      platform: 'kick',
      allChannels: false,
      channelSlug: '',
      channelId: '',
      rewardId: '987654',
      rewardTitle: 'Som',
      cost: 1500,
      textInput: '',
    },
    []
  );
  assert.strictEqual(res.valid, false);
  console.log('✅ AR-TS-09: canal específico vazio é rejeitado');
}

// AR-TS-10: RN-01 bloqueia adição quando conta já tem all_channels=true
{
  const existing = [makeCfg({ account_id: 'acc-1', all_channels: true })];
  assert.strictEqual(canAddAutoRedeemForAccount('acc-1', existing), false);
  assert.strictEqual(canAddAutoRedeemForAccount('acc-2', existing), true);

  const second = validateAutoRedeemForm(
    {
      accountId: 'acc-1',
      platform: 'twitch',
      allChannels: false,
      channelSlug: 'gaules',
      channelId: '',
      rewardId: 'uuid-2',
      rewardTitle: 'Outro',
      cost: 500,
      textInput: '',
    },
    existing
  );
  assert.strictEqual(second.valid, false);
  console.log('✅ AR-TS-10: RN-01 bloqueia segunda config quando modo global já está ativo');
}

// AR-TS-11: RN-03 solicita confirmação ao substituir configs específicas por global
{
  const existing = [
    makeCfg({ id: 's1', account_id: 'acc-1', all_channels: false, channel_slug: 'xqc' }),
    makeCfg({ id: 's2', account_id: 'acc-1', all_channels: false, channel_slug: 'gaules' }),
  ];
  const res = validateAutoRedeemForm(
    {
      accountId: 'acc-1',
      platform: 'twitch',
      allChannels: true,
      channelSlug: '',
      channelId: '',
      rewardId: 'uuid-global',
      rewardTitle: 'XP 10h Global',
      cost: 2000,
      textInput: '',
    },
    existing
  );
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.requiresReplaceConfirmation, true);
  assert.strictEqual(res.specificCountToReplace, 2);
  console.log('✅ AR-TS-11: RN-03 sinaliza confirmação de substituição das 2 configs específicas');
}

// AR-TS-12: Listener de eventos atualiza total_redeems, accumulated_hours e last_error
{
  const list = [
    makeCfg({
      id: 'ar-1',
      total_redeems: 5,
      last_error: 'erro antigo',
      redeem_mode: 'duration',
      target_duration_hours: 30,
      accumulated_hours: 10,
      duration_hours: 10,
    }),
  ];
  const afterExec = applyAutoRedeemExecutedEvent(list, {
    redeem_id: 'ar-1',
    account_id: 'acc-1',
    channel_slug: 'xqc',
    success: true,
    message: 'Resgatado',
    new_total: 6,
    redeemed_at: 1700001234,
    next_available_at: null,
    hours_added: 10,
  });
  assert.strictEqual(afterExec[0].total_redeems, 6);
  assert.strictEqual(afterExec[0].last_error, null);
  assert.strictEqual(afterExec[0].last_redeemed_at, 1700001234);
  assert.strictEqual(afterExec[0].accumulated_hours, 20);

  const afterErr = applyAutoRedeemErrorEvent(afterExec, {
    redeem_id: 'ar-1',
    account_id: 'acc-1',
    error_kind: 'auth_error',
    message: 'Token expirado',
  });
  assert.strictEqual(afterErr[0].last_error, 'Token expirado');

  const afterGoal = applyAutoRedeemGoalReachedEvent(afterErr, {
    redeem_id: 'ar-1',
    account_id: 'acc-1',
    channel_slug: 'xqc',
    target_hours: 30,
    accumulated_hours: 30,
  });
  assert.strictEqual(afterGoal[0].enabled, false);
  assert.strictEqual(afterGoal[0].accumulated_hours, 30);
  assert.strictEqual(afterGoal[0].last_error, null);
  console.log('✅ AR-TS-12: handlers de evento atualizam total_redeems, accumulated_hours, error e goal-reached');
}

// AR-TS-13: Catálogo tem 24 entradas exatas (12 Twitch + 12 Kick)
{
  assert.strictEqual(REWARD_CATALOG.length, 24);
  assert.strictEqual(REWARD_CATALOG.filter((r) => r.platform === 'twitch').length, 12);
  assert.strictEqual(REWARD_CATALOG.filter((r) => r.platform === 'kick').length, 12);
  console.log('✅ AR-TS-13: catálogo possui 24 recompensas (12 Twitch + 12 Kick)');
}

// AR-TS-14: Variantes ordenadas em ordem crescente
{
  const xpTwitch = getVariantsForBonusType('twitch', 'xp');
  assert.deepStrictEqual(
    xpTwitch.map((v) => v.duration_hours),
    [1, 3, 5, 10]
  );
  assert.deepStrictEqual(
    xpTwitch.map((v) => v.cost),
    [300, 900, 1500, 3000]
  );

  const xpKick = getVariantsForBonusType('kick', 'xp');
  assert.deepStrictEqual(
    xpKick.map((v) => v.cost),
    [200, 600, 1000, 2000]
  );
  console.log('✅ AR-TS-14: variantes XP ordenadas corretamente para Twitch e Kick');
}

// AR-TS-15..18: Planner guloso sem exceder (Q3)
{
  const p10 = planDurationRedeems('twitch', 'xp', 10, 5000);
  assert.ok(!('error' in p10));
  assert.strictEqual(p10.steps.length, 1);
  assert.strictEqual(p10.steps[0].reward.duration_hours, 10);
  assert.strictEqual(p10.total_cost, 3000);

  const p7 = planDurationRedeems('twitch', 'xp', 7, 5000);
  assert.ok(!('error' in p7));
  assert.strictEqual(p7.total_hours, 7);
  assert.strictEqual(p7.total_cost, 2100);
  assert.strictEqual(p7.steps[0].reward.duration_hours, 5);
  assert.strictEqual(p7.steps[0].count, 1);
  assert.strictEqual(p7.steps[1].reward.duration_hours, 1);
  assert.strictEqual(p7.steps[1].count, 2);

  const pInsuf = planDurationRedeems('twitch', 'xp', 7, 500);
  assert.ok('error' in pInsuf);

  const pZero = planDurationRedeems('twitch', 'xp', 0, 5000);
  assert.ok('error' in pZero);
  console.log('✅ AR-TS-15..18: planDurationRedeems calcula combinação ótima sem exceder e valida saldo/meta');
}

// AR-TS-19 & AR-TS-20: Catálogo Twitch aceita reward_id vazio; Kick e Personalizada exigem reward_id (Q4)
{
  const twitchCatalog = validateAutoRedeemForm(
    {
      accountId: 'acc-1',
      platform: 'twitch',
      allChannels: true,
      channelSlug: '',
      channelId: '',
      rewardId: '',
      rewardTitle: 'Bônus +15% XP PokeIdle (10h)',
      cost: 3000,
      textInput: '',
      isCatalogMode: true,
      catalogKey: 'twitch_xp_10h',
      durationHours: 10,
      redeemMode: 'forever',
    },
    []
  );
  assert.strictEqual(twitchCatalog.valid, true);

  const kickCatalogWithoutId = validateAutoRedeemForm(
    {
      accountId: 'acc-2',
      platform: 'kick',
      allChannels: true,
      channelSlug: '',
      channelId: '',
      rewardId: '',
      rewardTitle: 'Bônus +15% XP PokeIdle (10h)',
      cost: 2000,
      textInput: '',
      isCatalogMode: true,
      catalogKey: 'kick_xp_10h',
      durationHours: 10,
      redeemMode: 'forever',
    },
    []
  );
  assert.strictEqual(kickCatalogWithoutId.valid, false);
  console.log('✅ AR-TS-19/20: Twitch catálogo aceita reward_id vazio; Kick/Personalizada exige reward_id (Q4)');
}

// AR-TS-21: Badge Duration com progresso e meta atingida
{
  const activeDur = makeCfg({
    total_redeems: 3,
    all_channels: true,
    enabled: true,
    redeem_mode: 'duration',
    target_duration_hours: 20,
    accumulated_hours: 15,
  });
  assert.strictEqual(
    formatAutoRedeemBadgeText(activeDur),
    '3 resgates • 15 / 20h • todos os canais • ativa'
  );

  const reachedDur = makeCfg({
    total_redeems: 4,
    all_channels: true,
    enabled: false,
    redeem_mode: 'duration',
    target_duration_hours: 20,
    accumulated_hours: 20,
  });
  assert.strictEqual(
    formatAutoRedeemBadgeText(reachedDur),
    '4 resgates • 20 / 20h • todos os canais • meta atingida'
  );
  console.log('✅ AR-TS-21: badge Duration exibe progresso e estado meta atingida');
}

// AR-TS-22: getAccountAvailablePoints soma pontos entre múltiplas lives
{
  const pts = getAccountAvailablePoints(
    'acc-1',
    'twitch',
    [
      { id: 's1', platform: 'twitch', account_ids: ['acc-1'] },
      { id: 's2', platform: 'twitch', account_ids: ['acc-1', 'acc-2'] },
      { id: 's3', platform: 'kick', account_ids: ['acc-1'] },
    ],
    {
      s1: { account_points: { 'acc-1': '1.500' } },
      s2: { account_points: { 'acc-1': '900', 'acc-2': '5000' } },
      s3: { account_points: { 'acc-1': '9999' } },
    }
  );
  assert.strictEqual(pts, 2400);
  console.log('✅ AR-TS-22: soma de pontos disponíveis entre múltiplas lives funciona corretamente');
}

console.log('\n🎉 Todos os testes TDD de Auto-Resgate passaram!');
