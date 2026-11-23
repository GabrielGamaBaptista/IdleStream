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
    // 3. DESPACHANTE HÍBRIDO DE REQUESTANIMATIONFRAME (VSync Nativo em 60 FPS, Throttle Preciso em Eco/Sleep)
    // ============================================================
    const _NativeRAF = (typeof window.requestAnimationFrame === 'function'
      ? window.requestAnimationFrame.bind(window)
      : (cb) => setTimeout(() => cb(performance.now()), 16));
    const _NativeCAF = (typeof window.cancelAnimationFrame === 'function'
      ? window.cancelAnimationFrame.bind(window)
      : (id) => clearTimeout(id));

    const pendingCallbacks = new Map();
    let nextId = 1;
    let lastNativeRafTime = performance.now();

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

    window.requestAnimationFrame = (callback) => {
      const isFullSpeed = (targetFps >= 60) && !isEcoMode && !isSlotHidden;
      if (isFullSpeed) {
        // Modo 60 FPS Ativo: VSync nativo de hardware do monitor (60Hz, 120Hz, 144Hz) com zero jitter
        return _NativeRAF((timestamp) => {
          lastNativeRafTime = performance.now();
          try {
            callback(timestamp);
          } catch (err) {
            console.error('[IdleStream Anti-Sleep] Native rAF callback error:', err);
          }
        });
      }

      // Modo Eco (30 FPS), Super Eco (10 FPS), Sleep (1 FPS) ou Oculto: enfileira para throttle adaptativo
      const id = nextId++;
      pendingCallbacks.set(id, callback);
      return id;
    };

    window.cancelAnimationFrame = (id) => {
      pendingCallbacks.delete(id);
      _NativeCAF(id);
    };

    // Loop dinâmico adaptativo com suporte a 60 FPS (watchdog de contingência), 30 FPS e Super Economia (10 FPS / 1 FPS).
    let flushTimer = null;
    const scheduleNextFlush = () => {
      const isFullSpeed = (targetFps >= 60) && !isEcoMode && !isSlotHidden;
      if (isFullSpeed) {
        // Em 60 FPS ativo, agendamos um watchdog protetor a cada 100ms: se o navegador pausar rAF em segundo plano,
        // o watchdog despacha os callbacks para garantir continuidade do farm sem travar o jogo.
        flushTimer = setTimeout(() => {
          const delta = performance.now() - lastNativeRafTime;
          if (delta >= 120) {
            flushCallbacks();
          }
          scheduleNextFlush();
        }, 100);
        return;
      }

      const effectiveFps = isSlotHidden ? 1 : (targetFps || 30);
      const delay = Math.max(8, Math.round(1000 / effectiveFps));
      flushTimer = setTimeout(() => {
        flushCallbacks();
        scheduleNextFlush();
      }, delay);
    };
    scheduleNextFlush();

    // ============================================================
    // 4. BYPASS DE THROTTLING CHROMIUM VIA WEB AUDIO & HTML5 AUDIO (DESKTOP WINDOWS)
    // ============================================================
    // Chromium Desktop isenta abas com mídia ativa (IsAudible) de throttling e congelamento.
    // No Android, o Foreground Service persistente nativo já garante a sobrevivência do processo,
    // de forma que o áudio silencioso é desativado para permitir que o hardware DSP de som do celular durma.
    const isAndroidEnvironment = () => {
      try {
        if (window.IdleStreamSlotBridge || (window.AndroidBridge && typeof window.AndroidBridge.isAndroid === 'function')) {
          return true;
        }
        if (navigator && navigator.userAgent && /android/i.test(navigator.userAgent)) {
          return true;
        }
      } catch (_) {}
      return false;
    };
    const isAndroid = isAndroidEnvironment();

    const initSilentAudioTag = () => {
      if (isAndroid) return;
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

    if (!isAndroid) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSilentAudioTag);
      } else {
        initSilentAudioTag();
      }
    }

    let audioCtx = null;
    const initSilentAudio = () => {
      if (isAndroid) return;
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

    if (!isAndroid) {
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
    }

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
          // Feature 6: Captura snapshot do canvas do jogo antes de suspender
          try {
            const canvas = document.querySelector('canvas');
            if (canvas && typeof canvas.toDataURL === 'function') {
              const dataUrl = canvas.toDataURL('image/jpeg', 0.55);
              if (dataUrl && dataUrl.length > 50) {
                document.title = '__IDLESTREAM_SLOT_SNAPSHOT__|' + dataUrl;
              }
            }
          } catch (_) {}
          // Suspende o AudioContext Web Audio para zerar consumo de CPU no audiodg.exe
          try {
            if (window.__idlestreamAudioCtx && window.__idlestreamAudioCtx.state === 'running') {
              window.__idlestreamAudioCtx.suspend().catch(() => {});
            }
          } catch (_) {}
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
          if (!isEcoMode && targetFps >= 60) {
            try {
              if (window.__idlestreamAudioCtx && window.__idlestreamAudioCtx.state === 'suspended') {
                window.__idlestreamAudioCtx.resume().catch(() => {});
              }
            } catch (_) {}
          }
        }
      }
      // Warm-up suave: quando reaparece, aguarda 100ms para DirectX/DWM estabilizarem antes dos ticks
      const delay = isSlotHidden ? 1000 : 100;
      flushTimer = setTimeout(() => {
        scheduleNextFlush();
      }, delay);
      console.log('[IdleStream] Slot hidden state alterado:', { isSlotHidden });
    };

    window.__idlestreamCaptureSlotSnapshot = function () {
      try {
        const canvas = document.querySelector('canvas');
        if (canvas && typeof canvas.toDataURL === 'function') {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.55);
          if (dataUrl && dataUrl.length > 50) {
            document.title = '__IDLESTREAM_SLOT_SNAPSHOT__|' + dataUrl;
            return dataUrl;
          }
        }
      } catch (_) {}
      return null;
    };

    try {
      const hiddenCss = document.createElement('style');
      hiddenCss.textContent = `
        .idlestream-slot-hidden * {
          animation-play-state: paused !important;
        }
        .idlestream-slot-hidden canvas, .idlestream-slot-hidden video {
          visibility: hidden !important;
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
        if (!isSlotHidden && targetFps >= 60) {
          try {
            if (window.__idlestreamAudioCtx && window.__idlestreamAudioCtx.state === 'suspended') {
              window.__idlestreamAudioCtx.resume().catch(() => {});
            }
          } catch (_) {}
        }
      } else {
        document.querySelectorAll('audio, video').forEach((m) => {
          // NUNCA mutar o áudio silencioso de anti-throttling para manter o IsAudible do Chromium ativo
          if (m.id !== '__idlestream_silent_audio__') {
            m.muted = true;
          }
        });
        try {
          if (window.__idlestreamAudioCtx && window.__idlestreamAudioCtx.state === 'running') {
            window.__idlestreamAudioCtx.suspend().catch(() => {});
          }
        } catch (_) {}
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
        // 1. Manter mídia silenciosa ativa apenas no Desktop Windows (IsAudible para isenção Chromium)
        if (!isAndroid) {
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

    // ============================================================
    // 11. POKEIDLE WEBSOCKET & STATE INTERCEPTOR (FEATURE 7 - AUDITADO)
    // ============================================================
    try {
      const isPokeIdle = /(^|\.)pokeidle\.io$/.test(location.hostname) || /localhost/.test(location.hostname);
      if (isPokeIdle) {
        window.__idlestream_game_state = window.__idlestream_game_state || {
          nick: null,
          level: null,
          xp: null,
          gold: null,
          diamonds: null,
          huntSlug: null,
          bonusTwitchSecs: null,
          bonusKickSecs: null,
          xpRatePerHour: 0,
          updatedAt: Date.now(),
        };

        let xpHistory = []; // { xp, time }
        let lastTitleEmit = 0;
        let lastEmittedPayload = '';
        let emitTimer = null;

        const updateTrainerStateFrom = (obj) => {
          if (!obj || typeof obj !== 'object') return false;
          const st = window.__idlestream_game_state;
          const now = Date.now();
          let changed = false;

          // Nick do treinador
          const rawNick = obj.nick !== undefined ? obj.nick : obj.nome;
          if (rawNick && st.nick !== String(rawNick)) {
            st.nick = String(rawNick);
            changed = true;
          }

          // Nível estrito do treinador (ignora Pokémons selvagens ou valores decrescentes anômalos)
          const rawLvl = obj.level !== undefined ? obj.level : obj.nivel;
          if (rawLvl !== undefined && rawLvl !== null) {
            const numLvl = Math.floor(Number(rawLvl));
            if (!isNaN(numLvl) && numLvl > 0) {
              if (st.level === null || numLvl >= st.level) {
                if (st.level !== numLvl) {
                  st.level = numLvl;
                  changed = true;
                }
              }
            }
          }

          // Moedas e Recursos do treinador
          if (obj.gold !== undefined && obj.gold !== st.gold) { st.gold = Number(obj.gold); changed = true; }
          if (obj.ouro !== undefined && obj.ouro !== st.gold) { st.gold = Number(obj.ouro); changed = true; }
          if (obj.diamonds !== undefined && obj.diamonds !== st.diamonds) { st.diamonds = Number(obj.diamonds); changed = true; }
          if (obj.diamantes !== undefined && obj.diamantes !== st.diamonds) { st.diamonds = Number(obj.diamantes); changed = true; }

          // Hunt atual
          if (obj.huntSlug !== undefined && obj.huntSlug !== st.huntSlug) { st.huntSlug = String(obj.huntSlug); changed = true; }
          if (obj.hunt !== undefined && typeof obj.hunt === 'string' && obj.hunt !== st.huntSlug) { st.huntSlug = obj.hunt; changed = true; }

          // Bônus Twitch / Kick
          if (obj.bonusXp && typeof obj.bonusXp === 'object') {
            const bx = obj.bonusXp;
            if (bx.twitchSecs !== undefined && bx.twitchSecs !== st.bonusTwitchSecs) { st.bonusTwitchSecs = Number(bx.twitchSecs); changed = true; }
            else if (bx.twitch !== undefined && bx.twitch !== st.bonusTwitchSecs) { st.bonusTwitchSecs = Number(bx.twitch); changed = true; }
            if (bx.kickSecs !== undefined && bx.kickSecs !== st.bonusKickSecs) { st.bonusKickSecs = Number(bx.kickSecs); changed = true; }
            else if (bx.kick !== undefined && bx.kick !== st.bonusKickSecs) { st.bonusKickSecs = Number(bx.kick); changed = true; }
          }
          if (obj.twitch !== undefined && typeof obj.twitch === 'number' && obj.twitch !== st.bonusTwitchSecs) {
            st.bonusTwitchSecs = obj.twitch;
            changed = true;
          }
          if (obj.kick !== undefined && typeof obj.kick === 'number' && obj.kick !== st.bonusKickSecs) {
            st.bonusKickSecs = obj.kick;
            changed = true;
          }

          // XP e taxa horária
          if (typeof obj.xp === 'number') {
            if (st.xp !== obj.xp) {
              st.xp = obj.xp;
              changed = true;
              xpHistory.push({ xp: obj.xp, time: now });
              const cutoff = now - 5 * 60 * 1000;
              xpHistory = xpHistory.filter(h => h.time >= cutoff);
              if (xpHistory.length >= 2) {
                const oldest = xpHistory[0];
                const newest = xpHistory[xpHistory.length - 1];
                const deltaXp = newest.xp - oldest.xp;
                const deltaHours = (newest.time - oldest.time) / 3600000;
                if (deltaHours > 0.0005 && deltaXp >= 0) {
                  st.xpRatePerHour = Math.round(deltaXp / deltaHours);
                }
              }
            }
          }

          if (changed) {
            st.updatedAt = now;
            scheduleEmit(false);
          }
          return changed;
        };

        const emitGameStateToHost = () => {
          try {
            const st = window.__idlestream_game_state;
            // Fallback passivo para window.estado do PokeIdle se campos estiverem vazios
            const est = window.estado;
            if (est && typeof est === 'object') {
              const tr = est.treinador || est.jogador || est;
              if (st.level === null || !st.nick) {
                updateTrainerStateFrom(tr);
              }
            }

            const payload = {
              nick: st.nick,
              level: st.level,
              xp: st.xp,
              gold: st.gold,
              diamonds: st.diamonds,
              huntSlug: st.huntSlug,
              bonusTwitchSecs: st.bonusTwitchSecs,
              bonusKickSecs: st.bonusKickSecs,
              xpRatePerHour: st.xpRatePerHour,
              updatedAt: Math.floor(st.updatedAt / 1000),
            };

            const serialized = JSON.stringify(payload);
            if (serialized !== lastEmittedPayload) {
              lastEmittedPayload = serialized;
              const origTitle = document.title && !document.title.startsWith('__IDLESTREAM_') ? document.title : 'PokeIdle';
              document.title = '__IDLESTREAM_GAME_STATE__|' + serialized;
              lastTitleEmit = Date.now();
              setTimeout(() => {
                if (document.title.startsWith('__IDLESTREAM_GAME_STATE__|')) {
                  document.title = origTitle;
                }
              }, 80);
            }
          } catch (_) {}
        };

        window.__emitIdleStreamGameState = emitGameStateToHost;

        const scheduleEmit = (immediate) => {
          const now = Date.now();
          if (immediate || now - lastTitleEmit >= 3000) {
            clearTimeout(emitTimer);
            emitGameStateToHost();
          } else if (!emitTimer) {
            emitTimer = setTimeout(() => {
              emitTimer = null;
              emitGameStateToHost();
            }, 3000);
          }
        };

        const processMessageData = (raw) => {
          if (!raw || typeof raw !== 'object') return;
          // IGNORAR expressamente pacotes de batalha / campo para não capturar nível de Pokémon selvagem
          const tipo = raw.t || (raw.data && raw.data.t);
          if (tipo === 'campo' || tipo === 'campo.init') return;

          // Só processamos pacotes oficiais de treinador: welcome, estado ou deltas
          if (tipo === 'welcome' || tipo === 'estado') {
            if (raw.estado && typeof raw.estado === 'object') {
              updateTrainerStateFrom(raw.estado);
            }
          } else if (raw.treinador && typeof raw.treinador === 'object') {
            updateTrainerStateFrom(raw.treinador);
          } else if (raw.jogador && typeof raw.jogador === 'object') {
            updateTrainerStateFrom(raw.jogador);
          }
        };

        // Integrar com barramento da extensão Pokeidle Hunt se já carregada
        const connectWithHuntBus = () => {
          try {
            if (window.__pokeidleHunt && typeof window.__pokeidleHunt.on === 'function') {
              window.__pokeidleHunt.on('estado', (eu) => {
                if (eu && typeof eu === 'object') {
                  updateTrainerStateFrom(eu);
                }
              });
            }
          } catch (_) {}
        };
        connectWithHuntBus();
        window.addEventListener('DOMContentLoaded', connectWithHuntBus, { once: true });

        // Interceptar WebSocket nativo
        const _NativeWS = window.WebSocket;
        if (_NativeWS && !window.__idlestream_ws_hooked) {
          window.__idlestream_ws_hooked = true;
          window.WebSocket = function (url, protocols) {
            const sock = protocols ? new _NativeWS(url, protocols) : new _NativeWS(url);
            sock.addEventListener('message', (ev) => {
              try {
                if (typeof ev.data === 'string') {
                  // Filtro rápido por cabeçalho antes de deserializar JSON desnecessário
                  const head = ev.data.slice(0, 40);
                  if (head.includes('"t":"campo"') || head.includes('"t":"campo.init"')) {
                    return; // Passa direto sem parsing pesado de batalha
                  }
                  const parsed = JSON.parse(ev.data);
                  processMessageData(parsed);
                }
              } catch (_) {}
            });
            return sock;
          };
          Object.setPrototypeOf(window.WebSocket, _NativeWS);
          window.WebSocket.prototype = _NativeWS.prototype;
          window.WebSocket.CONNECTING = _NativeWS.CONNECTING;
          window.WebSocket.OPEN = _NativeWS.OPEN;
          window.WebSocket.CLOSING = _NativeWS.CLOSING;
          window.WebSocket.CLOSED = _NativeWS.CLOSED;
        }

        // Heartbeat de emissão do estado: a cada 15 segundos verifica se houve alteração
        setInterval(() => {
          scheduleEmit(true);
        }, 15000);
      }
    } catch (err) {
      console.warn('[IdleStream] Erro ao inicializar PokeIdle WebSocket hook:', err);
    }

    console.log('[IdleStream] Hi-Performance & Anti-Sleep engine ativo.');
  } catch (e) {
    console.error('[IdleStream] Falha ao injetar anti-sleep:', e);
  }
})();
