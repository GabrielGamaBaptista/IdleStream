import React, { useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { Account } from '../types';
import { X, Radio, Edit3, Check, Loader2 } from 'lucide-react';

interface EditAccountModalProps {
  account: Account | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditAccountModal: React.FC<EditAccountModalProps> = ({
  account,
  isOpen,
  onClose,
}) => {
  const { updateAccountInfo } = useAppStore();

  const [label, setLabel] = useState('');
  const [username, setUsername] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account) {
      setLabel(account.label || '');
      setUsername(account.username || '');
      setError(null);
    }
  }, [account, isOpen]);

  if (!isOpen || !account) return null;

  const isTwitch = account.platform === 'twitch';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedLabel = label.trim();
    const trimmedUsername = username.trim().toLowerCase();

    if (!trimmedLabel && !trimmedUsername) {
      setError('Por favor, informe ao menos um nome ou apelido para a conta.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await updateAccountInfo(
        account.id,
        trimmedLabel || trimmedUsername,
        trimmedUsername
      );
      onClose();
    } catch (err: any) {
      setError(`Erro ao atualizar conta: ${err?.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800/80">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isTwitch
                  ? 'bg-purple-950/80 text-purple-400 border border-purple-800/60'
                  : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
              }`}
            >
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Editar Conta</h3>
              <p className="text-xs text-neutral-400">
                Altere o apelido ou nome de usuário da sua conta
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition p-1.5 rounded-lg hover:bg-neutral-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Platform Badge */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800">
            <span className="text-xs text-neutral-400">Plataforma</span>
            <span
              className={`text-xs px-2.5 py-1 rounded font-semibold flex items-center gap-1.5 ${
                isTwitch
                  ? 'bg-purple-950/80 text-purple-300 border border-purple-800/60'
                  : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              {isTwitch ? 'Twitch' : 'Kick'}
            </span>
          </div>

          {/* Account Label */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-200">
              Apelido da Conta
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex: Conta Principal, Farm 01..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 transition"
              autoFocus
            />
            <p className="text-[11px] text-neutral-500">
              Nome de identificação exibido nos cards e listas.
            </p>
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-200">
              Nome de Usuário (@username)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 text-sm font-mono">
                @
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="nome_de_usuario"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 transition font-mono"
              />
            </div>
            <p className="text-[11px] text-neutral-500">
              Nome do usuário registrado na {isTwitch ? 'Twitch' : 'Kick'}.
            </p>
          </div>

          {error && (
            <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 rounded-xl p-3">
              {error}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 border border-neutral-700/60 transition cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white transition shadow-md cursor-pointer disabled:opacity-50 ${
                isTwitch
                  ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
