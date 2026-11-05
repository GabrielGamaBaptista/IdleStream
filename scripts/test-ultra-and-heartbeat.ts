import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('🧪 Iniciando validação de anti_sleep.js (Ultra Mode & Heartbeat Watchdog)...');

const antiSleepPath = path.resolve('src-tauri/src/games/anti_sleep.js');
const antiSleepCode = fs.readFileSync(antiSleepPath, 'utf8');

// 1. Simulação de DOM com JSDOM-like environment para testar o comportamento do PokeIdle
let isUltraOn = false;
let configModalOpen = false;

// Mock window e document
const localStorageMap = new Map<string, string>();
const fakeLocalStorage = {
  getItem: (k: string) => localStorageMap.get(k) ?? null,
  setItem: (k: string, v: string) => localStorageMap.set(k, String(v)),
  removeItem: (k: string) => localStorageMap.delete(k),
};

const domElements = new Map<string, any>();

const fakeDocument: any = {
  documentElement: {
    classList: {
      contains: (cls: string) => (cls === 'modo-ultra' ? isUltraOn : false),
      toggle: (cls: string, state?: boolean) => {
        if (cls === 'modo-ultra') isUltraOn = state !== undefined ? state : !isUltraOn;
      },
      add: (cls: string) => { if (cls === 'modo-ultra') isUltraOn = true; },
      remove: (cls: string) => { if (cls === 'modo-ultra') isUltraOn = false; },
    },
    appendChild: () => {},
  },
  body: { appendChild: () => {} },
  getElementById: (id: string) => {
    if (id === 'ultra-sair') {
      return isUltraOn ? {
        click: () => { isUltraOn = false; }
      } : null;
    }
    if (id === 'btn-config') {
      return {
        click: () => {
          configModalOpen = true;
        }
      };
    }
    if (id === 'cfg-ultra') {
      return configModalOpen ? {
        click: () => {
          isUltraOn = true;
          configModalOpen = false; // fecha o modal automaticamente no jogo
        }
      } : null;
    }
    return domElements.get(id) || null;
  },
  createElement: (tag: string) => ({
    id: '',
    style: {},
    innerHTML: '',
    appendChild: () => {},
  }),
  dispatchEvent: () => true,
  addEventListener: () => {},
};

let webSocketSent: string[] = [];
let reconnectedCount = 0;

const fakeWindow: any = {
  document: fakeDocument,
  localStorage: fakeLocalStorage,
  addEventListener: () => {},
  dispatchEvent: () => true,
  AudioContext: class {
    state = 'running';
    sampleRate = 44100;
    createBuffer() { return {}; }
    createBufferSource() { return { buffer: null, loop: false, connect() {}, start() {} }; }
    createGain() { return { gain: { value: 1 }, connect() {} }; }
    resume() { this.state = 'running'; return Promise.resolve(); }
    destination = {};
  },
  HTMLMediaElement: { prototype: { play: () => Promise.resolve() } },
  performance: { now: () => Date.now() },
  requestAnimationFrame: null,
  cancelAnimationFrame: null,
  estado: {
    ws: {
      readyState: 1, // OPEN
      send: (msg: string) => { webSocketSent.push(msg); }
    },
    ultimaMsgEm: Date.now() - 20000 // 20s atrás
  },
  verificarConexao: () => {
    reconnectedCount++;
  }
};

// Executar o script no contexto mockado
const runner = new Function('window', 'document', 'localStorage', 'HTMLMediaElement', antiSleepCode);
runner(fakeWindow, fakeDocument, fakeLocalStorage, fakeWindow.HTMLMediaElement);

// [Teste 1]: Verificar exportações globais
console.log('Testando exportações do anti_sleep...');
assert.strictEqual(typeof fakeWindow.__togglePokeIdleUltra, 'function', '__togglePokeIdleUltra deve estar exposta');
assert.strictEqual(typeof fakeWindow.__isPokeIdleUltraActive, 'function', '__isPokeIdleUltraActive deve estar exposta');
assert.strictEqual(typeof fakeWindow.__idlestreamHeartbeat, 'function', '__idlestreamHeartbeat deve estar exposta');
assert.strictEqual(typeof fakeWindow.__flushIdleStreamCallbacks, 'function', '__flushIdleStreamCallbacks deve estar exposta');
console.log('✅ [1/5] Exportações de funções globais validadas!');

// [Teste 2]: Ativar Ultra Mode quando modal de configurações está fechado
console.log('Testando ativação do Ultra Mode via fluxo #btn-config -> #cfg-ultra...');
assert.strictEqual(fakeWindow.__isPokeIdleUltraActive(), false, 'Ultra deve nascer inativo');
const toggleRes1 = fakeWindow.__togglePokeIdleUltra(true);
assert.strictEqual(toggleRes1, true, 'Toggle deve retornar sucesso');
assert.strictEqual(isUltraOn, true, 'isUltraOn deve ser true após #btn-config -> #cfg-ultra');
assert.strictEqual(fakeWindow.__isPokeIdleUltraActive(), true, '__isPokeIdleUltraActive deve ser true');
console.log('✅ [2/5] Ativação automática do Ultra PokeIdle via DOM validada!');

// [Teste 3]: Desativar Ultra Mode via #ultra-sair
console.log('Testando desativação do Ultra Mode via #ultra-sair...');
const toggleRes2 = fakeWindow.__togglePokeIdleUltra(false);
assert.strictEqual(toggleRes2, true, 'Toggle de saída deve retornar sucesso');
assert.strictEqual(isUltraOn, false, 'isUltraOn deve voltar para false');
assert.strictEqual(fakeWindow.__isPokeIdleUltraActive(), false, '__isPokeIdleUltraActive deve ser false');
console.log('✅ [3/5] Desativação do Ultra PokeIdle via #ultra-sair validada!');

// [Teste 4]: Heartbeat disparando ping em WebSocket ocioso (> 15s)
console.log('Testando Heartbeat Watchdog com WebSocket ocioso...');
assert.strictEqual(webSocketSent.length, 0, 'Nenhum ping enviado ainda');
fakeWindow.__idlestreamHeartbeat();
assert.strictEqual(webSocketSent.length, 1, 'Heartbeat deve ter enviado 1 ping');
assert.strictEqual(webSocketSent[0], JSON.stringify({ t: 'ping' }), 'Mensagem enviada deve ser ping');
console.log('✅ [4/5] Heartbeat WebSocket keepalive validado com sucesso!');

// [Teste 5]: Heartbeat acionando reconexão se WebSocket estiver fechado
console.log('Testando Heartbeat Watchdog com WebSocket fechado...');
fakeWindow.estado.ws.readyState = 3; // CLOSED
fakeWindow.__idlestreamHeartbeat();
assert.strictEqual(reconnectedCount, 1, 'Heartbeat deve acionar verificarConexao()');
console.log('✅ [5/5] Reconexão automática em segundo plano validada com sucesso!');

console.log('\n🎉 TODOS OS 5 TESTES DE ULTRA MODE E HEARTBEAT FORAM APROVADOS COM SUCESSO!\n');
process.exit(0);
