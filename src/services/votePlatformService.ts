import { invoke } from '@tauri-apps/api/core';
import { VoteAccountConfig, VoteBounds, VoteReadyNotificationPayload } from '../types';
import { isAndroidPlatform } from './gamePlatformService';

export const DEFAULT_TOPIDLE_GAME_URL = 'https://topidle.com/jogo/pokeidle-io-5f9969';
export const VOTE_COOLDOWN_SECONDS = 86_460; // 24 horas e 1 minuto

export const DEFAULT_VOTE_ACCOUNTS: VoteAccountConfig[] = [
  {
    id: 'vote-1',
    label: 'GGB2006',
    player_identifier: 'GGB2006',
    base_url: DEFAULT_TOPIDLE_GAME_URL,
    linked_game_slot_id: 'slot-1',
    share_game_profile: true,
    google_hint: null,
    color: '#6366F1',
    last_voted_at: null,
    last_notified_for_vote_at: null,
    total_votes: 0,
    notifications_enabled: true,
  },
  {
    id: 'vote-2',
    label: 'GGB2006_2',
    player_identifier: 'GGB2006_2',
    base_url: DEFAULT_TOPIDLE_GAME_URL,
    linked_game_slot_id: 'slot-2',
    share_game_profile: true,
    google_hint: null,
    color: '#10B981',
    last_voted_at: null,
    last_notified_for_vote_at: null,
    total_votes: 0,
    notifications_enabled: true,
  },
  {
    id: 'vote-3',
    label: 'GGB2006_3',
    player_identifier: 'GGB2006_3',
    base_url: DEFAULT_TOPIDLE_GAME_URL,
    linked_game_slot_id: 'slot-3',
    share_game_profile: true,
    google_hint: null,
    color: '#F59E0B',
    last_voted_at: null,
    last_notified_for_vote_at: null,
    total_votes: 0,
    notifications_enabled: true,
  },
  {
    id: 'vote-4',
    label: 'GGB2006_4',
    player_identifier: 'GGB2006_4',
    base_url: DEFAULT_TOPIDLE_GAME_URL,
    linked_game_slot_id: 'slot-4',
    share_game_profile: true,
    google_hint: null,
    color: '#EF4444',
    last_voted_at: null,
    last_notified_for_vote_at: null,
    total_votes: 0,
    notifications_enabled: true,
  },
];

const GOOGLE_AUTH_HOSTS = new Set([
  'accounts.google.com',
  'accounts.youtube.com',
  'myaccount.google.com',
  'gds.google.com',
  'apis.google.com',
  'consent.google.com',
  'consent.youtube.com',
]);

/**
 * Constrói e valida a URL do TopIdle com `playerIdentifier` único,
 * garantindo protocolo HTTPS e domínio restrito ao TopIdle.
 */
export function buildTopIdleVoteUrl(baseUrl: string, playerIdentifier: string): string {
  const raw = (baseUrl || '').trim();
  const normalized = !raw
    ? DEFAULT_TOPIDLE_GAME_URL
    : raw.includes('://')
      ? raw
      : `https://${raw.replace(/^\/+/, '')}`;

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error('URL do TopIdle inválida.');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Somente URLs HTTPS do TopIdle são permitidas nesta seção.');
  }

  const host = parsed.hostname.toLowerCase();
  if (host !== 'topidle.com' && !host.endsWith('.topidle.com')) {
    throw new Error(`Domínio não permitido '${host}': aceita apenas topidle.com.`);
  }

  if (!parsed.pathname || parsed.pathname === '/') {
    parsed.pathname = '/jogo/pokeidle-io-5f9969';
  }

  const cleanPlayer = (playerIdentifier || '').trim();
  parsed.searchParams.delete('playerIdentifier');
  if (cleanPlayer) {
    parsed.searchParams.set('playerIdentifier', cleanPlayer);
  }

  return parsed.toString();
}

/**
 * Verifica se uma URL pertence à whitelist segura da sessão Votos.
 */
export function isAllowedVoteUrlPreview(rawUrl: string, isPopup = false): boolean {
  if (!rawUrl) return false;
  const trimmed = rawUrl.trim();
  if (isPopup && trimmed === 'about:blank') return true;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') return false;
  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname || '';

  if (host === 'topidle.com' || host.endsWith('.topidle.com')) return true;
  if (GOOGLE_AUTH_HOSTS.has(host)) return true;
  if (
    host === 'challenges.cloudflare.com' ||
    host === 'hcaptcha.com' ||
    host.endsWith('.hcaptcha.com') ||
    host === 'recaptcha.net' ||
    host.endsWith('.recaptcha.net') ||
    host.endsWith('.gstatic.com')
  ) {
    return true;
  }
  if ((host === 'www.google.com' || host === 'google.com') && path.startsWith('/recaptcha')) {
    return true;
  }
  return false;
}

export interface VoteCooldownInfo {
  isReady: boolean;
  remainingSeconds: number;
  readyAt: number | null;
  progressPct: number;
}

export function getVoteCooldownInfo(
  lastVotedAt?: number | null,
  nowSec = Math.floor(Date.now() / 1000)
): VoteCooldownInfo {
  if (!lastVotedAt || lastVotedAt <= 0) {
    return {
      isReady: true,
      remainingSeconds: 0,
      readyAt: null,
      progressPct: 100,
    };
  }

  const readyAt = lastVotedAt + VOTE_COOLDOWN_SECONDS;
  const remaining = Math.max(0, readyAt - nowSec);
  const elapsed = Math.max(0, Math.min(VOTE_COOLDOWN_SECONDS, nowSec - lastVotedAt));
  const progressPct = Math.min(100, Math.max(0, Math.round((elapsed / VOTE_COOLDOWN_SECONDS) * 100)));

  return {
    isReady: remaining === 0,
    remainingSeconds: remaining,
    readyAt,
    progressPct,
  };
}

export function formatCountdownHms(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function countReadyVoteAccounts(
  accounts: VoteAccountConfig[] | undefined,
  nowSec = Math.floor(Date.now() / 1000)
): number {
  if (!accounts || accounts.length === 0) return 0;
  return accounts.filter((acc) => getVoteCooldownInfo(acc.last_voted_at, nowSec).isReady).length;
}

const getBridge = () => {
  if (typeof window === 'undefined') return null;
  return window.AndroidBridge ?? null;
};

export const votePlatformService = {
  isAndroid: isAndroidPlatform,

  async openVoteWebView(account: VoteAccountConfig, bounds?: VoteBounds): Promise<string> {
    const targetUrl = buildTopIdleVoteUrl(account.base_url, account.player_identifier);
    const bridge = getBridge();
    if (bridge?.isAndroid?.() && typeof bridge.openVoteWebView === 'function') {
      bridge.openVoteWebView(
        account.id,
        targetUrl,
        account.linked_game_slot_id || '',
        Boolean(account.share_game_profile)
      );
      if (bounds && typeof bridge.updateVoteWebViewBounds === 'function') {
        bridge.updateVoteWebViewBounds(bounds.x, bounds.y, bounds.width, bounds.height, bounds.visible);
      }
      return targetUrl;
    }
    return await invoke<string>('vote_open_webview', {
      accountId: account.id,
      bounds: bounds ?? null,
    });
  },

  async closeVoteWebView(): Promise<void> {
    const bridge = getBridge();
    if (bridge?.isAndroid?.() && typeof bridge.closeVoteWebView === 'function') {
      bridge.closeVoteWebView();
      return;
    }
    await invoke('vote_close_webview');
  },

  async updateBounds(bounds: VoteBounds): Promise<void> {
    const bridge = getBridge();
    if (bridge?.isAndroid?.() && typeof bridge.updateVoteWebViewBounds === 'function') {
      bridge.updateVoteWebViewBounds(bounds.x, bounds.y, bounds.width, bounds.height, bounds.visible);
      return;
    }
    await invoke('vote_update_bounds', { bounds });
  },

  async hideVoteWebView(): Promise<void> {
    const bridge = getBridge();
    if (bridge?.isAndroid?.() && typeof bridge.hideVoteWebView === 'function') {
      bridge.hideVoteWebView();
      return;
    }
    await invoke('vote_hide_webview');
  },

  async reloadVoteWebView(): Promise<void> {
    const bridge = getBridge();
    if (bridge?.isAndroid?.() && typeof bridge.reloadVoteWebView === 'function') {
      bridge.reloadVoteWebView();
      return;
    }
    await invoke('vote_reload_webview');
  },

  async clearTopIdleSession(account: VoteAccountConfig): Promise<void> {
    const targetUrl = buildTopIdleVoteUrl(account.base_url, account.player_identifier);
    const bridge = getBridge();
    if (bridge?.isAndroid?.() && typeof bridge.clearVoteTopIdleSession === 'function') {
      bridge.clearVoteTopIdleSession(targetUrl);
      return;
    }
    await invoke('vote_clear_topidle_session', { accountId: account.id });
  },

  async getActiveAccountId(): Promise<string | null> {
    const bridge = getBridge();
    if (bridge?.isAndroid?.() && typeof bridge.getActiveVoteAccount === 'function') {
      const id = bridge.getActiveVoteAccount();
      return id ? id : null;
    }
    return await invoke<string | null>('vote_get_active');
  },

  syncAndroidAlarms(accounts: VoteAccountConfig[] | undefined): void {
    const bridge = getBridge();
    if (!accounts || !bridge?.isAndroid?.() || typeof bridge.syncVoteAlarms !== 'function') return;
    try {
      bridge.syncVoteAlarms(JSON.stringify(accounts));
    } catch (e) {
      console.warn('Falha ao sincronizar alarmes de voto no Android:', e);
    }
  },

  async sendTestNotification(accountId?: string): Promise<VoteReadyNotificationPayload> {
    return await invoke<VoteReadyNotificationPayload>('vote_test_notification', {
      accountId: accountId ?? null,
    });
  },
};
