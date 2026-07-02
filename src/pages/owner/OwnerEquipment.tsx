import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  bestDocumentationForEquipment,
  documentationQualityLabel,
  documentationStatusLabel,
  top50ResearchStats,
  US_HVAC_TOP_50_DOCUMENTATION_RESEARCH,
} from "@/lib/hvacTop50";
import { Bot, ExternalLink, FileText, Library, ShieldAlert, ShieldCheck, Wrench } from "lucide-react";

function confidenceClass(confidence?: string) {
  if (confidence === "high") return "border-success/40 text-success";
  if (confidence === "medium") return "border-info/40 text-info";
  return "border-warning/50 text-warning";
}

export default function OwnerEquipment() {
  const { state } = useStore();
  const { t } = useTranslation();
  const linkedCount = state.equipment.filter((eq) => eq.manualUrls.length > 0).length;
  const exactVerifiedCount = state.equipment.filter((eq) => eq.verificationStatus === "Manufacturer Verified").length;
  const reviewRequiredCount = state.equipment.length - exactVerifiedCount;
  const researchStats = top50ResearchStats();
  const topRows = US_HVAC_TOP_50_DOCUMENTATION_RESEARCH.slice(0, 10);

  const equipmentResearch = useMemo(() => (
    new Map(state.equipment.map((eq) => [eq.id, bestDocumentationForEquipment(eq)]))
  ), [state.equipment]);

  const sourceMappedCount = state.equipment.filter((eq) => equipmentResearch.get(eq.id)).length;
  const sourceQueue = state.equipment
    .map((eq) => ({ eq, research: equipmentResearch.get(eq.id) }))
    .filter(({ eq }) => eq.verificationStatus !== "Manufacturer Verified")
    .sort((a, b) => {
      const aJobs = state.jobs.filter((job) => job.equipmentId === a.eq.id).length;
      const bJobs = state.jobs.filter((job) => job.equipmentId === b.eq.id).length;
      return bJobs - aJobs;
    })
    .slice(0, 4);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("ownerEquipment.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("ownerEquipment.desc")}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("ownerEquipment.linkedLiterature")}</div>
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-1 text-2xl font-bold">{linkedCount}</div>
          <div className="mt-1 text-xs text-muted-foreground">{t("ownerEquipment.linkedLiteratureSub")}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("ownerEquipment.exactVerified")}</div>
            <ShieldCheck className="h-4 w-4 text-success" />
          </div>
          <div className="mt-1 text-2xl font-bold">{exactVerifiedCount}</div>
          <div className="mt-1 text-xs text-muted-foreground">{t("ownerEquipment.exactVerifiedSub")}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("ownerEquipment.sourceMapped")}</div>
            <Library className="h-4 w-4 text-info" />
          </div>
          <div className="mt-1 text-2xl font-bold">{sourceMappedCount}</div>
          <div className="mt-1 text-xs text-muted-foreground">{t("ownerEquipment.sourceMappedSub")}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("ownerEquipment.aiReader")}</div>
            <Bot className="h-4 w-4 text-info" />
          </div>
          <div className="mt-1 text-2xl font-bold">{reviewRequiredCount}</div>
          <div className="mt-1 text-xs text-muted-foreground">{t("ownerEquipment.aiReaderSub")}</div>
        </Card>
      </div>

      <div className="rounded-md border border-warning/50 bg-warning/10 p-3 text-xs text-muted-foreground">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <span>{t("ownerEquipment.sourceReviewNote")}</span>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-semibold">
              <ShieldAlert className="h-4 w-4 text-warning" />
              Source review queue
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              These records still need stronger literature confidence before the field team should lean on them as truth.
            </p>
          </div>
          <Badge variant="outline">{sourceQueue.length} shown</Badge>
        </div>
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          {sourceQueue.map(({ eq, research }) => {
            const linkedJobs = state.jobs.filter((job) => job.equipmentId === eq.id).slice(0, 3);
            return (
              <Link key={eq.id} to={`/app/equipment/${eq.id}`}>
                <div className="rounded-xl border p-3 hover:bg-muted/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{eq.manufacturer} {eq.model}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{eq.serial} · {eq.type}</div>
                    </div>
                    <Badge variant="secondary">{linkedJobs.length} jobs</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge variant="outline">{eq.manualUrls.length} docs linked</Badge>
                    {research ? <Badge variant="outline" className={confidenceClass(research.confidence)}>{documentationStatusLabel(research)}</Badge> : <Badge variant="outline">Needs source match</Badge>}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {research
                      ? `${documentationQualityLabel(research)} · ${research.documentTitle}`
                      : "No official or best-effort research document is attached to this record yet."}
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    {linkedJobs.length > 0
                      ? `Open jobs: ${linkedJobs.map((job) => job.id).join(", ")}`
                      : "No recent job references are tied to this equipment."}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-semibold">
              <Library className="h-4 w-4 text-primary" />
              {t("ownerEquipment.nationalLibraryTitle")}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t("ownerEquipment.nationalLibraryDesc")}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 md:min-w-[360px]">
            <div className="rounded-md border p-2">
              <div className="font-semibold">{researchStats.total}</div>
              <div className="text-muted-foreground">{t("ownerEquipment.top50Units")}</div>
            </div>
            <div className="rounded-md border p-2">
              <div className="font-semibold">{researchStats.officialPdfCount}</div>
              <div className="text-muted-foreground">{t("ownerEquipment.officialPdfs")}</div>
            </div>
            <div className="rounded-md border p-2">
              <div className="font-semibold">{researchStats.familyPageCount}</div>
              <div className="text-muted-foreground">{t("ownerEquipment.familyPages")}</div>
            </div>
            <div className="rounded-md border p-2">
              <div className="font-semibold">{researchStats.genericCount}</div>
              <div className="text-muted-foreground">{t("ownerEquipment.genericSources")}</div>
            </div>
          </div>
        </div>
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          {topRows.map((row) => (
            <a key={row.id} href={row.documentUrl} target="_blank" rel="noreferrer" className="rounded-md border p-3 hover:bg-muted/30">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-muted-foreground">{t("ownerEquipment.rank", { rank: row.rank })} · {row.equipmentType}</div>
                  <div className="text-sm font-semibold">{row.manufacturer} {row.equipmentModel}</div>
                </div>
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="outline">{documentationQualityLabel(row)}</Badge>
                <Badge variant="outline" className={confidenceClass(row.confidence)}>{documentationStatusLabel(row)}</Badge>
              </div>
            </a>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {state.equipment.map((eq) => {
          const research = equipmentResearch.get(eq.id);
          const tickets = state.jobs.filter((job) => job.equipmentId === eq.id).slice(0, 3);

          return (
            <Link key={eq.id} to={`/app/equipment/${eq.id}`}>
              <Card className="p-4 hover:bg-muted/30">
                <div className="flex items-start gap-2">
                  <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{eq.manufacturer} {eq.model}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{t("ownerEquipment.serialType", { serial: eq.serial, type: eq.type })}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {eq.specs.length > 0 ? <Badge>{t("ownerEquipment.verifiedSpecs", { count: eq.specs.length })}</Badge> : <Badge variant="secondary">{t("ownerEquipment.noSpecs")}</Badge>}
                  {eq.manualUrls.length > 0 ? <Badge variant="outline">{t("ownerEquipment.docsLinked", { count: eq.manualUrls.length })}</Badge> : null}
                  {research ? <Badge variant="outline" className={confidenceClass(research.confidence)}>{documentationStatusLabel(research)}</Badge> : null}
                </div>
                {research ? (
                  <div className="mt-2 text-xs text-muted-foreground line-clamp-2">
                    {documentationQualityLabel(research)} · {research.documentTitle}
                  </div>
                ) : null}
                <div className="mt-2 text-xs text-muted-foreground">
                  {tickets.length > 0
                    ? t("ownerEquipment.ticketRefs", { tickets: tickets.map((job) => job.id).join(", ") })
                    : t("ownerEquipment.noTicketRefs")}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
