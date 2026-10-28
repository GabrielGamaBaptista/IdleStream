import React from 'react';
import { useAppStore } from '../stores/appStore';
import { Users, Plus, Radio, Globe, Trash2, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';

export const AccountManager: React.FC = () => {
  const { config, removeAccount, openKickLogin, saveKickSession, startTwitchOAuth, setAddAccountOpen } = useAppStore();

  const handleTwitchAuth = async (accountId: string) => {
    try {
      await startTwitchOAuth(accountId);
      alert('Autenticação Twitch concluída e salva!');
    } catch (e: any) {
      alert(`Falha no login Twitch: ${e}`);
    }
  };

  const handleSaveKick = async (accountId: string) => {
    try {
      await saveKickSession(accountId);
      alert('Sessão da Kick capturada e salva com sucesso! Os cookies foram armazenados.');
    } catch (e: any) {
      alert(`Erro ao salvar sessão da Kick: ${e}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Gerenciamento de Contas</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Cadastre suas contas principais e smurfs da Twitch e Kick. Cada conta Kick mantém sua sessão e cookies em pastas isoladas.
          </p>
        </div>
        <button
          onClick={() => setAddAccountOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-md shadow-emerald-600/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Conta</span>
        </button>
      </div>

      {/* Accounts List */}
      {config.accounts.length === 0 ? (
        <div className="border border-dashed border-neutral-800 rounded-2xl p-12 text-center max-w-md mx-auto my-12">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-500 mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white">Nenhuma conta cadastrada</h3>
          <p className="text-xs text-neutral-400 mt-1 mb-4">
            Adicione suas contas da Twitch e da Kick para poder vincular às livestreams.
          </p>
          <button
            onClick={() => setAddAccountOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Primeira Conta</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {config.accounts.map((account) => {
            const isTwitch = account.platform === 'twitch';
            const hasToken = isTwitch && !!account.oauth_token;

            return (
              <div
                key={account.id}
                className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between hover:border-neutral-700 transition"
              >
                <div>
                  <div className="flex items-center justify-between">
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

                    <button
                      onClick={() => {
                        if (confirm(`Remover conta "${account.label}"? Suas streams associadas também serão removidas.`)) {
                          removeAccount(account.id);
                        }
                      }}
                      className="text-neutral-500 hover:text-rose-400 transition cursor-pointer p-1"
                      title="Excluir conta"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-white mt-3 truncate">
                    {account.label}
                  </h3>
                  <p className="text-xs text-neutral-400 font-mono mt-0.5 truncate">
                    @{account.username}
                  </p>

                  {/* Auth status pill */}
                  <div className="mt-3">
                    {isTwitch ? (
                      hasToken ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Token OAuth configurado</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Pendente de autenticação</span>
                        </div>
                      )
                    ) : account.kick_session ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Sessão & Cookies autenticados</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-amber-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Login pendente (abra e salve a sessão)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Account Action Buttons */}
                <div className="mt-4 pt-3 border-t border-neutral-800 space-y-2">
                  {isTwitch ? (
                    <button
                      onClick={() => handleTwitchAuth(account.id)}
                      className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 border border-purple-800/60 text-xs font-medium transition cursor-pointer"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>{hasToken ? 'Reautenticar Twitch' : 'Autenticar com Twitch'}</span>
                    </button>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => openKickLogin(account.id)}
                        className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-200 border border-emerald-800/60 text-xs font-medium transition cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{account.kick_session ? '1. Reabrir Janela Kick' : '1. Abrir Login no Kick'}</span>
                      </button>
                      <button
                        onClick={() => handleSaveKick(account.id)}
                        className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer shadow-sm shadow-emerald-600/30"
                        title="Após logar na janela aberta, clique aqui para capturar os cookies e fechar a janela"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>2. Capturar & Salvar Sessão</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
