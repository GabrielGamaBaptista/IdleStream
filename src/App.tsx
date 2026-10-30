import { useEffect, useState } from 'react';
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
import { Tv, Plus } from 'lucide-react';
import { StreamConfig } from './types';

export default function App() {
  const {
    init,
    activeTab,
    config,
    platformFilter,
    setPlatformFilter,
    setAddStreamOpen,
  } = useAppStore();

  const [editingStream, setEditingStream] = useState<StreamConfig | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  const displayedStreams = config.streams.filter((s) => {
    if (platformFilter === 'all') return true;
    return s.platform === platformFilter;
  });

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100 font-sans pt-[env(safe-area-inset-top)]">
      {/* Top Header */}
      <Header />

      {/* Main Container */}
      <div className="flex flex-1 min-h-0 overflow-hidden bg-neutral-950">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Dynamic Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6 bg-neutral-950">
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

                <button
                  onClick={() => setAddStreamOpen(true)}
                  className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Stream</span>
                </button>
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
      <StatusBar />

      {/* Mobile Bottom Navigation */}
      <BottomNav />

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
