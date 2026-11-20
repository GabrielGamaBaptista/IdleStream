import React, { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { Cast, Copy, Check, ExternalLink, Radio, Sparkles } from 'lucide-react';

export const OverlaySettingsCard: React.FC = () => {
  const { overlayStatus, toggleOverlayServer } = useAppStore();
  const [copied, setCopied] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const isRunning = Boolean(overlayStatus?.running);
  const overlayUrl = overlayStatus?.url || 'http://127.0.0.1:47850/overlay';

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await toggleOverlayServer(!isRunning);
    } finally {
      setIsToggling(false);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  const handleOpenPreview = () => {
    if (typeof window !== 'undefined') {
      window.open(overlayUrl, '_blank', 'width=460,height=520');
    }
  };

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 md:p-6 shadow-xl backdrop-blur-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
            <Cast className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white tracking-tight">
                Overlay para OBS (Browser Source)
              </h3>
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-[10px] text-indigo-300 font-medium">
                <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                <span>Feature 5</span>
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5 max-w-xl">
              Servidor HTTP local nativo para sobreposição transparente no OBS Studio. Transmite em tempo real suas lives conectadas, pontos e dados do treinador no PokeIdle.
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <span className="text-xs font-medium text-neutral-300">
            {isRunning ? 'Ativo' : 'Desativado'}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isRunning}
            onClick={handleToggle}
            disabled={isToggling}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none disabled:opacity-50 ${
              isRunning ? 'bg-indigo-600' : 'bg-neutral-800 border border-neutral-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isRunning ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Conteúdo quando ativo */}
      {isRunning ? (
        <div className="space-y-3 animate-in fade-in">
          {/* Status Badge */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>
                Servidor de overlay escutando na porta{' '}
                <strong className="font-mono text-emerald-200">{overlayStatus?.port || 47850}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={handleOpenPreview}
              className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 font-medium transition cursor-pointer"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Abrir Prévia</span>
            </button>
          </div>

          {/* Campo da URL do OBS */}
          <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                URL para OBS Browser Source
              </label>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar URL'}</span>
              </button>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-indigo-300 select-all truncate">
              {overlayUrl}
            </div>

            <p className="text-[11px] text-neutral-400 pt-1 leading-relaxed">
              💡 <strong>Como usar no OBS Studio:</strong> Clique em <code className="text-neutral-300">+ &gt; Navegador (Browser Source)</code>, cole a URL acima e configure a resolução para <code className="text-neutral-300">460 x 500</code>. O fundo é 100% transparente.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-neutral-950/40 border border-dashed border-neutral-800 text-center">
          <p className="text-xs text-neutral-400">
            O servidor de overlay está desligado no momento. Ative a chave acima para gerar a URL transparente para o OBS Studio.
          </p>
        </div>
      )}
    </div>
  );
};
