import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { SourceBadge } from "@/components/SourceBadge";
import { AnswerCard } from "@/components/answers/AnswerCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, ChevronDown, ExternalLink, FileText, Library, Search, ShieldCheck, AlertTriangle } from "lucide-react";
import type { Spec, ErrorCode, BomItem } from "@/lib/types";
import { resolveAnswer } from "@/lib/answers/resolver";
import { findSimilarJobs } from "@/lib/answers/similarJobs";
import type { Answer } from "@/lib/answers/types";
import { useStatusLabel } from "@/i18n/status";
import { useDynamicText } from "@/i18n/dynamic";
import { manufacturerDocsForEquipment, sourceForManufacturerRecord } from "@/lib/manufacturerSources";
import { documentationQualityLabel, documentationResearchForEquipment, documentationStatusLabel } from "@/lib/hvacTop50";

const GROUP_ORDER: Spec["group"][] = ["Capacity", "Compressor", "Fan", "Refrigeration", "Electrical", "Physical", "Certifications"];

function confidenceClass(confidence?: string) {
  if (confidence === "high") return "bg-success/15 text-success";
  if (confidence === "medium") return "bg-info/15 text-info";
  return "bg-warning/15 text-warning";
}

export default function EquipmentProfile() {
  const { id = "" } = useParams();
  const { state, touchEquipment } = useStore();
  const { t } = useTranslation();
  const statusLabel = useStatusLabel();
  const tx = useDynamicText();
  const eq = state.equipment.find((e) => e.id === id);
  const [q, setQ] = useState("");
  const [turn, setTurn] = useState<{ question: string; answer: Answer } | null>(null);
  const [openSpec, setOpenSpec] = useState<Spec | null>(null);
  const [openErr, setOpenErr] = useState<ErrorCode | null>(null);
  const [openBom, setOpenBom] = useState<BomItem | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>("Capacity");
  const touchEquipmentRef = useRef(touchEquipment);

  useEffect(() => {
    touchEquipmentRef.current = touchEquipment;
  }, [touchEquipment]);

  useEffect(() => {
    if (eq?.id) touchEquipmentRef.current(eq.id);
  }, [eq?.id]);

  const ctx = useMemo(() => ({ equipment: eq, allEquipment: state.equipment }), [eq, state.equipment]);
  const similarCtx = useMemo(() => ({ equipment: eq, allEquipment: state.equipment, jobs: state.jobs, knowledge: state.knowledge }), [eq, state.equipment, state.jobs, state.knowledge]);
  const eqJobs = useMemo(() => eq ? state.jobs.filter((j) => j.equipmentId === eq.id) : [], [eq, state.jobs]);
  const manufacturerDocs = useMemo(() => eq ? manufacturerDocsForEquipment(eq) : [], [eq]);
  const researchDocs = useMemo(() => eq ? documentationResearchForEquipment(eq).slice(0, 5) : [], [eq]);
  const quickSpecs = useMemo(() => {
    if (!eq) return [];
    const preferredKeys = ["mca", "mop", "vrange", "charge"];
    const preferred = eq.specs.filter((spec) => preferredKeys.includes(spec.key));
    return (preferred.length > 0 ? preferred : eq.specs).slice(0, 4);
  }, [eq]);

  if (!eq) return <div className="p-6">{t("equipmentProfile.notFound")}</div>;

  const isVerified = eq.verificationStatus === "Manufacturer Verified";
  const verifiedSpecs = eq.specs.filter((spec) => spec.verificationStatus === "Manufacturer Verified").length;
  const ask = (text: string) => {
    const answer = resolveAnswer(text, ctx);
    const similar = findSimilarJobs(text, similarCtx);
    setTurn({ question: text, answer: { ...answer, similar } });
  };

  const docFor = (docId?: string) => docId ? state.docs.find((doc) => doc.id === docId) : undefined;
  const prompts = [
    t("copilot.prompts.mca"),
    "Maximum overcurrent protection?",
    t("copilot.prompts.line"),
    t("copilot.prompts.voltage"),
    t("equipmentProfile.docReaderPrompt"),
    "Error code 1F",
    t("copilot.prompts.wiring"),
  ];

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="card-elev p-4">
        <div className="text-xs text-muted-foreground">{eq.type}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold">{eq.manufacturer} {eq.model}</h1>
          {isVerified ? (
            <span className="stat-pill bg-success/15 text-success"><ShieldCheck className="h-3 w-3" /> {t("equipmentList.verified")}</span>
          ) : (
            <span className="stat-pill bg-warning/15 text-warning"><AlertTriangle className="h-3 w-3" /> {t("equipmentList.demoNotVerified")}</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          Serial {eq.serial}{eq.installDate ? ` - ${t("equipmentList.installed")} ${eq.installDate}` : ""}{eq.location ? ` - ${eq.location}` : ""}
        </div>
        {!isVerified ? (
          <div className="mt-3 rounded-md border border-warning bg-warning/10 p-2 text-xs">
            {t("equipmentProfile.demoBanner")}
          </div>
        ) : null}
        {eq.manualUrls.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {eq.manualUrls.map((manual) => (
              <a key={manual.url} href={manual.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border bg-secondary px-2 py-1 text-xs text-secondary-foreground hover:bg-secondary/80">
                <FileText className="h-3.5 w-3.5" /> {manual.label} <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        ) : null}
      </div>

      <div className="card-elev p-4">
        <div className="text-sm font-semibold">At a glance</div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Linked docs</div>
            <div className="mt-1 text-lg font-semibold">{manufacturerDocs.length + researchDocs.length}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Related jobs</div>
            <div className="mt-1 text-lg font-semibold">{eqJobs.length}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Verified specs</div>
            <div className="mt-1 text-lg font-semibold">{verifiedSpecs}/{eq.specs.length}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Install context</div>
            <div className="mt-1 text-sm font-semibold">{eq.location ?? "No location tagged"}</div>
          </div>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <a href="#docs" className="rounded-full border px-3 py-1 text-xs font-medium">Docs</a>
          <a href="#specs" className="rounded-full border px-3 py-1 text-xs font-medium">Specs</a>
          <a href="#assistant" className="rounded-full border px-3 py-1 text-xs font-medium">Ask</a>
          <a href="#history" className="rounded-full border px-3 py-1 text-xs font-medium">History</a>
        </div>
      </div>

      {(manufacturerDocs.length > 0 || researchDocs.length > 0) ? (
        <div id="docs" className="card-elev scroll-mt-24 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Documentation</div>
              <p className="mt-1 text-xs text-muted-foreground">Official source pointers first, then best-effort matches tied back to this equipment.</p>
            </div>
            <span className={`stat-pill ${isVerified ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>{isVerified ? "Verified" : "Review required"}</span>
          </div>
          <Tabs defaultValue={manufacturerDocs.length > 0 ? "official" : "research"} className="mt-3">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="official">Official docs</TabsTrigger>
              <TabsTrigger value="research">Research matches</TabsTrigger>
            </TabsList>
            <TabsContent value="official" className="mt-3 space-y-2">
              {manufacturerDocs.length > 0 ? manufacturerDocs.map((doc) => (
                <div key={doc.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">{doc.title}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{doc.aiIndexSummary}</div>
                    </div>
                    <a href={doc.url} target="_blank" rel="noreferrer" className="shrink-0 text-muted-foreground hover:text-foreground" aria-label={t("documentViewer.openSource")}>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  <div className="mt-2">
                    <SourceBadge source={sourceForManufacturerRecord(doc)} compact />
                  </div>
                </div>
              )) : <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">No official model-matched literature is linked yet for this record.</div>}
            </TabsContent>
            <TabsContent value="research" className="mt-3 space-y-2">
              {researchDocs.length > 0 ? researchDocs.map((doc) => (
                <a key={doc.id} href={doc.documentUrl} target="_blank" rel="noreferrer" className="block rounded-lg border p-3 hover:bg-muted/40">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">{doc.manufacturer} {doc.equipmentModel}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{doc.documentTitle}</div>
                    </div>
                    <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="stat-pill bg-secondary text-secondary-foreground">{documentationQualityLabel(doc)}</span>
                    <span className={`stat-pill ${confidenceClass(doc.confidence)}`}>{documentationStatusLabel(doc)}</span>
                    {doc.rank ? <span className="stat-pill bg-muted text-muted-foreground">{t("equipmentProfile.top50Rank", { rank: doc.rank })}</span> : null}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">{doc.notes}</div>
                </a>
              )) : <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">No research matches have been attached to this equipment yet.</div>}
            </TabsContent>
          </Tabs>
        </div>
      ) : null}

      {quickSpecs.length > 0 ? (
        <div className="card-elev p-4">
          <div className="text-sm font-semibold">Quick facts</div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {quickSpecs.map((spec) => (
              <button key={spec.key} onClick={() => setOpenSpec(spec)} className="rounded-lg border p-3 text-left hover:bg-muted/30">
                <div className="text-[11px] uppercase text-muted-foreground">{spec.label}</div>
                <div className="mt-1 text-base font-semibold">{spec.value}{spec.unit ? ` ${spec.unit}` : ""}</div>
                <div className="mt-2"><SourceBadge source={spec.source} compact /></div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div id="assistant" className="card-elev scroll-mt-24 p-4">
        <div className="mb-2 text-sm font-semibold">{t("equipmentProfile.askAbout")}</div>
        <form onSubmit={(event) => { event.preventDefault(); ask(q); }} className="flex gap-2">
          <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder={t("equipmentProfile.askPlaceholder")} className="touch-target" />
          <Button type="submit" size="icon" className="touch-target"><Search className="h-5 w-5" /></Button>
        </form>
        <div className="mt-2 flex flex-wrap gap-1">
          {prompts.map((prompt) => (
            <button key={prompt} type="button" onClick={() => { setQ(prompt); ask(prompt); }} className="rounded-full border bg-secondary/60 px-2 py-1 text-xs">{prompt}</button>
          ))}
        </div>
        {turn ? <div className="mt-3"><AnswerCard question={turn.question} answer={turn.answer} /></div> : null}
      </div>

      <div className="card-elev p-4">
        <div className="mb-2 text-sm font-semibold">{t("equipmentProfile.errorCodes")}</div>
        {eq.errorCodes && eq.errorCodes.length > 0 ? (
          <div className="grid gap-2">
            {eq.errorCodes.map((code) => (
              <button key={code.code} onClick={() => setOpenErr(code)} className="rounded-lg border p-2 text-left text-xs hover:bg-muted/40">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{code.code} - {code.meaning}</div>
                  <span className="text-[10px] text-muted-foreground">{t("equipmentProfile.details")}</span>
                </div>
                <div className="mt-0.5 line-clamp-1 text-muted-foreground">{t("equipmentProfile.likely", { value: code.likelyCauses.join("; ") })}</div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t("equipmentProfile.noErrorCodes")}</p>
        )}
      </div>

      <div className="card-elev p-4">
        <div className="mb-2 text-sm font-semibold">{t("equipmentProfile.bom")}</div>
        {eq.bom && eq.bom.length > 0 ? (
          <div className="grid gap-2">
            {eq.bom.map((item) => (
              <button key={item.ref} onClick={() => setOpenBom(item)} className="rounded-lg border p-2 text-left text-xs hover:bg-muted/40">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{item.ref} - {item.description}</div>
                  <span className="text-[10px] text-muted-foreground">{t("equipmentProfile.details")}</span>
                </div>
                {item.specHint ? <div className="mt-0.5 line-clamp-1 text-muted-foreground">{item.specHint}</div> : null}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t("equipmentProfile.noBom")}</p>
        )}
      </div>

      <div id="specs" className="scroll-mt-24">
        <div className="mb-2">
          <div className="text-sm font-semibold">Specifications and traceability</div>
          <div className="text-xs text-muted-foreground">Tap a value to see the source, verification state, and linked document.</div>
        </div>
        <div className="flex flex-col gap-2">
          {eq.specs.length === 0 ? (
            <div className="card-elev p-6 text-center text-sm text-muted-foreground">
              {t("equipmentProfile.noSpecs")} <Link className="underline" to="/app/documents">{t("nav.more")}</Link>.
            </div>
          ) : GROUP_ORDER.map((group) => {
            const items = eq.specs.filter((spec) => spec.group === group);
            if (items.length === 0) return null;
            const open = openGroup === group;
            return (
              <Collapsible key={group} open={open} onOpenChange={(nextOpen) => setOpenGroup(nextOpen ? group : null)}>
                <div className="card-elev">
                  <CollapsibleTrigger className="flex w-full items-center justify-between p-4">
                    <div className="text-sm font-semibold">{t(`equipmentProfile.groups.${group}`)}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {items.length} {items.length === 1 ? t("equipmentProfile.item") : t("equipmentProfile.items")}
                      <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t px-4 py-3">
                    <div className="flex flex-col gap-2">
                      {items.map((spec) => (
                        <button key={spec.key} onClick={() => setOpenSpec(spec)} className="rounded-lg border p-3 text-left hover:bg-muted/40">
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="text-xs uppercase tracking-wide text-muted-foreground">{spec.label}</div>
                            <div className="text-sm font-semibold text-right">{spec.value}{spec.unit ? ` ${spec.unit}` : ""}</div>
                          </div>
                          <div className="mt-1.5 flex items-center justify-between gap-2">
                            <SourceBadge source={spec.source} compact />
                            <span className="text-[10px] text-muted-foreground">{t("equipmentProfile.details")}</span>
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
      </div>

      <div id="history" className="card-elev scroll-mt-24 p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-sm font-semibold">{t("equipmentProfile.serviceHistory")}</div>
          <span className="text-xs text-muted-foreground">{eqJobs.length} records</span>
        </div>
        {eqJobs.length === 0 ? (
          <div className="text-xs text-muted-foreground">{t("equipmentProfile.noPriorJobs")}</div>
        ) : (
          <ul className="divide-y text-sm">
            {eqJobs.slice(0, 10).map((job) => (
              <li key={job.id} className="flex items-center justify-between py-2">
                <Link to={`/app/jobs/${job.id}`} className="truncate underline">{tx(job.complaint)}</Link>
                <span className="text-xs text-muted-foreground">{(job.completedAt ?? job.scheduledFor).slice(0, 10)} - {statusLabel(job.status)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={!!openSpec} onOpenChange={(open) => !open && setOpenSpec(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{openSpec?.label}</DialogTitle></DialogHeader>
          {openSpec ? (
            <div className="space-y-2 text-sm">
              <Row k={t("equipmentProfile.row.value")} v={`${openSpec.value}${openSpec.unit ? ` ${openSpec.unit}` : ""}`} />
              <Row k={t("equipmentProfile.row.group")} v={t(`equipmentProfile.groups.${openSpec.group}`)} />
              <Row k={t("equipmentProfile.row.source")} v={openSpec.source.title ?? openSpec.source.kind} />
              {openSpec.sourcePage ? <Row k={t("equipmentProfile.row.page")} v={String(openSpec.sourcePage)} /> : null}
              <Row k={t("equipmentProfile.row.verification")} v={openSpec.verificationStatus ?? "-"} />
              {openSpec.approvedBy ? <Row k={t("equipmentProfile.row.approvedBy")} v={openSpec.approvedBy} /> : null}
              {openSpec.approvedAt ? <Row k={t("equipmentProfile.row.approvalDate")} v={openSpec.approvedAt} /> : null}
              {openSpec.lastReviewedAt ? <Row k={t("equipmentProfile.row.lastReviewed")} v={openSpec.lastReviewedAt} /> : null}
              {openSpec.notes ? <Row k={t("equipmentProfile.row.notes")} v={openSpec.notes} /> : null}
              {openSpec.conflicts ? <Row k={t("equipmentProfile.row.conflicts")} v={openSpec.conflicts} /> : null}
              <div className="pt-2">
                <SourceBadge source={openSpec.source} />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            {openSpec?.sourceDocumentId && docFor(openSpec.sourceDocumentId) ? (
              <Button asChild>
                <Link to={`/app/documents/${openSpec.sourceDocumentId}`}>{t("equipmentProfile.viewSource")}</Link>
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setOpenSpec(null)}>{t("common.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!openErr} onOpenChange={(open) => !open && setOpenErr(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{openErr?.code} - {openErr?.meaning}</DialogTitle></DialogHeader>
          {openErr ? (
            <div className="space-y-2 text-sm">
              <Row k={t("equipmentProfile.row.equipment")} v={`${eq.manufacturer} ${eq.model}`} />
              {openErr.trigger ? <Row k={t("equipmentProfile.row.trigger")} v={openErr.trigger} /> : null}
              {openErr.approvedInterpretation ? <Row k={t("equipmentProfile.row.approvedInterp")} v={openErr.approvedInterpretation} /> : null}
              {openErr.approvedStartingPoint ? <Row k={t("equipmentProfile.row.diagStart")} v={openErr.approvedStartingPoint} /> : null}
              {openErr.safetyConsiderations ? <Row k={t("equipmentProfile.row.safety")} v={openErr.safetyConsiderations} /> : null}
              <Row k={t("equipmentProfile.row.likelyCauses")} v={openErr.likelyCauses.join("; ")} />
              <Row k={t("equipmentProfile.row.safeChecks")} v={openErr.safeChecks.join("; ")} />
              {openErr.alternativeCauses ? <Row k={t("equipmentProfile.row.altCauses")} v={openErr.alternativeCauses.join("; ")} /> : null}
              {openErr.sourcePage ? <Row k={t("equipmentProfile.row.page")} v={String(openErr.sourcePage)} /> : null}
              {openErr.approvedBy ? <Row k={t("equipmentProfile.row.approvedBy")} v={openErr.approvedBy} /> : null}
              {openErr.approvedAt ? <Row k={t("equipmentProfile.row.approvalDate")} v={openErr.approvedAt} /> : null}
              {openErr.lastReviewedAt ? <Row k={t("equipmentProfile.row.lastReviewed")} v={openErr.lastReviewedAt} /> : null}
              {openErr.approvalNotes ? <Row k={t("equipmentProfile.row.approvalNotes")} v={openErr.approvalNotes} /> : null}
              <div className="pt-2"><SourceBadge source={openErr.source} /></div>
            </div>
          ) : null}
          <DialogFooter>
            {openErr?.sourceDocumentId ? (
              <Button asChild><Link to={`/app/documents/${openErr.sourceDocumentId}`}>{t("equipmentProfile.viewSource")}</Link></Button>
            ) : null}
            <Button variant="outline" onClick={() => setOpenErr(null)}>{t("common.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!openBom} onOpenChange={(open) => !open && setOpenBom(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{openBom?.ref} - {openBom?.description}</DialogTitle></DialogHeader>
          {openBom ? (
            <div className="space-y-2 text-sm">
              {openBom.specHint ? <Row k={t("equipmentProfile.row.spec")} v={openBom.specHint} /> : null}
              {openBom.manufacturerPartNumber ? <Row k={t("equipmentProfile.row.mfgPart")} v={openBom.manufacturerPartNumber} /> : null}
              {openBom.applicability ? <Row k={t("equipmentProfile.row.applicability")} v={openBom.applicability} /> : null}
              {openBom.serialApplicability ? <Row k={t("equipmentProfile.row.serialRev")} v={openBom.serialApplicability} /> : null}
              {openBom.supersededBy ? <Row k={t("equipmentProfile.row.supersededBy")} v={openBom.supersededBy} /> : null}
              {openBom.approvedSubstitute ? <Row k={t("equipmentProfile.row.approvedSub")} v={openBom.approvedSubstitute} /> : null}
              {openBom.compatibilityStatus ? <Row k={t("equipmentProfile.row.compatibility")} v={openBom.compatibilityStatus} /> : null}
              {openBom.stockStatus ? <Row k={t("equipmentProfile.row.stockStatus")} v={openBom.stockStatus} /> : null}
              {openBom.supplier ? <Row k={t("equipmentProfile.row.supplier")} v={openBom.supplier} /> : null}
              {openBom.sourcePage ? <Row k={t("equipmentProfile.row.page")} v={String(openBom.sourcePage)} /> : null}
              {openBom.approvalReason ? <Row k={t("equipmentProfile.row.approvalReason")} v={openBom.approvalReason} /> : null}
              {openBom.approvedBy ? <Row k={t("equipmentProfile.row.approvedBy")} v={openBom.approvedBy} /> : null}
              {openBom.approvedAt ? <Row k={t("equipmentProfile.row.approvalDate")} v={openBom.approvedAt} /> : null}
              {openBom.installationNotes ? <Row k={t("equipmentProfile.row.installNotes")} v={openBom.installationNotes} /> : null}
              <div className="pt-2"><SourceBadge source={openBom.source} /></div>
            </div>
          ) : null}
          <DialogFooter>
            {openBom?.sourceDocumentId ? (
              <Button asChild><Link to={`/app/documents/${openBom.sourceDocumentId}`}>{t("equipmentProfile.viewSource")}</Link></Button>
            ) : null}
            <Button variant="outline" onClick={() => setOpenBom(null)}>{t("common.close")}</Button>
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
