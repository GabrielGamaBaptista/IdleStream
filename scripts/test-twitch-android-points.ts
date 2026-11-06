import assert from 'node:assert';
import { formatPoints } from '../src/utils/format.ts';

console.log('🧪 Iniciando testes de validação do Minerador Twitch e Contador de Pontos...\n');

// 1. Teste de extração de cookie auth-token (simulando CookieManager do Android)
function parseTwitchCookie(rawCookies: string | null | undefined): string | null {
  if (!rawCookies) return null;
  const pairs = rawCookies.split(';').map(p => p.trim());
  for (const pair of pairs) {
    const eq = pair.indexOf('=');
    if (eq > 0) {
      const name = pair.substring(0, eq).trim();
      const val = pair.substring(eq + 1).trim();
      if (name.toLowerCase() === 'auth-token') {
        return decodeURIComponent(val);
      }
    }
  }
  return null;
}

const mockCookieHeader = 'unique_id=d7a9b0c; auth-token=u5w41abcdef987654321; login=gaules; server_session=true';
const parsedToken = parseTwitchCookie(mockCookieHeader);
assert.strictEqual(parsedToken, 'u5w41abcdef987654321', 'Deve extrair corretamente o auth-token do header de cookies');
assert.strictEqual(parseTwitchCookie('some_other_cookie=123'), null, 'Retorna null quando auth-token ausente');
console.log('  ✓ [Android CookieManager] Extração de auth-token validada com sucesso');

// 2. Teste de parse de JSON GQL da Twitch com as duas variantes reais de estrutura
function parseChannelPointsJson(json: any): { balance?: number; claimId?: string } {
  const commPoints =
    json?.data?.community?.channel?.self?.communityPoints ??
    json?.data?.channel?.self?.communityPoints ??
    json?.data?.user?.channel?.self?.communityPoints ??
    json?.data?.user?.channel?.communityPoints ??
    json?.data?.communityPoints;

  const balance = typeof commPoints?.balance === 'number' ? commPoints.balance : undefined;
  const claimId = commPoints?.availableClaim?.id || undefined;
  return { balance, claimId };
}

// 2.1 Estrutura real retornada pelo persisted query ChannelPointsContext
const persistedQueryMock = {
  data: {
    community: {
      id: '181077473',
      displayName: 'Gaules',
      channel: {
        id: '181077473',
        self: {
          communityPoints: {
            balance: 154200,
            availableClaim: {
              id: 'claim_uuid_super_bonus_777',
            },
          },
        },
      },
    },
  },
};

const res1 = parseChannelPointsJson(persistedQueryMock);
assert.strictEqual(res1.balance, 154200, 'Deve extrair o saldo de communityPoints em community.channel.self');
assert.strictEqual(res1.claimId, 'claim_uuid_super_bonus_777', 'Deve extrair o claimId do baú de bônus');
console.log('  ✓ [Twitch GQL] Parse de ChannelPointsContext real validado com sucesso');

// 2.2 Estrutura retornada pela query direta ChannelPointsBalance
const directQueryMock = {
  data: {
    channel: {
      id: '181077473',
      self: {
        communityPoints: {
          balance: 89350,
          availableClaim: null,
        },
      },
    },
  },
};

const res2 = parseChannelPointsJson(directQueryMock);
assert.strictEqual(res2.balance, 89350, 'Deve extrair o saldo em channel.self');
assert.strictEqual(res2.claimId, undefined, 'claimId deve ser undefined quando null');
console.log('  ✓ [Twitch GQL] Parse de ChannelPointsBalance direto validado com sucesso');

// 3. Teste de formatação de pontos
assert.strictEqual(formatPoints(154200), '154.200');
assert.strictEqual(formatPoints('89350'), '89.350');
assert.strictEqual(formatPoints(0), '0');
assert.strictEqual(formatPoints(null), '--');
assert.strictEqual(formatPoints(undefined), '--');
console.log('  ✓ [Format Points] Formatação em pt-BR de pontos validada com sucesso');

// 4. Teste de detecção de live direta via GQL
function parseStreamStatus(json: any): boolean {
  const stream = json?.data?.user?.stream;
  if (!stream || stream === null) return false;
  return stream.type === 'live' || Boolean(stream.id);
}

assert.strictEqual(parseStreamStatus({ data: { user: { stream: { id: 'live_1', type: 'live' } } } }), true);
assert.strictEqual(parseStreamStatus({ data: { user: { stream: null } } }), false);
console.log('  ✓ [Twitch Live Check] Detecção nativa GQL validada com sucesso');

// 5. Teste de Simulação de Prioridade e Teto Rigoroso de 2 Slots Ativos
interface StreamerSimulation {
  slug: string;
  avgHours: number;
  isLive: boolean;
  priorityRank?: number;
  slotState?: 'ActiveMining' | 'StandbyVigil' | 'Offline';
}

function reconcileSimulation(streamers: StreamerSimulation[]) {
  // Ordena por média de horas decrescente
  streamers.sort((a, b) => b.avgHours - a.avgHours || a.slug.localeCompare(b.slug));
  streamers.forEach((s, idx) => {
    s.priorityRank = idx + 1;
  });

  const online = streamers.filter(s => s.isLive);
  const activeSlugs = new Set(online.slice(0, 2).map(s => s.slug));

  for (const s of streamers) {
    if (!s.isLive) {
      s.slotState = 'Offline';
    } else if (activeSlugs.has(s.slug)) {
      s.slotState = 'ActiveMining';
    } else {
      s.slotState = 'StandbyVigil';
    }
  }
}

const mockPool: StreamerSimulation[] = [
  { slug: 'mecmeno', avgHours: 7.7, isLive: true },
  { slug: 'dersin2k', avgHours: 8.3, isLive: true },
  { slug: 'rodil', avgHours: 10.5, isLive: true },
  { slug: 'offline_channel', avgHours: 12.0, isLive: false },
  { slug: 'streamer_low', avgHours: 3.2, isLive: true },
];

reconcileSimulation(mockPool);

// Verifica ranks
assert.strictEqual(mockPool.find(s => s.slug === 'offline_channel')?.priorityRank, 1);
assert.strictEqual(mockPool.find(s => s.slug === 'offline_channel')?.slotState, 'Offline');

assert.strictEqual(mockPool.find(s => s.slug === 'rodil')?.priorityRank, 2);
assert.strictEqual(mockPool.find(s => s.slug === 'rodil')?.slotState, 'ActiveMining');

assert.strictEqual(mockPool.find(s => s.slug === 'dersin2k')?.priorityRank, 3);
assert.strictEqual(mockPool.find(s => s.slug === 'dersin2k')?.slotState, 'ActiveMining');

assert.strictEqual(mockPool.find(s => s.slug === 'mecmeno')?.priorityRank, 4);
assert.strictEqual(mockPool.find(s => s.slug === 'mecmeno')?.slotState, 'StandbyVigil');

assert.strictEqual(mockPool.find(s => s.slug === 'streamer_low')?.priorityRank, 5);
assert.strictEqual(mockPool.find(s => s.slug === 'streamer_low')?.slotState, 'StandbyVigil');

const activeCount = mockPool.filter(s => s.slotState === 'ActiveMining').length;
assert.strictEqual(activeCount, 2, 'Devem existir ESTRITAMENTE 2 streamers com ActiveMining');
console.log('  ✓ [Priority Coordinator] Limite estrito de 2 slots ativos e repriorização validados com sucesso');

console.log('\n🎉 TODOS OS TESTES DE VALIDAÇÃO PASSARAM COM 100% DE SUCESSO!\n');
