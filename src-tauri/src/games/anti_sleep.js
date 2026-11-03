// IdleStream Anti-Sleep & Hi-Performance Engine
// Injetado em cada WebView para garantir que jogos idle nunca pausem em segundo plano
// e executem com máxima eficiência de memória e CPU.
(() => {
  try {
    let isEcoMode = true;
    let isMutedByEco = true;

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

    // Loop com setInterval imune a throttling do navegador
    let frameCount = 0;
    setInterval(() => {
      frameCount++;
      // Em modo econômico, renderiza a 30 FPS economizando 50% de CPU/GPU
      if (isEcoMode && frameCount % 2 !== 0) {
        return;
      }
      flushCallbacks();
    }, 16);

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
    // 7. FUNÇÃO DE CONTROLE AO VIVO DO MODO ECONÔMICO
    // ============================================================
    window.__setIdleStreamEcoMode = function (enabled) {
      isEcoMode = !!enabled;
      isMutedByEco = !!enabled;

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

      const badge = document.getElementById('__idlestream_eco_badge__');
      if (badge) {
        badge.style.display = isEcoMode ? 'flex' : 'none';
      }

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

      console.log('[IdleStream] Modo Econômico atualizado para:', isEcoMode);
    };

    console.log('[IdleStream] Hi-Performance & Anti-Sleep engine ativo.');
  } catch (e) {
    console.error('[IdleStream] Falha ao injetar anti-sleep:', e);
  }
})();
