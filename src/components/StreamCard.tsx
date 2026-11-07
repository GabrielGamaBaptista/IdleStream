import React, { useState, useEffect } from 'react';
import { StreamConfig } from '../types';
import { useAppStore } from '../stores/appStore';
import { formatUptime, formatPoints } from '../utils/format';
import {
  Play,
  Square,
  Trash2,
  Radio,
  AlertCircle,
  Clock,
  Cpu,
  Moon,
  Pencil,
  Users,
  ExternalLink,
} from 'lucide-react';

interface StreamCardProps {
  stream: StreamConfig;
  onEdit?: (stream: StreamConfig) => void;
}

export const StreamCard: React.FC<StreamCardProps> = ({ stream, onEdit }) => {
  const config = useAppStore((state) => state.config);
  const status = useAppStore((state) => state.statuses[stream.id]) || {
    status: 'disconnected',
    is_live: false,
    uptime_seconds: 0,
    estimated_ram_mb: 0,
  };
  const startStream = useAppStore((state) => state.startStream);
  const stopStream = useAppStore((state) => state.stopStream);
  const removeStream = useAppStore((state) => state.removeStream);
  const openStreamRedeem = useAppStore((state) => state.openStreamRedeem);

  const accountIds = stream.account_ids && stream.account_ids.length > 0
    ? stream.account_ids
    : stream.account_id
    ? [stream.account_id]
    : [];

  const streamAccounts = config.accounts.filter((a) => accountIds.includes(a.id));
  const isConnected = status.status === 'connected';
  const isStandby = status.status === 'standby';
  const isConnecting = status.status === 'connecting';
  const isError = status.status === 'error';

  const isTwitch = stream.platform === 'twitch';
  const isKick = stream.platform === 'kick';

  const [uptimeSecs, setUptimeSecs] = useState<number>(status.uptime_seconds || 0);

  useEffect(() => {
    if (isConnected && status.connected_at) {
      const update = () => {
        const now = Math.floor(Date.now() / 1000);
        setUptimeSecs(Math.max(0, now - status.connected_at!));
      };
      update();
      const interval = setInterval(update, 1000);
      return () => clearInterval(interval);
    } else {
      setUptimeSecs(0);
    }
  }, [isConnected, status.connected_at]);

  return (
    <div
      className={`relative rounded-xl border p-4 transition flex flex-col justify-between ${
        isConnected
          ? 'bg-neutral-900/90 border-neutral-700 shadow-lg shadow-black/40'
          : isStandby
          ? 'bg-neutral-900/50 border-indigo-900/50'
          : 'bg-neutral-900/30 border-neutral-800/80 hover:border-neutral-700/60'
      }`}
    >
      <div>
        {/* Header row: Platform and status badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-xs px-2 py-0.5 rounded font-semibold flex items-center gap-1.5 ${
                isTwitch
                  ? 'bg-purple-950/80 text-purple-300 border border-purple-800/60'
                  : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
              }`}
            >
              <Radio className="w-3 h-3" />
              {isTwitch ? 'Twitch' : 'Kick'}
            </span>

            {stream.auto_start && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-amber-300/90 font-mono">
                Auto
              </span>
            )}
          </div>

          {/* Status Indicator */}
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected
                  ? 'bg-emerald-400'
                  : isStandby
                  ? 'bg-indigo-400'
                  : isConnecting
                  ? 'bg-amber-400'
                  : isError
                  ? 'bg-rose-500'
                  : 'bg-neutral-600'
              }`}
            />
            <span
              className={`text-xs font-medium ${
                isConnected
                  ? 'text-emerald-400 font-semibold'
                  : isStandby
                  ? 'text-indigo-300 flex items-center gap-1'
                  : isConnecting
                  ? 'text-amber-400'
                  : isError
                  ? 'text-rose-400'
                  : 'text-neutral-500'
              }`}
            >
              {isConnected
                ? 'Ao Vivo'
                : isStandby
                ? 'Vigília (Offline)'
                : isConnecting
                ? 'Conectando...'
                : isError
                ? 'Erro'
                : 'Parada'}
            </span>
          </div>
        </div>

        {/* Channel info */}
        <div className="mt-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold text-white tracking-tight truncate">
              {stream.channel_slug}
            </h3>
            {status.channel_points && (
              <span
                className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-lg border shrink-0 ${
                  isTwitch
                    ? 'bg-purple-950/60 border-purple-800/60 text-purple-300'
                    : 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
                }`}
                title="Saldo de pontos do canal"
              >
                🪙 {formatPoints(status.channel_points)}
              </span>
            )}
          </div>
        </div>

        {/* Multi-Accounts list badge */}
        <div className="mt-2.5">
          <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1.5">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3 text-neutral-500" />
              <span>
                {streamAccounts.length} conta{streamAccounts.length !== 1 ? 's' : ''} vinculada{streamAccounts.length !== 1 ? 's' : ''}
              </span>
            </span>
            <span className="text-[10px] text-neutral-500 italic">
              Clique para resgatar
            </span>
          </div>

          {streamAccounts.length === 0 ? (
            <p className="text-xs text-neutral-500 italic">Sem contas conectadas</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-0.5">
              {streamAccounts.map((acc) => {
                const accPoints = status.account_points?.[acc.id];

                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => openStreamRedeem(stream.id, acc.id)}
                    className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition cursor-pointer text-left shadow-sm ${
                      isKick
                        ? 'bg-neutral-900/90 border-neutral-800 hover:border-emerald-600/70 hover:bg-emerald-950/30 text-neutral-300 hover:text-white'
                        : isTwitch
                        ? 'bg-purple-950/20 border-purple-900/40 hover:border-purple-600/70 hover:bg-purple-950/40 text-purple-200 hover:text-white'
                        : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                    }`}
                    title={`Abrir live de ${stream.channel_slug} como ${acc.label} (@${acc.username}) para resgatar pontos`}
                  >
                    <ExternalLink className={`w-3 h-3 shrink-0 opacity-60 group-hover:opacity-100 transition ${isTwitch ? 'text-purple-400' : 'text-emerald-400'}`} />
                    <span className="font-semibold truncate max-w-[85px]">{acc.label}</span>
                    <span className="text-neutral-500 text-[10px]">@{acc.username}</span>
                    {accPoints && (
                      <span className={`text-[10px] font-mono ml-0.5 font-bold ${isTwitch ? 'text-purple-400' : 'text-emerald-400'}`}>
                        • 🪙 {formatPoints(accPoints)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Message banner (Minerando / Prioridade / Fila de Espera) */}
        {isConnected && status.message && (
          <div className="mt-2.5 p-1.5 rounded bg-neutral-950 border border-neutral-800 flex items-center gap-1.5 text-neutral-300 text-[11px] font-mono leading-tight">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <span className="truncate">{status.message}</span>
          </div>
        )}

        {/* Error message banner */}
        {isError && status.message && (
          <div className="mt-2.5 p-2 rounded bg-rose-950/40 border border-rose-900/50 flex items-start gap-1.5 text-rose-300 text-[11px] leading-tight">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span className="truncate">{status.message}</span>
          </div>
        )}

        {/* Connecting message banner */}
        {isConnecting && status.message && (
          <div className="mt-2.5 p-2 rounded bg-amber-950/30 border border-amber-900/40 flex items-start gap-1.5 text-amber-300 text-[11px] leading-tight">
            <Radio className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-400 animate-pulse" />
            <span className="truncate">{status.message}</span>
          </div>
        )}

        {/* Standby info notice */}
        {isStandby && (
          <div className="mt-2.5 p-2 rounded bg-indigo-950/30 border border-indigo-900/40 flex items-start gap-1.5 text-indigo-300 text-[11px] leading-tight">
            <Moon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-indigo-400" />
            <span className="truncate">{status.message || 'Aguardando streamer iniciar a live (0 MB consumidos).'}</span>
          </div>
        )}

        {/* Runtime Metrics */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs bg-neutral-950/60 border border-neutral-800/80 rounded-lg p-2.5 font-mono">
          <div className="flex items-center gap-1.5 text-neutral-400" title="Tempo ativo">
            <Clock className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
            <span className="text-neutral-200 truncate">
              {isConnected ? formatUptime(uptimeSecs) : '--:--:--'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-neutral-400 justify-end" title="Consumo de memória">
            <Cpu className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
            <span className="text-neutral-200 truncate">
              {isConnected ? `~${status.estimated_ram_mb} MB` : '0 MB'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {/* Main Toggle Button */}
          {isConnected || isStandby || isConnecting ? (
            <button
              onClick={() => stopStream(stream.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-rose-400 hover:text-rose-300 text-xs font-medium border border-neutral-700 transition cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Parar</span>
            </button>
          ) : (
            <button
              onClick={() => startStream(stream.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition shadow-sm hover:shadow-emerald-500/20 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Ativar</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Edit button */}
          {onEdit && (
            <button
              onClick={() => onEdit(stream)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-indigo-300 hover:bg-neutral-800 transition cursor-pointer"
              title="Editar stream e contas"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delete button */}
          <button
            onClick={() => {
              if (confirm(`Remover stream "${stream.channel_slug}"?`)) {
                removeStream(stream.id);
              }
            }}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition cursor-pointer"
            title="Remover stream"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};