import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useStore } from "@/lib/store";
import { SourceBadge } from "@/components/SourceBadge";
import { AnswerCard } from "@/components/answers/AnswerCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronDown, ExternalLink, FileText, Search, ShieldCheck, AlertTriangle } from "lucide-react";
import type { Spec, ErrorCode, BomItem } from "@/lib/types";
import { resolveAnswer } from "@/lib/answers/resolver";
import { findSimilarJobs } from "@/lib/answers/similarJobs";
import type { Answer } from "@/lib/answers/types";

const GROUP_ORDER: Spec["group"][] = ["Capacity", "Compressor", "Fan", "Refrigeration", "Electrical", "Physical", "Certifications"];

export default function EquipmentProfile() {
  const { id = "" } = useParams();
  const { state, touchEquipment } = useStore();
  const eq = state.equipment.find((e) => e.id === id);
  const [q, setQ] = useState("");
  const [turn, setTurn] = useState<{ question: string; answer: Answer } | null>(null);
  const [openSpec, setOpenSpec] = useState<Spec | null>(null);
  const [openErr, setOpenErr] = useState<ErrorCode | null>(null);
  const [openBom, setOpenBom] = useState<BomItem | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>("Capacity");

  useEffect(() => { if (eq) touchEquipment(eq.id); }, [eq?.id]);

  const ctx = useMemo(() => ({ equipment: eq, allEquipment: state.equipment }), [eq, state.equipment]);
  const similarCtx = useMemo(() => ({ equipment: eq, allEquipment: state.equipment, jobs: state.jobs, knowledge: state.knowledge }), [eq, state.equipment, state.jobs, state.knowledge]);

  const eqJobs = useMemo(() => eq ? state.jobs.filter((j) => j.equipmentId === eq.id) : [], [eq, state.jobs]);

  if (!eq) return <div className="p-6">Not found</div>;

  const isVerified = eq.verificationStatus === "Manufacturer Verified";

  const ask = (text: string) => {
    const answer = resolveAnswer(text, ctx);
    const similar = findSimilarJobs(text, similarCtx);
    setTurn({ question: text, answer: { ...answer, similar } });
  };

  const docFor = (id?: string) => id ? state.docs.find((d) => d.id === id) : undefined;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="card-elev p-4">
        <div className="text-xs text-muted-foreground">{eq.type}</div>
        <div className="mt-0.5 flex items-center gap-2">
          <h1 className="text-lg font-semibold">{eq.manufacturer} {eq.model}</h1>
          {isVerified ? (
            <span className="stat-pill bg-success/15 text-success"><ShieldCheck className="h-3 w-3" /> Verified</span>
          ) : (
            <span className="stat-pill bg-warning/15 text-warning"><AlertTriangle className="h-3 w-3" /> Demo — Not Verified</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          Serial {eq.serial}{eq.installDate && ` · Installed ${eq.installDate}`}{eq.location && ` · ${eq.location}`}
        </div>
        {!isVerified && (
          <div className="mt-3 rounded-md border border-warning bg-warning/10 p-2 text-xs">
            <strong>Demo Equipment — Specifications Not Verified.</strong> No manufacturer specifications are displayed for this fictional demo identifier. Relationships, jobs, and service history remain available for workflow demonstration.
          </div>
        )}
        {eq.manualUrls.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2" id="documents">
            {eq.manualUrls.map((m) => (
              <a key={m.url} href={m.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border bg-secondary px-2 py-1 text-xs text-secondary-foreground hover:bg-secondary/80">
                <FileText className="h-3.5 w-3.5" /> {m.label} <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="card-elev p-4">
        <div className="mb-2 text-sm font-semibold">Ask about this unit</div>
        <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="flex gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. What is the MCA?" className="touch-target" />
          <Button type="submit" size="icon" className="touch-target"><Search className="h-5 w-5" /></Button>
        </form>
        <div className="mt-2 flex flex-wrap gap-1">
          {["What is the MCA?", "Maximum overcurrent protection?", "Line size", "Allowed voltage range", "Error code 1F", "Show wiring diagram"].map((s) => (
            <button key={s} type="button" onClick={() => { setQ(s); ask(s); }} className="rounded-full border bg-secondary/60 px-2 py-1 text-xs">{s}</button>
          ))}
        </div>
        {turn && <div className="mt-3"><AnswerCard question={turn.question} answer={turn.answer} /></div>}
      </div>

      {/* Approved Error Codes */}
      <div className="card-elev p-4">
        <div className="mb-2 text-sm font-semibold">Approved error codes</div>
        {eq.errorCodes && eq.errorCodes.length > 0 ? (
          <div className="grid gap-2">
            {eq.errorCodes.map((c) => (
              <button key={c.code} onClick={() => setOpenErr(c)} className="rounded-lg border p-2 text-left text-xs hover:bg-muted/40">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{c.code} — {c.meaning}</div>
                  <span className="text-[10px] text-muted-foreground">Details ›</span>
                </div>
                <div className="mt-0.5 text-muted-foreground line-clamp-1">Likely: {c.likelyCauses.join("; ")}</div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No approved error-code reference is currently available for this equipment.</p>
        )}
      </div>

      {/* BoM */}
      <div className="card-elev p-4">
        <div className="mb-2 text-sm font-semibold">Bill of Materials — Approved References</div>
        {eq.bom && eq.bom.length > 0 ? (
          <div className="grid gap-2">
            {eq.bom.map((b) => (
              <button key={b.ref} onClick={() => setOpenBom(b)} className="rounded-lg border p-2 text-left text-xs hover:bg-muted/40">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{b.ref} — {b.description}</div>
                  <span className="text-[10px] text-muted-foreground">Details ›</span>
                </div>
                {b.specHint && <div className="mt-0.5 text-muted-foreground line-clamp-1">{b.specHint}</div>}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No approved bill-of-materials reference is currently available.</p>
        )}
      </div>

      {/* Categories */}
      <div id="specs" className="flex flex-col gap-2">
        {eq.specs.length === 0 ? (
          <div className="card-elev p-6 text-center text-sm text-muted-foreground">
            No verified specs on file for this unit. Upload a spec sheet in <Link className="underline" to="/app/documents">Documents</Link>.
          </div>
        ) : GROUP_ORDER.map((group) => {
          const items = eq.specs.filter((s) => s.group === group);
          if (items.length === 0) return null;
          const open = openGroup === group;
          return (
            <Collapsible key={group} open={open} onOpenChange={(o) => setOpenGroup(o ? group : null)}>
              <div className="card-elev">
                <CollapsibleTrigger className="flex w-full items-center justify-between p-4">
                  <div className="text-sm font-semibold">{group}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {items.length} item{items.length === 1 ? "" : "s"}
                    <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="border-t px-4 py-3">
                  <div className="flex flex-col gap-2">
                    {items.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => setOpenSpec(s)}
                        className="rounded-lg border p-3 text-left hover:bg-muted/40"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</div>
                          <div className="text-sm font-semibold text-right">{s.value}{s.unit ? ` ${s.unit}` : ""}</div>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <SourceBadge source={s.source} compact />
                          <span className="text-[10px] text-muted-foreground">Details ›</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>

      {/* Service history (anchor) */}
      <div id="history" className="card-elev p-4">
        <div className="mb-2 text-sm font-semibold">Service history</div>
        {eqJobs.length === 0 ? (
          <div className="text-xs text-muted-foreground">No prior jobs on file.</div>
        ) : (
          <ul className="divide-y text-sm">
            {eqJobs.slice(0, 10).map((j) => (
              <li key={j.id} className="flex items-center justify-between py-2">
                <Link to={`/app/jobs/${j.id}`} className="truncate underline">{j.complaint}</Link>
                <span className="text-xs text-muted-foreground">{(j.completedAt ?? j.scheduledFor).slice(0, 10)} · {j.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Spec detail dialog */}
      <Dialog open={!!openSpec} onOpenChange={(o) => !o && setOpenSpec(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{openSpec?.label}</DialogTitle></DialogHeader>
          {openSpec && (
            <div className="space-y-2 text-sm">
              <Row k="Value" v={`${openSpec.value}${openSpec.unit ? ` ${openSpec.unit}` : ""}`} />
              <Row k="Group" v={openSpec.group} />
              <Row k="Source" v={openSpec.source.title ?? openSpec.source.kind} />
              {openSpec.sourcePage && <Row k="Page / Section" v={String(openSpec.sourcePage)} />}
              <Row k="Verification" v={openSpec.verificationStatus ?? "—"} />
              {openSpec.approvedBy && <Row k="Approved by" v={openSpec.approvedBy} />}
              {openSpec.approvedAt && <Row k="Approval date" v={openSpec.approvedAt} />}
              {openSpec.lastReviewedAt && <Row k="Last reviewed" v={openSpec.lastReviewedAt} />}
              {openSpec.notes && <Row k="Notes" v={openSpec.notes} />}
              {openSpec.conflicts && <Row k="Conflicts" v={openSpec.conflicts} />}
              <div className="pt-2">
                <SourceBadge source={openSpec.source} />
              </div>
            </div>
          )}
          <DialogFooter>
            {openSpec?.sourceDocumentId && docFor(openSpec.sourceDocumentId) && (
              <Button asChild>
                <Link to={`/app/documents/${openSpec.sourceDocumentId}`}>View source</Link>
              </Button>
            )}
            <Button variant="outline" onClick={() => setOpenSpec(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error-code detail dialog */}
      <Dialog open={!!openErr} onOpenChange={(o) => !o && setOpenErr(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{openErr?.code} — {openErr?.meaning}</DialogTitle></DialogHeader>
          {openErr && (
            <div className="space-y-2 text-sm">
              <Row k="Equipment / control" v={`${eq.manufacturer} ${eq.model}`} />
              {openErr.trigger && <Row k="Trigger" v={openErr.trigger} />}
              {openErr.approvedInterpretation && <Row k="Approved interpretation" v={openErr.approvedInterpretation} />}
              {openErr.approvedStartingPoint && <Row k="Diagnostic starting point" v={openErr.approvedStartingPoint} />}
              {openErr.safetyConsiderations && <Row k="Safety" v={openErr.safetyConsiderations} />}
              <Row k="Likely causes" v={openErr.likelyCauses.join("; ")} />
              <Row k="Safe checks" v={openErr.safeChecks.join("; ")} />
              {openErr.alternativeCauses && <Row k="Alternative causes" v={openErr.alternativeCauses.join("; ")} />}
              {openErr.sourcePage && <Row k="Page / Section" v={String(openErr.sourcePage)} />}
              {openErr.approvedBy && <Row k="Approved by" v={openErr.approvedBy} />}
              {openErr.approvedAt && <Row k="Approval date" v={openErr.approvedAt} />}
              {openErr.lastReviewedAt && <Row k="Last reviewed" v={openErr.lastReviewedAt} />}
              {openErr.approvalNotes && <Row k="Approval notes" v={openErr.approvalNotes} />}
              <div className="pt-2"><SourceBadge source={openErr.source} /></div>
            </div>
          )}
          <DialogFooter>
            {openErr?.sourceDocumentId && (
              <Button asChild><Link to={`/app/documents/${openErr.sourceDocumentId}`}>View source</Link></Button>
            )}
            <Button variant="outline" onClick={() => setOpenErr(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BoM detail dialog */}
      <Dialog open={!!openBom} onOpenChange={(o) => !o && setOpenBom(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{openBom?.ref} — {openBom?.description}</DialogTitle></DialogHeader>
          {openBom && (
            <div className="space-y-2 text-sm">
              {openBom.specHint && <Row k="Specification" v={openBom.specHint} />}
              {openBom.manufacturerPartNumber && <Row k="Manufacturer part #" v={openBom.manufacturerPartNumber} />}
              {openBom.applicability && <Row k="Applicability" v={openBom.applicability} />}
              {openBom.serialApplicability && <Row k="Serial / revision" v={openBom.serialApplicability} />}
              {openBom.supersededBy && <Row k="Superseded by" v={openBom.supersededBy} />}
              {openBom.approvedSubstitute && <Row k="Approved substitute" v={openBom.approvedSubstitute} />}
              {openBom.compatibilityStatus && <Row k="Compatibility" v={openBom.compatibilityStatus} />}
              {openBom.stockStatus && <Row k="Stock status" v={openBom.stockStatus} />}
              {openBom.supplier && <Row k="Supplier" v={openBom.supplier} />}
              {openBom.sourcePage && <Row k="Page / Section" v={String(openBom.sourcePage)} />}
              {openBom.approvalReason && <Row k="Approval reason" v={openBom.approvalReason} />}
              {openBom.approvedBy && <Row k="Approved by" v={openBom.approvedBy} />}
              {openBom.approvedAt && <Row k="Approval date" v={openBom.approvedAt} />}
              {openBom.installationNotes && <Row k="Installation notes" v={openBom.installationNotes} />}
              <div className="pt-2"><SourceBadge source={openBom.source} /></div>
            </div>
          )}
          <DialogFooter>
            {openBom?.sourceDocumentId && (
              <Button asChild><Link to={`/app/documents/${openBom.sourceDocumentId}`}>View source</Link></Button>
            )}
            <Button variant="outline" onClick={() => setOpenBom(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{k}</div>
      <div className="text-sm">{v}</div>
    </div>
  );
}
