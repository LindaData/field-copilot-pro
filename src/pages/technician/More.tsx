import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { FileText, Package, Book, Settings, ShieldAlert, Play, GraduationCap, Share2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function More() {
  const { state, reset } = useStore();
  const { t } = useTranslation();
  const items: { to: string; label: string; icon: typeof FileText; sub?: string }[] = [
    { to: "/app/documents", label: t("more.documents"), icon: FileText, sub: t("more.documentsSub", { count: state.docs.length }) },
    { to: "/app/parts", label: t("more.parts"), icon: Package, sub: t("more.partsSub", { count: state.parts.length }) },
    { to: "/app/knowledge", label: t("more.knowledge"), icon: Book, sub: t("more.knowledgeSub", { count: state.knowledge.length }) },
    { to: "/app/training", label: t("more.training"), icon: GraduationCap, sub: t("more.trainingSub") },
    { to: "/app/feedback", label: t("more.feedback"), icon: MessageSquare, sub: t("more.feedbackSub") },
    { to: "/app/settings", label: t("more.settings"), icon: Settings },
  ];
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="card-elev p-4">
        <div className="text-sm font-semibold">{state.company.name}</div>
        <div className="text-xs text-muted-foreground">{t("more.laborRateTax", { rate: state.company.laborRate, tax: state.company.tax })}</div>
      </div>

      <div className="flex flex-col gap-2">
        {items.map(({ to, label, icon: Icon, sub }) => (
          <Link key={to} to={to} className="card-elev flex items-center gap-3 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
            <div className="flex-1">
              <div className="text-sm font-semibold">{label}</div>
              {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
            </div>
          </Link>
        ))}
      </div>

      <div className="card-elev p-4">
        <div className="flex items-start gap-2 text-xs"><ShieldAlert className="mt-0.5 h-4 w-4 text-destructive" />
          <span>{t("more.safetyNote")}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="touch-target" onClick={() => { toast.success(t("more.tourReset")); window.location.href = "/"; }}><Play className="mr-1 h-4 w-4" /> {t("more.replayTour")}</Button>
        <Button variant="outline" className="touch-target" onClick={async () => { try { await navigator.clipboard.writeText(window.location.origin); toast.success(t("more.demoUrlCopied")); } catch { /* */ } }}><Share2 className="mr-1 h-4 w-4" /> {t("more.shareDemo")}</Button>
        <Button variant="destructive" className="touch-target col-span-2" onClick={() => { if (confirm(t("more.confirmReset"))) { reset(); window.location.href = "/"; } }}>{t("nav.resetDemo")}</Button>
      </div>
    </div>
  );
}
