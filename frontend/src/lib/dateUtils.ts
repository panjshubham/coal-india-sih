/**
 * dateUtils.ts — CoalGuard IST Timezone Utilities
 *
 * All user-facing timestamps MUST be shown in IST (Asia/Kolkata, UTC+5:30).
 * This module uses browser-native Intl.DateTimeFormat — no external deps needed.
 *
 * Root cause fix: Supabase returns timestamps as UTC strings (e.g. "2026-09-12T10:47:22+00:00").
 * date-fns format() without a timezone option renders in the system/server timezone,
 * which may be UTC — causing the "10:47 instead of 16:17" bug.
 * These helpers always render in Asia/Kolkata regardless of system clock.
 */

const IST = 'Asia/Kolkata';

/**
 * Safely parse any timestamp string to a Date object.
 * Strings without a timezone suffix are treated as UTC (appends 'Z').
 */
export function parseTimestamp(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  try {
    // If the string has no timezone info, assume UTC to avoid double-offset
    const hasOffset = /[Zz]$|[+-]\d{2}:\d{2}$/.test(dateStr.trim());
    const normalised = hasOffset ? dateStr.trim() : dateStr.trim() + 'Z';
    const d = new Date(normalised);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/**
 * Primary format for violation lists: "12 Sep 2026, 16:17 IST"
 */
export function formatIST(dateStr: string | null | undefined): string {
  const d = parseTimestamp(dateStr);
  if (!d) return 'Unknown Date';
  try {
    const parts = new Intl.DateTimeFormat('en-IN', {
      timeZone: IST,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d);
    const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
    return `${get('day')} ${get('month')} ${get('year')}, ${get('hour')}:${get('minute')} IST`;
  } catch {
    return 'Unknown Date';
  }
}

/**
 * Short format (no IST label): "12 Sep 2026, 16:17"
 */
export function formatISTShort(dateStr: string | null | undefined): string {
  const d = parseTimestamp(dateStr);
  if (!d) return 'Unknown Date';
  try {
    const parts = new Intl.DateTimeFormat('en-IN', {
      timeZone: IST,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d);
    const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
    return `${get('day')} ${get('month')} ${get('year')}, ${get('hour')}:${get('minute')}`;
  } catch {
    return 'Unknown Date';
  }
}

/**
 * Long format for detail pages: "Saturday, 12 September 2026, 16:17 IST"
 */
export function formatISTLong(dateStr: string | null | undefined): string {
  const d = parseTimestamp(dateStr);
  if (!d) return 'Unknown Date';
  try {
    const parts = new Intl.DateTimeFormat('en-IN', {
      timeZone: IST,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d);
    const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
    return `${get('weekday')}, ${get('day')} ${get('month')} ${get('year')}, ${get('hour')}:${get('minute')} IST`;
  } catch {
    return 'Unknown Date';
  }
}

/**
 * Returns the current moment as an ISO 8601 string with +05:30 offset.
 * Use this INSTEAD of new Date().toISOString() for user-generated timestamps
 * so stored values carry explicit IST timezone info.
 */
export function nowIST(): string {
  const d = new Date();
  // UTC offset for IST = +330 minutes
  const offsetMs = 5.5 * 60 * 60 * 1000;
  const local = new Date(d.getTime() + offsetMs);
  // Replace trailing Z with +05:30
  return local.toISOString().replace('Z', '+05:30');
}
