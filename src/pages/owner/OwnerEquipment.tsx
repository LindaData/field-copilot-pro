import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, FileText, ShieldAlert, ShieldCheck, Wrench } from "lucide-react";

export default function OwnerEquipment() {
  const { state } = useStore();
  const { t } = useTranslation();
  const linkedCount = state.equipment.filter((eq) => eq.manualUrls.length > 0).length;
  const exactVerifiedCount = state.equipment.filter((eq) => eq.verificationStatus === "Manufacturer Verified").length;
  const reviewRequiredCount = state.equipment.length - exactVerifiedCount;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("ownerEquipment.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("ownerEquipment.desc")}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {state.equipment.map((eq) => (
          <Link key={eq.id} to={`/app/equipment/${eq.id}`}>
            <Card className="p-4 hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-primary" />
                <div className="text-sm font-semibold">{eq.manufacturer} {eq.model}</div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{t("ownerEquipment.serialType", { serial: eq.serial, type: eq.type })}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {eq.specs.length > 0 ? <Badge>{t("ownerEquipment.verifiedSpecs", { count: eq.specs.length })}</Badge> : <Badge variant="secondary">{t("ownerEquipment.noSpecs")}</Badge>}
                {eq.manualUrls.length > 0 ? <Badge variant="outline">{t("ownerEquipment.docsLinked", { count: eq.manualUrls.length })}</Badge> : null}
                {eq.manualUrls.length > 0 ? <Badge variant="outline" className="border-info/40 text-info">{t("ownerEquipment.aiReady")}</Badge> : null}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
