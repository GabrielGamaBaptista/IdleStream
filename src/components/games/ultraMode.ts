export type GlobalUltraMode = 'all_on' | 'partial' | 'all_off';

export interface GlobalUltraDecision {
  targetState: boolean;
  mode: GlobalUltraMode;
  activeOnCount: number;
  totalActive: number;
}

/**
 * Calcula a ação do botão global "Ultra PokeIdle":
 * - Se todos os slots ativos já estiverem no modo Ultra (ou se não houver slots ativos e o estado global salvo for true),
 *   desativa em todos (targetState = false).
 * - Caso contrário (nenhum ou apenas parte dos slots no modo Ultra), ativa em todos (targetState = true).
 */
export function computeGlobalUltraDecision(
  activeSlotIds: string[],
  slotUltraMap: Record<string, boolean>,
  savedGlobalUltra: boolean
): GlobalUltraDecision {
  const totalActive = activeSlotIds.length;
  if (totalActive === 0) {
    return {
      targetState: !savedGlobalUltra,
      mode: savedGlobalUltra ? 'all_on' : 'all_off',
      activeOnCount: 0,
      totalActive: 0,
    };
  }

  const activeOnCount = activeSlotIds.filter((id) => Boolean(slotUltraMap[id])).length;
  const allOn = activeOnCount === totalActive;
  const mode: GlobalUltraMode = allOn ? 'all_on' : activeOnCount > 0 ? 'partial' : 'all_off';

  return {
    targetState: !allOn,
    mode,
    activeOnCount,
    totalActive,
  };
}
