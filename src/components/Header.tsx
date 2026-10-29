import React from 'react';
import { useAppStore } from '../stores/appStore';
import { Play, Square, Activity, Cpu, Radio, Sparkles, RefreshCw } from 'lucide-react';

export const Header: React.FC = () => {
  const {
    config,
    statuses,
    startAll,
    stopAll,
    appVersion,
    updateAvailable,
    isCheckingUpdate,
    isInstallingUpdate,
    updateStatusMessage,
    checkForUpdates,
    installUpdate,
  } = useAppStore();

  const totalStreams = config.streams.length;
  const activeStreams = Object.values(statuses).filter(
    (s) => s.status === 'connected'
  ).length;
  const standbyStreams = Object.values(statuses).filter(
    (s) => s.status === 'standby'
  ).length;

  const totalRamMb = Object.values(statuses)
    .filter((s) => s.status === 'connected')
    .reduce((acc, curr) => acc + curr.estimated_ram_mb, 30);

  return (
    <header className="border-b border-neutral-800 bg-neutral-900/90 backdrop-blur px-4 md:px-6 py-2.5 md:py-0 md:h-16 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
      {/* Row 1 on mobile: Branding + Global Action Buttons (mobile) */}
      <div className="flex items-center justify-between w-full md:w-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
            <Radio className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 md:gap-2">
              <h1 className="text-base md:text-lg font-bold text-white tracking-tight">IdleStream</h1>
              <span className="text-[10px] md:text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-mono">
                v{appVersion}
              </span>

              {/* Update Available Badge */}
              {updateAvailable ? (
                <button
                  onClick={() => installUpdate()}
                  disabled={isInstallingUpdate}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] md:text-xs font-semibold shadow-md shadow-emerald-600/30 transition animate-pulse cursor-pointer"
                  title={`Nova versão v${updateAvailable.version} disponível! Clique para instalar e reiniciar automaticamente.`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{isInstallingUpdate ? 'Instalando...' : `v${updateAvailable.version}`}</span>
                </button>
              ) : (
                <button
                  onClick={() => checkForUpdates(true)}
                  disabled={isCheckingUpdate}
                  className="text-neutral-500 hover:text-neutral-300 transition cursor-pointer p-0.5"
                  title={updateStatusMessage || 'Verificar atualizações no GitHub'}
                >
                  <RefreshCw className={`w-3 h-3 ${isCheckingUpdate ? 'animate-spin text-emerald-400' : ''}`} />
                </button>
              )}
            </div>
            {updateStatusMessage && !updateAvailable ? (
              <p className="text-[10px] md:text-[11px] text-emerald-400 font-medium truncate max-w-[180px] md:max-w-none">
                {updateStatusMessage}
              </p>
            ) : (
              <p className="text-[11px] md:text-xs text-neutral-400 hidden sm:block">
                Stream Presence & XP Manager
              </p>
            )}
          </div>
        </div>

        {/* Action buttons visible directly on mobile header top row */}
        <div className="flex md:hidden items-center gap-1.5">
          <button
            onClick={startAll}
            disabled={totalStreams === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/90 active:bg-emerald-500 text-white text-xs font-medium transition shadow-sm disabled:opacity-40"
            title="Ativar todas"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Ativar</span>
          </button>
          <button
            onClick={stopAll}
            disabled={activeStreams === 0 && standbyStreams === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-800 active:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700/60 transition disabled:opacity-40"
            title="Parar todas"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>Parar</span>
          </button>
        </div>
      </div>

      {/* Row 2 on mobile: Resource & Status Badges + Desktop Controls */}
      <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
        {/* Resource & Status Badges */}
        <div className="flex items-center justify-between md:justify-start gap-2.5 md:gap-4 bg-neutral-950/70 border border-neutral-800/80 px-3 md:px-4 py-1 md:py-1.5 rounded-lg text-xs w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
            <span className="text-neutral-400 text-[11px] md:text-xs">Ao Vivo:</span>
            <span className="font-semibold text-emerald-400 text-xs">
              {activeStreams}
            </span>
            {standbyStreams > 0 && (
              <span className="text-indigo-400 font-medium text-[11px]">
                ({standbyStreams} vigília)
              </span>
            )}
            <span className="text-neutral-600 text-xs">/ {totalStreams}</span>
          </div>

          <div className="w-px h-3.5 bg-neutral-800 shrink-0" />

          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="text-neutral-400 text-[11px] md:text-xs">RAM Est.:</span>
            <span className="font-semibold text-indigo-300 font-mono text-[11px] md:text-xs">
              ~{totalRamMb} MB
            </span>
          </div>
        </div>

        {/* Global Controls on Desktop */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={startAll}
            disabled={totalStreams === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-medium transition shadow-sm hover:shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Inicia todas as streams (em vigília caso estejam offline)"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Ativar Todas
          </button>
          <button
            onClick={stopAll}
            disabled={activeStreams === 0 && standbyStreams === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700/60 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            Parar Todas
          </button>
        </div>
      </div>
    </header>
  );
};
