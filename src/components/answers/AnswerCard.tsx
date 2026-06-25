import { useState } from "react";
import { Bot, ShieldCheck, AlertTriangle, ThumbsUp, ThumbsDown, ShieldAlert, FileWarning, Compass, Sparkles, ChevronDown, History } from "lucide-react";
import type { Answer } from "@/lib/answers/types";
import type { AiFeedback, AiFeedbackCategory } from "@/lib/types";
import { SourceBadge } from "@/components/SourceBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useStore, useCurrentUser } from "@/lib/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CONF_CLASSES: Record<Answer["confidence"], string> = {
  high: "bg-success/15 text-success border-success/30",
  medium: "bg-info/15 text-info border-info/30",
  low: "bg-accent/30 text-accent-foreground border-accent/50",
  abstain: "bg-destructive/10 text-destructive border-destructive/30",
};

const FEEDBACK_OPTIONS: { cat: AiFeedbackCategory; label: string; icon: typeof ThumbsUp }[] = [
  { cat: "helpful", label: "Helpful", icon: ThumbsUp },
  { cat: "incorrect", label: "Incorrect", icon: ThumbsDown },
  { cat: "unsafe", label: "Unsafe", icon: ShieldAlert },
  { cat: "missing-info", label: "Missing info", icon: FileWarning },
  { cat: "wrong-source", label: "Wrong source", icon: AlertTriangle },
  { cat: "better-next-step", label: "Better next step", icon: Compass },
];

export function AnswerCard({ question, answer, jobId }: { question: string; answer: Answer; jobId?: string }) {
  const { addAiFeedback } = useStore();
  const user = useCurrentUser();
  const [openFb, setOpenFb] = useState(false);
  const [fbCat, setFbCat] = useState<AiFeedbackCategory | null>(null);
  const [fbNote, setFbNote] = useState("");
  const [showReasoning, setShowReasoning] = useState(false);

  const submitFeedback = () => {
    if (!fbCat) return;
    const fb: AiFeedback = {
      id: `fb-${Date.now()}`,
      ts: new Date().toISOString(),
      userId: user.id,
      jobId,
      equipmentId: undefined,
      question,
      answerSummary: answer.answer.slice(0, 200),
      confidence: answer.confidence,
      isSimulated: answer.isSimulated,
      category: fbCat,
      comment: fbNote || undefined,
    };
    addAiFeedback(fb);
    toast.success("Feedback recorded for manager review.");
    setOpenFb(false); setFbCat(null); setFbNote("");
  };

  return (
    <div className="space-y-2 rounded-2xl border bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary">
          <Bot className="h-3.5 w-3.5" /> Copilot
        </div>
        <div className="flex items-center gap-1">
          {answer.isSimulated ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-accent/50 bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
              <Sparkles className="h-3 w-3" /> Simulated
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
              <ShieldCheck className="h-3 w-3" /> Verified source
            </span>
          )}
          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase", CONF_CLASSES[answer.confidence])}>
            {answer.confidence}
          </span>
        </div>
      </div>

      <div className="text-sm leading-relaxed">{answer.answer}</div>

      {answer.equipmentRef && (
        <div className="text-[11px] text-muted-foreground">
          For: {answer.equipmentRef.manufacturer} {answer.equipmentRef.model}
          {answer.equipmentRef.serial && ` · S/N ${answer.equipmentRef.serial}`}
        </div>
      )}

      {answer.source && <SourceBadge source={answer.source} />}

      {(answer.verificationNeeded?.length || answer.missingInfo?.length || answer.nextSafeAction) && (
        <div className="space-y-1 rounded-md border bg-muted/30 p-2 text-[11px]">
          {answer.nextSafeAction && <div><strong>Next safe action:</strong> {answer.nextSafeAction}</div>}
          {answer.verificationNeeded && answer.verificationNeeded.length > 0 && (
            <div><strong>Verify:</strong> {answer.verificationNeeded.join("; ")}</div>
          )}
          {answer.missingInfo && answer.missingInfo.length > 0 && (
            <div><strong>Missing:</strong> {answer.missingInfo.join("; ")}</div>
          )}
        </div>
      )}

      {(answer.evidenceFor?.length || answer.evidenceAgainst?.length) && (
        <div>
          <button onClick={() => setShowReasoning((v) => !v)} className="inline-flex items-center gap-1 text-[11px] text-primary underline-offset-2 hover:underline">
            <ChevronDown className={cn("h-3 w-3 transition", showReasoning && "rotate-180")} /> Why this answer?
          </button>
          {showReasoning && (
            <div className="mt-1 grid gap-1 rounded-md border bg-muted/20 p-2 text-[11px]">
              {answer.evidenceFor?.length ? <div><strong>Evidence for:</strong> {answer.evidenceFor.join("; ")}</div> : null}
              {answer.evidenceAgainst?.length ? <div><strong>Evidence against:</strong> {answer.evidenceAgainst.join("; ")}</div> : null}
            </div>
          )}
        </div>
      )}

      {answer.similar && answer.similar.length > 0 && (
        <div className="space-y-1.5 rounded-md border bg-secondary/40 p-2">
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
            <History className="h-3 w-3" /> Similar prior jobs — historical evidence, not manufacturer instructions
          </div>
          {answer.similar.map((s) => (
            <div key={(s.knowledgeId ?? s.jobId)!} className="rounded border bg-card p-2 text-[11px]">
              <div className="font-medium">{s.title}</div>
              <div className="text-muted-foreground">{s.model}{s.technician ? ` · ${s.technician}` : ""}{s.approved ? " · approved case" : ""}</div>
              {s.fix && <div className="mt-1"><strong>Fix:</strong> {s.fix}</div>}
              <div className="mt-1 text-[10px] text-muted-foreground">Match: {s.reasons.join(" · ")}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t pt-2">
        <button onClick={() => setOpenFb((v) => !v)} className="text-[11px] text-muted-foreground underline-offset-2 hover:underline">
          {openFb ? "Cancel" : "Was this helpful?"}
        </button>
        <div className="text-[10px] text-muted-foreground">
          {answer.producer === "rule-block" ? "Safety gate" : answer.producer === "ai-gateway" ? "AI gateway" : "Deterministic"}
        </div>
      </div>

      {openFb && (
        <div className="space-y-2 rounded-md border bg-muted/20 p-2">
          <div className="grid grid-cols-3 gap-1.5">
            {FEEDBACK_OPTIONS.map((o) => {
              const Icon = o.icon;
              const active = fbCat === o.cat;
              return (
                <button key={o.cat} onClick={() => setFbCat(o.cat)} className={cn("inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-[11px]", active ? "border-primary bg-primary/10 text-primary" : "bg-card")}>
                  <Icon className="h-3 w-3" /> {o.label}
                </button>
              );
            })}
          </div>
          <Textarea value={fbNote} onChange={(e) => setFbNote(e.target.value)} placeholder="Optional comment for the manager…" rows={2} />
          <Button size="sm" disabled={!fbCat} onClick={submitFeedback} className="w-full">Send feedback</Button>
        </div>
      )}
    </div>
  );
}
