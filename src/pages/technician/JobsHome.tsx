import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { useStore, useCurrentUser } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Camera, MapPin, Phone, AlertCircle, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobStatus } from "@/lib/types";

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

export default function JobsHome() {
  const { state } = useStore();
  const user = useCurrentUser();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"mine" | "all">("mine");

  const jobs = useMemo(() => {
    return state.jobs
      .filter((j) => filter === "all" ? true : j.technicianId === user.id)
      .filter((j) => {
        if (!q) return true;
        const c = state.customers.find((c) => c.id === j.customerId);
        return [c?.name, j.complaint, j.status].some((x) => x?.toLowerCase().includes(q.toLowerCase()));
      })
      .sort((a, b) => +new Date(a.scheduledFor) - +new Date(b.scheduledFor));
  }, [state, user.id, q, filter]);

  const onSite = jobs.find((j) => j.status === "On Site");

  return (
    <div className="flex flex-col gap-4 p-4">
      <section className="rounded-2xl bg-primary p-4 text-primary-foreground">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs opacity-80">Good {new Date().getHours() < 12 ? "morning" : "afternoon"}, {user.name.split(" ")[0]}</div>
            <div className="mt-1 text-xl font-semibold">Today · {jobs.length} jobs</div>
          </div>
          <Link to="/app/scan">
            <Button className="touch-target bg-accent text-accent-foreground hover:bg-accent/90">
              <Camera className="mr-2 h-5 w-5" /> Scan Equipment
            </Button>
          </Link>
        </div>
        <Link to="/app/copilot" className="mt-4 flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm">
          <Bot className="h-4 w-4" /> Ask Copilot anything…
        </Link>
      </section>

      {onSite && (
        <Link to={`/app/jobs/${onSite.id}`}>
          <div className="card-elev relative overflow-hidden border-l-4 border-l-accent p-4">
            <Badge className="absolute right-3 top-3 bg-accent text-accent-foreground">On Site</Badge>
            <div className="text-xs font-medium text-accent-foreground/80">Active job</div>
            <div className="mt-1 text-base font-semibold">{state.customers.find(c => c.id === onSite.customerId)?.name}</div>
            <div className="text-sm text-muted-foreground">{onSite.complaint}</div>
            <Button className="mt-3 touch-target w-full">Resume diagnostic →</Button>
          </div>
        </Link>
      )}

      <div className="flex items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search jobs" className="touch-target" />
        <div className="flex rounded-md border bg-card">
          <button onClick={() => setFilter("mine")} className={cn("touch-target px-3 text-xs", filter === "mine" && "bg-primary text-primary-foreground rounded-l-md")}>Mine</button>
          <button onClick={() => setFilter("all")} className={cn("touch-target px-3 text-xs", filter === "all" && "bg-primary text-primary-foreground rounded-r-md")}>All</button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {jobs.map((j) => {
          const c = state.customers.find((x) => x.id === j.customerId);
          const p = state.properties.find((x) => x.id === j.propertyId);
          return (
            <Link key={j.id} to={`/app/jobs/${j.id}`} className="card-elev flex flex-col gap-2 p-3 active:bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{c?.name}</div>
                <span className={cn("stat-pill", statusColor[j.status])}>{j.status}</span>
              </div>
              <div className="text-sm text-foreground/90 line-clamp-2">{j.complaint}</div>
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
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No jobs match. Try clearing the filter.</div>
        )}
      </div>
    </div>
  );
}
