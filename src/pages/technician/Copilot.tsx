import { useStore } from "@/lib/store";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VoiceInput } from "@/components/VoiceInput";
import { Send, Sparkles } from "lucide-react";
import { resolveAnswer } from "@/lib/answers/resolver";
import { findSimilarJobs } from "@/lib/answers/similarJobs";
import { AnswerCard } from "@/components/answers/AnswerCard";
import type { Answer } from "@/lib/answers/types";

interface Turn { question: string; answer: Answer; jobId?: string; }

const PROMPTS = [
  "What is the MCA?",
  "Allowed voltage range",
  "What is the line size?",
  "Show the wiring diagram",
  "What does error code 3F mean?",
  "What should I verify next?",
];

export default function Copilot() {
  const { state } = useStore();
  const job = state.jobs.find((j) => j.status === "On Site") ?? state.jobs.find((j) => j.status === "Diagnosing");
  const eq = state.equipment.find((e) => e.id === job?.equipmentId);
  const diag = job ? state.diag[job.id] : undefined;
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);

  const ctx = useMemo(() => ({
    equipment: eq,
    allEquipment: state.equipment,
    currentJobId: job?.id,
    diagCurrentStepId: diag?.currentStepId,
  }), [eq, state.equipment, job?.id, diag?.currentStepId]);

  const similarCtx = useMemo(() => ({
    equipment: eq,
    allEquipment: state.equipment,
    jobs: state.jobs,
    knowledge: state.knowledge,
    currentJobId: job?.id,
  }), [eq, state.equipment, state.jobs, state.knowledge, job?.id]);

  const send = (q?: string) => {
    const text = (q ?? input).trim(); if (!text) return;
    const answer = resolveAnswer(text, ctx);
    const similar = findSimilarJobs(text, similarCtx);
    setTurns((t) => [...t, { question: text, answer: { ...answer, similar }, jobId: job?.id }]);
    setInput("");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-secondary/30 px-4 py-2 text-[11px] text-muted-foreground">
        {eq
          ? <>Context: <strong>{eq.manufacturer} {eq.model}</strong>{job ? <> · active job</> : null}</>
          : <>No equipment is in context. Open a job or scan a nameplate to ground answers.</>}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {turns.length === 0 && (
          <div className="rounded-2xl border border-dashed bg-secondary/30 p-4 text-sm text-muted-foreground">
            Ask anything about the equipment in context. Every answer shows its source, confidence, and the safest next action. AI cannot approve repairs, close jobs, or change verified specs.
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className="space-y-2">
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-sm text-primary-foreground">{t.question}</div>
            <AnswerCard question={t.question} answer={t.answer} jobId={t.jobId} />
          </div>
        ))}
      </div>

      <div className="border-t bg-card p-3 pb-20">
        <div className="mb-2 flex flex-wrap gap-1">
          {PROMPTS.map((p) => <button key={p} onClick={() => send(p)} className="rounded-full border bg-secondary/60 px-2 py-1 text-xs">{p}</button>)}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask Copilot…" className="touch-target" />
          <VoiceInput onTranscript={(t) => setInput(t)} samplePhrase="What is the MCA?" />
          <Button type="submit" size="icon" className="touch-target"><Send className="h-5 w-5" /></Button>
        </form>
        <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <Sparkles className="h-3 w-3" /> AI runs in simulated mode — answers come from approved docs and historical jobs only.
        </div>
      </div>
    </div>
  );
}
