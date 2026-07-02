import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp, TrendingDown, Wallet, Wrench, Users, Clock, AlertTriangle,
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
import { useStatusLabel } from "@/i18n/status";

function TrendBadge({ t: tr, noPriorLabel }: { t: Trend; noPriorLabel: string }) {
  if (tr.insufficient) return <span className="text-[10px] text-muted-foreground">{noPriorLabel}</span>;
  const Icon = tr.dir === "up" ? TrendingUp : tr.dir === "down" ? TrendingDown : Minus;
  const cls = tr.dir === "up" ? "text-success" : tr.dir === "down" ? "text-destructive" : "text-muted-foreground";
  return <span className={`inline-flex items-center gap-1 text-[11px] ${cls}`}><Icon className="h-3 w-3" /> {tr.label}</span>;
}

function KPI({
  icon: Icon, label, value, sub, href, trend, viewMatchingLabel, noPriorLabel,
}: {
  icon: typeof Wallet; label: string; value: string; sub?: string; href?: string; trend?: Trend;
  viewMatchingLabel: string; noPriorLabel: string;
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
        {trend && <TrendBadge t={trend} noPriorLabel={noPriorLabel} />}
      </div>
      {href && <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary">{viewMatchingLabel} <ArrowRight className="h-3 w-3" /></div>}
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
  const { t } = useTranslation();
  const statusLabel = useStatusLabel();
  const { filters, patch, reset } = useJobFilters("owner");

  const techs = state.users.filter((u) => u.role !== "Owner");
  const brands = Array.from(new Set(state.equipment.map((e) => e.manufacturer))).sort();
  const equipmentTypes = Array.from(new Set(state.equipment.map((e) => e.type).filter(Boolean) as string[])).sort();
  const cities = Array.from(new Set([
    ...state.customers.map((c) => c.city).filter(Boolean) as string[],
    ...state.properties.map((p) => p.city).filter(Boolean) as string[],
  ])).sort();

  const ctx = useMemo(() => ({
    equipment: state.equipment,
    properties: state.properties,
    customers: state.customers,
  }), [state.customers, state.equipment, state.properties]);
  const filteredJobs = useMemo(() => applyJobFilters(state.jobs, filters, ctx), [state.jobs, filters, ctx]);

  const prevBounds = useMemo(() => previousRangeBounds(rangeBounds(filters)), [filters]);
  const prevJobs = useMemo(
    () => state.jobs.filter((j) => {
      const tt = +new Date(j.scheduledFor);
      return tt >= +prevBounds.start && tt <= +prevBounds.end;
    }),
    [state.jobs, prevBounds],
  );

  const mctx = useMemo(() => ({
    jobParts: state.jobParts,
    parts: state.parts,
    equipment: state.equipment,
    customers: state.customers,
    users: state.users,
  }), [state.customers, state.equipment, state.jobParts, state.parts, state.users]);
  const m: Metrics = useMemo(() => computeMetrics(filteredJobs, mctx), [filteredJobs, mctx]);
  const mPrev: Metrics = useMemo(() => computeMetrics(prevJobs, mctx), [prevJobs, mctx]);

  const today = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    const todayJobs = filteredJobs.filter((j) => {
      const tt = +new Date(j.scheduledFor); return tt >= +start && tt < +end;
    });
    const enRoute = todayJobs.filter((j) => j.status === "En Route" || j.status === "Near Destination").length;
    const onSite = todayJobs.filter((j) => ["On Site", "Diagnosing", "Repairing", "Verifying", "Documentation"].includes(j.status)).length;
    const completedToday = todayJobs.filter((j) => j.status === "Completed").length;
    const activeLaborMin = Math.round(todayJobs.reduce((s, j) => s + (j.activeLaborMinutes ?? 0), 0));
    const pausedTodayMin = Math.round(todayJobs.reduce((s, j) => s + (j.pausedMinutes ?? jobPausedMs(j) / 60000), 0));
    const revenueToday = Math.round(todayJobs.reduce((s, j) => s + (j.revenue ?? 0), 0));
    return { todayJobs, enRoute, onSite, completedToday, activeLaborMin, pausedTodayMin, revenueToday };
  }, [filteredJobs]);

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
    { kind: "overdue",            label: t("ownerDashboard.attentionGroups.overdue") },
    { kind: "paused-too-long",    label: t("ownerDashboard.attentionGroups.paused-too-long") },
    { kind: "waiting-approval",   label: t("ownerDashboard.attentionGroups.waiting-approval") },
    { kind: "waiting-parts",      label: t("ownerDashboard.attentionGroups.waiting-parts") },
    { kind: "possible-callback",  label: t("ownerDashboard.attentionGroups.possible-callback") },
    { kind: "diag-review",        label: t("ownerDashboard.attentionGroups.diag-review") },
    { kind: "missing-report",     label: t("ownerDashboard.attentionGroups.missing-report") },
    { kind: "customer-follow-up", label: t("ownerDashboard.attentionGroups.customer-follow-up") },
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
  const viewMatchingLabel = t("ownerDashboard.kpiSubs.viewMatching");
  const noPriorLabel = t("ownerDashboard.kpiSubs.noPrior");
  const closeoutRiskCount = filteredJobs.filter((job) => ["Waiting for Approval", "Waiting for Parts", "Follow-Up"].includes(job.status)).length;
  const crewsMovingCount = today.enRoute + today.onSite;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("ownerDashboard.title")}</h1>
          <div className="text-xs text-muted-foreground">{t("ownerDashboard.desc")}</div>
        </div>
      </div>

      <FilterBar
        filters={filters} patch={patch} reset={reset}
        techs={techs} brands={brands} cities={cities}
        equipmentTypes={equipmentTypes} customers={state.customers}
        onExport={exportFiltered} matchedCount={filteredJobs.length}
      />

      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Operations scan</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Put the first-read decisions ahead of the deeper dashboard tabs so the owner can tell what needs intervention before drilling in.
            </div>
          </div>
          <Badge variant="outline">{filteredJobs.length} matched jobs</Badge>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <div className="rounded-xl border bg-muted/10 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">Needs intervention now</div>
            <div className="mt-1 text-lg font-semibold text-foreground">{totalAttention}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Overdue, paused too long, waiting on approval or parts, and missing-report jobs rise here first.
            </div>
          </div>
          <div className="rounded-xl border bg-muted/10 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">Crews moving today</div>
            <div className="mt-1 text-lg font-semibold text-foreground">{crewsMovingCount}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Combines en-route and on-site work so the owner can scan active field load in one line.
            </div>
          </div>
          <div className="rounded-xl border bg-muted/10 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">Closeout risk</div>
            <div className="mt-1 text-lg font-semibold text-foreground">{closeoutRiskCount}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Jobs stuck before approval, parts, or follow-up are the ones most likely to slip out of a clean same-day finish.
            </div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="attention">
        <TabsList>
          <TabsTrigger value="attention">
            {t("ownerDashboard.tabs.attention")} {totalAttention > 0 && <Badge className="ml-2 bg-destructive text-destructive-foreground">{totalAttention}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="today">{t("ownerDashboard.tabs.today")}</TabsTrigger>
          <TabsTrigger value="performance">{t("ownerDashboard.tabs.performance")}</TabsTrigger>
        </TabsList>

        <TabsContent value="attention" className="space-y-3">
          {totalAttention === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-success" />
              {t("ownerDashboard.noAttention")}
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
                                <button className="rounded-md border px-2 py-1 text-xs hover:bg-muted">{t("common.openJob")}</button>
                              </Link>
                            )}
                            <Link to={a.href}>
                              <button className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground hover:opacity-90">{t("common.review")}</button>
                            </Link>
                          </div>
                        </li>
                      );
                    })}
                    {items.length > 6 && (
                      <li className="px-4 py-2 text-center text-xs">
                        <Link to={items[0].href} className="text-primary hover:underline">{t("ownerDashboard.viewAllN", { count: items.length })}</Link>
                      </li>
                    )}
                  </ul>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="today" className="space-y-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <KPI icon={Truck}        label={t("ownerDashboard.kpis.enRoute")}        value={String(today.enRoute)}        href="/app/owner/jobs?preset=en-route" viewMatchingLabel={viewMatchingLabel} noPriorLabel={noPriorLabel} />
            <KPI icon={MapPin}       label={t("ownerDashboard.kpis.onSite")}         value={String(today.onSite)}         href="/app/owner/jobs?preset=on-site" viewMatchingLabel={viewMatchingLabel} noPriorLabel={noPriorLabel} />
            <KPI icon={CheckCircle2} label={t("ownerDashboard.kpis.completedToday")} value={String(today.completedToday)} href="/app/owner/jobs?preset=completed-today" viewMatchingLabel={viewMatchingLabel} noPriorLabel={noPriorLabel} />
            <KPI icon={Clock}        label={t("ownerDashboard.kpis.activeLabor")}    value={`${today.activeLaborMin} min`} sub={t("ownerDashboard.kpiSubs.acrossToday")} viewMatchingLabel={viewMatchingLabel} noPriorLabel={noPriorLabel} />
            <KPI icon={PauseCircle}  label={t("ownerDashboard.kpis.pausedTime")}     value={`${today.pausedTodayMin} min`} sub={t("ownerDashboard.kpiSubs.acrossToday")} viewMatchingLabel={viewMatchingLabel} noPriorLabel={noPriorLabel} />
            <KPI icon={Wallet}       label={t("ownerDashboard.kpis.revenueToday")}   value={`$${today.revenueToday.toLocaleString()}`} viewMatchingLabel={viewMatchingLabel} noPriorLabel={noPriorLabel} />
          </div>

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">{t("ownerDashboard.todaysJobs", { count: today.todayJobs.length })}</div>
              <Link to="/app/owner/jobs?preset=completed-today" className="text-xs text-primary hover:underline">{t("ownerDashboard.openInJobs")}</Link>
            </div>
            {today.todayJobs.length === 0 ? (
              <div className="text-sm text-muted-foreground">{t("ownerDashboard.noJobsToday")}</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-1">{t("ownerDashboard.table.time")}</th>
                    <th>{t("ownerDashboard.table.customer")}</th>
                    <th>{t("ownerDashboard.table.tech")}</th>
                    <th>{t("ownerDashboard.table.status")}</th>
                  </tr>
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
                        <td><Badge variant="secondary">{statusLabel(j.status)}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-3">
          {filteredJobs.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">{t("ownerDashboard.noJobsMatch")}</Card>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <KPI icon={Wrench}         label={t("ownerDashboard.kpis.firstTimeFix")}   value={m.completed === 0 ? "—" : `${m.fixRate}%`} trend={trend(m.fixRate, mPrev.fixRate, mPrev.completed)} sub={t("ownerDashboard.kpiSubs.completed", { count: m.completed })} viewMatchingLabel={viewMatchingLabel} noPriorLabel={noPriorLabel} />
                <KPI icon={AlertTriangle}  label={t("ownerDashboard.kpis.callbackRate")}   value={`${m.callbackRate}%`}                       trend={trend(m.callbackRate, mPrev.callbackRate, prevJobs.length)} href="/app/owner/jobs?preset=callback" viewMatchingLabel={viewMatchingLabel} noPriorLabel={noPriorLabel} />
                <KPI icon={Wallet}         label={t("ownerDashboard.kpis.avgTicket")}      value={m.avgTicket === 0 ? "—" : `$${m.avgTicket.toLocaleString()}`} viewMatchingLabel={viewMatchingLabel} noPriorLabel={noPriorLabel} />
                <KPI icon={Clock}          label={t("ownerDashboard.kpis.diagnosticTime")} value={m.avgDiagMin ? `${m.avgDiagMin} min` : "—"} sub={t("ownerDashboard.kpiSubs.avgPerCompleted")} viewMatchingLabel={viewMatchingLabel} noPriorLabel={noPriorLabel} />
                <KPI icon={Users}          label={t("ownerDashboard.kpis.techUtil")}       value={`${m.utilization}%`} sub={t("ownerDashboard.kpiSubs.techRatio", { done: m.completed, total: m.total })} viewMatchingLabel={viewMatchingLabel} noPriorLabel={noPriorLabel} />
                <KPI icon={Wallet}         label={t("ownerDashboard.kpis.grossMargin")}    value={m.completed === 0 ? "—" : `${m.margin}%`} trend={trend(m.margin, mPrev.margin, mPrev.completed)} sub={t("ownerDashboard.kpiSubs.profit", { value: m.grossProfit.toLocaleString() })} viewMatchingLabel={viewMatchingLabel} noPriorLabel={noPriorLabel} />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Card className="p-4">
                  <div className="mb-2 text-sm font-semibold">{t("ownerDashboard.charts.revenueOverTime")}</div>
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
                  <div className="mb-2 text-sm font-semibold">{t("ownerDashboard.charts.jobsByStatus")}</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={m.jobsByStatus.map((x) => ({ ...x, status: statusLabel(x.status) }))}>
                      <XAxis dataKey="status" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#16a34a" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              <Card className="p-4">
                <div className="mb-2 text-sm font-semibold">{t("ownerDashboard.charts.technicianPerformance")}</div>
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-1">{t("ownerDashboard.table.tech")}</th>
                      <th>{t("ownerDashboard.table.jobs")}</th>
                      <th>{t("ownerDashboard.table.revenue")}</th>
                      <th>{t("ownerDashboard.table.firstTimeFix")}</th>
                      <th>{t("ownerDashboard.table.rating")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {m.techStats.filter((tt) => tt.jobs > 0).map((tt) => (
                      <tr key={tt.id} className="cursor-pointer hover:bg-muted/30">
                        <td className="py-1.5">
                          <Link to={`/app/owner/jobs?preset=open`} onClick={() => patch({ techIds: [tt.id] })} className="hover:underline">
                            {tt.name}
                          </Link>
                        </td>
                        <td>{tt.jobs}</td>
                        <td>${tt.revenue.toLocaleString()}</td>
                        <td>{tt.jobs === 0 ? "—" : `${tt.fixRate}%`}</td>
                        <td>{tt.rating ? `${tt.rating} ★` : "—"}</td>
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
