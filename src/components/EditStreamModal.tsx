import React, { useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { StreamConfig } from '../types';
import { X, Settings2, Radio, CheckSquare, Square, Crown, Save } from 'lucide-react';

interface EditStreamModalProps {
  stream: StreamConfig | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditStreamModal: React.FC<EditStreamModalProps> = ({
  stream,
  isOpen,
  onClose,
}) => {
  const { config, statuses, updateStream } = useAppStore();

  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [selectedRewardAccountId, setSelectedRewardAccountId] = useState<string>('');
  const [autoStart, setAutoStart] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (stream) {
      const ids = stream.account_ids && stream.account_ids.length > 0
        ? stream.account_ids
        : stream.account_id
        ? [stream.account_id]
        : [];
      setSelectedAccountIds(ids);
      setSelectedRewardAccountId(stream.selected_account_id || ids[0] || '');
      setAutoStart(stream.auto_start ?? true);
    }
  }, [stream]);

  if (!isOpen || !stream) return null;

  const platformAccounts = config.accounts.filter((a) => a.platform === stream.platform);
  const isKick = stream.platform === 'kick';
  const status = statuses[stream.id];

  const toggleAccount = (accId: string) => {
    setSelectedAccountIds((prev) => {
      if (prev.includes(accId)) {
        const next = prev.filter((id) => id !== accId);
        if (selectedRewardAccountId === accId && next.length > 0) {
          setSelectedRewardAccountId(next[0]);
        }
        return next;
      } else {
        const next = [...prev, accId];
        if (!selectedRewardAccountId) {
          setSelectedRewardAccountId(accId);
        }
        return next;
      }
    });
  };

  const selectAll = () => {
    const allIds = platformAccounts.map((a) => a.id);
    setSelectedAccountIds(allIds);
    if (!selectedRewardAccountId && allIds.length > 0) {
      setSelectedRewardAccountId(allIds[0]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAccountIds.length === 0) {
      alert('A stream precisa de pelo menos uma conta conectada!');
      return;
    }

    setIsSaving(true);
    try {
      const rewardId = selectedRewardAccountId || selectedAccountIds[0];
      const updated: StreamConfig = {
        ...stream,
        account_ids: selectedAccountIds,
        selected_account_id: isKick ? rewardId : undefined,
        auto_start: autoStart,
      };

      await updateStream(updated);
      onClose();
    } catch (err) {
      console.error('Failed to update stream:', err);
      alert('Erro ao atualizar stream');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Settings2 className="w-5 h-5 text-indigo-400" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Editar Stream</h2>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-semibold flex items-center gap-1 ${
                    !isKick
                      ? 'bg-purple-950/80 text-purple-300 border border-purple-800/60'
                      : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                  }`}
                >
                  <Radio className="w-2.5 h-2.5" />
                  {isKick ? 'Kick' : 'Twitch'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-mono mt-0.5">{stream.channel_slug}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-neutral-400">
                Gerenciar Contas Conectadas ({selectedAccountIds.length}/{platformAccounts.length})
              </label>
              {platformAccounts.length > 1 && (
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
                >
                  Marcar todas
                </button>
              )}
            </div>

            {platformAccounts.length === 0 ? (
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-300 text-xs">
                Nenhuma conta disponível.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {platformAccounts.map((acc) => {
                  const isChecked = selectedAccountIds.includes(acc.id);
                  const isRewardActive = selectedRewardAccountId === acc.id;
                  const accPoints = status?.account_points?.[acc.id];

                  return (
                    <div
                      key={acc.id}
                      onClick={() => toggleAccount(acc.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer select-none ${
                        isChecked
                          ? isKick
                            ? 'bg-emerald-950/30 border-emerald-800/60 text-white'
                            : 'bg-purple-950/30 border-purple-800/60 text-white'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {isChecked ? (
                          <CheckSquare
                            className={`w-4 h-4 ${
                              isKick ? 'text-emerald-400' : 'text-purple-400'
                            }`}
                          />
                        ) : (
                          <Square className="w-4 h-4 text-neutral-600" />
                        )}
                        <div>
                          <div className="text-xs font-semibold text-neutral-200">
                            {acc.label}
                          </div>
                          <div className="text-[11px] text-neutral-400">@{acc.username}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Points badge if present */}
                        {isKick && isChecked && accPoints && (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-emerald-300">
                            🪙 {accPoints}
                          </span>
                        )}

                        {/* Kick reward selector */}
                        {isKick && isChecked && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRewardAccountId(acc.id);
                            }}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                              isRewardActive
                                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                                : 'bg-neutral-800 text-neutral-400 hover:text-white'
                            }`}
                            title="Esta conta será aberta ao clicar no botão de Resgate"
                          >
                            <Crown className="w-3 h-3" />
                            <span>{isRewardActive ? 'Resgate Ativo' : 'Ativar Resgate'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-2.5 p-2.5 rounded-xl bg-neutral-950/80 border border-neutral-800/80 text-[11px] text-neutral-400 leading-relaxed">
              {isKick ? (
                <span>
                  💡 <strong>Kick Multi-Contas:</strong> Todas as contas marcadas rodam simultaneamente em perfis isolados acumulando pontos. O botão "Resgatar" abrirá a janela da conta marcada com <Crown className="w-3 h-3 inline text-emerald-400 mb-0.5" />.
                </span>
              ) : (
                <span>
                  💡 <strong>Twitch Multi-Contas:</strong> Cada conta marcada se conecta ao chat IRC do canal de forma independente (~1MB de RAM cada).
                </span>
              )}
            </div>
          </div>

          {/* Auto Start Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="editAutoStart"
              checked={autoStart}
              onChange={(e) => setAutoStart(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <label htmlFor="editAutoStart" className="text-xs text-neutral-300 cursor-pointer">
              Ativar automaticamente ao abrir o aplicativo
            </label>
          </div>

          {/* Footer buttons */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white text-xs font-medium transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={selectedAccountIds.length === 0 || isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-md shadow-indigo-600/20 disabled:opacity-40 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
