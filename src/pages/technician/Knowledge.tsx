import { useStore } from "@/lib/store";
import { Book } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export default function Knowledge() {
  const { state } = useStore();
  const [q, setQ] = useState("");
  const cases = state.knowledge.filter((c) => !q || [c.title, c.symptom, c.cause, c.fix, c.model].some((x) => x.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="flex flex-col gap-3 p-4">
      <div>
        <h1 className="text-base font-semibold">Knowledge base</h1>
        <p className="text-xs text-muted-foreground">Prior approved repair cases. Similar cases don't override manufacturer documentation.</p>
      </div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by symptom, cause, model…" className="touch-target" />
      <div className="flex flex-col gap-2">
        {cases.map((c) => (
          <div key={c.id} className="card-elev p-3">
            <div className="flex items-center gap-2"><Book className="h-4 w-4 text-primary" /><div className="text-sm font-semibold">{c.title}</div></div>
            <div className="mt-1 text-xs text-muted-foreground">{c.model} · by {c.technician}</div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div><div className="font-medium">Symptom</div><div className="text-muted-foreground">{c.symptom}</div></div>
              <div><div className="font-medium">Cause</div><div className="text-muted-foreground">{c.cause}</div></div>
              <div><div className="font-medium">Fix</div><div className="text-muted-foreground">{c.fix}</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
