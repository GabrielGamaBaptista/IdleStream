export interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
  size?: number;
  content_type?: string;
}

export interface GitHubRelease {
  tag_name: string;
  name?: string;
  body?: string;
  assets?: GitHubReleaseAsset[];
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  version: string;
  body?: string;
  apkUrl?: string;
  apkSize?: number;
}

/**
 * Remove prefixos 'v' ou caracteres não numéricos iniciais e espaços.
 */
export function cleanVersion(version: string): string {
  if (!version) return '0.0.0';
  return version.trim().replace(/^v/i, '');
}

/**
 * Compara duas versões SemVer (ex: 2.1.2 vs 2.1.1).
 * Retorna:
 *  1 se v1 > v2
 * -1 se v1 < v2
 *  0 se v1 == v2
 */
export function compareVersions(v1: string, v2: string): number {
  const clean1 = cleanVersion(v1);
  const clean2 = cleanVersion(v2);

  // Remove qualquer sufixo de pré-release para a comparação primária (ex: 2.1.2-beta -> 2.1.2)
  const core1 = clean1.split('-')[0];
  const core2 = clean2.split('-')[0];

  const parts1 = core1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = core2.split('.').map((p) => parseInt(p, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] ?? 0;
    const num2 = parts2[i] ?? 0;

    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
}

/**
 * Retorna true se remoteVersion for estritamente superior a currentVersion.
 */
export function isNewerVersion(remoteVersion: string, currentVersion: string): boolean {
  return compareVersions(remoteVersion, currentVersion) > 0;
}

/**
 * Localiza o asset de APK mais apropriado para o Android.
 * Prioriza arm64 (aarch64) que é o padrão da maioria dos smartphones modernos.
 */
export function findAndroidApkAsset(
  assets: GitHubReleaseAsset[]
): { name: string; url: string; size?: number } | null {
  if (!Array.isArray(assets) || assets.length === 0) return null;

  const apkAssets = assets.filter((a) => a.name && a.name.toLowerCase().endsWith('.apk'));
  if (apkAssets.length === 0) return null;

  // 1. Tenta encontrar arm64 especificamente
  const arm64Apk = apkAssets.find(
    (a) => a.name.toLowerCase().includes('arm64') || a.name.toLowerCase().includes('aarch64')
  );
  if (arm64Apk) {
    return {
      name: arm64Apk.name,
      url: arm64Apk.browser_download_url,
      size: arm64Apk.size,
    };
  }

  // 2. Se não houver arm64 explícito, pega o primeiro APK (universal)
  const firstApk = apkAssets[0];
  return {
    name: firstApk.name,
    url: firstApk.browser_download_url,
    size: firstApk.size,
  };
}

/**
 * Analisa os dados de uma release do GitHub e determina se há atualização e qual o asset APK.
 */
export function parseGitHubRelease(
  release: GitHubRelease,
  currentVersion: string
): UpdateCheckResult {
  const remoteTag = release?.tag_name || '';
  const remoteVersion = cleanVersion(remoteTag);
  const hasUpdate = isNewerVersion(remoteVersion, currentVersion);

  const apkAsset = findAndroidApkAsset(release?.assets || []);

  return {
    hasUpdate,
    version: remoteVersion,
    body: release?.body || release?.name || undefined,
    apkUrl: apkAsset?.url,
    apkSize: apkAsset?.size,
  };
}
