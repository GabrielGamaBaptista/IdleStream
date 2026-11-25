import { invoke } from '@tauri-apps/api/core';
import { PokeIdleGameState, SlotBounds } from '../types';
import { isAndroidPlatform } from '../utils/platform';

export { isAndroidPlatform };

interface AndroidBridgeType {
  isAndroid: () => boolean;
  startGameSlot: (slotId: string, url: string, zoom: number) => void;
  stopGameSlot: (slotId: string) => void;
  reloadGameSlot: (slotId: string) => void;
  updateGameSlotBounds: (jsonBounds: string) => void;
  setGameSlotZoom: (slotId: string, zoom: number) => void;
  setGameSlotFps: (fps: number) => void;
  togglePokeIdleUltra: (slotId: string, forceState: string) => void;
  hideAllGameSlots: () => void;
  getActiveGameSlots: () => string;
}

const getAndroidBridge = (): AndroidBridgeType | null => {
  if (typeof window === 'undefined') return null;
  return ((window as unknown as { AndroidBridge?: AndroidBridgeType }).AndroidBridge) || null;
};

export const gamePlatformService = {
  isAndroid: isAndroidPlatform,

  async startSlot(slotId: string, url: string, zoom = 1.0): Promise<void> {
    const bridge = getAndroidBridge();
    if (bridge) {
      bridge.startGameSlot(slotId, url, zoom);
      return;
    }
    await invoke('game_start_slot', { slotId, url, zoom });
  },

  async stopSlot(slotId: string): Promise<void> {
    const bridge = getAndroidBridge();
    if (bridge) {
      bridge.stopGameSlot(slotId);
      return;
    }
    await invoke('game_stop_slot', { slotId });
  },

  async reloadSlot(slotId: string): Promise<void> {
    const bridge = getAndroidBridge();
    if (bridge) {
      bridge.reloadGameSlot(slotId);
      return;
    }
    await invoke('game_reload_slot', { slotId });
  },

  async updateSlotsBounds(bounds: SlotBounds[]): Promise<void> {
    const bridge = getAndroidBridge();
    if (bridge) {
      bridge.updateGameSlotBounds(JSON.stringify(bounds));
      return;
    }
    await invoke('game_update_slots_bounds', { bounds });
  },

  async setSlotZoom(slotId: string, zoom: number): Promise<void> {
    const bridge = getAndroidBridge();
    if (bridge) {
      bridge.setGameSlotZoom(slotId, zoom);
      return;
    }
    await invoke('game_set_slot_zoom', { slotId, zoom });
  },

  async setFps(fps: number): Promise<void> {
    const bridge = getAndroidBridge();
    if (bridge) {
      bridge.setGameSlotFps(fps);
      return;
    }
    await invoke('game_set_fps', { fps });
  },

  async setEcoMode(enabled: boolean): Promise<void> {
    const bridge = getAndroidBridge();
    if (bridge) {
      bridge.setGameSlotFps(enabled ? 30 : 60);
      return;
    }
    await invoke('game_set_eco_mode', { enabled });
  },

  async getEcoMode(): Promise<boolean> {
    const bridge = getAndroidBridge();
    if (bridge) {
      return true;
    }
    try {
      return await invoke<boolean>('game_get_eco_mode');
    } catch {
      return true;
    }
  },

  async togglePokeIdleUltra(slotId?: string, forceState?: boolean): Promise<void> {
    const bridge = getAndroidBridge();
    if (bridge) {
      const stateStr = forceState !== undefined ? String(forceState) : '';
      bridge.togglePokeIdleUltra(slotId || '', stateStr);
      return;
    }
    await invoke('game_toggle_pokeidle_ultra', {
      slotId: slotId || null,
      enabled: forceState !== undefined ? forceState : null,
    });
  },

  async triggerBattlePassClaim(slotId: string): Promise<void> {
    const bridge = getAndroidBridge();
    if (bridge && typeof (bridge as any).triggerBattlePassClaim === 'function') {
      (bridge as any).triggerBattlePassClaim(slotId);
      return;
    }
    await invoke('game_trigger_battle_pass_claim', { slotId });
  },

  async hideAll(): Promise<void> {
    const bridge = getAndroidBridge();
    if (bridge) {
      bridge.hideAllGameSlots();
      return;
    }
    await invoke('game_hide_all');
  },

  async trimMemory(): Promise<void> {
    if (isAndroidPlatform()) return;
    try {
      await invoke('game_trim_memory');
    } catch (_) {}
  },

  async getActiveSlots(): Promise<string[]> {
    const bridge = getAndroidBridge();
    if (bridge) {
      try {
        const raw = bridge.getActiveGameSlots();
        return JSON.parse(raw || '[]');
      } catch {
        return [];
      }
    }
    return await invoke<string[]>('game_get_active_slots');
  },

  async getSystemIdleSeconds(): Promise<number> {
    const bridge = getAndroidBridge();
    if (bridge) {
      try {
        if (typeof (bridge as any).getUserIdleSeconds === 'function') {
          return Number((bridge as any).getUserIdleSeconds()) || 0;
        }
      } catch {
        return 0;
      }
      return 0;
    }
    try {
      return await invoke<number>('game_get_system_idle_seconds');
    } catch {
      return 0;
    }
  },

  async isWindowForeground(): Promise<boolean> {
    const bridge = getAndroidBridge();
    if (bridge) return true;
    try {
      return await invoke<boolean>('game_is_window_foreground');
    } catch {
      return true;
    }
  },

  async getLastGameActivityMs(): Promise<number> {
    const bridge = getAndroidBridge();
    if (bridge) return 0;
    try {
      return await invoke<number>('game_get_last_activity_ms');
    } catch {
      return 0;
    }
  },

  syncFarmingActive(active: boolean): void {
    if (typeof window === 'undefined') return;
    try {
      window.AndroidBridge?.setFarmingActive?.(active);
    } catch (_) {}
  },

  async readSlotState(slotId: string): Promise<PokeIdleGameState | null> {
    const bridge = getAndroidBridge();
    if (bridge) return null;
    try {
      return await invoke<PokeIdleGameState | null>('game_read_slot_state', { slotId });
    } catch {
      return null;
    }
  },

  async getAllGameStates(): Promise<Record<string, PokeIdleGameState>> {
    const bridge = getAndroidBridge();
    if (bridge) return {};
    try {
      return await invoke<Record<string, PokeIdleGameState>>('game_get_all_states');
    } catch {
      return {};
    }
  },

  async freezeSlot(slotId: string): Promise<string | null> {
    const bridge = getAndroidBridge();
    if (bridge) return null;
    try {
      return await invoke<string | null>('game_freeze_slot', { slotId });
    } catch {
      return null;
    }
  },

  async unfreezeSlot(slotId: string): Promise<void> {
    const bridge = getAndroidBridge();
    if (bridge) return;
    try {
      await invoke('game_unfreeze_slot', { slotId });
    } catch (_) {}
  },

  async getSlotSnapshot(slotId: string): Promise<string | null> {
    const bridge = getAndroidBridge();
    if (bridge) return null;
    try {
      return await invoke<string | null>('game_get_slot_snapshot', { slotId });
    } catch {
      return null;
    }
  },

  async getAllSnapshots(): Promise<Record<string, string>> {
    const bridge = getAndroidBridge();
    if (bridge) return {};
    try {
      return await invoke<Record<string, string>>('game_get_all_snapshots');
    } catch {
      return {};
    }
  },
};
