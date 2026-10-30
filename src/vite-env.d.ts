/// <reference types="vite/client" />

interface AndroidBridge {
  isBatteryOptimizationIgnored(): boolean;
  requestIgnoreBatteryOptimization(): void;
  startForegroundService(): void;
  stopForegroundService(): void;
  updateNotification(title: string, text: string): void;
  isAndroid(): boolean;
  openTwitchLogin(accountId: string): void;
  openKickLogin(accountId: string, accountLabel: string): void;
  getCrashLog?(): string;
  clearCrashLog?(): boolean;
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
