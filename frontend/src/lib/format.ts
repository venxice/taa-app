/** Shared formatting helpers. */

export function formatPeso(n: number | null | undefined) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n ?? 0);
}

export function formatDate(
  d: string | Date | null | undefined,
  opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
) {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-PH', opts);
}

export function formatDateTime(d: string | Date | null | undefined) {
  return formatDate(d, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "just now", "5m ago", "3h ago", "2d ago", then a date. */
export function timeAgo(d: string | Date | null | undefined) {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function fullName(u?: { firstName?: string; middleName?: string; lastName?: string } | null) {
  if (!u) return '';
  return [u.firstName, u.middleName, u.lastName].filter(Boolean).join(' ');
}
