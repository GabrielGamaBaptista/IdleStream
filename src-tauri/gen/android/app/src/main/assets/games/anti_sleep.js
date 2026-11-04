// IdleStream Anti-Sleep & Hi-Performance Engine
// Injetado em cada WebView para garantir que jogos idle nunca pausem em segundo plano
// e executem com máxima eficiência de memória e CPU.
(() => {
  try {
    let isEcoMode = true;
    let isMutedByEco = true;
    let targetFps = 30; // 60, 30, ou 10 (Super Economia)

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

    // Loop imune a throttling do navegador com suporte a 60 FPS, 30 FPS e Super Economia (10 FPS)
    let lastFlush = 0;
    setInterval(() => {
      const now = performance.now();
      const minInterval = 1000 / (targetFps || 30);
      if (now - lastFlush >= minInterval - 2) {
        lastFlush = now;
        flushCallbacks();
      }
    }, 8);

    // ============================================================
    // 4. ECONOMIA DE CPU: CONTROLE INTELIGENTE DE ÁUDIO
    // ============================================================
    try {
      const originalAudioPlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
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
        try {
          window.gc();
        } catch (_) {}
      }
    }, 90000); // A cada 90 segundos

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
      isEcoMode = targetFps < 60;
      isMutedByEco = isEcoMode;
      window.__setIdleStreamEcoMode(isEcoMode, targetFps);
    };

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
          m.muted = true;
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
    // 8. CONTROLE DO MODO ULTRA ECONOMIA NATIVO DO POKEIDLE (Stats Card)
    // ============================================================
    window.__togglePokeIdleUltra = function (forceState) {
      try {
        const isCurrent = localStorage.getItem('cfg-ultra') === '1';
        const targetState = forceState !== undefined ? !!forceState : !isCurrent;
        localStorage.setItem('cfg-ultra', targetState ? '1' : '0');

        // Tentar acionar o interruptor nativo do jogo se estiver na tela
        const btn = document.getElementById('cfg-ultra');
        if (btn) {
          const isOn = btn.classList.contains('on');
          if (isOn !== targetState) {
            btn.click();
          }
        } else {
          // Se o botão não estiver no DOM aberto, disparar evento de storage e recarregar
          window.dispatchEvent(new Event('storage'));
          document.documentElement.classList.toggle('modo-ultra', targetState);
        }
        console.log('[IdleStream] PokeIdle Ultra Economia alternado para:', targetState);
      } catch (err) {
        console.error('[IdleStream] Erro ao alternar PokeIdle Ultra:', err);
      }
    };

    console.log('[IdleStream] Hi-Performance & Anti-Sleep engine ativo.');
  } catch (e) {
    console.error('[IdleStream] Falha ao injetar anti-sleep:', e);
  }
})();
