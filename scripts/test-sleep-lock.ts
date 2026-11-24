/**
 * Teste unitário e de simulação da máquina de estados do Sleep Lock e inatividade
 */

function simulateSleepEngine() {
  let inactivityMinutes = 5;
  let isIdleDimmed = false;
  let isWindowFocused = true;
  let isWindowMinimized = false;
  let currentDynamicFps = 60;
  let lastActivityTime = Date.now();
  let systemIdleSec = 0;

  const wakeUpFromIdle = () => {
    lastActivityTime = Date.now();
    isWindowFocused = true;
    isWindowMinimized = false;
    if (isIdleDimmed) {
      isIdleDimmed = false;
    }
    if (currentDynamicFps !== 60) {
      currentDynamicFps = 60;
    }
  };

  const handleFocus = () => {
    isWindowFocused = true;
    isWindowMinimized = false;
    if (isIdleDimmed) return; // SLEEP LOCK: não acorda em foco passivo!
    lastActivityTime = Date.now();
    if (currentDynamicFps !== 60) {
      currentDynamicFps = 60;
    }
  };

  const handleBlur = () => {
    isWindowFocused = false;
    // Perda de foco não destrói o sleep
  };

  const handleUserActivity = (e?: { isTrusted: boolean }) => {
    if (isIdleDimmed) return; // SLEEP LOCK: não acorda em eventos genéricos
    if (e && !e.isTrusted) return;
    lastActivityTime = Date.now();
    isWindowFocused = true;
    if (currentDynamicFps !== 60 && !isWindowMinimized) {
      currentDynamicFps = 60;
    }
  };

  const tickInterval = (simulatedSystemIdle: number, activeSlotsCount = 1) => {
    const thresholdSeconds = inactivityMinutes * 60;
    const appIdleSec = Math.floor((Date.now() - lastActivityTime) / 1000);
    systemIdleSec = simulatedSystemIdle;

    if (isWindowMinimized) {
      currentDynamicFps = 1;
      return;
    }

    const effectiveIdleSec = isWindowFocused
      ? Math.max(appIdleSec, systemIdleSec)
      : (systemIdleSec > 0 ? systemIdleSec : appIdleSec);

    // 2. Sleep Lock
    if (isIdleDimmed) {
      if (currentDynamicFps !== 1) {
        currentDynamicFps = 1;
      }
      return;
    }

    // 3. Threshold atingido
    if (thresholdSeconds > 0 && effectiveIdleSec >= thresholdSeconds) {
      currentDynamicFps = 1;
      if (!isIdleDimmed && activeSlotsCount > 0 && isWindowFocused) {
        isIdleDimmed = true;
      }
      return;
    }

    // 4. Background unfocused
    if (!isWindowFocused) {
      if (currentDynamicFps !== 10) {
        currentDynamicFps = 10;
      }
      return;
    }

    // 5. Foreground focado
    if (appIdleSec >= 30) {
      if (currentDynamicFps !== 10) {
        currentDynamicFps = 10;
      }
    } else {
      if (currentDynamicFps !== 60) {
        currentDynamicFps = 60;
      }
    }
  };

  return {
    getState: () => ({ isIdleDimmed, isWindowFocused, currentDynamicFps, lastActivityTime }),
    setLastActivityTime: (t: number) => { lastActivityTime = t; },
    handleFocus,
    handleBlur,
    handleUserActivity,
    wakeUpFromIdle,
    tickInterval,
  };
}

console.log('🧪 Iniciando testes de validação do Sleep Lock...');

// Teste 1: Entrada em Sleep após inatividade do Windows (GetLastInputInfo >= 300s)
{
  const sim = simulateSleepEngine();
  // Simula usuário que não mexe no teclado do Windows há 305 segundos
  sim.tickInterval(305, 1);
  const st = sim.getState();
  if (!st.isIdleDimmed || st.currentDynamicFps !== 1) {
    throw new Error(`Falha no Teste 1: esperado isIdleDimmed=true e 1 FPS, obtido: ${JSON.stringify(st)}`);
  }
  console.log('✅ Teste 1 OK: Entrada correta em Sleep Mode (1 FPS, isIdleDimmed=true)');
}

// Teste 2: Imunidade a Blur e Focus (Sleep Lock)
{
  const sim = simulateSleepEngine();
  sim.tickInterval(305, 1); // Entrou em sleep

  // Ocorre blur (outra janela ou verificação)
  sim.handleBlur();
  sim.tickInterval(306, 1);
  let st = sim.getState();
  if (!st.isIdleDimmed || st.currentDynamicFps !== 1) {
    throw new Error(`Falha no Teste 2 (blur): sleep quebrado no blur! ${JSON.stringify(st)}`);
  }

  // Ocorre focus (retorno à janela)
  sim.handleFocus();
  sim.tickInterval(307, 1);
  st = sim.getState();
  if (!st.isIdleDimmed || st.currentDynamicFps !== 1) {
    throw new Error(`Falha no Teste 2 (focus): sleep quebrado no focus! ${JSON.stringify(st)}`);
  }
  console.log('✅ Teste 2 OK: Imunidade a Blur/Focus mantida intacta em 1 FPS');
}

// Teste 3: Eventos espúrios e não confiáveis NÃO quebram o Sleep
{
  const sim = simulateSleepEngine();
  sim.tickInterval(305, 1); // Entrou em sleep

  // Evento não confiável (sintético de jogo ou scroll)
  sim.handleUserActivity({ isTrusted: false });
  sim.tickInterval(308, 1);
  let st = sim.getState();
  if (!st.isIdleDimmed || st.currentDynamicFps !== 1) {
    throw new Error(`Falha no Teste 3: evento sintético quebrou o sleep! ${JSON.stringify(st)}`);
  }

  // Evento genérico com sleep ativo
  sim.handleUserActivity({ isTrusted: true });
  sim.tickInterval(309, 1);
  st = sim.getState();
  if (!st.isIdleDimmed || st.currentDynamicFps !== 1) {
    throw new Error(`Falha no Teste 3: evento de janela quebrou o sleep! ${JSON.stringify(st)}`);
  }
  console.log('✅ Teste 3 OK: Eventos espúrios/passivos bloqueados pelo Sleep Lock');
}

// Teste 4: Despertar Intencional restaura 60 FPS
{
  const sim = simulateSleepEngine();
  sim.tickInterval(305, 1); // Entrou em sleep
  sim.wakeUpFromIdle(); // Usuário clica no botão "Acordar"

  const st = sim.getState();
  if (st.isIdleDimmed || st.currentDynamicFps !== 60) {
    throw new Error(`Falha no Teste 4: despertar intencional falhou! ${JSON.stringify(st)}`);
  }
  console.log('✅ Teste 4 OK: Despertar intencional retoma instantaneamente para 60 FPS');
}

console.log('🎉 TODOS OS TESTES DO SLEEP LOCK PASSARAM COM 100% DE SUCESSO!');
