import React from 'react';
import { useAppStore } from '../stores/appStore';
import { Play, Square, Activity, Cpu, Radio } from 'lucide-react';
import packageJson from '../../package.json';

export const Header: React.FC = () => {
  const { config, statuses, startAll, stopAll } = useAppStore();

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
    <header className="h-16 border-b border-neutral-800 bg-neutral-900/90 backdrop-blur px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
          <Radio className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-white tracking-tight">IdleStream</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-mono">
              v{packageJson.version}
            </span>
          </div>
          <p className="text-xs text-neutral-400">Stream Presence & XP Manager</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Resource & Status Badges */}
        <div className="flex items-center gap-4 bg-neutral-950/70 border border-neutral-800/80 px-4 py-1.5 rounded-lg text-xs">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-neutral-400">Ao Vivo:</span>
            <span className="font-semibold text-emerald-400">
              {activeStreams}
            </span>
            {standbyStreams > 0 && (
              <span className="text-indigo-400 font-medium">
                ({standbyStreams} em vigília)
              </span>
            )}
            <span className="text-neutral-600">/ {totalStreams}</span>
          </div>
          <div className="w-px h-3.5 bg-neutral-800" />
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-neutral-400">RAM Est.:</span>
            <span className="font-semibold text-indigo-300">
              ~{totalRamMb} MB
            </span>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
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
