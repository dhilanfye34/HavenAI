// Format a timestamp as "Just now" / "5m ago" / "2h ago" / "3d ago".
// Accepts either a Unix timestamp (seconds), ms since epoch, or ISO string.

export function timeAgo(input: number | string | undefined | null): string {
  if (input == null) return 'Unknown';

  let ms: number;
  if (typeof input === 'string') {
    ms = new Date(input).getTime();
  } else if (input < 10_000_000_000) {
    // Heuristic: values below ~year 2286 in seconds → treat as Unix seconds
    ms = input * 1000;
  } else {
    ms = input;
  }

  if (isNaN(ms)) return 'Unknown';

  const diff = Date.now() - ms;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
