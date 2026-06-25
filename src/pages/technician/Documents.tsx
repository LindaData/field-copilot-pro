import { Link } from "react-router-dom";
import { useRef } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Upload, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { DocItem } from "@/lib/types";

const statusColor: Record<DocItem["status"], string> = {
  Uploaded: "bg-secondary text-secondary-foreground",
  Processing: "bg-info text-info-foreground",
  "Needs Review": "bg-warning text-warning-foreground",
  Approved: "bg-success text-success-foreground",
};

export default function Documents() {
  const { state, addDoc, promoteDoc } = useStore();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const onFile = (f: File) => {
    const d: DocItem = {
      id: `d-${Date.now()}`, title: f.name, category: "service_manual",
      url: "#", status: "Uploaded", uploadedAt: new Date().toISOString().slice(0, 10),
    };
    addDoc(d);
    toast.success("Uploaded. Auto-advancing through demo extraction…");
    setTimeout(() => promoteDoc(d.id), 800);
    setTimeout(() => promoteDoc(d.id), 1800);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="card-elev p-4">
        <h1 className="text-base font-semibold">Document library</h1>
        <p className="mt-1 text-xs text-muted-foreground">Manuals, spec sheets, wiring diagrams, and company SOPs. The Goodman GSXN3 docs are seeded.</p>
        <input ref={fileRef} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        <Button onClick={() => fileRef.current?.click()} className="touch-target mt-3 w-full h-12"><Upload className="mr-2 h-5 w-5" /> Upload document</Button>
      </div>

      <div className="flex flex-col gap-2">
        {state.docs.map((d) => (
          <Link key={d.id} to={`/app/documents/${d.id}`} className="card-elev flex items-center gap-3 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary"><FileText className="h-5 w-5" /></div>
            <div className="flex-1">
              <div className="text-sm font-semibold">{d.title}</div>
              <div className="text-xs text-muted-foreground">{[d.manufacturer, d.model, d.category.replace("_", " ")].filter(Boolean).join(" · ")}</div>
            </div>
            <span className={`stat-pill ${statusColor[d.status]}`}>{d.status}</span>
            {d.url && d.url !== "#" && <a href={d.url} target="_blank" rel="noreferrer" className="text-muted-foreground" onClick={(e) => e.stopPropagation()}><ExternalLink className="h-4 w-4" /></a>}
          </Link>
        ))}
      </div>
    </div>
  );
}
