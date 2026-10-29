import React from 'react';
import { useAppStore } from '../stores/appStore';
import { Tv, Users, Settings } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, config } = useAppStore();

  const streamsCount = config.streams.length;
  const accountsCount = config.accounts.length;

  return (
    <nav className="md:hidden border-t border-neutral-800 bg-neutral-950/95 backdrop-blur-md px-4 py-2 flex items-center justify-around select-none z-50 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <button
        onClick={() => setActiveTab('streams')}
        className={`flex flex-col items-center justify-center py-1 px-4 rounded-xl transition cursor-pointer relative ${
          activeTab === 'streams' ? 'text-indigo-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        <div className="relative">
          <Tv className="w-5 h-5" />
          {streamsCount > 0 && (
            <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full bg-indigo-600 text-[10px] text-white font-bold font-mono">
              {streamsCount}
            </span>
          )}
        </div>
        <span className="text-[11px] mt-1">Streams</span>
      </button>

      <button
        onClick={() => setActiveTab('accounts')}
        className={`flex flex-col items-center justify-center py-1 px-4 rounded-xl transition cursor-pointer relative ${
          activeTab === 'accounts' ? 'text-emerald-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        <div className="relative">
          <Users className="w-5 h-5" />
          {accountsCount > 0 && (
            <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full bg-emerald-600 text-[10px] text-white font-bold font-mono">
              {accountsCount}
            </span>
          )}
        </div>
        <span className="text-[11px] mt-1">Contas</span>
      </button>

      <button
        onClick={() => setActiveTab('settings')}
        className={`flex flex-col items-center justify-center py-1 px-4 rounded-xl transition cursor-pointer ${
          activeTab === 'settings' ? 'text-neutral-200 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        <Settings className="w-5 h-5" />
        <span className="text-[11px] mt-1">Ajustes</span>
      </button>
    </nav>
  );
};
