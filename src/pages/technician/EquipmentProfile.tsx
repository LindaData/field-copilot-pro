import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
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
import { useStatusLabel } from "@/i18n/status";
import { useDynamicText } from "@/i18n/dynamic";

const GROUP_ORDER: Spec["group"][] = ["Capacity", "Compressor", "Fan", "Refrigeration", "Electrical", "Physical", "Certifications"];

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

  useEffect(() => { if (eq) touchEquipment(eq.id); }, [eq?.id]);

  const ctx = useMemo(() => ({ equipment: eq, allEquipment: state.equipment }), [eq, state.equipment]);
  const similarCtx = useMemo(() => ({ equipment: eq, allEquipment: state.equipment, jobs: state.jobs, knowledge: state.knowledge }), [eq, state.equipment, state.jobs, state.knowledge]);

  const eqJobs = useMemo(() => eq ? state.jobs.filter((j) => j.equipmentId === eq.id) : [], [eq, state.jobs]);

  if (!eq) return <div className="p-6">{t("equipmentProfile.notFound")}</div>;

  const isVerified = eq.verificationStatus === "Manufacturer Verified";

  const ask = (text: string) => {
    const answer = resolveAnswer(text, ctx);
    const similar = findSimilarJobs(text, similarCtx);
    setTurn({ question: text, answer: { ...answer, similar } });
  };

  const docFor = (id?: string) => id ? state.docs.find((d) => d.id === id) : undefined;

  const PROMPTS = [
    t("copilot.prompts.mca"),
    "Maximum overcurrent protection?",
    t("copilot.prompts.line"),
    t("copilot.prompts.voltage"),
    "Error code 1F",
    t("copilot.prompts.wiring"),
  ];

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="card-elev p-4">
        <div className="text-xs text-muted-foreground">{eq.type}</div>
        <div className="mt-0.5 flex items-center gap-2">
          <h1 className="text-lg font-semibold">{eq.manufacturer} {eq.model}</h1>
          {isVerified ? (
            <span className="stat-pill bg-success/15 text-success"><ShieldCheck className="h-3 w-3" /> {t("equipmentList.verified")}</span>
          ) : (
            <span className="stat-pill bg-warning/15 text-warning"><AlertTriangle className="h-3 w-3" /> {t("equipmentList.demoNotVerified")}</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          Serial {eq.serial}{eq.installDate && ` · ${t("equipmentList.installed")} ${eq.installDate}`}{eq.location && ` · ${eq.location}`}
        </div>
        {!isVerified && (
          <div className="mt-3 rounded-md border border-warning bg-warning/10 p-2 text-xs">
            {t("equipmentProfile.demoBanner")}
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
        <div className="mb-2 text-sm font-semibold">{t("equipmentProfile.askAbout")}</div>
        <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="flex gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("equipmentProfile.askPlaceholder")} className="touch-target" />
          <Button type="submit" size="icon" className="touch-target"><Search className="h-5 w-5" /></Button>
        </form>
        <div className="mt-2 flex flex-wrap gap-1">
          {PROMPTS.map((s) => (
            <button key={s} type="button" onClick={() => { setQ(s); ask(s); }} className="rounded-full border bg-secondary/60 px-2 py-1 text-xs">{s}</button>
          ))}
        </div>
        {turn && <div className="mt-3"><AnswerCard question={turn.question} answer={turn.answer} /></div>}
      </div>

      <div className="card-elev p-4">
        <div className="mb-2 text-sm font-semibold">{t("equipmentProfile.errorCodes")}</div>
        {eq.errorCodes && eq.errorCodes.length > 0 ? (
          <div className="grid gap-2">
            {eq.errorCodes.map((c) => (
              <button key={c.code} onClick={() => setOpenErr(c)} className="rounded-lg border p-2 text-left text-xs hover:bg-muted/40">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{c.code} — {c.meaning}</div>
                  <span className="text-[10px] text-muted-foreground">{t("equipmentProfile.details")}</span>
                </div>
                <div className="mt-0.5 text-muted-foreground line-clamp-1">{t("equipmentProfile.likely", { value: c.likelyCauses.join("; ") })}</div>
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
            {eq.bom.map((b) => (
              <button key={b.ref} onClick={() => setOpenBom(b)} className="rounded-lg border p-2 text-left text-xs hover:bg-muted/40">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{b.ref} — {b.description}</div>
                  <span className="text-[10px] text-muted-foreground">{t("equipmentProfile.details")}</span>
                </div>
                {b.specHint && <div className="mt-0.5 text-muted-foreground line-clamp-1">{b.specHint}</div>}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t("equipmentProfile.noBom")}</p>
        )}
      </div>

      <div id="specs" className="flex flex-col gap-2">
        {eq.specs.length === 0 ? (
          <div className="card-elev p-6 text-center text-sm text-muted-foreground">
            {t("equipmentProfile.noSpecs")} <Link className="underline" to="/app/documents">{t("nav.more")}</Link>.
          </div>
        ) : GROUP_ORDER.map((group) => {
          const items = eq.specs.filter((s) => s.group === group);
          if (items.length === 0) return null;
          const open = openGroup === group;
          return (
            <Collapsible key={group} open={open} onOpenChange={(o) => setOpenGroup(o ? group : null)}>
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

      <div id="history" className="card-elev p-4">
        <div className="mb-2 text-sm font-semibold">{t("equipmentProfile.serviceHistory")}</div>
        {eqJobs.length === 0 ? (
          <div className="text-xs text-muted-foreground">{t("equipmentProfile.noPriorJobs")}</div>
        ) : (
          <ul className="divide-y text-sm">
            {eqJobs.slice(0, 10).map((j) => (
              <li key={j.id} className="flex items-center justify-between py-2">
                <Link to={`/app/jobs/${j.id}`} className="truncate underline">{j.complaint}</Link>
                <span className="text-xs text-muted-foreground">{(j.completedAt ?? j.scheduledFor).slice(0, 10)} · {statusLabel(j.status)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={!!openSpec} onOpenChange={(o) => !o && setOpenSpec(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{openSpec?.label}</DialogTitle></DialogHeader>
          {openSpec && (
            <div className="space-y-2 text-sm">
              <Row k={t("equipmentProfile.row.value")} v={`${openSpec.value}${openSpec.unit ? ` ${openSpec.unit}` : ""}`} />
              <Row k={t("equipmentProfile.row.group")} v={t(`equipmentProfile.groups.${openSpec.group}`)} />
              <Row k={t("equipmentProfile.row.source")} v={openSpec.source.title ?? openSpec.source.kind} />
              {openSpec.sourcePage && <Row k={t("equipmentProfile.row.page")} v={String(openSpec.sourcePage)} />}
              <Row k={t("equipmentProfile.row.verification")} v={openSpec.verificationStatus ?? "—"} />
              {openSpec.approvedBy && <Row k={t("equipmentProfile.row.approvedBy")} v={openSpec.approvedBy} />}
              {openSpec.approvedAt && <Row k={t("equipmentProfile.row.approvalDate")} v={openSpec.approvedAt} />}
              {openSpec.lastReviewedAt && <Row k={t("equipmentProfile.row.lastReviewed")} v={openSpec.lastReviewedAt} />}
              {openSpec.notes && <Row k={t("equipmentProfile.row.notes")} v={openSpec.notes} />}
              {openSpec.conflicts && <Row k={t("equipmentProfile.row.conflicts")} v={openSpec.conflicts} />}
              <div className="pt-2">
                <SourceBadge source={openSpec.source} />
              </div>
            </div>
          )}
          <DialogFooter>
            {openSpec?.sourceDocumentId && docFor(openSpec.sourceDocumentId) && (
              <Button asChild>
                <Link to={`/app/documents/${openSpec.sourceDocumentId}`}>{t("equipmentProfile.viewSource")}</Link>
              </Button>
            )}
            <Button variant="outline" onClick={() => setOpenSpec(null)}>{t("common.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!openErr} onOpenChange={(o) => !o && setOpenErr(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{openErr?.code} — {openErr?.meaning}</DialogTitle></DialogHeader>
          {openErr && (
            <div className="space-y-2 text-sm">
              <Row k={t("equipmentProfile.row.equipment")} v={`${eq.manufacturer} ${eq.model}`} />
              {openErr.trigger && <Row k={t("equipmentProfile.row.trigger")} v={openErr.trigger} />}
              {openErr.approvedInterpretation && <Row k={t("equipmentProfile.row.approvedInterp")} v={openErr.approvedInterpretation} />}
              {openErr.approvedStartingPoint && <Row k={t("equipmentProfile.row.diagStart")} v={openErr.approvedStartingPoint} />}
              {openErr.safetyConsiderations && <Row k={t("equipmentProfile.row.safety")} v={openErr.safetyConsiderations} />}
              <Row k={t("equipmentProfile.row.likelyCauses")} v={openErr.likelyCauses.join("; ")} />
              <Row k={t("equipmentProfile.row.safeChecks")} v={openErr.safeChecks.join("; ")} />
              {openErr.alternativeCauses && <Row k={t("equipmentProfile.row.altCauses")} v={openErr.alternativeCauses.join("; ")} />}
              {openErr.sourcePage && <Row k={t("equipmentProfile.row.page")} v={String(openErr.sourcePage)} />}
              {openErr.approvedBy && <Row k={t("equipmentProfile.row.approvedBy")} v={openErr.approvedBy} />}
              {openErr.approvedAt && <Row k={t("equipmentProfile.row.approvalDate")} v={openErr.approvedAt} />}
              {openErr.lastReviewedAt && <Row k={t("equipmentProfile.row.lastReviewed")} v={openErr.lastReviewedAt} />}
              {openErr.approvalNotes && <Row k={t("equipmentProfile.row.approvalNotes")} v={openErr.approvalNotes} />}
              <div className="pt-2"><SourceBadge source={openErr.source} /></div>
            </div>
          )}
          <DialogFooter>
            {openErr?.sourceDocumentId && (
              <Button asChild><Link to={`/app/documents/${openErr.sourceDocumentId}`}>{t("equipmentProfile.viewSource")}</Link></Button>
            )}
            <Button variant="outline" onClick={() => setOpenErr(null)}>{t("common.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!openBom} onOpenChange={(o) => !o && setOpenBom(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{openBom?.ref} — {openBom?.description}</DialogTitle></DialogHeader>
          {openBom && (
            <div className="space-y-2 text-sm">
              {openBom.specHint && <Row k={t("equipmentProfile.row.spec")} v={openBom.specHint} />}
              {openBom.manufacturerPartNumber && <Row k={t("equipmentProfile.row.mfgPart")} v={openBom.manufacturerPartNumber} />}
              {openBom.applicability && <Row k={t("equipmentProfile.row.applicability")} v={openBom.applicability} />}
              {openBom.serialApplicability && <Row k={t("equipmentProfile.row.serialRev")} v={openBom.serialApplicability} />}
              {openBom.supersededBy && <Row k={t("equipmentProfile.row.supersededBy")} v={openBom.supersededBy} />}
              {openBom.approvedSubstitute && <Row k={t("equipmentProfile.row.approvedSub")} v={openBom.approvedSubstitute} />}
              {openBom.compatibilityStatus && <Row k={t("equipmentProfile.row.compatibility")} v={openBom.compatibilityStatus} />}
              {openBom.stockStatus && <Row k={t("equipmentProfile.row.stockStatus")} v={openBom.stockStatus} />}
              {openBom.supplier && <Row k={t("equipmentProfile.row.supplier")} v={openBom.supplier} />}
              {openBom.sourcePage && <Row k={t("equipmentProfile.row.page")} v={String(openBom.sourcePage)} />}
              {openBom.approvalReason && <Row k={t("equipmentProfile.row.approvalReason")} v={openBom.approvalReason} />}
              {openBom.approvedBy && <Row k={t("equipmentProfile.row.approvedBy")} v={openBom.approvedBy} />}
              {openBom.approvedAt && <Row k={t("equipmentProfile.row.approvalDate")} v={openBom.approvedAt} />}
              {openBom.installationNotes && <Row k={t("equipmentProfile.row.installNotes")} v={openBom.installationNotes} />}
              <div className="pt-2"><SourceBadge source={openBom.source} /></div>
            </div>
          )}
          <DialogFooter>
            {openBom?.sourceDocumentId && (
              <Button asChild><Link to={`/app/documents/${openBom.sourceDocumentId}`}>{t("equipmentProfile.viewSource")}</Link></Button>
            )}
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
