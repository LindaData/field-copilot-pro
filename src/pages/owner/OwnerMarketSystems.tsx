import { ExternalLink, Globe2, MessageSquare, Radar, ShieldAlert, Workflow } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  HVAC_COMPANY_WEBSITE_REVIEW,
  HVAC_FIELD_SERVICE_PLATFORM_REVIEW,
  HVAC_MARKET_REVIEW_DATE,
  HVAC_MARKET_SYSTEM_PRIORITIES,
} from "@/lib/hvacMarketSystems";

export default function OwnerMarketSystems() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("ownerMarket.title")}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t("ownerMarket.desc")}</p>
        </div>
        <Badge variant="outline" className="w-fit">{t("ownerMarket.reviewed", { date: HVAC_MARKET_REVIEW_DATE })}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("ownerMarket.companySites")}</div>
            <Globe2 className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-1 text-2xl font-bold">{HVAC_COMPANY_WEBSITE_REVIEW.length}</div>
          <div className="mt-1 text-xs text-muted-foreground">{t("ownerMarket.companySitesSub")}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("ownerMarket.platforms")}</div>
            <Workflow className="h-4 w-4 text-info" />
          </div>
          <div className="mt-1 text-2xl font-bold">{HVAC_FIELD_SERVICE_PLATFORM_REVIEW.length}</div>
          <div className="mt-1 text-xs text-muted-foreground">{t("ownerMarket.platformsSub")}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("ownerMarket.priorities")}</div>
            <Radar className="h-4 w-4 text-success" />
          </div>
          <div className="mt-1 text-2xl font-bold">{HVAC_MARKET_SYSTEM_PRIORITIES.length}</div>
          <div className="mt-1 text-xs text-muted-foreground">{t("ownerMarket.prioritiesSub")}</div>
        </Card>
      </div>

      <div className="rounded-md border border-warning/50 bg-warning/10 p-3 text-xs text-muted-foreground">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <span>{t("ownerMarket.scopeNote")}</span>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Radar className="h-4 w-4 text-primary" />
          {t("ownerMarket.patternsTitle")}
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {HVAC_MARKET_SYSTEM_PRIORITIES.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="text-sm font-semibold">{item.title}</div>
              <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
              <div className="mt-2 rounded-md bg-muted/50 p-2 text-xs">
                <span className="font-medium">{t("ownerMarket.adjustment")} </span>
                {item.fieldCopilotAdjustment}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Globe2 className="h-4 w-4 text-primary" />
          {t("ownerMarket.companiesTitle")}
        </div>
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          {HVAC_COMPANY_WEBSITE_REVIEW.map((company) => (
            <a
              key={company.company}
              href={company.website}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border p-3 hover:bg-muted/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{company.company}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{company.marketRole}</div>
                </div>
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {company.visibleSystems.map((system) => (
                  <Badge key={system} variant="outline">{system}</Badge>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{company.productImplication}</p>
            </a>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Workflow className="h-4 w-4 text-primary" />
          {t("ownerMarket.platformsTitle")}
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {HVAC_FIELD_SERVICE_PLATFORM_REVIEW.map((platform) => (
            <a
              key={platform.platform}
              href={platform.website}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border p-3 hover:bg-muted/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{platform.platform}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{platform.positionedFor}</div>
                </div>
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {platform.publicCapabilities.map((capability) => (
                  <Badge key={capability} variant="secondary">{capability}</Badge>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{platform.fieldCopilotImplication}</p>
            </a>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <MessageSquare className="h-4 w-4 text-primary" />
          {t("ownerMarket.nextDemoTitle")}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{t("ownerMarket.nextDemoDesc")}</p>
      </Card>
    </div>
  );
}
