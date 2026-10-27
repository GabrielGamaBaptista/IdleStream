import React from 'react';
import { useAppStore } from '../stores/appStore';
import { Tv, Users, Settings, Plus, Filter } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    platformFilter,
    setPlatformFilter,
    config,
    setAddStreamOpen,
    setAddAccountOpen,
  } = useAppStore();

  const twitchStreams = config.streams.filter((s) => s.platform === 'twitch').length;
  const kickStreams = config.streams.filter((s) => s.platform === 'kick').length;

  return (
    <aside className="w-64 border-r border-neutral-800 bg-neutral-900/50 p-4 flex flex-col justify-between select-none">
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-3">
            Navegação
          </span>
          <div className="mt-2 space-y-1">
            <button
              onClick={() => setActiveTab('streams')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                activeTab === 'streams'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Tv className="w-4 h-4 text-purple-400" />
                <span>Streams</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-950 text-neutral-400 border border-neutral-800 font-mono">
                {config.streams.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('accounts')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                activeTab === 'accounts'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Contas</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-950 text-neutral-400 border border-neutral-800 font-mono">
                {config.accounts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
              }`}
            >
              <Settings className="w-4 h-4 text-neutral-400" />
              <span>Configurações</span>
            </button>
          </div>
        </div>

        {/* Platform Filters (Shown on Streams tab) */}
        {activeTab === 'streams' && (
          <div>
            <div className="flex items-center gap-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              <Filter className="w-3 h-3" />
              <span>Filtro de Plataforma</span>
            </div>
            <div className="mt-2 space-y-1">
              <button
                onClick={() => setPlatformFilter('all')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                  platformFilter === 'all'
                    ? 'bg-neutral-800/80 text-white font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/30'
                }`}
              >
                <span>Todas</span>
                <span className="font-mono text-[11px] text-neutral-400">
                  {config.streams.length}
                </span>
              </button>

              <button
                onClick={() => setPlatformFilter('twitch')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                  platformFilter === 'twitch'
                    ? 'bg-purple-950/60 text-purple-200 border border-purple-800/50'
                    : 'text-neutral-400 hover:text-purple-300 hover:bg-neutral-800/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>Twitch (IRC)</span>
                </div>
                <span className="font-mono text-[11px] text-purple-400">
                  {twitchStreams}
                </span>
              </button>

              <button
                onClick={() => setPlatformFilter('kick')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                  platformFilter === 'kick'
                    ? 'bg-emerald-950/60 text-emerald-200 border border-emerald-800/50'
                    : 'text-neutral-400 hover:text-emerald-300 hover:bg-neutral-800/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Kick (WebView)</span>
                </div>
                <span className="font-mono text-[11px] text-emerald-400">
                  {kickStreams}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Add Buttons */}
      <div className="space-y-2 pt-4 border-t border-neutral-800">
        <button
          onClick={() => setAddStreamOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition shadow-sm hover:shadow-indigo-500/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Stream</span>
        </button>

        <button
          onClick={() => setAddAccountOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-neutral-700/60 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Conta</span>
        </button>
      </div>
    </aside>
  );
};
