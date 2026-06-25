import type { Equipment, Job, JobStatus, Property, Customer } from "./types";

export type RangeKey =
  | "today" | "yesterday" | "this-week" | "last-7" | "this-month"
  | "last-30" | "this-quarter" | "last-quarter" | "ytd" | "last-year"
  | "custom" | "all-time";

export type ServiceClassFilter = "Residential" | "Light Commercial";
export type CallbackFilter = "first" | "callback";

export interface JobFilters {
  range: RangeKey;
  customStart?: string;
  customEnd?: string;
  techIds: string[];
  statuses: JobStatus[];
  brands: string[];
  jobTypes: string[];
  serviceCategories: string[];
  billingTypes: string[];
  equipmentTypes: string[];
  serviceClasses: ServiceClassFilter[];
  cities: string[];
  customerIds: string[];
  propertyIds: string[];
  /** "first" = first visit only, "callback" = callback only, undefined = both */
  visitType?: CallbackFilter;
  /** Legacy flag preserved for backwards compatibility (synonym for visitType === "callback") */
  callbackOnly?: boolean;
  openOnly?: boolean;
  waitingPartsOnly?: boolean;
  maintenancePlanOnly?: boolean;
  revenueMin?: number;
  revenueMax?: number;
}

export const DEFAULT_FILTERS: JobFilters = {
  range: "last-30",
  techIds: [], statuses: [], brands: [], jobTypes: [],
  serviceCategories: [], billingTypes: [], equipmentTypes: [],
  serviceClasses: [],
  cities: [], customerIds: [], propertyIds: [],
};

export interface RangeBounds { start: Date; end: Date; label: string; invalid?: string; }

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

export function rangeBounds(f: JobFilters, now = new Date()): RangeBounds {
  switch (f.range) {
    case "today":     return { start: startOfDay(now), end: endOfDay(now), label: "Today" };
    case "yesterday": { const d = new Date(now); d.setDate(d.getDate() - 1); return { start: startOfDay(d), end: endOfDay(d), label: "Yesterday" }; }
    case "this-week": { const d = new Date(now); const s = new Date(d); s.setDate(d.getDate() - d.getDay()); return { start: startOfDay(s), end: endOfDay(now), label: "This week" }; }
    case "last-7":    { const s = new Date(now); s.setDate(s.getDate() - 6); return { start: startOfDay(s), end: endOfDay(now), label: "Last 7 days" }; }
    case "this-month": return { start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), end: endOfDay(now), label: "This month" };
    case "last-30":   { const s = new Date(now); s.setDate(s.getDate() - 29); return { start: startOfDay(s), end: endOfDay(now), label: "Last 30 days" }; }
    case "this-quarter": { const q = Math.floor(now.getMonth() / 3); return { start: startOfDay(new Date(now.getFullYear(), q * 3, 1)), end: endOfDay(now), label: "This quarter" }; }
    case "last-quarter": {
      const q = Math.floor(now.getMonth() / 3);
      const lqStartMonth = (q - 1) * 3;
      const year = lqStartMonth < 0 ? now.getFullYear() - 1 : now.getFullYear();
      const m = (lqStartMonth + 12) % 12;
      return { start: startOfDay(new Date(year, m, 1)), end: endOfDay(new Date(year, m + 3, 0)), label: "Last quarter" };
    }
    case "ytd":       return { start: startOfDay(new Date(now.getFullYear(), 0, 1)), end: endOfDay(now), label: "Year to date" };
    case "last-year": return { start: startOfDay(new Date(now.getFullYear() - 1, 0, 1)), end: endOfDay(new Date(now.getFullYear() - 1, 11, 31)), label: "Last year" };
    case "all-time":  return { start: new Date(0), end: endOfDay(now), label: "All time" };
    case "custom": {
      if (!f.customStart || !f.customEnd) return { start: startOfDay(now), end: endOfDay(now), label: "Custom (incomplete)", invalid: "Pick both start and end dates." };
      const s = new Date(`${f.customStart}T00:00:00`);
      const e = new Date(`${f.customEnd}T23:59:59`);
      if (isNaN(+s) || isNaN(+e)) return { start: s, end: e, label: "Custom", invalid: "Invalid date format." };
      if (s > e) return { start: s, end: e, label: "Custom", invalid: "End date is before start date." };
      return { start: s, end: e, label: `${f.customStart} → ${f.customEnd}` };
    }
  }
}

/** Compute the comparable previous period (same length, immediately prior). */
export function previousRangeBounds(b: RangeBounds): RangeBounds {
  const span = +b.end - +b.start;
  const end = new Date(+b.start - 1);
  const start = new Date(+end - span);
  return { start, end, label: `Previous ${Math.round(span / 86400000)}d` };
}

export const RANGE_OPTIONS: { k: RangeKey; label: string }[] = [
  { k: "today", label: "Today" }, { k: "yesterday", label: "Yesterday" },
  { k: "this-week", label: "This week" }, { k: "last-7", label: "Last 7 days" },
  { k: "this-month", label: "This month" }, { k: "last-30", label: "Last 30 days" },
  { k: "this-quarter", label: "This quarter" }, { k: "last-quarter", label: "Last quarter" },
  { k: "ytd", label: "Year to date" }, { k: "last-year", label: "Last year" },
  { k: "all-time", label: "All time" }, { k: "custom", label: "Custom range" },
];

export const JOB_TYPES = ["Repair", "Maintenance", "Install", "Inspection", "Warranty"] as const;
export const SERVICE_CATEGORIES = ["No Cooling", "No Heat", "Leak", "Noise", "Tune-Up", "Install", "Thermostat", "Other"] as const;
export const BILLING_TYPES = ["Billable", "Warranty", "Maintenance Plan"] as const;

/** Prefer the explicit seeded jobType; fall back to a heuristic. */
export function deriveJobType(job: Job): string {
  if (job.jobType) return job.jobType;
  const c = (job.complaint || "").toLowerCase();
  if (/maint|tune|seasonal/.test(c)) return "Maintenance";
  if (/install|replace.*unit|new system/.test(c)) return "Install";
  if (/warranty/.test(c)) return "Warranty";
  if (/inspect/.test(c)) return "Inspection";
  return "Repair";
}

export interface FilterContext {
  equipment: Equipment[];
  properties: Property[];
  customers: Customer[];
}

const OPEN_STATUSES: JobStatus[] = ["Scheduled", "En Route", "On Site", "Diagnosing", "Waiting for Approval", "Waiting for Parts", "Follow-Up"];

export function applyJobFilters(jobs: Job[], f: JobFilters, ctx: FilterContext): Job[] {
  const b = rangeBounds(f);
  if (b.invalid) return [];
  const start = +b.start, end = +b.end;
  return jobs.filter((j) => {
    const t = +new Date(j.scheduledFor);
    if (t < start || t > end) return false;
    if (f.techIds.length && !f.techIds.includes(j.technicianId)) return false;
    if (f.statuses.length && !f.statuses.includes(j.status)) return false;
    if (f.openOnly && !OPEN_STATUSES.includes(j.status)) return false;
    if (f.waitingPartsOnly && j.status !== "Waiting for Parts") return false;
    if ((f.visitType === "callback" || f.callbackOnly) && !j.isCallback) return false;
    if (f.visitType === "first" && j.isCallback) return false;
    const eq = ctx.equipment.find((e) => e.id === j.equipmentId);
    if (f.brands.length && (!eq || !f.brands.includes(eq.manufacturer))) return false;
    if (f.equipmentTypes.length && (!eq?.type || !f.equipmentTypes.includes(eq.type))) return false;
    if (f.jobTypes.length && !f.jobTypes.includes(deriveJobType(j))) return false;
    if (f.serviceCategories.length && (!j.serviceCategory || !f.serviceCategories.includes(j.serviceCategory))) return false;
    if (f.billingTypes.length && (!j.billingType || !f.billingTypes.includes(j.billingType))) return false;
    const cust = ctx.customers.find((c) => c.id === j.customerId);
    const prop = ctx.properties.find((p) => p.id === j.propertyId);
    const city = cust?.city ?? prop?.city;
    if (f.cities.length && (!city || !f.cities.includes(city))) return false;
    if (f.serviceClasses.length) {
      const sc = prop?.serviceClass ?? "Residential";
      if (!f.serviceClasses.includes(sc as ServiceClassFilter)) return false;
    }
    if (f.customerIds.length && !f.customerIds.includes(j.customerId)) return false;
    if (f.propertyIds.length && !f.propertyIds.includes(j.propertyId)) return false;
    if (f.maintenancePlanOnly && !cust?.maintenancePlan) return false;
    if (typeof f.revenueMin === "number" && (j.revenue ?? 0) < f.revenueMin) return false;
    if (typeof f.revenueMax === "number" && (j.revenue ?? 0) > f.revenueMax) return false;
    return true;
  });
}

export function activeFilterCount(f: JobFilters): number {
  let n = 0;
  const arr: (keyof JobFilters)[] = ["techIds","statuses","brands","jobTypes","serviceCategories","billingTypes","equipmentTypes","cities","customerIds","propertyIds"];
  for (const k of arr) if ((f[k] as string[]).length > 0) n++;
  if (f.callbackOnly) n++;
  if (f.openOnly) n++;
  if (f.waitingPartsOnly) n++;
  if (f.maintenancePlanOnly) n++;
  if (typeof f.revenueMin === "number" || typeof f.revenueMax === "number") n++;
  return n;
}

export interface Chip { key: string; label: string; clear: () => void; }

export function buildChips(
  f: JobFilters,
  patch: (p: Partial<JobFilters>) => void,
  ctx: { techs: { id: string; name: string }[]; customers: { id: string; name: string }[] },
): Chip[] {
  const chips: Chip[] = [];
  const mk = (key: string, label: string, clear: () => void) => chips.push({ key, label, clear });
  f.techIds.forEach((id) => {
    const name = ctx.techs.find((t) => t.id === id)?.name ?? id;
    mk(`tech:${id}`, `Tech: ${name}`, () => patch({ techIds: f.techIds.filter((x) => x !== id) }));
  });
  f.statuses.forEach((s) => mk(`status:${s}`, `Status: ${s}`, () => patch({ statuses: f.statuses.filter((x) => x !== s) })));
  f.brands.forEach((s) => mk(`brand:${s}`, `Brand: ${s}`, () => patch({ brands: f.brands.filter((x) => x !== s) })));
  f.jobTypes.forEach((s) => mk(`type:${s}`, `Type: ${s}`, () => patch({ jobTypes: f.jobTypes.filter((x) => x !== s) })));
  f.serviceCategories.forEach((s) => mk(`cat:${s}`, `Category: ${s}`, () => patch({ serviceCategories: f.serviceCategories.filter((x) => x !== s) })));
  f.billingTypes.forEach((s) => mk(`bill:${s}`, `Billing: ${s}`, () => patch({ billingTypes: f.billingTypes.filter((x) => x !== s) })));
  f.equipmentTypes.forEach((s) => mk(`eqt:${s}`, `Equipment: ${s}`, () => patch({ equipmentTypes: f.equipmentTypes.filter((x) => x !== s) })));
  f.cities.forEach((s) => mk(`city:${s}`, `City: ${s}`, () => patch({ cities: f.cities.filter((x) => x !== s) })));
  f.customerIds.forEach((id) => {
    const name = ctx.customers.find((c) => c.id === id)?.name ?? id;
    mk(`cust:${id}`, `Customer: ${name}`, () => patch({ customerIds: f.customerIds.filter((x) => x !== id) }));
  });
  if (f.callbackOnly) mk("callback", "Callbacks only", () => patch({ callbackOnly: false }));
  if (f.openOnly) mk("open", "Open only", () => patch({ openOnly: false }));
  if (f.waitingPartsOnly) mk("wparts", "Waiting for parts", () => patch({ waitingPartsOnly: false }));
  if (f.maintenancePlanOnly) mk("mp", "Maintenance plan", () => patch({ maintenancePlanOnly: false }));
  if (typeof f.revenueMin === "number" || typeof f.revenueMax === "number") {
    mk("rev", `Revenue ${f.revenueMin ?? 0}–${f.revenueMax ?? "∞"}`, () => patch({ revenueMin: undefined, revenueMax: undefined }));
  }
  return chips;
}
