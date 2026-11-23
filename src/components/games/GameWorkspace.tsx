import React, { useEffect, useRef, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
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
  Moon,
  Zap,
  Battery,
} from 'lucide-react';

const IdleDurationDisplay: React.FC<{ lastActivityTimeRef: React.MutableRefObject<number> }> = React.memo(
  ({ lastActivityTimeRef }) => {
    const [seconds, setSeconds] = useState<number>(() => {
      return Math.floor((Date.now() - (lastActivityTimeRef.current || Date.now())) / 1000);
    });

    useEffect(() => {
      const update = async () => {
        const appIdleSec = Math.floor((Date.now() - (lastActivityTimeRef.current || Date.now())) / 1000);
        let systemIdleSec = 0;
        try {
          systemIdleSec = await gamePlatformService.getSystemIdleSeconds();
        } catch (_) {}
        setSeconds(Math.min(appIdleSec, systemIdleSec));
      };
      update();
      const id = setInterval(update, 1000);
      return () => clearInterval(id);
    }, [lastActivityTimeRef]);

    return (
      <span className="font-mono font-bold text-amber-300">
        {Math.floor(seconds / 60)}m {seconds % 60}s
      </span>
    );
  }
);

export const GameWorkspace: React.FC = () => {
  const { config, updateGameSlot, isImmersiveMode, setImmersiveMode, gameStates, slotSnapshots } = useAppStore();
  const gameSlots = config.game_slots || [];

  const [activeSlots, setActiveSlots] = useState<string[]>([]);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'focus' | 'sidebar'>(() => {
    try {
      const saved = localStorage.getItem('__idlestream_games_layout__');
      if (saved === 'grid' || saved === 'focus' || saved === 'sidebar') return saved;
    } catch (_) {}
    const mobile = typeof window !== 'undefined' && (isAndroidPlatform() || window.innerWidth < 768);
    return mobile ? 'focus' : 'grid';
  });
  const [focusedSlotId, setFocusedSlotId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('__idlestream_games_focused_slot__');
      if (saved) return saved;
    } catch (_) {}
    return 'slot-1';
  });
  const [currentDynamicFps, setCurrentDynamicFps] = useState<number>(60);
  const currentDynamicFpsRef = useRef<number>(60);
  const [isPokeIdleUltra, setIsPokeIdleUltra] = useState<boolean>(() => {
    try {
      return localStorage.getItem('__idlestream_pokeidle_ultra__') === 'true';
    } catch (_) {}
    return false;
  });
  const [editingSlot, setEditingSlot] = useState<GameSlotConfig | null>(null);
  const [slotZooms, setSlotZooms] = useState<Record<string, number>>({});
  const [isToolbarVisible, setIsToolbarVisible] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return isAndroidPlatform() || window.innerWidth < 768;
  });

  // Modo de Economia por Inatividade (Auto-Sleep após 5 min)
  const [inactivityMinutes, setInactivityMinutes] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('__idlestream_inactivity_minutes__');
      if (saved !== null) return Number(saved);
    } catch (_) {}
    return 5; // Padrão: 5 minutos
  });
  const [isIdleDimmed, setIsIdleDimmed] = useState<boolean>(false);
  const [isWindowFocused, setIsWindowFocused] = useState<boolean>(() => {
    if (typeof document === 'undefined') return true;
    return document.hasFocus();
  });
  const [isWindowMinimized, setIsWindowMinimized] = useState<boolean>(false);
  const lastActivityTimeRef = useRef<number>(Date.now());
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null);

  const handleInactivityChange = (mins: number) => {
    setInactivityMinutes(mins);
    try {
      localStorage.setItem('__idlestream_inactivity_minutes__', String(mins));
    } catch (_) {}
    if (mins === 0 && isIdleDimmed) {
      setIsIdleDimmed(false);
    }
  };

  const wakeUpFromIdle = useCallback(() => {
    lastActivityTimeRef.current = Date.now();
    setIsWindowFocused(true);
    setIsWindowMinimized(false);
    if (isIdleDimmed) {
      setIsIdleDimmed(false);
    }
    if (currentDynamicFpsRef.current !== 60) {
      currentDynamicFpsRef.current = 60;
      setCurrentDynamicFps(60);
      gamePlatformService.setFps(60).catch(() => {});
    }
  }, [isIdleDimmed]);

  // Monitora foco da janela, minimização e restauração da bandeja/tarefas
  useEffect(() => {
    const handleFocus = () => {
      setIsWindowFocused(true);
      setIsWindowMinimized(false);
      lastActivityTimeRef.current = Date.now();
      if (currentDynamicFpsRef.current !== 60 && !isIdleDimmed) {
        currentDynamicFpsRef.current = 60;
        setCurrentDynamicFps(60);
        gamePlatformService.setFps(60).catch(() => {});
      }
    };

    const handleBlur = () => {
      setIsWindowFocused(false);
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    let unlistenFocus: (() => void) | undefined;
    let unlistenMin: (() => void) | undefined;
    let unlistenRestored: (() => void) | undefined;

    listen<boolean>('window-focus-changed', (e) => {
      if (e.payload) {
        handleFocus();
      } else {
        handleBlur();
      }
    }).then((u) => { unlistenFocus = u; }).catch(() => {});

    listen('window-minimized', () => {
      setIsWindowMinimized(true);
      setIsWindowFocused(false);
    }).then((u) => { unlistenMin = u; }).catch(() => {});

    listen('window-restored', () => {
      handleFocus();
    }).then((u) => { unlistenRestored = u; }).catch(() => {});

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      if (unlistenFocus) unlistenFocus();
      if (unlistenMin) unlistenMin();
      if (unlistenRestored) unlistenRestored();
    };
  }, [isIdleDimmed]);

  // Escutar eventos de atividade do usuário na janela e nas WebViews filhas (via bridge e window.__onUserActivity)
  useEffect(() => {
    const handleUserActivity = () => {
      lastActivityTimeRef.current = Date.now();
      setIsWindowFocused(true);
      if (currentDynamicFpsRef.current !== 60 && !isIdleDimmed && !isWindowMinimized) {
        currentDynamicFpsRef.current = 60;
        setCurrentDynamicFps(60);
        gamePlatformService.setFps(60).catch(() => {});
      }
      if (isIdleDimmed) {
        setIsIdleDimmed(false);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Se a tela de Sleep (isIdleDimmed) estiver ativa, NÃO acordar apenas passando o mouse por cima
      if (isIdleDimmed) return;

      if (!lastMousePosRef.current) {
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
        return;
      }

      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      const distance = Math.hypot(dx, dy);

      // Filtro anti-jitter: ignora micro-vibrações de sensores ópticos (<= 20 pixels)
      if (distance < 20) return;

      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      handleUserActivity();
    };

    (window as any).__onUserActivity = handleUserActivity;

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity, { passive: true });
    window.addEventListener('touchstart', handleUserActivity, { passive: true });
    window.addEventListener('wheel', handleUserActivity, { passive: true });

    return () => {
      delete (window as any).__onUserActivity;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('wheel', handleUserActivity);
    };
  }, [isIdleDimmed, isWindowMinimized]);

  // Loop de monitoramento inteligente de performance e economia:
  // - 60 FPS ativo: estritamente em primeiro plano, focado e com interação recente (<30s)
  // - 10 FPS eco: se o usuário estiver usando outro app/jogo no PC (unfocused) ou inativo por >30s no app
  // - 1 FPS sleep: se a janela estiver minimizada, oculta, ou inativa por >inactivityMinutes
  useEffect(() => {
    const interval = setInterval(async () => {
      const thresholdSeconds = inactivityMinutes * 60;
      const appIdleSec = Math.floor((Date.now() - lastActivityTimeRef.current) / 1000);

      // 1. Minimizada: máxima economia imediata (1 FPS + corte total de GPU/RAM)
      if (isWindowMinimized) {
        if (currentDynamicFpsRef.current !== 1) {
          currentDynamicFpsRef.current = 1;
          setCurrentDynamicFps(1);
          gamePlatformService.setFps(1).catch(() => {});
          gamePlatformService.trimMemory().catch(() => {});
        }
        return;
      }

      // Consulta segundos de inatividade do sistema operacional (Windows GetLastInputInfo)
      let systemIdleSec = 0;
      try {
        systemIdleSec = await gamePlatformService.getSystemIdleSeconds();
      } catch (_) {}

      // Inatividade efetiva:
      // Se a janela estiver focada em primeiro plano, conta o tempo de inatividade no app (appIdleSec).
      // Se a janela estiver em segundo plano (unfocused):
      // - Se o usuário estiver ausente do PC (systemIdleSec >= thresholdSeconds), entra em 1 FPS sleep.
      // - Se o usuário estiver mexendo em outro app no PC (systemIdleSec < thresholdSeconds), mantém 10 FPS eco.
      const effectiveIdleSec = isWindowFocused
        ? appIdleSec
        : (systemIdleSec > 0 ? systemIdleSec : appIdleSec);

      // 2. Tempo de inatividade configurado atingido (ex: 1 min de sleep):
      // APLICA SLEEP MODE REAL (1 FPS + corte total de GPU/RAM) TANTO EM PRIMEIRO QUANTO EM SEGUNDO PLANO!
      if (thresholdSeconds > 0 && effectiveIdleSec >= thresholdSeconds) {
        if (currentDynamicFpsRef.current !== 1) {
          currentDynamicFpsRef.current = 1;
          setCurrentDynamicFps(1);
          gamePlatformService.setFps(1).catch(() => {});
          gamePlatformService.trimMemory().catch(() => {});
        }
        if (!isIdleDimmed && activeSlots.length > 0 && isWindowFocused) {
          setIsIdleDimmed(true);
        }
        return;
      }

      // 3. Janela em segundo plano (usuário mexendo ativamente em outro app/jogo no PC, mas effectiveIdleSec < thresholdSeconds):
      // Reduz para 10 FPS (alivia GPU em 85% e não disputa recursos do PC com outros jogos)
      if (!isWindowFocused) {
        if (currentDynamicFpsRef.current !== 10) {
          currentDynamicFpsRef.current = 10;
          setCurrentDynamicFps(10);
          gamePlatformService.setFps(10).catch(() => {});
        }
        if (isIdleDimmed) {
          setIsIdleDimmed(false);
        }
        return;
      }

      // 4. Janela em primeiro plano e focada: verifica tempo de inatividade no IdleStream
      if (appIdleSec >= 30) {
        // Inatividade após 30s: reduz performance para poupar GPU (10 FPS)
        if (currentDynamicFpsRef.current !== 10) {
          currentDynamicFpsRef.current = 10;
          setCurrentDynamicFps(10);
          gamePlatformService.setFps(10).catch(() => {});
        }
        if (isIdleDimmed) {
          setIsIdleDimmed(false);
        }
      } else {
        // Usuário em primeiro plano interagindo ativamente (<30s): máxima fluidez (60 FPS VSync)
        if (currentDynamicFpsRef.current !== 60) {
          currentDynamicFpsRef.current = 60;
          setCurrentDynamicFps(60);
          gamePlatformService.setFps(60).catch(() => {});
        }
        if (isIdleDimmed) {
          setIsIdleDimmed(false);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [inactivityMinutes, isIdleDimmed, activeSlots.length, isWindowFocused, isWindowMinimized]);

  // Referências para os containers DOM onde cada WebView deve se posicionar
  const containerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const workspaceRef = useRef<HTMLDivElement | null>(null);

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
  const { statuses } = useAppStore();

  const persistActiveGameSlots = useCallback(
    (slots: string[]) => {
      invoke('set_runtime_ui_state', {
        lastActiveTab: null,
        desiredActiveGameSlots: slots,
      }).catch(() => {});
      const hasActiveStream = Object.values(statuses).some(
        (s) => s.status === 'connected' || s.status === 'standby' || s.status === 'connecting'
      );
      gamePlatformService.syncFarmingActive(slots.length > 0 || hasActiveStream);
    },
    [statuses]
  );

  const refreshActiveSlots = useCallback(async () => {
    try {
      const active = await gamePlatformService.getActiveSlots();
      setActiveSlots(active);
      return active;
    } catch (e) {
      console.warn('Erro ao buscar slots ativos:', e);
      return null;
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('__idlestream_games_layout__', layoutMode);
    } catch (_) {}
  }, [layoutMode]);

  useEffect(() => {
    try {
      localStorage.setItem('__idlestream_games_focused_slot__', focusedSlotId);
    } catch (_) {}
  }, [focusedSlotId]);

  useEffect(() => {
    refreshActiveSlots();
    const interval = setInterval(refreshActiveSlots, 2000);
    return () => clearInterval(interval);
  }, [refreshActiveSlots]);

  // Inicialização padrão com máxima fluidez (60 FPS)
  useEffect(() => {
    gamePlatformService.setFps(60).catch(() => {});
  }, []);

  const handleToggleGlobalUltra = async () => {
    const nextState = !isPokeIdleUltra;
    setIsPokeIdleUltra(nextState);
    try {
      localStorage.setItem('__idlestream_pokeidle_ultra__', String(nextState));
    } catch (_) {}
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
    // Se o modal de configurações estiver aberto, o modo sleep estiver ativo ou a janela estiver minimizada,
    // ocultamos temporariamente as WebViews nativas (caindo para 1 FPS e liberando a GPU).
    const isModalOpen = editingSlot !== null;
    const shouldHideWebviews = isModalOpen || isIdleDimmed || isWindowMinimized;

    const bounds: SlotBounds[] = [];
    const wsEl = workspaceRef.current;
    const wsRect = wsEl ? wsEl.getBoundingClientRect() : null;

    // Para cada um dos 4 slots configurados
    for (const slot of gameSlots) {
      const el = containerRefs.current[slot.id];
      const isRunning = activeSlots.includes(slot.id);

      if (!el || !isRunning || shouldHideWebviews) {
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
      let clampedX = rect.x;
      let clampedY = rect.y;
      let clampedW = rect.width;
      let clampedH = rect.height;

      if (wsRect) {
        // Assegura que as coordenadas nunca ultrapassem o container pai (evita invadir BottomNav e StatusBar)
        const left = Math.max(wsRect.left, rect.left);
        const top = Math.max(wsRect.top, rect.top);
        const right = Math.min(wsRect.right, rect.right);
        const bottom = Math.min(wsRect.bottom, rect.bottom);

        clampedX = left;
        clampedY = top;
        clampedW = Math.max(0, right - left);
        clampedH = Math.max(0, bottom - top);

        if (clampedW < 10 || clampedH < 10) {
          isVisible = false;
        }
      }

      bounds.push({
        slot_id: slot.id,
        x: Math.round(clampedX),
        y: Math.round(clampedY),
        width: Math.round(clampedW),
        height: Math.round(clampedH),
        visible: isVisible,
      });
    }

    if (bounds.length > 0) {
      gamePlatformService.updateSlotsBounds(bounds).catch((e) => {
        console.warn('Falha ao atualizar bounds de jogos:', e);
      });
    }
  }, [gameSlots, activeSlots, layoutMode, focusedSlotId, editingSlot, isIdleDimmed, isWindowMinimized]);

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

  // Recalcular limites quando o modo de inatividade, minimização, modo imersivo ou visibilidade da barra mudar
  useEffect(() => {
    syncBounds();
    const t = setTimeout(syncBounds, 80);
    return () => clearTimeout(t);
  }, [isIdleDimmed, isWindowMinimized, isImmersiveMode, isToolbarVisible, syncBounds]);

  // Monitorar redimensionamento, foco na janela e restauração da bandeja do sistema
  useEffect(() => {
    syncBounds();
    const timer = setTimeout(syncBounds, 100);

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const handleSync = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        refreshActiveSlots().catch(() => {});
        syncBounds();
      }, 60);
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
      if (debounceTimer) clearTimeout(debounceTimer);
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

  const handleSelectLayoutMode = (mode: 'grid' | 'focus' | 'sidebar') => {
    setLayoutMode(mode);
  };

  const handleZoomStep = (slotId: string, direction: 'in' | 'out') => {
    const currentZoom = slotZooms[slotId] ?? gameSlots.find((s) => s.id === slotId)?.zoom ?? 1.0;
    const ZOOM_LEVELS = [0.5, 0.67, 0.75, 0.8, 0.85, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0];
    let closestIndex = 6; // default 1.0
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
      const nextSlots = activeSlots.includes(slotId) ? activeSlots : [...activeSlots, slotId];
      setActiveSlots(nextSlots);
      const slot = gameSlots.find((s) => s.id === slotId);
      const zoom = slotZooms[slotId] ?? slot?.zoom ?? 1.0;
      await gamePlatformService.startSlot(
        slotId,
        url.trim() || 'https://pokeidle.io/app',
        zoom
      );
      const refreshed = await refreshActiveSlots();
      persistActiveGameSlots(refreshed ?? nextSlots);
      setTimeout(syncBounds, 150);
      setTimeout(syncBounds, 400);
    } catch (e) {
      const fallback = activeSlots.filter((id) => id !== slotId);
      setActiveSlots(fallback);
      persistActiveGameSlots(fallback);
      alert(`Erro ao iniciar jogo no slot ${slotId}: ${e}`);
    }
  };

  const handleStopSlot = async (slotId: string) => {
    try {
      const nextSlots = activeSlots.filter((id) => id !== slotId);
      setActiveSlots(nextSlots);
      await gamePlatformService.stopSlot(slotId);
      const refreshed = await refreshActiveSlots();
      persistActiveGameSlots(refreshed ?? nextSlots);
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
        <div className="fixed top-[max(0.75rem,calc(env(safe-area-inset-top,0px)+0.5rem))] right-3 z-50 flex items-center bg-neutral-900/95 hover:bg-neutral-900 text-neutral-200 border border-neutral-700/80 shadow-2xl backdrop-blur-md px-3 py-1.5 rounded-full transition-all animate-in fade-in duration-200">
          {isImmersiveMode ? (
            <button
              onClick={() => {
                setImmersiveMode(false);
                setIsToolbarVisible(true);
                setTimeout(syncBounds, 60);
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
              title="Restaurar menus do aplicativo (ESC)"
            >
              <Shrink className="w-3.5 h-3.5" />
              <span>Restaurar Menus</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setIsToolbarVisible(true);
                setTimeout(syncBounds, 60);
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
              title="Reabrir barra de ferramentas dos jogos"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Barra Jogos</span>
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

            {/* Indicador de Performance Dinâmica Inteligente (60 FPS Ativo / 10 FPS Inativo >30s) */}
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-semibold shrink-0 transition-colors ${
                currentDynamicFps === 60
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/70'
                  : 'bg-amber-950/70 text-amber-300 border-amber-800/70'
              }`}
              title={
                currentDynamicFps === 60
                  ? 'Performance Dinâmica: 60 FPS (Ativo). Ao ficar 30s sem mexer, reduz para 10 FPS.'
                  : 'Performance Dinâmica: 10 FPS (Inativo há >30s). Mexa o mouse ou toque para voltar a 60 FPS.'
              }
            >
              {currentDynamicFps === 60 ? (
                <>
                  <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>60 FPS <span className="font-normal text-emerald-500/80 hidden sm:inline">(Ativo)</span></span>
                </>
              ) : (
                <>
                  <Battery className="w-3.5 h-3.5 text-amber-400" />
                  <span>10 FPS <span className="font-normal text-amber-500/80 hidden sm:inline">(Eco)</span></span>
                </>
              )}
            </div>

            {/* Alternador do Modo Ultra PokeIdle */}
            <button
              onClick={handleToggleGlobalUltra}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg font-semibold transition cursor-pointer text-[11px] border shrink-0 ${
                isPokeIdleUltra
                  ? 'bg-purple-950 text-purple-200 border-purple-600/80 shadow-xs'
                  : 'bg-neutral-800/90 text-neutral-400 border-neutral-700/80 hover:text-purple-300'
              }`}
              title="Alternar Modo Ultra Economia Oficial PokeIdle (Card de estatísticas, desliga Canvas)"
            >
              <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Ultra PokeIdle</span>
            </button>

            {/* Seletor de Inatividade / Auto-Sleep (Economia de GPU a 1 FPS) */}
            <div className="flex items-center bg-neutral-800/90 rounded-lg p-0.5 border border-neutral-700/80 text-[11px] shrink-0">
              <div className="flex items-center gap-1 px-1.5 py-0.5 text-neutral-300">
                <Moon className="w-3 h-3 text-indigo-400 shrink-0" />
                <span className="hidden sm:inline text-neutral-400">Sleep:</span>
              </div>
              <select
                value={inactivityMinutes}
                onChange={(e) => handleInactivityChange(Number(e.target.value))}
                className="bg-transparent text-[11px] font-medium text-neutral-200 px-1 py-0.5 outline-hidden cursor-pointer hover:text-indigo-400"
                title="Tempo de inatividade para ativar o modo invisível de economia de GPU (1 FPS)"
              >
                <option value={1} className="bg-neutral-900 text-white">1 min</option>
                <option value={5} className="bg-neutral-900 text-white">5 min (Padrão)</option>
                <option value={10} className="bg-neutral-900 text-white">10 min</option>
                <option value={15} className="bg-neutral-900 text-white">15 min</option>
                <option value={0} className="bg-neutral-900 text-white">Desativado</option>
              </select>
            </div>

            {/* Seletores de Layout (Responsivo Mobile vs Desktop) */}
            <div className="flex bg-neutral-800 rounded-lg p-0.5 border border-neutral-700/80 shrink-0">
              <button
                onClick={() => handleSelectLayoutMode('grid')}
                className={`p-1 sm:p-1.5 rounded-md transition cursor-pointer flex items-center gap-1 ${
                  layoutMode === 'grid' ? 'bg-neutral-700 text-white font-semibold' : 'text-neutral-400 hover:text-neutral-200'
                }`}
                title="Grade 2x2 (Ver as 4 contas simultâneas)"
              >
                <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {isMobile && <span className="text-[10px]">4x</span>}
              </button>
              <button
                onClick={() => handleSelectLayoutMode('focus')}
                className={`p-1 sm:p-1.5 rounded-md transition cursor-pointer flex items-center gap-1 ${
                  layoutMode === 'focus' ? 'bg-neutral-700 text-white font-semibold' : 'text-neutral-400 hover:text-neutral-200'
                }`}
                title="Modo 1 Tela (Conta em destaque)"
              >
                <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {isMobile && <span className="text-[10px]">1x</span>}
              </button>
              {!isMobile && (
                <button
                  onClick={() => handleSelectLayoutMode('sidebar')}
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
              onClick={() => {
                setImmersiveMode(true);
                setIsToolbarVisible(false);
                setTimeout(syncBounds, 60);
              }}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/80 hover:bg-neutral-700 transition cursor-pointer shrink-0"
              title="Tela cheia (ocultar menus e barra)"
            >
              <Expand className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tela Cheia</span>
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
            const slotState = gameStates?.[slot.id];
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
                {slotState?.level ? (
                  <span className="text-[10px] font-mono px-1 rounded bg-black/40 text-indigo-200">
                    Lv.{slotState.level}
                  </span>
                ) : (
                  <span className="text-[10px] opacity-60 font-mono">#{idx + 1}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Área Central: Layout dos Slots */}
      <div
        ref={workspaceRef}
        className="flex-1 min-h-0 w-full relative p-2 overflow-hidden"
      >
        {layoutMode === 'grid' && (
          <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full w-full overflow-hidden">
            {gameSlots.map((slot) => renderSlotCard(slot))}
          </div>
        )}

        {layoutMode === 'focus' && (
          <div className="h-full w-full overflow-hidden">
            {gameSlots
              .filter((slot) => slot.id === focusedSlotId)
              .map((slot) => renderSlotCard(slot, true))}
          </div>
        )}

        {layoutMode === 'sidebar' && (
          <div className="flex gap-2 h-full w-full overflow-hidden">
            {/* Slot Principal em Destaque (72% da largura) */}
            <div className="flex-1 h-full min-w-0 overflow-hidden">
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

        {/* Overlay de Economia por Inatividade (Tela de Proteção / Sleep Mode) */}
        {isIdleDimmed && (
          <div
            onClick={wakeUpFromIdle}
            className="absolute inset-0 z-40 bg-neutral-950/92 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none cursor-pointer animate-in fade-in duration-300"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="max-w-md w-full bg-neutral-900/90 border border-neutral-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center space-y-5"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-600/20">
                  <Moon className="w-8 h-8 animate-pulse text-indigo-400" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                </span>
              </div>

              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Modo de Economia por Inatividade Ativo
                </h2>
                <p className="text-xs text-neutral-400">
                  Detectada inatividade de {inactivityMinutes} minutos. O aplicativo reduziu os jogos para 1 FPS para liberar sua GPU e poupar energia.
                </p>
              </div>

              <div className="w-full bg-neutral-950/80 border border-neutral-800/80 rounded-xl p-3 flex items-center justify-around text-xs">
                <div className="text-center">
                  <span className="text-[10px] text-neutral-500 uppercase font-semibold block">Contas Ativas</span>
                  <span className="font-bold text-emerald-400">{activeSlots.length} de {gameSlots.length}</span>
                </div>
                <div className="w-px h-6 bg-neutral-800" />
                <div className="text-center">
                  <span className="text-[10px] text-neutral-500 uppercase font-semibold block">Farming 24/7</span>
                  <span className="font-bold text-indigo-400">100% Contínuo</span>
                </div>
                <div className="w-px h-6 bg-neutral-800" />
                <div className="text-center">
                  <span className="text-[10px] text-neutral-500 uppercase font-semibold block">Tempo Inativo</span>
                  <IdleDurationDisplay lastActivityTimeRef={lastActivityTimeRef} />
                </div>
              </div>

              <button
                onClick={wakeUpFromIdle}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2"
              >
                <span>Clique ou mova o mouse para retomar</span>
              </button>
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

              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">
                  Nível de Zoom da Aba
                </label>
                <select
                  value={Math.round((editingSlot.zoom ?? 1.0) * 100)}
                  onChange={(e) => {
                    const z = Number(e.target.value) / 100;
                    setEditingSlot({ ...editingSlot, zoom: z });
                  }}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-white focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                >
                  <option value={50}>50%</option>
                  <option value={67}>67%</option>
                  <option value={75}>75%</option>
                  <option value={80}>80%</option>
                  <option value={90}>90%</option>
                  <option value={100}>100% (Padrão Nativo)</option>
                  <option value={110}>110%</option>
                  <option value={125}>125%</option>
                  <option value={150}>150%</option>
                  <option value={175}>175%</option>
                  <option value={200}>200%</option>
                </select>
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

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="game_slot_auto_start"
                  checked={editingSlot.auto_start ?? false}
                  onChange={(e) =>
                    setEditingSlot({ ...editingSlot, auto_start: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="game_slot_auto_start" className="text-xs text-neutral-300 cursor-pointer select-none">
                  Iniciar este slot automaticamente ao abrir o app
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
                    const z = editingSlot.zoom ?? 1.0;
                    await setZoomForSlot(editingSlot.id, z);
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
    const gameState = gameStates?.[slot.id];

    return (
      <div
        key={slot.id}
        className={`flex flex-col rounded-xl overflow-hidden border transition-all w-full h-full bg-neutral-900/60 ${
          focusedSlotId === slot.id
            ? 'border-indigo-500/80 shadow-md shadow-indigo-500/10'
            : 'border-neutral-800'
        }`}
      >
        {/* Cabeçalho do Card (Estilo IdleDeck) */}
        <div className="flex items-center justify-between gap-1 px-1.5 py-1 bg-neutral-900 border-b border-neutral-800/80 shrink-0 h-8 overflow-hidden">
          <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-600'
              }`}
            />
            <span
              className="text-xs font-semibold text-neutral-200 truncate select-none min-w-0"
              title={slot.label || slot.id}
            >
              {slot.label || slot.id}
            </span>
            {gameState?.level ? (
              <span className="px-1.5 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/50 text-[10px] text-indigo-300 font-mono font-medium shrink-0">
                Lv.{gameState.level}
              </span>
            ) : null}
            {gameState?.xpRatePerHour && gameState.xpRatePerHour > 0 ? (
              <span
                className="hidden sm:inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-emerald-950/70 border border-emerald-700/50 text-[10px] text-emerald-300 font-mono shrink-0"
                title="Taxa de ganho de XP por hora estimada"
              >
                +{(gameState.xpRatePerHour >= 1000 ? `${(gameState.xpRatePerHour / 1000).toFixed(1)}k` : gameState.xpRatePerHour)}/h
              </span>
            ) : null}
            {gameState?.bonusTwitchSecs && gameState.bonusTwitchSecs > 0 ? (
              <span
                className="hidden md:inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-purple-950/70 border border-purple-700/50 text-[10px] text-purple-300 font-mono shrink-0"
                title="Bônus de XP Twitch ativo no PokeIdle"
              >
                ⚡Twitch {Math.ceil(gameState.bonusTwitchSecs / 60)}m
              </span>
            ) : null}
            {gameState?.bonusKickSecs && gameState.bonusKickSecs > 0 ? (
              <span
                className="hidden md:inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-emerald-950/70 border border-emerald-700/50 text-[10px] text-emerald-300 font-mono shrink-0"
                title="Bônus de XP Kick ativo no PokeIdle"
              >
                ⚡Kick {Math.ceil(gameState.bonusKickSecs / 60)}m
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            {/* Controle de Zoom Compacto no Card */}
            <div className="flex items-center bg-neutral-800/90 rounded border border-neutral-700/60 text-[10px] text-neutral-300 overflow-hidden shrink-0 h-5">
              <button
                onClick={() => handleZoomStep(slot.id, 'out')}
                className="w-3.5 h-full flex items-center justify-center hover:bg-neutral-700 hover:text-white transition cursor-pointer font-bold select-none text-[10px] leading-none"
                title="Diminuir Zoom (-)"
              >
                -
              </button>
              <select
                value={Math.round((slotZooms[slot.id] ?? slot.zoom ?? 1.0) * 100)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) / 100;
                  setZoomForSlot(slot.id, val);
                }}
                className="bg-transparent text-[10px] text-neutral-200 px-0.5 h-full focus:outline-none cursor-pointer appearance-none text-center font-medium w-[28px] sm:w-[32px]"
                title="Ajustar Nível de Zoom"
              >
                <option value={50} className="bg-neutral-900 text-white">50%</option>
                <option value={67} className="bg-neutral-900 text-white">67%</option>
                <option value={75} className="bg-neutral-900 text-white">75%</option>
                <option value={80} className="bg-neutral-900 text-white">80%</option>
                <option value={85} className="bg-neutral-900 text-white">85%</option>
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
                className="w-3.5 h-full flex items-center justify-center hover:bg-neutral-700 hover:text-white transition cursor-pointer font-bold select-none text-[10px] leading-none"
                title="Aumentar Zoom (+)"
              >
                +
              </button>
            </div>

            {isRunning && (
              <button
                onClick={() => handleToggleSlotUltra(slot.id)}
                className="w-5 h-5 flex items-center justify-center rounded text-purple-400 hover:text-purple-300 hover:bg-neutral-800 transition cursor-pointer shrink-0"
                title="Alternar Modo Ultra Economia (Estatísticas)"
              >
                <BarChart3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            )}

            {isRunning ? (
              <>
                <button
                  onClick={() => handleReloadSlot(slot.id)}
                  className="w-5 h-5 flex items-center justify-center rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer shrink-0"
                  title="Recarregar página"
                >
                  <RotateCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>

                {!isFocusedMode && (
                  <button
                    onClick={() => {
                      setFocusedSlotId(slot.id);
                      handleSelectLayoutMode('focus');
                    }}
                    className="w-5 h-5 flex items-center justify-center rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer shrink-0"
                    title="Maximizar / Foco nesta conta"
                  >
                    <Maximize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => handleStopSlot(slot.id)}
                  className="w-5 h-5 flex items-center justify-center rounded text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition cursor-pointer shrink-0"
                  title="Parar jogo"
                >
                  <Square className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => handleStartSlot(slot.id, slot.url)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold transition cursor-pointer shadow-xs shrink-0 h-5"
              >
                <Play className="w-2.5 h-2.5 fill-current" />
                <span>Iniciar</span>
              </button>
            )}

            <button
              onClick={() => setEditingSlot(slot)}
              className="w-5 h-5 flex items-center justify-center rounded text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition cursor-pointer shrink-0"
              title="Configurar slot"
            >
              <Settings className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
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
          {/* Feature 6: Snapshot visual quando a WebView está em suspensão (0% GPU) */}
          {isRunning && slotSnapshots[slot.id] && (
            <div className="absolute inset-0 z-0 flex items-center justify-center">
              <img
                src={slotSnapshots[slot.id]}
                alt="Slot congelado"
                className="w-full h-full object-cover filter brightness-90 select-none pointer-events-none"
              />
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-950/80 border border-blue-600/50 text-[10px] text-blue-200 font-medium backdrop-blur-xs shadow-md pointer-events-none">
                <span>🧊 0% GPU (Congelado)</span>
              </div>
            </div>
          )}

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
