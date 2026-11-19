export function formatUptime(seconds: number): string {
  if (seconds <= 0) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function formatPoints(points?: string | number | null): string {
  if (points === undefined || points === null || points === '') return '--';
  const num = typeof points === 'number' ? points : Number(points);
  if (isNaN(num)) return String(points);
  return num.toLocaleString('pt-BR');
}

/**
 * Converte strings de pontos (ex: "1520", "1,6 mil", "12.4k", "150.000") em números absolutos
 * para viabilizar ordenação numérica precisa entre streams.
 */
export function parsePointsNumber(points?: string | number | null): number {
  if (points === undefined || points === null || points === '') return 0;
  if (typeof points === 'number') return isNaN(points) ? 0 : points;

  const raw = String(points).trim().toLowerCase();
  if (raw === '--' || raw === '0') return 0;

  // Trata formato textual com "mil" (ex: "1,6 mil" -> 1600)
  if (raw.includes('mil')) {
    const val = parseFloat(raw.replace('mil', '').replace(/\s+/g, '').replace(',', '.'));
    return isNaN(val) ? 0 : Math.round(val * 1000);
  }

  // Trata formato abreviado "k" (ex: "12.4k" ou "12,4k" -> 12400)
  if (raw.endsWith('k')) {
    const val = parseFloat(raw.replace('k', '').replace(/\s+/g, '').replace(',', '.'));
    return isNaN(val) ? 0 : Math.round(val * 1000);
  }

  // Trata formato abreviado "m" (ex: "1.2m" -> 1200000)
  if (raw.endsWith('m') && !raw.includes('mil')) {
    const val = parseFloat(raw.replace('m', '').replace(/\s+/g, '').replace(',', '.'));
    return isNaN(val) ? 0 : Math.round(val * 1000000);
  }

  // Limpa separadores de milhar do pt-BR (ex: "150.000" -> 150000) e troca vírgula decimal
  const cleaned = raw.replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Extrai o valor numérico máximo de pontos de uma stream (entre channel_points e account_points)
 */
export function getStreamPoints(status?: {
  channel_points?: string;
  account_points?: Record<string, string>;
}): number {
  if (!status) return 0;
  let max = 0;
  if (status.channel_points) {
    const pts = parsePointsNumber(status.channel_points);
    if (pts > max) max = pts;
  }
  if (status.account_points) {
    for (const val of Object.values(status.account_points)) {
      const p = parsePointsNumber(val);
      if (p > max) max = p;
    }
  }
  return max;
}
