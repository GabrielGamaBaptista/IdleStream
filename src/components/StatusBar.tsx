import React from 'react';
import { useAppStore } from '../stores/appStore';
import { HardDrive, ShieldCheck } from 'lucide-react';

export const StatusBar: React.FC = () => {
  const { config, statuses } = useAppStore();

  const twitchActive = config.streams.filter(
    (s) => s.platform === 'twitch' && statuses[s.id]?.status === 'connected'
  ).length;

  const kickActive = config.streams.filter(
    (s) => s.platform === 'kick' && statuses[s.id]?.status === 'connected'
  ).length;

  const standbyCount = config.streams.filter(
    (s) => statuses[s.id]?.status === 'standby'
  ).length;

  const totalRam = Object.values(statuses)
    .filter((s) => s.status === 'connected')
    .reduce((acc, curr) => acc + curr.estimated_ram_mb, 30);

  return (
    <footer className="h-9 border-t border-neutral-800 bg-neutral-900/90 px-6 flex items-center justify-between text-xs text-neutral-400 select-none">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <span>Twitch:</span>
          <span className="font-semibold text-neutral-200">{twitchActive} ao vivo</span>
        </div>

        <div className="w-px h-3 bg-neutral-800" />

        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Kick:</span>
          <span className="font-semibold text-neutral-200">{kickActive} ao vivo</span>
        </div>

        {standbyCount > 0 && (
          <>
            <div className="w-px h-3 bg-neutral-800" />
            <div className="flex items-center gap-1.5 text-indigo-400">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>{standbyCount} em vigília (0 MB)</span>
            </div>
          </>
        )}

        <div className="w-px h-3 bg-neutral-800" />

        <div className="flex items-center gap-1.5">
          <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
          <span>Total RAM:</span>
          <span className="font-mono text-neutral-200 font-semibold">~{totalRam} MB</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-neutral-400">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>IdleStream • Multi-Contas Segregadas</span>
      </div>
    </footer>
  );
};
