import React from 'react';
import { useAppStore } from '../stores/appStore';
import {
  Users,
  Plus,
  Radio,
  Globe,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import {
  findDuplicateAuthenticatedUsernames,
  getAccountHealthStatus,
} from '../utils/accountHealth';

export const AccountManager: React.FC = () => {
  const {
    config,
    accountsHealth,
    isVerifyingAccounts,
    verifyingAccountIds,
    verifyAllAccounts,
    verifyAccount,
    removeAccount,
    openKickLogin,
    saveKickSession,
    openTwitchLogin,
    saveTwitchSession,
    startTwitchOAuth,
    setAddAccountOpen,
  } = useAppStore();

  const isAndroid = typeof window !== 'undefined' && Boolean(window.AndroidBridge);
  const duplicates = findDuplicateAuthenticatedUsernames(accountsHealth);
  const totalCount = accountsHealth?.total ?? config.accounts.length;
  const healthyCount = accountsHealth?.healthy ?? 0;

  const handleTwitchAuth = async (accountId: string, accountLabel?: string) => {
    if (window.AndroidBridge && typeof window.AndroidBridge.openTwitchLogin === 'function') {
      window.AndroidBridge.openTwitchLogin(accountId, accountLabel);
      return;
    }
    try {
      await startTwitchOAuth(accountId);
      alert('Autenticação Twitch concluída e salva!');
    } catch (e: any) {
      alert(`Falha no login Twitch: ${e}`);
    }
  };

  const handleSaveTwitch = async (accountId: string) => {
    try {
      await saveTwitchSession(accountId);
      alert('Sessão da Twitch capturada e salva com sucesso! Os cookies foram armazenados.');
    } catch (e: any) {
      alert(`Erro ao salvar sessão da Twitch: ${e}`);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">Gerenciamento de Contas</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Cadastre suas contas da Twitch e Kick com sessões isoladas e verificação contínua.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {config.accounts.length > 0 && (
            <button
              type="button"
              onClick={() => verifyAllAccounts()}
              disabled={isVerifyingAccounts}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 text-xs font-semibold transition cursor-pointer disabled:opacity-60"
              title="Testar imediatamente se todas as contas estão logadas e funcionais nas APIs da Twitch e Kick"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isVerifyingAccounts ? 'animate-spin text-sky-400' : 'text-emerald-400'}`}
              />
              <span>
                {isVerifyingAccounts
                  ? `Verificando (${healthyCount}/${totalCount})...`
                  : `Verificar Todas (${healthyCount}/${totalCount})`}
              </span>
            </button>
          )}
          <button
            onClick={() => setAddAccountOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Conta</span>
          </button>
        </div>
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
            const health = getAccountHealthStatus(accountsHealth, account.id);
            const isSingleChecking =
              Boolean(verifyingAccountIds[account.id]) || health?.state === 'checking';
            const authUserLower = health?.authenticated_username?.trim().toLowerCase();
            const isDuplicate = Boolean(
              authUserLower && duplicates[authUserLower] && duplicates[authUserLower].includes(account.id)
            );

            return (
              <div
                key={account.id}
                className={`bg-neutral-900/60 border rounded-xl p-4 flex flex-col justify-between transition ${
                  health?.state === 'invalid' || health?.state === 'missing_credentials'
                    ? 'border-rose-800/70 hover:border-rose-700'
                    : isDuplicate
                    ? 'border-amber-700/70 hover:border-amber-600'
                    : 'border-neutral-800 hover:border-neutral-700'
                }`}
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

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => verifyAccount(account.id)}
                        disabled={isSingleChecking || isVerifyingAccounts}
                        className="text-neutral-500 hover:text-sky-400 transition cursor-pointer p-1 disabled:opacity-50"
                        title="Verificar sessão desta conta agora"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSingleChecking ? 'animate-spin text-sky-400' : ''}`} />
                      </button>

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
                  </div>

                  <h3 className="text-base font-bold text-white mt-3 truncate">
                    {account.label}
                  </h3>
                  <p className="text-xs text-neutral-400 font-mono mt-0.5 truncate">
                    @{account.username || health?.authenticated_username || 'sem_username'}
                  </p>

                  {/* Auth & Real-Time API Health Status */}
                  <div className="mt-3 space-y-1.5">
                    {isSingleChecking ? (
                      <div className="flex items-center gap-1.5 text-xs text-sky-400">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                        <span>Verificando sessão na API...</span>
                      </div>
                    ) : health ? (
                      <>
                        {health.state === 'healthy' ? (
                          <div className="flex items-start gap-1.5 text-xs text-emerald-400">
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{health.message}</span>
                          </div>
                        ) : health.state === 'invalid' || health.state === 'missing_credentials' ? (
                          <div className="flex items-start gap-1.5 text-xs text-rose-400">
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{health.message}</span>
                          </div>
                        ) : (
                          <div className="flex items-start gap-1.5 text-xs text-amber-400">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{health.message}</span>
                          </div>
                        )}

                        {health.username_matches === false && health.authenticated_username && (
                          <div className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-800/50 rounded px-2 py-1">
                            Conta autenticada como <strong>@{health.authenticated_username}</strong>{' '}
                            (cadastro diz @{account.username}).
                          </div>
                        )}

                        {isDuplicate && health.authenticated_username && (
                          <div className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-800/50 rounded px-2 py-1">
                            Duplicada: @{health.authenticated_username} também está logada em outro slot!
                          </div>
                        )}
                      </>
                    ) : isTwitch ? (
                      hasToken ? (
                        <div className="flex items-center gap-1.5 text-xs text-purple-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Sessão & Cookies configurados</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Login pendente (abra e salve a sessão)</span>
                        </div>
                      )
                    ) : (account.kick_session || account.session_token) ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Sessão & Cookies configurados</span>
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
                    isAndroid ? (
                      <button
                        onClick={() => handleTwitchAuth(account.id, account.label)}
                        className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm ${
                          hasToken
                            ? 'bg-purple-950/80 hover:bg-purple-900/80 text-purple-200 border border-purple-800/60'
                            : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>{hasToken ? 'Reautenticar Twitch (Cookies)' : 'Fazer Login na Twitch'}</span>
                      </button>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => openTwitchLogin(account.id)}
                          className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 border border-purple-800/60 text-xs font-medium transition cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{hasToken ? '1. Reabrir Janela Twitch' : '1. Abrir Login Twitch'}</span>
                        </button>
                        <button
                          onClick={() => handleSaveTwitch(account.id)}
                          className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition cursor-pointer shadow-sm shadow-purple-600/30"
                          title="Após logar na janela aberta, clique aqui para capturar os cookies e fechar a janela"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>2. Capturar & Salvar Sessão</span>
                        </button>
                        <button
                          onClick={() => handleTwitchAuth(account.id)}
                          className="text-[10px] text-neutral-500 hover:text-neutral-400 py-0.5 text-center transition cursor-pointer"
                        >
                          Ou autenticar via navegador externo (OAuth)
                        </button>
                      </div>
                    )
                  ) : isAndroid ? (
                    <button
                      onClick={() => window.AndroidBridge?.openKickLogin(account.id, account.label)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer shadow-sm shadow-emerald-600/30"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>
                        {account.kick_session || account.session_token
                          ? 'Reautenticar Kick'
                          : 'Fazer Login no Kick'}
                      </span>
                    </button>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => openKickLogin(account.id)}
                        className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-200 border border-emerald-800/60 text-xs font-medium transition cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{(account.kick_session || account.session_token) ? '1. Reabrir Janela Kick' : '1. Abrir Login no Kick'}</span>
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
