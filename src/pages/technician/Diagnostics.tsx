import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
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

const GROUPS = ["Capacity","Compressor","Fan","Refrigeration","Electrical","Physical","Certifications"] as const;

export default function Diagnostics() {
  const { id = "" } = useParams();
  const { state, ensureDiag, saveStep, saveMeasurement, setHypothesis, completeDiag, setJobStatus, goToStep, clearInvalidation } = useStore();
  const { t } = useTranslation();
  const nav = useNavigate();
  const job = state.jobs.find((j) => j.id === id);
  const session = useMemo(() => ensureDiag(id), [id, ensureDiag]);
  const live = state.diag[id] ?? session;
  const currentId = live.currentStepId;
  const [ack, setAck] = useState(false);
  const [val, setVal] = useState("");
  const [confirmEdit, setConfirmEdit] = useState<string | null>(null);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const step = findStep(currentId);
  const equipment = state.equipment.find((e) => e.id === job?.equipmentId);

  useEffect(() => {
    setAck(false);
    const prior = live.results.find((r) => r.stepId === currentId);
    setVal(prior?.answer && prior.answer !== "skipped" && prior.answer !== "n/a" ? prior.answer : "");
  }, [currentId, live.results]);

  if (!job || !step) return <div className="p-6">{t("diagnostics.jobNotFound")}</div>;

  const visited = live.visitedStepIds ?? [];
  const visitedIdx = visited.indexOf(currentId);
  const prevId = visitedIdx > 0 ? visited[visitedIdx - 1] : undefined;
  const nextVisitedId = visitedIdx >= 0 && visitedIdx < visited.length - 1 ? visited[visitedIdx + 1] : undefined;

  const stepStatus = (sid: string): "complete" | "current" | "skipped" | "needs-review" | "pending" => {
    if (sid === currentId) return "current";
    if ((live.invalidatedStepIds ?? []).includes(sid)) return "needs-review";
    const r = live.results.find((x) => x.stepId === sid);
    if (!r) return visited.includes(sid) ? "pending" : "pending";
    if (r.answer === "skipped" || r.answer === "n/a") return "skipped";
    return "complete";
  };

  const tryAdvance = (next: string, payload?: Partial<{ answer: string; ack: boolean }>) => {
    const prior = live.results.find((r) => r.stepId === step.id);
    const isEdit = prior && payload?.answer !== undefined && (prior.answer ?? "") !== payload.answer;
    const downstream = visited.slice(visited.indexOf(step.id) + 1).filter((x) => x !== step.id);
    if (isEdit && downstream.length > 0) {
      setConfirmEdit(JSON.stringify({ next, payload }));
      return;
    }
    saveStep(job.id, { stepId: step.id, ts: new Date().toISOString(), ...payload }, next);
    if (step.id === "J") setHypothesis(job.id, "Installed dual-run capacitor compressor section out of label tolerance", "High");
    toast(t("diagnostics.savedToast"), { duration: 1100 });
  };

  const advance = tryAdvance;

  const handleMeasurement = () => {
    if (!step.measurement) return;
    const num = parseFloat(val);
    const m = step.measurement;
    let withinRange: boolean | undefined;
    if (!Number.isNaN(num) && m.min !== undefined && m.max !== undefined) {
      withinRange = num >= m.min && num <= m.max;
    }
    saveMeasurement(job.id, {
      id: `${step.id}-${Date.now()}`, jobId: job.id, stepId: step.id,
      label: m.label, value: val, unit: m.unit, withinRange,
      rangeNote: m.minNote, source: m.source ?? { kind: "technician_observation", title: "Field-measured value" },
      ts: new Date().toISOString(),
    });
    advance(m.nextStepId, { answer: val });
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

  const completed = live.results.filter((r) => !["skipped", "n/a"].includes(r.answer ?? "")).length;
  const progress = Math.min(100, Math.round((completed / 14) * 100));
  const isInvalidated = (live.invalidatedStepIds ?? []).includes(currentId);

  const stepLabel = step.type === "alt-end"
    ? t("diagnostics.stepLabel", { id: step.id, progress: t("diagnostics.altBranch") })
    : t("diagnostics.stepLabel", { id: step.id, progress: `${completed + 1}/14` });

  return (
    <div className="flex flex-col gap-4 p-4 pb-36">
      <div className="card-elev p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">{stepLabel}</span>
          <div className="flex items-center gap-2">
            <RiskBadge risk={step.risk} />
            <Sheet>
              <SheetTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 gap-1"><ListChecks className="h-4 w-4" /> {t("equipmentList.specs")}</Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader><SheetTitle>{t("diagnostics.stepsSheet")}</SheetTitle></SheetHeader>
                <div className="mt-3 space-y-1">
                  {NO_COOLING.filter((s) => !s.id.startsWith("ALT-")).map((s) => {
                    const st = stepStatus(s.id);
                    return (
                      <button key={s.id} onClick={() => goToStep(job.id, s.id)} className={cn(
                        "flex w-full items-center justify-between rounded-md border p-2 text-left text-xs",
                        st === "current" && "border-primary bg-primary/5",
                        st === "needs-review" && "border-warning bg-warning/10",
                        st === "complete" && "border-success/40",
                        st === "skipped" && "opacity-60",
                      )}>
                        <span className="truncate"><span className="font-semibold">{s.id}.</span> {s.title}</span>
                        <StatusChip status={st} />
                      </button>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
            <Sheet>
              <SheetTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 gap-1"><BookOpen className="h-4 w-4" /> {t("equipmentList.specs")}</Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-96 overflow-y-auto">
                <SheetHeader><SheetTitle>{equipment ? `${equipment.manufacturer} ${equipment.model}` : t("diagnostics.specsSheet")}</SheetTitle></SheetHeader>
                {equipment ? (
                  <div className="mt-3 space-y-3 text-xs">
                    {equipment.verificationStatus !== "Manufacturer Verified" && (
                      <div className="rounded-md border border-warning bg-warning/10 p-2">
                        {t("diagnostics.demoSpecsBanner")}
                      </div>
                    )}
                    {GROUPS.map((g) => {
                      const items = equipment.specs.filter((s) => s.group === g);
                      if (!items.length) return null;
                      return (
                        <div key={g} className="rounded-md border">
                          <div className="border-b bg-muted/30 px-2 py-1 font-semibold">{t(`equipmentProfile.groups.${g}`)}</div>
                          <ul className="divide-y">
                            {items.map((s) => (
                              <li key={s.key} className="flex items-baseline justify-between gap-2 px-2 py-1.5">
                                <span className="text-muted-foreground">{s.label}</span>
                                <span className="font-medium">{s.value}{s.unit ? ` ${s.unit}` : ""}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link to={`/app/equipment/${equipment.id}#specs`}><FileText className="mr-1 h-3 w-3" /> {t("diagnostics.openFullProfile")}</Link>
                      </Button>
                    </div>
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
        {live.hypothesis && (
          <div className="mt-2 rounded-md bg-accent/15 px-2 py-1 text-xs"><span className="font-semibold">{t("diagnostics.currentHypothesis")}</span> {live.hypothesis}</div>
        )}
      </div>

      {isInvalidated && (
        <div className="rounded-md border border-warning bg-warning/10 p-3 text-xs">
          <div className="font-semibold inline-flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> {t("diagnostics.needsReview")}</div>
          <p className="mt-1">{t("diagnostics.needsReviewBody")}</p>
          <Button size="sm" variant="outline" className="mt-2 h-8" onClick={() => clearInvalidation(job.id, currentId)}><RefreshCw className="mr-1 h-3 w-3" /> {t("diagnostics.markReviewed")}</Button>
        </div>
      )}

      <div className="card-elev p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">{step.title}</h2>
            <p className="mt-1 text-sm">{step.question}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="touch-target"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => advance(nextStepIdOrSame(step), { answer: "skipped" })}>{t("diagnostics.skipStep")}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => advance(nextStepIdOrSame(step), { answer: "n/a" })}>{t("diagnostics.markNa")}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { const n = prompt(t("diagnostics.addNotePrompt")); if (n) { saveStep(job.id, { stepId: step.id, ts: new Date().toISOString(), notes: n }); toast.success(t("diagnostics.noteAdded")); } }}>{t("diagnostics.addNote")}</DropdownMenuItem>
              <DropdownMenuItem onClick={escalate}>{t("diagnostics.escalateSenior")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {step.toolsNeeded && (
          <div className="mt-3 flex flex-wrap gap-1">
            {step.toolsNeeded.map((tn) => <span key={tn} className="stat-pill bg-secondary text-secondary-foreground"><Wrench className="h-3 w-3" /> {tn}</span>)}
          </div>
        )}

        <div className="mt-4 space-y-3">
          {step.type === "choice" && step.choices?.map((c) => (
            <Button key={c.id} variant={c.id === "ack" || c.id === "next" ? "default" : "outline"} className="touch-target h-12 w-full justify-between text-left" onClick={() => advance(c.nextStepId, { answer: c.label })}>
              <span className="whitespace-normal">{c.label}</span>
              <ArrowRight className="h-5 w-5 shrink-0" />
            </Button>
          ))}

          {step.type === "ack-electrical" && (
            <ElectricalAck ack={ack} setAck={setAck} onProceed={() => advance("E", { ack: true })} />
          )}
          {step.type === "ack-refrigerant" && (
            <RefrigerantAck ack={ack} setAck={setAck} onProceed={() => advance(nextStepIdOrSame(step), { ack: true })} />
          )}

          {step.type === "measurement" && step.measurement && (
            <MeasurementBody m={step.measurement} val={val} setVal={setVal} onSubmit={handleMeasurement} />
          )}

          {step.type === "info-end" && (
            <Button className="touch-target h-12 w-full" onClick={() => { completeDiag(job.id); setJobStatus(job.id, "Completed"); toast.success(t("diagnostics.diagComplete")); nav(`/app/jobs/${job.id}/report`); }}>
              <Check className="mr-2 h-5 w-5" /> {t("diagnostics.generateReport")}
            </Button>
          )}

          {step.type === "alt-end" && (
            <div className="space-y-2">
              <div className="rounded-md border border-accent/40 bg-accent/10 p-2 text-xs">{step.detail ?? t("diagnostics.altSopText")}</div>
              <Button variant="ghost" className="touch-target w-full text-muted-foreground" onClick={() => setConfirmRestart(true)}>{t("diagnostics.restartDiagnosis")}</Button>
              <Button className="touch-target w-full" onClick={escalate}>{t("jobDetail.stopEscalate")}</Button>
            </div>
          )}
        </div>

        {(step.why || step.detail) && (
          <details className="mt-4 rounded-md border bg-muted/30 p-3 text-xs">
            <summary className="cursor-pointer font-medium inline-flex items-center gap-1">{t("diagnostics.whyThisStep")} <ChevronDown className="h-3 w-3" /></summary>
            {step.why && <p className="mt-2">{step.why}</p>}
            {step.detail && <p className="mt-1 text-muted-foreground">{step.detail}</p>}
          </details>
        )}

        {step.sources && step.sources.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {step.sources.map((s, i) => <SourceBadge key={i} source={s} />)}
          </div>
        )}

        {step.id === "J" && <ToleranceCard />}
        {step.id === "K" && <LikelyCauseCard />}
      </div>

      <div className="fixed inset-x-0 bottom-16 z-20 mx-auto w-full max-w-md px-4 space-y-2">
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
      </div>

      <Dialog open={!!confirmEdit} onOpenChange={(o) => !o && setConfirmEdit(null)}>
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
            }}>{t("diagnostics.updateMarkLater")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmRestart} onOpenChange={setConfirmRestart}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("diagnostics.restartTitle")}</DialogTitle></DialogHeader>
          <div className="text-sm">{t("diagnostics.restartBody")}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRestart(false)}>{t("common.cancel")}</Button>
            <Button variant="destructive" onClick={() => { goToStep(job.id, "A"); setConfirmRestart(false); toast(t("diagnostics.returnedToStart")); }}>{t("diagnostics.restartDiagnosis")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function nextStepIdOrSame(s: DiagStep) {
  if (s.choices && s.choices[0]) return s.choices[0].nextStepId;
  if (s.measurement) return s.measurement.nextStepId;
  return s.id;
}

function StatusChip({ status }: { status: string }) {
  const { t } = useTranslation();
  const map: Record<string, string> = {
    complete: "bg-success/15 text-success",
    current: "bg-primary text-primary-foreground",
    "needs-review": "bg-warning/20 text-warning-foreground border border-warning",
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

function ElectricalAck({ ack, setAck, onProceed }: { ack: boolean; setAck: (b: boolean) => void; onProceed: () => void }) {
  return (
    <div className="space-y-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
      <div className="inline-flex gap-2"><AlertTriangle className="h-4 w-4 text-destructive mt-0.5" /><span className="font-medium">Required acknowledgment</span></div>
      <label className="flex items-start gap-2 text-xs">
        <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 h-5 w-5" />
        <span>I am qualified to perform this test and will follow lockout/tagout and verify absence/presence of voltage as appropriate.</span>
      </label>
      <Button disabled={!ack} className="touch-target w-full" onClick={onProceed}>Acknowledge & continue</Button>
    </div>
  );
}

function RefrigerantAck({ ack, setAck, onProceed }: { ack: boolean; setAck: (b: boolean) => void; onProceed: () => void }) {
  return (
    <div className="space-y-3 rounded-md border border-accent/40 bg-accent/10 p-3 text-sm">
      <div className="font-medium">Refrigerant handling</div>
      <label className="flex items-start gap-2 text-xs">
        <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 h-5 w-5" />
        <span>I am appropriately certified and will follow applicable refrigerant handling requirements.</span>
      </label>
      <Button disabled={!ack} className="touch-target w-full" onClick={onProceed}>Acknowledge & continue</Button>
    </div>
  );
}

function MeasurementBody({ m, val, setVal, onSubmit }:{
  m: NonNullable<DiagStep["measurement"]>; val: string; setVal: (s: string) => void; onSubmit: () => void;
}) {
  const num = parseFloat(val);
  let status: null | { ok: boolean; text: string } = null;
  if (!Number.isNaN(num) && m.min !== undefined && m.max !== undefined) {
    const ok = num >= m.min && num <= m.max;
    status = { ok, text: ok ? `Within ${m.min}–${m.max} ${m.unit}` : `Outside ${m.min}–${m.max} ${m.unit}` };
  }
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{m.label}</label>
        <div className="mt-1 flex gap-2">
          <div className="relative flex-1">
            <Input value={val} onChange={(e) => setVal(e.target.value)} placeholder={`e.g. ${m.sampleValue}`} className="touch-target pr-12" />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{m.unit}</span>
          </div>
          <VoiceInput onTranscript={(t) => setVal(t.replace(/[^0-9./µ μ% ±]/gi, "").trim() || m.sampleValue)} samplePhrase={m.sampleValue} />
          <Button variant="outline" size="sm" className="touch-target" onClick={() => setVal(m.sampleValue)}>Demo</Button>
        </div>
      </div>
      {m.minNote && <div className="text-xs text-muted-foreground">{m.minNote}</div>}
      {status && <div className={cn("rounded-md px-2 py-1 text-xs font-medium", status.ok ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive")}>{status.text}</div>}
      {m.observation && (
        <div className="rounded-md border border-accent/40 bg-accent/10 p-2 text-xs">
          <strong>Technician observation</strong> — verify against installed component and unit documentation. Not a Goodman specification.
        </div>
      )}
      {m.source && <SourceBadge source={m.source} />}
      <Button onClick={onSubmit} disabled={!val.trim()} className="touch-target w-full h-12">
        Save measurement <ArrowRight className="ml-1 h-5 w-5" />
      </Button>
    </div>
  );
}

function ToleranceCard() {
  return (
    <div className="mt-4 rounded-lg border bg-muted/40 p-3 text-xs">
      <div className="font-semibold">Tolerance math</div>
      <div className="mt-1">Observed label: <strong>40 / 5 µF ±6%</strong></div>
      <div>HERM range: 40 × 0.94 → 40 × 1.06 = <strong>37.6 – 42.4 µF</strong></div>
      <div>Fan range: 5 × 0.94 → 5 × 1.06 = <strong>4.7 – 5.3 µF</strong></div>
      <div className="mt-2">Measured HERM: <strong className="text-destructive">27.8 µF — out of tolerance</strong></div>
      <div>Measured fan: <strong className="text-success">4.9 µF — within tolerance</strong></div>
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
