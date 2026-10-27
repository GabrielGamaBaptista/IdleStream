import React, { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { Platform } from '../types';
import { X, Users, Radio, Key, Globe, Plus } from 'lucide-react';

export const AddAccountModal: React.FC = () => {
  const { isAddAccountOpen, setAddAccountOpen, addAccount, startTwitchOAuth } = useAppStore();

  const [platform, setPlatform] = useState<Platform>('twitch');
  const [label, setLabel] = useState('');
  const [username, setUsername] = useState('');
  const [oauthToken, setOauthToken] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  if (!isAddAccountOpen) return null;

  const handleTwitchBrowserAuth = async () => {
    setIsAuthenticating(true);
    try {
      // Temporary account id for flow
      const tempId = crypto.randomUUID();
      const token = await startTwitchOAuth(tempId);
      if (token) {
        setOauthToken(token);
      }
    } catch (err: any) {
      alert(`Erro na autenticação: ${err}`);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !username.trim()) return;

    const newAccount = {
      id: crypto.randomUUID(),
      platform,
      label: label.trim(),
      username: username.trim().toLowerCase(),
      oauth_token: oauthToken.trim() || undefined,
      enabled: true,
    };

    await addAccount(newAccount);
    setLabel('');
    setUsername('');
    setOauthToken('');
    setAddAccountOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Cadastrar Conta</h2>
          </div>
          <button
            onClick={() => setAddAccountOpen(false)}
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
                <span>Twitch</span>
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
                <span>Kick</span>
              </button>
            </div>
          </div>

          {/* Friendly Label */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Nome Amigável / Rótulo
            </label>
            <input
              type="text"
              required
              placeholder="ex: Conta Principal ou Smurf 1"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Nome de Usuário ({platform === 'twitch' ? 'Twitch Nick' : 'Kick Nick'})
            </label>
            <input
              type="text"
              required
              placeholder="ex: meu_usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Twitch OAuth Token options */}
          {platform === 'twitch' ? (
            <div className="space-y-2 pt-2 border-t border-neutral-800">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-neutral-400">
                  Token OAuth da Twitch
                </label>
                <button
                  type="button"
                  onClick={handleTwitchBrowserAuth}
                  disabled={isAuthenticating}
                  className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{isAuthenticating ? 'Aguardando no navegador...' : 'Gerar via Navegador'}</span>
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  placeholder="Cole aqui seu token OAuth (ou use o botão acima)"
                  value={oauthToken}
                  onChange={(e) => setOauthToken(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-purple-500 transition font-mono"
                />
              </div>
              <p className="text-[11px] text-neutral-500">
                Você pode usar o botão "Gerar via Navegador" ou colar um token gerado (ex: twitchapps.com/tmi).
              </p>
            </div>
          ) : (
            <div className="pt-2 border-t border-neutral-800">
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-400 space-y-1">
                <p className="font-semibold text-emerald-400">Autenticação Kick isolada:</p>
                <p>
                  Após salvar esta conta, clique no botão <strong>"Fazer Login no Kick"</strong> na lista de contas. Uma janela de navegação segura será aberta com cookies independentes para você logar!
                </p>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={() => setAddAccountOpen(false)}
              className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white text-xs font-medium transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Conta</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
