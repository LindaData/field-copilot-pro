import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp, TrendingDown, Wallet, Wrench, Users, Clock, Briefcase, AlertTriangle,
  PauseCircle, ArrowRight, Package, Minus, Truck, MapPin, CheckCircle2,
  ClipboardCheck, FileX, MessageSquare, Search, PhoneCall,
} from "lucide-react";
import {
  applyJobFilters, previousRangeBounds, rangeBounds,
} from "@/lib/filters";
import { useJobFilters } from "@/lib/useJobFilters";
import { computeMetrics, trend, type Metrics, type Trend } from "@/lib/metrics";
import FilterBar from "@/components/owner/FilterBar";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid,
} from "recharts";
import { computeAttention, type AttentionKind } from "@/lib/attention";
import { jobPausedMs } from "@/lib/store";

function TrendBadge({ t }: { t: Trend }) {
  if (t.insufficient) return <span className="text-[10px] text-muted-foreground">No prior period</span>;
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
    <Card className="h-full p-4 transition hover:bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
        {sub && <span>{sub}</span>}
        {trend && <TrendBadge t={trend} />}
      </div>
      {href && <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary">View matching jobs <ArrowRight className="h-3 w-3" /></div>}
    </Card>
  );
  return href ? <Link to={href} className="block h-full">{inner}</Link> : inner;
}

const ATTENTION_ICONS: Record<AttentionKind, typeof AlertTriangle> = {
  overdue: AlertTriangle,
  "paused-too-long": PauseCircle,
  "waiting-approval": ClipboardCheck,
  "waiting-parts": Package,
  "possible-callback": PhoneCall,
  "diag-review": Search,
  "missing-report": FileX,
  "customer-follow-up": MessageSquare,
};

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

  // Today derivations from the same filtered set
  const today = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    const todayJobs = filteredJobs.filter((j) => {
      const t = +new Date(j.scheduledFor); return t >= +start && t < +end;
    });
    const enRoute = todayJobs.filter((j) => j.status === "En Route" || j.status === "Near Destination").length;
    const onSite = todayJobs.filter((j) => ["On Site", "Diagnosing", "Repairing", "Verifying", "Documentation"].includes(j.status)).length;
    const completedToday = todayJobs.filter((j) => j.status === "Completed").length;
    const activeLaborMin = Math.round(todayJobs.reduce((s, j) => s + (j.activeLaborMinutes ?? 0), 0));
    const pausedTodayMin = Math.round(todayJobs.reduce((s, j) => s + (j.pausedMinutes ?? jobPausedMs(j) / 60000), 0));
    const revenueToday = Math.round(todayJobs.reduce((s, j) => s + (j.revenue ?? 0), 0));
    return { todayJobs, enRoute, onSite, completedToday, activeLaborMin, pausedTodayMin, revenueToday };
  }, [filteredJobs]);

  // Needs attention — computed from same filtered jobs
  const attention = useMemo(() => computeAttention({
    jobs: filteredJobs,
    diag: state.diag,
    auths: state.auths,
    reports: state.serviceReports,
    customerFeedback: state.customerFeedback,
  }), [filteredJobs, state.diag, state.auths, state.serviceReports, state.customerFeedback]);

  const attentionGroups = useMemo(() => {
    const g = new Map<AttentionKind, typeof attention>();
    for (const a of attention) {
      const arr = g.get(a.kind) ?? [];
      arr.push(a); g.set(a.kind, arr);
    }
    return g;
  }, [attention]);

  const ATTENTION_ORDER: { kind: AttentionKind; label: string }[] = [
    { kind: "overdue",            label: "Late or overdue jobs" },
    { kind: "paused-too-long",    label: "Paused over 30 minutes" },
    { kind: "waiting-approval",   label: "Waiting for approval" },
    { kind: "waiting-parts",      label: "Waiting for parts" },
    { kind: "possible-callback",  label: "Possible callbacks" },
    { kind: "diag-review",        label: "Diagnostics needing review" },
    { kind: "missing-report",     label: "Missing service reports" },
    { kind: "customer-follow-up", label: "Customer follow-ups" },
  ];

  const exportFiltered = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      filters, range: rangeBounds(filters),
      matchedRecords: filteredJobs.length,
      metrics: m,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `dashboard-${Date.now()}.json`; a.click();
  };

  const totalAttention = attention.length;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Operations</h1>
          <div className="text-xs text-muted-foreground">
            Every card, chart, and drill-down below is computed from the same filtered set.
            Comparisons use the immediately preceding period of equal length.
          </div>
        </div>
      </div>

      <FilterBar
        filters={filters} patch={patch} reset={reset}
        techs={techs} brands={brands} cities={cities}
        equipmentTypes={equipmentTypes} customers={state.customers}
        onExport={exportFiltered} matchedCount={filteredJobs.length}
      />

      <Tabs defaultValue="attention">
        <TabsList>
          <TabsTrigger value="attention">
            Needs Attention {totalAttention > 0 && <Badge className="ml-2 bg-destructive text-destructive-foreground">{totalAttention}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* NEEDS ATTENTION */}
        <TabsContent value="attention" className="space-y-3">
          {totalAttention === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-success" />
              Nothing requires your attention in the current filter window.
            </Card>
          ) : (
            ATTENTION_ORDER.map(({ kind, label }) => {
              const items = attentionGroups.get(kind) ?? [];
              if (items.length === 0) return null;
              const Icon = ATTENTION_ICONS[kind];
              return (
                <Card key={kind} className="overflow-hidden">
                  <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {label}
                      <Badge variant="secondary">{items.length}</Badge>
                    </div>
                  </div>
                  <ul className="divide-y">
                    {items.slice(0, 6).map((a) => {
                      const j = a.jobId ? state.jobs.find((x) => x.id === a.jobId) : undefined;
                      const c = a.customerId ? state.customers.find((x) => x.id === a.customerId) : undefined;
                      return (
                        <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                          <div className="min-w-0">
                            <div className="truncate font-medium">{c?.name ?? a.title}</div>
                            <div className="truncate text-xs text-muted-foreground">{a.detail}</div>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            {j && (
                              <Link to={`/app/jobs/${j.id}`}>
                                <button className="rounded-md border px-2 py-1 text-xs hover:bg-muted">Open job</button>
                              </Link>
                            )}
                            <Link to={a.href}>
                              <button className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground hover:opacity-90">Review</button>
                            </Link>
                          </div>
                        </li>
                      );
                    })}
                    {items.length > 6 && (
                      <li className="px-4 py-2 text-center text-xs">
                        <Link to={items[0].href} className="text-primary hover:underline">View all {items.length} →</Link>
                      </li>
                    )}
                  </ul>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* TODAY */}
        <TabsContent value="today" className="space-y-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <KPI icon={Truck}        label="En route"      value={String(today.enRoute)}        href="/app/owner/jobs?preset=en-route" />
            <KPI icon={MapPin}       label="On site"       value={String(today.onSite)}         href="/app/owner/jobs?preset=on-site" />
            <KPI icon={CheckCircle2} label="Completed today" value={String(today.completedToday)} href="/app/owner/jobs?preset=completed-today" />
            <KPI icon={Clock}        label="Active labor"  value={`${today.activeLaborMin} min`} sub="across today's jobs" />
            <KPI icon={PauseCircle}  label="Paused time"   value={`${today.pausedTodayMin} min`} sub="across today's jobs" />
            <KPI icon={Wallet}       label="Revenue today" value={`$${today.revenueToday.toLocaleString()}`} />
          </div>

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">Today's jobs ({today.todayJobs.length})</div>
              <Link to="/app/owner/jobs?preset=completed-today" className="text-xs text-primary hover:underline">Open in Jobs →</Link>
            </div>
            {today.todayJobs.length === 0 ? (
              <div className="text-sm text-muted-foreground">No jobs scheduled for today in the current filter.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="py-1">Time</th><th>Customer</th><th>Tech</th><th>Status</th></tr>
                </thead>
                <tbody className="divide-y">
                  {today.todayJobs.slice(0, 12).map((j) => {
                    const c = state.customers.find((x) => x.id === j.customerId);
                    const u = state.users.find((x) => x.id === j.technicianId);
                    return (
                      <tr key={j.id} className="cursor-pointer hover:bg-muted/30">
                        <td className="py-1.5 text-xs">{new Date(j.scheduledFor).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</td>
                        <td><Link to={`/app/jobs/${j.id}`} className="hover:underline">{c?.name}</Link></td>
                        <td>{u?.name}</td>
                        <td><Badge variant="secondary">{j.status}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>
        </TabsContent>

        {/* PERFORMANCE */}
        <TabsContent value="performance" className="space-y-3">
          {filteredJobs.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">No jobs match the current filters.</Card>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <KPI icon={Wrench}         label="First-time fix"   value={m.completed === 0 ? "—" : `${m.fixRate}%`} trend={trend(m.fixRate, mPrev.fixRate, mPrev.completed)} sub={`${m.completed} completed`} />
                <KPI icon={AlertTriangle}  label="Callback rate"    value={`${m.callbackRate}%`}                       trend={trend(m.callbackRate, mPrev.callbackRate, prevJobs.length)} href="/app/owner/jobs?preset=callback" />
                <KPI icon={Wallet}         label="Average ticket"   value={m.avgTicket === 0 ? "—" : `$${m.avgTicket.toLocaleString()}`} />
                <KPI icon={Clock}          label="Diagnostic time"  value={m.avgDiagMin ? `${m.avgDiagMin} min` : "—"} sub="avg per completed job" />
                <KPI icon={Users}          label="Tech utilization" value={`${m.utilization}%`} sub={`${m.completed}/${m.total} closed`} />
                <KPI icon={Wallet}         label="Gross margin"     value={m.completed === 0 ? "—" : `${m.margin}%`} trend={trend(m.margin, mPrev.margin, mPrev.completed)} sub={`$${m.grossProfit.toLocaleString()} profit`} />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Card className="p-4">
                  <div className="mb-2 text-sm font-semibold">Revenue over time</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={m.revenueByDay}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>

                <Card className="p-4">
                  <div className="mb-2 text-sm font-semibold">Jobs by status</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={m.jobsByStatus}>
                      <XAxis dataKey="status" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#16a34a" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              <Card className="p-4">
                <div className="mb-2 text-sm font-semibold">Technician performance</div>
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="py-1">Tech</th><th>Jobs</th><th>Revenue</th><th>First-time fix</th><th>Rating</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {m.techStats.filter((t) => t.jobs > 0).map((t) => (
                      <tr key={t.id} className="cursor-pointer hover:bg-muted/30">
                        <td className="py-1.5">
                          <Link to={`/app/owner/jobs?preset=open`} onClick={() => patch({ techIds: [t.id] })} className="hover:underline">
                            {t.name}
                          </Link>
                        </td>
                        <td>{t.jobs}</td>
                        <td>${t.revenue.toLocaleString()}</td>
                        <td>{t.jobs === 0 ? "—" : `${t.fixRate}%`}</td>
                        <td>{t.rating ? `${t.rating} ★` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
