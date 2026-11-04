import React, { useEffect, useRef, useState, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useAppStore } from '../../stores/appStore';
import { GameSlotConfig, SlotBounds } from '../../types';
import { gamePlatformService, isAndroidPlatform } from '../../services/gamePlatformService';
import {
  LayoutGrid,
  Maximize2,
  Columns,
  RotateCw,
  Settings,
  Play,
  Square,
  ShieldCheck,
  Flame,
  X,
  ChevronDown,
  ChevronUp,
  Expand,
  Shrink,
  BarChart3,
} from 'lucide-react';

export const GameWorkspace: React.FC = () => {
  const { config, updateGameSlot, isImmersiveMode, toggleImmersiveMode, setImmersiveMode } = useAppStore();
  const gameSlots = config.game_slots || [];

  const [activeSlots, setActiveSlots] = useState<string[]>([]);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'focus' | 'sidebar'>('grid');
  const [focusedSlotId, setFocusedSlotId] = useState<string>('slot-1');
  const [fpsTier, setFpsTier] = useState<'60' | '30' | '10'>('30');
  const [isPokeIdleUltra, setIsPokeIdleUltra] = useState<boolean>(false);
  const [editingSlot, setEditingSlot] = useState<GameSlotConfig | null>(null);
  const [slotZooms, setSlotZooms] = useState<Record<string, number>>({});
  const [isToolbarVisible, setIsToolbarVisible] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return isAndroidPlatform() || window.innerWidth < 768;
  });

  // Referências para os containers DOM onde cada WebView deve se posicionar
  const containerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Monitorar tamanho de tela para layout mobile responsivo
  useEffect(() => {
    const handleResize = () => {
      const mobile = isAndroidPlatform() || window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && layoutMode === 'sidebar') {
        setLayoutMode('focus');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [layoutMode]);

  // Atualizar lista de slots ativos do backend / bridge
  const refreshActiveSlots = useCallback(async () => {
    try {
      const active = await gamePlatformService.getActiveSlots();
      setActiveSlots(active);
    } catch (e) {
      console.warn('Erro ao buscar slots ativos:', e);
    }
  }, []);

  useEffect(() => {
    refreshActiveSlots();
    const interval = setInterval(refreshActiveSlots, 2000);
    return () => clearInterval(interval);
  }, [refreshActiveSlots]);

  // Carregar status do modo econômico do backend
  useEffect(() => {
    gamePlatformService.getEcoMode()
      .then((enabled) => {
        setFpsTier(enabled ? '30' : '60');
      })
      .catch((e) => console.warn('Erro ao obter status eco_mode:', e));
  }, []);

  const handleSetFpsTier = async (tier: '60' | '30' | '10') => {
    setFpsTier(tier);
    try {
      await gamePlatformService.setFps(Number(tier));
    } catch (e) {
      console.error('Erro ao definir taxa de quadros (FPS):', e);
    }
  };

  const handleToggleGlobalUltra = async () => {
    const nextState = !isPokeIdleUltra;
    setIsPokeIdleUltra(nextState);
    try {
      await gamePlatformService.togglePokeIdleUltra(undefined, nextState);
    } catch (e) {
      console.error('Erro ao alternar Modo Ultra PokeIdle:', e);
    }
  };

  const handleToggleSlotUltra = async (slotId: string) => {
    try {
      await gamePlatformService.togglePokeIdleUltra(slotId);
    } catch (e) {
      console.error(`Erro ao alternar Ultra no slot ${slotId}:`, e);
    }
  };

  // Função para calcular e sincronizar as coordenadas de cada slot com a plataforma nativa
  const syncBounds = useCallback(() => {
    // Se o modal de configurações estiver aberto, ocultamos temporariamente as WebViews nativas
    // para que não fiquem sobrepostas ao modal na tela. O farm continua rodando normalmente.
    const isModalOpen = editingSlot !== null;

    const bounds: SlotBounds[] = [];

    // Para cada um dos 4 slots configurados
    for (const slot of gameSlots) {
      const el = containerRefs.current[slot.id];
      const isRunning = activeSlots.includes(slot.id);

      if (!el || !isRunning || isModalOpen) {
        bounds.push({
          slot_id: slot.id,
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          visible: false,
        });
        continue;
      }

      // Determinar visibilidade com base no modo de layout
      let isVisible = false;
      if (layoutMode === 'grid') {
        isVisible = true;
      } else if (layoutMode === 'focus') {
        isVisible = slot.id === focusedSlotId;
      } else if (layoutMode === 'sidebar') {
        isVisible = true;
      }

      const rect = el.getBoundingClientRect();
      bounds.push({
        slot_id: slot.id,
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        visible: isVisible,
      });
    }

    if (bounds.length > 0) {
      gamePlatformService.updateSlotsBounds(bounds).catch((e) => {
        console.warn('Falha ao atualizar bounds de jogos:', e);
      });
    }
  }, [gameSlots, activeSlots, layoutMode, focusedSlotId, editingSlot]);

  // Fechar modal ao pressionar a tecla Escape ou sair do modo imersivo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingSlot) {
          setEditingSlot(null);
        } else if (isImmersiveMode || !isToolbarVisible) {
          setImmersiveMode(false);
          setIsToolbarVisible(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingSlot, isImmersiveMode, isToolbarVisible, setImmersiveMode]);

  // Recalcular limites quando o modo imersivo ou visibilidade da barra mudar
  useEffect(() => {
    syncBounds();
    const t = setTimeout(syncBounds, 80);
    return () => clearTimeout(t);
  }, [isImmersiveMode, isToolbarVisible, syncBounds]);

  // Monitorar redimensionamento, foco na janela e restauração da bandeja do sistema
  useEffect(() => {
    syncBounds();
    const timer = setTimeout(syncBounds, 100);

    const handleSync = () => {
      syncBounds();
      setTimeout(syncBounds, 80);
    };

    window.addEventListener('resize', handleSync);
    window.addEventListener('focus', handleSync);

    let unlistenRestored: (() => void) | undefined;
    listen('window-restored', handleSync)
      .then((unsub) => {
        unlistenRestored = unsub;
      })
      .catch(() => {});

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleSync);
      window.removeEventListener('focus', handleSync);
      if (unlistenRestored) unlistenRestored();
    };
  }, [syncBounds]);

  // Carregar zooms configurados nos slots
  useEffect(() => {
    const zooms: Record<string, number> = {};
    for (const slot of gameSlots) {
      if (slot.zoom) {
        zooms[slot.id] = slot.zoom;
      }
    }
    setSlotZooms(zooms);
  }, [gameSlots]);

  const setZoomForSlot = async (slotId: string, zoom: number) => {
    const roundedZoom = Math.round(zoom * 100) / 100;
    setSlotZooms((prev) => ({ ...prev, [slotId]: roundedZoom }));
    try {
      await gamePlatformService.setSlotZoom(slotId, roundedZoom);
    } catch (e) {
      console.warn('Erro ao definir zoom no backend:', e);
    }
    const slot = gameSlots.find((s) => s.id === slotId);
    if (slot) {
      updateGameSlot({ ...slot, zoom: roundedZoom });
    }
  };

  const handleZoomStep = (slotId: string, direction: 'in' | 'out') => {
    const currentZoom = slotZooms[slotId] ?? gameSlots.find((s) => s.id === slotId)?.zoom ?? 1.0;
    const ZOOM_LEVELS = [0.5, 0.67, 0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0];
    let closestIndex = 5; // default 1.0
    let minDiff = Infinity;
    ZOOM_LEVELS.forEach((level, idx) => {
      const diff = Math.abs(level - currentZoom);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = idx;
      }
    });

    const nextIndex =
      direction === 'in'
        ? Math.min(ZOOM_LEVELS.length - 1, closestIndex + 1)
        : Math.max(0, closestIndex - 1);

    setZoomForSlot(slotId, ZOOM_LEVELS[nextIndex]);
  };

  const handleStartSlot = async (slotId: string, url: string) => {
    try {
      setActiveSlots((prev) => (prev.includes(slotId) ? prev : [...prev, slotId]));
      const slot = gameSlots.find((s) => s.id === slotId);
      const zoom = slotZooms[slotId] ?? slot?.zoom ?? 1.0;
      await gamePlatformService.startSlot(
        slotId,
        url.trim() || 'https://pokeidle.io/app',
        zoom
      );
      await refreshActiveSlots();
      setTimeout(syncBounds, 150);
      setTimeout(syncBounds, 400);
    } catch (e) {
      setActiveSlots((prev) => prev.filter((id) => id !== slotId));
      alert(`Erro ao iniciar jogo no slot ${slotId}: ${e}`);
    }
  };

  const handleStopSlot = async (slotId: string) => {
    try {
      setActiveSlots((prev) => prev.filter((id) => id !== slotId));
      await gamePlatformService.stopSlot(slotId);
      await refreshActiveSlots();
      setTimeout(syncBounds, 100);
    } catch (e) {
      console.error('Erro ao parar slot:', e);
    }
  };

  const handleReloadSlot = async (slotId: string) => {
    try {
      await gamePlatformService.reloadSlot(slotId);
    } catch (e) {
      console.error('Erro ao recarregar slot:', e);
    }
  };

  const handleStartAll = async () => {
    for (const slot of gameSlots) {
      if (!activeSlots.includes(slot.id)) {
        await handleStartSlot(slot.id, slot.url);
      }
    }
  };

  const handleStopAll = async () => {
    for (const slot of gameSlots) {
      if (activeSlots.includes(slot.id)) {
        await handleStopSlot(slot.id);
      }
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-neutral-950 overflow-hidden select-none relative">
      {/* Botão/Pílula Flutuante no Canto para Restaurar Menus ou Barra Superior */}
      {(!isToolbarVisible || isImmersiveMode) && (
        <div className="fixed top-2.5 right-3 z-50 flex items-center gap-1.5 bg-neutral-900/90 hover:bg-neutral-900 text-neutral-200 border border-neutral-700/80 shadow-2xl backdrop-blur-md px-2.5 py-1 rounded-full transition-all animate-in fade-in duration-200">
          {!isToolbarVisible && (
            <button
              onClick={() => {
                setIsToolbarVisible(true);
                setTimeout(syncBounds, 60);
              }}
              className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
              title="Reabrir barra de ferramentas dos jogos"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Barra Jogos</span>
            </button>
          )}

          {!isToolbarVisible && isImmersiveMode && <span className="w-px h-3 bg-neutral-700" />}

          {isImmersiveMode && (
            <button
              onClick={() => {
                toggleImmersiveMode();
                setIsToolbarVisible(true);
                setTimeout(syncBounds, 60);
              }}
              className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
              title="Restaurar menus do aplicativo (ESC)"
            >
              <Shrink className="w-3.5 h-3.5" />
              <span>Restaurar Menus</span>
            </button>
          )}
        </div>
      )}

      {/* Barra de Ferramentas Superior (Estilo IdleDeck) */}
      {isToolbarVisible && (
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2 bg-neutral-900/90 border-b border-neutral-800 shrink-0 z-20">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
                Poke Idle World
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700/80 font-mono text-[10px] sm:text-[11px] shrink-0">
                {activeSlots.length}/4 ativas
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-mono text-[10px] sm:text-[11px] flex items-center gap-1 shrink-0">
                <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="hidden xs:inline">Always-Running </span>24/7
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto py-0.5 shrink-0">
            {/* Ações Globais */}
            {activeSlots.length < gameSlots.length && (
              <button
                onClick={handleStartAll}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer shadow-sm shadow-emerald-600/30 shrink-0"
                title="Iniciar todas as contas simultaneamente"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Iniciar{isMobile ? '' : ' Todas'}</span>
              </button>
            )}

            {activeSlots.length > 0 && (
              <button
                onClick={handleStopAll}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-red-950/80 hover:text-red-300 text-neutral-400 text-xs font-medium border border-neutral-700 transition cursor-pointer shrink-0"
                title="Parar todas as contas"
              >
                <Square className="w-3 h-3" />
                <span>Parar{isMobile ? '' : ' Todas'}</span>
              </button>
            )}

            {/* Seletor Multi-Nível de FPS e Modo Econômico */}
            <div className="flex bg-neutral-800/90 rounded-lg p-0.5 border border-neutral-700/80 text-[11px] shrink-0">
              <button
                onClick={() => handleSetFpsTier('60')}
                className={`px-1.5 sm:px-2 py-0.5 rounded font-semibold transition cursor-pointer ${
                  fpsTier === '60'
                    ? 'bg-neutral-700 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
                title="60 FPS: Taxa cheia de quadros e máxima fluidez"
              >
                {isMobile ? '60' : '60 FPS'}
              </button>
              <button
                onClick={() => handleSetFpsTier('30')}
                className={`px-1.5 sm:px-2 py-0.5 rounded font-semibold transition cursor-pointer ${
                  fpsTier === '30'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/80 shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
                title="30 FPS: Modo Econômico (50% menos CPU/GPU)"
              >
                🍃 {isMobile ? '30' : '30 FPS'}
              </button>
              <button
                onClick={() => handleSetFpsTier('10')}
                className={`px-1.5 sm:px-2 py-0.5 rounded font-semibold transition cursor-pointer ${
                  fpsTier === '10'
                    ? 'bg-amber-950 text-amber-300 border border-amber-600/80 shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
                title="10 FPS: Modo Super Economia (85% menos CPU/GPU mantendo caça 100%)"
              >
                🔋 {isMobile ? '10' : '10 FPS'}
              </button>
              <button
                onClick={handleToggleGlobalUltra}
                className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded font-semibold transition cursor-pointer ${
                  isPokeIdleUltra
                    ? 'bg-purple-950 text-purple-200 border border-purple-600/80 shadow-xs'
                    : 'text-neutral-400 hover:text-purple-300'
                }`}
                title="Alternar Modo Ultra Economia Oficial PokeIdle (Card de estatísticas, desliga Canvas)"
              >
                <BarChart3 className="w-3 h-3 text-purple-400" />
                <span className="hidden sm:inline">Ultra PokeIdle</span>
              </button>
            </div>

            {/* Seletores de Layout (Responsivo Mobile vs Desktop) */}
            <div className="flex bg-neutral-800 rounded-lg p-0.5 border border-neutral-700/80 shrink-0">
              <button
                onClick={() => setLayoutMode('grid')}
                className={`p-1 sm:p-1.5 rounded-md transition cursor-pointer flex items-center gap-1 ${
                  layoutMode === 'grid' ? 'bg-neutral-700 text-white font-semibold' : 'text-neutral-400 hover:text-neutral-200'
                }`}
                title="Grade 2x2 (Ver as 4 contas simultâneas)"
              >
                <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {isMobile && <span className="text-[10px]">4x</span>}
              </button>
              <button
                onClick={() => setLayoutMode('focus')}
                className={`p-1 sm:p-1.5 rounded-md transition cursor-pointer flex items-center gap-1 ${
                  layoutMode === 'focus' ? 'bg-neutral-700 text-white font-semibold' : 'text-neutral-400 hover:text-neutral-200'
                }`}
                title="Modo Foco (1 Conta em destaque total)"
              >
                <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {isMobile && <span className="text-[10px]">1x</span>}
              </button>
              {!isMobile && (
                <button
                  onClick={() => setLayoutMode('sidebar')}
                  className={`p-1.5 rounded-md transition cursor-pointer ${
                    layoutMode === 'sidebar' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                  title="Principal + Miniaturas Laterais"
                >
                  <Columns className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Toggle Modo Tela Cheia / Ocultar Menus */}
            <button
              onClick={toggleImmersiveMode}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                isImmersiveMode
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/80 hover:bg-neutral-700'
              }`}
              title={isImmersiveMode ? 'Restaurar menus da aplicação' : 'Ocultar menus (Tela Cheia)'}
            >
              {isImmersiveMode ? <Shrink className="w-3.5 h-3.5" /> : <Expand className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isImmersiveMode ? 'Restaurar Menus' : 'Tela Cheia'}</span>
            </button>

            {/* Minimizar Barra Superior */}
            <button
              onClick={() => {
                setIsToolbarVisible(false);
                setTimeout(syncBounds, 60);
              }}
              className="p-1 sm:p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer shrink-0"
              title="Recolher barra superior dos jogos (Modo 100% Tela Cheia)"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Se estiver no Modo Foco, exibir abas superiores para alternância rápida de conta */}
      {layoutMode === 'focus' && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 border-b border-neutral-800 shrink-0 overflow-x-auto no-scrollbar">
          {gameSlots.map((slot, idx) => {
            const isRunning = activeSlots.includes(slot.id);
            const isFocused = focusedSlotId === slot.id;
            return (
              <button
                key={slot.id}
                onClick={() => setFocusedSlotId(slot.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                  isFocused
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'bg-neutral-800/80 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-600'}`}
                />
                <span className="truncate max-w-[90px] sm:max-w-none">{slot.label || `Conta ${idx + 1}`}</span>
                <span className="text-[10px] opacity-60 font-mono">#{idx + 1}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Área Central: Layout dos Slots */}
      <div className="flex-1 min-h-0 w-full relative p-2 overflow-hidden">
        {layoutMode === 'grid' && (
          <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full w-full">
            {gameSlots.map((slot) => renderSlotCard(slot))}
          </div>
        )}

        {layoutMode === 'focus' && (
          <div className="h-full w-full">
            {gameSlots
              .filter((slot) => slot.id === focusedSlotId)
              .map((slot) => renderSlotCard(slot, true))}
          </div>
        )}

        {layoutMode === 'sidebar' && (
          <div className="flex gap-2 h-full w-full">
            {/* Slot Principal em Destaque (72% da largura) */}
            <div className="flex-1 h-full min-w-0">
              {gameSlots
                .filter((slot) => slot.id === focusedSlotId)
                .map((slot) => renderSlotCard(slot, true))}
            </div>

            {/* Coluna Lateral com as outras contas (28% da largura) */}
            <div className="w-80 flex flex-col gap-2 h-full overflow-hidden shrink-0">
              {gameSlots
                .filter((slot) => slot.id !== focusedSlotId)
                .map((slot) => renderSlotCard(slot, false, true))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Configuração de Slot */}
      {editingSlot && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingSlot(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-text"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 w-full max-w-md shadow-2xl space-y-4 relative"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-400" />
                Configurar {editingSlot.label || editingSlot.id}
              </h3>
              <button
                onClick={() => setEditingSlot(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                title="Fechar (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">
                  Nome da Conta / Identificador
                </label>
                <input
                  type="text"
                  value={editingSlot.label}
                  onChange={(e) => setEditingSlot({ ...editingSlot, label: e.target.value })}
                  placeholder="Ex: Naruto, Farm Principal"
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">
                  URL do Jogo Idle
                </label>
                <input
                  type="text"
                  value={editingSlot.url}
                  onChange={(e) => setEditingSlot({ ...editingSlot, url: e.target.value })}
                  placeholder="https://pokeidle.io/app"
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="enable_hunt_extension"
                  checked={editingSlot.enable_hunt_extension ?? true}
                  onChange={(e) =>
                    setEditingSlot({ ...editingSlot, enable_hunt_extension: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="enable_hunt_extension" className="text-xs text-neutral-300 cursor-pointer select-none">
                  Ativar extensão <span className="font-semibold text-emerald-400">/hunt for PokeIdle</span> (rotas de XP/ouro)
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => setEditingSlot(null)}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    await updateGameSlot(editingSlot);
                    setEditingSlot(null);
                  }}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Renderiza o card individual de um slot com seu header e a div onde a WebView se ancora
  function renderSlotCard(slot: GameSlotConfig, isFocusedMode = false, _isSidebarCard = false) {
    const isRunning = activeSlots.includes(slot.id);

    return (
      <div
        key={slot.id}
        className={`flex flex-col rounded-xl overflow-hidden border transition-all h-full w-full bg-neutral-900/60 ${
          focusedSlotId === slot.id
            ? 'border-indigo-500/80 shadow-md shadow-indigo-500/10'
            : 'border-neutral-800'
        }`}
      >
        {/* Cabeçalho do Card (Estilo IdleDeck) */}
        <div className="flex items-center justify-between gap-1.5 px-2.5 sm:px-3 py-1.5 bg-neutral-900 border-b border-neutral-800/80 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-600'
              }`}
            />
            <span className="text-xs font-semibold text-neutral-200 truncate">
              {slot.label || slot.id}
            </span>

            {isRunning && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-mono shrink-0 transition-colors ${
                  fpsTier === '10'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800/50'
                    : fpsTier === '30'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                    : 'bg-neutral-800 text-neutral-400 border border-neutral-700/50'
                }`}
              >
                {fpsTier === '10' ? '🔋 10' : fpsTier === '30' ? '🍃 30' : '⚡ 60'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 overflow-x-auto no-scrollbar">
            {isRunning && (
              <button
                onClick={() => handleToggleSlotUltra(slot.id)}
                className="p-1 rounded text-neutral-400 hover:text-purple-300 hover:bg-neutral-800 transition cursor-pointer"
                title="Alternar Modo Ultra Economia Oficial PokeIdle (Card de Estatísticas)"
              >
                <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
              </button>
            )}

            {/* Controle de Zoom estilo Navegador */}
            <div className="flex items-center bg-neutral-800/90 rounded border border-neutral-700/60 text-[10px] text-neutral-300 overflow-hidden shrink-0">
              <button
                onClick={() => handleZoomStep(slot.id, 'out')}
                className="px-1.5 py-0.5 hover:bg-neutral-700 hover:text-white transition cursor-pointer font-bold select-none leading-none"
                title="Diminuir Zoom (-)"
              >
                -
              </button>
              <select
                value={Math.round((slotZooms[slot.id] ?? slot.zoom ?? 1.0) * 100)}
                onChange={(e) => setZoomForSlot(slot.id, Number(e.target.value) / 100)}
                className="bg-transparent text-[10px] font-mono font-medium text-neutral-200 px-1 py-0.5 outline-hidden cursor-pointer hover:text-indigo-400 text-center"
                title="Nível de Zoom da Aba"
              >
                <option value={50} className="bg-neutral-900 text-white">50%</option>
                <option value={67} className="bg-neutral-900 text-white">67%</option>
                <option value={75} className="bg-neutral-900 text-white">75%</option>
                <option value={80} className="bg-neutral-900 text-white">80%</option>
                <option value={90} className="bg-neutral-900 text-white">90%</option>
                <option value={100} className="bg-neutral-900 text-white">100%</option>
                <option value={110} className="bg-neutral-900 text-white">110%</option>
                <option value={125} className="bg-neutral-900 text-white">125%</option>
                <option value={150} className="bg-neutral-900 text-white">150%</option>
                <option value={175} className="bg-neutral-900 text-white">175%</option>
                <option value={200} className="bg-neutral-900 text-white">200%</option>
              </select>
              <button
                onClick={() => handleZoomStep(slot.id, 'in')}
                className="px-1.5 py-0.5 hover:bg-neutral-700 hover:text-white transition cursor-pointer font-bold select-none leading-none"
                title="Aumentar Zoom (+)"
              >
                +
              </button>
            </div>

            {isRunning ? (
              <>
                <button
                  onClick={() => handleReloadSlot(slot.id)}
                  className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                  title="Recarregar página"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>

                {!isFocusedMode && (
                  <button
                    onClick={() => {
                      setFocusedSlotId(slot.id);
                      setLayoutMode('focus');
                    }}
                    className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                    title="Maximizar / Foco nesta conta"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => handleStopSlot(slot.id)}
                  className="p-1 rounded text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition cursor-pointer"
                  title="Parar jogo"
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => handleStartSlot(slot.id, slot.url)}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition cursor-pointer shadow-xs"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Iniciar</span>
              </button>
            )}

            <button
              onClick={() => setEditingSlot(slot)}
              className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
              title="Configurar slot"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Viewport onde a Child Webview se posiciona nativamente */}
        <div
          ref={(el) => {
            containerRefs.current[slot.id] = el;
          }}
          className="flex-1 w-full h-full relative bg-black flex items-center justify-center overflow-hidden"
        >
          {!isRunning && (
            <div className="text-center p-4">
              <Flame className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-neutral-300">
                {slot.label || slot.id} não iniciada
              </p>
              <p className="text-[11px] text-neutral-500 mt-1 max-w-xs">
                Perfil de cookies e conta Google isolada pronta para farm 24/7.
              </p>
              <button
                onClick={() => handleStartSlot(slot.id, slot.url)}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer shadow-md shadow-emerald-600/20"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Iniciar Conta</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
};
