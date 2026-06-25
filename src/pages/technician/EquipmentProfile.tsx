import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { SourceBadge } from "@/components/SourceBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, FileText, Search } from "lucide-react";
import type { Spec } from "@/lib/types";

const GROUP_ORDER: Spec["group"][] = ["Capacity", "Compressor", "Fan", "Refrigeration", "Electrical", "Physical", "Certifications"];

export default function EquipmentProfile() {
  const { id = "" } = useParams();
  const { state } = useStore();
  const eq = state.equipment.find((e) => e.id === id);
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<null | { text: string; spec?: Spec }>(null);

  if (!eq) return <div className="p-6">Not found</div>;

  const ask = (text: string) => {
    const t = text.toLowerCase();
    const match = eq.specs.find((s) =>
      s.label.toLowerCase().includes(t)
      || s.key.toLowerCase().includes(t)
      || (t.includes("mca") && s.key === "mca")
      || (t.includes("line") && s.key.includes("line"))
      || ((t.includes("max") && t.includes("volt")) && s.key === "vrange")
      || ((t.includes("mop") || t.includes("overcurrent")) && s.key === "mop")
      || ((t.includes("charge") || t.includes("refrigerant")) && s.key === "charge")
      || ((t.includes("source") || t.includes("where")) && s.key === "mca")
    );
    if (match) {
      setAnswer({ text: `${match.label}: ${match.value}`, spec: match });
    } else {
      setAnswer({ text: "Not found in current documents. Try MCA, MOP, line size, max voltage, or refrigerant charge." });
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="card-elev p-4">
        <div className="text-xs text-muted-foreground">{eq.type}</div>
        <h1 className="text-lg font-semibold">{eq.manufacturer} {eq.model}</h1>
        <div className="text-xs text-muted-foreground">Serial {eq.serial}{eq.installDate && ` · Installed ${eq.installDate}`}{eq.location && ` · ${eq.location}`}</div>
        {eq.manualUrls.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {eq.manualUrls.map((m) => (
              <a key={m.url} href={m.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border bg-secondary px-2 py-1 text-xs text-secondary-foreground hover:bg-secondary/80">
                <FileText className="h-3.5 w-3.5" /> {m.label} <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="card-elev p-4">
        <div className="mb-2 text-sm font-semibold">Ask about this equipment</div>
        <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="flex gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. What is the MCA?" className="touch-target" />
          <Button type="submit" size="icon" className="touch-target"><Search className="h-5 w-5" /></Button>
        </form>
        <div className="mt-2 flex flex-wrap gap-1">
          {["What is the MCA?", "What line size?", "Max voltage", "Refrigerant charge", "Where did this value come from?"].map((s) => (
            <button key={s} onClick={() => { setQ(s); ask(s); }} className="rounded-full border bg-secondary/60 px-2 py-1 text-xs">{s}</button>
          ))}
        </div>
        {answer && (
          <div className="mt-3 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="font-medium">{answer.text}</div>
            {answer.spec && <div className="mt-2"><SourceBadge source={answer.spec.source} /></div>}
          </div>
        )}
      </div>

      {eq.specs.length === 0 ? (
        <div className="card-elev p-6 text-center text-sm text-muted-foreground">No verified specs on file for this unit yet. Upload a spec sheet in <Link className="underline" to="/app/documents">Documents</Link>.</div>
      ) : (
        GROUP_ORDER.map((group) => {
          const items = eq.specs.filter((s) => s.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="card-elev p-4">
              <div className="mb-2 text-sm font-semibold">{group}</div>
              <div className="flex flex-col gap-2">
                {items.map((s) => (
                  <div key={s.key} className="rounded-lg border p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</div>
                      <div className="text-sm font-semibold text-right">{s.value}</div>
                    </div>
                    <div className="mt-2"><SourceBadge source={s.source} compact /></div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
