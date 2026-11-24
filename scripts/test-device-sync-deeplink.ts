import assert from 'node:assert';
import {
  buildDeviceSyncUniversalUrl,
  buildDeviceSyncNativeSchemeUrl,
  extractDeviceSyncId,
  DEVICE_SYNC_BASE_URL,
  DEVICE_SYNC_SCHEME,
} from '../src/utils/deviceSyncUrl.ts';

console.log('🧪 Iniciando testes de Deep Link e Universal Links do Elo PC ↔ Celular...\n');

// ========================================================
// Teste 1: Geração de URLs Universais HTTPS e Esquema Nativo
// ========================================================
console.log('🔹 Teste 1: Validação de geração de links...');

const testId = 'ff808181a09d98f701a20c08da532fbb';
const universalUrl = buildDeviceSyncUniversalUrl(testId);
assert.strictEqual(
  universalUrl,
  `${DEVICE_SYNC_BASE_URL}?type=device&id=${testId}`,
  'URL Universal deve conter type=device e o ID exato'
);
assert.ok(universalUrl.startsWith('https://'), 'URL Universal DEVE iniciar com HTTPS para ser lida pela câmera');
console.log('  ✓ buildDeviceSyncUniversalUrl gerada com sucesso:', universalUrl);

const nativeUrl = buildDeviceSyncNativeSchemeUrl(testId);
assert.strictEqual(
  nativeUrl,
  `${DEVICE_SYNC_SCHEME}?id=${testId}`,
  'Deep link nativo deve iniciar com idlestream://device-sync'
);
console.log('  ✓ buildDeviceSyncNativeSchemeUrl gerada com sucesso:', nativeUrl);

// Testes de borda
assert.strictEqual(buildDeviceSyncUniversalUrl(''), '', 'ID vazio deve retornar string vazia');
assert.strictEqual(buildDeviceSyncUniversalUrl('   '), '', 'Espaços em branco devem retornar string vazia');
assert.strictEqual(
  buildDeviceSyncUniversalUrl('id com espaco'),
  `${DEVICE_SYNC_BASE_URL}?type=device&id=id%20com%20espaco`,
  'Caracteres especiais devem ser codificados em URL'
);
console.log('  ✓ Casos de borda de geração validados com sucesso');

// ========================================================
// Teste 2: Extração e Sanitização Resiliente de IDs
// ========================================================
console.log('\n🔹 Teste 2: Extração e normalização resiliente de IDs de vinculação...');

// 2.1 ID puro
assert.strictEqual(
  extractDeviceSyncId('ff808181a09d98f701a20c08da532fbb'),
  'ff808181a09d98f701a20c08da532fbb',
  'ID puro deve ser retornado intacto'
);
assert.strictEqual(
  extractDeviceSyncId('  ff808181a09d98f701a20c08da532fbb  '),
  'ff808181a09d98f701a20c08da532fbb',
  'Espaços antes e depois devem ser removidos'
);

// 2.2 Esquema legado (idlestream-devicesync:...)
assert.strictEqual(
  extractDeviceSyncId('idlestream-devicesync:ff808181a09d98f701a20c08da532fbb'),
  'ff808181a09d98f701a20c08da532fbb',
  'Prefixo legado idlestream-devicesync: deve ser removido'
);
assert.strictEqual(
  extractDeviceSyncId('IDLESTREAM-DEVICESYNC:TESTE_123'),
  'TESTE_123',
  'Prefixo legado deve ser case-insensitive'
);

// 2.3 Deep Link nativo idlestream://device-sync?id=...
assert.strictEqual(
  extractDeviceSyncId('idlestream://device-sync?id=ff808181a09d98f701a20c08da532fbb'),
  'ff808181a09d98f701a20c08da532fbb',
  'Deep link idlestream://device-sync deve extrair o parâmetro id'
);
assert.strictEqual(
  extractDeviceSyncId('idlestream://sync?type=device&id=custom_id_456'),
  'custom_id_456',
  'Deep link com múltiplos parâmetros deve extrair o id corretamente'
);

// 2.4 URL Universal HTTPS (lida pela câmera ou navegador)
assert.strictEqual(
  extractDeviceSyncId('https://gabrielgamabaptista.github.io/IdleStream/sync?type=device&id=ff808181a09d98f701a20c08da532fbb'),
  'ff808181a09d98f701a20c08da532fbb',
  'URL HTTPS do GitHub Pages deve extrair o parâmetro id'
);
assert.strictEqual(
  extractDeviceSyncId('https://gabrielgamabaptista.github.io/IdleStream/sync?utm_source=camera&id=promo_sync_789&type=device'),
  'promo_sync_789',
  'URL com parâmetros em qualquer ordem deve extrair o id'
);

// 2.5 ID com codificação URI
assert.strictEqual(
  extractDeviceSyncId('https://gabrielgamabaptista.github.io/IdleStream/sync?type=device&id=dev%20sync%20id'),
  'dev sync id',
  'Parâmetro codificado em URL deve ser decodificado'
);

// 2.6 Strings com aspas ou delimitadores acidentais
assert.strictEqual(
  extractDeviceSyncId('"ff808181a09d98f701a20c08da532fbb"'),
  'ff808181a09d98f701a20c08da532fbb',
  'Aspas duplas devem ser limpas'
);
assert.strictEqual(
  extractDeviceSyncId("'ff808181a09d98f701a20c08da532fbb'"),
  'ff808181a09d98f701a20c08da532fbb',
  'Aspas simples devem ser limpas'
);
assert.strictEqual(extractDeviceSyncId(''), '', 'String vazia deve retornar vazio');

console.log('  ✓ Todos os casos de extração resiliente foram aprovados!');

// ========================================================
// Teste 3: Simulação de Roteamento Nativo do Android (MainActivity.kt)
// ========================================================
console.log('\n🔹 Teste 3: Simulação do roteamento de intents no Android...');

interface SimulatedIntentResult {
  isDeviceSync: boolean;
  syncId: string | null;
}

function simulateAndroidIntentRouting(rawUri: string): SimulatedIntentResult {
  try {
    const normalized = rawUri.startsWith('idlestream://')
      ? rawUri.replace(/^idlestream:\/\//i, 'http://dummy/')
      : rawUri;
    const url = new URL(normalized);
    const syncId = url.searchParams.get('id');
    if (!syncId) return { isDeviceSync: false, syncId: null };

    const host = rawUri.startsWith('idlestream://')
      ? (rawUri.split('://')[1]?.split('?')[0] || '').toLowerCase()
      : (url.host || '').toLowerCase();
    const type = (url.searchParams.get('type') || '').toLowerCase();
    const hasDeviceSyncParam = url.searchParams.has('device_sync');

    const isDeviceSync = host === 'device-sync' || type === 'device' || hasDeviceSyncParam;
    return { isDeviceSync, syncId };
  } catch {
    return { isDeviceSync: false, syncId: null };
  }
}

// 3.1 Device Sync via esquema nativo
const r1 = simulateAndroidIntentRouting('idlestream://device-sync?id=device_123');
assert.strictEqual(r1.isDeviceSync, true);
assert.strictEqual(r1.syncId, 'device_123');

// 3.2 Vote Sync via esquema nativo (não deve misturar com device sync)
const r2 = simulateAndroidIntentRouting('idlestream://vote-sync?id=vote_456');
assert.strictEqual(r2.isDeviceSync, false);
assert.strictEqual(r2.syncId, 'vote_456');

// 3.3 Universal Link lido pela câmera (type=device)
const r3 = simulateAndroidIntentRouting('https://gabrielgamabaptista.github.io/IdleStream/sync?type=device&id=cam_789');
assert.strictEqual(r3.isDeviceSync, true);
assert.strictEqual(r3.syncId, 'cam_789');

// 3.4 Universal Link de votos lido pela câmera (sem type ou com id)
const r4 = simulateAndroidIntentRouting('https://gabrielgamabaptista.github.io/IdleStream/sync?id=vote_direct');
assert.strictEqual(r4.isDeviceSync, false);
assert.strictEqual(r4.syncId, 'vote_direct');

console.log('  ✓ Roteamento de intents simulado com separação 100% precisa entre votos e elo PC/celular!');

// ========================================================
// Teste 4: Simulação da Página de Redirecionamento Web (public/sync/index.html)
// ========================================================
console.log('\n🔹 Teste 4: Simulação da lógica da página web de fallback (GitHub Pages)...');

function simulateSyncWebPage(queryString: string) {
  const params = new URLSearchParams(queryString);
  const syncId = params.get('id') || '';
  const syncType = (params.get('type') || '').toLowerCase();
  const isDeviceSync = syncType === 'device' || params.has('device_sync');

  const schemeHost = isDeviceSync ? 'device-sync' : 'vote-sync';
  const deepLink = syncId ? `idlestream://${schemeHost}?id=${encodeURIComponent(syncId)}` : null;

  return {
    badge: isDeviceSync ? 'Exclusão Mútua Cloud' : 'Sincronização Automática',
    title: isDeviceSync ? 'Elo PC ↔ Celular' : 'IdleStream Pareamento',
    deepLink,
  };
}

const webDevice = simulateSyncWebPage('?type=device&id=web_dev_1');
assert.strictEqual(webDevice.badge, 'Exclusão Mútua Cloud');
assert.strictEqual(webDevice.title, 'Elo PC ↔ Celular');
assert.strictEqual(webDevice.deepLink, 'idlestream://device-sync?id=web_dev_1');

const webVote = simulateSyncWebPage('?id=web_vote_1');
assert.strictEqual(webVote.badge, 'Sincronização Automática');
assert.strictEqual(webVote.title, 'IdleStream Pareamento');
assert.strictEqual(webVote.deepLink, 'idlestream://vote-sync?id=web_vote_1');

console.log('  ✓ Lógica da página de fallback web aprovada!');

console.log('\n🎉 TODOS OS TESTES DE DEEP LINK E UNIVERSAL LINKS PASSARAM COM SUCESSO!\n');
