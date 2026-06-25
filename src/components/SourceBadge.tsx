import { ShieldCheck, FileText, History, Eye, AlertTriangle, ExternalLink } from "lucide-react";
import type { Source, SourceKind } from "@/lib/types";
import { cn } from "@/lib/utils";

const meta: Record<SourceKind, { label: string; icon: typeof ShieldCheck; classes: string }> = {
  manufacturer_verified: { label: "Manufacturer verified", icon: ShieldCheck, classes: "bg-success/15 text-success border-success/30" },
  company_sop: { label: "Company SOP", icon: FileText, classes: "bg-info/15 text-info border-info/30" },
  prior_job: { label: "Prior job evidence", icon: History, classes: "bg-primary/10 text-primary border-primary/20" },
  technician_observation: { label: "Technician observation", icon: Eye, classes: "bg-accent/20 text-accent-foreground border-accent/40" },
  demo_inference: { label: "Demo inference — verify before use", icon: AlertTriangle, classes: "bg-destructive/10 text-destructive border-destructive/30" },
};

export function SourceBadge({ source, compact = false }: { source: Source; compact?: boolean }) {
  const m = meta[source.kind];
  const Icon = m.icon;
  return (
    <div className={cn("inline-flex flex-col gap-1 rounded-md border px-2 py-1 text-xs", m.classes)}>
      <span className="inline-flex items-center gap-1 font-semibold">
        <Icon className="h-3.5 w-3.5" />
        {m.label}
      </span>
      {!compact && (
        <span className="text-[11px] opacity-90">
          {source.title}{source.ref ? ` · ${source.ref}` : ""}
          {source.url && (
            <a href={source.url} target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center gap-0.5 underline underline-offset-2">
              View source <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </span>
      )}
    </div>
  );
}
