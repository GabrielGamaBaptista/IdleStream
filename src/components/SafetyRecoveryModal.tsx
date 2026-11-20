import React, { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { ShieldAlert, RotateCcw, AlertTriangle, Clock, Archive } from 'lucide-react';

export const SafetyRecoveryModal: React.FC = () => {
  const {
    crashLoopDetected,
    crashLoopData,
    backups,
    isLoadingBackups,
    dismissCrashLoopModal,
    restoreBackupById,
  } = useAppStore();

  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!crashLoopDetected) return null;

  const handleRestore = async (id: string) => {
    try {
      setRestoringId(id);
      setErrorMessage(null);
      await restoreBackupById(id);
      // O app é reiniciado no backend; o frontend pode fechar ou mostrar spinner
    } catch (err: unknown) {
      setRestoringId(null);
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const formatDate = (epochSecs: number) => {
    if (!epochSecs) return 'Data desconhecida';
    return new Date(epochSecs * 1000).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatReason = (reason: string) => {
    switch (reason) {
      case 'daily':
        return 'Diário Automático';
      case 'manual':
        return 'Manual';
      case 'pre-update':
        return 'Pré-Atualização';
      default:
        return reason;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-neutral-900 border border-red-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header de Emergência */}
        <div className="bg-gradient-to-r from-red-950/60 via-red-900/30 to-neutral-900 p-6 border-b border-red-500/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0 shadow-lg shadow-red-500/10">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Modo de Recuperação e Segurança</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-semibold">
                  Crash-Loop Guard
                </span>
              </h2>
              <p className="text-xs text-red-300/90 mt-1">
                O IdleStream fechou inesperadamente{' '}
                <strong className="text-white font-bold">{crashLoopData?.crash_count || 3} vezes consecutivas</strong>{' '}
                ao iniciar.
              </p>
            </div>
          </div>
        </div>

        {/* Corpo Informativo & Lista de Backups */}
        <div className="p-6 overflow-y-auto space-y-5">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div className="space-y-1">
              <p className="font-medium text-amber-200">
                Possível corrupção de configurações ou instabilidade de stream.
              </p>
              <p className="text-neutral-300">
                Para restabelecer o funcionamento estável, você pode restaurar um backup íntegro anterior abaixo. O aplicativo será reiniciado automaticamente com os dados restaurados.
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800 text-red-300 text-xs">
              {errorMessage}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                <Archive className="w-3.5 h-3.5 text-indigo-400" />
                <span>Pontos de Restauração Disponíveis</span>
              </h3>
              <span className="text-[11px] text-neutral-400 font-mono">
                {backups.length} {backups.length === 1 ? 'backup' : 'backups'}
              </span>
            </div>

            {isLoadingBackups ? (
              <div className="py-8 text-center text-xs text-neutral-400">
                Carregando backups salvos...
              </div>
            ) : backups.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-neutral-800 text-center space-y-2">
                <Clock className="w-6 h-6 mx-auto text-neutral-600" />
                <p className="text-xs text-neutral-400">
                  Nenhum backup anterior encontrado neste computador.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {backups.map((bkp, idx) => (
                  <div
                    key={bkp.id}
                    className={`p-3.5 rounded-xl border transition flex items-center justify-between ${
                      idx === 0
                        ? 'bg-neutral-800/80 border-indigo-500/40 shadow-sm'
                        : 'bg-neutral-900/60 border-neutral-800'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">
                          {formatDate(bkp.created_at)}
                        </span>
                        {idx === 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                            Mais recente
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700/60 font-medium">
                          {formatReason(bkp.reason)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-neutral-400 font-mono">
                        <span>v{bkp.version}</span>
                        <span>•</span>
                        <span>{bkp.file_count} arquivos salvos</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={Boolean(restoringId)}
                      onClick={() => handleRestore(bkp.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {restoringId === bkp.id ? (
                        <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" />
                      )}
                      <span>{restoringId === bkp.id ? 'Restaurando...' : 'Restaurar'}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé com Ação Secundária */}
        <div className="p-4 bg-neutral-950/80 border-t border-neutral-800 flex items-center justify-between">
          <span className="text-[11px] text-neutral-400">
            Você pode continuar sem restaurar se souber a causa da falha.
          </span>
          <button
            type="button"
            onClick={dismissCrashLoopModal}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition cursor-pointer"
          >
            Continuar Mesmo Assim
          </button>
        </div>
      </div>
    </div>
  );
};
