import type { Equipment, Job, JobStatus, Property } from "./types";

export type RangeKey =
  | "today" | "yesterday" | "this-week" | "last-7" | "this-month"
  | "last-30" | "this-quarter" | "ytd" | "custom" | "all-time";

export interface JobFilters {
  range: RangeKey;
  customStart?: string; // yyyy-mm-dd
  customEnd?: string;
  techIds: string[];   // [] = all
  statuses: JobStatus[]; // [] = all
  brands: string[];      // [] = all
  jobTypes: string[];    // [] = all (uses derived type tag)
  customerId?: string;
  propertyId?: string;
}

export const DEFAULT_FILTERS: JobFilters = {
  range: "last-30",
  techIds: [],
  statuses: [],
  brands: [],
  jobTypes: [],
};

export interface RangeBounds {
  start: Date;
  end: Date;
  label: string;
  invalid?: string;
}

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

export function rangeBounds(f: JobFilters, now = new Date()): RangeBounds {
  switch (f.range) {
    case "today":      return { start: startOfDay(now), end: endOfDay(now), label: "Today" };
    case "yesterday":  { const d = new Date(now); d.setDate(d.getDate() - 1); return { start: startOfDay(d), end: endOfDay(d), label: "Yesterday" }; }
    case "this-week":  { const d = new Date(now); const s = new Date(d); s.setDate(d.getDate() - d.getDay()); return { start: startOfDay(s), end: endOfDay(now), label: "This week" }; }
    case "last-7":     { const s = new Date(now); s.setDate(s.getDate() - 6); return { start: startOfDay(s), end: endOfDay(now), label: "Last 7 days" }; }
    case "this-month": return { start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), end: endOfDay(now), label: "This month" };
    case "last-30":    { const s = new Date(now); s.setDate(s.getDate() - 29); return { start: startOfDay(s), end: endOfDay(now), label: "Last 30 days" }; }
    case "this-quarter": { const q = Math.floor(now.getMonth() / 3); return { start: startOfDay(new Date(now.getFullYear(), q * 3, 1)), end: endOfDay(now), label: "This quarter" }; }
    case "ytd":        return { start: startOfDay(new Date(now.getFullYear(), 0, 1)), end: endOfDay(now), label: "Year to date" };
    case "all-time":   return { start: new Date(0), end: endOfDay(now), label: "All time" };
    case "custom": {
      if (!f.customStart || !f.customEnd) return { start: startOfDay(now), end: endOfDay(now), label: "Custom (incomplete)", invalid: "Pick both start and end dates." };
      const s = new Date(`${f.customStart}T00:00:00`);
      const e = new Date(`${f.customEnd}T23:59:59`);
      if (isNaN(+s) || isNaN(+e)) return { start: s, end: e, label: "Custom", invalid: "Invalid date format." };
      if (s > e) return { start: s, end: e, label: "Custom", invalid: "Start date is after end date." };
      return { start: s, end: e, label: `${f.customStart} → ${f.customEnd}` };
    }
  }
}

export const RANGE_OPTIONS: { k: RangeKey; label: string }[] = [
  { k: "today", label: "Today" }, { k: "yesterday", label: "Yesterday" },
  { k: "this-week", label: "This week" }, { k: "last-7", label: "Last 7 days" },
  { k: "this-month", label: "This month" }, { k: "last-30", label: "Last 30 days" },
  { k: "this-quarter", label: "This quarter" }, { k: "ytd", label: "Year to date" },
  { k: "all-time", label: "All time" }, { k: "custom", label: "Custom range" },
];

export const JOB_TYPES = ["Repair", "Maintenance", "Install", "Inspection", "Warranty", "Other"] as const;

/** Light heuristic to tag a job type from the complaint until we add an explicit field. */
export function deriveJobType(job: Job): string {
  const c = (job.complaint || "").toLowerCase();
  if (/maint|tune|seasonal|check[- ]?up/.test(c)) return "Maintenance";
  if (/install|replace.*unit|new system/.test(c)) return "Install";
  if (/warranty/.test(c)) return "Warranty";
  if (/inspect/.test(c)) return "Inspection";
  return "Repair";
}

export interface FilterContext {
  equipment: Equipment[];
  properties: Property[];
}

/**
 * Single source of truth for owner-side job filtering. Every dashboard,
 * list, chart, and export MUST call this with the same filter object to
 * stay in sync. Empty arrays = "all".
 */
export function applyJobFilters(jobs: Job[], filters: JobFilters, ctx: FilterContext): Job[] {
  const b = rangeBounds(filters);
  if (b.invalid) return [];
  const start = +b.start;
  const end = +b.end;
  return jobs.filter((j) => {
    const t = +new Date(j.scheduledFor);
    if (t < start || t > end) return false;
    if (filters.techIds.length > 0 && !filters.techIds.includes(j.technicianId)) return false;
    if (filters.statuses.length > 0 && !filters.statuses.includes(j.status)) return false;
    if (filters.brands.length > 0) {
      const eq = ctx.equipment.find((e) => e.id === j.equipmentId);
      if (!eq || !filters.brands.includes(eq.manufacturer)) return false;
    }
    if (filters.jobTypes.length > 0 && !filters.jobTypes.includes(deriveJobType(j))) return false;
    if (filters.customerId && j.customerId !== filters.customerId) return false;
    if (filters.propertyId && j.propertyId !== filters.propertyId) return false;
    return true;
  });
}

export function activeFilterCount(f: JobFilters): number {
  return (f.techIds.length > 0 ? 1 : 0)
    + (f.statuses.length > 0 ? 1 : 0)
    + (f.brands.length > 0 ? 1 : 0)
    + (f.jobTypes.length > 0 ? 1 : 0)
    + (f.customerId ? 1 : 0)
    + (f.propertyId ? 1 : 0);
}

export function summarize(f: JobFilters, b: RangeBounds): string[] {
  const chips: string[] = [b.label];
  if (f.techIds.length > 0) chips.push(`${f.techIds.length} tech${f.techIds.length > 1 ? "s" : ""}`);
  if (f.statuses.length > 0) chips.push(`Status: ${f.statuses.length === 1 ? f.statuses[0] : `${f.statuses.length} selected`}`);
  if (f.brands.length > 0) chips.push(`Brand: ${f.brands.length === 1 ? f.brands[0] : `${f.brands.length}`}`);
  if (f.jobTypes.length > 0) chips.push(`Type: ${f.jobTypes.length === 1 ? f.jobTypes[0] : `${f.jobTypes.length}`}`);
  return chips;
}
