export type Platform = 'twitch' | 'kick';

export interface Account {
  id: string;
  platform: Platform;
  label: string;
  username: string;
  oauth_token?: string;
  kick_session?: string;
  xsrf_token?: string;
  session_token?: string;
  enabled: boolean;
}

export interface StreamConfig {
  id: string;
  platform: Platform;
  channel_slug: string;
  account_ids: string[];
  selected_account_id?: string;
  auto_start: boolean;
  // Backward compatibility:
  account_id?: string;
}

export interface AppSettings {
  minimize_to_tray: boolean;
  start_with_windows: boolean;
  auto_reconnect: boolean;
  reconnect_delay_secs: number;
  auto_live_only: boolean;
  kick_mute_audio: boolean;
  kick_hide_chat: boolean;
  kick_lowest_quality: boolean;
}

export interface GameSlotConfig {
  id: string;
  label: string;
  url: string;
  color: string;
  auto_start: boolean;
  enable_hunt_extension?: boolean;
  zoom?: number;
}

export interface SlotBounds {
  slot_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

export interface AppConfig {
  accounts: Account[];
  streams: StreamConfig[];
  settings: AppSettings;
  game_slots?: GameSlotConfig[];
}

export type StatusKind = 'disconnected' | 'standby' | 'connecting' | 'connected' | 'error';

export interface StreamRuntimeStatus {
  stream_id: string;
  status: StatusKind;
  is_live: boolean;
  message?: string;
  uptime_seconds: number;
  estimated_ram_mb: number;
  connected_at?: number;
  channel_points?: string;
  account_points?: Record<string, string>;
}
