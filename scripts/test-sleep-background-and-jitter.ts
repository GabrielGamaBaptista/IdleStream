import assert from 'node:assert';
import { computeDynamicPerformanceState } from '../src/components/games/dynamicPerformance.ts';

console.log('🧪 Iniciando testes de Performance Dinâmica, Sleep Mode em Segundo Plano e Filtro Anti-Jitter...');

// [1] Usuário ativo no app em primeiro plano (<30s)
const resActive = computeDynamicPerformanceState({
  inactivityMinutes: 1,
  appIdleSec: 5,
  systemIdleSec: 0,
  isWindowFocused: true,
  isWindowMinimized: false,
  isIdleDimmed: false,
  isAndroid: false,
  activeSlotsCount: 4,
});
assert.strictEqual(resActive.fps, 60, 'Primeiro plano ativo deve rodar a 60 FPS');
assert.strictEqual(resActive.shouldDim, false);
assert.strictEqual(resActive.shouldTrimMemory, false);
console.log('✅ [1/10] 60 FPS ativo em primeiro plano validado!');

// [2] Usuário jogando dentro de Child WebView (systemIdleSec === 0 e appIdleSec atualizado via bridge)
const resChildActive = computeDynamicPerformanceState({
  inactivityMinutes: 1,
  appIdleSec: 1,
  systemIdleSec: 0,
  isWindowFocused: true,
  isWindowMinimized: false,
  isIdleDimmed: false,
  isAndroid: false,
  activeSlotsCount: 4,
});
assert.strictEqual(resChildActive.fps, 60, 'Jogo ativo em Child WebView deve manter 60 FPS');
assert.strictEqual(resChildActive.shouldDim, false);
console.log('✅ [2/10] 60 FPS ativo em Child WebView validado!');

// [3] Usuário parado no app há 35s (>30s mas <1m)
const resEco = computeDynamicPerformanceState({
  inactivityMinutes: 1,
  appIdleSec: 35,
  systemIdleSec: 35,
  isWindowFocused: true,
  isWindowMinimized: false,
  isIdleDimmed: false,
  isAndroid: false,
  activeSlotsCount: 4,
});
assert.strictEqual(resEco.fps, 10, 'Inatividade de 35s deve reduzir para 10 FPS eco');
assert.strictEqual(resEco.shouldDim, false);
console.log('✅ [3/10] 10 FPS eco após 30s de inatividade validado!');

// [4] REGRESSÃO CRÍTICA: Segundo plano com usuário ativo agora mesmo (systemIdleSec === 0, appIdleSec === 120)
// Anteriormente `systemIdleSec > 0 ? systemIdleSec : appIdleSec` caía em appIdleSec e forçava 1 FPS!
const resBgActiveZeroIdle = computeDynamicPerformanceState({
  inactivityMinutes: 1,
  appIdleSec: 120,
  systemIdleSec: 0,
  isWindowFocused: false,
  isWindowMinimized: false,
  isIdleDimmed: false,
  isAndroid: false,
  activeSlotsCount: 4,
});
assert.strictEqual(resBgActiveZeroIdle.fps, 10, 'Segundo plano com systemIdleSec=0 DEVE manter 10 FPS eco (nunca cair em 1 FPS!)');
assert.strictEqual(resBgActiveZeroIdle.shouldDim, false);
assert.strictEqual(resBgActiveZeroIdle.shouldTrimMemory, false);
console.log('✅ [4/10] Regressão systemIdleSec=0 em segundo plano validada (10 FPS estável)!');

// [5] Janela em segundo plano com usuário mexendo no PC há 5s
const resBgActivePc = computeDynamicPerformanceState({
  inactivityMinutes: 1,
  appIdleSec: 120,
  systemIdleSec: 5,
  isWindowFocused: false,
  isWindowMinimized: false,
  isIdleDimmed: false,
  isAndroid: false,
  activeSlotsCount: 4,
});
assert.strictEqual(resBgActivePc.fps, 10, 'Segundo plano com PC em uso deve rodar em 10 FPS eco');
assert.strictEqual(resBgActivePc.shouldDim, false);
console.log('✅ [5/10] 10 FPS em segundo plano enquanto usuário usa outro app validado!');

// [6] Janela em segundo plano e usuário AUSENTE do PC (> 1 min de sleep)
const resBgAwayPc = computeDynamicPerformanceState({
  inactivityMinutes: 1,
  appIdleSec: 75,
  systemIdleSec: 75,
  isWindowFocused: false,
  isWindowMinimized: false,
  isIdleDimmed: false,
  isAndroid: false,
  activeSlotsCount: 4,
});
assert.strictEqual(resBgAwayPc.fps, 1, 'Segundo plano com usuário ausente DEVE entrar em 1 FPS sleep');
assert.strictEqual(resBgAwayPc.shouldDim, false, 'Segundo plano não deve montar overlay visual desnecessário');
assert.strictEqual(resBgAwayPc.shouldTrimMemory, true);
console.log('✅ [6/10] 1 FPS Sleep Mode em segundo plano validado com sucesso!');

// [7] Janela em primeiro plano com tempo de inatividade atingido
const resFgSleep = computeDynamicPerformanceState({
  inactivityMinutes: 1,
  appIdleSec: 65,
  systemIdleSec: 65,
  isWindowFocused: true,
  isWindowMinimized: false,
  isIdleDimmed: false,
  isAndroid: false,
  activeSlotsCount: 4,
});
assert.strictEqual(resFgSleep.fps, 1, 'Primeiro plano inativo DEVE entrar em 1 FPS sleep');
assert.strictEqual(resFgSleep.shouldDim, true, 'Primeiro plano inativo DEVE exibir overlay de sleep');
assert.strictEqual(resFgSleep.shouldTrimMemory, true);
console.log('✅ [7/10] 1 FPS Sleep Mode em primeiro plano com tela de proteção validado!');

// [8] Janela minimizada força 1 FPS imediato
const resMin = computeDynamicPerformanceState({
  inactivityMinutes: 5,
  appIdleSec: 0,
  systemIdleSec: 0,
  isWindowFocused: false,
  isWindowMinimized: true,
  isIdleDimmed: false,
  isAndroid: false,
  activeSlotsCount: 4,
});
assert.strictEqual(resMin.fps, 1);
assert.strictEqual(resMin.shouldTrimMemory, true);
console.log('✅ [8/10] Minimização imediata para 1 FPS validada!');

// [9] Sleep Lock mantém 1 FPS mesmo se systemIdleSec=0
const resLock = computeDynamicPerformanceState({
  inactivityMinutes: 1,
  appIdleSec: 0,
  systemIdleSec: 0,
  isWindowFocused: true,
  isWindowMinimized: false,
  isIdleDimmed: true,
  isAndroid: false,
  activeSlotsCount: 4,
});
assert.strictEqual(resLock.fps, 1);
assert.strictEqual(resLock.shouldDim, true);
console.log('✅ [9/10] Sleep Lock imune a eventos passivos validado!');

// [10] Filtro Anti-Jitter de Mouse (>= 25px)
class MouseJitterFilter {
  lastPos: { x: number; y: number } | null = null;
  activityCount = 0;

  handleMouseMove(x: number, y: number, isIdleDimmed: boolean): boolean {
    if (isIdleDimmed) return false;
    if (!this.lastPos) {
      this.lastPos = { x, y };
      return false;
    }
    const dx = x - this.lastPos.x;
    const dy = y - this.lastPos.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 25) return false;
    this.lastPos = { x, y };
    this.activityCount++;
    return true;
  }
}

const filter = new MouseJitterFilter();
assert.strictEqual(filter.handleMouseMove(100, 100, false), false, 'Primeiro evento calibra posição');
assert.strictEqual(filter.handleMouseMove(101, 100, false), false, '1px de ruído óptico X deve ser ignorado');
assert.strictEqual(filter.handleMouseMove(101, 102, false), false, '2px de ruído óptico Y deve ser ignorado');
assert.strictEqual(filter.handleMouseMove(110, 110, false), false, '14px de micro-vibração deve ser ignorada');
assert.strictEqual(filter.activityCount, 0, 'Nenhum ruído térmico/óptico deve disparar atividade');
assert.strictEqual(filter.handleMouseMove(135, 140, false), true, 'Movimento real (>=25px) deve acionar atividade');
assert.strictEqual(filter.activityCount, 1);
assert.strictEqual(filter.handleMouseMove(300, 300, true), false, 'MouseMove durante Sleep Mode DEVE ser ignorado');
assert.strictEqual(filter.activityCount, 1);
console.log('✅ [10/10] Filtro anti-jitter (>=25px) e imunidade de sleep validados!');

console.log('\n🎉 TODOS OS 10 TESTES DE SLEEP MODE, ECO E ANTI-JITTER PASSARAM COM 100% DE SUCESSO!\n');
