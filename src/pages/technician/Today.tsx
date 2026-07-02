import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore, useCurrentUser, jobPausedMs, jobActivePause } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Camera, Bot, ArrowRight, Clock, Wrench, MapPin, Phone, Wifi, WifiOff,
  Pause, ChevronRight,
} from "lucide-react";
import { primaryActionForToday, type PrimaryAction } from "@/lib/primaryAction";
import { focusJobForTechnician } from "@/lib/technicianContext";
import { cn } from "@/lib/utils";
import { useStatusLabel } from "@/i18n/status";
import { useDynamicText } from "@/i18n/dynamic";

function fmtDur(ms: number) {
  const m = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m` : `${m}m`;
}

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
      return "Start here.";
    case "En Route":
    case "Near Destination":
      return "Travel underway.";
    case "On Site":
    case "Diagnosing":
    case "Repairing":
    case "Documentation":
      return "Active stop.";
    case "Waiting for Parts":
      return "Waiting on parts.";
    case "Follow-Up":
      return "Return work.";
    default:
      return "Open next action.";
  }
}

function PrimaryCta({ action }: { action: PrimaryAction }) {
  const color =
    action.variant === "accent"
      ? "bg-accent text-accent-foreground hover:bg-accent/90"
      : action.variant === "muted"
        ? "bg-muted text-foreground hover:bg-muted/80"
        : "bg-primary text-primary-foreground hover:bg-primary/90";
  return (
    <Link to={action.to} className="block">
      <Button
        className={cn(
          "touch-target h-16 w-full rounded-2xl text-base font-semibold shadow-sm",
          color,
        )}
      >
        <span className="flex flex-1 flex-col items-start text-left">
          <span>{action.label}</span>
          {action.helper && (
            <span className="text-xs font-normal opacity-80">{action.helper}</span>
          )}
        </span>
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </Link>
  );
}

type RangeKey = "day" | "week" | "month" | "all";

function inRange(d: Date, range: RangeKey): boolean {
  if (range === "all") return true;
  const now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  if (range === "day") end.setDate(end.getDate() + 1);
  else if (range === "week") end.setDate(end.getDate() + 7);
  else end.setMonth(end.getMonth() + 1);
  return d >= start && d < end;
}

export default function Today() {
  const { state } = useStore();
  const user = useCurrentUser();
  const { t } = useTranslation();
  const statusLabel = useStatusLabel();
  const tx = useDynamicText();
  const [range, setRange] = useState<RangeKey>("day");

  const RANGE_LABEL: Record<RangeKey, string> = {
    day: t("common.today"),
    week: t("common.thisWeek"),
    month: t("common.thisMonth"),
    all: t("common.allUpcoming"),
  };

  // tick once per minute to keep timers live
  const [, setTick] = useState(0);
  useEffect(() => {
    const tt = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(tt);
  }, []);

  const allMyJobs = state.jobs.filter((j) => j.technicianId === user.id);
  const myJobs = allMyJobs.filter((j) => inRange(new Date(j.scheduledFor), range));
  const openJobs = myJobs.filter((j) => j.status !== "Completed");
  const doneToday = allMyJobs.filter(
    (j) => j.status === "Completed" && inRange(new Date(j.scheduledFor), "day"),
  ).length;
  const scheduledCount = openJobs.filter((j) => j.status === "Scheduled").length;
  const followUpCount = openJobs.filter((j) => j.status === "Follow-Up").length;
  const waitingCount = openJobs.filter((j) => ["Waiting for Approval", "Waiting for Parts", "Paused"].includes(j.status)).length;

  const current = focusJobForTechnician(myJobs, user.id);

  const upcoming = openJobs
    .filter((j) => j !== current)
    .sort((a, b) => +new Date(a.scheduledFor) - +new Date(b.scheduledFor));

  const followUps = openJobs
    .filter((j) => j.status === "Follow-Up")
    .sort((a, b) => +new Date(a.scheduledFor) - +new Date(b.scheduledFor));
  const followUp = followUps[0];
  const next = upcoming[0];

  const customerOf = (id: string) => state.customers.find((c) => c.id === id);
  const propertyOf = (id?: string) => state.properties.find((p) => p.id === id);

  const diag = current ? state.diag[current.id] : undefined;
  const auth = current ? state.auths.find((a) => a.jobId === current.id) : undefined;
  const action: PrimaryAction = current
    ? primaryActionForToday({ current, upcoming: next, diag, auth })
    : followUp
      ? {
        kind: "open-job",
        label: "Open follow-up visit",
        helper: `${customerOf(followUp.customerId)?.name ?? "Return visit"} - ${new Date(followUp.scheduledFor).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
        to: `/app/jobs/${followUp.id}`,
        variant: "accent",
      }
      : primaryActionForToday({ upcoming: next });

  const { activeMs, pausedMs, activePauseReason } = useMemo(() => {
    const now = Date.now();
    let act = 0;
    let pau = 0;
    let reason: string | undefined;
    for (const j of myJobs) {
      if (!j.arrivedAt) continue;
      const end = j.completedAt ? +new Date(j.completedAt) : now;
      const total = Math.max(0, end - +new Date(j.arrivedAt));
      const p = jobPausedMs(j, now);
      pau += p;
      act += Math.max(0, total - p);
      const ap = jobActivePause(j);
      if (ap && !reason) reason = ap.reason;
    }
    return { activeMs: act, pausedMs: pau, activePauseReason: reason };
  }, [myJobs]);

  const recent = (state.recentEquipmentIds ?? [])
    .map((id) => state.equipment.find((e) => e.id === id))
    .filter((e): e is NonNullable<typeof e> => Boolean(e))
    .slice(0, 3);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("common.good.morning") : hour < 18 ? t("common.good.afternoon") : t("common.good.evening");

  return (
    <div className="flex flex-col gap-4 p-4 pb-8">
      <header className="rounded-2xl bg-primary p-4 text-primary-foreground">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs opacity-80">
              {greeting}, {user.name.split(" ")[0]}
            </div>
            <div className="mt-1 text-xl font-semibold leading-tight">
              {t(openJobs.length === 1 ? "today.openJobsZero" : "today.openJobsOther", { count: openJobs.length, done: doneToday })}
            </div>
          </div>
          <span className="stat-pill border border-white/30 bg-white/10 text-[11px]">
            {state.online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {state.online ? t("status.synced") : t("status.offline")}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-md bg-white/10 px-2 py-1.5">
            <div className="flex items-center gap-1 opacity-80"><Clock className="h-3.5 w-3.5" /> On-site time</div>
            <div className="mt-0.5 text-sm font-semibold">{fmtDur(activeMs)}</div>
          </div>
          <div className="rounded-md bg-white/10 px-2 py-1.5">
            <div className="flex items-center gap-1 opacity-80"><Pause className="h-3.5 w-3.5" /> {t("today.pausedTime")}</div>
            <div className="mt-0.5 text-sm font-semibold">
              {fmtDur(pausedMs)}
              {activePauseReason && <span className="ml-1 text-[10px] font-normal opacity-80">- {activePauseReason}</span>}
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
          <div className="rounded-md bg-white/10 px-2 py-1.5">
            <div className="opacity-80">Scheduled</div>
            <div className="mt-0.5 text-sm font-semibold">{scheduledCount}</div>
          </div>
          <div className="rounded-md bg-white/10 px-2 py-1.5">
            <div className="opacity-80">Follow-up</div>
            <div className="mt-0.5 text-sm font-semibold">{followUpCount}</div>
          </div>
          <div className="rounded-md bg-white/10 px-2 py-1.5">
            <div className="opacity-80">Needs action</div>
            <div className="mt-0.5 text-sm font-semibold">{waitingCount}</div>
          </div>
        </div>
      </header>

      {current ? (
        <Link to={`/app/jobs/${current.id}`} data-review-avoid="today-current-stop">
          <div className="card-elev relative overflow-hidden border-l-4 border-l-accent p-4">
            <Badge className="absolute right-3 top-3 bg-accent text-accent-foreground">{statusLabel(current.status)}</Badge>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{focusHeading(current.status)}</div>
            <div className="mt-1 text-base font-semibold leading-tight">{customerOf(current.customerId)?.name}</div>
            <div className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{tx(current.complaint)}</div>
            <div className="mt-2 text-[11px] text-muted-foreground">{focusHelper(current.status)}</div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{propertyOf(current.propertyId)?.address.split(",")[0]}</span>
              <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{customerOf(current.customerId)?.phone}</span>
            </div>
          </div>
        </Link>
      ) : next ? (
        <Link to={`/app/jobs/${next.id}`}>
          <div className="card-elev p-4">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Next scheduled stop</div>
            <div className="mt-1 text-base font-semibold">{customerOf(next.customerId)?.name}</div>
            <div className="text-sm text-muted-foreground line-clamp-2">{tx(next.complaint)}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {new Date(next.scheduledFor).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </div>
          </div>
        </Link>
      ) : (
        <div className="card-elev p-4 text-center text-sm text-muted-foreground">
          {t("today.allCaughtUp")}
        </div>
      )}

      <section className="card-elev p-4" data-review-avoid="today-primary-action">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Next action</div>
        <div className="mt-3">
          <PrimaryCta action={action} />
        </div>
      </section>

      <section className="card-elev p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Today queue</div>
          </div>
          <Link to="/app/jobs" className="text-[11px] font-medium text-primary">
            Open full schedule
          </Link>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border bg-muted/10 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">Current priority</div>
            <div className="mt-1 text-sm font-semibold text-foreground">
              {current ? customerOf(current.customerId)?.name : followUp ? customerOf(followUp.customerId)?.name : next ? customerOf(next.customerId)?.name : "No active stop"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {current
                ? `${focusHeading(current.status)} - ${tx(current.complaint)}`
                : followUp
                  ? `Follow-up visit - ${tx(followUp.complaint)}`
                  : next
                    ? `Scheduled next - ${tx(next.complaint)}`
                    : "No active stop."}
            </div>
          </div>
          <div className="rounded-xl border bg-muted/10 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">Queue next stop</div>
            <div className="mt-1 text-sm font-semibold text-foreground">
              {next ? customerOf(next.customerId)?.name : "No later stop queued"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {next
                ? `${new Date(next.scheduledFor).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} - ${propertyOf(next.propertyId)?.address.split(",")[0] ?? "Open the schedule for details."}`
                : "No next stop queued."}
            </div>
          </div>
          <div className="rounded-xl border bg-muted/10 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">Blocked or follow-up</div>
            <div className="mt-1 text-sm font-semibold text-foreground">{waitingCount + followUpCount}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {waitingCount + followUpCount > 0
                ? `${followUpCount} follow-up, ${waitingCount} waiting on approval, parts, or pause state.`
                : "Nothing blocked."}
            </div>
          </div>
        </div>
      </section>

      {followUps.length > 0 ? (
        <section className="card-elev p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Needs follow-up</div>
            </div>
            <Badge variant="secondary">{followUps.length}</Badge>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {followUps.slice(0, 2).map((followUpJob) => (
              <Link
                key={followUpJob.id}
                to={`/app/jobs/${followUpJob.id}`}
                className="rounded-xl border border-warning/40 bg-warning/10 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{customerOf(followUpJob.customerId)?.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{tx(followUpJob.complaint)}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-warning" />
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  {new Date(followUpJob.scheduledFor).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="flex items-center gap-1 rounded-md border bg-card p-1">
        {(["day", "week", "month", "all"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={cn(
              "touch-target flex-1 whitespace-nowrap rounded px-2 text-xs font-medium",
              range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {RANGE_LABEL[r]}
          </button>
        ))}
      </div>

      {myJobs.length > 0 ? (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("today.scheduleHeader", { label: RANGE_LABEL[range], count: myJobs.length })}
            </div>
            <Link to="/app/jobs" className="text-[11px] font-medium text-primary">{t("common.viewAll")}</Link>
          </div>
          <div className="flex flex-col gap-2">
            {[...myJobs]
              .sort((a, b) => +new Date(a.scheduledFor) - +new Date(b.scheduledFor))
              .map((j) => {
                const c = customerOf(j.customerId);
                const p = propertyOf(j.propertyId);
                const isCurrent = current?.id === j.id;
                const done = j.status === "Completed";
                const when = new Date(j.scheduledFor);
                return (
                  <Link
                    key={j.id}
                    to={`/app/jobs/${j.id}`}
                    className={cn(
                      "card-elev flex items-center gap-3 p-3",
                      isCurrent && "border-l-4 border-l-accent",
                      j.status === "Follow-Up" && "border border-warning/40 bg-warning/10",
                      done && "opacity-60",
                    )}
                  >
                    <div className="w-16 shrink-0 text-center">
                      <div className="text-[10px] font-semibold uppercase leading-tight text-muted-foreground">
                        {when.toLocaleDateString([], { month: "short", day: "numeric" })}
                      </div>
                      <div className="text-sm font-semibold leading-tight">
                        {when.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-semibold">{c?.name}</div>
                        <Badge variant="secondary" className="shrink-0 text-[10px]">{statusLabel(j.status)}</Badge>
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">{tx(j.complaint)}</div>
                      {j.status === "Follow-Up" ? (
                        <div className="mt-0.5 text-[11px] font-medium text-warning">Needs return visit or office follow-up</div>
                      ) : null}
                      {p && (
                        <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {p.address.split(",")[0]}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                );
              })}
          </div>
        </section>
      ) : (
        <div className="card-elev p-4 text-center text-sm text-muted-foreground">
          {t("today.noJobsInRange", { label: RANGE_LABEL[range].toLowerCase() })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Link to="/app/scan">
          <Button variant="outline" className="touch-target h-12 w-full">
            <Camera className="mr-2 h-4 w-4" /> {t("nav.scan")}
          </Button>
        </Link>
        <Link to="/app/copilot">
          <Button variant="outline" className="touch-target h-12 w-full">
            <Bot className="mr-2 h-4 w-4" /> {t("nav.copilot")}
          </Button>
        </Link>
      </div>

      {recent.length > 0 && (
        <section>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t("today.recentlyViewed")}</div>
          <div className="flex flex-col gap-2">
            {recent.map((eq) => (
              <Link key={eq.id} to={`/app/equipment/${eq.id}`} className="card-elev flex items-center gap-3 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary"><Wrench className="h-5 w-5" /></div>
                <div className="flex-1">
                  <div className="text-sm font-semibold leading-tight">{eq.manufacturer} {eq.model}</div>
                  <div className="text-[11px] text-muted-foreground">{t("today.serial", { value: eq.serial })}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

