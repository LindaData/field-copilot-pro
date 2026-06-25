import type { Customer, Equipment, Job, JobPart, Part, UserProfile } from "./types";
import { jobPausedMs } from "./store";

export interface MetricsCtx {
  jobParts: JobPart[];
  parts: Part[];
  equipment: Equipment[];
  customers: Customer[];
  users: UserProfile[];
}

export interface Metrics {
  total: number;
  open: number;
  completed: number;
  scheduled: number;
  waitingParts: number;
  callbacks: number;
  revenue: number;
  partsCost: number;
  laborCost: number;
  grossProfit: number;
  margin: number;          // %
  avgTicket: number;
  fixRate: number;         // %
  callbackRate: number;    // %
  estimateApprovalRate: number; // %
  avgTravelMin: number;
  avgDiagMin: number;
  avgActiveLaborMin: number;
  avgTotalMin: number;
  pausedMin: number;
  utilization: number;     // % of jobs completed within range
  returnTripsForParts: number;
  savings: number;
  avgRating: number;
  techStats: { id: string; name: string; jobs: number; revenue: number; fixRate: number; rating: number }[];
  partsUsage: { id: string; name: string; qty: number; revenue: number; cost: number }[];
  brandCounts: { brand: string; count: number }[];
  failureCounts: { category: string; count: number }[];
  ratingsHistogram: { rating: number; count: number }[];
  revenueByDay: { date: string; revenue: number; jobs: number }[];
  jobsByStatus: { status: string; count: number }[];
}

const avg = (xs: number[]) => xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
const pct = (n: number, d: number) => d === 0 ? 0 : Math.round((n / d) * 100);

export function computeMetrics(jobs: Job[], ctx: MetricsCtx): Metrics {
  const completed = jobs.filter((j) => j.status === "Completed");
  const scheduled = jobs.filter((j) => j.status === "Scheduled").length;
  const waitingParts = jobs.filter((j) => j.status === "Waiting for Parts").length;
  const callbacks = jobs.filter((j) => j.isCallback).length;
  const open = jobs.length - completed.length;

  const revenue = Math.round(jobs.reduce((s, j) => s + (j.revenue ?? 0), 0));
  const partsCostFromJobs = jobs.reduce((s, j) => s + (j.partsCost ?? 0), 0);
  const laborCost = Math.round(jobs.reduce((s, j) => s + (j.laborCost ?? 0), 0));
  const partsCost = Math.round(partsCostFromJobs);
  const grossProfit = Math.round(revenue - partsCost - laborCost);
  const margin = revenue === 0 ? 0 : Math.max(0, Math.round((grossProfit / revenue) * 100));
  const avgTicket = completed.length === 0 ? 0 : Math.round(revenue / completed.length);

  const firstTimeFixes = completed.filter((j) => j.firstTimeFix === true).length;
  const fixRate = pct(firstTimeFixes, completed.length);
  const callbackRate = pct(callbacks, jobs.length);
  const eligibleEstimates = completed.filter((j) => typeof j.estimateApproved === "boolean");
  const estimateApprovalRate = pct(eligibleEstimates.filter((j) => j.estimateApproved).length, eligibleEstimates.length);

  const avgTravelMin = Math.round(avg(completed.map((j) => j.travelMinutes ?? 0).filter((n) => n > 0)));
  const avgDiagMin = Math.round(avg(completed.map((j) => j.diagnosticMinutes ?? 0).filter((n) => n > 0)));
  const avgActiveLaborMin = Math.round(avg(completed.map((j) => j.activeLaborMinutes ?? 0).filter((n) => n > 0)));
  const pausedMin = Math.round(completed.reduce((s, j) => s + (j.pausedMinutes ?? jobPausedMs(j) / 60000), 0));
  const avgTotalMin = Math.round(avg(completed.map((j) => j.totalDurationMinutes ?? 0).filter((n) => n > 0)));

  const utilization = pct(completed.length, jobs.length);

  const returnTripsForParts = jobs.filter((j) => j.isCallback && (j.serviceCategory === "No Cooling" || j.serviceCategory === "Noise" || j.serviceCategory === "Leak")).length + waitingParts;

  const savings = Math.round(completed.length * 35);

  const ratings = completed.map((j) => j.rating ?? 0).filter((n) => n > 0);
  const avgRating = ratings.length === 0 ? 0 : +(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2);

  // Per-technician
  const techStats = ctx.users.filter((u) => u.role !== "Owner").map((u) => {
    const tjobs = jobs.filter((j) => j.technicianId === u.id);
    const tcompleted = tjobs.filter((j) => j.status === "Completed");
    const trev = Math.round(tjobs.reduce((s, j) => s + (j.revenue ?? 0), 0));
    const tfix = pct(tcompleted.filter((j) => j.firstTimeFix === true).length, tcompleted.length);
    const trat = tcompleted.map((j) => j.rating ?? 0).filter((n) => n > 0);
    return { id: u.id, name: u.name, jobs: tjobs.length, revenue: trev, fixRate: tfix, rating: trat.length ? +avg(trat).toFixed(2) : 0 };
  });

  // Parts usage (only for jobs in filtered set)
  const inSet = new Set(jobs.map((j) => j.id));
  const partAgg = new Map<string, { qty: number; revenue: number; cost: number }>();
  for (const jp of ctx.jobParts) {
    if (!inSet.has(jp.jobId)) continue;
    const p = ctx.parts.find((x) => x.id === jp.partId);
    if (!p) continue;
    const cur = partAgg.get(p.id) ?? { qty: 0, revenue: 0, cost: 0 };
    cur.qty += jp.qty; cur.revenue += jp.qty * p.price; cur.cost += jp.qty * p.cost;
    partAgg.set(p.id, cur);
  }
  const partsUsage = Array.from(partAgg.entries()).map(([id, v]) => {
    const p = ctx.parts.find((x) => x.id === id)!;
    return { id, name: p.name, qty: v.qty, revenue: Math.round(v.revenue), cost: Math.round(v.cost) };
  }).sort((a, b) => b.qty - a.qty);

  // Brands
  const brandMap = new Map<string, number>();
  for (const j of jobs) {
    const e = ctx.equipment.find((x) => x.id === j.equipmentId);
    if (!e) continue;
    brandMap.set(e.manufacturer, (brandMap.get(e.manufacturer) ?? 0) + 1);
  }
  const brandCounts = Array.from(brandMap.entries()).map(([brand, count]) => ({ brand, count })).sort((a, b) => b.count - a.count);

  // Failure categories
  const catMap = new Map<string, number>();
  for (const j of jobs) {
    const c = j.serviceCategory ?? "Other";
    catMap.set(c, (catMap.get(c) ?? 0) + 1);
  }
  const failureCounts = Array.from(catMap.entries()).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);

  // Ratings histogram
  const ratingsHistogram = [1, 2, 3, 4, 5].map((rating) => ({
    rating, count: completed.filter((j) => j.rating === rating).length,
  }));

  // Revenue by day
  const dayMap = new Map<string, { revenue: number; jobs: number }>();
  for (const j of jobs) {
    const d = new Date(j.scheduledFor);
    const key = d.toISOString().slice(0, 10);
    const cur = dayMap.get(key) ?? { revenue: 0, jobs: 0 };
    cur.revenue += j.revenue ?? 0; cur.jobs += 1;
    dayMap.set(key, cur);
  }
  const revenueByDay = Array.from(dayMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, v]) => ({ date, revenue: Math.round(v.revenue), jobs: v.jobs }));

  // Jobs by status
  const statusMap = new Map<string, number>();
  for (const j of jobs) statusMap.set(j.status, (statusMap.get(j.status) ?? 0) + 1);
  const jobsByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

  return {
    total: jobs.length, open, completed: completed.length, scheduled, waitingParts, callbacks,
    revenue, partsCost, laborCost, grossProfit, margin, avgTicket,
    fixRate, callbackRate, estimateApprovalRate,
    avgTravelMin, avgDiagMin, avgActiveLaborMin, avgTotalMin, pausedMin,
    utilization, returnTripsForParts, savings, avgRating,
    techStats, partsUsage, brandCounts, failureCounts, ratingsHistogram, revenueByDay, jobsByStatus,
  };
}

export interface Trend { dir: "up" | "down" | "flat"; pct: number; label: string; insufficient?: boolean; }
export function trend(current: number, previous: number, sampleSize = 1): Trend {
  if (sampleSize < 1) return { dir: "flat", pct: 0, label: "Not enough comparison data", insufficient: true };
  if (previous === 0 && current === 0) return { dir: "flat", pct: 0, label: "0%" };
  if (previous === 0) return { dir: "up", pct: 100, label: "New" };
  const change = ((current - previous) / Math.abs(previous)) * 100;
  const dir: Trend["dir"] = Math.abs(change) < 0.5 ? "flat" : change > 0 ? "up" : "down";
  return { dir, pct: Math.round(Math.abs(change)), label: `${change >= 0 ? "+" : "−"}${Math.round(Math.abs(change))}% vs prior` };
}
