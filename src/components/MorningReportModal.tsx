import React from 'react';
import { useAppStore } from '../stores/appStore';
import { Sunrise, Tv, Gamepad2, Clock, CheckCircle2 } from 'lucide-react';

export const MorningReportModal: React.FC = () => {
  const { pendingMorningReport, dismissMorningReport } = useAppStore();

  if (!pendingMorningReport) return null;

  const durationHours = Math.floor(pendingMorningReport.duration_minutes / 60);
  const durationRemainderMins = pendingMorningReport.duration_minutes % 60;
  const formattedDuration =
    durationHours > 0
      ? `${durationHours}h ${durationRemainderMins}min`
      : `${pendingMorningReport.duration_minutes} minutos`;

  const liveStreamsCount = pendingMorningReport.streams_summary.filter((s) => s.was_live).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-neutral-900 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header com Tema de Amanhecer */}
        <div className="bg-gradient-to-r from-amber-950/60 via-amber-900/30 to-indigo-950/50 p-6 border-b border-amber-500/20">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
              <Sunrise className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Relatório Matinal da Madrugada</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  Modo Noturno
                </span>
              </h2>
              <p className="text-xs text-amber-200/90 mt-1">
                Bom dia! Suas contas farmaram continuamente em modo ultra-economia durante a noite.
              </p>
            </div>
          </div>
        </div>

        {/* Resumo Estatístico */}
        <div className="p-6 overflow-y-auto space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 text-center space-y-1">
              <Clock className="w-4 h-4 mx-auto text-amber-400" />
              <span className="text-[10px] uppercase font-semibold text-neutral-400 block tracking-wider">
                Tempo Farmado
              </span>
              <span className="text-sm font-bold text-white block font-mono">
                {formattedDuration}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 text-center space-y-1">
              <Gamepad2 className="w-4 h-4 mx-auto text-indigo-400" />
              <span className="text-[10px] uppercase font-semibold text-neutral-400 block tracking-wider">
                Slots PokeIdle
              </span>
              <span className="text-sm font-bold text-white block font-mono">
                {pendingMorningReport.active_game_slots.length} ativos
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 text-center space-y-1">
              <Tv className="w-4 h-4 mx-auto text-emerald-400" />
              <span className="text-[10px] uppercase font-semibold text-neutral-400 block tracking-wider">
                Lives Online
              </span>
              <span className="text-sm font-bold text-white block font-mono">
                {liveStreamsCount}/{pendingMorningReport.streams_summary.length}
              </span>
            </div>
          </div>

          {/* Lista de Streams Monitoradas */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
              Streams Acompanhadas
            </h3>
            {pendingMorningReport.streams_summary.length === 0 ? (
              <p className="text-xs text-neutral-500 italic">Nenhuma stream configurada.</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {pendingMorningReport.streams_summary.map((st, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{st.channel}</span>
                      <span className="text-[10px] text-neutral-500 font-mono">({st.platform})</span>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        st.was_live
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                      }`}
                    >
                      {st.was_live ? '● Ao Vivo na Noite' : '○ Standby / Vigília'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              A taxa de quadros (FPS) e gráficos normais foram restaurados para você jogar agora.
            </span>
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-4 bg-neutral-950/80 border-t border-neutral-800 flex justify-end">
          <button
            type="button"
            onClick={dismissMorningReport}
            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/20 transition cursor-pointer"
          >
            Fechar e Continuar
          </button>
        </div>
      </div>
    </div>
  );
};
