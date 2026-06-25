import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, Wallet, Wrench, Users, Clock, Briefcase, AlertTriangle,
  Star, PauseCircle, ArrowRight, Package, Minus,
} from "lucide-react";
import {
  applyJobFilters, deriveJobType, previousRangeBounds, rangeBounds,
} from "@/lib/filters";
import { useJobFilters } from "@/lib/useJobFilters";
import { computeMetrics, trend, type Metrics, type Trend } from "@/lib/metrics";
import FilterBar from "@/components/owner/FilterBar";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#ca8a04", "#7c3aed", "#0891b2", "#db2777", "#65a30d"];

function TrendBadge({ t }: { t: Trend }) {
  if (t.insufficient) return <span className="text-[10px] text-muted-foreground">Not enough comparison data</span>;
  const Icon = t.dir === "up" ? TrendingUp : t.dir === "down" ? TrendingDown : Minus;
  const cls = t.dir === "up" ? "text-success" : t.dir === "down" ? "text-destructive" : "text-muted-foreground";
  return <span className={`inline-flex items-center gap-1 text-[11px] ${cls}`}><Icon className="h-3 w-3" /> {t.label}</span>;
}

function KPI({
  icon: Icon, label, value, sub, href, trend,
}: {
  icon: typeof Wallet; label: string; value: string; sub?: string; href?: string; trend?: Trend;
}) {
  const inner = (
    <Card className="p-4 transition hover:bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
        {sub && <span>{sub}</span>}
        {trend && <TrendBadge t={trend} />}
      </div>
    </Card>
  );
  return href ? <Link to={href}>{inner}</Link> : inner;
}

function EmptyChart({ label }: { label: string }) {
  return <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">No data for {label}</div>;
}

export default function OwnerDashboard() {
  const { state } = useStore();
  const { filters, patch, reset } = useJobFilters("owner");

  const techs = state.users.filter((u) => u.role !== "Owner");
  const brands = Array.from(new Set(state.equipment.map((e) => e.manufacturer))).sort();
  const equipmentTypes = Array.from(new Set(state.equipment.map((e) => e.type).filter(Boolean) as string[])).sort();
  const cities = Array.from(new Set([
    ...state.customers.map((c) => c.city).filter(Boolean) as string[],
    ...state.properties.map((p) => p.city).filter(Boolean) as string[],
  ])).sort();

  const ctx = { equipment: state.equipment, properties: state.properties, customers: state.customers };

  const filteredJobs = useMemo(() => applyJobFilters(state.jobs, filters, ctx), [state.jobs, filters, ctx]);

  const prevBounds = useMemo(() => previousRangeBounds(rangeBounds(filters)), [filters]);
  const prevJobs = useMemo(
    () => state.jobs.filter((j) => {
      const t = +new Date(j.scheduledFor);
      return t >= +prevBounds.start && t <= +prevBounds.end;
    }),
    [state.jobs, prevBounds],
  );

  const mctx = { jobParts: state.jobParts, parts: state.parts, equipment: state.equipment, customers: state.customers, users: state.users };
  const m: Metrics = useMemo(() => computeMetrics(filteredJobs, mctx), [filteredJobs, mctx]);
  const mPrev: Metrics = useMemo(() => computeMetrics(prevJobs, mctx), [prevJobs, mctx]);

  const exportFiltered = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      filters, range: rangeBounds(filters),
      matchedRecords: filteredJobs.length,
      metrics: m,
      jobs: filteredJobs.map((j) => ({
        id: j.id, status: j.status,
        technician: techs.find((t) => t.id === j.technicianId)?.name,
        scheduledFor: j.scheduledFor,
        jobType: deriveJobType(j), serviceCategory: j.serviceCategory,
        billingType: j.billingType, revenue: j.revenue, isCallback: !!j.isCallback,
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
          Every KPI, chart, table, and export below is computed from the same filtered set.
          Comparisons use the immediately preceding period of equal length.
        </div>
      </div>

      <FilterBar
        filters={filters} patch={patch} reset={reset}
        techs={techs} brands={brands} cities={cities}
        equipmentTypes={equipmentTypes} customers={state.customers}
        onExport={exportFiltered} matchedCount={filteredJobs.length}
      />

      {filteredJobs.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No jobs match these filters. Try widening the date range or clearing filters.
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KPI icon={Briefcase} label="Open jobs" value={String(m.open)} href="/owner/jobs" />
            <KPI icon={Wrench} label="Completed" value={String(m.completed)} trend={trend(m.completed, mPrev.completed, prevJobs.length)} href="/owner/jobs" />
            <KPI icon={Briefcase} label="Scheduled" value={String(m.scheduled)} />
            <KPI icon={Package} label="Waiting for parts" value={String(m.waitingParts)} href="/owner/jobs" />
            <KPI icon={Wallet} label="Revenue" value={`$${m.revenue.toLocaleString()}`} trend={trend(m.revenue, mPrev.revenue, prevJobs.length)} />
            <KPI icon={Wallet} label="Gross profit" value={`$${m.grossProfit.toLocaleString()}`} trend={trend(m.grossProfit, mPrev.grossProfit, prevJobs.length)} />
            <KPI icon={Wallet} label="Gross margin" value={m.completed === 0 ? "—" : `${m.margin}%`} />
            <KPI icon={Wallet} label="Avg ticket" value={m.avgTicket === 0 ? "—" : `$${m.avgTicket.toLocaleString()}`} />
            <KPI icon={Wrench} label="First-time fix" value={m.completed === 0 ? "—" : `${m.fixRate}%`} trend={trend(m.fixRate, mPrev.fixRate, mPrev.completed)} />
            <KPI icon={AlertTriangle} label="Callback rate" value={`${m.callbackRate}%`} trend={trend(m.callbackRate, mPrev.callbackRate, prevJobs.length)} />
            <KPI icon={Wrench} label="Estimate approval" value={`${m.estimateApprovalRate}%`} />
            <KPI icon={Star} label="Avg rating" value={m.avgRating === 0 ? "—" : `${m.avgRating} ★`} />
            <KPI icon={Clock} label="Avg travel" value={m.avgTravelMin ? `${m.avgTravelMin} min` : "—"} />
            <KPI icon={Clock} label="Avg diag" value={m.avgDiagMin ? `${m.avgDiagMin} min` : "—"} />
            <KPI icon={Clock} label="Avg active labor" value={m.avgActiveLaborMin ? `${m.avgActiveLaborMin} min` : "—"} />
            <KPI icon={Clock} label="Avg total" value={m.avgTotalMin ? `${m.avgTotalMin} min` : "—"} />
            <KPI icon={PauseCircle} label="Paused time" value={`${Math.round(m.pausedMin)} min`} />
            <KPI icon={Users} label="Utilization" value={`${m.utilization}%`} />
            <KPI icon={AlertTriangle} label="Return trips (parts)" value={String(m.returnTripsForParts)} />
            <KPI icon={Wallet} label="Est. savings vs paper" value={`$${m.savings.toLocaleString()}`} />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Card className="p-4">
              <div className="mb-2 text-sm font-semibold">Revenue over time</div>
              {m.revenueByDay.length === 0 ? <EmptyChart label="this range" /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={m.revenueByDay}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-4">
              <div className="mb-2 text-sm font-semibold">Jobs by status</div>
              {m.jobsByStatus.length === 0 ? <EmptyChart label="this range" /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={m.jobsByStatus}>
                    <XAxis dataKey="status" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#16a34a" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-4">
              <div className="mb-2 text-sm font-semibold">Failure categories</div>
              {m.failureCounts.length === 0 ? <EmptyChart label="this range" /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={m.failureCounts} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={70} label>
                      {m.failureCounts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip /><Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-4">
              <div className="mb-2 text-sm font-semibold">Equipment brands serviced</div>
              {m.brandCounts.length === 0 ? <EmptyChart label="this range" /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={m.brandCounts} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="brand" tick={{ fontSize: 10 }} width={80} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#7c3aed" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-4 md:col-span-2">
              <div className="mb-2 text-sm font-semibold">Technician performance ({m.techStats.filter((t) => t.jobs > 0).length} active)</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="py-1">Tech</th><th>Jobs</th><th>Revenue</th><th>First-time fix</th><th>Rating</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {m.techStats.map((t) => (
                      <tr key={t.id}>
                        <td className="py-1.5">{t.name}</td>
                        <td>{t.jobs}</td>
                        <td>${t.revenue.toLocaleString()}</td>
                        <td>{t.jobs === 0 ? "—" : `${t.fixRate}%`}</td>
                        <td>{t.rating ? `${t.rating} ★` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-4 md:col-span-2">
              <div className="mb-2 text-sm font-semibold">Parts used</div>
              {m.partsUsage.length === 0 ? <div className="text-xs text-muted-foreground">No parts used in this set.</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase text-muted-foreground">
                      <tr><th>Part</th><th>Qty</th><th>Revenue</th><th>Cost</th></tr>
                    </thead>
                    <tbody className="divide-y">
                      {m.partsUsage.map((p) => (
                        <tr key={p.id}>
                          <td className="py-1.5">{p.name}</td>
                          <td>{p.qty}</td>
                          <td>${p.revenue.toLocaleString()}</td>
                          <td>${p.cost.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">Matching jobs ({filteredJobs.length})</div>
              <Link to="/owner/jobs" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                Open full list <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2">Customer</th><th>Complaint</th><th>Category</th>
                    <th>Tech</th><th>Status</th><th>Revenue</th><th>Scheduled</th>
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
                        <td className="text-xs">{j.serviceCategory ?? "—"}</td>
                        <td>{u?.name}</td>
                        <td><Badge variant="secondary">{j.status}</Badge></td>
                        <td>${(j.revenue ?? 0).toLocaleString()}</td>
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
