import { Link } from "react-router-dom";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
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
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const sourceBackedCount = state.docs.filter((doc) => doc.url && doc.url !== "#").length;
  const approvedCount = state.docs.filter((doc) => doc.status === "Approved").length;
  const reviewCount = state.docs.filter((doc) => doc.status === "Needs Review" || doc.status === "Processing").length;

  const onFile = (f: File) => {
    const d: DocItem = {
      id: `d-${Date.now()}`, title: f.name, category: "service_manual",
      url: "#", status: "Uploaded", uploadedAt: new Date().toISOString().slice(0, 10),
    };
    addDoc(d);
    toast.success(t("documents.uploadedToast"));
    setTimeout(() => promoteDoc(d.id), 800);
    setTimeout(() => promoteDoc(d.id), 1800);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="card-elev p-4">
        <h1 className="text-base font-semibold">{t("documents.title")}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{t("documents.desc")}</p>
        <input ref={fileRef} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        <Button onClick={() => fileRef.current?.click()} className="touch-target mt-3 w-full h-12"><Upload className="mr-2 h-5 w-5" /> {t("documents.upload")}</Button>
      </div>

      <div className="card-elev p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Source library focus</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Keep official or source-backed documents visible first, then work the review queue before techs depend on the content in the field.
            </div>
          </div>
          <Badge variant="outline">{state.docs.length} docs</Badge>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border bg-muted/10 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">Source-backed</div>
            <div className="mt-1 text-sm font-semibold text-foreground">{sourceBackedCount}</div>
            <div className="mt-1 text-xs text-muted-foreground">Official links or approved external source URLs are attached.</div>
          </div>
          <div className="rounded-xl border bg-muted/10 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">Approved</div>
            <div className="mt-1 text-sm font-semibold text-foreground">{approvedCount}</div>
            <div className="mt-1 text-xs text-muted-foreground">Ready for tech-facing reference without a review stop.</div>
          </div>
          <div className="rounded-xl border bg-muted/10 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">Review queue</div>
            <div className="mt-1 text-sm font-semibold text-foreground">{reviewCount}</div>
            <div className="mt-1 text-xs text-muted-foreground">Still processing or waiting on verification before field trust is appropriate.</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {state.docs.map((d) => (
          <div key={d.id} className="card-elev flex items-center gap-3 p-3">
            <Link to={`/app/documents/${d.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary"><FileText className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{d.title}</div>
                <div className="text-xs text-muted-foreground">{[d.manufacturer, d.model, d.category.replace("_", " ")].filter(Boolean).join(" - ")}</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {d.manufacturer ? <Badge variant="outline" className="text-[10px]">Manufacturer-linked</Badge> : null}
                  {d.url && d.url !== "#" ? <Badge variant="outline" className="text-[10px]">Source available</Badge> : null}
                  {d.status === "Approved" ? <Badge variant="outline" className="text-[10px]">Tech-ready</Badge> : null}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {d.url && d.url !== "#"
                    ? "Source-backed document. Open the approved record when exact page-level traceability matters."
                    : "No approved source URL is attached yet. Keep this in the review queue before relying on it in the field."}
                </div>
              </div>
            </Link>
            <span className={`stat-pill ${statusColor[d.status]}`}>{t(`documents.status.${d.status}`)}</span>
            {d.url && d.url !== "#" ? (
              <a href={d.url} target="_blank" rel="noreferrer" className="shrink-0 text-muted-foreground">
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
