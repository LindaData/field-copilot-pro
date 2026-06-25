import { useParams, Link, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SourceBadge } from "@/components/SourceBadge";
import { ExternalLink, FileText, ShieldCheck, AlertTriangle } from "lucide-react";
import { goodmanPdfSource } from "@/lib/seed";

type ViewerState =
  | "Document Available"
  | "Processing"
  | "Needs Review"
  | "Approved"
  | "Source Unavailable"
  | "Preview Unavailable — Open Source";

export default function DocumentViewer() {
  const { id = "" } = useParams();
  const { state } = useStore();
  const [params] = useSearchParams();
  const focusKey = params.get("spec");

  const doc = state.docs.find((d) => d.id === id);
  const specs = useMemo(
    () => state.equipment.flatMap((e) => e.specs.map((s) => ({ s, eq: e }))).filter(({ s }) => s.sourceDocumentId === id),
    [state.equipment, id],
  );

  const [embedFailed, setEmbedFailed] = useState(false);
  useEffect(() => { setEmbedFailed(false); }, [id]);

  if (!doc) return <div className="p-6">Not found</div>;

  const hasRealUrl = !!doc.url && doc.url !== "#";
  const viewerState: ViewerState =
    !hasRealUrl ? "Source Unavailable" :
    embedFailed ? "Preview Unavailable — Open Source" :
    (doc.status === "Approved" ? "Approved" :
      doc.status === "Needs Review" ? "Needs Review" :
      doc.status === "Processing" ? "Processing" : "Document Available");

  const stateBadge =
    viewerState === "Approved" ? "bg-success/15 text-success" :
    viewerState === "Needs Review" ? "bg-warning/15 text-warning" :
    viewerState === "Processing" ? "bg-info/15 text-info" :
    viewerState === "Document Available" ? "bg-primary/10 text-primary" :
    "bg-destructive/10 text-destructive";

  const PreviewPane = (
    <div className="rounded-md border bg-muted">
      {hasRealUrl && !embedFailed ? (
        <object
          data={doc.url}
          type="application/pdf"
          className="h-[70vh] w-full rounded-md"
          onError={() => setEmbedFailed(true)}
        >
          <iframe
            src={doc.url}
            title={doc.title}
            className="h-[70vh] w-full rounded-md"
            onError={() => setEmbedFailed(true)}
          />
        </object>
      ) : (
        <div className="flex h-[70vh] flex-col items-center justify-center gap-3 p-6 text-center text-sm">
          <FileText className="h-10 w-10 text-muted-foreground" />
          <div className="font-medium">
            {hasRealUrl
              ? "Preview unavailable in this browser."
              : "No approved document is currently available for this entry."}
          </div>
          {hasRealUrl ? (
            <Button asChild>
              <a href={doc.url} target="_blank" rel="noreferrer">
                Open official source <ExternalLink className="ml-1 h-4 w-4" />
              </a>
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Upload an approved copy of this document, or add an official source URL in the document record.
            </p>
          )}
        </div>
      )}
    </div>
  );

  const SpecsPane = (
    <div className="rounded-md border p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Extracted specifications</div>
      {specs.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">No specifications are linked to this document yet.</p>
      ) : (
        <ul className="mt-2 divide-y text-sm">
          {specs.map(({ s, eq }) => {
            const focused = focusKey && (s.key === focusKey || s.label.toLowerCase() === focusKey.toLowerCase());
            return (
              <li
                key={`${eq.id}-${s.key}`}
                className={`flex flex-col gap-1 py-2 ${focused ? "rounded-md bg-primary/5 px-2" : ""}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</span>
                  <span className="text-sm font-semibold">{s.value}{s.unit ? ` ${s.unit}` : ""}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{s.sourcePage ?? "—"}</span>
                  <Link to={`/app/equipment/${eq.id}#specs`} className="underline">Open on {eq.manufacturer} {eq.model}</Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  return (
    <div className="p-4">
      <div className="card-elev p-4">
        <div className="text-xs text-muted-foreground">{doc.category.replace("_", " ")}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <h1 className="text-base font-semibold">{doc.title}</h1>
          <span className={`stat-pill ${stateBadge}`}>
            {viewerState === "Approved" ? <ShieldCheck className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />} {viewerState}
          </span>
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          Uploaded {doc.uploadedAt}{doc.manufacturer && ` · ${doc.manufacturer}`}{doc.model && ` ${doc.model}`}
        </div>
        {hasRealUrl && (
          <a href={doc.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-info underline">
            Open official source <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Desktop: side-by-side. Mobile: tabs. */}
      <div className="mt-4 hidden gap-4 md:grid md:grid-cols-2">
        {PreviewPane}
        {SpecsPane}
      </div>

      <div className="mt-4 md:hidden">
        <Tabs defaultValue="document">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="document">Document</TabsTrigger>
            <TabsTrigger value="specs">Extracted Specs</TabsTrigger>
          </TabsList>
          <TabsContent value="document" className="mt-3">{PreviewPane}</TabsContent>
          <TabsContent value="specs" className="mt-3">{SpecsPane}</TabsContent>
        </Tabs>
      </div>

      <div className="mt-4">
        <SourceBadge source={doc.id === "d-2" ? goodmanPdfSource : { kind: "verification_required", title: doc.title }} />
      </div>

      <div className="mt-4 text-center"><Link className="text-sm underline" to="/app/documents">← Back to documents</Link></div>
    </div>
  );
}
