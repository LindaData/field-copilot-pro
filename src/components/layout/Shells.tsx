import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Briefcase, Camera, Bot, Home, MoreHorizontal, Wifi, WifiOff, ChevronLeft, LayoutDashboard, Users, Wrench, ShieldCheck, Gauge, MoreVertical, RotateCcw, HelpCircle, LogOut, MessageSquare } from "lucide-react";
import { useStore, useCurrentUser } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { DemoBanner } from "@/components/DemoBanner";
import { LanguageSelector } from "@/components/LanguageSelector";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

function CompanyMark() {
  const { state } = useStore();
  const initials = state.company.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <Link to="/" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground text-sm font-bold">
      {initials}
    </Link>
  );
}

function OverflowMenu({ onReset, onHelp, onFeedback }: { onReset: () => void; onHelp: () => void; onFeedback?: () => void }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="More options"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/30 bg-white/10 text-primary-foreground hover:bg-white/20"
      >
        <MoreVertical className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-50 min-w-[180px]">
        <DropdownMenuItem onClick={onHelp}>
          <HelpCircle className="mr-2 h-4 w-4" /> {t("nav.help")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onFeedback ?? (() => nav("/app/feedback"))}>
          <MessageSquare className="mr-2 h-4 w-4" /> {t("nav.sendFeedback")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onReset} className="text-destructive focus:text-destructive">
          <RotateCcw className="mr-2 h-4 w-4" /> {t("nav.resetDemo")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => nav("/")}>
          <LogOut className="mr-2 h-4 w-4" /> {t("nav.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SyncPill() {
  const { state, toggleOnline } = useStore();
  const { t } = useTranslation();
  return (
    <button
      onClick={toggleOnline}
      className={cn(
        "stat-pill border whitespace-nowrap",
        state.online ? "border-white/30 bg-white/10" : "border-accent/60 bg-accent/20 text-accent",
      )}
      aria-label="Toggle sync"
    >
      {state.online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
      {state.online ? t("status.synced") : t("status.offline")}
    </button>
  );
}

const tabs = [
  { to: "/app/today", label: "today", icon: Home },
  { to: "/app/jobs", label: "jobs", icon: Briefcase },
  { to: "/app/scan", label: "scan", icon: Camera },
  { to: "/app/copilot", label: "copilot", icon: Bot },
  { to: "/app/more", label: "more", icon: MoreHorizontal },
];

const ownerTabs = [
  { to: "/app/owner", label: "dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/owner/jobs", label: "jobs", icon: Briefcase },
  { to: "/app/owner/customers", label: "customers", icon: Users },
  { to: "/app/owner/equipment", label: "equipment", icon: Wrench },
  { to: "/app/owner/more", label: "more", icon: MoreHorizontal },
];

export function MobileShell() {
  const { state, reset } = useStore();
  const user = useCurrentUser();
  const { t } = useTranslation();
  const nav = useNavigate();
  const loc = useLocation();
  const canBack = loc.pathname !== "/app/today" && loc.pathname !== "/app/jobs";

  const doReset = () => {
    if (confirm("Reset all demo data?")) {
      reset(); nav("/"); toast.success("Demo reset");
    }
  };
  const doHelp = () => toast("Help", { description: "Tap the More tab for the tour and demo reset." });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      <header className="safe-top sticky top-0 z-30 bg-primary text-primary-foreground">
        {/* Row 1 */}
        <div className="flex items-center justify-between gap-2 px-3 pt-2">
          <div className="flex min-w-0 items-center gap-2">
            {canBack ? (
              <Button size="icon" variant="ghost" className="h-9 w-9 text-primary-foreground hover:bg-white/10" onClick={() => nav(-1)} aria-label={t("common.back")}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
            ) : (
              <CompanyMark />
            )}
            <div className="truncate text-sm font-semibold">{state.company.name}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <LanguageSelector />
            <OverflowMenu onReset={doReset} onHelp={doHelp} />
          </div>
        </div>
        {/* Row 2 */}
        <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-1.5">
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium leading-tight">{user.name}</div>
            <div className="truncate text-[11px] opacity-80 leading-tight">{user.fullTitle ?? user.role}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <SyncPill />
          </div>
        </div>
      </header>

      <DemoBanner />
      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-md items-stretch justify-between border-t bg-card px-1 py-1 shadow-[0_-6px_20px_-12px_rgba(0,0,0,0.25)]">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => cn(
            "touch-target flex flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 text-[11px] font-medium",
            isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}>
            <Icon className="h-6 w-6" />
            <span>{t(`nav.${label}`)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function OwnerShell() {
  const { state, reset } = useStore();
  const user = useCurrentUser();
  const { t } = useTranslation();
  const nav = useNavigate();

  const doReset = () => { if (confirm("Reset demo?")) { reset(); nav("/"); } };
  const visibleOwnerTabs = ownerTabs;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col">
      <header className="safe-top sticky top-0 z-30 bg-primary text-primary-foreground">
        {/* Row 1 */}
        <div className="flex items-center justify-between gap-2 px-4 pt-2">
          <div className="flex min-w-0 items-center gap-2">
            <CompanyMark />
            <div className="truncate text-sm font-semibold md:text-base">{state.company.name}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <LanguageSelector />
            <OverflowMenu onReset={doReset} onHelp={doHelp} />
          </div>
        </div>
        {/* Row 2 */}
        <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-1.5">
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium leading-tight md:text-sm">{user.name}</div>
            <div className="truncate text-[11px] opacity-80 leading-tight md:text-xs">{user.fullTitle ?? user.role}</div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <SyncPill />
            <Button variant="secondary" size="sm" className="h-8" onClick={() => nav("/app/today")}>
              {t("nav.switchToTech")}
            </Button>
          </div>
        </div>
      </header>
      <nav className="sticky top-[88px] z-20 flex items-center gap-1 overflow-x-auto border-b bg-card px-3 py-2">
        {visibleOwnerTabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => cn(
            "inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap",
            isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          )}>
            <Icon className="h-4 w-4" />{t(`nav.${label}`)}
          </NavLink>
        ))}
      </nav>
      <DemoBanner />
      <main className="flex-1 p-4 md:p-6"><Outlet /></main>
    </div>
  );
}
