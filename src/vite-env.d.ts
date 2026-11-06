/// <reference types="vite/client" />

interface AndroidBridge {
  isBatteryOptimizationIgnored(): boolean;
  requestIgnoreBatteryOptimization(): void;
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
  clearCrashLog?(): boolean;
  canInstallPackages?(): boolean;
  requestInstallPermission?(): void;
  downloadAndInstallApk?(apkUrl: string): void;
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
