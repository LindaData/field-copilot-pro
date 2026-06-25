import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useStore, useCurrentUser, jobPausedMs, jobActivePause } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Camera, Bot, ArrowRight, Clock, Wrench, MapPin, Phone, Wifi, WifiOff,
  Pause, ChevronRight,
} from "lucide-react";
import { primaryActionForToday, type PrimaryAction } from "@/lib/primaryAction";
import { cn } from "@/lib/utils";

function fmtDur(ms: number) {
  const m = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m` : `${m}m`;
}

function statusLabel(s: string) {
  return s;
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

export default function Today() {
  const { state } = useStore();
  const user = useCurrentUser();

  // tick once per minute to keep timers live
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const myJobs = state.jobs.filter((j) => j.technicianId === user.id);
  const openJobs = myJobs.filter((j) => j.status !== "Completed");
  const doneToday = myJobs.filter((j) => j.status === "Completed").length;

  const current =
    myJobs.find((j) => j.status === "On Site" || j.status === "Diagnosing")
    ?? myJobs.find((j) => j.status === "En Route")
    ?? myJobs.find((j) => j.status === "Waiting for Approval" || j.status === "Waiting for Parts");

  const upcoming = openJobs
    .filter((j) => j !== current)
    .sort((a, b) => +new Date(a.scheduledFor) - +new Date(b.scheduledFor));

  const next = upcoming[0];
  const remaining = upcoming.length;

  const diag = current ? state.diag[current.id] : undefined;
  const auth = current ? state.auths.find((a) => a.jobId === current.id) : undefined;
  const action = primaryActionForToday({ current, upcoming: next, diag, auth });

  // active labor across all my jobs today (arrived → completed minus paused)
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

  const customerOf = (id: string) => state.customers.find((c) => c.id === id);
  const propertyOf = (id?: string) => state.properties.find((p) => p.id === id);

  return (
    <div className="flex flex-col gap-4 p-4 pb-8">
      {/* Greeting + sync status */}
      <header className="rounded-2xl bg-primary p-4 text-primary-foreground">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs opacity-80">
              Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {user.name.split(" ")[0]}
            </div>
            <div className="mt-1 text-xl font-semibold leading-tight">
              {openJobs.length} open {openJobs.length === 1 ? "job" : "jobs"} · {doneToday} done today
            </div>
          </div>
          <span className="stat-pill border border-white/30 bg-white/10 text-[11px]">
            {state.online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {state.online ? "Synced" : "Offline"}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-md bg-white/10 px-2 py-1.5">
            <div className="flex items-center gap-1 opacity-80"><Clock className="h-3.5 w-3.5" /> Active labor</div>
            <div className="mt-0.5 text-sm font-semibold">{fmtDur(activeMs)}</div>
          </div>
          <div className="rounded-md bg-white/10 px-2 py-1.5">
            <div className="flex items-center gap-1 opacity-80"><Pause className="h-3.5 w-3.5" /> Paused</div>
            <div className="mt-0.5 text-sm font-semibold">
              {fmtDur(pausedMs)}
              {activePauseReason && <span className="ml-1 text-[10px] font-normal opacity-80">· {activePauseReason}</span>}
            </div>
          </div>
        </div>
      </header>

      {/* Current job card (or next if none current) */}
      {current ? (
        <Link to={`/app/jobs/${current.id}`}>
          <div className="card-elev relative overflow-hidden border-l-4 border-l-accent p-4">
            <Badge className="absolute right-3 top-3 bg-accent text-accent-foreground">{statusLabel(current.status)}</Badge>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Current job</div>
            <div className="mt-1 text-base font-semibold leading-tight">{customerOf(current.customerId)?.name}</div>
            <div className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{current.complaint}</div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{propertyOf(current.propertyId)?.address.split(",")[0]}</span>
              <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{customerOf(current.customerId)?.phone}</span>
            </div>
          </div>
        </Link>
      ) : next ? (
        <Link to={`/app/jobs/${next.id}`}>
          <div className="card-elev p-4">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Next job</div>
            <div className="mt-1 text-base font-semibold">{customerOf(next.customerId)?.name}</div>
            <div className="text-sm text-muted-foreground line-clamp-2">{next.complaint}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {new Date(next.scheduledFor).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </div>
          </div>
        </Link>
      ) : (
        <div className="card-elev p-4 text-center text-sm text-muted-foreground">
          You're all caught up. Nice work.
        </div>
      )}

      {/* ONE primary action */}
      <PrimaryCta action={action} />

      {/* Up next (compact) */}
      {current && next && (
        <Link to={`/app/jobs/${next.id}`} className="card-elev flex items-center gap-3 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <ArrowRight className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Up next</div>
            <div className="text-sm font-semibold leading-tight">{customerOf(next.customerId)?.name}</div>
            <div className="text-[11px] text-muted-foreground">
              {new Date(next.scheduledFor).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              {remaining > 1 && <span> · {remaining - 1} more after this</span>}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      )}

      {/* Quick links — secondary */}
      <div className="grid grid-cols-2 gap-2">
        <Link to="/app/scan">
          <Button variant="outline" className="touch-target h-12 w-full">
            <Camera className="mr-2 h-4 w-4" /> Scan
          </Button>
        </Link>
        <Link to="/app/copilot">
          <Button variant="outline" className="touch-target h-12 w-full">
            <Bot className="mr-2 h-4 w-4" /> Copilot
          </Button>
        </Link>
      </div>

      {/* Recently viewed equipment */}
      {recent.length > 0 && (
        <section>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recently viewed equipment</div>
          <div className="flex flex-col gap-2">
            {recent.map((eq) => (
              <Link key={eq.id} to={`/app/equipment/${eq.id}`} className="card-elev flex items-center gap-3 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary"><Wrench className="h-5 w-5" /></div>
                <div className="flex-1">
                  <div className="text-sm font-semibold leading-tight">{eq.manufacturer} {eq.model}</div>
                  <div className="text-[11px] text-muted-foreground">Serial {eq.serial}</div>
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
