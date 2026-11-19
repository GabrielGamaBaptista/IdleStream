import { VoteAccountConfig } from '../types';

export interface VoteSyncSlotData {
  last_voted_at: number;
  total_votes: number;
}

export interface VoteSyncPayload {
  version: number;
  updated_at: number;
  device_id: string;
  slots: Record<string, VoteSyncSlotData>;
}

export interface VoteSyncStatus {
  isPaired: boolean;
  syncId: string | null;
  lastSyncedAt: number | null;
  isSyncing: boolean;
  syncError: string | null;
}

const STORAGE_KEY_SYNC_ID = '__idlestream_vote_sync_id__';
const STORAGE_KEY_SYNC_TIME = '__idlestream_vote_sync_time__';
const API_BASE_URL = 'https://api.restful-api.dev/objects';

class VoteSyncService {
  private deviceId: string;

  constructor() {
    let devId = '';
    try {
      devId = localStorage.getItem('__idlestream_device_uuid__') || '';
      if (!devId) {
        devId = 'dev_' + Math.random().toString(36).substring(2, 10);
        localStorage.setItem('__idlestream_device_uuid__', devId);
      }
    } catch (_) {
      devId = 'dev_fallback_' + Date.now();
    }
    this.deviceId = devId;
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
      if (syncId) {
        localStorage.setItem(STORAGE_KEY_SYNC_ID, syncId.trim());
      } else {
        localStorage.removeItem(STORAGE_KEY_SYNC_ID);
        localStorage.removeItem(STORAGE_KEY_SYNC_TIME);
      }
    } catch (_) {}
  }

  public getLastSyncedAt(): number | null {
    try {
      const val = localStorage.getItem(STORAGE_KEY_SYNC_TIME);
      return val ? Number(val) : null;
    } catch (_) {
      return null;
    }
  }

  public setLastSyncedAt(timestamp: number): void {
    try {
      localStorage.setItem(STORAGE_KEY_SYNC_TIME, String(timestamp));
    } catch (_) {}
  }

  /**
   * Gera um novo ID de pareamento único criando o documento na nuvem
   */
  public async createNewPairingId(accounts: VoteAccountConfig[]): Promise<string> {
    const initialPayload: VoteSyncPayload = {
      version: 1,
      updated_at: Math.floor(Date.now() / 1000),
      device_id: this.deviceId,
      slots: this.buildSlotsPayload(accounts),
    };

    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'idlestream-vote-sync',
        data: initialPayload,
      }),
    });

    if (!response.ok) {
      throw new Error(`Falha ao registrar pareamento (HTTP ${response.status})`);
    }

    const data = await response.json();
    const syncId = String(data.id || '');
    if (!syncId) {
      throw new Error('ID de pareamento não retornado pelo serviço');
    }

    this.setSyncId(syncId);
    this.setLastSyncedAt(Date.now());
    return syncId;
  }

  /**
   * Converte a lista de contas no mapa de slots serializável
   */
  public buildSlotsPayload(accounts: VoteAccountConfig[]): Record<string, VoteSyncSlotData> {
    const slots: Record<string, VoteSyncSlotData> = {};
    for (const acc of accounts) {
      slots[acc.id] = {
        last_voted_at: acc.last_voted_at || 0,
        total_votes: acc.total_votes || 0,
      };
    }
    return slots;
  }

  /**
   * Busca o estado remoto do pareamento
   */
  public async fetchRemoteVotes(syncId: string): Promise<VoteSyncPayload | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(syncId)}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      if (!json || !json.data || !json.data.slots) return null;
      return json.data as VoteSyncPayload;
    } catch (e) {
      console.warn('[VoteSync] Falha ao obter dados remotos:', e);
      return null;
    }
  }

  /**
   * Envia os votos locais atualizados para a nuvem
   */
  public async pushLocalVotes(syncId: string, accounts: VoteAccountConfig[]): Promise<boolean> {
    try {
      const payload: VoteSyncPayload = {
        version: 1,
        updated_at: Math.floor(Date.now() / 1000),
        device_id: this.deviceId,
        slots: this.buildSlotsPayload(accounts),
      };

      const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(syncId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'idlestream-vote-sync',
          data: payload,
        }),
      });

      if (response.ok) {
        this.setLastSyncedAt(Date.now());
        return true;
      }
      return false;
    } catch (e) {
      console.warn('[VoteSync] Falha ao enviar votos locais:', e);
      return false;
    }
  }

  /**
   * Reconciliação bidirecional automática (executada na inicialização do app ou sob demanda)
   * Regra estrita: max(local_timestamp, remote_timestamp)
   */
  public async reconcileVotesBidirectional(
    syncId: string,
    currentAccounts: VoteAccountConfig[],
    updateAccountFn: (acc: VoteAccountConfig) => Promise<void> | void
  ): Promise<{ updatedCount: number; pushedToRemote: boolean }> {
    const remoteData = await this.fetchRemoteVotes(syncId);
    if (!remoteData || !remoteData.slots) {
      // Se não há dados remotos válidos, sobe o estado local atual
      const pushed = await this.pushLocalVotes(syncId, currentAccounts);
      return { updatedCount: 0, pushedToRemote: pushed };
    }

    let localUpdatedCount = 0;
    let needsPushToRemote = false;
    const mergedAccounts: VoteAccountConfig[] = [];

    for (const localAcc of currentAccounts) {
      const remoteSlot = remoteData.slots[localAcc.id];
      if (!remoteSlot) {
        mergedAccounts.push(localAcc);
        needsPushToRemote = true;
        continue;
      }

      const localVoted = localAcc.last_voted_at || 0;
      const remoteVoted = remoteSlot.last_voted_at || 0;

      if (remoteVoted > localVoted) {
        // Celular votou mais recentemente que o Computador -> atualiza Computador
        const updatedAcc: VoteAccountConfig = {
          ...localAcc,
          last_voted_at: remoteVoted,
          total_votes: Math.max(localAcc.total_votes || 0, remoteSlot.total_votes || 0),
        };
        await updateAccountFn(updatedAcc);
        mergedAccounts.push(updatedAcc);
        localUpdatedCount++;
      } else if (localVoted > remoteVoted) {
        // Computador votou mais recentemente que o Celular -> agenda envio para a nuvem
        mergedAccounts.push(localAcc);
        needsPushToRemote = true;
      } else {
        mergedAccounts.push(localAcc);
      }
    }

    let pushed = false;
    if (needsPushToRemote) {
      pushed = await this.pushLocalVotes(syncId, mergedAccounts);
    } else {
      this.setLastSyncedAt(Date.now());
    }

    return { updatedCount: localUpdatedCount, pushedToRemote: pushed };
  }
}

export const voteSyncService = new VoteSyncService();
