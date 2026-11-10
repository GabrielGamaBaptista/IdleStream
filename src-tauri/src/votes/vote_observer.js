// Observador passivo de confirmacao de voto (somente leitura, exclusivamente em topidle.com).
// Nunca interage com formularios nem contorna CAPTCHAs - apenas sinaliza na interface
// do IdleStream quando o site exibir confirmacao de voto concluido.
(function () {
  try {
    const host = (window.location && window.location.hostname ? window.location.hostname : '').toLowerCase();
    if (!host || (host !== 'topidle.com' && !host.endsWith('.topidle.com'))) return;
    if (window.__idlestreamVoteObserverInstalled) return;
    window.__idlestreamVoteObserverInstalled = true;

    let hinted = false;
    let userInteracted = false;

    const markInteraction = () => {
      userInteracted = true;
    };
    window.addEventListener('pointerdown', markInteraction, true);
    window.addEventListener('keydown', markInteraction, true);
    window.addEventListener('submit', markInteraction, true);

    const VOTE_SUCCESS_PATTERNS = [
      /voto\s+(?:registrado|computado|confirmado|enviado)/i,
      /obrigado\s+por\s+votar/i,
      /vote\s+(?:recorded|confirmed|submitted|counted)/i,
      /thank\s+you\s+for\s+voting/i,
      /thanks\s+for\s+voting/i,
      /voc[e\u00ea]\s+j[a\u00e1]\s+votou/i,
      /already\s+voted/i,
    ];

    function emitHint(reason) {
      if (hinted) return;
      hinted = true;
      try {
        if (window.IdleStreamVoteBridge && typeof window.IdleStreamVoteBridge.onVoteDetectedHint === 'function') {
          window.IdleStreamVoteBridge.onVoteDetectedHint(reason);
          return;
        }
      } catch (_) {}

      try {
        const orig = document.title || 'TopIdle';
        document.title = '__IDLESTREAM_VOTE_HINT__|' + reason + '|' + orig;
        setTimeout(() => {
          if (document.title.startsWith('__IDLESTREAM_VOTE_HINT__|')) {
            document.title = orig;
          }
        }, 80);
      } catch (_) {}
    }

    function inspectDomForVoteSuccess() {
      if (hinted) return;
      try {
        const text = (document.body && document.body.innerText) ? document.body.innerText : '';
        if (!text) return;
        for (const rx of VOTE_SUCCESS_PATTERNS) {
          if (rx.test(text)) {
            emitHint(userInteracted ? 'vote_confirmed_after_interaction' : 'cooldown_already_active');
            break;
          }
        }
      } catch (_) {}
    }

    if (typeof window.fetch === 'function') {
      const rawFetch = window.fetch.bind(window);
      window.fetch = async function (...args) {
        const res = await rawFetch(...args);
        try {
          const reqUrl = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
          const method = ((args[1] && args[1].method) || (args[0] && args[0].method) || 'GET').toUpperCase();
          if (res.ok && method === 'POST' && /\/vote|votar/i.test(reqUrl)) {
            emitHint('vote_post_ok');
          }
        } catch (_) {}
        return res;
      };
    }

    function attachObserver() {
      setTimeout(inspectDomForVoteSuccess, 900);
      if (document.body) {
        const observer = new MutationObserver(() => {
          if (!hinted) {
            setTimeout(inspectDomForVoteSuccess, 250);
          }
        });
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      }
    }

    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', attachObserver);
    } else {
      attachObserver();
    }
  } catch (_) {}
})();
