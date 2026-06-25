import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Bot, Camera, ClipboardList, FileText, MapPin, Phone, ShieldAlert, Wrench, Navigation, CheckCircle2, Pause, Play, Clock, History } from "lucide-react";
import { toast } from "sonner";

function fmtClock(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function fmtDur(ms: number) {
  const m = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m` : `${m}m`;
}

export default function JobDetail() {
  const { id = "" } = useParams();
  const { state, setState, setJobStatus } = useStore();
  const nav = useNavigate();
  const job = state.jobs.find((j) => j.id === id);
  if (!job) return <div className="p-6">Job not found. <Link className="underline" to="/app/jobs">Back</Link></div>;

  const c = state.customers.find((x) => x.id === job.customerId);
  const p = state.properties.find((x) => x.id === job.propertyId);
  const eq = state.equipment.find((x) => x.id === job.equipmentId);
  const diag = state.diag[job.id];
  const hasReport = diag?.completed;
  const history = state.jobs
    .filter((j) => j.customerId === job.customerId && j.id !== job.id && j.status === "Completed")
    .slice(0, 3);

  const updateJob = (patch: Partial<typeof job>) =>
    setState((s) => ({ ...s, jobs: s.jobs.map((j) => (j.id === job.id ? { ...j, ...patch } : j)) }));

  const onStartTravel = () => { updateJob({ travelStartedAt: new Date().toISOString() }); setJobStatus(job.id, "En Route"); toast.success("Travel started"); };
  const onArrive = () => { updateJob({ arrivedAt: new Date().toISOString() }); setJobStatus(job.id, "On Site"); toast.success("Marked on site"); };
  const onStartDiag = () => { updateJob({ diagnosisStartedAt: job.diagnosisStartedAt ?? new Date().toISOString() }); setJobStatus(job.id, "Diagnosing"); nav(`/app/jobs/${job.id}/diagnose`); };
  const onPause = () => {
    if (job.pausedAt) {
      const add = Date.now() - +new Date(job.pausedAt);
      updateJob({ pausedAt: undefined, pausedMs: (job.pausedMs ?? 0) + add });
      toast("Resumed");
    } else {
      updateJob({ pausedAt: new Date().toISOString() });
      toast("Paused");
    }
  };
  const onComplete = () => { updateJob({ completedAt: new Date().toISOString() }); setJobStatus(job.id, "Completed"); toast.success("Job completed"); };

  const laborMs = job.arrivedAt
    ? ((job.completedAt ? +new Date(job.completedAt) : Date.now()) - +new Date(job.arrivedAt) - (job.pausedMs ?? 0) - (job.pausedAt ? Date.now() - +new Date(job.pausedAt) : 0))
    : 0;

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="card-elev p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs text-muted-foreground">{new Date(job.scheduledFor).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}</div>
            <h1 className="text-lg font-semibold leading-tight">{c?.name}</h1>
            <div className="mt-1 text-sm text-foreground/90">{job.complaint}</div>
          </div>
          <Badge>{job.status}</Badge>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
          <div className="inline-flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /> {p?.address}</div>
          {p?.accessNotes && <div className="rounded-md bg-muted px-2 py-1 text-xs">Access: {p.accessNotes}</div>}
          <div className="flex gap-2">
            <a href={`tel:${c?.phone}`} className="flex-1"><Button variant="outline" className="touch-target h-11 w-full"><Phone className="mr-1 h-4 w-4" /> Call</Button></a>
            <a href={`https://maps.google.com/?q=${encodeURIComponent(p?.address ?? "")}`} target="_blank" rel="noreferrer" className="flex-1"><Button variant="outline" className="touch-target h-11 w-full"><Navigation className="mr-1 h-4 w-4" /> Directions</Button></a>
          </div>
        </div>
      </div>

      <section className="card-elev p-4">
        <div className="text-sm font-semibold">Workflow</div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
          <div><div className="font-medium text-foreground">Travel</div>{fmtClock(job.travelStartedAt)}</div>
          <div><div className="font-medium text-foreground">Arrived</div>{fmtClock(job.arrivedAt)}</div>
          <div><div className="font-medium text-foreground">Completed</div>{fmtClock(job.completedAt)}</div>
        </div>
        {job.arrivedAt && (
          <div className="mt-2 inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs"><Clock className="h-3 w-3" /> Labor: {fmtDur(laborMs)}{job.pausedAt && " · paused"}</div>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {!job.travelStartedAt && <Button onClick={onStartTravel} className="touch-target h-12 col-span-2"><Navigation className="mr-1 h-4 w-4" /> Start travel</Button>}
          {job.travelStartedAt && !job.arrivedAt && <Button onClick={onArrive} className="touch-target h-12 col-span-2 bg-accent text-accent-foreground hover:bg-accent/90"><MapPin className="mr-1 h-4 w-4" /> Arrive on site</Button>}
          {job.arrivedAt && !job.completedAt && (
            <>
              <Button onClick={onPause} variant="outline" className="touch-target h-12">{job.pausedAt ? <><Play className="mr-1 h-4 w-4" /> Resume</> : <><Pause className="mr-1 h-4 w-4" /> Pause</>}</Button>
              <Button onClick={onComplete} variant="outline" className="touch-target h-12"><CheckCircle2 className="mr-1 h-4 w-4" /> Complete</Button>
            </>
          )}
        </div>
      </section>

      <section className="card-elev p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold">Equipment</div>
          {!eq && <Link to="/app/scan"><Button size="sm" variant="outline" className="touch-target"><Camera className="mr-1 h-4 w-4" /> Scan</Button></Link>}
        </div>
        {eq ? (
          <Link to={`/app/equipment/${eq.id}`} className="block rounded-lg border p-3 hover:bg-muted/30">
            <div className="text-sm font-semibold">{eq.manufacturer} {eq.model}</div>
            <div className="text-xs text-muted-foreground">Serial {eq.serial} · {eq.type}</div>
            <div className="mt-1 inline-flex items-center gap-1 text-xs text-primary"><Wrench className="h-3 w-3" /> View specs & manuals</div>
          </Link>
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No equipment attached yet. Use Scan to add the data plate.</div>
        )}
      </section>

      {history.length > 0 && (
        <section className="card-elev p-4">
          <div className="mb-2 inline-flex items-center gap-1 text-sm font-semibold"><History className="h-4 w-4" /> Service history</div>
          <div className="space-y-1 text-xs text-muted-foreground">
            {history.map((h) => (
              <div key={h.id}>· {new Date(h.scheduledFor).toLocaleDateString()} — {h.complaint}</div>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <Button onClick={onStartDiag} className="touch-target h-14 w-full justify-between text-base" disabled={!job.arrivedAt && job.status !== "Diagnosing"}>
          <span className="inline-flex items-center gap-2"><Bot className="h-5 w-5" /> {diag?.results?.length ? "Resume diagnostic" : "Start guided diagnostic"}</span>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <Link to={`/app/jobs/${job.id}/approval`}>
          <Button variant="outline" className="touch-target h-12 w-full justify-between"><span className="inline-flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Customer approval</span><ArrowRight className="h-5 w-5" /></Button>
        </Link>
        <Link to={`/app/jobs/${job.id}/report`}>
          <Button variant="outline" className="touch-target h-12 w-full justify-between"><span className="inline-flex items-center gap-2"><FileText className="h-5 w-5" /> {hasReport ? "View" : "Generate"} service report</span><ArrowRight className="h-5 w-5" /></Button>
        </Link>
      </section>

      <Button variant="ghost" className="touch-target text-destructive" onClick={() => { setJobStatus(job.id, "Follow-Up"); toast("Escalated as follow-up"); nav("/app/today"); }}>
        <ShieldAlert className="mr-1 h-4 w-4" /> Stop & escalate this job
      </Button>
    </div>
  );
}

