import React, { useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { StreamConfig } from '../types';
import { formatPoints } from '../utils/format';
import { X, Settings2, Radio, CheckSquare, Square, Save } from 'lucide-react';

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

  const [channelSlug, setChannelSlug] = useState('');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [autoStart, setAutoStart] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (stream) {
      setChannelSlug(stream.channel_slug);
      const ids = stream.account_ids && stream.account_ids.length > 0
        ? stream.account_ids
        : stream.account_id
        ? [stream.account_id]
        : [];
      setSelectedAccountIds(ids);
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
        return prev.filter((id) => id !== accId);
      } else {
        return [...prev, accId];
      }
    });
  };

  const selectAll = () => {
    const allIds = platformAccounts.map((a) => a.id);
    setSelectedAccountIds(allIds);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSlug = channelSlug
      .trim()
      .replace(/^https?:\/\/(www\.)?(twitch\.tv|kick\.com)\//i, '')
      .replace(/^#/, '');

    if (!cleanSlug) {
      alert('O nome do canal ou link não pode ser vazio!');
      return;
    }

    if (selectedAccountIds.length === 0) {
      alert('A stream precisa de pelo menos uma conta conectada!');
      return;
    }

    setIsSaving(true);
    try {
      const activeAccountId =
        stream.selected_account_id && selectedAccountIds.includes(stream.selected_account_id)
          ? stream.selected_account_id
          : selectedAccountIds[0];

      const updated: StreamConfig = {
        ...stream,
        channel_slug: cleanSlug,
        account_ids: selectedAccountIds,
        selected_account_id: isKick ? activeAccountId : undefined,
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
          {/* Stream Name / Link Input */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Nome do Canal ou Link
            </label>
            <input
              type="text"
              required
              placeholder="ex: pokeidle_streamer ou kick.com/streamer"
              value={channelSlug}
              onChange={(e) => setChannelSlug(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Accounts list */}
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
                            🪙 {formatPoints(accPoints)} pts
                          </span>
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
                  💡 <strong>Kick Multi-Contas:</strong> Todas as contas marcadas acumulam pontos de transmissão simultaneamente em segundo plano.
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