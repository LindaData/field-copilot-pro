import { useEffect, useMemo, useState } from "react";
import { jobPausedMs, useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TrendingUp, TrendingDown, Wallet, Wrench, Users, Clock, Briefcase, AlertTriangle, Filter, X, ChevronDown } from "lucide-react";
import type { Job } from "@/lib/types";

const FILTER_KEY = "owner-dashboard-filters-v1";

type RangeKey = "today" | "yesterday" | "this-week" | "last-7" | "this-month" | "last-30" | "this-quarter" | "ytd" | "custom";

interface Filters {
  range: RangeKey;
  customStart?: string; // yyyy-mm-dd
  customEnd?: string;
  techIds: string[]; // empty = all
  brand: string; // "all" or brand
  jobType: string; // "all"
  status: string; // "all"
}

const defaultFilters: Filters = { range: "last-30", techIds: [], brand: "all", jobType: "all", status: "all" };

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

function rangeBounds(f: Filters): { start: Date; end: Date; label: string; invalid?: string } {
  const now = new Date();
  switch (f.range) {
    case "today": return { start: startOfDay(now), end: endOfDay(now), label: "Today" };
    case "yesterday": { const d = new Date(now); d.setDate(d.getDate() - 1); return { start: startOfDay(d), end: endOfDay(d), label: "Yesterday" }; }
    case "this-week": { const d = new Date(now); const dow = d.getDay(); const s = new Date(d); s.setDate(d.getDate() - dow); return { start: startOfDay(s), end: endOfDay(now), label: "This week" }; }
    case "last-7": { const s = new Date(now); s.setDate(s.getDate() - 6); return { start: startOfDay(s), end: endOfDay(now), label: "Last 7 days" }; }
    case "this-month": return { start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), end: endOfDay(now), label: "This month" };
    case "last-30": { const s = new Date(now); s.setDate(s.getDate() - 29); return { start: startOfDay(s), end: endOfDay(now), label: "Last 30 days" }; }
    case "this-quarter": { const q = Math.floor(now.getMonth() / 3); return { start: startOfDay(new Date(now.getFullYear(), q * 3, 1)), end: endOfDay(now), label: "This quarter" }; }
    case "ytd": return { start: startOfDay(new Date(now.getFullYear(), 0, 1)), end: endOfDay(now), label: "Year to date" };
    case "custom": {
      if (!f.customStart || !f.customEnd) return { start: startOfDay(now), end: endOfDay(now), label: "Custom (incomplete)", invalid: "Pick both start and end dates." };
      const s = new Date(f.customStart + "T00:00:00");
      const e = new Date(f.customEnd + "T23:59:59");
      if (isNaN(+s) || isNaN(+e)) return { start: s, end: e, label: "Custom", invalid: "Invalid date format." };
      if (s > e) return { start: s, end: e, label: "Custom", invalid: "Start date is after end date." };
      return { start: s, end: e, label: `${f.customStart} → ${f.customEnd}` };
    }
  }
}

const RANGE_OPTIONS: { k: RangeKey; label: string }[] = [
  { k: "today", label: "Today" }, { k: "yesterday", label: "Yesterday" },
  { k: "this-week", label: "This week" }, { k: "last-7", label: "Last 7 days" },
  { k: "this-month", label: "This month" }, { k: "last-30", label: "Last 30 days" },
  { k: "this-quarter", label: "This quarter" }, { k: "ytd", label: "Year to date" },
  { k: "custom", label: "Custom range" },
];

const KPI = ({ icon: Icon, label, value, delta, good }: { icon: typeof Wallet; label: string; value: string; delta?: string; good?: boolean }) => (
  <Card className="p-4">
    <div className="flex items-center justify-between">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <div className="mt-1 text-2xl font-bold">{value}</div>
    {delta && (
      <div className={`mt-1 inline-flex items-center gap-1 text-xs ${good ? "text-success" : "text-muted-foreground"}`}>
        {good ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />} {delta}
      </div>
    )}
  </Card>
);

export default function OwnerDashboard() {
  const { state } = useStore();
  const [filters, setFilters] = useState<Filters>(() => {
    try { const raw = sessionStorage.getItem(FILTER_KEY); if (raw) return { ...defaultFilters, ...JSON.parse(raw) }; } catch { /* */ }
    return defaultFilters;
  });
  useEffect(() => { try { sessionStorage.setItem(FILTER_KEY, JSON.stringify(filters)); } catch { /* */ } }, [filters]);

  const bounds = rangeBounds(filters);
  const techs = state.users.filter((u) => u.role !== "Owner");
  const brands = Array.from(new Set(state.equipment.map((e) => e.manufacturer))).sort();

  const filteredJobs = useMemo(() => {
    if (bounds.invalid) return [];
    return state.jobs.filter((j) => {
      const t = +new Date(j.scheduledFor);
      if (t < +bounds.start || t > +bounds.end) return false;
      if (filters.techIds.length > 0 && !filters.techIds.includes(j.technicianId)) return false;
      if (filters.status !== "all" && j.status !== filters.status) return false;
      if (filters.brand !== "all") {
        const eq = state.equipment.find((e) => e.id === j.equipmentId);
        if (!eq || eq.manufacturer !== filters.brand) return false;
      }
      return true;
    });
  }, [state.jobs, state.equipment, filters, bounds]);

  const metrics = useMemo(() => computeMetrics(filteredJobs, state), [filteredJobs, state]);

  const techSummary = filters.techIds.length === 0 ? "All technicians" : filters.techIds.length === 1
    ? techs.find((t) => t.id === filters.techIds[0])?.name ?? "1 tech"
    : `${filters.techIds.length} technicians`;

  const activeFilterCount =
    (filters.techIds.length > 0 ? 1 : 0) +
    (filters.brand !== "all" ? 1 : 0) +
    (filters.jobType !== "all" ? 1 : 0) +
    (filters.status !== "all" ? 1 : 0);

  const exportFiltered = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      filters: { ...filters, rangeLabel: bounds.label },
      metrics, jobs: filteredJobs.map((j) => ({ id: j.id, status: j.status, technician: techs.find((t) => t.id === j.technicianId)?.name, scheduledFor: j.scheduledFor })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `dashboard-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Operations overview</h1>
          <div className="text-xs text-muted-foreground">All values are computed from current demo data.</div>
          <div className="mt-1 text-xs">
            <span className="rounded bg-muted px-2 py-0.5">{bounds.label}</span>{" "}
            <span className="rounded bg-muted px-2 py-0.5">{techSummary}</span>{" "}
            {filters.brand !== "all" && <span className="rounded bg-muted px-2 py-0.5">Brand: {filters.brand}</span>}{" "}
            {filters.status !== "all" && <span className="rounded bg-muted px-2 py-0.5">Status: {filters.status}</span>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={filters.range} onValueChange={(v) => setFilters((f) => ({ ...f, range: v as RangeKey }))}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{RANGE_OPTIONS.map((r) => (<SelectItem key={r.k} value={r.k}>{r.label}</SelectItem>))}</SelectContent>
          </Select>

          {filters.range === "custom" && (
            <div className="flex items-center gap-1">
              <Input type="date" value={filters.customStart ?? ""} onChange={(e) => setFilters((f) => ({ ...f, customStart: e.target.value }))} className="w-36" />
              <span className="text-xs text-muted-foreground">→</span>
              <Input type="date" value={filters.customEnd ?? ""} onChange={(e) => setFilters((f) => ({ ...f, customEnd: e.target.value }))} className="w-36" />
            </div>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-1">
                <Users className="h-4 w-4" /> {filters.techIds.length === 0 ? "All technicians" : `${filters.techIds.length} selected`} <ChevronDown className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64">
              <div className="text-xs font-semibold mb-2">Technicians</div>
              <label className="flex items-center gap-2 text-sm py-1">
                <input type="checkbox" checked={filters.techIds.length === 0} onChange={() => setFilters((f) => ({ ...f, techIds: [] }))} /> All technicians
              </label>
              {techs.map((t) => {
                const checked = filters.techIds.includes(t.id);
                return (
                  <label key={t.id} className="flex items-center gap-2 text-sm py-1">
                    <input type="checkbox" checked={checked} onChange={(e) => setFilters((f) => ({ ...f, techIds: e.target.checked ? [...f.techIds, t.id] : f.techIds.filter((x) => x !== t.id) }))} /> {t.name}
                    {t.role !== "Owner" && <span className="text-[10px] text-muted-foreground">· {t.role}</span>}
                  </label>
                );
              })}
            </PopoverContent>
          </Popover>

          <Select value={filters.brand} onValueChange={(v) => setFilters((f) => ({ ...f, brand: v }))}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Brand" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All brands</SelectItem>
              {brands.map((b) => (<SelectItem key={b} value={b}>{b}</SelectItem>))}
            </SelectContent>
          </Select>

          <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {["Scheduled","En Route","On Site","Diagnosing","Waiting for Approval","Waiting for Parts","Completed","Follow-Up"].map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => setFilters(defaultFilters)} title="Reset filters"><X className="mr-1 h-4 w-4" /> Reset</Button>
          <Button variant="outline" onClick={exportFiltered}><Filter className="mr-1 h-4 w-4" /> Export</Button>
        </div>
      </div>

      {bounds.invalid && (
        <Card className="border-destructive p-3 text-sm text-destructive"><AlertTriangle className="mr-1 inline h-4 w-4" /> {bounds.invalid}</Card>
      )}

      {!bounds.invalid && filteredJobs.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No jobs match these filters for {bounds.label.toLowerCase()}. Try widening the range or clearing filters.
          <div className="mt-3"><Button variant="outline" onClick={() => setFilters(defaultFilters)}>Reset filters</Button></div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KPI icon={Briefcase} label="Open jobs" value={String(metrics.open)} />
            <KPI icon={Wrench} label="Completed jobs" value={String(metrics.completed)} />
            <KPI icon={Wallet} label="Revenue" value={`$${metrics.revenue.toLocaleString()}`} delta={`${metrics.completed} closed jobs`} good />
            <KPI icon={Wallet} label="Gross margin" value={`${metrics.margin}%`} />
            <KPI icon={Wrench} label="First-time fix rate" value={`${metrics.fixRate}%`} />
            <KPI icon={AlertTriangle} label="Callback rate" value={`${metrics.callbackRate}%`} />
            <KPI icon={Clock} label="Avg diagnostic time" value={`${metrics.avgDiagMin} min`} />
            <KPI icon={Clock} label="Avg job duration" value={`${metrics.avgJobMin} min`} />
            <KPI icon={Users} label="Technician utilization" value={`${metrics.utilization}%`} />
            <KPI icon={Wallet} label="Parts cost" value={`$${metrics.partsCost.toLocaleString()}`} />
            <KPI icon={AlertTriangle} label="Return trips (parts)" value={String(metrics.returnTripsForParts)} />
            <KPI icon={Wallet} label="Est. savings vs paper" value={`$${metrics.savings.toLocaleString()}`} good />
          </div>

          <Card className="p-4">
            <div className="mb-3 text-sm font-semibold">Recent jobs in range ({filteredJobs.length})</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="py-2">Customer</th><th>Complaint</th><th>Technician</th><th>Status</th><th>Scheduled</th></tr>
                </thead>
                <tbody className="divide-y">
                  {filteredJobs.slice(0, 30).map((j) => {
                    const c = state.customers.find(x => x.id === j.customerId);
                    const u = state.users.find(x => x.id === j.technicianId);
                    return (
                      <tr key={j.id}>
                        <td className="py-2">{c?.name}</td>
                        <td className="text-muted-foreground">{j.complaint}</td>
                        <td>{u?.name}</td>
                        <td><Badge variant="secondary">{j.status}</Badge></td>
                        <td className="text-xs text-muted-foreground">{new Date(j.scheduledFor).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function computeMetrics(jobs: Job[], state: ReturnType<typeof useStore>["state"]) {
  const completed = jobs.filter((j) => j.status === "Completed");
  const open = jobs.length - completed.length;
  const waitingParts = jobs.filter((j) => j.status === "Waiting for Parts").length;
  const followUps = jobs.filter((j) => j.status === "Follow-Up").length;
  const returnTripsForParts = waitingParts; // proxy

  // Avg diagnostic time (arrivedAt → diagnosisStartedAt offset → completedAt) - paused
  const diagDurations = completed.map((j) => {
    if (!j.diagnosisStartedAt || !j.completedAt) return null;
    return (+new Date(j.completedAt) - +new Date(j.diagnosisStartedAt) - jobPausedMs(j)) / 60000;
  }).filter((n): n is number => n !== null && n > 0);
  const jobDurations = completed.map((j) => {
    if (!j.arrivedAt || !j.completedAt) return null;
    return (+new Date(j.completedAt) - +new Date(j.arrivedAt) - jobPausedMs(j)) / 60000;
  }).filter((n): n is number => n !== null && n > 0);
  const avg = (xs: number[]) => xs.length === 0 ? 0 : Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);

  const partsForRangeJobs = state.jobParts.filter((jp) => jobs.some((j) => j.id === jp.jobId));
  const partsCost = Math.round(partsForRangeJobs.reduce((sum, jp) => sum + jp.qty * jp.unitPrice, 0));
  const revenue = Math.round(completed.length * 280 + partsCost); // simple model
  const fixRate = completed.length === 0 ? 0 : Math.round(((completed.length - followUps) / completed.length) * 100);
  const callbackRate = jobs.length === 0 ? 0 : Math.round((followUps / jobs.length) * 100);
  const utilization = Math.min(100, Math.round((completed.length / Math.max(1, jobs.length)) * 100));
  const margin = revenue === 0 ? 0 : Math.max(0, Math.round(((revenue - partsCost) / revenue) * 100));
  const savings = Math.round(completed.length * 35); // demo: $35 saved per closed job

  return {
    open, completed: completed.length, revenue, margin, fixRate, callbackRate,
    avgDiagMin: avg(diagDurations), avgJobMin: avg(jobDurations),
    utilization, partsCost, returnTripsForParts, savings,
  };
}
