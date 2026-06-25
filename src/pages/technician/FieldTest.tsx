import { useState } from "react";
import { useStore, useCurrentUser } from "@/lib/store";
import type { FieldFeedback } from "@/lib/qa/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Star } from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  "Open today's jobs",
  "Review customer & complaint",
  "Travel + arrival",
  "Equipment scan",
  "Specification lookup",
  "Guided diagnostic",
  "Customer approval",
  "Service report",
];

const SCRIPTS = [
  { id: 1, title: "Experienced technician — adversarial pass", body: "Intentionally challenge the assistant. Skip steps. Provide conflicting observations. Review every source. Try to make the AI invent a spec, bypass a safety control, or approve work without a signature." },
  { id: 2, title: "Junior technician — follow exactly", body: "Follow the app step by step. Flag any term you don't recognize, any step that wasn't explained, and any place the next action wasn't obvious." },
  { id: 3, title: "Owner / service manager", body: "Create and assign a job. Watch its status. Review authorization and final report. Open the QA & Release Center and decide whether you would put this in front of a paying customer tomorrow." },
];

export default function FieldTest() {
  const { state, setState } = useStore();
  const user = useCurrentUser();
  const feedback: FieldFeedback[] = (state as any).fieldFeedback ?? [];
  const [step, setStep] = useState(STEPS[0]);
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [clear, setClear] = useState<boolean | undefined>();
  const [appropriate, setAppropriate] = useState<boolean | undefined>();
  const [trust, setTrust] = useState<boolean | undefined>();
  const [wouldUse, setWouldUse] = useState<boolean | undefined>();
  const [missing, setMissing] = useState("");
  const [blocker, setBlocker] = useState("");
  const [notes, setNotes] = useState("");

  const save = () => {
    const fb: FieldFeedback = {
      id: `fb-${Date.now()}`, ts: new Date().toISOString(), userId: user.id,
      step, rating, clear, appropriate, trust, wouldUse, missing: missing || undefined, blocker: blocker || undefined, notes: notes || undefined,
    };
    setState((s) => ({ ...s, fieldFeedback: [fb, ...((s as any).fieldFeedback ?? [])] } as any));
    toast.success("Feedback saved");
    setNotes(""); setMissing(""); setBlocker("");
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <header>
        <h1 className="text-xl font-bold">Field Test Mode</h1>
        <p className="text-sm text-muted-foreground">Capture honest, structured feedback while you use the app on a real call. Stored separately from automated QA results.</p>
      </header>

      <Card className="p-3">
        <div className="text-sm font-semibold">Testing scripts</div>
        <div className="mt-2 space-y-2">
          {SCRIPTS.map((s) => (
            <details key={s.id} className="rounded-md border p-2 text-sm">
              <summary className="cursor-pointer font-medium">Script {s.id}: {s.title}</summary>
              <p className="mt-2 text-muted-foreground">{s.body}</p>
            </details>
          ))}
        </div>
      </Card>

      <Card className="p-3">
        <div className="text-sm font-semibold">Log feedback for a step</div>

        <label className="mt-2 block text-xs font-medium">Step</label>
        <select value={step} onChange={(e) => setStep(e.target.value)} className="mt-1 h-11 w-full rounded-md border bg-card px-2 text-sm">
          {STEPS.map((s) => <option key={s}>{s}</option>)}
        </select>

        <div className="mt-3">
          <div className="text-xs font-medium">Rating</div>
          <div className="mt-1 flex gap-1">
            {[1,2,3,4,5].map((n) => (
              <button key={n} onClick={() => setRating(n as any)} aria-label={`Rate ${n}`} className="touch-target">
                <Star className={`h-7 w-7 ${n <= rating ? "fill-amber-400 text-amber-500" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
        </div>

        {[
          { label: "Was the instruction clear?", val: clear, set: setClear },
          { label: "Was the recommended test appropriate?", val: appropriate, set: setAppropriate },
          { label: "Would you trust this source?", val: trust, set: setTrust },
          { label: "Would you use this on a real call?", val: wouldUse, set: setWouldUse },
        ].map((q) => (
          <div key={q.label} className="mt-3">
            <div className="text-xs font-medium">{q.label}</div>
            <div className="mt-1 flex gap-2">
              {["Yes","No"].map((opt) => (
                <Button key={opt} type="button" size="sm" variant={(q.val === (opt === "Yes")) ? "default" : "outline"} onClick={() => q.set(opt === "Yes")}>{opt}</Button>
              ))}
            </div>
          </div>
        ))}

        <label className="mt-3 block text-xs font-medium">Anything missing?</label>
        <Input value={missing} onChange={(e) => setMissing(e.target.value)} placeholder="What did you wish the app had?" className="touch-target mt-1" />

        <label className="mt-3 block text-xs font-medium">What would prevent you from using this?</label>
        <Input value={blocker} onChange={(e) => setBlocker(e.target.value)} placeholder="Biggest blocker" className="touch-target mt-1" />

        <label className="mt-3 block text-xs font-medium">Notes (use voice keyboard if you like)</label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 min-h-24" />

        <Button className="touch-target mt-3 h-12 w-full" onClick={save}>Save feedback</Button>
      </Card>

      <Card className="p-3">
        <div className="text-sm font-semibold">Recent feedback ({feedback.length})</div>
        <ul className="mt-2 space-y-2 text-xs">
          {feedback.slice(0, 10).map((f) => (
            <li key={f.id} className="rounded-md border p-2">
              <div className="flex items-center justify-between">
                <strong>{f.step}</strong>
                <span className="text-amber-600">{"★".repeat(f.rating)}{"☆".repeat(5 - f.rating)}</span>
              </div>
              <div className="text-muted-foreground">{new Date(f.ts).toLocaleString()} · {f.userId}</div>
              {f.blocker && <div className="mt-1"><strong>Blocker:</strong> {f.blocker}</div>}
              {f.notes && <div className="mt-1">{f.notes}</div>}
            </li>
          ))}
          {feedback.length === 0 && <li className="text-muted-foreground">No feedback yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
