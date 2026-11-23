export const isAndroidPlatform = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as unknown as { AndroidBridge?: { isAndroid?: () => boolean } }).AndroidBridge?.isAndroid?.()
  );
};

export const isDesktopPlatform = (): boolean => {
  return !isAndroidPlatform();
};
