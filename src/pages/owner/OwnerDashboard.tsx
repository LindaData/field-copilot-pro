import { useMemo } from "react";
import { Link } from "react-router-dom";
import { jobPausedMs, useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, Wallet, Wrench, Users, Clock, Briefcase, AlertTriangle,
} from "lucide-react";
import { applyJobFilters, deriveJobType } from "@/lib/filters";
import { useJobFilters } from "@/lib/useJobFilters";
import FilterBar from "@/components/owner/FilterBar";
import type { Job } from "@/lib/types";

const KPI = ({
  icon: Icon, label, value, sub, good, href,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  sub?: string;
  good?: boolean;
  href?: string;
}) => {
  const inner = (
    <Card className="p-4 transition hover:bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {sub && (
        <div className={`mt-1 inline-flex items-center gap-1 text-xs ${good ? "text-success" : "text-muted-foreground"}`}>
          {good ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />} {sub}
        </div>
      )}
    </Card>
  );
  return href ? <Link to={href}>{inner}</Link> : inner;
};

export default function OwnerDashboard() {
  const { state } = useStore();
  const { filters, patch, reset } = useJobFilters("owner");

  const techs = state.users.filter((u) => u.role !== "Owner");
  const brands = Array.from(new Set(state.equipment.map((e) => e.manufacturer))).sort();

  const filteredJobs = useMemo(
    () => applyJobFilters(state.jobs, filters, { equipment: state.equipment, properties: state.properties }),
    [state.jobs, state.equipment, state.properties, filters],
  );

  const metrics = useMemo(() => computeMetrics(filteredJobs, state), [filteredJobs, state]);

  const exportFiltered = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      filters,
      metrics,
      jobs: filteredJobs.map((j) => ({
        id: j.id, status: j.status,
        technician: techs.find((t) => t.id === j.technicianId)?.name,
        scheduledFor: j.scheduledFor,
        jobType: deriveJobType(j),
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `dashboard-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Operations overview</h1>
        <div className="text-xs text-muted-foreground">
          All KPIs, lists, and exports below are computed from the same filtered set.
        </div>
      </div>

      <FilterBar filters={filters} patch={patch} reset={reset} techs={techs} brands={brands} onExport={exportFiltered} />

      {filteredJobs.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No jobs match these filters. Try widening the date range or clearing filters.
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KPI icon={Briefcase} label="Open jobs" value={String(metrics.open)} />
            <KPI icon={Wrench} label="Completed jobs" value={String(metrics.completed)} />
            <KPI icon={Wallet} label="Revenue" value={`$${metrics.revenue.toLocaleString()}`} sub={`${metrics.completed} closed`} good />
            <KPI icon={Wallet} label="Gross margin" value={metrics.completed === 0 ? "—" : `${metrics.margin}%`} />
            <KPI icon={Wrench} label="First-time fix" value={metrics.completed === 0 ? "—" : `${metrics.fixRate}%`} />
            <KPI icon={AlertTriangle} label="Callback rate" value={metrics.completed === 0 ? "—" : `${metrics.callbackRate}%`} />
            <KPI icon={Clock} label="Avg diag time" value={metrics.avgDiagMin ? `${metrics.avgDiagMin} min` : "—"} />
            <KPI icon={Clock} label="Avg job duration" value={metrics.avgJobMin ? `${metrics.avgJobMin} min` : "—"} />
            <KPI icon={Users} label="Technician utilization" value={`${metrics.utilization}%`} />
            <KPI icon={Wallet} label="Parts cost" value={`$${metrics.partsCost.toLocaleString()}`} />
            <KPI icon={AlertTriangle} label="Return trips (parts)" value={String(metrics.returnTripsForParts)} />
            <KPI icon={Wallet} label="Est. savings vs paper" value={`$${metrics.savings.toLocaleString()}`} good />
          </div>

          <Card className="p-4">
            <div className="mb-3 text-sm font-semibold">Jobs in range ({filteredJobs.length})</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2">Customer</th><th>Complaint</th><th>Type</th>
                    <th>Technician</th><th>Status</th><th>Scheduled</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredJobs.slice(0, 50).map((j) => {
                    const c = state.customers.find((x) => x.id === j.customerId);
                    const u = state.users.find((x) => x.id === j.technicianId);
                    return (
                      <tr key={j.id}>
                        <td className="py-2">{c?.name}</td>
                        <td className="text-muted-foreground">{j.complaint}</td>
                        <td className="text-xs">{deriveJobType(j)}</td>
                        <td>{u?.name}</td>
                        <td><Badge variant="secondary">{j.status}</Badge></td>
                        <td className="text-xs text-muted-foreground">
                          {new Date(j.scheduledFor).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredJobs.length > 50 && (
                <div className="mt-2 text-center text-xs text-muted-foreground">
                  Showing first 50 of {filteredJobs.length}. Use the Jobs tab for the full list.
                </div>
              )}
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
  const returnTripsForParts = waitingParts;

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
  const partsCost = Math.round(partsForRangeJobs.reduce((sum, jp) => {
    const p = state.parts.find((x) => x.id === jp.partId);
    return sum + jp.qty * (p?.price ?? 0);
  }, 0));
  const revenue = Math.round(completed.length * 280 + partsCost);
  const fixRate = completed.length === 0 ? 0 : Math.round(((completed.length - followUps) / completed.length) * 100);
  const callbackRate = jobs.length === 0 ? 0 : Math.round((followUps / jobs.length) * 100);
  const utilization = Math.min(100, Math.round((completed.length / Math.max(1, jobs.length)) * 100));
  const margin = revenue === 0 ? 0 : Math.max(0, Math.round(((revenue - partsCost) / revenue) * 100));
  const savings = Math.round(completed.length * 35);

  return {
    open, completed: completed.length, revenue, margin, fixRate, callbackRate,
    avgDiagMin: avg(diagDurations), avgJobMin: avg(jobDurations),
    utilization, partsCost, returnTripsForParts, savings,
  };
}
