import { DeviceSyncRemoteState } from '../types';

const API_BASE_URL = 'https://api.restful-api.dev/objects';
const STORAGE_KEY_SYNC_ID = '__idlestream_device_sync_id__';
const TIMEOUT_SECONDS = 180; // 3 minutos sem atualização = outro dispositivo offline

export interface DeviceSyncRawData {
  active_device: 'desktop' | 'mobile' | null;
  device_id: string;
  device_type: 'desktop' | 'mobile';
  updated_at: number; // Unix timestamp em segundos
}

class DeviceSyncService {
  private deviceId: string;
  private deviceType: 'desktop' | 'mobile';
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private currentSyncId: string | null = null;

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

    const isAndroid =
      typeof window !== 'undefined' && Boolean(window.AndroidBridge?.isAndroid?.());
    this.deviceType = isAndroid ? 'mobile' : 'desktop';
    this.currentSyncId = this.getSyncId();
  }

  public getDeviceType(): 'desktop' | 'mobile' {
    return this.deviceType;
  }

  public getOtherDeviceType(): 'desktop' | 'mobile' {
    return this.deviceType === 'desktop' ? 'mobile' : 'desktop';
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
  public async createNewPairing(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const initialData: DeviceSyncRawData = {
      active_device: this.deviceType,
      device_id: this.deviceId,
      device_type: this.deviceType,
      updated_at: now,
    };

    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'idlestream-device-sync',
        data: initialData,
      }),
    });

    if (!response.ok) {
      throw new Error(`Falha ao registrar pareamento cloud (HTTP ${response.status})`);
    }

    const resJson = await response.json();
    const syncId = String(resJson.id || '');
    if (!syncId) {
      throw new Error('ID de pareamento não retornado pela API');
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
    const payload: DeviceSyncRawData = {
      active_device: this.deviceType,
      device_id: this.deviceId,
      device_type: this.deviceType,
      updated_at: now,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(targetId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'idlestream-device-sync',
          data: payload,
        }),
      });

      if (!response.ok) {
        console.warn(`[DeviceSync] Falha ao reivindicar farm ativo (HTTP ${response.status})`);
        return false;
      }
      return true;
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
    const payload: DeviceSyncRawData = {
      active_device: null,
      device_id: this.deviceId,
      device_type: this.deviceType,
      updated_at: now,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(targetId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'idlestream-device-sync',
          data: payload,
        }),
      });

      return response.ok;
    } catch (e) {
      console.warn('[DeviceSync] Erro ao liberar farm:', e);
      return false;
    }
  }

  /**
   * Consulta o estado remoto na nuvem
   */
  public async fetchRemoteState(syncId?: string): Promise<DeviceSyncRemoteState | null> {
    const targetId = syncId || this.currentSyncId;
    if (!targetId) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(targetId)}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Objeto expirou ou foi excluído da API de teste
          return null;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const resJson = await response.json();
      if (!resJson || !resJson.data) return null;

      const data = resJson.data as DeviceSyncRawData;
      const now = Math.floor(Date.now() / 1000);
      const isRecent = now - (data.updated_at || 0) < TIMEOUT_SECONDS;

      const otherType = this.getOtherDeviceType();
      const isOtherActive = isRecent && data.active_device === otherType;
      const isCurrentActive = isRecent && data.active_device === this.deviceType;

      return {
        syncId: targetId,
        activeDevice: data.active_device,
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
   * Inicia o polling contínuo (a cada intervalo de segundos)
   */
  public startPolling(
    intervalSeconds = 60,
    onUpdate: (state: DeviceSyncRemoteState) => void
  ): void {
    this.stopPolling();

    const poll = async () => {
      const targetId = this.currentSyncId;
      if (!targetId) return;
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
