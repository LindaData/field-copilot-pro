import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { findStep, NO_COOLING, type DiagStep } from "@/lib/diagTemplate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SourceBadge } from "@/components/SourceBadge";
import { VoiceInput } from "@/components/VoiceInput";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ChevronDown, ListChecks, MoreVertical, RefreshCw, ShieldAlert, Wrench } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Diagnostics() {
  const { id = "" } = useParams();
  const { state, ensureDiag, saveStep, saveMeasurement, setHypothesis, completeDiag, setJobStatus, goToStep, clearInvalidation } = useStore();
  const nav = useNavigate();
  const job = state.jobs.find((j) => j.id === id);
  const session = useMemo(() => ensureDiag(id), [id, ensureDiag]);
  const live = state.diag[id] ?? session;
  const currentId = live.currentStepId;
  const [ack, setAck] = useState(false);
  const [val, setVal] = useState("");
  const [confirmEdit, setConfirmEdit] = useState<string | null>(null);
  const step = findStep(currentId);

  // Pre-fill val when stepping onto a previously-answered measurement step
  useEffect(() => {
    setAck(false);
    const prior = live.results.find((r) => r.stepId === currentId);
    setVal(prior?.answer && prior.answer !== "skipped" && prior.answer !== "n/a" ? prior.answer : "");
  }, [currentId, live.results]);

  if (!job || !step) return <div className="p-6">Job not found</div>;

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
    // If editing and downstream visited steps exist, confirm
    const downstream = visited.slice(visited.indexOf(step.id) + 1).filter((x) => x !== step.id);
    if (isEdit && downstream.length > 0) {
      setConfirmEdit(JSON.stringify({ next, payload }));
      return;
    }
    saveStep(job.id, { stepId: step.id, ts: new Date().toISOString(), ...payload }, next);
    if (step.id === "J") setHypothesis(job.id, "Installed dual-run capacitor compressor section out of label tolerance", "High");
    toast("Saved", { duration: 1100 });
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
    toast("Escalated as follow-up");
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

  return (
    <div className="flex flex-col gap-4 p-4 pb-36">
      {/* Header / progress */}
      <div className="card-elev p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Step {step.id} · {step.type === "alt-end" ? "Alternate branch" : `${completed + 1}/14`}</span>
          <div className="flex items-center gap-2">
            <RiskBadge risk={step.risk} />
            <Sheet>
              <SheetTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 gap-1"><ListChecks className="h-4 w-4" /> Steps</Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader><SheetTitle>Diagnostic steps</SheetTitle></SheetHeader>
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
          </div>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
        {live.hypothesis && (
          <div className="mt-2 rounded-md bg-accent/15 px-2 py-1 text-xs"><span className="font-semibold">Current hypothesis:</span> {live.hypothesis}</div>
        )}
      </div>

      {isInvalidated && (
        <div className="rounded-md border border-warning bg-warning/10 p-3 text-xs">
          <div className="font-semibold inline-flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Needs review</div>
          <p className="mt-1">An earlier answer changed. Re-confirm this step or re-enter the measurement, then it will be marked complete again.</p>
          <Button size="sm" variant="outline" className="mt-2 h-8" onClick={() => clearInvalidation(job.id, currentId)}><RefreshCw className="mr-1 h-3 w-3" /> Mark reviewed</Button>
        </div>
      )}

      {/* Step card */}
      <div className="card-elev p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">{step.title}</h2>
            <p className="mt-1 text-sm">{step.question}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="touch-target"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => advance(nextStepIdOrSame(step), { answer: "skipped" })}>Skip step</DropdownMenuItem>
              <DropdownMenuItem onClick={() => advance(nextStepIdOrSame(step), { answer: "n/a" })}>Mark not applicable</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { const n = prompt("Add note for this step"); if (n) { saveStep(job.id, { stepId: step.id, ts: new Date().toISOString(), notes: n }); toast.success("Note added"); } }}>Add note</DropdownMenuItem>
              <DropdownMenuItem onClick={escalate}>Escalate to senior tech</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {step.toolsNeeded && (
          <div className="mt-3 flex flex-wrap gap-1">
            {step.toolsNeeded.map((t) => <span key={t} className="stat-pill bg-secondary text-secondary-foreground"><Wrench className="h-3 w-3" /> {t}</span>)}
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
            <Button className="touch-target h-12 w-full" onClick={() => { completeDiag(job.id); setJobStatus(job.id, "Completed"); toast.success("Diagnostic complete"); nav(`/app/jobs/${job.id}/report`); }}>
              <Check className="mr-2 h-5 w-5" /> Generate service report
            </Button>
          )}

          {step.type === "alt-end" && (
            <div className="space-y-2">
              <div className="rounded-md border border-accent/40 bg-accent/10 p-2 text-xs">{step.detail ?? "Follow company SOP and applicable codes. Do not bypass safety devices."}</div>
              <Button variant="outline" className="touch-target w-full" onClick={() => { goToStep(job.id, "A"); toast("Returned to start"); }}>Restart diagnostic</Button>
              <Button className="touch-target w-full" onClick={escalate}>Escalate this job</Button>
            </div>
          )}
        </div>

        {(step.why || step.detail) && (
          <details className="mt-4 rounded-md border bg-muted/30 p-3 text-xs">
            <summary className="cursor-pointer font-medium inline-flex items-center gap-1">Why this step? & technical details <ChevronDown className="h-3 w-3" /></summary>
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

      {/* Sticky bottom bar: Back / Next + escalate */}
      <div className="fixed inset-x-0 bottom-16 z-20 mx-auto w-full max-w-md px-4 space-y-2">
        <div className="flex gap-2">
          <Button variant="outline" className="touch-target h-12 flex-1" onClick={onBack}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <Button variant="outline" className="touch-target h-12 flex-1" onClick={onNext} disabled={!nextVisitedId}>
            Next <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
        <Button variant="destructive" className="touch-target w-full shadow-lg" onClick={escalate}>
          <ShieldAlert className="mr-2 h-5 w-5" /> Stop & escalate
        </Button>
      </div>

      <Dialog open={!!confirmEdit} onOpenChange={(o) => !o && setConfirmEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change earlier answer?</DialogTitle></DialogHeader>
          <div className="text-sm">Changing this answer may invalidate later steps. Affected steps will be marked <strong>Needs review</strong> until you re-confirm them.</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmEdit(null)}>Cancel</Button>
            <Button onClick={() => {
              const data = JSON.parse(confirmEdit!) as { next: string; payload: { answer?: string; ack?: boolean } };
              saveStep(job.id, { stepId: step.id, ts: new Date().toISOString(), ...data.payload }, data.next);
              setConfirmEdit(null);
              toast("Updated — review later steps");
            }}>Update & mark later steps for review</Button>
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
  const map: Record<string, string> = {
    complete: "bg-success/15 text-success",
    current: "bg-primary text-primary-foreground",
    "needs-review": "bg-warning/20 text-warning-foreground border border-warning",
    skipped: "bg-muted text-muted-foreground",
    pending: "bg-muted text-muted-foreground",
  };
  const label: Record<string, string> = {
    complete: "Complete", current: "Current", "needs-review": "Review", skipped: "Skipped", pending: "—",
  };
  return <span className={cn("rounded px-2 py-0.5 text-[10px] font-medium", map[status])}>{label[status]}</span>;
}

function RiskBadge({ risk }: { risk: "Low" | "Medium" | "High" }) {
  const cls = risk === "High" ? "bg-destructive text-destructive-foreground" : risk === "Medium" ? "bg-warning text-warning-foreground" : "bg-secondary text-secondary-foreground";
  return <span className={cn("stat-pill", cls)}>Risk: {risk}</span>;
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
