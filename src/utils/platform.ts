export const isAndroidPlatform = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hasBridge = Boolean(
    (window as unknown as { AndroidBridge?: { isAndroid?: () => boolean } }).AndroidBridge?.isAndroid?.()
  );
  if (hasBridge) return true;
  return typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent || '');
};

export const isDesktopPlatform = (): boolean => {
  return !isAndroidPlatform();
};
