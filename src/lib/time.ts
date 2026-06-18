// Short relative-time formatting for freshness chips (e.g. "just now", "5m ago", "2h ago").

export function relativeTime(epochMs: number, now: number = Date.now()): string {
  const secs = Math.max(0, Math.round((now - epochMs) / 1000));
  if (secs < 45) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
