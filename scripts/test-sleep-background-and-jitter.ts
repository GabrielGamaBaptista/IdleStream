import assert from 'node:assert';

console.log('🧪 Iniciando testes de Sleep Mode em Segundo Plano e Filtro de Jitter...');

// ============================================================
// 1. Algoritmo de Cálculo de FPS Dinâmico (GameWorkspace)
// ============================================================
interface DynamicFpsParams {
  inactivityMinutes: number;
  appIdleSec: number;
  systemIdleSec: number;
  isWindowFocused: boolean;
  isWindowMinimized: boolean;
}

interface DynamicFpsResult {
  fps: number;
  isIdleDimmed: boolean;
}

const computeDynamicFps = (params: DynamicFpsParams): DynamicFpsResult => {
  const { inactivityMinutes, appIdleSec, systemIdleSec, isWindowFocused, isWindowMinimized } = params;
  const thresholdSeconds = inactivityMinutes * 60;

  // 1. Minimizada: 1 FPS imediato
  if (isWindowMinimized) {
    return { fps: 1, isIdleDimmed: false };
  }

  // Inatividade efetiva:
  // Se focada: appIdleSec.
  // Se unfocused: se o usuário estiver ausente do PC (systemIdleSec >= thresholdSeconds).
  // Se o usuário estiver usando outro app no PC (systemIdleSec < thresholdSeconds), mantém 10 FPS eco.
  const effectiveIdleSec = isWindowFocused
    ? appIdleSec
    : (systemIdleSec > 0 ? systemIdleSec : appIdleSec);

  // 2. Tempo de inatividade configurado atingido (ex: 1 min de sleep)
  if (thresholdSeconds > 0 && effectiveIdleSec >= thresholdSeconds) {
    return { fps: 1, isIdleDimmed: isWindowFocused };
  }

  // 3. Janela em segundo plano com o usuário ativo no PC (< thresholdSeconds)
  if (!isWindowFocused) {
    return { fps: 10, isIdleDimmed: false };
  }

  // 4. Primeiro plano: >30s sem mexer -> 10 FPS eco; mexendo ativamente -> 60 FPS
  if (appIdleSec >= 30) {
    return { fps: 10, isIdleDimmed: false };
  }

  return { fps: 60, isIdleDimmed: false };
};

// [Cenário 1]: Usuário ativo no app em primeiro plano (<30s)
const resActive = computeDynamicFps({
  inactivityMinutes: 1,
  appIdleSec: 5,
  systemIdleSec: 0,
  isWindowFocused: true,
  isWindowMinimized: false,
});
assert.strictEqual(resActive.fps, 60, 'Primeiro plano ativo deve rodar a 60 FPS');
assert.strictEqual(resActive.isIdleDimmed, false);
console.log('✅ [1/6] 60 FPS ativo em primeiro plano validado!');

// [Cenário 2]: Usuário parado no app há 35s (>30s mas <1m)
const resEco = computeDynamicFps({
  inactivityMinutes: 1,
  appIdleSec: 35,
  systemIdleSec: 35,
  isWindowFocused: true,
  isWindowMinimized: false,
});
assert.strictEqual(resEco.fps, 10, 'Inatividade de 35s deve reduzir para 10 FPS eco');
assert.strictEqual(resEco.isIdleDimmed, false);
console.log('✅ [2/6] 10 FPS eco após 30s de inatividade validado!');

// [Cenário 3]: Janela em segundo plano com usuário jogando/trabalhando em outro app no PC
const resBgActivePc = computeDynamicFps({
  inactivityMinutes: 1,
  appIdleSec: 120, // App sem interação há 2 min
  systemIdleSec: 5,  // Mas o usuário está mexendo no PC agora mesmo em outro app!
  isWindowFocused: false,
  isWindowMinimized: false,
});
assert.strictEqual(resBgActivePc.fps, 10, 'Segundo plano com PC em uso deve rodar em 10 FPS eco');
assert.strictEqual(resBgActivePc.isIdleDimmed, false);
console.log('✅ [3/6] 10 FPS em segundo plano enquanto usuário usa outro app validado!');

// [Cenário 4]: Janela em segundo plano e usuário AUSENTE do PC (> 1 min de sleep)
const resBgAwayPc = computeDynamicFps({
  inactivityMinutes: 1, // 60 segundos
  appIdleSec: 75,
  systemIdleSec: 75,   // Usuário ausente do PC há 75s (> 60s)
  isWindowFocused: false,
  isWindowMinimized: false,
});
assert.strictEqual(resBgAwayPc.fps, 1, 'Segundo plano com usuário ausente DEVE entrar em 1 FPS sleep');
assert.strictEqual(resBgAwayPc.isIdleDimmed, false, 'Segundo plano não deve montar overlay visual desnecessário');
console.log('✅ [4/6] 1 FPS Sleep Mode em segundo plano validado com sucesso!');

// [Cenário 5]: Janela em primeiro plano com tempo de inatividade atingido
const resFgSleep = computeDynamicFps({
  inactivityMinutes: 1,
  appIdleSec: 65,
  systemIdleSec: 65,
  isWindowFocused: true,
  isWindowMinimized: false,
});
assert.strictEqual(resFgSleep.fps, 1, 'Primeiro plano inativo DEVE entrar em 1 FPS sleep');
assert.strictEqual(resFgSleep.isIdleDimmed, true, 'Primeiro plano inativo DEVE exibir overlay de sleep');
console.log('✅ [5/6] 1 FPS Sleep Mode em primeiro plano com tela de proteção validado!');

// ============================================================
// 2. Filtro Anti-Jitter de Mouse
// ============================================================
class MouseJitterFilter {
  lastPos: { x: number; y: number } | null = null;
  activityCount = 0;

  handleMouseMove(x: number, y: number, isIdleDimmed: boolean): boolean {
    // Quando em sleep mode com overlay, mousemove NÃO acorda o app
    if (isIdleDimmed) return false;

    if (!this.lastPos) {
      this.lastPos = { x, y };
      return false;
    }

    const dx = x - this.lastPos.x;
    const dy = y - this.lastPos.y;
    const distance = Math.hypot(dx, dy);

    // Ignora ruído de sensor óptico gamer (<= 20 pixels)
    if (distance < 20) return false;

    this.lastPos = { x, y };
    this.activityCount++;
    return true;
  }
}

const filter = new MouseJitterFilter();

// Simulação de ruído óptico de sensor em repouso (1px a 3px de jitter na mesa)
assert.strictEqual(filter.handleMouseMove(100, 100, false), false, 'Primeiro evento apenas calibra a posição');
assert.strictEqual(filter.handleMouseMove(101, 100, false), false, '1px de ruído óptico X deve ser ignorado');
assert.strictEqual(filter.handleMouseMove(101, 102, false), false, '2px de ruído óptico Y deve ser ignorado');
assert.strictEqual(filter.handleMouseMove(105, 106, false), false, '7px de micro-vibração deve ser ignorada');
assert.strictEqual(filter.activityCount, 0, 'Nenhum ruído térmico/óptico deve disparar atividade');

// Movimento real do usuário (delta > 20px)
const realMove = filter.handleMouseMove(135, 140, false); // delta ~ 48px
assert.strictEqual(realMove, true, 'Movimento real (>20px) deve acionar atividade');
assert.strictEqual(filter.activityCount, 1, 'Contador de atividade deve ser incrementado');

// Durante Sleep Mode ativo (isIdleDimmed = true), mesmo movimentos amplos não devem acordar via mousemove
const moveDuringSleep = filter.handleMouseMove(300, 300, true);
assert.strictEqual(moveDuringSleep, false, 'MouseMove durante Sleep Mode DEVE ser ignorado (apenas clique/tecla acorda)');
assert.strictEqual(filter.activityCount, 1, 'Nenhuma atividade registrada durante sleep via mousemove');

console.log('✅ [6/6] Filtro anti-jitter (>20px) e imunidade de sleep a mousemove validados!');

console.log('\n🎉 TODOS OS TESTES DE SLEEP MODE E ANTI-JITTER FORAM APROVADOS COM SUCESSO!\n');
