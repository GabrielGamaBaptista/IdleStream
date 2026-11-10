// IdleStream Anti-Sleep & Hi-Performance Engine
// Injetado em cada WebView para garantir que jogos idle nunca pausem em segundo plano
// e executem com máxima eficiência de memória e CPU.
(() => {
  try {
    let isEcoMode = true;
    let isMutedByEco = true;
    let isSlotHidden = false;
    let targetFps = 30; // 60, 30, ou 10 (Super Economia)
    try {
      const savedFps = Number(localStorage.getItem('__idlestream_target_fps__'));
      if (savedFps === 10 || savedFps === 30 || savedFps === 60) {
        targetFps = savedFps;
        isEcoMode = targetFps < 60;
      }
    } catch (_) {}

    // ============================================================
    // 1. FORÇAR VISIBILIDADE ATIVA PERMANENTE (ANTI-SLEEP SPOOFING)
    // ============================================================
    Object.defineProperty(document, 'hidden', {
      get: () => false,
      configurable: true,
    });
    Object.defineProperty(document, 'visibilityState', {
      get: () => 'visible',
      configurable: true,
    });

    try {
      document.dispatchEvent(new Event('visibilitychange'));
    } catch (_) {}

    // ============================================================
    // 2. INTERCEPTAR EVENTOS DE PERDA DE FOCO
    // ============================================================
    const stopPropagation = (e) => {
      e.stopImmediatePropagation();
    };

    window.addEventListener('blur', stopPropagation, true);
    window.addEventListener('focusout', stopPropagation, true);

    // ============================================================
    // 3. LOOP DE TICK ININTERRUPTO DE REQUESTANIMATIONFRAME (30 FPS em Eco, 60 FPS normal)
    // ============================================================
    const pendingCallbacks = new Map();
    let nextId = 1;

    window.requestAnimationFrame = (callback) => {
      const id = nextId++;
      pendingCallbacks.set(id, callback);
      return id;
    };

    window.cancelAnimationFrame = (id) => {
      pendingCallbacks.delete(id);
    };

    const flushCallbacks = () => {
      const now = performance.now();
      if (pendingCallbacks.size > 0) {
        const callbacks = Array.from(pendingCallbacks.entries());
        pendingCallbacks.clear();
        for (const [, cb] of callbacks) {
          try {
            cb(now);
          } catch (err) {
            console.error('[IdleStream Anti-Sleep] Callback error:', err);
          }
        }
      }
    };
    window.__flushIdleStreamCallbacks = flushCallbacks;

    // Loop dinâmico adaptativo imune a throttling com suporte a 60 FPS, 30 FPS e Super Economia (10 FPS)
    // Quando o slot está oculto ou na bandeja, o timer passa a dormir 1000ms (1 FPS), permitindo
    // que a CPU entre em C-states profundos e os coolers parem completamente.
    let flushTimer = null;
    const scheduleNextFlush = () => {
      const effectiveFps = isSlotHidden ? 1 : (targetFps || 30);
      const delay = Math.max(8, Math.round(1000 / effectiveFps));
      flushTimer = setTimeout(() => {
        flushCallbacks();
        scheduleNextFlush();
      }, delay);
    };
    scheduleNextFlush();

    // ============================================================
    // 4. BYPASS DE THROTTLING CHROMIUM VIA WEB AUDIO & HTML5 AUDIO
    // ============================================================
    // Chromium isenta abas com mídia ativa (IsAudible) de throttling e congelamento em segundo plano.
    const initSilentAudioTag = () => {
      try {
        if (document.getElementById('__idlestream_silent_audio__')) return;
        // 1 segundo de silêncio codificado em WAV base64
        const silentWav = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
        const audio = document.createElement('audio');
        audio.id = '__idlestream_silent_audio__';
        audio.src = silentWav;
        audio.loop = true;
        audio.autoplay = true;
        audio.volume = 0.001; // Quase inaudível, mas NÃO-mutado para marcar IsAudible no Chromium
        audio.muted = false;
        (document.body || document.documentElement).appendChild(audio);
        const p = audio.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch (_) {}
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initSilentAudioTag);
    } else {
      initSilentAudioTag();
    }

    let audioCtx = null;
    const initSilentAudio = () => {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        if (!audioCtx) {
          audioCtx = new AudioContextClass();
        }
        if (audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        }
        if (!window.__idlestreamAudioSource && audioCtx) {
          const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate, audioCtx.sampleRate);
          const source = audioCtx.createBufferSource();
          source.buffer = buffer;
          source.loop = true;
          const gain = audioCtx.createGain();
          gain.gain.value = 0.00001;
          source.connect(gain);
          gain.connect(audioCtx.destination);
          source.start(0);
          window.__idlestreamAudioSource = source;
          window.__idlestreamAudioCtx = audioCtx;
        }
      } catch (e) {
        // Ignorar se política de áudio restringir temporariamente
      }
    };

    initSilentAudio();
    ['click', 'touchstart', 'keydown'].forEach((ev) => {
      window.addEventListener(ev, () => {
        initSilentAudioTag();
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        } else if (!audioCtx) {
          initSilentAudio();
        }
      }, { once: true, passive: true });
    });

    // ============================================================
    // 4.1. ECONOMIA DE CPU: CONTROLE INTELIGENTE DE ÁUDIO DO JOGO
    // ============================================================
    try {
      const originalAudioPlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        if (this.id === '__idlestream_silent_audio__') {
          return originalAudioPlay.apply(this, arguments);
        }
        if (isMutedByEco) {
          this.muted = true;
        }
        return originalAudioPlay.apply(this, arguments);
      };
    } catch (_) {}

    // ============================================================
    // 5. PURGAÇÃO PERIÓDICA DE MEMÓRIA (GARBAGE COLLECTION)
    // ============================================================
    // Ativado via flag --js-flags="--expose-gc"
    setInterval(() => {
      if (typeof window.gc === 'function') {
        const runGc = () => {
          try {
            window.gc();
          } catch (_) {}
        };
        if (typeof window.requestIdleCallback === 'function') {
          window.requestIdleCallback(runGc, { timeout: 2000 });
        } else {
          runGc();
        }
      }
    }, 120000); // A cada 2 minutos em período ocioso

    // ============================================================
    // 6. INJEÇÃO DE CSS DE ECO-MODE (OTIMIZAÇÃO DE GPU) & BADGE VISUAL
    // ============================================================
    const applyEcoStyles = () => {
      if (!document.getElementById('__idlestream_eco_style__')) {
        const style = document.createElement('style');
        style.id = '__idlestream_eco_style__';
        style.textContent = `
          /* Modo Econômico Ativo: desativa animações e alivia a GPU */
          .idlestream-eco-mode *, .idlestream-eco-mode *::before, .idlestream-eco-mode *::after {
            animation-duration: 0.001s !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001s !important;
            text-shadow: none !important;
            box-shadow: none !important;
          }
          .idlestream-eco-mode canvas {
            image-rendering: pixelated !important;
          }
          #__idlestream_eco_badge__ {
            position: fixed;
            bottom: 12px;
            right: 12px;
            z-index: 99999999;
            background: rgba(6, 78, 59, 0.9);
            color: #34d399;
            font-family: ui-monospace, SFMono-Regular, monospace, sans-serif;
            font-size: 11px;
            font-weight: 600;
            padding: 4px 10px;
            border-radius: 9999px;
            border: 1px solid rgba(16, 185, 129, 0.5);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            pointer-events: none;
            user-select: none;
            display: flex;
            align-items: center;
            gap: 6px;
          }
        `;
        (document.head || document.documentElement).appendChild(style);
      }

      if (!document.getElementById('__idlestream_eco_badge__')) {
        const badge = document.createElement('div');
        badge.id = '__idlestream_eco_badge__';
        badge.innerHTML = '🍃 <span>Modo Econômico</span>';
        badge.style.display = isEcoMode ? 'flex' : 'none';
        (document.body || document.documentElement).appendChild(badge);
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyEcoStyles);
    } else {
      applyEcoStyles();
    }

    // ============================================================
    // 7. FUNÇÃO DE CONTROLE AO VIVO DO MODO ECONÔMICO & FPS TIER
    // ============================================================
    const updateBadge = () => {
      const badge = document.getElementById('__idlestream_eco_badge__');
      if (!badge) return;
      if (targetFps === 10) {
        badge.innerHTML = '🔋 <span>Super Eco (10 FPS)</span>';
        badge.style.display = 'flex';
      } else if (isEcoMode || targetFps === 30) {
        badge.innerHTML = '🍃 <span>Econômico (30 FPS)</span>';
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    };

    window.__setIdleStreamFps = function (fps) {
      targetFps = Number(fps) || 30;
      try {
        localStorage.setItem('__idlestream_target_fps__', String(targetFps));
      } catch (_) {}
      isEcoMode = targetFps < 60;
      isMutedByEco = isEcoMode;
      window.__setIdleStreamEcoMode(isEcoMode, targetFps);
      clearTimeout(flushTimer);
      scheduleNextFlush();
    };

    window.__setIdleStreamSlotHidden = function (hidden) {
      isSlotHidden = !!hidden;
      clearTimeout(flushTimer);
      const htmlEl = document.documentElement;
      if (htmlEl) {
        if (isSlotHidden) {
          htmlEl.classList.add('idlestream-slot-hidden');
          // Força coleta de lixo JS para liberar memória quando ocultado
          if (typeof window.gc === 'function') {
            try {
              window.gc();
            } catch (_) {}
          }
        } else {
          htmlEl.classList.remove('idlestream-slot-hidden');
          // Limpa callbacks acumulados obsoletos para não sobrecarregar a GPU na restauração (Anti-TDR/Crash)
          pendingCallbacks.clear();
        }
      }
      // Warm-up suave: quando reaparece, aguarda 100ms para DirectX/DWM estabilizarem antes dos ticks
      const delay = isSlotHidden ? 1000 : 100;
      flushTimer = setTimeout(() => {
        scheduleNextFlush();
      }, delay);
      console.log('[IdleStream] Slot hidden state alterado:', { isSlotHidden });
    };

    try {
      const hiddenCss = document.createElement('style');
      hiddenCss.textContent = `
        .idlestream-slot-hidden * {
          animation-play-state: paused !important;
        }
      `;
      (document.head || document.documentElement).appendChild(hiddenCss);
    } catch (_) {}

    window.__setIdleStreamEcoMode = function (enabled, customFps) {
      isEcoMode = !!enabled;
      isMutedByEco = !!enabled;
      if (customFps) {
        targetFps = customFps;
      } else {
        targetFps = isEcoMode ? 30 : 60;
      }

      const htmlEl = document.documentElement;
      const bodyEl = document.body;

      if (htmlEl) {
        if (isEcoMode) {
          htmlEl.classList.add('idlestream-eco-mode');
        } else {
          htmlEl.classList.remove('idlestream-eco-mode');
        }
      }
      if (bodyEl) {
        if (isEcoMode) {
          bodyEl.classList.add('idlestream-eco-mode');
        } else {
          bodyEl.classList.remove('idlestream-eco-mode');
        }
      }

      updateBadge();

      if (!isEcoMode) {
        document.querySelectorAll('audio, video').forEach((m) => {
          m.muted = false;
        });
      } else {
        document.querySelectorAll('audio, video').forEach((m) => {
          // NUNCA mutar o áudio silencioso de anti-throttling para manter o IsAudible do Chromium ativo
          if (m.id !== '__idlestream_silent_audio__') {
            m.muted = true;
          }
        });
        if (typeof window.gc === 'function') {
          try {
            window.gc();
          } catch (_) {}
        }
      }

      console.log('[IdleStream] Modo Econômico atualizado:', { isEcoMode, targetFps });
    };

    // ============================================================
    // 8. WATCHDOG HEARTBEAT DE SEGUNDO PLANO (Chamado pelo Nativo)
    // ============================================================
    window.__idlestreamHeartbeat = function () {
      try {
        // 1. Manter mídia silenciosa ativa (IsAudible para isenção Chromium)
        const silentAudio = document.getElementById('__idlestream_silent_audio__');
        if (!silentAudio) {
          initSilentAudioTag();
        } else if (silentAudio.paused) {
          silentAudio.play().catch(() => {});
        }
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        } else if (!audioCtx) {
          initSilentAudio();
        }

        // 2. Despachar callbacks de renderização/jogo pendentes
        flushCallbacks();

        // 3. Guardião de WebSocket (PokeIdle / Jogos Web)
        const estadoObj = window.estado;
        if (estadoObj && estadoObj.ws) {
          const ws = estadoObj.ws;
          if (ws.readyState === 1) { // OPEN
            const now = Date.now();
            const lastMsg = estadoObj.ultimaMsgEm || 0;
            // Se passar mais de 15 segundos sem mensagem/keepalive, envia ping preventivo
            if (now - lastMsg >= 15000) {
              try {
                ws.send(JSON.stringify({ t: 'ping' }));
                estadoObj.ultimaMsgEm = now;
              } catch (_) {}
            }
          } else if (ws.readyState >= 2) { // CLOSING ou CLOSED
            // Reconexão automática proativa se caiu em segundo plano
            if (typeof window.verificarConexao === 'function') {
              window.verificarConexao();
            } else if (typeof window.conectar === 'function') {
              window.conectar();
            }
          }
        }
      } catch (err) {
        console.warn('[IdleStream Heartbeat] Erro no ciclo de pulso:', err);
      }
    };

    // ============================================================
    // 9. CONTROLE DO MODO ULTRA ECONOMIA NATIVO DO POKEIDLE (Stats Card)
    // ============================================================
    window.__isPokeIdleUltraActive = function () {
      try {
        const rootHasClass = document.documentElement.classList.contains('modo-ultra');
        const btnSairExists = !!document.getElementById('ultra-sair');
        const ultraDiv = document.getElementById('ultra');
        const ultraVisible = ultraDiv && ultraDiv.getAttribute('aria-hidden') === 'false';
        return rootHasClass || btnSairExists || !!ultraVisible;
      } catch (_) {
        return false;
      }
    };

    window.__togglePokeIdleUltra = function (forceState) {
      try {
        const isCurrent = window.__isPokeIdleUltraActive();
        const targetState = forceState !== undefined ? !!forceState : !isCurrent;

        // Se o estado desejado já é o atual, nada a fazer
        if (isCurrent === targetState) {
          return true;
        }

        if (isCurrent && !targetState) {
          // Desativar: Clica no botão oficial de saída (#ultra-sair)
          const btnSair = document.getElementById('ultra-sair');
          if (btnSair) {
            btnSair.click();
            console.log('[IdleStream] PokeIdle Ultra: Saiu com sucesso via #ultra-sair');
            return true;
          }
        } else if (!isCurrent && targetState) {
          // Ativar:
          // Caso 1: O modal de configurações já está aberto no DOM
          let cfgUltra = document.getElementById('cfg-ultra');
          if (cfgUltra) {
            cfgUltra.click();
            console.log('[IdleStream] PokeIdle Ultra: Ativado com sucesso via #cfg-ultra');
            return true;
          }

          // Caso 2: Clicar no botão oficial #btn-config para abrir o modal de configurações
          // No PokeIdle, a abertura do modal e a montagem de #cfg-ultra é 100% síncrona
          const btnConfig = document.getElementById('btn-config');
          if (btnConfig) {
            btnConfig.click();
            cfgUltra = document.getElementById('cfg-ultra');
            if (cfgUltra) {
              cfgUltra.click(); // Ao clicar, o PokeIdle liga o Ultra e fecha o modal automaticamente
              console.log('[IdleStream] PokeIdle Ultra: Ativado com sucesso via #btn-config -> #cfg-ultra');
              return true;
            }
          }
        }

        // Fallback de contingência (persiste preferência no storage do slot)
        localStorage.setItem('cfg-ultra', targetState ? '1' : '0');
        window.dispatchEvent(new Event('storage'));
        document.documentElement.classList.toggle('modo-ultra', targetState);
        console.log('[IdleStream] PokeIdle Ultra alternado via fallback:', targetState);
        return true;
      } catch (err) {
        console.error('[IdleStream] Erro ao alternar PokeIdle Ultra:', err);
        return false;
      }
    };

    // ============================================================
    // 10. REPORTE DE ATIVIDADE DO USUÁRIO PARA ANTI-SLEEP / INATIVIDADE
    // ============================================================
    const reportUserActivity = () => {
      try {
        if (window.IdleStreamSlotBridge && typeof window.IdleStreamSlotBridge.reportActivity === 'function') {
          window.IdleStreamSlotBridge.reportActivity();
        }
        if (typeof window.__onUserActivity === 'function') {
          window.__onUserActivity();
        }
      } catch (_) {}
    };

    ['mousedown', 'touchstart', 'keydown', 'wheel', 'pointerdown'].forEach((evtName) => {
      window.addEventListener(evtName, reportUserActivity, { passive: true, capture: true });
    });

    console.log('[IdleStream] Hi-Performance & Anti-Sleep engine ativo.');
  } catch (e) {
    console.error('[IdleStream] Falha ao injetar anti-sleep:', e);
  }
})();
