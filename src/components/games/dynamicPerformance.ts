export interface DynamicPerformanceInput {
  inactivityMinutes: number;
  appIdleSec: number;
  systemIdleSec: number;
  isWindowFocused: boolean;
  isWindowMinimized: boolean;
  isIdleDimmed: boolean;
  isAndroid: boolean;
  activeSlotsCount: number;
}

export interface DynamicPerformanceDecision {
  fps: 1 | 10 | 60;
  shouldDim: boolean;
  shouldTrimMemory: boolean;
}

/**
 * Calcula o patamar de FPS dinâmico e o estado de Sleep Mode sem falsos positivos
 * quando o usuário está jogando em Child WebViews ou quando systemIdleSec === 0 em segundo plano.
 */
export function computeDynamicPerformanceState(
  input: DynamicPerformanceInput
): DynamicPerformanceDecision {
  const {
    inactivityMinutes,
    appIdleSec,
    systemIdleSec,
    isWindowFocused,
    isWindowMinimized,
    isIdleDimmed,
    isAndroid,
    activeSlotsCount,
  } = input;
  const thresholdSeconds = inactivityMinutes * 60;

  if (isWindowMinimized) {
    return { fps: 1, shouldDim: isIdleDimmed, shouldTrimMemory: true };
  }

  // Sleep Lock: nunca acorda automaticamente no loop periódico
  if (isIdleDimmed) {
    return { fps: 1, shouldDim: true, shouldTrimMemory: true };
  }

  // Em primeiro plano: usa appIdleSec (alimentado por janela principal + Child WebViews, com anti-jitter >= 25px).
  // Em segundo plano no Desktop: usa systemIdleSec diretamente (0 = PC ativo em outro app, nunca fallback para appIdleSec).
  const effectiveIdleSec = isWindowFocused
    ? appIdleSec
    : isAndroid
      ? appIdleSec
      : systemIdleSec;

  if (thresholdSeconds > 0 && effectiveIdleSec >= thresholdSeconds) {
    return {
      fps: 1,
      shouldDim: activeSlotsCount > 0 && isWindowFocused,
      shouldTrimMemory: true,
    };
  }

  if (!isWindowFocused) {
    return { fps: 10, shouldDim: false, shouldTrimMemory: false };
  }

  if (appIdleSec >= 30) {
    return { fps: 10, shouldDim: false, shouldTrimMemory: false };
  }

  return { fps: 60, shouldDim: false, shouldTrimMemory: false };
}
