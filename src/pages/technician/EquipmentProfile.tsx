import { useParams, Link, useLocation } from "react-router-dom";
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
import { ChevronDown, ExternalLink, FileText, History, Search, ShieldCheck, AlertTriangle, Bot, Wrench, BookOpen } from "lucide-react";
import type { Spec, ErrorCode, BomItem } from "@/lib/types";
import { resolveAnswer } from "@/lib/answers/resolver";
import { findSimilarJobs } from "@/lib/answers/similarJobs";
import type { Answer } from "@/lib/answers/types";
import { useStatusLabel } from "@/i18n/status";
import { useDynamicText } from "@/i18n/dynamic";
import { manufacturerDocsForEquipment, sourceForManufacturerRecord } from "@/lib/manufacturerSources";
import { documentationQualityLabel, documentationResearchForEquipment, documentationStatusLabel } from "@/lib/hvacTop50";

const GROUP_ORDER: Spec["group"][] = ["Capacity", "Compressor", "Fan", "Refrigeration", "Electrical", "Physical", "Certifications"];
type ProfileSection = "docs" | "specs" | "assistant" | "history";

function confidenceClass(confidence?: string) {
  if (confidence === "high") return "bg-success/15 text-success";
  if (confidence === "medium") return "bg-info/15 text-info";
  return "bg-warning/15 text-warning";
}

function sectionFromHash(hash: string): ProfileSection {
  if (hash === "#specs") return "specs";
  if (hash === "#assistant") return "assistant";
  if (hash === "#history") return "history";
  return "docs";
}

export default function EquipmentProfile() {
  const { id = "" } = useParams();
  const { state, touchEquipment } = useStore();
  const { t } = useTranslation();
  const location = useLocation();
  const statusLabel = useStatusLabel();
  const tx = useDynamicText();
  const eq = state.equipment.find((e) => e.id === id);
  const [q, setQ] = useState("");
  const [turn, setTurn] = useState<{ question: string; answer: Answer } | null>(null);
  const [openSpec, setOpenSpec] = useState<Spec | null>(null);
  const [openErr, setOpenErr] = useState<ErrorCode | null>(null);
  const [openBom, setOpenBom] = useState<BomItem | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>("Capacity");
  const [activeSection, setActiveSection] = useState<ProfileSection>(() => sectionFromHash(location.hash));
  const touchEquipmentRef = useRef(touchEquipment);

  useEffect(() => {
    touchEquipmentRef.current = touchEquipment;
  }, [touchEquipment]);

  useEffect(() => {
    if (eq?.id) touchEquipmentRef.current(eq.id);
  }, [eq?.id]);

  useEffect(() => {
    setActiveSection(sectionFromHash(location.hash));
  }, [location.hash]);

  const ctx = useMemo(() => ({ equipment: eq, allEquipment: state.equipment }), [eq, state.equipment]);
  const similarCtx = useMemo(() => ({ equipment: eq, allEquipment: state.equipment, jobs: state.jobs, knowledge: state.knowledge }), [eq, state.equipment, state.jobs, state.knowledge]);
  const eqJobs = useMemo(() => eq ? state.jobs.filter((j) => j.equipmentId === eq.id) : [], [eq, state.jobs]);
  const completedEqJobs = useMemo(
    () => eqJobs.filter((job) => job.status === "Completed").sort((a, b) => (b.completedAt ?? b.scheduledFor).localeCompare(a.completedAt ?? a.scheduledFor)),
    [eqJobs],
  );
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
  const bestResearchDoc = researchDocs[0];
  const featuredManufacturerDoc = manufacturerDocs[0];
  const primaryDocUrl = manufacturerDocs[0]?.url ?? bestResearchDoc?.documentUrl;
  const criticalSpecs = quickSpecs.slice(0, 4);
  const latestCompletedJob = completedEqJobs[0];
  const sourceLead = featuredManufacturerDoc
    ? "Official manufacturer source"
    : bestResearchDoc
      ? "Best-effort source match"
      : "Needs source review";
  const ask = (text: string) => {
    const answer = resolveAnswer(text, ctx);
    const similar = findSimilarJobs(text, similarCtx);
    setTurn({ question: text, answer: { ...answer, similar } });
  };
  const jumpToSection = (section: ProfileSection) => {
    setActiveSection(section);
    const nextHash = section === "docs" ? "#docs" : `#${section}`;
    window.history.replaceState({}, "", `${location.pathname}${nextHash}`);
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
        <div className={`mt-3 rounded-xl border p-3 text-xs ${isVerified ? "border-success/30 bg-success/5 text-muted-foreground" : "border-warning/40 bg-warning/10 text-muted-foreground"}`}>
          <div className="font-semibold text-foreground">{isVerified ? t("jobDetail.manufacturerVerifiedTitle") : "Demo equipment record"}</div>
          <div className="mt-1 leading-relaxed">
            {isVerified
              ? t("jobDetail.manufacturerVerifiedBody")
              : t("equipmentProfile.demoBanner")}
          </div>
          {isVerified ? (
            <div className="mt-2 rounded-lg border border-success/20 bg-background/70 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              Verified here means this demo record has an official manufacturer source or nameplate-backed value attached. It does not mean every field condition, accessory, or modification is already confirmed.
            </div>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {primaryDocUrl ? (
            <a
              href={primaryDocUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium text-primary"
            >
              <FileText className="h-3.5 w-3.5" />
              Open best source
            </a>
          ) : null}
          <button type="button" onClick={() => jumpToSection("docs")} className="inline-flex items-center gap-1 rounded-full border bg-secondary/60 px-3 py-1 text-xs font-medium text-secondary-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            View docs
          </button>
          <button type="button" onClick={() => jumpToSection("history")} className="inline-flex items-center gap-1 rounded-full border bg-secondary/60 px-3 py-1 text-xs font-medium text-secondary-foreground">
            <History className="h-3.5 w-3.5" />
            Service history
          </button>
        </div>
      </div>

      <div className="card-elev p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Technician brief</div>
            <div className="mt-1 text-xs text-muted-foreground">Use the strongest source first, grab the critical values, then drill into the section you need.</div>
          </div>
          <div className="shrink-0 text-right text-xs text-muted-foreground">
            {eqJobs.length} related jobs
          </div>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {[
            { key: "docs" as const, label: "Docs", icon: BookOpen },
            { key: "specs" as const, label: "Specs", icon: Wrench },
            { key: "assistant" as const, label: "Reader", icon: Bot },
            { key: "history" as const, label: "History", icon: History },
          ].map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.key}
                type="button"
                onClick={() => jumpToSection(section.key)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${activeSection === section.key ? "bg-primary text-primary-foreground" : "bg-background"}`}
              >
                <Icon className="h-3.5 w-3.5" /> {section.label}
              </button>
            );
          })}
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr]">
          <div className="rounded-xl border bg-muted/10 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">Best source for this stop</div>
            <div className="mt-2 text-sm font-semibold">{sourceLead}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {featuredManufacturerDoc?.title ?? bestResearchDoc?.documentTitle ?? "Attach official literature for this equipment record before trusting source-based values."}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="stat-pill bg-secondary text-secondary-foreground">
                {featuredManufacturerDoc ? "Manufacturer document" : bestResearchDoc ? documentationQualityLabel(bestResearchDoc) : "No source linked yet"}
              </span>
              {bestResearchDoc ? <span className={`stat-pill ${confidenceClass(bestResearchDoc.confidence)}`}>{documentationStatusLabel(bestResearchDoc)}</span> : null}
              <span className="stat-pill bg-muted text-muted-foreground">{manufacturerDocs.length + researchDocs.length} linked docs</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {primaryDocUrl ? (
                <a
                  href={primaryDocUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium text-primary"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Open best source
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => jumpToSection("docs")}
                className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1 text-xs font-medium"
              >
                <BookOpen className="h-3.5 w-3.5" />
                Open docs queue
              </button>
            </div>
          </div>

          <div className="rounded-xl border bg-muted/10 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">Visit-critical values</div>
            <div className="mt-1 text-xs text-muted-foreground">Open the spec detail only when you need traceability or source-page confirmation.</div>
            <div className="mt-3 grid gap-2">
              {criticalSpecs.length > 0 ? criticalSpecs.map((spec) => (
                <button
                  key={`brief-${spec.key}`}
                  onClick={() => {
                    setOpenSpec(spec);
                    jumpToSection("specs");
                  }}
                  className="rounded-xl border bg-background p-3 text-left hover:bg-muted/30"
                >
                  <div className="text-[11px] uppercase tracking-normal text-muted-foreground">{spec.label}</div>
                  <div className="mt-1 text-sm font-semibold">{spec.value}{spec.unit ? ` ${spec.unit}` : ""}</div>
                </button>
              )) : (
                <div className="rounded-xl border border-dashed bg-background p-3 text-xs text-muted-foreground">
                  No critical spec values are linked yet for this equipment.
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => jumpToSection("specs")}
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary"
            >
              <Wrench className="h-3.5 w-3.5" />
              Open full specs
            </button>
          </div>

          <div className="rounded-xl border bg-muted/10 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">Service pattern</div>
            <div className="mt-2 text-sm font-semibold">{completedEqJobs.length ? `${completedEqJobs.length} completed visits` : "No completed visits yet"}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {latestCompletedJob
                ? `${(latestCompletedJob.completedAt ?? latestCompletedJob.scheduledFor).slice(0, 10)} - ${tx(latestCompletedJob.complaint)}`
                : "Once this equipment has prior completed calls, use them to compare complaint patterns and outcomes."}
            </div>
            <div className="mt-3 grid gap-2">
              <div className="rounded-xl border bg-background p-3">
                <div className="text-[11px] uppercase tracking-normal text-muted-foreground">Verified specs</div>
                <div className="mt-1 text-sm font-semibold">{verifiedSpecs}/{eq.specs.length}</div>
                <div className="mt-1 text-xs text-muted-foreground">{eq.location ?? "No install location tagged"}</div>
              </div>
              <div className="rounded-xl border bg-background p-3">
                <div className="text-[11px] uppercase tracking-normal text-muted-foreground">Last completed status</div>
                <div className="mt-1 text-sm font-semibold">{latestCompletedJob ? statusLabel(latestCompletedJob.status) : "No completed history"}</div>
                <div className="mt-1 text-xs text-muted-foreground">{latestCompletedJob ? "Open the history section for the exact timeline and job detail." : "History will populate after completed visits."}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => jumpToSection("history")}
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary"
            >
              <History className="h-3.5 w-3.5" />
              Review service history
            </button>
          </div>
        </div>
      </div>

      {activeSection === "docs" && (manufacturerDocs.length > 0 || researchDocs.length > 0) ? (
        <div id="docs" className="card-elev scroll-mt-24 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Documentation</div>
              <p className="mt-1 text-xs text-muted-foreground">Official source pointers first, then best-effort matches tied back to this equipment. This keeps the tech from scanning a wall of mixed content.</p>
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

      {activeSection === "specs" ? (
      <>
      <div id="specs" className="scroll-mt-24">
        <div className="mb-2">
          <div className="text-sm font-semibold">Specifications and traceability</div>
          <div className="text-xs text-muted-foreground">Tap a value to see the source, verification state, and linked document.</div>
        </div>
        <div className="mb-3 rounded-xl border bg-muted/20 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Critical specs for this visit</div>
              <div className="mt-1 text-xs text-muted-foreground">Start with the values a technician reaches for first, then open the full group only when needed.</div>
            </div>
            <span className={`stat-pill ${isVerified ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
              {verifiedSpecs} verified
            </span>
          </div>
          {criticalSpecs.length > 0 ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {criticalSpecs.map((spec) => (
                <button
                  key={`critical-${spec.key}`}
                  type="button"
                  onClick={() => setOpenSpec(spec)}
                  className="rounded-xl border bg-background p-3 text-left hover:bg-muted/30"
                >
                  <div className="text-[11px] uppercase tracking-normal text-muted-foreground">{spec.label}</div>
                  <div className="mt-1 text-sm font-semibold">{spec.value}{spec.unit ? ` ${spec.unit}` : ""}</div>
                  <div className="mt-2"><SourceBadge source={spec.source} compact /></div>
                </button>
              ))}
            </div>
          ) : null}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => jumpToSection("docs")}
              className="rounded-xl border bg-background p-3 text-left hover:bg-muted/30"
            >
              <div className="text-sm font-semibold">Open linked documentation</div>
              <div className="mt-1 text-xs text-muted-foreground">Check the manufacturer or best-effort source tied to this exact record.</div>
            </button>
            <button
              type="button"
              onClick={() => jumpToSection("history")}
              className="rounded-xl border bg-background p-3 text-left hover:bg-muted/30"
            >
              <div className="text-sm font-semibold">Open service history</div>
              <div className="mt-1 text-xs text-muted-foreground">Compare prior visits before trusting a single reading in isolation.</div>
            </button>
          </div>
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
      </>
      ) : null}

      {activeSection === "assistant" ? (
      <>
      <div id="assistant" className="card-elev scroll-mt-24 p-4">
        <div className="mb-2 text-sm font-semibold">{t("equipmentProfile.askAbout")}</div>
        <div className="mb-3 rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          The document reader stays inside linked manufacturer sources and family matches. It does not promote unverified numeric values for demo equipment.
        </div>
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
      </>
      ) : null}

      {activeSection === "history" ? (
      <div id="history" className="card-elev scroll-mt-24 p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-sm font-semibold">{t("equipmentProfile.serviceHistory")}</div>
          <span className="text-xs text-muted-foreground">{eqJobs.length} records</span>
        </div>
        <div className="mb-3 text-xs text-muted-foreground">
          Open a prior visit when you need the actual complaint, completed status, and timeline tied to this equipment.
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
      ) : null}

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
