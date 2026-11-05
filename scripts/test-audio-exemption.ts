import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('🧪 Iniciando validação do mecanismo de IsAudible (Áudio Silencioso de Segundo Plano)...');

const antiSleepPath = path.resolve('src-tauri/src/games/anti_sleep.js');
const antiSleepCode = fs.readFileSync(antiSleepPath, 'utf8');

const domElements = new Map<string, any>();

class FakeHTMLMediaElement {
  id = '';
  src = '';
  loop = false;
  autoplay = false;
  volume = 1;
  muted = false;
  paused = true;

  play() {
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }
}

const fakeDocument: any = {
  readyState: 'complete',
  documentElement: {
    classList: {
      contains: () => false,
      toggle: () => {},
      add: () => {},
      remove: () => {},
    },
    appendChild: (el: any) => {
      if (el.id) domElements.set(el.id, el);
    },
  },
  body: {
    classList: {
      contains: () => false,
      toggle: () => {},
      add: () => {},
      remove: () => {},
    },
    appendChild: (el: any) => {
      if (el.id) domElements.set(el.id, el);
    },
  },
  querySelectorAll: () => [],
  getElementById: (id: string) => domElements.get(id) || null,
  createElement: (tag: string) => {
    if (tag === 'audio') {
      return new FakeHTMLMediaElement();
    }
    return { id: '', textContent: '', style: {} };
  },
  addEventListener: () => {},
  dispatchEvent: () => {},
};

const fakeWindow: any = {
  document: fakeDocument,
  HTMLMediaElement: FakeHTMLMediaElement,
  performance: { now: () => Date.now() },
  requestAnimationFrame: (cb: any) => setTimeout(cb, 16),
  cancelAnimationFrame: (id: any) => clearTimeout(id),
  addEventListener: () => {},
  dispatchEvent: () => {},
  localStorage: {
    getItem: () => null,
    setItem: () => {},
  },
};

const runScript = new Function(
  'window',
  'document',
  'HTMLMediaElement',
  'localStorage',
  'performance',
  antiSleepCode
);

runScript(
  fakeWindow,
  fakeDocument,
  FakeHTMLMediaElement,
  fakeWindow.localStorage,
  fakeWindow.performance
);

// 1. Testa presença da tag de áudio
const silentAudio = domElements.get('__idlestream_silent_audio__');
assert.ok(silentAudio, 'Tag __idlestream_silent_audio__ deve existir no DOM');
console.log('✅ [1/4] Tag __idlestream_silent_audio__ criada com sucesso');

// 2. Testa propriedades essenciais para o IsAudible do Chromium
assert.strictEqual(silentAudio.loop, true, 'Áudio deve estar em loop');
assert.strictEqual(silentAudio.autoplay, true, 'Áudio deve ter autoplay ativo');
assert.strictEqual(silentAudio.muted, false, 'Áudio NÃO pode estar mutado para garantir IsAudible no Chromium');
assert.ok(silentAudio.volume > 0 && silentAudio.volume <= 0.01, 'Volume deve ser baixo para ser imperceptível');
console.log('✅ [2/4] Propriedades loop=true, autoplay=true, muted=false validadas');

// 3. Testa proteção do play() contra mute por modo econômico
fakeWindow.__setIdleStreamEcoMode(true, 30);
silentAudio.play();
assert.strictEqual(silentAudio.muted, false, 'Tag silenciosa não pode ser mutada pelo modo econômico');
console.log('✅ [3/4] Proteção contra mutamento de eco-mode validada');

// 4. Testa restauração via __idlestreamHeartbeat se pausada
silentAudio.pause();
assert.strictEqual(silentAudio.paused, true, 'Áudio foi pausado manualmente para testar recuperação');
fakeWindow.__idlestreamHeartbeat();
assert.strictEqual(silentAudio.paused, false, 'Heartbeat deve reativar o áudio silencioso automaticamente');
console.log('✅ [4/4] Recuperação proativa no Heartbeat Watchdog validada');

console.log('\n🎉 TODOS OS TESTES DO MECANISMO DE ÁUDIO FORAM APROVADOS COM SUCESSO!\n');
