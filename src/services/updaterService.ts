import { check, Update } from '@tauri-apps/plugin-updater';
import { parseGitHubRelease, cleanVersion } from '../utils/version';

export interface UnifiedUpdateResult {
  hasUpdate: boolean;
  version: string;
  body?: string;
  platform: 'android' | 'desktop';
  apkUrl?: string;
  apkSize?: number;
  desktopUpdate?: Update;
}

const GITHUB_OWNER = 'GabrielGamaBaptista';
const GITHUB_REPO = 'IdleStream';

export function isAndroidPlatform(): boolean {
  return typeof window !== 'undefined' && Boolean(window.AndroidBridge?.isAndroid?.());
}

/**
 * Consulta atualizações de forma unificada no Desktop ou no Android.
 */
export async function checkForAppUpdates(currentAppVersion: string): Promise<UnifiedUpdateResult> {
  const isAndroid = isAndroidPlatform();

  if (!isAndroid) {
    // === FLUXO DESKTOP ===
    try {
      const update = await check();
      if (update?.available) {
        return {
          hasUpdate: true,
          version: update.version,
          body: update.body,
          platform: 'desktop',
          desktopUpdate: update,
        };
      }
      return {
        hasUpdate: false,
        version: currentAppVersion,
        platform: 'desktop',
      };
    } catch (desktopErr) {
      console.warn('Falha ao verificar update via plugin desktop:', desktopErr);
      throw desktopErr;
    }
  }

  // === FLUXO ANDROID (GitHub Releases) ===
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (response.ok) {
      const releaseData = await response.json();
      const parsed = parseGitHubRelease(releaseData, currentAppVersion);

      return {
        hasUpdate: parsed.hasUpdate,
        version: parsed.version,
        body: parsed.body,
        platform: 'android',
        apkUrl: parsed.apkUrl,
        apkSize: parsed.apkSize,
      };
    }

    // Fallback para latest.json caso a API do GitHub atinja rate-limit de IP
    const latestJsonResp = await fetch(
      `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest/download/latest.json`
    );

    if (latestJsonResp.ok) {
      const latestJson = await latestJsonResp.json();
      const remoteVersion = cleanVersion(latestJson.version || '');
      const parsed = parseGitHubRelease(
        {
          tag_name: `v${remoteVersion}`,
          body: latestJson.notes,
          assets: [
            {
              name: `IdleStream_${remoteVersion}_arm64.apk`,
              browser_download_url: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/v${remoteVersion}/IdleStream_${remoteVersion}_arm64.apk`,
            },
          ],
        },
        currentAppVersion
      );

      return {
        hasUpdate: parsed.hasUpdate,
        version: parsed.version,
        body: parsed.body,
        platform: 'android',
        apkUrl: parsed.apkUrl,
        apkSize: parsed.apkSize,
      };
    }

    throw new Error(`Servidor de atualizações respondeu com status ${response.status}`);
  } catch (androidErr) {
    console.warn('Falha ao verificar update no Android via GitHub:', androidErr);
    throw androidErr;
  }
}

/**
 * Dispara o download e instalação da atualização conforme a plataforma.
 */
export async function installAppUpdate(
  updateResult: UnifiedUpdateResult,
  onProgress?: (percent: number) => void
): Promise<void> {
  if (updateResult.platform === 'desktop') {
    if (!updateResult.desktopUpdate) {
      throw new Error('Atualização desktop não inicializada.');
    }
    await updateResult.desktopUpdate.downloadAndInstall();
    return;
  }

  // Plataforma Android
  if (!updateResult.apkUrl) {
    throw new Error('URL do arquivo APK não encontrada na release.');
  }

  if (!window.AndroidBridge?.downloadAndInstallApk) {
    throw new Error('Interface nativa AndroidBridge não disponível no dispositivo.');
  }

  // Notifica progresso inicial
  if (onProgress) {
    onProgress(1);
  }

  // Invoca o download nativo com suporte a FileProvider e Intent nativa
  window.AndroidBridge.downloadAndInstallApk(updateResult.apkUrl);
}
