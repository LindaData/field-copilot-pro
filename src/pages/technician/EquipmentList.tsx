import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { Wrench, FileText, History, ListChecks, Play, ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDynamicText } from "@/i18n/dynamic";
import { documentationQualityLabel, documentationStatusLabel, documentationSummaryForEquipment } from "@/lib/hvacTop50";

function confidenceClass(confidence?: string) {
  if (confidence === "high") return "bg-success/15 text-success";
  if (confidence === "medium") return "bg-info/15 text-info";
  return "bg-warning/15 text-warning";
}

export default function EquipmentList() {
  const { state } = useStore();
  const { t } = useTranslation();
  const nav = useNavigate();
  const tx = useDynamicText();

  return (
    <div className="flex flex-col gap-3 p-4">
      <div>
        <h1 className="text-lg font-semibold">{t("equipmentList.title")}</h1>
        <p className="text-xs text-muted-foreground">{t("equipmentList.desc")}</p>
      </div>
      <div className="flex flex-col gap-2">
        {state.equipment.map((eq) => {
          const system = state.systems?.find((s) => s.equipmentIds?.includes(eq.id));
          const property = system && state.properties.find((p) => p.id === system.propertyId);
          const eqJobs = state.jobs.filter((j) => j.equipmentId === eq.id);
          const completed = eqJobs.filter((j) => j.status === "Completed").sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
          const lastService = completed[0]?.completedAt?.slice(0, 10);
          const openJob = eqJobs.find((j) => !["Completed","Cancelled"].includes(j.status));
          const verifiedCount = eq.specs.filter((s) => (s.verificationStatus ?? "Manufacturer Verified") === "Manufacturer Verified").length;
          const isVerified = eq.verificationStatus === "Manufacturer Verified";
          const warranty = property?.warrantyActive ? t("equipmentList.warrantyActive") : t("equipmentList.warrantyUnknown");
          const docSummary = documentationSummaryForEquipment(eq);
          const bestDoc = docSummary.best;

          return (
            <Link
              key={eq.id}
              to={`/app/equipment/${eq.id}`}
              className="card-elev flex flex-col gap-3 p-3 active:bg-muted/30"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Wrench className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-semibold">{eq.manufacturer} {eq.model}</div>
                    {isVerified ? (
                      <span className="stat-pill bg-success/15 text-success"><ShieldCheck className="h-3 w-3" /> {t("equipmentList.verified")}</span>
                    ) : (
                      <span className="stat-pill bg-warning/15 text-warning"><AlertTriangle className="h-3 w-3" /> {t("equipmentList.demoNotVerified")}</span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    Serial {eq.serial} · {eq.type}
                  </div>
                  {system && (
                    <div className="text-[11px] text-muted-foreground">
                      {system.nickname}{property ? ` · ${property.address}` : ""}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                {eq.installDate && <div>{t("equipmentList.installed")} <span className="text-foreground">{eq.installDate}</span></div>}
                <div>{t("equipmentList.verifiedSpecs")} <span className="text-foreground">{verifiedCount}</span></div>
                {lastService && <div>{t("equipmentList.lastService")} <span className="text-foreground">{lastService}</span></div>}
                <div>{t("equipmentList.warranty")} <span className="text-foreground">{warranty}</span></div>
                {openJob && <div className="col-span-2 text-warning">{t("equipmentList.openIssue", { value: tx(openJob.complaint) })}</div>}
              </div>

              <div className="rounded-lg border bg-muted/20 p-2 text-[11px]">
                <div className="flex flex-wrap items-center gap-1.5">
                  {docSummary.linkedDocumentCount > 0 ? (
                    <span className="stat-pill bg-info/15 text-info">
                      <FileText className="h-3 w-3" /> {docSummary.linkedDocumentCount} docs linked
                    </span>
                  ) : (
                    <span className="stat-pill bg-warning/15 text-warning">
                      <AlertTriangle className="h-3 w-3" /> No docs linked
                    </span>
                  )}
                  {bestDoc ? <span className={`stat-pill ${confidenceClass(bestDoc.confidence)}`}>{documentationStatusLabel(bestDoc)}</span> : null}
                  {bestDoc ? <span className="stat-pill bg-secondary text-secondary-foreground">{documentationQualityLabel(bestDoc)}</span> : null}
                </div>
                <div className="mt-1 text-muted-foreground">
                  {bestDoc
                    ? `${bestDoc.documentTitle}. Verify the exact installed model before using source values.`
                    : "This record still needs an official manufacturer source before field-use guidance can rely on it."}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" className="h-8 gap-1" onClick={(e) => { e.preventDefault(); nav(`/app/equipment/${eq.id}`); }}>
                  {t("equipmentList.open")}
                </Button>
                <Button size="sm" variant="outline" className="h-8 gap-1" onClick={(e) => { e.preventDefault(); nav(`/app/equipment/${eq.id}#history`); }}>
                  <History className="h-3 w-3" /> {t("equipmentList.history")}
                </Button>
                <Button size="sm" variant="outline" className="h-8 gap-1" onClick={(e) => { e.preventDefault(); nav(`/app/equipment/${eq.id}#specs`); }}>
                  <ListChecks className="h-3 w-3" /> {t("equipmentList.specs")}
                </Button>
                <Button size="sm" variant="outline" className="h-8 gap-1" onClick={(e) => { e.preventDefault(); nav(`/app/equipment/${eq.id}#documents`); }}>
                  <FileText className="h-3 w-3" /> {t("equipmentList.docs")}
                </Button>
                {openJob && (
                  <Button size="sm" className="h-8 gap-1" onClick={(e) => { e.preventDefault(); nav(`/app/jobs/${openJob.id}`); }}>
                    <Play className="h-3 w-3" /> {t("equipmentList.startJob")}
                  </Button>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
