import React, { useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { Platform } from '../types';
import { X, Tv, Radio, Plus, CheckSquare, Square, Crown } from 'lucide-react';

export const AddStreamModal: React.FC = () => {
  const { isAddStreamOpen, setAddStreamOpen, config, addStream } = useAppStore();

  const [platform, setPlatform] = useState<Platform>('twitch');
  const [channelSlug, setChannelSlug] = useState('');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [selectedRewardAccountId, setSelectedRewardAccountId] = useState<string>('');
  const [autoStart, setAutoStart] = useState(true);

  const filteredAccounts = config.accounts.filter((a) => a.platform === platform);

  // Sync default selection when platform changes or accounts load
  useEffect(() => {
    if (filteredAccounts.length > 0) {
      const allIds = filteredAccounts.map((a) => a.id);
      setSelectedAccountIds(allIds);
      setSelectedRewardAccountId(allIds[0]);
    } else {
      setSelectedAccountIds([]);
      setSelectedRewardAccountId('');
    }
  }, [platform, config.accounts]);

  if (!isAddStreamOpen) return null;

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
    const allIds = filteredAccounts.map((a) => a.id);
    setSelectedAccountIds(allIds);
    if (!selectedRewardAccountId && allIds.length > 0) {
      setSelectedRewardAccountId(allIds[0]);
    }
  };

  const deselectAll = () => {
    setSelectedAccountIds([]);
    setSelectedRewardAccountId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelSlug.trim()) return;

    if (selectedAccountIds.length === 0) {
      alert('Selecione pelo menos uma conta conectada para esta stream!');
      return;
    }

    const cleanSlug = channelSlug
      .trim()
      .replace(/^https?:\/\/(www\.)?(twitch\.tv|kick\.com)\//i, '')
      .replace(/^#/, '');

    const rewardId = selectedRewardAccountId || selectedAccountIds[0];

    const newStream = {
      id: crypto.randomUUID(),
      platform,
      channel_slug: cleanSlug,
      account_ids: selectedAccountIds,
      selected_account_id: platform === 'kick' ? rewardId : undefined,
      auto_start: autoStart,
    };

    await addStream(newStream);
    setChannelSlug('');
    setAddStreamOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Adicionar Stream</h2>
          </div>
          <button
            onClick={() => setAddStreamOpen(false)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Platform selector */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Plataforma
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPlatform('twitch')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                  platform === 'twitch'
                    ? 'bg-purple-950/60 border-purple-600 text-purple-200 shadow-sm shadow-purple-600/20'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-purple-400" />
                <span>Twitch (IRC ~1MB)</span>
              </button>

              <button
                type="button"
                onClick={() => setPlatform('kick')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                  platform === 'kick'
                    ? 'bg-emerald-950/60 border-emerald-600 text-emerald-200 shadow-sm shadow-emerald-600/20'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <span>Kick (Live ~60MB)</span>
              </button>
            </div>
          </div>

          {/* Channel Slug */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Nome do Canal ou Link
            </label>
            <input
              type="text"
              required
              placeholder="ex: pokeidle_streamer"
              value={channelSlug}
              onChange={(e) => setChannelSlug(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Multi-Account Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-neutral-400">
                Contas Conectadas ({selectedAccountIds.length}/{filteredAccounts.length})
              </label>
              {filteredAccounts.length > 1 && (
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
                  >
                    Marcar todas
                  </button>
                  <span className="text-neutral-600">•</span>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="text-neutral-400 hover:text-neutral-300 transition cursor-pointer"
                  >
                    Desmarcar
                  </button>
                </div>
              )}
            </div>

            {filteredAccounts.length === 0 ? (
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-300 text-xs">
                Nenhuma conta de {platform} cadastrada. Cadastre suas contas primeiro na aba "Contas".
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {filteredAccounts.map((acc) => {
                  const isChecked = selectedAccountIds.includes(acc.id);
                  const isRewardActive = selectedRewardAccountId === acc.id;

                  return (
                    <div
                      key={acc.id}
                      onClick={() => toggleAccount(acc.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer select-none ${
                        isChecked
                          ? platform === 'kick'
                            ? 'bg-emerald-950/30 border-emerald-800/60 text-white'
                            : 'bg-purple-950/30 border-purple-800/60 text-white'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {isChecked ? (
                          <CheckSquare
                            className={`w-4 h-4 ${
                              platform === 'kick' ? 'text-emerald-400' : 'text-purple-400'
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

                      {/* For Kick: Option to designate reward account */}
                      {platform === 'kick' && isChecked && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRewardAccountId(acc.id);
                          }}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${
                            isRewardActive
                              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                              : 'bg-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                          title="Conta usada ao clicar no botão de Resgate de pontos"
                        >
                          <Crown className="w-3 h-3" />
                          <span>{isRewardActive ? 'Resgate Ativo' : 'Definir p/ Resgate'}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {platform === 'kick' && selectedAccountIds.length > 1 && (
              <p className="text-[11px] text-neutral-500 mt-1">
                Todas as contas selecionadas rodarão em segundo plano acumulando pontos. O botão de resgate abrirá a conta marcada como "Resgate Ativo".
              </p>
            )}
          </div>

          {/* Auto Start Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="autoStart"
              checked={autoStart}
              onChange={(e) => setAutoStart(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <label htmlFor="autoStart" className="text-xs text-neutral-300 cursor-pointer">
              Ativar automaticamente ao abrir o Chatter
            </label>
          </div>

          {/* Submit */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={() => setAddStreamOpen(false)}
              className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white text-xs font-medium transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={filteredAccounts.length === 0 || selectedAccountIds.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-md shadow-indigo-600/20 disabled:opacity-40 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Stream ({selectedAccountIds.length} conta{selectedAccountIds.length !== 1 ? 's' : ''})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
