import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { jobActivePause, jobPausedMs, useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Bot, Camera, ClipboardList, FileText, MapPin, Phone, ShieldAlert, Wrench, Navigation, CheckCircle2, Pause, Play, Clock, History, PackageSearch, AlertTriangle, Locate } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { JobStage, PauseReason } from "@/lib/types";
import { useStatusLabel } from "@/i18n/status";
import { useDynamicText } from "@/i18n/dynamic";
import { watchFieldPosition } from "@/lib/native";
import { documentationQualityLabel, documentationStatusLabel, documentationSummaryForEquipment } from "@/lib/hvacTop50";

function fmtClock(iso?: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function fmtDur(ms: number) {
  const m = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m` : `${m}m`;
}

function confidenceClass(confidence?: string) {
  if (confidence === "high") return "border-success/40 text-success";
  if (confidence === "medium") return "border-info/40 text-info";
  return "border-warning/50 text-warning";
}

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

const PAUSE_REASONS: PauseReason[] = ["Lunch / break", "Waiting for customer", "Waiting for approval", "Waiting for parts", "Calling senior technician", "Researching documentation", "Equipment inaccessible", "Weather", "Other"];
const STAGES: JobStage[] = ["Travel", "On Site", "Diagnosis", "Repair", "Documentation"];

export default function JobDetail() {
  const { id = "" } = useParams();
  const { state, setJobStatus, startPause, endPause, setArrival, setArrivalDetected, updateJob } = useStore();
  const { t } = useTranslation();
  const statusLabel = useStatusLabel();
  const tx = useDynamicText();
  const nav = useNavigate();
  const job = state.jobs.find((j) => j.id === id);

  const [pauseOpen, setPauseOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState<PauseReason>("Waiting for customer");
  const [pauseStage, setPauseStage] = useState<JobStage>("Diagnosis");
  const [pauseNotes, setPauseNotes] = useState("");

  const [confirmArrival, setConfirmArrival] = useState<{ distFt: number } | null>(null);
  const [locStatus, setLocStatus] = useState<LocStatus>("idle");
  const [locDist, setLocDist] = useState<number | null>(null);

  const property = job ? state.properties.find((x) => x.id === job.propertyId) : undefined;
  const jobId = job?.id;
  const jobStatus = job?.status;
  const jobArrivedAt = job?.arrivedAt;
  const hasCoords = !!(property?.lat && property?.lng);
  const radius = property?.geofenceRadiusFt ?? 200;
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(property?.address ?? "")}`;

  useEffect(() => {
    if (!jobId || !hasCoords || jobArrivedAt || jobStatus !== "En Route") return;
    setLocStatus("asking");
    let triggered = false;
    const stopWatching = watchFieldPosition(
      (pos) => {
        const d = distanceFt({ lat: pos.coords.latitude, lng: pos.coords.longitude }, { lat: property!.lat!, lng: property!.lng! });
        setLocDist(d);
        if (d <= radius) {
          setLocStatus("arrived");
          if (!triggered) {
            triggered = true;
            setArrivalDetected(jobId, new Date().toISOString());
            setConfirmArrival({ distFt: d });
          }
        } else if (d <= radius * 3) {
          setLocStatus("near");
        } else {
          setLocStatus("en-route");
        }
      },
      (err) => {
        const denied = err.code === 1 || err.code === "PERMISSION_DENIED" || /denied/i.test(err.message ?? "");
        if (denied) setLocStatus("denied");
        else setLocStatus("unavailable");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return stopWatching;
  }, [jobArrivedAt, jobId, jobStatus, hasCoords, property, radius, setArrivalDetected]);

  if (!job) return <div className="p-6">{t("common.jobNotFound")} <Link className="underline" to="/app/jobs">{t("common.back")}</Link></div>;

  const customer = state.customers.find((x) => x.id === job.customerId);
  const equipment = state.equipment.find((x) => x.id === job.equipmentId);
  const equipmentDocs = equipment ? documentationSummaryForEquipment(equipment) : undefined;
  const bestEquipmentDoc = equipmentDocs?.best;
  const diag = state.diag[job.id];
  const hasReport = diag?.completed;
  const history = state.jobs
    .filter((candidate) => candidate.customerId === job.customerId && candidate.id !== job.id && candidate.status === "Completed")
    .slice(0, 3);

  const activePause = jobActivePause(job);
  const isPaused = !!activePause || !!job.pausedAt;
  const linkedRequests = state.partRequests.filter((pr) => pr.jobId === job.id);
  const completedDiagSteps = diag?.results.filter((result) => !["skipped", "n/a"].includes(result.answer ?? "")).length ?? 0;
  const reviewRequiredSteps = diag?.invalidatedStepIds?.length ?? 0;

  const onStartTravel = () => {
    updateJob(job.id, { travelStartedAt: new Date().toISOString() });
    setJobStatus(job.id, "En Route");
    toast.success(t("jobDetail.toast.travelStarted"));
    if (property?.address) {
      window.open(mapsUrl, "_blank", "noopener,noreferrer");
    }
  };

  const onArriveManual = () => {
    setArrival(job.id, "manual");
    toast.success(t("jobDetail.toast.arrivalManual"));
  };

  const onArriveConfirm = () => {
    setArrival(job.id, "tech-confirmed");
    setConfirmArrival(null);
    toast.success(t("jobDetail.toast.arrivalConfirmed"));
  };

  const onArriveGps = () => {
    setArrival(job.id, "gps-detected");
    setConfirmArrival(null);
    toast.success(t("jobDetail.toast.arrivalGps"));
  };

  const onStartDiag = () => {
    updateJob(job.id, { diagnosisStartedAt: job.diagnosisStartedAt ?? new Date().toISOString() });
    setJobStatus(job.id, "Diagnosing");
    nav(`/app/jobs/${job.id}/diagnose`);
  };

  const openPause = () => {
    setPauseStage(job.status === "En Route" ? "Travel" : job.status === "Diagnosing" ? "Diagnosis" : "On Site");
    setPauseOpen(true);
  };

  const confirmPause = () => {
    startPause(job.id, pauseReason, pauseStage, pauseNotes.trim() || undefined);
    setPauseOpen(false);
    setPauseNotes("");
    toast(t("jobDetail.toast.paused"));
  };

  const onResume = () => {
    endPause(job.id);
    toast.success(t("jobDetail.toast.resumed"));
  };

  const onComplete = () => {
    if (isPaused) {
      toast.error(t("jobDetail.toast.resumeBeforeComplete"));
      return;
    }
    updateJob(job.id, { completedAt: new Date().toISOString() });
    setJobStatus(job.id, "Completed");
    toast.success(t("jobDetail.toast.completed"));
  };

  const onWaitingForParts = () => {
    setJobStatus(job.id, "Waiting for Parts");
    toast(t("jobDetail.toast.movedWaitingParts"));
  };

  const onEscalateFollowUp = () => {
    updateJob(job.id, {
      notes: [job.notes, `Follow-up requested ${new Date().toLocaleString()}.`].filter(Boolean).join("\n"),
    });
    setJobStatus(job.id, "Follow-Up");
    toast.success("Job moved to follow-up.");
    nav(`/app/jobs/${job.id}`);
  };

  const totalPaused = jobPausedMs(job);
  const laborMs = job.arrivedAt
    ? ((job.completedAt ? +new Date(job.completedAt) : Date.now()) - +new Date(job.arrivedAt) - totalPaused)
    : 0;

  const compatLabel = (compat: string) =>
    compat === "Verified by qualified user" ? t("jobDetail.compatibilityVerified")
      : compat === "Likely" ? t("jobDetail.compatibilityLikely")
        : t("jobDetail.compatibilityUnknown");

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="card-elev p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs text-muted-foreground">{new Date(job.scheduledFor).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}</div>
            <h1 className="text-lg font-semibold leading-tight">{customer?.name}</h1>
            <div className="mt-1 text-sm text-foreground/90">{tx(job.complaint)}</div>
          </div>
          <Badge>{statusLabel(job.status)}</Badge>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
          <div className="inline-flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /> {property?.address}</div>
          {(property?.gateCode || property?.accessNotes || property?.parkingNotes) ? (
            <div className="rounded-xl border bg-muted/20 p-3 text-xs">
              <div className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">{t("jobDetail.accessHeading")}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {property?.gateCode ? (
                  <div className="min-w-[120px] rounded-lg bg-background px-3 py-2">
                    <div className="text-[10px] uppercase tracking-normal text-muted-foreground">{t("jobDetail.gateCode")}</div>
                    <div className="mt-1 font-mono text-sm font-semibold tracking-[0.2em] text-foreground">{property.gateCode}</div>
                  </div>
                ) : null}
                {property?.parkingNotes ? (
                  <div className="min-w-[140px] rounded-lg bg-background px-3 py-2">
                    <div className="text-[10px] uppercase tracking-normal text-muted-foreground">{t("jobDetail.parkingNotes")}</div>
                    <div className="mt-1 leading-relaxed text-foreground">{property.parkingNotes}</div>
                  </div>
                ) : null}
              </div>
              {property?.accessNotes ? (
                <div className="mt-2 rounded-lg bg-background px-3 py-2 leading-relaxed text-foreground">
                  <span className="font-medium">{t("jobDetail.accessNotes")}:</span> {tx(property.accessNotes)}
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="flex gap-2">
            <a href={`tel:${customer?.phone}`} className="flex-1"><Button variant="outline" className="touch-target h-11 w-full"><Phone className="mr-1 h-4 w-4" /> {t("jobDetail.call")}</Button></a>
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="flex-1"><Button variant="outline" className="touch-target h-11 w-full"><Navigation className="mr-1 h-4 w-4" /> {t("jobDetail.directions")}</Button></a>
          </div>
        </div>
      </div>

      {isPaused ? (
        <div className="rounded-md border border-warning bg-warning/10 p-3 text-xs">
          <div className="inline-flex items-center gap-1 font-semibold"><Pause className="h-4 w-4" /> {t("jobDetail.pausedBanner", { reason: activePause?.reason ? t(`jobDetail.pauseReason.${activePause.reason}`) : t("jobDetail.pauseReason.Other") })}</div>
          {activePause?.notes ? <div className="mt-1 text-muted-foreground">{activePause.notes}</div> : null}
          <Button size="sm" className="mt-2 h-8" onClick={onResume}><Play className="mr-1 h-3 w-3" /> {t("jobDetail.resumeWork")}</Button>
        </div>
      ) : null}

      <section className="card-elev p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">{t("jobDetail.workflow")}</div>
          {job.status === "En Route" && !job.arrivedAt ? (
            <LocationStatusPill status={locStatus} dist={locDist} radius={radius} />
          ) : null}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
          <div><div className="font-medium text-foreground">{t("jobDetail.travel")}</div>{fmtClock(job.travelStartedAt)}</div>
          <div><div className="font-medium text-foreground">{t("jobDetail.arrived")}</div>{fmtClock(job.arrivedAt)}{job.arrivalMethod ? <div className="text-[10px]">({job.arrivalMethod})</div> : null}</div>
          <div><div className="font-medium text-foreground">{t("jobDetail.completed")}</div>{fmtClock(job.completedAt)}</div>
        </div>
        {job.arrivedAt ? (
          <div className="mt-2 inline-flex flex-wrap items-center gap-1 text-xs">
            <span className="stat-pill bg-secondary text-secondary-foreground"><Clock className="h-3 w-3" /> {t("jobDetail.activeLaborLabel", { value: fmtDur(laborMs) })}</span>
            {totalPaused > 0 ? <span className="stat-pill bg-muted text-muted-foreground">{t("jobDetail.pausedLabel", { value: fmtDur(totalPaused) })}</span> : null}
            {(job.pauses?.length ?? 0) > 0 ? <span className="stat-pill bg-muted text-muted-foreground">{t("jobDetail.pauses", { count: job.pauses!.length })}</span> : null}
          </div>
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {!job.travelStartedAt ? (
            <Button onClick={onStartTravel} className="touch-target col-span-2 min-h-12 h-auto justify-start gap-2 px-4 py-3 text-left">
              <Navigation className="h-4 w-4 shrink-0" />
              <span className="flex min-w-0 flex-col">
                <span>{t("jobDetail.startTravel")}</span>
                <span className="text-[11px] font-normal opacity-80">{t("jobDetail.startTravelHint")}</span>
              </span>
            </Button>
          ) : null}
          {job.travelStartedAt && !job.arrivedAt ? (
            <Button onClick={onArriveManual} className="touch-target col-span-2 h-12 bg-accent text-accent-foreground hover:bg-accent/90"><MapPin className="mr-1 h-4 w-4" /> {t("jobDetail.arriveManual")}</Button>
          ) : null}
          {job.arrivedAt && !job.completedAt ? (
            <>
              {isPaused
                ? <Button onClick={onResume} variant="outline" className="touch-target h-12"><Play className="mr-1 h-4 w-4" /> {t("jobDetail.resume")}</Button>
                : <Button onClick={openPause} variant="outline" className="touch-target h-12"><Pause className="mr-1 h-4 w-4" /> {t("jobDetail.pause")}</Button>}
              <Button onClick={onComplete} variant="outline" className="touch-target h-12" disabled={isPaused}><CheckCircle2 className="mr-1 h-4 w-4" /> {t("jobDetail.complete")}</Button>
            </>
          ) : null}
        </div>
        {locStatus === "denied" ? (
          <div className="mt-2 rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">{t("jobDetail.locationDeniedHelp")}</div>
        ) : null}
      </section>

      <section className="card-elev p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold">{t("jobs.equipment")}</div>
          {!equipment ? <Link to="/app/scan"><Button size="sm" variant="outline" className="touch-target"><Camera className="mr-1 h-4 w-4" /> {t("jobDetail.scan")}</Button></Link> : null}
        </div>
        {equipment ? (
          <Link to={`/app/equipment/${equipment.id}`} className="block rounded-lg border p-3 hover:bg-muted/30">
            <div className="text-sm font-semibold">{equipment.manufacturer} {equipment.model}</div>
            <div className="text-xs text-muted-foreground">Serial {equipment.serial} - {equipment.type}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {equipmentDocs?.linkedDocumentCount ? <Badge variant="outline"><FileText className="mr-1 h-3 w-3" /> {equipmentDocs.linkedDocumentCount} docs linked</Badge> : null}
              {bestEquipmentDoc ? <Badge variant="outline" className={confidenceClass(bestEquipmentDoc.confidence)}>{documentationStatusLabel(bestEquipmentDoc)}</Badge> : null}
              {bestEquipmentDoc ? <Badge variant="secondary">{documentationQualityLabel(bestEquipmentDoc)}</Badge> : null}
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              {bestEquipmentDoc
                ? `${bestEquipmentDoc.documentTitle}. Verify the exact installed model before using literature values.`
                : "No official manufacturer source is linked yet for this equipment record."}
            </div>
            <div className="mt-2 inline-flex items-center gap-1 text-xs text-primary"><Wrench className="h-3 w-3" /> View specs and documentation</div>
          </Link>
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{t("jobDetail.noEquipment")}</div>
        )}
      </section>

      <section className="card-elev p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="inline-flex items-center gap-1 text-sm font-semibold"><PackageSearch className="h-4 w-4" /> {t("jobDetail.partsRequests")}</div>
          <Link to={`/app/jobs/${job.id}/parts-request`}><Button size="sm" variant="outline" className="touch-target">{t("jobDetail.addPart")}</Button></Link>
        </div>
        {linkedRequests.length === 0 ? (
          <div className="text-xs text-muted-foreground">{t("jobDetail.noPartsRequested")}</div>
        ) : (
          <ul className="space-y-1 text-xs">
            {linkedRequests.map((request) => (
              <li key={request.id} className="rounded-md border p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{request.name} <span className="text-muted-foreground">x{request.qty}</span></div>
                  <Badge variant="outline">{request.status}</Badge>
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">{compatLabel(request.compatibility)}</div>
                {request.notes ? <div className="mt-1 text-[10px] text-muted-foreground line-clamp-2">{request.notes}</div> : null}
              </li>
            ))}
            {job.status !== "Waiting for Parts" && job.status !== "Completed" ? (
              <Button size="sm" variant="outline" className="mt-1 w-full" onClick={onWaitingForParts}>{t("jobDetail.moveToWaitingForParts")}</Button>
            ) : null}
          </ul>
        )}
      </section>

      {history.length > 0 ? (
        <section className="card-elev p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1 text-sm font-semibold"><History className="h-4 w-4" /> {t("jobDetail.serviceHistory")}</div>
            {equipment ? <Link to={`/app/equipment/${equipment.id}#history`} className="text-xs font-medium text-primary">Open equipment history</Link> : null}
          </div>
          <div className="space-y-2">
            {history.map((previousJob) => (
              <Link key={previousJob.id} to={`/app/jobs/${previousJob.id}`} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">{new Date(previousJob.scheduledFor).toLocaleDateString()}</div>
                  <div className="truncate text-sm font-medium">{tx(previousJob.complaint)}</div>
                </div>
                <Badge variant="outline" className="shrink-0">{statusLabel(previousJob.status)}</Badge>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <Button onClick={onStartDiag} className="touch-target h-14 w-full justify-between text-base" disabled={!job.arrivedAt && job.status !== "Diagnosing"}>
          <span className="inline-flex items-center gap-2">
            <Bot className="h-5 w-5" />
            {diag?.completed ? t("jobDetail.reviewDiagnostic")
              : diag?.results?.length ? t("jobDetail.continueDiagnosis", { step: diag.currentStepId })
                : t("jobDetail.startGuidedDiagnostic")}
          </span>
          <ArrowRight className="h-5 w-5" />
        </Button>
        {diag?.results?.length ? (
          <div className="rounded-xl border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">Diagnostic progress</div>
                <div className="text-xs text-muted-foreground">
                  {completedDiagSteps} saved {completedDiagSteps === 1 ? "step" : "steps"}{reviewRequiredSteps > 0 ? ` - ${reviewRequiredSteps} need review` : ""}
                </div>
              </div>
              {diag?.hypothesis ? <span className="stat-pill bg-accent/15 text-accent-foreground">{diag.hypothesis}</span> : null}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Link to={`/app/jobs/${job.id}/diagnose?review=1`}>
                <Button variant="outline" className="touch-target h-10 w-full">Review saved steps</Button>
              </Link>
              <Link to={`/app/equipment/${job.equipmentId ?? ""}#specs`}>
                <Button variant="outline" className="touch-target h-10 w-full">{t("jobDetail.viewSpecifications")}</Button>
              </Link>
            </div>
          </div>
        ) : null}
        <Link to={`/app/jobs/${job.id}/approval`}>
          <Button variant="outline" className="touch-target h-12 w-full justify-between"><span className="inline-flex items-center gap-2"><ClipboardList className="h-5 w-5" /> {t("jobDetail.customerApproval")}</span><ArrowRight className="h-5 w-5" /></Button>
        </Link>
        <Link to={`/app/jobs/${job.id}/report`}>
          <Button variant="outline" className="touch-target h-12 w-full justify-between"><span className="inline-flex items-center gap-2"><FileText className="h-5 w-5" /> {hasReport ? t("jobDetail.viewServiceReport") : t("jobDetail.generateServiceReport")}</span><ArrowRight className="h-5 w-5" /></Button>
        </Link>
      </section>

      {(job.pauses?.length ?? 0) > 0 ? (
        <section className="card-elev p-4 text-xs">
          <div className="mb-1 font-semibold">{t("jobDetail.pauseTimeline")}</div>
          {job.pauses!.map((pause) => (
            <div key={pause.id} className="flex justify-between border-b py-1 last:border-0">
              <div>
                <div className="font-medium">{t(`jobDetail.pauseReason.${pause.reason}`)} <span className="text-muted-foreground">- {t(`jobDetail.stage.${pause.stage}`)}</span></div>
                {pause.notes ? <div className="text-muted-foreground">{pause.notes}</div> : null}
                <div className="text-[10px] text-muted-foreground">{fmtClock(pause.startedAt)} to {fmtClock(pause.endedAt)}</div>
              </div>
              <div className="text-right">
                <div>{fmtDur((pause.endedAt ? +new Date(pause.endedAt) : Date.now()) - +new Date(pause.startedAt))}</div>
                <div className="text-[10px] text-muted-foreground">{pause.billable ? t("jobDetail.billable") : t("jobDetail.nonBillable")}</div>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <section className="rounded-xl border border-warning/40 bg-warning/10 p-4">
        <div className="text-sm font-semibold">Need office follow-up?</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Use follow-up when this job needs a return visit, re-quote, senior review, or office coordination beyond the current stop.
        </div>
        {job.status === "Follow-Up" ? (
          <div className="mt-3 rounded-md bg-background/70 px-3 py-2 text-xs text-muted-foreground">
            This job is already in the follow-up queue and will stay visible to the office.
          </div>
        ) : (
          <Button variant="outline" className="mt-3 touch-target w-full text-destructive" onClick={onEscalateFollowUp}>
            <ShieldAlert className="mr-1 h-4 w-4" /> Move to follow-up
          </Button>
        )}
      </section>

      <Dialog open={pauseOpen} onOpenChange={setPauseOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("jobDetail.pauseDialog.title")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">{t("jobDetail.pauseDialog.reason")}</label>
              <Select value={pauseReason} onValueChange={(value) => setPauseReason(value as PauseReason)}>
                <SelectTrigger className="touch-target"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAUSE_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>{t(`jobDetail.pauseReason.${reason}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium">{t("jobDetail.pauseDialog.stage")}</label>
              <Select value={pauseStage} onValueChange={(value) => setPauseStage(value as JobStage)}>
                <SelectTrigger className="touch-target"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGES.map((stage) => (<SelectItem key={stage} value={stage}>{t(`jobDetail.stage.${stage}`)}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium">{t("jobDetail.pauseDialog.noteLabel")}</label>
              <Textarea value={pauseNotes} onChange={(event) => setPauseNotes(event.target.value)} placeholder={t("jobDetail.pauseDialog.notePlaceholder")} />
            </div>
            <div className="rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground"><AlertTriangle className="mr-1 inline h-3 w-3" /> {t("jobDetail.pauseDialog.billingNote")}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPauseOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={confirmPause}>{t("jobDetail.pauseDialog.start")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmArrival} onOpenChange={(open) => !open && setConfirmArrival(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("jobDetail.arrivalDialog.title")}</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <p>{t("jobDetail.arrivalDialog.body", { ft: Math.round(confirmArrival?.distFt ?? 0), address: property?.address ?? "" })}</p>
            <div className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{t("jobDetail.arrivalDialog.auditNote")}</div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmArrival(null)}>{t("jobDetail.arrivalDialog.notYet")}</Button>
            <Button variant="outline" onClick={onArriveGps}>{t("jobDetail.arrivalDialog.gpsCorrect")}</Button>
            <Button onClick={onArriveConfirm}>{t("jobDetail.arrivalDialog.confirmArrival")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LocationStatusPill({ status, dist, radius }: { status: LocStatus; dist: number | null; radius: number }) {
  const { t } = useTranslation();
  const map: Record<LocStatus, { text: string; cls: string }> = {
    idle: { text: t("jobDetail.loc.idle"), cls: "bg-muted text-muted-foreground" },
    asking: { text: t("jobDetail.loc.asking"), cls: "bg-muted text-muted-foreground" },
    denied: { text: t("jobDetail.loc.denied"), cls: "bg-destructive/10 text-destructive" },
    unavailable: { text: t("jobDetail.loc.unavailable"), cls: "bg-muted text-muted-foreground" },
    "en-route": { text: `${t("jobDetail.loc.enRoute")}${dist ? ` - ${Math.round(dist)} ft` : ""}`, cls: "bg-secondary text-secondary-foreground" },
    near: { text: `${t("jobDetail.loc.near")} (${Math.round(dist ?? 0)} ft)`, cls: "bg-warning/20 text-warning-foreground" },
    arrived: { text: `${t("jobDetail.loc.arrived")} (~${Math.round(dist ?? 0)} ft / ${radius} ft)`, cls: "bg-success/15 text-success" },
  };
  const value = map[status];
  return <span className={`stat-pill ${value.cls}`}><Locate className="h-3 w-3" /> {value.text}</span>;
}
