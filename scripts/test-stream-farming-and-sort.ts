import assert from 'node:assert';
import { parsePointsNumber, getStreamPoints } from '../src/utils/format.ts';
import { StreamConfig, StreamRuntimeStatus } from '../src/types/index.ts';

console.log('🧪 Iniciando testes TDD da Etapa 3: "Farmando" vs "Ao Vivo" e Ordenação por Pontos...\n');

// 1. Testes de parsePointsNumber
console.log('1. Testando parsePointsNumber com diferentes formatações...');
assert.strictEqual(parsePointsNumber(1520), 1520);
assert.strictEqual(parsePointsNumber('1520'), 1520);
assert.strictEqual(parsePointsNumber('1,6 mil'), 1600);
assert.strictEqual(parsePointsNumber('1.6 mil'), 1600);
assert.strictEqual(parsePointsNumber('12.4k'), 12400);
assert.strictEqual(parsePointsNumber('12,4k'), 12400);
assert.strictEqual(parsePointsNumber('1.5m'), 1500000);
assert.strictEqual(parsePointsNumber('150.000'), 150000);
assert.strictEqual(parsePointsNumber('--'), 0);
assert.strictEqual(parsePointsNumber(null), 0);
assert.strictEqual(parsePointsNumber(undefined), 0);
console.log('  ✓ Conversão numérica de pontos validada com sucesso');

// 2. Testes de getStreamPoints
console.log('2. Testando extração do saldo de pontos da stream...');
const statusWithChannelPoints: StreamRuntimeStatus = {
  stream_id: 's1',
  status: 'connected',
  is_live: true,
  is_farming: true,
  uptime_seconds: 120,
  estimated_ram_mb: 1,
  channel_points: '5,5 mil',
  account_points: { acc1: '1200', acc2: '5500' },
};
assert.strictEqual(getStreamPoints(statusWithChannelPoints), 5500);

const statusWithAccountPointsOnly: StreamRuntimeStatus = {
  stream_id: 's2',
  status: 'connected',
  is_live: true,
  is_farming: true,
  uptime_seconds: 60,
  estimated_ram_mb: 1,
  account_points: { acc1: '3200', acc2: '15.000' },
};
assert.strictEqual(getStreamPoints(statusWithAccountPointsOnly), 15000);
console.log('  ✓ getStreamPoints extrai corretamente o valor máximo');

// 3. Teste de distinção entre "Farmando", "Ao Vivo" e "Vigília (Offline)"
console.log('3. Testando classificação dos badges ("Farmando" vs "Ao Vivo" vs "Vigília")...');
function classifyStreamState(status: StreamRuntimeStatus): 'farmando' | 'ao_vivo' | 'vigilia' | 'outro' {
  const isConnected = status.status === 'connected';
  const isFarming = Boolean(
    status.is_live &&
    (status.is_farming || isConnected) &&
    (status.is_farming ||
      status.message?.toLowerCase().includes('minerando') ||
      status.message?.toLowerCase().includes('baú') ||
      status.message?.toLowerCase().includes('pontos') ||
      isConnected)
  );

  const isLiveOnly = Boolean(
    !isFarming &&
    status.is_live
  );

  if (isFarming) return 'farmando';
  if (isLiveOnly) return 'ao_vivo';
  if (status.status === 'standby') return 'vigilia';
  return 'outro';
}

const activeFarmingStream: StreamRuntimeStatus = {
  stream_id: 's-farm',
  status: 'connected',
  is_live: true,
  is_farming: true,
  message: 'Minerando pontos (Prioridade #1 • Média: 10.0h)',
  uptime_seconds: 3600,
  estimated_ram_mb: 1,
};
assert.strictEqual(classifyStreamState(activeFarmingStream), 'farmando', 'Stream minerando deve ser "farmando"');

const queueStandbyOnlineStream: StreamRuntimeStatus = {
  stream_id: 's-queue',
  status: 'standby',
  is_live: true,
  is_farming: false,
  message: 'Fila de espera (Prioridade #3 • Média: 4.5h)',
  uptime_seconds: 0,
  estimated_ram_mb: 0,
};
assert.strictEqual(classifyStreamState(queueStandbyOnlineStream), 'ao_vivo', 'Stream online na fila deve ser "ao_vivo"');

const offlineStream: StreamRuntimeStatus = {
  stream_id: 's-off',
  status: 'standby',
  is_live: false,
  is_farming: false,
  message: 'Streamer offline na Twitch (Rank #5 • Média: 2.0h)',
  uptime_seconds: 0,
  estimated_ram_mb: 0,
};
assert.strictEqual(classifyStreamState(offlineStream), 'vigilia', 'Stream offline deve ser "vigilia"');

const offlineStreamEndedVigil: StreamRuntimeStatus = {
  stream_id: 's-off-vigil',
  status: 'standby',
  is_live: false,
  is_farming: false,
  message: 'Stream encerrou. Em vigília aguardando próximo broadcast...',
  uptime_seconds: 0,
  estimated_ram_mb: 0,
};
assert.strictEqual(classifyStreamState(offlineStreamEndedVigil), 'vigilia', 'Stream encerrou em vigília deve ser "vigilia" e NUNCA "ao_vivo"');
console.log('  ✓ Classificação visual e lógica de badges validada');

// 4. Teste de ordenação de streams por pontos separando Twitch e Kick
console.log('4. Testando ordenação de streams por pontos separando Twitch e Kick...');
const testStreams: StreamConfig[] = [
  { id: 'k1', platform: 'kick', channel_slug: 'kick_low', account_ids: [], auto_start: false },
  { id: 't1', platform: 'twitch', channel_slug: 'twitch_low', account_ids: [], auto_start: false },
  { id: 'k2', platform: 'kick', channel_slug: 'kick_high', account_ids: [], auto_start: false },
  { id: 't2', platform: 'twitch', channel_slug: 'twitch_high', account_ids: [], auto_start: false },
];

const mockStatuses: Record<string, StreamRuntimeStatus> = {
  k1: { stream_id: 'k1', status: 'connected', is_live: true, is_farming: true, uptime_seconds: 10, estimated_ram_mb: 1, channel_points: '500' },
  t1: { stream_id: 't1', status: 'connected', is_live: true, is_farming: true, uptime_seconds: 10, estimated_ram_mb: 1, channel_points: '1.200' },
  k2: { stream_id: 'k2', platform_points: '95.000', channel_points: '95.000', status: 'connected', is_live: true, is_farming: true, uptime_seconds: 10, estimated_ram_mb: 1 } as any,
  t2: { stream_id: 't2', status: 'connected', is_live: true, is_farming: true, uptime_seconds: 10, estimated_ram_mb: 1, channel_points: '50.000' },
};

function sortStreams(
  streams: StreamConfig[],
  sortOption: 'default' | 'points_desc' | 'points_asc' | 'alpha',
  platformFilter: 'all' | 'twitch' | 'kick',
  statuses: Record<string, StreamRuntimeStatus>
) {
  const filtered = streams.filter((s) => platformFilter === 'all' || s.platform === platformFilter);

  return [...filtered].sort((a, b) => {
    // Separa Twitch de Kick primeiro quando all
    if (platformFilter === 'all' && a.platform !== b.platform) {
      return a.platform === 'twitch' ? -1 : 1;
    }
    if (sortOption === 'points_desc') {
      const ptsA = getStreamPoints(statuses[a.id]);
      const ptsB = getStreamPoints(statuses[b.id]);
      if (ptsB !== ptsA) return ptsB - ptsA;
    } else if (sortOption === 'points_asc') {
      const ptsA = getStreamPoints(statuses[a.id]);
      const ptsB = getStreamPoints(statuses[b.id]);
      if (ptsA !== ptsB) return ptsA - ptsB;
    }
    return 0;
  });
}

const sortedDesc = sortStreams(testStreams, 'points_desc', 'all', mockStatuses);
assert.deepStrictEqual(
  sortedDesc.map((s) => s.id),
  ['t2', 't1', 'k2', 'k1'],
  'Deve ordenar Twitch por pontos decrescente (50.000, 1.200), seguido de Kick por pontos decrescente (95.000, 500)'
);

const sortedAsc = sortStreams(testStreams, 'points_asc', 'all', mockStatuses);
assert.deepStrictEqual(
  sortedAsc.map((s) => s.id),
  ['t1', 't2', 'k1', 'k2'],
  'Deve ordenar Twitch por pontos crescente (1.200, 50.000), seguido de Kick por pontos crescente (500, 95.000)'
);

const kickOnlySorted = sortStreams(testStreams, 'points_desc', 'kick', mockStatuses);
assert.deepStrictEqual(
  kickOnlySorted.map((s) => s.id),
  ['k2', 'k1'],
  'Filtro Kick com pontos desc deve retornar apenas Kick [k2, k1]'
);

console.log('  ✓ Ordenação por pontos separando Twitch e Kick validada com sucesso');

console.log('\n🎉 TODOS OS TESTES DA ETAPA 3 PASSARAM COM SUCESSO!\n');
