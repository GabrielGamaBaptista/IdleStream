import { useEffect, useState, useMemo } from 'react';
import { useAppStore } from './stores/appStore';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { StreamCard } from './components/StreamCard';
import { AccountManager } from './components/AccountManager';
import { SettingsTab } from './components/SettingsTab';
import { StatusBar } from './components/StatusBar';
import { AddStreamModal } from './components/AddStreamModal';
import { EditStreamModal } from './components/EditStreamModal';
import { AddAccountModal } from './components/AddAccountModal';
import { BottomNav } from './components/BottomNav';
import { BatteryBanner } from './components/BatteryBanner';
import { GameWorkspace } from './components/games/GameWorkspace';
import { VoteWorkspace } from './components/votes/VoteWorkspace';
import { Tv, Plus, ShieldAlert, RefreshCw, ArrowUpDown, Shrink } from 'lucide-react';
import { StreamConfig } from './types';
import { getStreamPoints } from './utils/format';
import {
  findDuplicateAuthenticatedUsernames,
  getFailingAccounts,
} from './utils/accountHealth';

export default function App() {
  const {
    init,
    activeTab,
    setActiveTab,
    config,
    accountsHealth,
    isVerifyingAccounts,
    verifyAllAccounts,
    platformFilter,
    setPlatformFilter,
    setAddStreamOpen,
    isImmersiveMode,
    toggleImmersiveMode,
    statuses,
  } = useAppStore();

  const failingAccounts = getFailingAccounts(accountsHealth);
  const duplicateUsernames = findDuplicateAuthenticatedUsernames(accountsHealth);
  const duplicateEntries = Object.entries(duplicateUsernames);

  const [editingStream, setEditingStream] = useState<StreamConfig | null>(null);
  const [streamSort, setStreamSort] = useState<'default' | 'points_desc' | 'points_asc' | 'alpha'>('default');

  useEffect(() => {
    init();
  }, [init]);

  const isFullscreen = isImmersiveMode;

  // Filtra e ordena lives: separa Twitch e Kick, com opção de ordenação por saldo de pontos ou nome
  const displayedStreams = useMemo(() => {
    const filtered = config.streams.filter((s) => {
      if (platformFilter === 'all') return true;
      return s.platform === platformFilter;
    });

    return [...filtered].sort((a, b) => {
      // 1. Sempre separa Twitch e Kick quando em exibição conjunta
      if (platformFilter === 'all' && a.platform !== b.platform) {
        return a.platform === 'twitch' ? -1 : 1;
      }

      // 2. Ordenação por pontos ou alfabética
      if (streamSort === 'points_desc') {
        const ptsA = getStreamPoints(statuses[a.id]);
        const ptsB = getStreamPoints(statuses[b.id]);
        if (ptsB !== ptsA) return ptsB - ptsA;
      } else if (streamSort === 'points_asc') {
        const ptsA = getStreamPoints(statuses[a.id]);
        const ptsB = getStreamPoints(statuses[b.id]);
        if (ptsA !== ptsB) return ptsA - ptsB;
      } else if (streamSort === 'alpha') {
        return a.channel_slug.localeCompare(b.channel_slug);
      }

      return 0;
    });
  }, [config.streams, platformFilter, streamSort, statuses]);

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100 font-sans pt-[env(safe-area-inset-top,0px)]"
    >
      {/* Top Header */}
      {!isFullscreen && <Header />}

      {/* Main Container */}
      <div className="flex flex-1 min-h-0 overflow-hidden bg-neutral-950">
        {/* Left Sidebar */}
        {!isFullscreen && <Sidebar />}

        {/* Dynamic Content Area */}
        <main
          className={`flex-1 min-h-0 bg-neutral-950 ${
            activeTab === 'games' || activeTab === 'votes'
              ? 'p-0 overflow-hidden flex flex-col'
              : 'overflow-y-auto p-4 md:p-6 pb-20 md:pb-6'
          }`}
        >
          {/* Alerta global se alguma das 8 contas estiver desconectada ou duplicada */}
          {(failingAccounts.length > 0 || duplicateEntries.length > 0) &&
            activeTab !== 'games' &&
            activeTab !== 'votes' && (
              <div className="mb-5 rounded-xl border border-rose-800/80 bg-rose-950/40 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md shadow-rose-950/30">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    {failingAccounts.length > 0 && (
                      <p className="font-semibold text-rose-200">
                        {failingAccounts.length} conta{failingAccounts.length > 1 ? 's' : ''}{' '}
                        desconectada{failingAccounts.length > 1 ? 's' : ''} ou com sessão
                        incompleta:{' '}
                        <span className="font-mono text-rose-300">
                          {failingAccounts
                            .map((a) => `${a.label} (${a.platform.toUpperCase()})`)
                            .join(', ')}
                        </span>
                      </p>
                    )}
                    {duplicateEntries.length > 0 && (
                      <p className="text-amber-300 mt-0.5 font-medium">
                        Contas duplicadas detectadas na mesma plataforma:{' '}
                        {duplicateEntries.map(([u, ids]) => `@${u} (${ids.length}x)`).join(', ')}
                      </p>
                    )}
                    <p className="text-rose-300/80 mt-0.5">
                      Reconecte antes de resgatar pontos para evitar pedidos de login inesperados.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => verifyAllAccounts()}
                    disabled={isVerifyingAccounts}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 text-xs font-medium transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isVerifyingAccounts ? 'animate-spin' : ''}`}
                    />
                    <span>Reverificar</span>
                  </button>
                  {activeTab !== 'accounts' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('accounts')}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition cursor-pointer"
                    >
                      Ir para Contas
                    </button>
                  )}
                </div>
              </div>
            )}

          {activeTab === 'games' && <GameWorkspace />}

          {activeTab === 'votes' && <VoteWorkspace />}

          {activeTab === 'streams' && (
            <div className="space-y-6">
              <BatteryBanner />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">
                    Livestreams Conectadas
                  </h2>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Gerencie suas transmissões. Streams em vigília consomem 0 MB de memória.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  {/* Seletor de Ordenação de Lives */}
                  <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-neutral-300 shadow-xs">
                    <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="text-neutral-500 hidden sm:inline">Ordenar:</span>
                    <select
                      value={streamSort}
                      onChange={(e) => setStreamSort(e.target.value as any)}
                      className="bg-transparent text-white focus:outline-none cursor-pointer text-xs"
                      title="Ordenar lives (separando Twitch e Kick)"
                    >
                      <option value="default" className="bg-neutral-900 text-white">Padrão</option>
                      <option value="points_desc" className="bg-neutral-900 text-white">Mais Pontos 🪙</option>
                      <option value="points_asc" className="bg-neutral-900 text-white">Menos Pontos</option>
                      <option value="alpha" className="bg-neutral-900 text-white">Nome (A-Z)</option>
                    </select>
                  </div>

                  <button
                    onClick={() => setAddStreamOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-md shadow-indigo-600/20 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Stream</span>
                  </button>
                </div>
              </div>

              {/* Mobile Platform Filter Pills */}
              <div className="flex md:hidden items-center gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setPlatformFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition shrink-0 ${
                    platformFilter === 'all'
                      ? 'bg-neutral-800 text-white font-semibold border border-neutral-700'
                      : 'text-neutral-400 bg-neutral-900/60'
                  }`}
                >
                  Todas ({config.streams.length})
                </button>
                <button
                  onClick={() => setPlatformFilter('twitch')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition shrink-0 ${
                    platformFilter === 'twitch'
                      ? 'bg-purple-950/80 text-purple-200 border border-purple-800/60 font-semibold'
                      : 'text-neutral-400 bg-neutral-900/60'
                  }`}
                >
                  Twitch ({config.streams.filter((s) => s.platform === 'twitch').length})
                </button>
                <button
                  onClick={() => setPlatformFilter('kick')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition shrink-0 ${
                    platformFilter === 'kick'
                      ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-800/60 font-semibold'
                      : 'text-neutral-400 bg-neutral-900/60'
                  }`}
                >
                  Kick ({config.streams.filter((s) => s.platform === 'kick').length})
                </button>
              </div>

              {/* Streams Grid or Empty State */}
              {displayedStreams.length === 0 ? (
                <div className="border border-dashed border-neutral-800 rounded-2xl p-12 text-center max-w-md mx-auto my-12">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-500 mb-3">
                    <Tv className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Nenhuma stream configurada</h3>
                  <p className="text-xs text-neutral-400 mt-1 mb-4">
                    {platformFilter !== 'all'
                      ? `Nenhuma stream da plataforma ${platformFilter} encontrada.`
                      : 'Adicione suas streams do PokeIdle para começar a acumular watch time e XP.'}
                  </p>
                  <button
                    onClick={() => setAddStreamOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Primeira Stream</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {displayedStreams.map((stream) => (
                    <StreamCard
                      key={stream.id}
                      stream={stream}
                      onEdit={(s) => setEditingStream(s)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'accounts' && <AccountManager />}

          {activeTab === 'settings' && <SettingsTab />}
        </main>
      </div>

      {/* Bottom Status Bar */}
      {!isFullscreen && <StatusBar />}

      {/* Mobile Bottom Navigation */}
      {!isFullscreen && <BottomNav />}

      {/* Floating button to exit Fullscreen when outside of games */}
      {isImmersiveMode && activeTab !== 'games' && (
        <button
          onClick={() => toggleImmersiveMode()}
          className="fixed top-3 right-3 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900/95 text-neutral-200 border border-neutral-700/80 shadow-2xl backdrop-blur-md text-xs font-semibold hover:bg-neutral-800 transition cursor-pointer animate-in fade-in"
          title="Restaurar menus do aplicativo"
        >
          <Shrink className="w-3.5 h-3.5 text-emerald-400" />
          <span>Restaurar Menus</span>
        </button>
      )}

      {/* Modals */}
      <AddStreamModal />
      <EditStreamModal
        stream={editingStream}
        isOpen={Boolean(editingStream)}
        onClose={() => setEditingStream(null)}
      />
      <AddAccountModal />
    </div>
  );
}
