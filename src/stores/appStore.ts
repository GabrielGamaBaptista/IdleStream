import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Update } from '@tauri-apps/plugin-updater';
import {
  Account,
  AccountHealthStatus,
  AccountsHealthSummary,
  AppConfig,
  AppSettings,
  GameSlotConfig,
  Platform,
  RuntimeSessionState,
  StreamConfig,
  StreamRuntimeStatus,
  VoteAccountConfig,
  VoteReadyNotificationPayload,
} from '../types';
import { checkForAppUpdates, installAppUpdate, UnifiedUpdateResult } from '../services/updaterService';
import { gamePlatformService } from '../services/gamePlatformService';
import { votePlatformService } from '../services/votePlatformService';

const VALID_TABS = ['streams', 'games', 'votes', 'accounts', 'settings'] as const;
const ACTIVE_TAB_STORAGE_KEY = '__idlestream_active_tab__';
const FPS_TIER_STORAGE_KEY = '__idlestream_fps_tier__';
const ULTRA_MODE_STORAGE_KEY = '__idlestream_pokeidle_ultra__';

function isValidNavigationTab(value: unknown): value is NavigationTab {
  return typeof value === 'string' && (VALID_TABS as readonly string[]).includes(value);
}

function getInitialActiveTab(): NavigationTab {
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
      if (isValidNavigationTab(saved)) return saved;
    }
  } catch (_) {}
  return 'streams';
}

async function syncAndroidFarmingState(statuses: Record<string, StreamRuntimeStatus>) {
  try {
    const hasActiveStream = Object.values(statuses).some(
      (s) => s.status === 'connected' || s.status === 'standby' || s.status === 'connecting'
    );
    if (hasActiveStream) {
      gamePlatformService.syncFarmingActive(true);
      return;
    }
    const activeGames = await gamePlatformService.getActiveSlots().catch(() => []);
    gamePlatformService.syncFarmingActive(activeGames.length > 0);
  } catch (_) {}
}

function playGentleVoteChime() {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const notes = [659.25, 880]; // E5 -> A5
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);
      gain.gain.setValueAtTime(0.001, now + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.06, now + idx * 0.14 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 0.42);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.45);
    });
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1200);
  } catch (_) {}
}

type NavigationTab = 'streams' | 'games' | 'votes' | 'accounts' | 'settings';

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
  accountsHealth: AccountsHealthSummary | null;
  isVerifyingAccounts: boolean;
  verifyingAccountIds: Record<string, boolean>;
  activeTab: NavigationTab;
  platformFilter: 'all' | Platform;
  isAddStreamOpen: boolean;
  isAddAccountOpen: boolean;
  isInitialized: boolean;
  visibleKickWindows: Record<string, boolean>;
  isImmersiveMode: boolean;
  voteAlerts: VoteReadyNotificationPayload[];
  pendingVoteOpenAccountId: string | null;

  setActiveTab: (tab: NavigationTab) => void;
  setPlatformFilter: (filter: 'all' | Platform) => void;
  setAddStreamOpen: (open: boolean) => void;
  setAddAccountOpen: (open: boolean) => void;
  toggleImmersiveMode: () => void;
  setImmersiveMode: (val: boolean) => void;
  dismissVoteAlert: (accountId: string, lastVotedAt?: number) => void;
  clearPendingVoteOpenAccountId: () => void;

  init: () => Promise<void>;
  fetchAppVersion: () => Promise<void>;
  checkForUpdates: (manual?: boolean) => Promise<void>;
  installUpdate: () => Promise<void>;
  fetchConfig: () => Promise<void>;
  fetchStatuses: () => Promise<void>;
  fetchAccountsHealth: () => Promise<void>;
  verifyAllAccounts: () => Promise<AccountsHealthSummary | null>;
  verifyAccount: (accountId: string) => Promise<AccountHealthStatus | null>;

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
  updateVoteAccount: (account: VoteAccountConfig) => Promise<void>;
  markVoteCompleted: (accountId: string, votedAt?: number) => Promise<void>;
  resetVoteTimer: (accountId: string) => Promise<void>;
  testVoteNotification: (accountId?: string) => Promise<VoteReadyNotificationPayload | null>;
}

export const useAppStore = create<AppState>((set, get) => ({
  appVersion: '4.1.1',
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
  accountsHealth: null,
  isVerifyingAccounts: false,
  verifyingAccountIds: {},
  activeTab: getInitialActiveTab(),
  platformFilter: 'all',
  isAddStreamOpen: false,
  isAddAccountOpen: false,
  isInitialized: false,
  visibleKickWindows: {},
  isImmersiveMode: false,
  voteAlerts: [],
  pendingVoteOpenAccountId: null,

  setActiveTab: (tab) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tab);
      }
    } catch (_) {}
    invoke('set_runtime_ui_state', {
      lastActiveTab: tab,
      desiredActiveGameSlots: null,
    }).catch(() => {});

    if (tab !== 'games') {
      gamePlatformService.hideAll().catch(() => {});
      // Se mudar de aba enquanto estiver em modo imersivo, restaurar menus normais
      set({ isImmersiveMode: false });
    }
    if (tab !== 'votes') {
      // Destrói imediatamente qualquer WebView de votação ao sair da aba Votos (0 MB RAM)
      votePlatformService.closeVoteWebView().catch(() => {});
    }
    set({ activeTab: tab });
  },
  dismissVoteAlert: (accountId, lastVotedAt) =>
    set((state) => ({
      voteAlerts: state.voteAlerts.filter(
        (a) => !(a.account_id === accountId && (lastVotedAt === undefined || a.last_voted_at === lastVotedAt))
      ),
    })),
  clearPendingVoteOpenAccountId: () => set({ pendingVoteOpenAccountId: null }),
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
      await get().fetchAccountsHealth();

      const runtimeState = await invoke<RuntimeSessionState>('get_runtime_state').catch(() => null);
      if (runtimeState?.last_active_tab && isValidNavigationTab(runtimeState.last_active_tab)) {
        set({ activeTab: runtimeState.last_active_tab });
        try {
          localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, runtimeState.last_active_tab);
        } catch (_) {}
      }

      // Restaurar tier de FPS salvo nos jogos (ex: 60 / 30 / 10 FPS)
      try {
        const savedFps = Number(localStorage.getItem(FPS_TIER_STORAGE_KEY));
        if (savedFps === 10 || savedFps === 30 || savedFps === 60) {
          gamePlatformService.setFps(savedFps).catch(() => {});
        }
      } catch (_) {}

      // Auto-retomar slots de jogos com auto_start OU que estavam ativos antes do reinício
      try {
        const cfgSlots = get().config.game_slots || [];
        const desiredGameIds = new Set<string>(runtimeState?.desired_active_game_slots || []);
        for (const s of cfgSlots) {
          if (s.auto_start) {
            desiredGameIds.add(s.id);
          }
        }
        const alreadyRunning = await gamePlatformService.getActiveSlots().catch(() => [] as string[]);
        const toStart = cfgSlots.filter((s) => desiredGameIds.has(s.id) && !alreadyRunning.includes(s.id));

        for (const slot of toStart) {
          await gamePlatformService
            .startSlot(slot.id, (slot.url || '').trim() || 'https://pokeidle.io/app', slot.zoom ?? 1.0)
            .catch((e) => console.warn(`Falha ao restaurar slot ${slot.id}:`, e));
        }

        const totalActiveGames = alreadyRunning.length + toStart.length;
        if (totalActiveGames > 0) {
          if (get().activeTab !== 'games') {
            gamePlatformService.hideAll().catch(() => {});
          }
          if (localStorage.getItem(ULTRA_MODE_STORAGE_KEY) === 'true') {
            setTimeout(() => {
              gamePlatformService.togglePokeIdleUltra(undefined, true).catch(() => {});
            }, 2500);
          }
        }
      } catch (e) {
        console.warn('Falha ao restaurar slots de jogos:', e);
      }

      syncAndroidFarmingState(get().statuses).catch(() => {});

      // Silent background update check upon startup
      get().checkForUpdates(false).catch(() => {});

      // Setup Android native authentication bridge callbacks
      if (typeof window !== 'undefined') {
        const handleTwitchAuth = async (accountId: string, token: string) => {
          try {
            if (accountId && accountId !== 'temp_add_account') {
              await invoke('save_twitch_token', { accountId, token });
              await get().fetchConfig();
              await get().fetchAccountsHealth();
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
              await get().fetchAccountsHealth();
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

        window.addEventListener('android-kick-session-synced', (e: any) => {
          const { accountId, kickSession, sessionToken, xsrfToken } = e.detail || {};
          if (accountId && (kickSession || sessionToken)) {
            handleKickAuth(accountId, kickSession || '', sessionToken || '', xsrfToken || '');
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

        window.addEventListener('idlestream-open-tab', (e: any) => {
          const tab = e.detail?.tab as NavigationTab | undefined;
          const accId = (e.detail?.accountId as string | undefined) || null;
          if (tab) {
            get().setActiveTab(tab);
            if (tab === 'votes' && accId) {
              set({ pendingVoteOpenAccountId: accId });
            }
          }
        });

        if (typeof window.AndroidBridge?.consumePendingOpenTab === 'function') {
          try {
            const rawPending = window.AndroidBridge.consumePendingOpenTab();
            if (rawPending) {
              const parsed = JSON.parse(rawPending) as { tab?: NavigationTab; accountId?: string };
              if (parsed.tab) {
                get().setActiveTab(parsed.tab);
                if (parsed.tab === 'votes' && parsed.accountId) {
                  set({ pendingVoteOpenAccountId: parsed.accountId });
                }
              }
            }
          } catch (_) {}
        }
      }

      // Notificações de votos prontos (ciclo de 24h 01m concluído ou teste manual)
      await listen<VoteReadyNotificationPayload>('vote-ready-notification', (event) => {
        const alertPayload = event.payload;
        playGentleVoteChime();
        set((state) => {
          const exists = state.voteAlerts.some(
            (a) =>
              a.account_id === alertPayload.account_id &&
              a.last_voted_at === alertPayload.last_voted_at &&
              a.is_test === alertPayload.is_test
          );
          if (exists) return state;
          return {
            voteAlerts: [alertPayload, ...state.voteAlerts].slice(0, 6),
          };
        });
      });

      // Verificador contínuo de saúde de sessões (8 contas Twitch + Kick)
      await listen<AccountsHealthSummary>('accounts-health-updated', (event) => {
        const summary = event.payload;
        set({
          accountsHealth: summary,
          isVerifyingAccounts: summary.checking > 0,
        });
      });

      await listen('accounts-config-synced', () => {
        get().fetchConfig().catch(() => {});
      });

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
          syncAndroidFarmingState(nextStatuses).catch(() => {});
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
      votePlatformService.syncAndroidAlarms(config.vote_accounts);
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
      syncAndroidFarmingState(map).catch(() => {});
    } catch (err) {
      console.error('get_all_stream_statuses failed:', err);
    }
  },

  fetchAccountsHealth: async () => {
    try {
      const summary = await invoke<AccountsHealthSummary>('get_accounts_health');
      set({
        accountsHealth: summary,
        isVerifyingAccounts: summary.checking > 0,
      });
    } catch (err) {
      console.error('get_accounts_health failed:', err);
    }
  },

  verifyAllAccounts: async () => {
    set({ isVerifyingAccounts: true });
    try {
      const summary = await invoke<AccountsHealthSummary>('verify_all_accounts');
      set({ accountsHealth: summary, isVerifyingAccounts: false });
      await get().fetchConfig();
      return summary;
    } catch (err) {
      console.error('verify_all_accounts failed:', err);
      set({ isVerifyingAccounts: false });
      return null;
    }
  },

  verifyAccount: async (accountId: string) => {
    set((state) => ({
      verifyingAccountIds: { ...state.verifyingAccountIds, [accountId]: true },
    }));
    try {
      const status = await invoke<AccountHealthStatus>('verify_account', { accountId });
      await get().fetchAccountsHealth();
      await get().fetchConfig();
      return status;
    } catch (err) {
      console.error('verify_account failed:', err);
      return null;
    } finally {
      set((state) => {
        const next = { ...state.verifyingAccountIds };
        delete next[accountId];
        return { verifyingAccountIds: next };
      });
    }
  },

  addAccount: async (account) => {
    const updated = await invoke<AppConfig>('add_account', { account });
    set({ config: updated });
    await get().fetchAccountsHealth();
  },

  removeAccount: async (accountId) => {
    const updated = await invoke<AppConfig>('remove_account', { accountId });
    set({ config: updated });
    await get().fetchAccountsHealth();
  },

  startTwitchOAuth: async (accountId) => {
    const token = await invoke<string>('start_twitch_oauth', { accountId, clientId: null });
    await get().fetchConfig();
    await get().fetchAccountsHealth();
    return token;
  },

  openTwitchLogin: async (accountId) => {
    await invoke('open_twitch_login', { accountId });
  },

  saveTwitchSession: async (accountId) => {
    const updated = await invoke<AppConfig>('save_twitch_session', { accountId });
    set({ config: updated });
    await get().fetchAccountsHealth();
  },

  openKickLogin: async (accountId) => {
    await invoke('open_kick_login', { accountId });
  },

  saveKickSession: async (accountId) => {
    const updated = await invoke<AppConfig>('save_kick_session', { accountId });
    set({ config: updated });
    await get().fetchAccountsHealth();
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

  updateVoteAccount: async (account) => {
    const updated = await invoke<AppConfig>('vote_update_account', { account });
    set({ config: updated });
    votePlatformService.syncAndroidAlarms(updated.vote_accounts);
  },

  markVoteCompleted: async (accountId, votedAt) => {
    const updated = await invoke<AppConfig>('vote_mark_completed', {
      accountId,
      votedAt: votedAt ?? null,
    });
    set((state) => ({
      config: updated,
      voteAlerts: state.voteAlerts.filter((a) => a.account_id !== accountId),
    }));
    votePlatformService.syncAndroidAlarms(updated.vote_accounts);
  },

  resetVoteTimer: async (accountId) => {
    const updated = await invoke<AppConfig>('vote_reset_timer', { accountId });
    set((state) => ({
      config: updated,
      voteAlerts: state.voteAlerts.filter((a) => a.account_id !== accountId),
    }));
    votePlatformService.syncAndroidAlarms(updated.vote_accounts);
  },

  testVoteNotification: async (accountId) => {
    try {
      return await votePlatformService.sendTestNotification(accountId);
    } catch (e) {
      console.error('Falha ao disparar notificação de teste de voto:', e);
      return null;
    }
  },
}));
