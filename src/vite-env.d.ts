/// <reference types="vite/client" />

interface AndroidBridge {
  isBatteryOptimizationIgnored(): boolean;
  requestIgnoreBatteryOptimization(): void;
  openAppSettings?(): void;
  canDrawOverlays?(): boolean;
  requestOverlayPermission?(): void;
  hasNotificationPermission?(): boolean;
  getOemGuidanceJson?(): string;
  setFarmingActive?(active: boolean): void;
  startForegroundService(): void;
  stopForegroundService(): void;
  updateNotification(title: string, text: string): void;
  isAndroid(): boolean;
  openTwitchLogin(accountId: string, accountLabel?: string): void;
  openKickLogin(accountId: string, accountLabel: string): void;
  openStreamRedeem?(
    platform: string,
    channelSlug: string,
    accountId: string,
    accountLabel: string,
    accountUsername: string,
    authToken: string,
    kickSession: string,
    sessionToken: string,
    xsrfToken: string
  ): void;
  getCrashLog?(): string;
  getDiagnosticReport?(): string;
  clearCrashLog?(): boolean;
  canInstallPackages?(): boolean;
  requestInstallPermission?(): void;
  downloadAndInstallApk?(apkUrl: string): void;
  openVoteWebView?(
    accountId: string,
    targetUrl: string,
    linkedSlotId: string,
    shareGameProfile: boolean
  ): void;
  closeVoteWebView?(): void;
  updateVoteWebViewBounds?(x: number, y: number, width: number, height: number, visible: boolean): void;
  hideVoteWebView?(): void;
  reloadVoteWebView?(): void;
  clearVoteTopIdleSession?(targetUrl: string): void;
  getActiveVoteAccount?(): string;
  syncVoteAlarms?(jsonAccounts: string): void;
  sendVoteTestNotification?(accountId: string, title: string, text: string): void;
  consumePendingOpenTab?(): string;
}

interface Window {
  AndroidBridge?: AndroidBridge;
  __onAndroidTwitchAuth?: (accountId: string, token: string) => void;
  __onAndroidKickAuth?: (
    accountId: string,
    kickSession: string,
    sessionToken: string,
    xsrfToken: string
  ) => void;
}
