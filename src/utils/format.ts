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
