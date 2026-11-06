import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Update } from '@tauri-apps/plugin-updater';
import { Account, AppConfig, AppSettings, GameSlotConfig, Platform, StreamConfig, StreamRuntimeStatus } from '../types';
import { checkForAppUpdates, installAppUpdate, UnifiedUpdateResult } from '../services/updaterService';
import { gamePlatformService } from '../services/gamePlatformService';

interface AppState {
  appVersion: string;
  updateAvailable: { version: string; body?: string } | null;
  pendingUpdate: Update | null;
  unifiedUpdate: UnifiedUpdateResult | null;
  updateDownloadProgress: number | null;
  isCheckingUpdate: boolean;
  isInstallingUpdate: boolean;
  updateStatusMessage: string | null;

  config: AppConfig;
  statuses: Record<string, StreamRuntimeStatus>;
  activeTab: 'streams' | 'games' | 'accounts' | 'settings';
  platformFilter: 'all' | Platform;
  isAddStreamOpen: boolean;
  isAddAccountOpen: boolean;
  isInitialized: boolean;
  visibleKickWindows: Record<string, boolean>;
  isImmersiveMode: boolean;

  setActiveTab: (tab: 'streams' | 'games' | 'accounts' | 'settings') => void;
  setPlatformFilter: (filter: 'all' | Platform) => void;
  setAddStreamOpen: (open: boolean) => void;
  setAddAccountOpen: (open: boolean) => void;
  toggleImmersiveMode: () => void;
  setImmersiveMode: (val: boolean) => void;

  init: () => Promise<void>;
  fetchAppVersion: () => Promise<void>;
  checkForUpdates: (manual?: boolean) => Promise<void>;
  installUpdate: () => Promise<void>;
  fetchConfig: () => Promise<void>;
  fetchStatuses: () => Promise<void>;

  addAccount: (account: Account) => Promise<void>;
  removeAccount: (accountId: string) => Promise<void>;
  startTwitchOAuth: (accountId: string) => Promise<string>;
  openTwitchLogin: (accountId: string) => Promise<void>;
  saveTwitchSession: (accountId: string) => Promise<void>;
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
  openStreamRedeem: (streamId: string, accountId: string) => Promise<void>;

  updateSettings: (settings: AppSettings) => Promise<void>;
  updateGameSlot: (slot: GameSlotConfig) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  appVersion: '3.2.0',
  updateAvailable: null,
  pendingUpdate: null,
  unifiedUpdate: null,
  updateDownloadProgress: null,
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
      reconnect_delay_secs: 300,
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
  isImmersiveMode: false,

  setActiveTab: (tab) => {
    if (tab !== 'games') {
      gamePlatformService.hideAll().catch(() => {});
      // Se mudar de aba enquanto estiver em modo imersivo, restaurar menus normais
      set({ isImmersiveMode: false });
    }
    set({ activeTab: tab });
  },
  setPlatformFilter: (filter) => set({ platformFilter: filter }),
  setAddStreamOpen: (open) => set({ isAddStreamOpen: open }),
  setAddAccountOpen: (open) => set({ isAddAccountOpen: open }),
  toggleImmersiveMode: () => set((state) => ({ isImmersiveMode: !state.isImmersiveMode })),
  setImmersiveMode: (val) => set({ isImmersiveMode: val }),

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
      const res = await checkForAppUpdates(get().appVersion);
      if (res.hasUpdate) {
        set({
          updateAvailable: { version: res.version, body: res.body },
          unifiedUpdate: res,
          pendingUpdate: res.desktopUpdate ?? null,
          updateStatusMessage: `Nova versão v${res.version} disponível!`,
        });
      } else {
        set({
          updateAvailable: null,
          unifiedUpdate: null,
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
    const { unifiedUpdate, pendingUpdate } = get();
    if (!unifiedUpdate && !pendingUpdate) return;
    set({
      isInstallingUpdate: true,
      updateDownloadProgress: 0,
      updateStatusMessage: 'Iniciando atualização...',
    });
    try {
      if (unifiedUpdate) {
        await installAppUpdate(unifiedUpdate, (p) => {
          set({
            updateDownloadProgress: p,
            updateStatusMessage: `Baixando atualização (${p}%)...`,
          });
        });
      } else if (pendingUpdate) {
        await pendingUpdate.downloadAndInstall();
      }
    } catch (err: any) {
      alert(`Falha ao instalar atualização: ${err}`);
      set({
        isInstallingUpdate: false,
        updateDownloadProgress: null,
        updateStatusMessage: null,
      });
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

      // Setup Android native authentication bridge callbacks
      if (typeof window !== 'undefined') {
        const handleTwitchAuth = async (accountId: string, token: string) => {
          try {
            if (accountId && accountId !== 'temp_add_account') {
              await invoke('save_twitch_token', { accountId, token });
              await get().fetchConfig();
            }
          } catch (e) {
            console.error('Falha ao salvar token Twitch:', e);
          }
        };

        const handleKickAuth = async (
          accountId: string,
          kickSession: string,
          sessionToken: string,
          xsrfToken: string
        ) => {
          try {
            if (accountId && accountId !== 'temp_add_account') {
              await invoke('save_kick_credentials_direct', {
                accountId,
                kickSession,
                sessionToken: sessionToken || null,
                xsrfToken: xsrfToken || null,
              });
              await get().fetchConfig();
            }
          } catch (e) {
            console.error('Falha ao salvar credenciais Kick:', e);
          }
        };

        window.__onAndroidTwitchAuth = handleTwitchAuth;
        window.__onAndroidKickAuth = handleKickAuth;

        window.addEventListener('android-twitch-auth', (e: any) => {
          const { accountId, token } = e.detail || {};
          if (accountId && token) {
            handleTwitchAuth(accountId, token);
          }
        });

        window.addEventListener('android-kick-auth', (e: any) => {
          const { accountId, kickSession, sessionToken, xsrfToken } = e.detail || {};
          if (accountId && kickSession) {
            handleKickAuth(accountId, kickSession, sessionToken, xsrfToken);
          }
        });

        // Eventos nativos de atualização do Android
        window.addEventListener('android-update-progress', (e: any) => {
          const percent = e.detail?.percent ?? 0;
          set({
            isInstallingUpdate: true,
            updateDownloadProgress: percent,
            updateStatusMessage: `Baixando atualização (${percent}%)...`,
          });
        });

        window.addEventListener('android-update-status', (e: any) => {
          const status = e.detail?.status;
          const percent = e.detail?.percent;
          set({
            updateStatusMessage: status,
            updateDownloadProgress: percent ?? null,
          });
        });

        window.addEventListener('android-update-error', (e: any) => {
          const error = e.detail?.error || 'Erro desconhecido';
          alert(`Falha no download da atualização: ${error}`);
          set({
            isInstallingUpdate: false,
            updateDownloadProgress: null,
            updateStatusMessage: null,
          });
        });
      }

      // Listen to backend stream status changes (event-driven, 0% CPU polling)
      await listen<StreamRuntimeStatus>('stream-status-update', (event) => {
        const status = event.payload;
        set((state) => {
          const nextStatuses = {
            ...state.statuses,
            [status.stream_id]: status,
          };
          if (typeof window !== 'undefined' && window.AndroidBridge) {
            try {
              const activeCount = Object.values(nextStatuses).filter((s) => s.status === 'connected').length;
              const standbyCount = Object.values(nextStatuses).filter((s) => s.status === 'standby').length;
              const title = `IdleStream (${activeCount} live • ${standbyCount} vigília)`;
              const text = status.channel_points
                ? `Pontos: ${status.channel_points} • Rodando em segundo plano`
                : `Monitorando streams em segundo plano • 24/7`;
              window.AndroidBridge.updateNotification(title, text);
            } catch (ignored) {}
          }
          return { statuses: nextStatuses };
        });
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

  openTwitchLogin: async (accountId) => {
    await invoke('open_twitch_login', { accountId });
  },

  saveTwitchSession: async (accountId) => {
    const updated = await invoke<AppConfig>('save_twitch_session', { accountId });
    set({ config: updated });
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

  openStreamRedeem: async (streamId: string, accountId: string) => {
    const { config } = get();
    const stream = config.streams.find((s) => s.id === streamId);
    const account = config.accounts.find((a) => a.id === accountId);
    if (!stream || !account) {
      console.warn(`[openStreamRedeem] Stream (${streamId}) ou Conta (${accountId}) não encontrada.`);
      return;
    }

    if (window.AndroidBridge && typeof window.AndroidBridge.openStreamRedeem === 'function') {
      window.AndroidBridge.openStreamRedeem(
        stream.platform,
        stream.channel_slug,
        account.id,
        account.label,
        account.username,
        account.oauth_token || '',
        account.kick_session || '',
        account.session_token || '',
        account.xsrf_token || ''
      );
    } else {
      await invoke('open_stream_redeem', { streamId, accountId });
    }
  },

  updateSettings: async (settings) => {
    const newConfig = { ...get().config, settings };
    await invoke('save_config', { config: newConfig });
    set({ config: newConfig });
  },

  updateGameSlot: async (slot) => {
    try {
      const updated = await invoke<AppConfig>('update_game_slot', { slot });
      set({ config: updated });
    } catch (e) {
      console.error('Falha ao atualizar slot de jogo:', e);
    }
  },
}));
