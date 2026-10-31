// ============================================================
// Lightweight client-side validation helpers
// ============================================================

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export const isUsername = (v: string) => /^[a-zA-Z0-9._]{3,20}$/.test(v.trim());

export const isPhonePH = (v: string) =>
  /^(09\d{9}|\+639\d{9})$/.test(v.replace(/[\s-]/g, ''));

export function passwordIssue(v: string): string | null {
  if (v.length < 8) return 'Password must be at least 8 characters';
  return null;
}

/** Password strength 0-4 (used only for a subtle visual hint). */
export function passwordStrength(v: string): number {
  let s = 0;
  if (v.length >= 8) s++;
  if (v.length >= 10) s++;
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
  if (/\d/.test(v) && /[^A-Za-z0-9]/.test(v)) s++;
  return Math.min(s, 4);
}
