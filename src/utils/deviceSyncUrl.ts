export const DEVICE_SYNC_BASE_URL = 'https://gabrielgamabaptista.github.io/IdleStream/sync';
export const DEVICE_SYNC_SCHEME = 'idlestream://device-sync';

/**
 * Constrói a URL universal HTTPS para leitura nativa da câmera de qualquer smartphone (Android / iOS).
 * Evita o erro "não há aplicativo no seu celular que possua as informações deste código qr".
 */
export function buildDeviceSyncUniversalUrl(syncId: string): string {
  const cleanId = (syncId || '').trim();
  if (!cleanId) return '';
  return `${DEVICE_SYNC_BASE_URL}?type=device&id=${encodeURIComponent(cleanId)}`;
}

/**
 * Constrói o Deep Link nativo do IdleStream registrado no AndroidManifest.xml.
 */
export function buildDeviceSyncNativeSchemeUrl(syncId: string): string {
  const cleanId = (syncId || '').trim();
  if (!cleanId) return '';
  return `${DEVICE_SYNC_SCHEME}?id=${encodeURIComponent(cleanId)}`;
}

/**
 * Extrai e normaliza com tolerância máxima a falhas o ID de pareamento informado pelo usuário,
 * seja ele uma chave hexadecimal pura, um esquema legadado, ou uma URL HTTPS / idlestream:// completa.
 */
export function extractDeviceSyncId(rawInput: string): string {
  if (!rawInput) return '';
  let clean = rawInput.trim();

  // Caso 1: String prefixada por esquema legado idlestream-devicesync:
  if (clean.toLowerCase().startsWith('idlestream-devicesync:')) {
    clean = clean.substring('idlestream-devicesync:'.length).trim();
  }

  // Caso 2: URL completa ou Deep Link com query parameter (id=...)
  if (clean.includes('id=')) {
    try {
      const normalizedUrl = clean.startsWith('idlestream://')
        ? clean.replace(/^idlestream:\/\//i, 'http://dummy/')
        : clean;
      const parsed = new URL(normalizedUrl);
      const queryId = parsed.searchParams.get('id');
      if (queryId && queryId.trim()) {
        return queryId.trim();
      }
    } catch (_) {
      // Fallback para regex caso o formato da URL não seja parseável pelo construtor URL
      const match = clean.match(/[?&]id=([^&#]+)/i);
      if (match && match[1]) {
        try {
          return decodeURIComponent(match[1]).trim();
        } catch (_) {
          return match[1].trim();
        }
      }
    }
  }

  // Caso 3: Remove possíveis aspas, espaços e caracteres de controle
  return clean.replace(/['"<>]/g, '').trim();
}
