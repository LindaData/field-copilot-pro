import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore, useCurrentUser } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Camera, MapPin, Phone, AlertCircle, Bot, ArrowRight, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobStatus } from "@/lib/types";
import { useStatusLabel } from "@/i18n/status";
import { useDynamicText } from "@/i18n/dynamic";
import { focusJobForTechnician } from "@/lib/technicianContext";
import { documentationStatusLabel, documentationSummaryForEquipment } from "@/lib/hvacTop50";
import { getPrimaryAction } from "@/lib/primaryAction";

const statusColor: Record<JobStatus, string> = {
  "Unassigned": "bg-muted text-muted-foreground",
  "Scheduled": "bg-secondary text-secondary-foreground",
  "En Route": "bg-info text-info-foreground",
  "Near Destination": "bg-info/70 text-info-foreground",
  "On Site": "bg-accent text-accent-foreground",
  "Diagnosing": "bg-primary text-primary-foreground",
  "Paused": "bg-muted text-foreground",
  "Waiting for Customer": "bg-warning/40 text-warning-foreground",
  "Waiting for Approval": "bg-warning text-warning-foreground",
  "Waiting for Parts": "bg-warning/60 text-warning-foreground",
  "Repairing": "bg-primary/70 text-primary-foreground",
  "Verifying": "bg-primary/50 text-primary-foreground",
  "Documentation": "bg-secondary text-secondary-foreground",
  "Completed": "bg-success text-success-foreground",
  "Follow-Up": "bg-muted text-foreground",
  "Cancelled": "bg-destructive/20 text-destructive",
};

const priorityColor = { Low: "text-muted-foreground", Normal: "text-foreground", High: "text-destructive" } as const;

type RangeKey = "today" | "week" | "month" | "all";

function focusHeading(status?: string) {
  switch (status) {
    case "Scheduled":
      return "First scheduled stop";
    case "En Route":
    case "Near Destination":
      return "Current stop";
    case "On Site":
    case "Diagnosing":
    case "Repairing":
    case "Documentation":
      return "In progress now";
    case "Waiting for Parts":
      return "Waiting for parts";
    case "Follow-Up":
      return "Return visit";
    default:
      return "Current priority";
  }
}

function focusHelper(status?: string) {
  switch (status) {
    case "Scheduled":
      return "Use this as the realistic start-of-day job instead of jumping ahead in the demo.";
    case "En Route":
    case "Near Destination":
      return "Travel is already underway for this stop.";
    case "On Site":
    case "Diagnosing":
    case "Repairing":
    case "Documentation":
      return "This visit is already active in the field.";
    case "Waiting for Parts":
      return "This visit is blocked until parts are ready.";
    case "Follow-Up":
      return "This needs a return visit or office coordination.";
    default:
      return "Open the next realistic technician task.";
  }
}

function inRange(d: Date, range: RangeKey): boolean {
  if (range === "all") return true;
  const now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  if (range === "today") end.setDate(end.getDate() + 1);
  else if (range === "week") end.setDate(end.getDate() + 7);
  else end.setMonth(end.getMonth() + 1);
  return d >= start && d < end;
}

export default function JobsHome() {
  const { state } = useStore();
  const user = useCurrentUser();
  const { t } = useTranslation();
  const statusLabel = useStatusLabel();
  const tx = useDynamicText();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"mine" | "all">("mine");
  const [range, setRange] = useState<RangeKey>("today");

  const jobs = useMemo(() => {
    return state.jobs
      .filter((j) => filter === "all" ? true : j.technicianId === user.id)
      .filter((j) => inRange(new Date(j.scheduledFor), range))
      .filter((j) => {
        if (!q) return true;
        const c = state.customers.find((c) => c.id === j.customerId);
        return [c?.name, j.complaint, j.status].some((x) => x?.toLowerCase().includes(q.toLowerCase()));
      })
      .sort((a, b) => +new Date(a.scheduledFor) - +new Date(b.scheduledFor));
  }, [state, user.id, q, filter, range]);

  const focusJob = focusJobForTechnician(jobs, user.id);
  const focusEquipment = focusJob ? state.equipment.find((equipment) => equipment.id === focusJob.equipmentId) : undefined;
  const focusDocs = focusEquipment ? documentationSummaryForEquipment(focusEquipment) : undefined;
  const focusProperty = focusJob ? state.properties.find((property) => property.id === focusJob.propertyId) : undefined;
  const focusAction = focusJob ? getPrimaryAction(
    focusJob,
    state.diag[focusJob.id],
  ) : undefined;
  const followUpJobs = jobs.filter((job) => job.status === "Follow-Up");
  const needsActionJobs = jobs.filter((job) => ["Waiting for Approval", "Waiting for Parts", "Paused"].includes(job.status));
  const scheduledJobs = jobs.filter((job) => job.status === "Scheduled");
  const nextScheduledJob = scheduledJobs.find((job) => job.id !== focusJob?.id) ?? scheduledJobs[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("common.good.morning") : t("common.good.afternoon");

  return (
    <div className="flex flex-col gap-4 p-4">
      <section className="rounded-2xl bg-primary p-4 text-primary-foreground">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs opacity-80">{greeting}, {user.name.split(" ")[0]}</div>
            <div className="mt-1 text-xl font-semibold">{t("today.todayCount", { count: jobs.length })}</div>
          </div>
          <Link to="/app/scan">
            <Button className="touch-target bg-accent text-accent-foreground hover:bg-accent/90">
              <Camera className="mr-2 h-5 w-5" /> {t("today.scanEquipment")}
            </Button>
          </Link>
        </div>
        <Link to="/app/copilot" className="mt-4 flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm">
          <Bot className="h-4 w-4" /> {t("today.askCopilot")}
        </Link>
        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
          <div className="rounded-md bg-white/10 px-2 py-1.5">
            <div className="opacity-80">Scheduled</div>
            <div className="mt-0.5 text-sm font-semibold">{scheduledJobs.length}</div>
          </div>
          <div className="rounded-md bg-white/10 px-2 py-1.5">
            <div className="opacity-80">Follow-up</div>
            <div className="mt-0.5 text-sm font-semibold">{followUpJobs.length}</div>
          </div>
          <div className="rounded-md bg-white/10 px-2 py-1.5">
            <div className="opacity-80">Needs action</div>
            <div className="mt-0.5 text-sm font-semibold">{needsActionJobs.length}</div>
          </div>
        </div>
      </section>

      {focusJob && (
        <Link to={`/app/jobs/${focusJob.id}`}>
          <div className="card-elev relative overflow-hidden border-l-4 border-l-accent p-4">
            <Badge className={cn("absolute right-3 top-3", statusColor[focusJob.status])}>{statusLabel(focusJob.status)}</Badge>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{focusHeading(focusJob.status)}</div>
            <div className="mt-1 text-base font-semibold">{state.customers.find(c => c.id === focusJob.customerId)?.name}</div>
            <div className="text-sm text-muted-foreground">{tx(focusJob.complaint)}</div>
            <div className="mt-2 text-[11px] text-muted-foreground">{focusHelper(focusJob.status)}</div>
            {focusAction ? (
              <div className="mt-3 rounded-xl border bg-muted/20 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">Next move</div>
                <div className="mt-1 text-sm font-semibold text-foreground">{focusAction.label}</div>
                {focusAction.helper ? (
                  <div className="mt-1 text-xs text-muted-foreground">{focusAction.helper}</div>
                ) : null}
              </div>
            ) : null}
            <Button className="mt-3 touch-target w-full justify-between">
              <span>{t("common.openJob")}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Link>
      )}

      {focusJob ? (
        <section className="card-elev p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Ready for this stop</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Keep travel, access, and source trust visible before opening the full job.
              </div>
            </div>
            <Link to={`/app/jobs/${focusJob.id}`} className="text-[11px] font-medium text-primary">
              Open full job
            </Link>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border bg-muted/10 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">Travel</div>
              <div className="mt-1 text-sm font-semibold text-foreground">
                {focusJob.travelStartedAt ? "Route started" : "Not started"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {focusJob.travelStartedAt
                  ? `Travel started at ${new Date(focusJob.travelStartedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`
                  : `Scheduled for ${new Date(focusJob.scheduledFor).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`}
              </div>
            </div>
            <div className="rounded-xl border bg-muted/10 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">Access</div>
              <div className="mt-1 text-sm font-semibold text-foreground">
                {focusProperty?.gateCode ? `Gate code ${focusProperty.gateCode}` : "No gate code on file"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {focusProperty?.accessNotes || focusProperty?.parkingNotes || "Open the job detail if this stop needs arrival notes or parking instructions."}
              </div>
            </div>
            <div className="rounded-xl border bg-muted/10 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">Source</div>
              <div className="mt-1 text-sm font-semibold text-foreground">
                {focusDocs?.best ? documentationStatusLabel(focusDocs.best) : "No source linked"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {focusDocs?.best
                  ? focusDocs.best.documentTitle
                  : "This unit still needs linked literature before the field team should trust exact source values."}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {(followUpJobs.length > 0 || nextScheduledJob) && (
        <section className="card-elev p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Do next</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Keep the list anchored to the next realistic technician move.
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {followUpJobs[0] ? (
              <Link to={`/app/jobs/${followUpJobs[0].id}`} className="rounded-xl border border-warning/40 bg-warning/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">Open follow-up visit</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {state.customers.find((customer) => customer.id === followUpJobs[0].customerId)?.name} - {tx(followUpJobs[0].complaint)}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-warning" />
                </div>
              </Link>
            ) : null}
            {nextScheduledJob ? (
              <Link to={`/app/jobs/${nextScheduledJob.id}`} className="rounded-xl border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">Next scheduled stop</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {state.customers.find((customer) => customer.id === nextScheduledJob.customerId)?.name} - {new Date(nextScheduledJob.scheduledFor).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              </Link>
            ) : null}
          </div>
        </section>
      )}

      <div className="flex items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("common.searchPlaceholder")} className="touch-target" />
        <div className="flex rounded-md border bg-card">
          <button onClick={() => setFilter("mine")} className={cn("touch-target px-3 text-xs", filter === "mine" && "bg-primary text-primary-foreground rounded-l-md")}>{t("common.mine")}</button>
          <button onClick={() => setFilter("all")} className={cn("touch-target px-3 text-xs", filter === "all" && "bg-primary text-primary-foreground rounded-r-md")}>{t("common.all")}</button>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto rounded-md border bg-card p-1">
        {([
          { k: "today", label: t("common.today") },
          { k: "week", label: t("common.thisWeek") },
          { k: "month", label: t("common.thisMonth") },
          { k: "all", label: t("common.all") },
        ] as const).map((r) => (
          <button
            key={r.k}
            onClick={() => setRange(r.k)}
            className={cn(
              "touch-target flex-1 whitespace-nowrap rounded px-3 text-xs font-medium",
              range === r.k ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {jobs.map((j) => {
          const c = state.customers.find((x) => x.id === j.customerId);
          const p = state.properties.find((x) => x.id === j.propertyId);
          return (
            <Link key={j.id} to={`/app/jobs/${j.id}`} className="card-elev flex flex-col gap-2 p-3 active:bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{c?.name}</div>
                <span className={cn("stat-pill", statusColor[j.status])}>{statusLabel(j.status)}</span>
              </div>
              <div className="text-sm text-foreground/90 line-clamp-2">{tx(j.complaint)}</div>
              {j.status === "Follow-Up" ? <div className="text-[11px] font-medium text-warning">Needs return visit or office follow-up</div> : null}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {p?.address.split(",")[0]}</span>
                <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {c?.phone}</span>
                <span className={cn("inline-flex items-center gap-1 font-medium", priorityColor[j.priority])}>
                  {j.priority === "High" && <AlertCircle className="h-3.5 w-3.5" />}
                  {new Date(j.scheduledFor).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
            </Link>
          );
        })}
        {jobs.length === 0 && (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t("jobs.noMatch")}</div>
        )}
      </div>
    </div>
  );
}
