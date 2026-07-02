import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { findStep, NO_COOLING, type DiagStep } from "@/lib/diagTemplate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SourceBadge } from "@/components/SourceBadge";
import { VoiceInput } from "@/components/VoiceInput";
import { AlertTriangle, ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, FileText, ListChecks, MoreVertical, RefreshCw, ShieldAlert, Wrench } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const GROUPS = ["Capacity", "Compressor", "Fan", "Refrigeration", "Electrical", "Physical", "Certifications"] as const;

function nextStepPreview(nextStepId: string, branchLabel?: string) {
  const next = findStep(nextStepId);
  if (!next) return branchLabel ? `Routes into ${branchLabel}` : `Moves to ${nextStepId}`;
  return branchLabel
    ? `Routes into ${branchLabel} - ${next.id}. ${next.title}`
    : `Continues to ${next.id} - ${next.title}`;
}

export default function Diagnostics() {
  const { id = "" } = useParams();
  const { state, ensureDiag, saveStep, saveMeasurement, setHypothesis, completeDiag, setJobStatus, goToStep, clearInvalidation } = useStore();
  const { t } = useTranslation();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const reviewMode = searchParams.get("review") === "1";
  const job = state.jobs.find((j) => j.id === id);
  const persistedSession = state.diag[id];
  const live = persistedSession ?? {
    id: `ds-${id}`,
    jobId: id,
    templateId: "no-cooling-v1",
    currentStepId: "A",
    results: [],
    measurements: [],
    visitedStepIds: ["A"],
    invalidatedStepIds: [],
  };
  const currentId = live.currentStepId;
  const [ack, setAck] = useState(false);
  const [val, setVal] = useState("");
  const [confirmEdit, setConfirmEdit] = useState<string | null>(null);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [stepsSheetOpen, setStepsSheetOpen] = useState(false);
  const step = findStep(currentId);
  const equipment = state.equipment.find((e) => e.id === job?.equipmentId);
  const customer = state.customers.find((c) => c.id === job?.customerId);
  const property = state.properties.find((p) => p.id === job?.propertyId);

  useEffect(() => {
    if (!persistedSession) ensureDiag(id);
  }, [persistedSession, ensureDiag, id]);

  useEffect(() => {
    setAck(false);
    const prior = live.results.find((r) => r.stepId === currentId);
    setVal(prior?.answer && prior.answer !== "skipped" && prior.answer !== "n/a" ? prior.answer : "");
  }, [currentId, live.results]);

  useEffect(() => {
    setStepsSheetOpen(reviewMode);
  }, [reviewMode, id]);

  if (!job || !step) return <div className="p-6">{t("diagnostics.jobNotFound")}</div>;

  const visited = live.visitedStepIds ?? [];
  const visitedIdx = visited.indexOf(currentId);
  const prevId = visitedIdx > 0 ? visited[visitedIdx - 1] : undefined;
  const nextVisitedId = visitedIdx >= 0 && visitedIdx < visited.length - 1 ? visited[visitedIdx + 1] : undefined;
  const completed = live.results.filter((r) => !["skipped", "n/a"].includes(r.answer ?? "")).length;
  const reviewRequiredSteps = live.invalidatedStepIds?.length ?? 0;
  const progress = Math.min(100, Math.round((completed / 14) * 100));
  const isInvalidated = (live.invalidatedStepIds ?? []).includes(currentId);
  const stepLabel = step.type === "alt-end"
    ? t("diagnostics.stepLabel", { id: step.id, progress: t("diagnostics.altBranch") })
    : t("diagnostics.stepLabel", { id: step.id, progress: `${completed + 1}/14` });
  const latestResult = live.results.find((result) => result.stepId === currentId);

  const stepStatus = (sid: string): "complete" | "current" | "skipped" | "needs-review" | "pending" => {
    if (sid === currentId) return "current";
    if ((live.invalidatedStepIds ?? []).includes(sid)) return "needs-review";
    const result = live.results.find((entry) => entry.stepId === sid);
    if (!result) return "pending";
    if (result.answer === "skipped" || result.answer === "n/a") return "skipped";
    return "complete";
  };

  const tryAdvance = (next: string, payload?: Partial<{ answer: string; ack: boolean }>) => {
    const prior = live.results.find((r) => r.stepId === step.id);
    const isEdit = prior && payload?.answer !== undefined && (prior.answer ?? "") !== payload.answer;
    const downstream = visited.slice(visited.indexOf(step.id) + 1).filter((candidate) => candidate !== step.id);
    if (isEdit && downstream.length > 0) {
      setConfirmEdit(JSON.stringify({ next, payload }));
      return;
    }
    saveStep(job.id, { stepId: step.id, ts: new Date().toISOString(), ...payload }, next);
    if (step.id === "J") setHypothesis(job.id, "Installed dual-run capacitor compressor section out of label tolerance", "High");
    toast(t("diagnostics.savedToast"), { duration: 1100 });
  };

  const handleMeasurement = () => {
    if (!step.measurement) return;
    const num = parseFloat(val);
    const measurement = step.measurement;
    let withinRange: boolean | undefined;
    if (!Number.isNaN(num) && measurement.min !== undefined && measurement.max !== undefined) {
      withinRange = num >= measurement.min && num <= measurement.max;
    }
    saveMeasurement(job.id, {
      id: `${step.id}-${Date.now()}`,
      jobId: job.id,
      stepId: step.id,
      label: measurement.label,
      value: val,
      unit: measurement.unit,
      withinRange,
      rangeNote: measurement.minNote,
      source: measurement.source ?? { kind: "technician_observation", title: "Field-measured value" },
      ts: new Date().toISOString(),
    });
    tryAdvance(measurement.nextStepId, { answer: val });
  };

  const escalate = () => {
    setJobStatus(job.id, "Follow-Up");
    toast(t("diagnostics.escalatedToast"));
    nav(`/app/jobs/${job.id}`);
  };

  const onBack = () => {
    if (prevId) goToStep(job.id, prevId);
    else nav(`/app/jobs/${job.id}`);
  };

  const onNext = () => {
    if (nextVisitedId) goToStep(job.id, nextVisitedId);
  };

  const reviewNote = reviewMode && live.results.length > 0 ? (
    <div className="rounded-md border border-info/30 bg-info/10 p-3 text-xs">
      <div className="font-semibold">Review saved steps</div>
      <p className="mt-1">Jump through completed answers from the breakdown, compare specs, then return to the active step when you are ready to keep diagnosing.</p>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button size="sm" variant="outline" onClick={() => setStepsSheetOpen(true)}>Open steps breakdown</Button>
        <Button size="sm" onClick={() => nav(`/app/jobs/${job.id}/diagnose`)}>Resume active diagnosis</Button>
      </div>
    </div>
  ) : null;

  return (
    <div className="flex flex-col gap-4 p-4 pb-36">
      <div className="card-elev p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">{stepLabel}</span>
          <div className="flex items-center gap-2">
            <RiskBadge risk={step.risk} />
            <Sheet open={stepsSheetOpen} onOpenChange={setStepsSheetOpen}>
              <SheetTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 gap-1"><ListChecks className="h-4 w-4" /> Steps</Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader><SheetTitle>{t("diagnostics.stepsSheet")}</SheetTitle></SheetHeader>
                <div className="mt-3 space-y-1">
                  {NO_COOLING.filter((candidate) => !candidate.id.startsWith("ALT-")).map((candidate) => {
                    const status = stepStatus(candidate.id);
                    return (
                      <button
                        key={candidate.id}
                        onClick={() => goToStep(job.id, candidate.id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md border p-2 text-left text-xs",
                          status === "current" && "border-primary bg-primary/5",
                          status === "needs-review" && "border-warning bg-warning/10",
                          status === "complete" && "border-success/40",
                          status === "skipped" && "opacity-60",
                        )}
                      >
                        <span className="truncate"><span className="font-semibold">{candidate.id}.</span> {candidate.title}</span>
                        <StatusChip status={status} />
                      </button>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
            <Sheet>
              <SheetTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 gap-1"><BookOpen className="h-4 w-4" /> Specs</Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-96 overflow-y-auto">
                <SheetHeader><SheetTitle>{equipment ? `${equipment.manufacturer} ${equipment.model}` : t("diagnostics.specsSheet")}</SheetTitle></SheetHeader>
                {equipment ? (
                  <div className="mt-3 space-y-3 text-xs">
                    {equipment.verificationStatus !== "Manufacturer Verified" ? (
                      <div className="rounded-md border border-warning bg-warning/10 p-2">
                        {t("diagnostics.demoSpecsBanner")}
                      </div>
                    ) : null}
                    {GROUPS.map((group) => {
                      const items = equipment.specs.filter((spec) => spec.group === group);
                      if (!items.length) return null;
                      return (
                        <div key={group} className="rounded-md border">
                          <div className="border-b bg-muted/30 px-2 py-1 font-semibold">{t(`equipmentProfile.groups.${group}`)}</div>
                          <ul className="divide-y">
                            {items.map((spec) => (
                              <li key={spec.key} className="flex items-baseline justify-between gap-2 px-2 py-1.5">
                                <span className="text-muted-foreground">{spec.label}</span>
                                <span className="font-medium">{spec.value}{spec.unit ? ` ${spec.unit}` : ""}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link to={`/app/equipment/${equipment.id}#specs`}><FileText className="mr-1 h-3 w-3" /> {t("diagnostics.openFullProfile")}</Link>
                    </Button>
                    <p className="text-[10px] text-muted-foreground">{t("diagnostics.noSession")}</p>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">{t("diagnostics.noEquipmentLinked")}</p>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
          <span className="stat-pill bg-secondary text-secondary-foreground">{completed} answers saved</span>
          {live.measurements.length > 0 ? <span className="stat-pill bg-muted text-muted-foreground">{live.measurements.length} measurements</span> : null}
          {reviewRequiredSteps > 0 ? <span className="stat-pill bg-warning/15 text-warning">{reviewRequiredSteps} need review</span> : null}
        </div>
        {live.hypothesis ? (
          <div className="mt-2 rounded-md bg-accent/15 px-2 py-1 text-xs"><span className="font-semibold">{t("diagnostics.currentHypothesis")}</span> {live.hypothesis}</div>
        ) : null}
      </div>

      {reviewNote}

      <div className="card-elev p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Current call</div>
            <div className="mt-1 text-sm font-semibold">{customer?.name ?? "Customer record"}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {equipment ? `${equipment.manufacturer} ${equipment.model}` : "No equipment linked"}
              {property?.address ? ` - ${property.address.split(",")[0]}` : ""}
            </div>
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link to={`/app/jobs/${job.id}`}>Open job</Link>
          </Button>
        </div>
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
          <div className="rounded-lg border bg-muted/20 p-2">
            <div className="text-[11px] uppercase tracking-normal text-muted-foreground">Complaint</div>
            <div className="mt-1 font-medium">{job.complaint}</div>
          </div>
          <div className="rounded-lg border bg-muted/20 p-2">
            <div className="text-[11px] uppercase tracking-normal text-muted-foreground">Active step</div>
            <div className="mt-1 font-medium">{step.id} - {step.title}</div>
          </div>
          <div className="rounded-lg border bg-muted/20 p-2">
            <div className="text-[11px] uppercase tracking-normal text-muted-foreground">Latest answer</div>
            <div className="mt-1 font-medium">{latestResult?.answer || "No answer saved on this step yet"}</div>
          </div>
        </div>
      </div>

      {isInvalidated ? (
        <div className="rounded-md border border-warning bg-warning/10 p-3 text-xs">
          <div className="inline-flex items-center gap-1 font-semibold"><AlertTriangle className="h-4 w-4" /> {t("diagnostics.needsReview")}</div>
          <p className="mt-1">{t("diagnostics.needsReviewBody")}</p>
          <Button size="sm" variant="outline" className="mt-2 h-8" onClick={() => clearInvalidation(job.id, currentId)}><RefreshCw className="mr-1 h-3 w-3" /> {t("diagnostics.markReviewed")}</Button>
        </div>
      ) : null}

      <div className="card-elev p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">{step.title}</h2>
            <p className="mt-1 text-sm">{step.question}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="touch-target"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => tryAdvance(nextStepIdOrSame(step), { answer: "skipped" })}>{t("diagnostics.skipStep")}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => tryAdvance(nextStepIdOrSame(step), { answer: "n/a" })}>{t("diagnostics.markNa")}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const note = prompt(t("diagnostics.addNotePrompt"));
                if (note) {
                  saveStep(job.id, { stepId: step.id, ts: new Date().toISOString(), notes: note });
                  toast.success(t("diagnostics.noteAdded"));
                }
              }}
              >{t("diagnostics.addNote")}</DropdownMenuItem>
              <DropdownMenuItem onClick={escalate}>{t("diagnostics.escalateSenior")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border bg-muted/10 p-3 text-xs">
            <div className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">This step decides</div>
            <div className="mt-1 font-medium text-foreground">{step.hypothesis}</div>
          </div>
          <div className="rounded-xl border bg-muted/10 p-3 text-xs">
            <div className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">Why it matters</div>
            <div className="mt-1 text-muted-foreground">{step.why ?? "This answer keeps the diagnostic path honest before the next action."}</div>
          </div>
          <div className="rounded-xl border bg-muted/10 p-3 text-xs">
            <div className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">Next after this answer</div>
            <div className="mt-1 text-muted-foreground">
              {step.type === "measurement" && step.measurement
                ? nextStepPreview(step.measurement.nextStepId)
                : step.choices?.length
                  ? nextStepPreview(step.choices[0].nextStepId, step.choices[0].branchLabel)
                  : step.type === "info-end"
                    ? "Generates the service report from this diagnostic path."
                    : "Choose the handoff that matches the on-site decision."}
            </div>
          </div>
        </div>

        {step.toolsNeeded ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {step.toolsNeeded.map((toolName) => <span key={toolName} className="stat-pill bg-secondary text-secondary-foreground"><Wrench className="h-3 w-3" /> {toolName}</span>)}
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          {step.type === "choice" && step.choices?.map((choice) => (
            <Button key={choice.id} variant={choice.id === "ack" || choice.id === "next" ? "default" : "outline"} className="touch-target h-auto min-h-12 w-full justify-between px-4 py-3 text-left" onClick={() => tryAdvance(choice.nextStepId, { answer: choice.label })}>
              <span className="flex min-w-0 flex-col text-left">
                <span className="whitespace-normal">{choice.label}</span>
                <span className="mt-1 whitespace-normal text-[11px] font-normal opacity-80">
                  {nextStepPreview(choice.nextStepId, choice.branchLabel)}
                </span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0" />
            </Button>
          ))}

          {step.type === "ack-electrical" ? (
            <ElectricalAck ack={ack} setAck={setAck} onProceed={() => tryAdvance("E", { ack: true })} />
          ) : null}

          {step.type === "ack-refrigerant" ? (
            <RefrigerantAck ack={ack} setAck={setAck} onProceed={() => tryAdvance(nextStepIdOrSame(step), { ack: true })} />
          ) : null}

          {step.type === "measurement" && step.measurement ? (
            <div className="space-y-3">
              <div className="rounded-xl border bg-muted/20 p-3 text-xs">
                <div className="font-semibold text-foreground">Measurement guide</div>
                <div className="mt-1 text-muted-foreground">
                  Save the measured value to continue through the exact diagnostic branch instead of jumping to a guess.
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border bg-background p-2">
                    <div className="text-[11px] uppercase tracking-normal text-muted-foreground">Expected range</div>
                    <div className="mt-1 text-foreground">
                      {step.measurement.min !== undefined && step.measurement.max !== undefined
                        ? `${step.measurement.min} - ${step.measurement.max} ${step.measurement.unit}`
                        : step.measurement.minNote ?? "Use the installed component or linked source as the comparison point."}
                    </div>
                  </div>
                  <div className="rounded-lg border bg-background p-2">
                    <div className="text-[11px] uppercase tracking-normal text-muted-foreground">Next after save</div>
                    <div className="mt-1 text-foreground">{nextStepPreview(step.measurement.nextStepId)}</div>
                  </div>
                </div>
              </div>
              <MeasurementBody m={step.measurement} val={val} setVal={setVal} onSubmit={handleMeasurement} />
            </div>
          ) : null}

          {step.type === "info-end" ? (
            <Button className="touch-target h-12 w-full" onClick={() => {
              completeDiag(job.id);
              setJobStatus(job.id, "Completed");
              toast.success(t("diagnostics.diagComplete"));
              nav(`/app/jobs/${job.id}/report`);
            }}
            >
              <Check className="mr-2 h-5 w-5" /> {t("diagnostics.generateReport")}
            </Button>
          ) : null}

          {step.type === "alt-end" ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-accent/40 bg-accent/10 p-3 text-xs">
                <div className="font-semibold text-foreground">Diagnosis handoff</div>
                <p className="mt-1 leading-relaxed">{step.detail ?? t("diagnostics.altSopText")}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground">
                The diagnostic path has enough evidence. Finish by choosing the handoff that matches the on-site decision instead of restarting the whole tree.
              </div>
              <div className="grid grid-cols-1 gap-2">
                <HandoffActionCard
                  title="Customer approval"
                  body="Lock the estimate, capture signature, and move the repair decision forward."
                  icon={<FileText className="h-4 w-4" />}
                  to={`/app/jobs/${job.id}/approval`}
                />
                <HandoffActionCard
                  title="Parts request"
                  body="Document the required part now and keep the parts workflow attached to this job."
                  icon={<Wrench className="h-4 w-4" />}
                  to={`/app/jobs/${job.id}/parts-request`}
                />
                <button
                  type="button"
                  onClick={escalate}
                  className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-left transition-colors hover:bg-warning/15"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                        <ShieldAlert className="h-4 w-4" />
                        Move to follow-up
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Use this when the office or a senior technician should pick up the next move.
                      </div>
                    </div>
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                </button>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">Support tools</div>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {equipment ? (
                    <Button asChild variant="outline" className="touch-target justify-start">
                      <Link to={`/app/equipment/${equipment.id}#specs`}><BookOpen className="mr-1 h-4 w-4" /> Open equipment specs</Link>
                    </Button>
                  ) : null}
                  <Button variant="outline" className="touch-target justify-start" onClick={() => setStepsSheetOpen(true)}><ListChecks className="mr-1 h-4 w-4" /> Review saved steps</Button>
                  <Button
                    variant="outline"
                    className="touch-target justify-start"
                    onClick={() => {
                      setJobStatus(job.id, "Waiting for Parts");
                      toast.success("Job moved to Waiting for Parts.");
                      nav(`/app/jobs/${job.id}/parts-request`);
                    }}
                  >
                    <RefreshCw className="mr-1 h-4 w-4" /> Move to waiting for parts
                  </Button>
                  <Button
                    variant="outline"
                    className="touch-target justify-start"
                    onClick={() => nav(`/app/jobs/${job.id}/report`)}
                  >
                    <FileText className="mr-1 h-4 w-4" /> Open service report
                  </Button>
                  <Button variant="outline" className="touch-target justify-start" onClick={() => nav(`/app/jobs/${job.id}`)}><ArrowLeft className="mr-1 h-4 w-4" /> Back to job</Button>
                  <Button variant="ghost" className="touch-target justify-start" onClick={() => setConfirmRestart(true)}>{t("diagnostics.restartDiagnosis")}</Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {(step.why || step.detail) ? (
          <details className="mt-4 rounded-md border bg-muted/30 p-3 text-xs">
            <summary className="inline-flex cursor-pointer items-center gap-1 font-medium">{t("diagnostics.whyThisStep")} <ChevronDown className="h-3 w-3" /></summary>
            {step.why ? <p className="mt-2">{step.why}</p> : null}
            {step.detail ? <p className="mt-1 text-muted-foreground">{step.detail}</p> : null}
          </details>
        ) : null}

        {step.sources && step.sources.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {step.sources.map((source, index) => <SourceBadge key={`${source.title}-${index}`} source={source} />)}
          </div>
        ) : null}

        {step.id === "J" ? <ToleranceCard /> : null}
        {step.id === "K" ? <LikelyCauseCard /> : null}
      </div>

      {step.type !== "alt-end" ? (
        <section className="rounded-xl border bg-muted/20 p-4">
          <div className="text-sm font-semibold">Other actions from this step</div>
          <div className="mt-1 text-xs text-muted-foreground">
            You do not need to restart the diagnosis just to open specs, route the job to parts, review customer approval, or go back to the job record.
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button variant="outline" className="touch-target justify-start" onClick={() => setStepsSheetOpen(true)}>
              <ListChecks className="mr-1 h-4 w-4" /> Open steps breakdown
            </Button>
            {equipment ? (
              <Button asChild variant="outline" className="touch-target justify-start">
                <Link to={`/app/equipment/${equipment.id}#specs`}><BookOpen className="mr-1 h-4 w-4" /> Open equipment profile</Link>
              </Button>
            ) : null}
            <Button variant="outline" className="touch-target justify-start" onClick={() => nav(`/app/jobs/${job.id}/parts-request`)}>
              <Wrench className="mr-1 h-4 w-4" /> Parts request
            </Button>
            <Button variant="outline" className="touch-target justify-start" onClick={() => nav(`/app/jobs/${job.id}/approval`)}>
              <FileText className="mr-1 h-4 w-4" /> Customer approval
            </Button>
            <Button variant="outline" className="touch-target justify-start" onClick={() => nav(`/app/jobs/${job.id}/report`)}>
              <FileText className="mr-1 h-4 w-4" /> Service report
            </Button>
            <Button variant="outline" className="touch-target justify-start" onClick={() => nav(`/app/jobs/${job.id}`)}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back to job
            </Button>
          </div>
        </section>
      ) : null}

      <div className="fixed inset-x-0 bottom-16 z-20 mx-auto w-full max-w-md space-y-2 px-4">
        {step.type === "alt-end" ? (
          <div className="rounded-2xl border bg-card/95 p-2 shadow-lg backdrop-blur">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="touch-target h-12" onClick={() => nav(`/app/jobs/${job.id}`)}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Back to job
              </Button>
              <Button variant="outline" className="touch-target h-12" onClick={() => setStepsSheetOpen(true)}>
                <ListChecks className="mr-1 h-4 w-4" /> Review steps
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <Button variant="outline" className="touch-target h-12 flex-1" onClick={onBack}>
                <ArrowLeft className="mr-1 h-4 w-4" /> {t("diagnostics.back")}
              </Button>
              <Button variant="outline" className="touch-target h-12 flex-1" onClick={onNext} disabled={!nextVisitedId}>
                {t("diagnostics.next")} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            <Button variant="destructive" className="touch-target w-full shadow-lg" onClick={escalate}>
              <ShieldAlert className="mr-2 h-5 w-5" /> {t("diagnostics.stopEscalate")}
            </Button>
          </>
        )}
      </div>

      <Dialog open={!!confirmEdit} onOpenChange={(open) => !open && setConfirmEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("diagnostics.confirmEditTitle")}</DialogTitle></DialogHeader>
          <div className="text-sm">{t("diagnostics.confirmEditBody")}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmEdit(null)}>{t("common.cancel")}</Button>
            <Button onClick={() => {
              const data = JSON.parse(confirmEdit!) as { next: string; payload: { answer?: string; ack?: boolean } };
              saveStep(job.id, { stepId: step.id, ts: new Date().toISOString(), ...data.payload }, data.next);
              setConfirmEdit(null);
              toast(t("diagnostics.updatedToast"));
            }}
            >{t("diagnostics.updateMarkLater")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmRestart} onOpenChange={setConfirmRestart}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("diagnostics.restartTitle")}</DialogTitle></DialogHeader>
          <div className="text-sm">{t("diagnostics.restartBody")}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRestart(false)}>{t("common.cancel")}</Button>
            <Button variant="destructive" onClick={() => {
              goToStep(job.id, "A");
              setConfirmRestart(false);
              toast(t("diagnostics.returnedToStart"));
            }}
            >{t("diagnostics.restartDiagnosis")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function nextStepIdOrSame(step: DiagStep) {
  if (step.choices && step.choices[0]) return step.choices[0].nextStepId;
  if (step.measurement) return step.measurement.nextStepId;
  return step.id;
}

function StatusChip({ status }: { status: string }) {
  const { t } = useTranslation();
  const map: Record<string, string> = {
    complete: "bg-success/15 text-success",
    current: "bg-primary text-primary-foreground",
    "needs-review": "border border-warning bg-warning/20 text-warning-foreground",
    skipped: "bg-muted text-muted-foreground",
    pending: "bg-muted text-muted-foreground",
  };
  return <span className={cn("rounded px-2 py-0.5 text-[10px] font-medium", map[status])}>{t(`diagnostics.status.${status}`)}</span>;
}

function RiskBadge({ risk }: { risk: "Low" | "Medium" | "High" }) {
  const { t } = useTranslation();
  const cls = risk === "High" ? "bg-destructive text-destructive-foreground" : risk === "Medium" ? "bg-warning text-warning-foreground" : "bg-secondary text-secondary-foreground";
  return <span className={cn("stat-pill", cls)}>{t(`diagnostics.risk.${risk}`)}</span>;
}

function ElectricalAck({ ack, setAck, onProceed }: { ack: boolean; setAck: (value: boolean) => void; onProceed: () => void }) {
  return (
    <div className="space-y-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
      <div className="inline-flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" /><span className="font-medium">Required acknowledgment</span></div>
      <label className="flex items-start gap-2 text-xs">
        <input type="checkbox" checked={ack} onChange={(event) => setAck(event.target.checked)} className="mt-0.5 h-5 w-5" />
        <span>I am qualified to perform this test and will follow lockout/tagout and verify absence/presence of voltage as appropriate.</span>
      </label>
      <Button disabled={!ack} className="touch-target w-full" onClick={onProceed}>Acknowledge and continue</Button>
    </div>
  );
}

function RefrigerantAck({ ack, setAck, onProceed }: { ack: boolean; setAck: (value: boolean) => void; onProceed: () => void }) {
  return (
    <div className="space-y-3 rounded-md border border-accent/40 bg-accent/10 p-3 text-sm">
      <div className="font-medium">Refrigerant handling</div>
      <label className="flex items-start gap-2 text-xs">
        <input type="checkbox" checked={ack} onChange={(event) => setAck(event.target.checked)} className="mt-0.5 h-5 w-5" />
        <span>I am appropriately certified and will follow applicable refrigerant handling requirements.</span>
      </label>
      <Button disabled={!ack} className="touch-target w-full" onClick={onProceed}>Acknowledge and continue</Button>
    </div>
  );
}

function MeasurementBody({ m, val, setVal, onSubmit }: {
  m: NonNullable<DiagStep["measurement"]>;
  val: string;
  setVal: (value: string) => void;
  onSubmit: () => void;
}) {
  const num = parseFloat(val);
  let status: null | { ok: boolean; text: string } = null;
  if (!Number.isNaN(num) && m.min !== undefined && m.max !== undefined) {
    const ok = num >= m.min && num <= m.max;
    status = { ok, text: ok ? `Within ${m.min}-${m.max} ${m.unit}` : `Outside ${m.min}-${m.max} ${m.unit}` };
  }
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{m.label}</label>
        <div className="mt-1 flex gap-2">
          <div className="relative flex-1">
            <Input value={val} onChange={(event) => setVal(event.target.value)} placeholder={`e.g. ${m.sampleValue}`} className="touch-target pr-12" />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{m.unit}</span>
          </div>
          <VoiceInput onTranscript={(transcript) => setVal(transcript.replace(/[^0-9./%+-]/gi, "").trim() || m.sampleValue)} samplePhrase={m.sampleValue} />
          <Button variant="outline" size="sm" className="touch-target" onClick={() => setVal(m.sampleValue)}>Demo</Button>
        </div>
      </div>
      {m.minNote ? <div className="text-xs text-muted-foreground">{m.minNote}</div> : null}
      {status ? <div className={cn("rounded-md px-2 py-1 text-xs font-medium", status.ok ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive")}>{status.text}</div> : null}
      {m.observation ? (
        <div className="rounded-md border border-accent/40 bg-accent/10 p-2 text-xs">
          <strong>Technician observation</strong> - verify against installed component and unit documentation. Not a Goodman specification.
        </div>
      ) : null}
      {m.source ? <SourceBadge source={m.source} /> : null}
      <Button onClick={onSubmit} disabled={!val.trim()} className="touch-target h-12 w-full">
        Save measurement <ArrowRight className="ml-1 h-5 w-5" />
      </Button>
    </div>
  );
}

function ToleranceCard() {
  return (
    <div className="mt-4 rounded-lg border bg-muted/40 p-3 text-xs">
      <div className="font-semibold">Tolerance math</div>
      <div className="mt-1">Observed label: <strong>40 / 5 uF +/- 6%</strong></div>
      <div>HERM range: 40 x 0.94 to 40 x 1.06 = <strong>37.6 - 42.4 uF</strong></div>
      <div>Fan range: 5 x 0.94 to 5 x 1.06 = <strong>4.7 - 5.3 uF</strong></div>
      <div className="mt-2">Measured HERM: <strong className="text-destructive">27.8 uF - out of tolerance</strong></div>
      <div>Measured fan: <strong className="text-success">4.9 uF - within tolerance</strong></div>
    </div>
  );
}

function LikelyCauseCard() {
  return (
    <div className="mt-4 rounded-lg border border-accent/40 bg-accent/10 p-3 text-xs">
      <div className="font-semibold">Recommendation</div>
      <div className="mt-1">Verify correct replacement against installed component, unit documentation, and approved parts database. Obtain customer approval, replace using qualified procedures, then retest under load.</div>
    </div>
  );
}

function HandoffActionCard({
  title,
  body,
  to,
  icon,
}: {
  title: string;
  body: string;
  to: string;
  icon: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="rounded-xl border bg-background p-3 transition-colors hover:bg-muted/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
            {icon}
            {title}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{body}</div>
        </div>
        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
    </Link>
  );
}

