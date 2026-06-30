import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Package, Book, Settings as SettingsIcon, Cloud, MessageSquare, ClipboardList, Globe2 } from "lucide-react";

export default function OwnerMore() {
  const { state, reset } = useStore();
  const { t } = useTranslation();
  const nav = useNavigate();
  const items = [
    { to: "/app/owner/demo-walkthrough", label: "Demo walkthrough", icon: ClipboardList, sub: "Reset, perfect maintenance, active repair, owner review." },
    { to: "/app/owner/market-systems", label: t("ownerMarket.navLabel"), icon: Globe2, sub: t("ownerMarket.navSub") },
    { to: "/app/owner/integrations/aws", label: t("more.awsStorage"), icon: Cloud, sub: t("more.awsStorageSub") },
    { to: "/app/documents", label: t("more.documents"), icon: FileText, sub: t("more.documentsSub", { count: state.docs.length }) },
    { to: "/app/parts", label: t("more.parts"), icon: Package, sub: t("more.partsSub", { count: state.parts.length }) },
    { to: "/app/knowledge", label: t("more.knowledge"), icon: Book, sub: t("more.knowledgeSubApproved", { count: state.knowledge.length }) },
    { to: "/app/owner/feedback", label: t("more.feedback"), icon: MessageSquare, sub: t("more.feedbackSub") },
    { to: "/app/settings", label: t("more.settings"), icon: SettingsIcon },
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("ownerMore.title")}</h1>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map(({ to, label, icon: Icon, sub }) => (
          <Link key={to} to={to}>
            <Card className="flex items-center gap-3 p-4 hover:bg-muted/30">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
              <div>
                <div className="text-sm font-semibold">{label}</div>
                {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
              </div>
            </Card>
          </Link>
        ))}
      </div>
      <Card className="p-4">
        <div className="text-sm font-semibold">{t("more.demoControls")}</div>
        <p className="mt-1 text-xs text-muted-foreground">{t("more.demoControlsDesc")}</p>
        <Button variant="destructive" className="mt-3" onClick={() => { if (confirm(t("more.confirmReset"))) { reset(); nav("/"); } }}>{t("nav.resetDemo")}</Button>
      </Card>
    </div>
  );
}
