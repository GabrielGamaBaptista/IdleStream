import { DeviceSyncRemoteState } from '../types';
import { isAndroidPlatform } from '../utils/platform';

const KEYVAL_API_URL = 'https://api.keyval.org';
const STORAGE_KEY_SYNC_ID = '__idlestream_device_sync_id__';
const TIMEOUT_SECONDS = 180; // 3 minutos sem atualização = outro dispositivo offline

export interface DeviceSyncRawData {
  active_device: 'desktop' | 'mobile' | null;
  device_id: string;
  device_type: 'desktop' | 'mobile';
  updated_at: number; // Unix timestamp em segundos
}

function getCloudKey(syncId: string): string {
  const clean = syncId.trim();
  return clean.startsWith('idlestream_') ? clean : `idlestream_${clean}`;
}

function encodeDeviceSyncState(data: DeviceSyncRawData): string {
  const active = data.active_device || 'none';
  const id = data.device_id || '';
  const type = data.device_type || 'desktop';
  const updated = data.updated_at || Math.floor(Date.now() / 1000);
  return `${active}|${id}|${type}|${updated}`;
}

function decodeDeviceSyncState(raw: string): DeviceSyncRawData | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      return {
        active_device: parsed.active_device || parsed.a || null,
        device_id: parsed.device_id || parsed.id || '',
        device_type: parsed.device_type || parsed.t || 'desktop',
        updated_at: Number(parsed.updated_at || parsed.u || 0),
      };
    } catch {
      return null;
    }
  }

  const parts = trimmed.split('|');
  if (parts.length < 4) return null;
  return {
    active_device: parts[0] === 'none' || !parts[0] ? null : (parts[0] as 'desktop' | 'mobile'),
    device_id: parts[1] || '',
    device_type: (parts[2] as 'desktop' | 'mobile') || 'desktop',
    updated_at: Number(parts[3] || 0),
  };
}

class DeviceSyncService {
  private deviceId: string;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private currentSyncId: string | null = null;
  private isFarmingCheck: (() => boolean) | null = null;

  constructor() {
    let devId = '';
    try {
      devId = localStorage.getItem('__idlestream_dev_link_uuid__') || '';
      if (!devId) {
        devId = 'dev_' + Math.random().toString(36).substring(2, 11);
        localStorage.setItem('__idlestream_dev_link_uuid__', devId);
      }
    } catch (_) {
      devId = 'dev_fallback_' + Date.now();
    }
    this.deviceId = devId;
    this.currentSyncId = this.getSyncId();
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
        localStorage.removeItem(STORAGE_KEY_SYNC_ID);
      }
    } catch (_) {}
  }

  /**
   * Cria um novo objeto na nuvem para pareamento entre Desktop e Mobile
   */
  public async createNewPairing(isInitiallyFarming = false): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const myType = this.getDeviceType();
    const syncId = 'dsync_' + Math.random().toString(36).substring(2, 10);
    const cloudKey = getCloudKey(syncId);
    const initialData: DeviceSyncRawData = {
      active_device: isInitiallyFarming ? myType : null,
      device_id: this.deviceId,
      device_type: myType,
      updated_at: now,
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
    return syncId;
  }

  /**
   * Declara que o dispositivo atual assumiu o farm
   */
  public async claimActive(syncId?: string): Promise<boolean> {
    const targetId = syncId || this.currentSyncId;
    if (!targetId) return false;

    const now = Math.floor(Date.now() / 1000);
    const myType = this.getDeviceType();
    const cloudKey = getCloudKey(targetId);
    const payload: DeviceSyncRawData = {
      active_device: myType,
      device_id: this.deviceId,
      device_type: myType,
      updated_at: now,
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
      return json?.status === 'SUCCESS';
    } catch (e) {
      console.warn('[DeviceSync] Erro de rede ao reivindicar farm:', e);
      return false;
    }
  }

  /**
   * Declara que o dispositivo atual liberou o farm (saída graciosa)
   */
  public async releaseActive(syncId?: string): Promise<boolean> {
    const targetId = syncId || this.currentSyncId;
    if (!targetId) return false;

    const now = Math.floor(Date.now() / 1000);
    const myType = this.getDeviceType();
    const cloudKey = getCloudKey(targetId);
    const payload: DeviceSyncRawData = {
      active_device: null,
      device_id: this.deviceId,
      device_type: myType,
      updated_at: now,
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
      return json?.status === 'SUCCESS';
    } catch (e) {
      console.warn('[DeviceSync] Erro ao liberar farm:', e);
      return false;
    }
  }

  /**
   * Consulta o estado remoto na nuvem com resolução inequívoca de dispositivo
   */
  public async fetchRemoteState(syncId?: string): Promise<DeviceSyncRemoteState | null> {
    const targetId = syncId || this.currentSyncId;
    if (!targetId) return null;
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
        // Objeto não existe ou chave não encontrada
        return null;
      }

      const data = decodeDeviceSyncState(resJson.val);
      if (!data) return null;
      const now = Math.floor(Date.now() / 1000);
      const isRecent = now - (data.updated_at || 0) < TIMEOUT_SECONDS;

      const myType = this.getDeviceType();
      const otherType = this.getOtherDeviceType();

      // Exclusão Mútua Inequívoca:
      // Se active_device for nulo ou o timestamp estiver expirado (> 3min), ninguém está ativo (Standby)
      const hasActive = Boolean(data.active_device) && isRecent;

      // É o dispositivo atual se:
      // 1. O device_id for exatamente o deste dispositivo, OU
      // 2. O active_device coincidir com o tipo deste dispositivo E o device_id for o dele
      const isCurrentActive =
        hasActive &&
        (data.device_id === this.deviceId ||
          (data.active_device === myType && (!data.device_id || data.device_id === this.deviceId)));

      // É o outro dispositivo se houver farm ativo que NÃO seja o dispositivo atual
      const isOtherActive = hasActive && !isCurrentActive;

      return {
        syncId: targetId,
        activeDevice: hasActive ? data.active_device : null,
        lastUpdated: data.updated_at || 0,
        isOtherDeviceActive: isOtherActive,
        isCurrentDeviceActive: isCurrentActive,
        otherDeviceType: otherType,
      };
    } catch (e) {
      console.warn('[DeviceSync] Falha na consulta de estado remoto:', e);
      return null;
    }
  }

  /**
   * Inicia o polling contínuo (a cada intervalo de segundos) com heartbeat automático
   */
  public startPolling(
    intervalSeconds = 60,
    onUpdate: (state: DeviceSyncRemoteState) => void
  ): void {
    this.stopPolling();

    const poll = async () => {
      const targetId = this.currentSyncId;
      if (!targetId) return;

      // Heartbeat: se este dispositivo estiver ativamente farmando, renova o timestamp no cloud
      if (this.isFarmingCheck && this.isFarmingCheck()) {
        await this.claimActive(targetId).catch(() => {});
      }

      const state = await this.fetchRemoteState(targetId);
      if (state) {
        onUpdate(state);
      }
    };

    // Dispara a primeira checagem imediatamente
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
