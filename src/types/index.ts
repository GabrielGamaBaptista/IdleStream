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

export interface PokeIdleGameState {
  slotId?: string;
  nick?: string | null;
  level?: number | null;
  xp?: number | null;
  gold?: number | null;
  diamonds?: number | null;
  huntSlug?: string | null;
  bonusTwitchSecs?: number | null;
  bonusKickSecs?: number | null;
  xpRatePerHour?: number | null;
  updatedAt?: number;
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
  vote_sync_id?: string | null;
  device_sync_id?: string | null;
}

export interface DeviceSyncRemoteState {
  syncId: string;
  activeDevice: 'desktop' | 'mobile' | null;
  lastUpdated: number;
  isOtherDeviceActive: boolean;
  isCurrentDeviceActive: boolean;
  otherDeviceType: 'desktop' | 'mobile';
}

export interface RuntimeSessionState {
  desired_active_stream_ids: string[];
  desired_active_game_slots: string[];
  last_active_tab?: string | null;
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
  is_farming?: boolean;
  message?: string;
  uptime_seconds: number;
  estimated_ram_mb: number;
  connected_at?: number;
  channel_points?: string;
  account_points?: Record<string, string>;
}

export interface SafetyStartResult {
  crash_count: number;
  last_good_version: string | null;
}

export interface BackupInfo {
  id: string;
  created_at: number;
  version: string;
  reason: string;
  file_count: number;
}

export interface NightStreamSummary {
  channel: string;
  platform: string;
  was_live: boolean;
}

export interface MorningReport {
  duration_minutes: number;
  active_game_slots: string[];
  streams_summary: NightStreamSummary[];
}

export interface NightModeStatus {
  active: boolean;
  started_at: number | null;
  duration_minutes: number;
}

export interface ExportStatus {
  active: boolean;
  port: number;
  local_ip: string;
  export_url: string;
  remaining_seconds: number;
  exports_count: number;
  max_exports: number;
}


