import { useStore } from "@/lib/store";
import { useTranslation } from "react-i18next";
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

export default function Copilot() {
  const { state } = useStore();
  const { t } = useTranslation();
  const job = state.jobs.find((j) => j.status === "On Site") ?? state.jobs.find((j) => j.status === "Diagnosing");
  const eq = state.equipment.find((e) => e.id === job?.equipmentId);
  const diag = job ? state.diag[job.id] : undefined;
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);

  const PROMPTS = [
    t("copilot.prompts.mca"),
    t("copilot.prompts.voltage"),
    t("copilot.prompts.line"),
    t("copilot.prompts.wiring"),
    t("copilot.prompts.err3F"),
    t("copilot.prompts.next"),
  ];

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
          ? <>{t("copilot.contextPrefix")} <strong>{eq.manufacturer} {eq.model}</strong>{job ? <> · {t("copilot.activeJob")}</> : null}</>
          : <>{t("copilot.noContext")}</>}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {turns.length === 0 && (
          <div className="rounded-2xl border border-dashed bg-secondary/30 p-4 text-sm text-muted-foreground">
            {t("copilot.emptyHelp")}
          </div>
        )}
        {turns.map((tu, i) => (
          <div key={i} className="space-y-2">
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-sm text-primary-foreground">{tu.question}</div>
            <AnswerCard question={tu.question} answer={tu.answer} jobId={tu.jobId} />
          </div>
        ))}
      </div>

      <div className="border-t bg-card p-3 pb-20">
        <div className="mb-2 flex flex-wrap gap-1">
          {PROMPTS.map((p) => <button key={p} onClick={() => send(p)} className="rounded-full border bg-secondary/60 px-2 py-1 text-xs">{p}</button>)}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("copilot.askPlaceholder")} className="touch-target" />
          <VoiceInput onTranscript={(t) => setInput(t)} samplePhrase={t("copilot.prompts.mca")} />
          <Button type="submit" size="icon" className="touch-target"><Send className="h-5 w-5" /></Button>
        </form>
        <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <Sparkles className="h-3 w-3" /> {t("copilot.simulatedMode")}
        </div>
      </div>
    </div>
  );
}
