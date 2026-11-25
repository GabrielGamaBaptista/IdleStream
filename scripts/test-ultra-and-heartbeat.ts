import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('🧪 Iniciando validação de anti_sleep.js (Ultra Mode & Heartbeat Watchdog)...');

const antiSleepPath = path.resolve('src-tauri/src/games/anti_sleep.js');
const antiSleepCode = fs.readFileSync(antiSleepPath, 'utf8');

// 1. Simulação de DOM fiel ao PokeIdle real (button[role="switch"], #modal.hidden, #modal-fechar, #app.hidden)
let isUltraOn = false;
let configModalOpen = false;
let isAppHidden = false;
let btnConfigClicks = 0;

// Mock window e document
const localStorageMap = new Map<string, string>();
const fakeLocalStorage = {
  getItem: (k: string) => localStorageMap.get(k) ?? null,
  setItem: (k: string, v: string) => localStorageMap.set(k, String(v)),
  removeItem: (k: string) => localStorageMap.delete(k),
};

const domElements = new Map<string, any>();

const htmlClasses = new Set<string>();
const bodyClasses = new Set<string>();
const makeClassList = (set: Set<string>, onModoUltra?: (v: boolean) => void) => ({
  contains: (cls: string) => (cls === 'modo-ultra' ? isUltraOn : set.has(cls)),
  toggle: (cls: string, state?: boolean) => {
    if (cls === 'modo-ultra') {
      isUltraOn = state !== undefined ? state : !isUltraOn;
      onModoUltra?.(isUltraOn);
    } else if (state !== undefined) {
      if (state) set.add(cls); else set.delete(cls);
    } else if (set.has(cls)) {
      set.delete(cls);
    } else {
      set.add(cls);
    }
  },
  add: (cls: string) => {
    if (cls === 'modo-ultra') isUltraOn = true;
    set.add(cls);
  },
  remove: (cls: string) => {
    if (cls === 'modo-ultra') isUltraOn = false;
    set.delete(cls);
  },
});

const fakeDocument: any = {
  documentElement: {
    classList: makeClassList(htmlClasses),
    appendChild: () => {},
  },
  body: {
    classList: makeClassList(bodyClasses),
    appendChild: () => {},
  },
  getElementById: (id: string) => {
    if (id === 'app') {
      return {
        classList: { contains: (cls: string) => cls === 'hidden' && isAppHidden },
      };
    }
    if (id === 'modal') {
      return {
        classList: { contains: (cls: string) => cls === 'hidden' && !configModalOpen },
      };
    }
    if (id === 'modal-fechar') {
      return {
        click: () => {
          configModalOpen = false;
        },
      };
    }
    if (id === 'ultra-sair') {
      return isUltraOn ? {
        click: () => {
          isUltraOn = false;
          fakeLocalStorage.setItem('cfg-ultra', '0');
        },
      } : null;
    }
    if (id === 'btn-config') {
      return {
        click: () => {
          btnConfigClicks++;
          configModalOpen = true;
        },
      };
    }
    if (id === 'cfg-ultra') {
      if (!configModalOpen) return null;
      const cfgOn = fakeLocalStorage.getItem('cfg-ultra') === '1';
      return {
        type: 'button',
        getAttribute: (attr: string) => (attr === 'aria-checked' ? String(cfgOn) : null),
        classList: { contains: (cls: string) => cls === 'on' && cfgOn },
        click: () => {
          const next = !cfgOn;
          fakeLocalStorage.setItem('cfg-ultra', next ? '1' : '0');
          isUltraOn = next;
          if (next) {
            configModalOpen = false; // PokeIdle só fecha automaticamente ao ligar
          }
        },
      };
    }
    return domElements.get(id) || null;
  },
  createElement: (tag: string) => ({
    id: '',
    style: {},
    innerHTML: '',
    appendChild: () => {},
  }),
  querySelector: () => null,
  querySelectorAll: () => [],
  dispatchEvent: () => true,
  addEventListener: () => {},
};

let webSocketSent: string[] = [];
let reconnectedCount = 0;

const windowListeners = new Map<string, Array<(e: any) => void>>();
let rafFlushCount = 0;

const fakeWindow: any = {
  location: { hostname: 'pokeidle.io' },
  document: fakeDocument,
  localStorage: fakeLocalStorage,
  addEventListener: (evt: string, cb: (e: any) => void) => {
    const arr = windowListeners.get(evt) || [];
    arr.push(cb);
    windowListeners.set(evt, arr);
  },
  dispatchEvent: () => true,
  AudioContext: class {
    state = 'running';
    sampleRate = 44100;
    createBuffer() { return {}; }
    createBufferSource() { return { buffer: null, loop: false, connect() {}, start() {} }; }
    createGain() { return { gain: { value: 1 }, connect() {} }; }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    destination = {};
  },
  HTMLMediaElement: { prototype: { play: () => Promise.resolve() } },
  performance: { now: () => Date.now() },
  requestAnimationFrame: (cb: (t: number) => void) => {
    rafFlushCount++;
    return rafFlushCount;
  },
  cancelAnimationFrame: () => {},
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
const runner = new Function('window', 'document', 'localStorage', 'HTMLMediaElement', 'location', antiSleepCode);
fakeDocument.title = 'PokeIdle';
runner(fakeWindow, fakeDocument, fakeLocalStorage, fakeWindow.HTMLMediaElement, fakeWindow.location);

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
console.log('✅ [5/8] Reconexão automática em segundo plano validada com sucesso!');

// [Teste 6]: Ponte de atividade do usuário via __IDLESTREAM_USER_ACTIVITY__ (mousedown / wheel / mousemove >=25px)
console.log('Testando ponte de atividade do usuário em Child WebView (Desktop)...');
const emitEvent = (type: string, props: any) => {
  const cbs = windowListeners.get(type) || [];
  for (const cb of cbs) cb({ type, ...props });
};

// Evento não confiável e micro-jitter devem ser ignorados
fakeDocument.title = 'PokeIdle';
emitEvent('mousedown', { isTrusted: false });
assert.strictEqual(fakeDocument.title, 'PokeIdle', 'Evento não confiável não deve emitir atividade');

emitEvent('mousemove', { isTrusted: true, clientX: 100, clientY: 100 }); // calibra
emitEvent('mousemove', { isTrusted: true, clientX: 103, clientY: 104 }); // delta 5px (< 25px)
assert.strictEqual(fakeDocument.title, 'PokeIdle', 'Micro-jitter (<25px) não deve emitir atividade');

// Tecla modificadora isolada deve ser ignorada
emitEvent('keydown', { isTrusted: true, key: 'Shift' });
assert.strictEqual(fakeDocument.title, 'PokeIdle', 'Tecla modificadora isolada não deve emitir atividade');

// Clique real confiável DEVE emitir __IDLESTREAM_USER_ACTIVITY__|
emitEvent('mousedown', { isTrusted: true });
assert.ok(
  String(fakeDocument.title).startsWith('__IDLESTREAM_USER_ACTIVITY__|'),
  'Clique confiável em Child WebView deve emitir __IDLESTREAM_USER_ACTIVITY__|'
);
console.log('✅ [6/8] Ponte de atividade Desktop (__IDLESTREAM_USER_ACTIVITY__) validada!');

// [Teste 7]: Transição 1 FPS / Hidden -> 60 FPS Ativo despacha callbacks acumulados sem travar
console.log('Testando transição Slot Hidden + 1 FPS -> 60 FPS Ativo...');
fakeWindow.__setIdleStreamFps(10);
fakeWindow.__setIdleStreamSlotHidden(true);
let callbackExecuted = 0;
fakeWindow.requestAnimationFrame(() => {
  callbackExecuted++;
});
const dbgHidden = fakeWindow.__getIdleStreamDebugState();
assert.strictEqual(dbgHidden.isSlotHidden, true);
assert.strictEqual(dbgHidden.targetFps, 10);
assert.strictEqual(dbgHidden.pendingCallbacks, 1);

fakeWindow.__setIdleStreamSlotHidden(false);
fakeWindow.__setIdleStreamFps(60);
const dbgActive = fakeWindow.__getIdleStreamDebugState();
assert.strictEqual(dbgActive.isSlotHidden, false);
assert.strictEqual(dbgActive.targetFps, 60);
assert.strictEqual(dbgActive.isEcoMode, false);
assert.strictEqual(callbackExecuted, 1, 'Callback acumulado em hidden/eco deve ser despachado ao voltar para 60 FPS');
console.log('✅ [7/8] Transição Hidden/Eco -> 60 FPS com flush imediato validada!');

// [Teste 8]: Restauro automático do document.title após emissão de atividade
// [Teste 9]: Não abrir #btn-config nem inverter cfg-ultra=1 quando #app ainda está hidden (startup/reconexão)
isUltraOn = false;
configModalOpen = false;
isAppHidden = true;
btnConfigClicks = 0;
fakeLocalStorage.setItem('cfg-ultra', '1');
assert.strictEqual(fakeWindow.__isPokeIdleUltraActive(), true, 'Com #app hidden e cfg-ultra=1, deve considerar Ultra ativo');
fakeWindow.__togglePokeIdleUltra(true);
assert.strictEqual(btnConfigClicks, 0, 'Não deve clicar em #btn-config enquanto #app está hidden e cfg-ultra=1');
assert.strictEqual(configModalOpen, false, 'Modal de configurações não deve abrir no startup');
assert.strictEqual(fakeLocalStorage.getItem('cfg-ultra'), '1', 'cfg-ultra deve permanecer 1');

// [Teste 10]: Se #cfg-ultra já estiver aria-checked="true" com modal aberto, não deve desligar e deve fechar via #modal-fechar
isAppHidden = false;
isUltraOn = false;
configModalOpen = true;
fakeLocalStorage.setItem('cfg-ultra', '1');
fakeWindow.__togglePokeIdleUltra(true);
assert.strictEqual(fakeLocalStorage.getItem('cfg-ultra'), '1', 'Não deve inverter switch já ligado para 0');
assert.strictEqual(configModalOpen, false, 'Deve fechar modal via #modal-fechar');
console.log('✅ [9-10/10] Proteção contra inversão de switch e vazamento de modal validada!');

setTimeout(() => {
  assert.strictEqual(fakeDocument.title, 'PokeIdle', 'document.title deve ser restaurado para PokeIdle');
  console.log('✅ [8/10] Restauração de document.title após atividade validada!');
  console.log('\n🎉 TODOS OS 10 TESTES DE ULTRA MODE, ATIVIDADE E HEARTBEAT FORAM APROVADOS COM SUCESSO!\n');
  process.exit(0);
}, 60);
