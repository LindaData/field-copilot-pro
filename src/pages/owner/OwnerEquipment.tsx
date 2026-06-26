import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench } from "lucide-react";

export default function OwnerEquipment() {
  const { state } = useStore();
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("ownerEquipment.title")}</h1>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {state.equipment.map((eq) => (
          <Link key={eq.id} to={`/app/equipment/${eq.id}`}>
            <Card className="p-4 hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-primary" />
                <div className="text-sm font-semibold">{eq.manufacturer} {eq.model}</div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{t("ownerEquipment.serialType", { serial: eq.serial, type: eq.type })}</div>
              <div className="mt-2">{eq.specs.length > 0 ? <Badge>{t("ownerEquipment.verifiedSpecs", { count: eq.specs.length })}</Badge> : <Badge variant="secondary">{t("ownerEquipment.noSpecs")}</Badge>}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
