import React, { useEffect, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { Tv, Gamepad2, Users, Settings, Vote } from 'lucide-react';
import { countReadyVoteAccounts, DEFAULT_VOTE_ACCOUNTS } from '../services/votePlatformService';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, config } = useAppStore();
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 15000);
    return () => clearInterval(id);
  }, []);

  const streamsCount = config.streams.length;
  const accountsCount = config.accounts.length;
  const voteAccounts = config.vote_accounts && config.vote_accounts.length > 0
    ? config.vote_accounts
    : DEFAULT_VOTE_ACCOUNTS;
  const readyVotesCount = countReadyVoteAccounts(voteAccounts, nowSec);

  return (
    <nav className="md:hidden border-t border-neutral-800 bg-neutral-950/95 backdrop-blur-md px-2 py-2 flex items-center justify-around select-none z-50 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <button
        onClick={() => setActiveTab('streams')}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer relative ${
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
        onClick={() => setActiveTab('games')}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer relative ${
          activeTab === 'games' ? 'text-indigo-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        <div className="relative">
          <Gamepad2 className="w-5 h-5" />
          <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full bg-indigo-600 text-[10px] text-white font-bold font-mono">
            4
          </span>
        </div>
        <span className="text-[11px] mt-1">Jogos</span>
      </button>

      <button
        onClick={() => setActiveTab('votes')}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer relative ${
          activeTab === 'votes' ? 'text-amber-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        <div className="relative">
          <Vote className="w-5 h-5" />
          {readyVotesCount > 0 && (
            <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full bg-emerald-600 text-[10px] text-white font-bold font-mono animate-pulse">
              {readyVotesCount}
            </span>
          )}
        </div>
        <span className="text-[11px] mt-1">Votos</span>
      </button>

      <button
        onClick={() => setActiveTab('accounts')}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer relative ${
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
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer ${
          activeTab === 'settings' ? 'text-neutral-200 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        <Settings className="w-5 h-5" />
        <span className="text-[11px] mt-1">Ajustes</span>
      </button>
    </nav>
  );
};
