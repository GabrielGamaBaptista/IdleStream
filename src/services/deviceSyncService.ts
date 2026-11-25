import { invoke } from '@tauri-apps/api/core';
import { DeviceSyncRemoteState } from '../types';
import { isAndroidPlatform } from '../utils/platform';

const KEYVAL_API_URL = 'https://api.keyval.org';
const STORAGE_KEY_SYNC_ID = '__idlestream_device_sync_id__';
const STORAGE_KEY_DEV_UUID = '__idlestream_dev_link_uuid__';
const TIMEOUT_SECONDS = 180; // 3 minutos sem atualização = outro dispositivo offline
const HEARTBEAT_SECONDS = 30;

export interface DeviceSyncRawData {
  active_device: 'desktop' | 'mobile' | null;
  device_id: string;
  device_type: 'desktop' | 'mobile';
  updated_at: number; // Unix timestamp em segundos
  claim_nonce?: string;
}

interface BackendDeviceSyncInfo {
  syncId: string | null;
  deviceId: string;
  deviceType: 'desktop' | 'mobile';
  remoteState: DeviceSyncRemoteState | null;
}

function isTauriRuntime(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__)
  );
}

function getCloudKey(syncId: string): string {
  const clean = syncId.trim();
  return clean.startsWith('idlestream_') ? clean : `idlestream_${clean}`;
}

export function encodeDeviceSyncState(data: DeviceSyncRawData): string {
  const active = data.active_device || 'none';
  const id = (data.device_id || '').replace(/\|/g, '_');
  const type = data.device_type || 'desktop';
  const updated = data.updated_at || Math.floor(Date.now() / 1000);
  const nonce = (data.claim_nonce || '').replace(/\|/g, '_').trim();
  return nonce ? `${active}|${id}|${type}|${updated}|${nonce}` : `${active}|${id}|${type}|${updated}`;
}

export function decodeDeviceSyncState(raw: string): DeviceSyncRawData | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const deviceId = parsed.device_id || parsed.id || '';
      const updatedAt = Number(parsed.updated_at || parsed.u || 0);
      const nonce =
        parsed.claim_nonce || parsed.n || `${deviceId}:${updatedAt}`;
      return {
        active_device: parsed.active_device || parsed.a || null,
        device_id: deviceId,
        device_type: parsed.device_type || parsed.t || 'desktop',
        updated_at: updatedAt,
        claim_nonce: nonce,
      };
    } catch {
      return null;
    }
  }

  const parts = trimmed.split('|');
  if (parts.length < 4) return null;
  const deviceId = parts[1] || '';
  const updatedAt = Number(parts[3] || 0);
  const nonce = parts[4]?.trim() || `${deviceId}:${updatedAt}`;
  return {
    active_device: parts[0] === 'none' || !parts[0] ? null : (parts[0] as 'desktop' | 'mobile'),
    device_id: deviceId,
    device_type: (parts[2] as 'desktop' | 'mobile') || 'desktop',
    updated_at: updatedAt,
    claim_nonce: nonce,
  };
}

class DeviceSyncService {
  private deviceId: string;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private currentSyncId: string | null = null;
  private isFarmingCheck: (() => boolean) | null = null;
  private localClaimNonce: string | null = null;
  private lastHeartbeatAt = 0;

  constructor() {
    let devId = '';
    try {
      devId = localStorage.getItem(STORAGE_KEY_DEV_UUID) || '';
      if (!devId) {
        devId = 'dev_' + Math.random().toString(36).substring(2, 11);
        localStorage.setItem(STORAGE_KEY_DEV_UUID, devId);
      }
    } catch (_) {
      devId = 'dev_fallback_' + Date.now();
    }
    this.deviceId = devId;
    this.currentSyncId = this.getSyncId();
  }

  public async syncIdentityFromBackend(): Promise<BackendDeviceSyncInfo | null> {
    if (!isTauriRuntime()) return null;
    try {
      const info = await invoke<BackendDeviceSyncInfo>('device_get_sync_info');
      if (info?.deviceId) {
        this.deviceId = info.deviceId;
        try {
          localStorage.setItem(STORAGE_KEY_DEV_UUID, info.deviceId);
        } catch (_) {}
      }
      if (info?.syncId) {
        this.setSyncId(info.syncId);
      }
      return info;
    } catch (_) {
      return null;
    }
  }

  public setIsFarmingCheck(check: (() => boolean) | null): void {
    this.isFarmingCheck = check;
  }

  public getDeviceId(): string {
    return this.deviceId;
  }

  public getDeviceType(): 'desktop' | 'mobile' {
    return isAndroidPlatform() ? 'mobile' : 'desktop';
  }

  public getOtherDeviceType(): 'desktop' | 'mobile' {
    return isAndroidPlatform() ? 'desktop' : 'mobile';
  }

  public getSyncId(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY_SYNC_ID);
    } catch (_) {
      return null;
    }
  }

  public setSyncId(syncId: string | null): void {
    try {
      if (syncId && syncId.trim().length > 0) {
        const clean = syncId.trim();
        this.currentSyncId = clean;
        localStorage.setItem(STORAGE_KEY_SYNC_ID, clean);
      } else {
        this.currentSyncId = null;
        this.localClaimNonce = null;
        localStorage.removeItem(STORAGE_KEY_SYNC_ID);
      }
    } catch (_) {}
  }

  private generateNonce(now: number): string {
    return `c_${now}_${Math.random().toString(36).substring(2, 10)}`;
  }

  /**
   * Cria um novo objeto na nuvem para pareamento entre Desktop e Mobile
   */
  public async createNewPairing(isInitiallyFarming = false): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const myType = this.getDeviceType();
    const syncId = 'dsync_' + Math.random().toString(36).substring(2, 10);
    const cloudKey = getCloudKey(syncId);
    const nonce = this.generateNonce(now);
    const initialData: DeviceSyncRawData = {
      active_device: isInitiallyFarming ? myType : null,
      device_id: this.deviceId,
      device_type: myType,
      updated_at: now,
      claim_nonce: nonce,
    };

    const response = await fetch(`${KEYVAL_API_URL}/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: cloudKey,
        val: encodeDeviceSyncState(initialData),
      }),
    });

    if (!response.ok) {
      throw new Error(`Falha ao registrar pareamento cloud (HTTP ${response.status})`);
    }

    const resJson = await response.json().catch(() => null);
    if (!resJson || resJson.status !== 'SUCCESS') {
      throw new Error(`Falha no registro do pareamento: ${resJson?.status || 'erro desconhecido'}`);
    }

    this.setSyncId(syncId);
    if (isInitiallyFarming) {
      this.localClaimNonce = nonce;
      this.lastHeartbeatAt = now;
    }
    return syncId;
  }

  /**
   * Declara que o dispositivo atual assumiu o farm
   */
  public async claimActive(syncId?: string, forceHttp = false): Promise<boolean> {
    const targetId = syncId || this.currentSyncId;
    if (!targetId) return false;

    if (!forceHttp && isTauriRuntime() && !syncId) {
      try {
        return await invoke<boolean>('device_claim_active');
      } catch (_) {}
    }

    const now = Math.floor(Date.now() / 1000);
    const myType = this.getDeviceType();
    const cloudKey = getCloudKey(targetId);
    const nonce = this.generateNonce(now);
    const payload: DeviceSyncRawData = {
      active_device: myType,
      device_id: this.deviceId,
      device_type: myType,
      updated_at: now,
      claim_nonce: nonce,
    };

    try {
      const response = await fetch(`${KEYVAL_API_URL}/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: cloudKey,
          val: encodeDeviceSyncState(payload),
        }),
      });

      if (!response.ok) {
        console.warn(`[DeviceSync] Falha ao reivindicar farm ativo (HTTP ${response.status})`);
        return false;
      }
      const json = await response.json().catch(() => null);
      if (json?.status === 'SUCCESS') {
        this.localClaimNonce = nonce;
        this.lastHeartbeatAt = now;
        return true;
      }
      return false;
    } catch (e) {
      console.warn('[DeviceSync] Erro de rede ao reivindicar farm:', e);
      return false;
    }
  }

  /**
   * Declara que o dispositivo atual liberou o farm (saída graciosa manual)
   */
  public async releaseActive(syncId?: string, forceHttp = false): Promise<boolean> {
    const targetId = syncId || this.currentSyncId;
    if (!targetId) return false;

    if (!forceHttp && isTauriRuntime() && !syncId) {
      try {
        return await invoke<boolean>('device_release_active');
      } catch (_) {}
    }

    const now = Math.floor(Date.now() / 1000);
    const myType = this.getDeviceType();
    const cloudKey = getCloudKey(targetId);
    const payload: DeviceSyncRawData = {
      active_device: null,
      device_id: this.deviceId,
      device_type: myType,
      updated_at: now,
      claim_nonce: `rel_${now}`,
    };

    try {
      const response = await fetch(`${KEYVAL_API_URL}/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: cloudKey,
          val: encodeDeviceSyncState(payload),
        }),
      });

      if (!response.ok) return false;
      const json = await response.json().catch(() => null);
      if (json?.status === 'SUCCESS') {
        this.localClaimNonce = null;
        return true;
      }
      return false;
    } catch (e) {
      console.warn('[DeviceSync] Erro ao liberar farm:', e);
      return false;
    }
  }

  /**
   * Consulta o estado remoto na nuvem com resolução inequívoca de dispositivo
   */
  public async fetchRemoteState(
    syncId?: string,
    forceHttp = false
  ): Promise<DeviceSyncRemoteState | null> {
    const targetId = syncId || this.currentSyncId;
    if (!targetId) return null;

    if (!forceHttp && isTauriRuntime() && !syncId) {
      try {
        return await invoke<DeviceSyncRemoteState | null>('device_check_sync');
      } catch (_) {}
    }

    const cloudKey = getCloudKey(targetId);

    try {
      const response = await fetch(`${KEYVAL_API_URL}/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: cloudKey }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const resJson = await response.json().catch(() => null);
      if (!resJson || resJson.status !== 'SUCCESS' || !resJson.val) {
        return null;
      }

      const data = decodeDeviceSyncState(resJson.val);
      if (!data) return null;
      const now = Math.floor(Date.now() / 1000);
      const isRecent = now - (data.updated_at || 0) < TIMEOUT_SECONDS;

      const myType = this.getDeviceType();
      const otherType = this.getOtherDeviceType();

      const hasActive = Boolean(data.active_device) && isRecent;

      const isCurrentActive =
        hasActive &&
        (data.device_id === this.deviceId ||
          (data.active_device === myType && (!data.device_id || data.device_id === this.deviceId)));

      const isOtherActive = hasActive && !isCurrentActive;

      return {
        syncId: targetId,
        activeDevice: hasActive ? data.active_device : null,
        lastUpdated: data.updated_at || 0,
        isOtherDeviceActive: isOtherActive,
        isCurrentDeviceActive: isCurrentActive,
        otherDeviceType: otherType,
        claimNonce: data.claim_nonce || null,
      };
    } catch (e) {
      console.warn('[DeviceSync] Falha na consulta de estado remoto:', e);
      return null;
    }
  }

  /**
   * Polling fallback para ambientes não-Tauri (sempre read-before-write!)
   */
  public startPolling(
    intervalSeconds = 5,
    onUpdate: (state: DeviceSyncRemoteState) => void
  ): void {
    this.stopPolling();

    const poll = async () => {
      const targetId = this.currentSyncId;
      if (!targetId) return;

      // 1. SEMPRE lê primeiro antes de renovar heartbeat
      const state = await this.fetchRemoteState(targetId, true);
      if (state) {
        onUpdate(state);
        if (state.isOtherDeviceActive) {
          return; // Outro dispositivo assumiu: nunca sobrescrever!
        }
      }

      // 2. Só renova heartbeat se este dispositivo estiver farmando e não tiver sido deslocado
      const now = Math.floor(Date.now() / 1000);
      if (
        this.isFarmingCheck &&
        this.isFarmingCheck() &&
        (!this.localClaimNonce || now - this.lastHeartbeatAt >= HEARTBEAT_SECONDS)
      ) {
        await this.claimActive(targetId, true).catch(() => {});
      }
    };

    poll().catch(() => {});
    this.pollTimer = setInterval(poll, intervalSeconds * 1000);
  }

  public stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}

export const deviceSyncService = new DeviceSyncService();
