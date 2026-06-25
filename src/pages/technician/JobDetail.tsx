import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { jobActivePause, jobPausedMs, useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Bot, Camera, ClipboardList, FileText, MapPin, Phone, ShieldAlert, Wrench, Navigation, CheckCircle2, Pause, Play, Clock, History, PackageSearch, AlertTriangle, Locate } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { JobStage, PauseReason } from "@/lib/types";

function fmtClock(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function fmtDur(ms: number) {
  const m = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m` : `${m}m`;
}

// Haversine -> feet
function distanceFt(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  const meters = 2 * R * Math.asin(Math.sqrt(s));
  return meters * 3.28084;
}

type LocStatus = "idle" | "asking" | "denied" | "unavailable" | "en-route" | "near" | "arrived";

export default function JobDetail() {
  const { id = "" } = useParams();
  const { state, setState, setJobStatus, startPause, endPause, setArrival, setArrivalDetected, updateJob } = useStore();
  const nav = useNavigate();
  const job = state.jobs.find((j) => j.id === id);

  const [pauseOpen, setPauseOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState<PauseReason>("Waiting for customer");
  const [pauseStage, setPauseStage] = useState<JobStage>("Diagnosis");
  const [pauseNotes, setPauseNotes] = useState("");

  const [confirmArrival, setConfirmArrival] = useState<{ distFt: number } | null>(null);
  const [locStatus, setLocStatus] = useState<LocStatus>("idle");
  const [locDist, setLocDist] = useState<number | null>(null);

  const p = job ? state.properties.find((x) => x.id === job.propertyId) : undefined;
  const hasCoords = !!(p?.lat && p?.lng);
  const radius = p?.geofenceRadiusFt ?? 200;

  // Geofence watcher: only active while En Route, not yet arrived
  useEffect(() => {
    if (!job || !hasCoords || job.arrivedAt || job.status !== "En Route") return;
    if (typeof navigator === "undefined" || !navigator.geolocation) { setLocStatus("unavailable"); return; }
    setLocStatus("asking");
    let triggered = false;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const d = distanceFt({ lat: pos.coords.latitude, lng: pos.coords.longitude }, { lat: p!.lat!, lng: p!.lng! });
        setLocDist(d);
        if (d <= radius) {
          setLocStatus("arrived");
          if (!triggered) {
            triggered = true;
            setArrivalDetected(job.id, new Date().toISOString());
            setConfirmArrival({ distFt: d });
          }
        } else if (d <= radius * 3) setLocStatus("near");
        else setLocStatus("en-route");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setLocStatus("denied");
        else setLocStatus("unavailable");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [job?.id, job?.status, job?.arrivedAt, hasCoords, p, radius, setArrivalDetected]);

  if (!job) return <div className="p-6">Job not found. <Link className="underline" to="/app/jobs">Back</Link></div>;

  const c = state.customers.find((x) => x.id === job.customerId);
  const eq = state.equipment.find((x) => x.id === job.equipmentId);
  const diag = state.diag[job.id];
  const hasReport = diag?.completed;
  const history = state.jobs
    .filter((j) => j.customerId === job.customerId && j.id !== job.id && j.status === "Completed")
    .slice(0, 3);

  const activePause = jobActivePause(job);
  const isPaused = !!activePause || !!job.pausedAt;
  const linkedRequests = state.partRequests.filter((pr) => pr.jobId === job.id);

  const onStartTravel = () => { updateJob(job.id, { travelStartedAt: new Date().toISOString() }); setJobStatus(job.id, "En Route"); toast.success("Travel started"); };
  const onArriveManual = () => { setArrival(job.id, "manual"); toast.success("Arrival recorded (manual)"); };
  const onArriveConfirm = () => { setArrival(job.id, "tech-confirmed"); setConfirmArrival(null); toast.success("Arrival confirmed"); };
  const onArriveGps = () => { setArrival(job.id, "gps-detected"); setConfirmArrival(null); toast.success("Arrival auto-detected"); };
  const onStartDiag = () => { updateJob(job.id, { diagnosisStartedAt: job.diagnosisStartedAt ?? new Date().toISOString() }); setJobStatus(job.id, "Diagnosing"); nav(`/app/jobs/${job.id}/diagnose`); };
  const openPause = () => {
    setPauseStage(job.status === "En Route" ? "Travel" : job.status === "Diagnosing" ? "Diagnosis" : "On Site");
    setPauseOpen(true);
  };
  const confirmPause = () => {
    startPause(job.id, pauseReason, pauseStage, pauseNotes.trim() || undefined);
    setPauseOpen(false); setPauseNotes(""); toast("Paused");
  };
  const onResume = () => { endPause(job.id); toast.success("Resumed"); };
  const onComplete = () => {
    if (isPaused) { toast.error("Resume the job before completing."); return; }
    updateJob(job.id, { completedAt: new Date().toISOString() }); setJobStatus(job.id, "Completed"); toast.success("Job completed");
  };
  const onWaitingForParts = () => { setJobStatus(job.id, "Waiting for Parts"); toast("Moved to Waiting for Parts"); };

  const totalPaused = jobPausedMs(job);
  const laborMs = job.arrivedAt
    ? ((job.completedAt ? +new Date(job.completedAt) : Date.now()) - +new Date(job.arrivedAt) - totalPaused)
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

      {/* Active pause banner */}
      {isPaused && (
        <div className="rounded-md border border-warning bg-warning/10 p-3 text-xs">
          <div className="inline-flex items-center gap-1 font-semibold"><Pause className="h-4 w-4" /> Paused — {activePause?.reason ?? "manual"}</div>
          {activePause?.notes && <div className="mt-1 text-muted-foreground">{activePause.notes}</div>}
          <Button size="sm" className="mt-2 h-8" onClick={onResume}><Play className="mr-1 h-3 w-3" /> Resume work</Button>
        </div>
      )}

      <section className="card-elev p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Workflow</div>
          {job.status === "En Route" && !job.arrivedAt && (
            <LocationStatusPill status={locStatus} dist={locDist} radius={radius} />
          )}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
          <div><div className="font-medium text-foreground">Travel</div>{fmtClock(job.travelStartedAt)}</div>
          <div><div className="font-medium text-foreground">Arrived</div>{fmtClock(job.arrivedAt)}{job.arrivalMethod && <div className="text-[10px]">({job.arrivalMethod})</div>}</div>
          <div><div className="font-medium text-foreground">Completed</div>{fmtClock(job.completedAt)}</div>
        </div>
        {job.arrivedAt && (
          <div className="mt-2 inline-flex flex-wrap items-center gap-1 text-xs">
            <span className="stat-pill bg-secondary text-secondary-foreground"><Clock className="h-3 w-3" /> Active labor: {fmtDur(laborMs)}</span>
            {totalPaused > 0 && <span className="stat-pill bg-muted text-muted-foreground">Paused: {fmtDur(totalPaused)}</span>}
            {(job.pauses?.length ?? 0) > 0 && <span className="stat-pill bg-muted text-muted-foreground">{job.pauses!.length} pause(s)</span>}
          </div>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {!job.travelStartedAt && <Button onClick={onStartTravel} className="touch-target h-12 col-span-2"><Navigation className="mr-1 h-4 w-4" /> Start travel</Button>}
          {job.travelStartedAt && !job.arrivedAt && (
            <Button onClick={onArriveManual} className="touch-target h-12 col-span-2 bg-accent text-accent-foreground hover:bg-accent/90"><MapPin className="mr-1 h-4 w-4" /> Arrive on site (manual)</Button>
          )}
          {job.arrivedAt && !job.completedAt && (
            <>
              {isPaused
                ? <Button onClick={onResume} variant="outline" className="touch-target h-12"><Play className="mr-1 h-4 w-4" /> Resume</Button>
                : <Button onClick={openPause} variant="outline" className="touch-target h-12"><Pause className="mr-1 h-4 w-4" /> Pause…</Button>}
              <Button onClick={onComplete} variant="outline" className="touch-target h-12" disabled={isPaused}><CheckCircle2 className="mr-1 h-4 w-4" /> Complete</Button>
            </>
          )}
        </div>
        {locStatus === "denied" && (
          <div className="mt-2 rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">Location permission denied. Use manual arrival. Privacy: we only use your location while en route to this job.</div>
        )}
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

      <section className="card-elev p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="inline-flex items-center gap-1 text-sm font-semibold"><PackageSearch className="h-4 w-4" /> Parts requests</div>
          <Link to={`/app/jobs/${job.id}/parts-request`}><Button size="sm" variant="outline" className="touch-target">+ Part needed</Button></Link>
        </div>
        {linkedRequests.length === 0 ? (
          <div className="text-xs text-muted-foreground">No parts requested. Tap "+ Part needed" if a required part isn't on the truck.</div>
        ) : (
          <ul className="space-y-1 text-xs">
            {linkedRequests.map((pr) => (
              <li key={pr.id} className="flex items-center justify-between rounded-md border p-2">
                <div>
                  <div className="font-medium">{pr.name} <span className="text-muted-foreground">×{pr.qty}</span></div>
                  <div className="text-[10px] text-muted-foreground">{pr.compatibility === "Verified by qualified user" ? "Compatibility verified" : pr.compatibility === "Likely" ? "Compatibility likely — confirm" : "Compatibility unknown"}</div>
                </div>
                <Badge variant="outline">{pr.status}</Badge>
              </li>
            ))}
            {job.status !== "Waiting for Parts" && job.status !== "Completed" && (
              <Button size="sm" variant="outline" className="mt-1 w-full" onClick={onWaitingForParts}>Move job to Waiting for Parts</Button>
            )}
          </ul>
        )}
      </section>

      {history.length > 0 && (
        <section className="card-elev p-4">
          <div className="mb-2 inline-flex items-center gap-1 text-sm font-semibold"><History className="h-4 w-4" /> Service history</div>
          <div className="space-y-1 text-xs text-muted-foreground">
            {history.map((h) => (<div key={h.id}>· {new Date(h.scheduledFor).toLocaleDateString()} — {h.complaint}</div>))}
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

      {(job.pauses?.length ?? 0) > 0 && (
        <section className="card-elev p-4 text-xs">
          <div className="mb-1 font-semibold">Pause timeline</div>
          {job.pauses!.map((p) => (
            <div key={p.id} className="flex justify-between border-b py-1 last:border-0">
              <div>
                <div className="font-medium">{p.reason} <span className="text-muted-foreground">· {p.stage}</span></div>
                {p.notes && <div className="text-muted-foreground">{p.notes}</div>}
                <div className="text-[10px] text-muted-foreground">{fmtClock(p.startedAt)} → {fmtClock(p.endedAt)}</div>
              </div>
              <div className="text-right">
                <div>{fmtDur((p.endedAt ? +new Date(p.endedAt) : Date.now()) - +new Date(p.startedAt))}</div>
                <div className="text-[10px] text-muted-foreground">{p.billable ? "Billable" : "Non-billable"}</div>
              </div>
            </div>
          ))}
        </section>
      )}

      <Button variant="ghost" className="touch-target text-destructive" onClick={() => { setJobStatus(job.id, "Follow-Up"); toast("Escalated as follow-up"); nav("/app/today"); }}>
        <ShieldAlert className="mr-1 h-4 w-4" /> Stop & escalate this job
      </Button>

      {/* Pause dialog */}
      <Dialog open={pauseOpen} onOpenChange={setPauseOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pause job</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Reason</label>
              <Select value={pauseReason} onValueChange={(v) => setPauseReason(v as PauseReason)}>
                <SelectTrigger className="touch-target"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["Lunch / break","Waiting for customer","Waiting for approval","Waiting for parts","Calling senior technician","Researching documentation","Equipment inaccessible","Weather","Other"] as PauseReason[]).map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium">Stage</label>
              <Select value={pauseStage} onValueChange={(v) => setPauseStage(v as JobStage)}>
                <SelectTrigger className="touch-target"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["Travel","On Site","Diagnosis","Repair","Documentation"] as JobStage[]).map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium">Note (optional)</label>
              <Textarea value={pauseNotes} onChange={(e) => setPauseNotes(e.target.value)} placeholder="e.g. Customer left to pick up child from school" />
            </div>
            <div className="rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground"><AlertTriangle className="mr-1 inline h-3 w-3" /> Lunch/break is non-billable by default. Owners can change pause-billing policy.</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPauseOpen(false)}>Cancel</Button>
            <Button onClick={confirmPause}>Start pause</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Arrival auto-confirm */}
      <Dialog open={!!confirmArrival} onOpenChange={(o) => !o && setConfirmArrival(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Arrived at property?</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <p>You're within ~{Math.round(confirmArrival?.distFt ?? 0)} ft of <strong>{p?.address}</strong>. Confirm arrival to start on-site time.</p>
            <div className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">Detection method will be recorded for the audit log.</div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmArrival(null)}>Not yet</Button>
            <Button variant="outline" onClick={onArriveGps}>It's correct — GPS</Button>
            <Button onClick={onArriveConfirm}>Confirm arrival</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LocationStatusPill({ status, dist, radius }: { status: LocStatus; dist: number | null; radius: number }) {
  const map: Record<LocStatus, { text: string; cls: string }> = {
    idle: { text: "Location idle", cls: "bg-muted text-muted-foreground" },
    asking: { text: "Getting location…", cls: "bg-muted text-muted-foreground" },
    denied: { text: "Location denied", cls: "bg-destructive/10 text-destructive" },
    unavailable: { text: "Location unavailable", cls: "bg-muted text-muted-foreground" },
    "en-route": { text: `En route${dist ? ` · ${Math.round(dist)} ft` : ""}`, cls: "bg-secondary text-secondary-foreground" },
    near: { text: `Near (${Math.round(dist ?? 0)} ft)`, cls: "bg-warning/20 text-warning-foreground" },
    arrived: { text: `Arrived (~${Math.round(dist ?? 0)} ft of ${radius} ft)`, cls: "bg-success/15 text-success" },
  };
  const v = map[status];
  return <span className={"stat-pill " + v.cls}><Locate className="h-3 w-3" /> {v.text}</span>;
}
