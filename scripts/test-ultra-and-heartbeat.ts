import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { computeGlobalUltraDecision } from '../src/components/games/ultraMode.ts';

console.log('🧪 Iniciando validação de anti_sleep.js (Ultra Mode & Heartbeat Watchdog)...');

const antiSleepPath = path.resolve('src-tauri/src/games/anti_sleep.js');
const antiSleepCode = fs.readFileSync(antiSleepPath, 'utf8');

// 1. Simulação de DOM fiel ao PokeIdle real (button[role="switch"], #modal.hidden, #modal-fechar, #app.hidden)
let isUltraOn = false;
let configModalOpen = false;
let otherModalOpenMock = false;
let isAppHidden = false;
let simulateDomNotMounted = false;
let keepStaleCfgUltraWhenModalHidden = false;
let staleCfgUltraOn = false;
let btnConfigClicks = 0;
let tabPerfClicks = 0;

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
    if (simulateDomNotMounted) return null;
    if (id === 'app') {
      return {
        classList: { contains: (cls: string) => cls === 'hidden' && isAppHidden },
      };
    }
    if (id === 'modal') {
      return {
        classList: { contains: (cls: string) => cls === 'hidden' && !configModalOpen && !otherModalOpenMock },
      };
    }
    if (id === 'modal-fechar') {
      return {
        click: () => {
          configModalOpen = false;
          otherModalOpenMock = false;
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
          otherModalOpenMock = false;
          configModalOpen = true;
        },
      };
    }
    if (id === 'cfg-aba-desempenho') {
      return configModalOpen ? {
        click: () => {
          tabPerfClicks++;
        },
      } : null;
    }
    if (id === 'cfg-ultra') {
      if (!configModalOpen) {
        if (!keepStaleCfgUltraWhenModalHidden) return null;
        return {
          type: 'button',
          getAttribute: (attr: string) => (attr === 'aria-checked' ? String(staleCfgUltraOn) : null),
          classList: { contains: (cls: string) => cls === 'on' && staleCfgUltraOn },
          click: () => {
            staleCfgUltraOn = !staleCfgUltraOn;
            fakeLocalStorage.setItem('cfg-ultra', staleCfgUltraOn ? '1' : '0');
            isUltraOn = staleCfgUltraOn;
          },
        };
      }
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
console.log('✅ [9-10/14] Proteção contra inversão de switch e vazamento de modal validada!');

// [Teste 11]: Outro modal aberto (ex: Passe de Batalha/Loja) não deve bloquear ativação do Ultra
isUltraOn = false;
configModalOpen = false;
otherModalOpenMock = true;
tabPerfClicks = 0;
fakeLocalStorage.setItem('cfg-ultra', '0');
const toggleWithOtherModal = fakeWindow.__togglePokeIdleUltra(true);
assert.strictEqual(toggleWithOtherModal, true, 'Deve fechar outro modal e ativar Ultra');
assert.strictEqual(isUltraOn, true, 'Ultra deve estar ativo após fechar modal anterior');
assert.strictEqual(otherModalOpenMock, false, 'Outro modal não pode permanecer aberto');
assert.ok(tabPerfClicks >= 1, 'Deve selecionar a aba #cfg-aba-desempenho antes de alternar #cfg-ultra');
console.log('✅ [11/14] Superação de modal aberto e seleção da aba Desempenho validadas!');

// [Teste 12]: Quando DOM ainda não montou (#btn-config ausente), não deve retornar erro nem desistir
isUltraOn = false;
configModalOpen = false;
simulateDomNotMounted = true;
fakeLocalStorage.setItem('cfg-ultra', '0');
const toggleWhileLoading = fakeWindow.__togglePokeIdleUltra(true);
assert.strictEqual(toggleWhileLoading, true, 'Enquanto DOM carrega, deve agendar ativação adiada com sucesso');
simulateDomNotMounted = false;
fakeWindow.__togglePokeIdleUltra(false); // limpa timer pendente e restaura estado
console.log('✅ [12/14] Detecção segura de carregamento inicial (sem falso positivo de UI pronta) validada!');

// [Teste 13]: __idlestreamForceRepaint limpa estado oculto e despacha callbacks
fakeWindow.__setIdleStreamSlotHidden(true);
let forceRepaintCb = 0;
fakeWindow.requestAnimationFrame(() => { forceRepaintCb++; });
assert.strictEqual(fakeWindow.__getIdleStreamDebugState().isSlotHidden, true);
fakeWindow.__idlestreamForceRepaint();
assert.strictEqual(fakeWindow.__getIdleStreamDebugState().isSlotHidden, false, '__idlestreamForceRepaint deve limpar isSlotHidden');
assert.strictEqual(forceRepaintCb, 1, '__idlestreamForceRepaint deve despachar callbacks acumulados');
console.log('✅ [13/14] __idlestreamForceRepaint validado!');

// [Teste 14]: Semântica Global (ativar todos / desativar todos) vs Individual
const gAllOff = computeGlobalUltraDecision(['slot-1', 'slot-2', 'slot-3', 'slot-4'], {}, false);
assert.strictEqual(gAllOff.mode, 'all_off');
assert.strictEqual(gAllOff.targetState, true, 'Com todos desligados, global deve ativar em todos');

const gPartial = computeGlobalUltraDecision(
  ['slot-1', 'slot-2', 'slot-3', 'slot-4'],
  { 'slot-1': true, 'slot-2': false, 'slot-3': true, 'slot-4': false },
  true
);
assert.strictEqual(gPartial.mode, 'partial');
assert.strictEqual(gPartial.targetState, true, 'Com estado parcial, global deve ativar em todos (nunca inverter!)');

const gAllOn = computeGlobalUltraDecision(
  ['slot-1', 'slot-2', 'slot-3', 'slot-4'],
  { 'slot-1': true, 'slot-2': true, 'slot-3': true, 'slot-4': true },
  true
);
assert.strictEqual(gAllOn.mode, 'all_on');
assert.strictEqual(gAllOn.targetState, false, 'Com todos ativos, global deve desativar em todos');
console.log('✅ [14/15] Decisão Global (Ativar Todos / Desativar Todos) validada!');

// [Teste 15]: Regressão real observada no PokeIdle: #cfg-ultra obsoleto dentro de #modal oculto com aria-checked="true" após sair via #ultra-sair
isUltraOn = false;
configModalOpen = false;
otherModalOpenMock = false;
keepStaleCfgUltraWhenModalHidden = true;
staleCfgUltraOn = true; // ficou preso em "true" de abertura anterior enquanto modal fechou
fakeLocalStorage.setItem('cfg-ultra', '0');
btnConfigClicks = 0;
const toggleFromStale = fakeWindow.__togglePokeIdleUltra(true);
assert.strictEqual(toggleFromStale, true);
assert.ok(btnConfigClicks >= 1, 'Deve reabrir #btn-config quando #modal está oculto em vez de confiar em #cfg-ultra obsoleto');
assert.strictEqual(isUltraOn, true, 'Deve reativar Ultra mesmo após ciclo #ultra-sair com #cfg-ultra obsoleto no DOM');
assert.strictEqual(fakeLocalStorage.getItem('cfg-ultra'), '1');
keepStaleCfgUltraWhenModalHidden = false;
console.log('✅ [15/15] Regressão #cfg-ultra obsoleto em #modal oculto validada!');

setTimeout(() => {
  assert.strictEqual(fakeDocument.title, 'PokeIdle', 'document.title deve ser restaurado para PokeIdle');
  console.log('✅ [8/15] Restauração de document.title após atividade validada!');
  console.log('\n🎉 TODOS OS 15 TESTES DE ULTRA MODE, REPAINT, ATIVIDADE E HEARTBEAT FORAM APROVADOS COM SUCESSO!\n');
  process.exit(0);
}, 60);
