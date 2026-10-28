import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Account, AppConfig, AppSettings, Platform, StreamConfig, StreamRuntimeStatus } from '../types';

interface AppState {
  config: AppConfig;
  statuses: Record<string, StreamRuntimeStatus>;
  activeTab: 'streams' | 'accounts' | 'settings';
  platformFilter: 'all' | Platform;
  isAddStreamOpen: boolean;
  isAddAccountOpen: boolean;
  isInitialized: boolean;
  visibleKickWindows: Record<string, boolean>;

  setActiveTab: (tab: 'streams' | 'accounts' | 'settings') => void;
  setPlatformFilter: (filter: 'all' | Platform) => void;
  setAddStreamOpen: (open: boolean) => void;
  setAddAccountOpen: (open: boolean) => void;

  init: () => Promise<void>;
  fetchConfig: () => Promise<void>;
  fetchStatuses: () => Promise<void>;

  addAccount: (account: Account) => Promise<void>;
  removeAccount: (accountId: string) => Promise<void>;
  startTwitchOAuth: (accountId: string) => Promise<string>;
  openKickLogin: (accountId: string) => Promise<void>;
  saveKickSession: (accountId: string) => Promise<void>;

  addStream: (stream: StreamConfig) => Promise<void>;
  updateStream: (stream: StreamConfig) => Promise<void>;
  setSelectedAccount: (streamId: string, accountId: string) => Promise<void>;
  removeStream: (streamId: string) => Promise<void>;
  startStream: (streamId: string) => Promise<void>;
  stopStream: (streamId: string) => Promise<void>;
  startAll: () => Promise<void>;
  stopAll: () => Promise<void>;

  updateSettings: (settings: AppSettings) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  config: {
    accounts: [],
    streams: [],
    settings: {
      minimize_to_tray: true,
      start_with_windows: false,
      auto_reconnect: true,
      reconnect_delay_secs: 10,
      auto_live_only: true,
      kick_mute_audio: true,
      kick_hide_chat: true,
      kick_lowest_quality: true,
    },
  },
  statuses: {},
  activeTab: 'streams',
  platformFilter: 'all',
  isAddStreamOpen: false,
  isAddAccountOpen: false,
  isInitialized: false,
  visibleKickWindows: {},

  setActiveTab: (tab) => set({ activeTab: tab }),
  setPlatformFilter: (filter) => set({ platformFilter: filter }),
  setAddStreamOpen: (open) => set({ isAddStreamOpen: open }),
  setAddAccountOpen: (open) => set({ isAddAccountOpen: open }),

  init: async () => {
    if (get().isInitialized) return;

    try {
      await get().fetchConfig();
      await get().fetchStatuses();

      // Listen to backend stream status changes (event-driven, 0% CPU polling)
      await listen<StreamRuntimeStatus>('stream-status-update', (event) => {
        const status = event.payload;
        set((state) => ({
          statuses: {
            ...state.statuses,
            [status.stream_id]: status,
          },
        }));
      });

      set({ isInitialized: true });
    } catch (err) {
      console.error('Failed to initialize IdleStream store:', err);
    }
  },

  fetchConfig: async () => {
    try {
      const config = await invoke<AppConfig>('get_config');
      set({ config });
    } catch (err) {
      console.error('get_config failed:', err);
    }
  },

  fetchStatuses: async () => {
    try {
      const list = await invoke<StreamRuntimeStatus[]>('get_all_stream_statuses');
      const map: Record<string, StreamRuntimeStatus> = {};
      list.forEach((s) => {
        map[s.stream_id] = s;
      });
      set({ statuses: map });
    } catch (err) {
      console.error('get_all_stream_statuses failed:', err);
    }
  },

  addAccount: async (account) => {
    const updated = await invoke<AppConfig>('add_account', { account });
    set({ config: updated });
  },

  removeAccount: async (accountId) => {
    const updated = await invoke<AppConfig>('remove_account', { accountId });
    set({ config: updated });
  },

  startTwitchOAuth: async (accountId) => {
    const token = await invoke<string>('start_twitch_oauth', { accountId, clientId: null });
    await get().fetchConfig();
    return token;
  },

  openKickLogin: async (accountId) => {
    await invoke('open_kick_login', { accountId });
  },

  saveKickSession: async (accountId) => {
    const updated = await invoke<AppConfig>('save_kick_session', { accountId });
    set({ config: updated });
  },

  addStream: async (stream) => {
    const updated = await invoke<AppConfig>('add_stream', { stream });
    set({ config: updated });
    await get().fetchStatuses();
  },

  updateStream: async (stream) => {
    const updated = await invoke<AppConfig>('update_stream', { stream });
    set({ config: updated });
    await get().fetchStatuses();
  },

  setSelectedAccount: async (streamId, accountId) => {
    const updated = await invoke<AppConfig>('set_selected_account', { streamId, accountId });
    set({ config: updated });
    await get().fetchStatuses();
  },

  removeStream: async (streamId) => {
    const updated = await invoke<AppConfig>('remove_stream', { streamId });
    set({ config: updated });
    await get().fetchStatuses();
  },

  startStream: async (streamId) => {
    await invoke('start_stream', { streamId });
    await get().fetchStatuses();
  },

  stopStream: async (streamId) => {
    await invoke('stop_stream', { streamId });
    await get().fetchStatuses();
  },

  startAll: async () => {
    await invoke('start_all_streams');
    await get().fetchStatuses();
  },

  stopAll: async () => {
    await invoke('stop_all_streams');
    await get().fetchStatuses();
  },

  updateSettings: async (settings) => {
    const newConfig = { ...get().config, settings };
    await invoke('save_config', { config: newConfig });
    set({ config: newConfig });
  },
}));
