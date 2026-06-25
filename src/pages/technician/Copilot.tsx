import { useStore } from "@/lib/store";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SourceBadge } from "@/components/SourceBadge";
import { VoiceInput } from "@/components/VoiceInput";
import { Send, Bot } from "lucide-react";
import { goodmanPdfSource } from "@/lib/seed";
import { classifyPrompt } from "@/lib/qa/safety";
import { ShieldAlert } from "lucide-react";

interface Msg { role: "user" | "ai"; text: string; nextAction?: string; confidence?: string; escalate?: string; sourceKind?: "manufacturer_verified" | "company_sop" | "demo_inference" | "technician_observation"; }

const PROMPTS = [
  "What's the MCA for the GSXN3N2410A*?",
  "What's the next step on this job?",
  "Allowed voltage range for the active unit?",
  "What should I check before replacing the capacitor?",
];

export default function Copilot() {
  const { state } = useStore();
  const job = state.jobs.find((j) => j.status === "On Site");
  const eq = state.equipment.find((e) => e.id === job?.equipmentId);
  const diag = job ? state.diag[job.id] : undefined;
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "ai", text: `I have context for your active job at ${state.customers.find(c => c.id === job?.customerId)?.name ?? "—"} on the ${eq?.manufacturer ?? "—"} ${eq?.model ?? ""}. Ask anything about specs, the diagnostic, parts, or next steps.` },
  ]);

  const reply = (q: string): Msg => {
    // 1) Safety gate — runs before any deterministic answer
    const verdict = classifyPrompt(q);
    if (verdict.allow === false) {
      return {
        role: "ai",
        text: `I can't help with that request. ${verdict.reason}`,
        sourceKind: "demo_inference",
        confidence: "Blocked",
        escalate: `Safety gate (${verdict.category}). Ask your service manager if you believe this is a valid request.`,
      };
    }
    const t = q.toLowerCase();
    if (t.includes("mca") || t.includes("ampacity")) return { role: "ai", text: "Goodman GSXN3N2410A* requires MCA 11.2 A and MOP 15 A.", sourceKind: "manufacturer_verified", confidence: "High", nextAction: "Confirm breaker matches MOP." };
    if (t.includes("voltage") && (t.includes("range") || t.includes("allowed"))) return { role: "ai", text: "Allowed line voltage range is 197 V – 253 V. Measured 229 V on this job is within range.", sourceKind: "manufacturer_verified", confidence: "High" };
    if (t.includes("line size") || t.includes("liquid") || t.includes("suction")) return { role: "ai", text: "Liquid line 3/8\" O.D., suction line 3/4\" O.D. on this unit.", sourceKind: "manufacturer_verified", confidence: "High" };
    if (t.includes("next step") || t.includes("what next")) {
      const step = diag?.currentStepId ?? "A";
      return { role: "ai", text: `You're on step ${step}. Continue inside the Diagnostic tool to keep measurements and reasoning tied to this job.`, sourceKind: "demo_inference", confidence: "Medium", nextAction: "Open Diagnostics." };
    }
    if (t.includes("capacitor") || t.includes("µf") || t.includes("uf") || t.includes("tolerance")) {
      return { role: "ai", text: "Always verify the installed component's printed label before purchasing a replacement. Treat the label as a technician observation, not a Goodman spec. Confirm against unit documentation and your approved parts database.", sourceKind: "technician_observation", confidence: "Medium", escalate: "If installed component disagrees with unit documentation, escalate." };
    }
    if (t.includes("charge") || t.includes("refrigerant")) return { role: "ai", text: "Factory charge 71 oz, applies to 15 ft of 3/8\" liquid line. Adjust per installation instructions for longer line sets.", sourceKind: "manufacturer_verified", confidence: "High" };
    // Default: abstain rather than invent.
    return { role: "ai", text: "Not found in approved documentation for this unit. Technician verification required. Try MCA, MOP, line size, allowed voltage, or refrigerant charge — or check the unit's documents tab.", sourceKind: "demo_inference", confidence: "Low" };
  };

  const send = (q?: string) => {
    const text = (q ?? input).trim(); if (!text) return;
    setMsgs((m) => [...m, { role: "user", text }, reply(text)]);
    setInput("");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-sm text-primary-foreground" : "max-w-[90%] space-y-2 rounded-2xl rounded-tl-sm bg-card px-3 py-2 text-sm shadow-sm border"}>
            {m.role === "ai" && <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary"><Bot className="h-3.5 w-3.5" /> Copilot</div>}
            <div>{m.text}</div>
            {m.role === "ai" && (m.sourceKind || m.confidence || m.nextAction || m.escalate) && (
              <div className="space-y-1 text-[11px]">
                {m.sourceKind === "manufacturer_verified" && <SourceBadge source={goodmanPdfSource} compact />}
                {m.sourceKind === "demo_inference" && <SourceBadge source={{ kind: "demo_inference", title: "Inferred from current job context" }} compact />}
                {m.sourceKind === "technician_observation" && <SourceBadge source={{ kind: "technician_observation", title: "Field guidance" }} compact />}
                {m.confidence && <div>Confidence: <strong>{m.confidence}</strong></div>}
                {m.nextAction && <div>Next action: {m.nextAction}</div>}
                {m.escalate && <div className="text-destructive">Escalate: {m.escalate}</div>}
              </div>
            )}
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
      </div>
    </div>
  );
}
