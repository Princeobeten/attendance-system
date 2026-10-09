// Readers report UIDs in different shapes ("04:A2:3B:..", "04 a2 3b", "04A23B").
// Store one canonical form: uppercase hex with no separators.
export function normalizeUid(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const uid = raw.replace(/[\s:-]/g, "").toUpperCase();
  return /^[0-9A-F]{4,32}$/.test(uid) ? uid : null;
}
