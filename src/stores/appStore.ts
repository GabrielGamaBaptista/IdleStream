import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { check, Update } from '@tauri-apps/plugin-updater';
import { Account, AppConfig, AppSettings, Platform, StreamConfig, StreamRuntimeStatus } from '../types';

interface AppState {
  appVersion: string;
  updateAvailable: { version: string; body?: string } | null;
  pendingUpdate: Update | null;
  isCheckingUpdate: boolean;
  isInstallingUpdate: boolean;
  updateStatusMessage: string | null;

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
  fetchAppVersion: () => Promise<void>;
  checkForUpdates: (manual?: boolean) => Promise<void>;
  installUpdate: () => Promise<void>;
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
  appVersion: '2.1.1',
  updateAvailable: null,
  pendingUpdate: null,
  isCheckingUpdate: false,
  isInstallingUpdate: false,
  updateStatusMessage: null,

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

  fetchAppVersion: async () => {
    try {
      const v = await invoke<string>('get_app_version');
      set({ appVersion: v });
    } catch (e) {
      console.warn('Failed to fetch app version:', e);
    }
  },

  checkForUpdates: async (manual = false) => {
    set({
      isCheckingUpdate: true,
      updateStatusMessage: manual ? 'Buscando atualizações no GitHub...' : null,
    });
    try {
      const update = await check();
      if (update?.available) {
        set({
          updateAvailable: { version: update.version, body: update.body },
          pendingUpdate: update,
          updateStatusMessage: `Nova versão v${update.version} disponível!`,
        });
      } else {
        set({
          updateAvailable: null,
          pendingUpdate: null,
          updateStatusMessage: manual ? 'Você já está na versão mais recente!' : null,
        });
        if (manual) {
          setTimeout(() => set({ updateStatusMessage: null }), 4000);
        }
      }
    } catch (err: any) {
      console.warn('Update check failed:', err);
      if (manual) {
        set({ updateStatusMessage: 'Não foi possível verificar atualizações no momento.' });
        setTimeout(() => set({ updateStatusMessage: null }), 4000);
      }
    } finally {
      set({ isCheckingUpdate: false });
    }
  },

  installUpdate: async () => {
    const { pendingUpdate } = get();
    if (!pendingUpdate) return;
    set({ isInstallingUpdate: true, updateStatusMessage: 'Baixando e instalando atualização...' });
    try {
      await pendingUpdate.downloadAndInstall();
    } catch (err: any) {
      alert(`Falha ao instalar atualização: ${err}`);
      set({ isInstallingUpdate: false, updateStatusMessage: null });
    }
  },

  init: async () => {
    if (get().isInitialized) return;

    try {
      await get().fetchAppVersion();
      await get().fetchConfig();
      await get().fetchStatuses();

      // Silent background update check upon startup
      get().checkForUpdates(false).catch(() => {});

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
