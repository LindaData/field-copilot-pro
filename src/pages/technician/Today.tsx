import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useStore, useCurrentUser } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, Bot, ArrowRight, Clock, Wrench, MapPin, Phone, Wifi, WifiOff } from "lucide-react";

function fmtDur(ms: number) {
  const m = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m` : `${m}m`;
}

export default function Today() {
  const { state } = useStore();
  const user = useCurrentUser();

  const myJobs = state.jobs.filter((j) => j.technicianId === user.id);
  const current = myJobs.find((j) => j.status === "On Site" || j.status === "Diagnosing")
    ?? myJobs.find((j) => j.status === "En Route");
  const upcoming = myJobs
    .filter((j) => j !== current && j.status !== "Completed")
    .sort((a, b) => +new Date(a.scheduledFor) - +new Date(b.scheduledFor))
    .slice(0, 3);

  const timeMs = useMemo(() => {
    const now = Date.now();
    return myJobs.reduce((sum, j) => {
      if (!j.arrivedAt) return sum;
      const end = j.completedAt ? +new Date(j.completedAt) : now;
      return sum + Math.max(0, end - +new Date(j.arrivedAt) - (j.pausedMs ?? 0));
    }, 0);
  }, [myJobs]);

  const recent = (state.recentEquipmentIds ?? [])
    .map((id) => state.equipment.find((e) => e.id === id))
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-4 p-4">
      <section className="rounded-2xl bg-primary p-4 text-primary-foreground">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs opacity-80">Good {new Date().getHours() < 12 ? "morning" : "afternoon"}, {user.name.split(" ")[0]}</div>
            <div className="mt-1 text-xl font-semibold">{myJobs.filter(j => j.status !== "Completed").length} open · {myJobs.filter(j => j.status === "Completed").length} done today</div>
          </div>
          <span className="stat-pill border border-white/30 bg-white/10">
            {state.online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {state.online ? "Synced" : "Offline"}
          </span>
        </div>
        <div className="mt-3 inline-flex items-center gap-2 rounded-md bg-white/10 px-2 py-1 text-xs">
          <Clock className="h-3.5 w-3.5" /> Labor today: <strong>{fmtDur(timeMs)}</strong>
        </div>
      </section>

      {current ? (
        <Link to={`/app/jobs/${current.id}`}>
          <div className="card-elev relative overflow-hidden border-l-4 border-l-accent p-4">
            <Badge className="absolute right-3 top-3 bg-accent text-accent-foreground">{current.status}</Badge>
            <div className="text-xs font-medium text-muted-foreground">Current job</div>
            <div className="mt-1 text-base font-semibold">{state.customers.find(c => c.id === current.customerId)?.name}</div>
            <div className="text-sm text-muted-foreground">{current.complaint}</div>
            <Button className="mt-3 touch-target w-full h-12">Open job <ArrowRight className="ml-1 h-5 w-5" /></Button>
          </div>
        </Link>
      ) : (
        upcoming[0] && (
          <Link to={`/app/jobs/${upcoming[0].id}`}>
            <div className="card-elev p-4">
              <div className="text-xs text-muted-foreground">Next job</div>
              <div className="mt-1 text-base font-semibold">{state.customers.find(c => c.id === upcoming[0].customerId)?.name}</div>
              <div className="text-sm text-muted-foreground">{upcoming[0].complaint}</div>
              <Button className="mt-3 touch-target w-full h-12">Start job <ArrowRight className="ml-1 h-5 w-5" /></Button>
            </div>
          </Link>
        )
      )}

      <div className="grid grid-cols-2 gap-2">
        <Link to="/app/scan">
          <Button className="touch-target h-14 w-full bg-accent text-accent-foreground hover:bg-accent/90">
            <Camera className="mr-2 h-5 w-5" /> Scan equipment
          </Button>
        </Link>
        <Link to="/app/copilot">
          <Button variant="outline" className="touch-target h-14 w-full">
            <Bot className="mr-2 h-5 w-5" /> Ask Copilot
          </Button>
        </Link>
      </div>

      <Link to="/app/copilot" className="card-elev flex items-center gap-2 p-3 text-sm text-muted-foreground">
        <Bot className="h-4 w-4 text-primary" /> Ask Copilot anything about this job…
      </Link>

      {upcoming.length > 0 && (
        <section>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Up next</div>
          <div className="flex flex-col gap-2">
            {upcoming.map((j) => {
              const c = state.customers.find(x => x.id === j.customerId);
              const p = state.properties.find(x => x.id === j.propertyId);
              return (
                <Link key={j.id} to={`/app/jobs/${j.id}`} className="card-elev flex flex-col gap-1 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">{c?.name}</div>
                    <span className="text-xs text-muted-foreground">{new Date(j.scheduledFor).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{j.complaint}</div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{p?.address.split(",")[0]}</span>
                    <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{c?.phone}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recently viewed equipment</div>
          <div className="flex flex-col gap-2">
            {recent.map((eq) => (
              <Link key={eq!.id} to={`/app/equipment/${eq!.id}`} className="card-elev flex items-center gap-3 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary"><Wrench className="h-5 w-5" /></div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{eq!.manufacturer} {eq!.model}</div>
                  <div className="text-xs text-muted-foreground">Serial {eq!.serial}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
