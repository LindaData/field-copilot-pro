// Pure HVAC calculation helpers used by both diagnostics and the QA suite.

export interface ToleranceResult {
  ok: boolean;
  low: number;
  high: number;
  reason?: string;
}

export function toleranceRange(rating: number, pct: number) {
  const delta = rating * (pct / 100);
  return { low: +(rating - delta).toFixed(2), high: +(rating + delta).toFixed(2) };
}

export function checkTolerance(measured: unknown, rating: number, pct: number): ToleranceResult {
  if (measured === null || measured === undefined || measured === "") return { ok: false, low: 0, high: 0, reason: "missing" };
  const n = typeof measured === "number" ? measured : Number(measured);
  if (!Number.isFinite(n)) return { ok: false, low: 0, high: 0, reason: "non-numeric" };
  if (n < 0) return { ok: false, low: 0, high: 0, reason: "negative" };
  if (!Number.isFinite(rating) || rating <= 0) return { ok: false, low: 0, high: 0, reason: "bad-rating" };
  if (!Number.isFinite(pct) || pct < 0) return { ok: false, low: 0, high: 0, reason: "bad-tolerance" };
  const { low, high } = toleranceRange(rating, pct);
  return { ok: n >= low && n <= high, low, high };
}

export function checkVoltageRange(measured: unknown, min = 197, max = 253) {
  if (measured === null || measured === undefined || measured === "") return { ok: false, reason: "missing" as const };
  const n = typeof measured === "number" ? measured : Number(measured);
  if (!Number.isFinite(n)) return { ok: false, reason: "non-numeric" as const };
  if (n < 0) return { ok: false, reason: "negative" as const };
  return { ok: n >= min && n <= max, min, max, value: n };
}
