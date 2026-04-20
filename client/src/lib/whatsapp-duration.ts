export const WHATSAPP_DURATION_WARN_MS = 60 * 60 * 1000;
export const WHATSAPP_DURATION_DANGER_MS = 24 * 60 * 60 * 1000;

export function getWhatsAppDurationColorClass(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms < 0) {
    return "text-muted-foreground";
  }
  if (ms >= WHATSAPP_DURATION_DANGER_MS) return "text-destructive";
  if (ms >= WHATSAPP_DURATION_WARN_MS) return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

export function formatWhatsAppDuration(ms: number | null | undefined): string | null {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms < 0) return null;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${Math.max(1, sec)}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m`;
  const hours = Math.floor(min / 60);
  const remMin = min % 60;
  if (hours < 24) return remMin ? `${hours}h ${remMin}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours ? `${days}d ${remHours}h` : `${days}d`;
}
