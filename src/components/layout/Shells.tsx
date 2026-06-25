import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Briefcase, Camera, Bot, Home, MoreHorizontal, Wifi, WifiOff, RotateCcw, ChevronLeft, HelpCircle, LayoutDashboard, Users, Wrench, ShieldCheck, Gauge } from "lucide-react";
import { useStore, useCurrentUser } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DemoBanner } from "@/components/DemoBanner";

const tabs = [
  { to: "/app/today", label: "Today", icon: Home },
  { to: "/app/jobs", label: "Jobs", icon: Briefcase },
  { to: "/app/scan", label: "Scan", icon: Camera },
  { to: "/app/copilot", label: "Copilot", icon: Bot },
  { to: "/app/more", label: "More", icon: MoreHorizontal },
];

const ownerTabs = [
  { to: "/app/owner", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/owner/jobs", label: "Jobs", icon: Briefcase },
  { to: "/app/owner/customers", label: "Customers", icon: Users },
  { to: "/app/owner/equipment", label: "Equipment", icon: Wrench },
  { to: "/app/owner/qa", label: "QA", icon: ShieldCheck },
  { to: "/app/owner/readiness", label: "Readiness", icon: Gauge },
  { to: "/app/owner/more", label: "More", icon: MoreHorizontal },
];

export function MobileShell() {
  const { state, toggleOnline, reset } = useStore();
  const user = useCurrentUser();
  const nav = useNavigate();
  const loc = useLocation();
  const canBack = loc.pathname !== "/app/today" && loc.pathname !== "/app/jobs" && loc.pathname !== "/app/owner";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      <header className="safe-top sticky top-0 z-30 flex items-center justify-between gap-2 border-b bg-primary px-3 py-3 text-primary-foreground">
        <div className="flex items-center gap-2">
          {canBack ? (
            <Button size="icon" variant="ghost" className="touch-target text-primary-foreground hover:bg-primary-soft" onClick={() => nav(-1)} aria-label="Back">
              <ChevronLeft className="h-6 w-6" />
            </Button>
          ) : (
            <Link to="/" className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground font-bold">
              FC
            </Link>
          )}
          <div className="leading-tight">
            <div className="text-sm font-semibold">Field Copilot</div>
            <div className="text-[11px] opacity-80">{user.name} · {user.role}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={toggleOnline} className={cn("stat-pill border", state.online ? "border-white/30 bg-white/10" : "border-accent/60 bg-accent/20 text-accent")} aria-label="Toggle sync">
            {state.online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {state.online ? "Synced" : "Offline"}
          </button>
          <Button size="icon" variant="ghost" className="touch-target text-primary-foreground hover:bg-primary-soft" onClick={() => toast("Help", { description: "Tap the More tab for the tour, safety notes, and demo reset." })} aria-label="Help">
            <HelpCircle className="h-5 w-5" />
          </Button>
          <Button size="icon" variant="ghost" className="touch-target text-primary-foreground hover:bg-primary-soft" onClick={() => { if (confirm("Reset all demo data?")) { reset(); nav("/"); toast.success("Demo reset"); } }} aria-label="Reset demo">
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>
      </header>

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
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function OwnerShell() {
  const { state, toggleOnline, reset } = useStore();
  const user = useCurrentUser();
  const nav = useNavigate();
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col">
      <header className="safe-top sticky top-0 z-30 flex items-center justify-between border-b bg-primary px-4 py-3 text-primary-foreground">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground font-bold">FC</Link>
          <div>
            <div className="text-sm font-semibold">{state.company.name} — Owner Dashboard</div>
            <div className="text-[11px] opacity-80">{user.name} · {user.role}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleOnline} className={cn("stat-pill border", state.online ? "border-white/30 bg-white/10" : "border-accent/60 bg-accent/20 text-accent")}>
            {state.online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {state.online ? "Synced" : "Offline"}
          </button>
          <Button variant="secondary" size="sm" onClick={() => nav("/app/today")}>Switch to Tech</Button>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-soft" onClick={() => { if (confirm("Reset demo?")) { reset(); nav("/"); } }}>
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>
      </header>
      <nav className="sticky top-[60px] z-20 flex items-center gap-1 overflow-x-auto border-b bg-card px-3 py-2">
        {ownerTabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => cn(
            "inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap",
            isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          )}>
            <Icon className="h-4 w-4" />{label}
          </NavLink>
        ))}
      </nav>
      <main className="flex-1 p-4 md:p-6"><Outlet /></main>
    </div>
  );
}
