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
import { Tv, Plus } from 'lucide-react';
import { StreamConfig } from './types';

export default function App() {
  const {
    init,
    activeTab,
    config,
    platformFilter,
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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100 font-sans">
      {/* Top Header */}
      <Header />

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Dynamic Content Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-neutral-950 to-neutral-900/30">
          {activeTab === 'streams' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Livestreams Conectadas
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    Gerencie suas transmissões da Twitch e Kick. Streams em vigília/offline consomem 0 MB de memória.
                  </p>
                </div>

                <button
                  onClick={() => setAddStreamOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Stream</span>
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
