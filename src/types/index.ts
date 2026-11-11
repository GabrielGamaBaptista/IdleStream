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

export interface VoteAccountConfig {
  id: string;
  label: string;
  player_identifier: string;
  base_url: string;
  linked_game_slot_id?: string | null;
  share_game_profile: boolean;
  google_hint?: string | null;
  color: string;
  last_voted_at?: number | null;
  last_notified_for_vote_at?: number | null;
  total_votes: number;
  notifications_enabled: boolean;
}

export interface VoteBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

export interface VoteReadyNotificationPayload {
  account_id: string;
  label: string;
  player_identifier: string;
  last_voted_at: number;
  ready_at: number;
  title: string;
  body: string;
  is_test: boolean;
}

export interface VoteUrlChangedPayload {
  account_id: string;
  url: string;
  loading: boolean;
}

export interface VoteBlockedPayload {
  account_id: string;
  blocked_url: string;
  host: string;
}

export interface VoteDetectedHintPayload {
  account_id: string;
  reason: string;
}

export interface AppConfig {
  accounts: Account[];
  streams: StreamConfig[];
  settings: AppSettings;
  game_slots?: GameSlotConfig[];
  vote_accounts?: VoteAccountConfig[];
}

export type StatusKind = 'disconnected' | 'standby' | 'connecting' | 'connected' | 'error';

export type {
  AccountHealthState,
  AccountHealthStatus,
  AccountsHealthSummary,
} from '../utils/accountHealth';

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
