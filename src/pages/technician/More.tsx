import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import { FileText, Package, Book, Settings, ShieldAlert, Play, GraduationCap, Share2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function More() {
  const { state, reset } = useStore();
  const items: { to: string; label: string; icon: typeof FileText; sub?: string }[] = [
    { to: "/app/documents", label: "Documents", icon: FileText, sub: `${state.docs.length} on file` },
    { to: "/app/parts", label: "Parts & inventory", icon: Package, sub: `${state.parts.length} parts` },
    { to: "/app/knowledge", label: "Knowledge base", icon: Book, sub: `${state.knowledge.length} cases` },
    { to: "/app/training", label: "Training mode", icon: GraduationCap, sub: "Practice the no-cooling flow" },
    { to: "/app/feedback", label: "Send feedback", icon: MessageSquare, sub: "Help us improve the product" },
    { to: "/app/settings", label: "Settings", icon: Settings },
  ];
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="card-elev p-4">
        <div className="text-sm font-semibold">{state.company.name}</div>
        <div className="text-xs text-muted-foreground">Labor rate ${state.company.laborRate}/hr · Tax {state.company.tax}%</div>
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
          <span>This tool assists trained HVAC professionals. It does not replace licensing, manufacturer instructions, applicable codes, lockout/tagout, PPE, or safe work practices. Never bypass a safety switch. Use the red "Stop & escalate" action on any diagnostic step when unsafe.</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="touch-target" onClick={() => { toast.success("Tour reset"); window.location.href = "/"; }}><Play className="mr-1 h-4 w-4" /> Replay tour</Button>
        <Button variant="outline" className="touch-target" onClick={async () => { try { await navigator.clipboard.writeText(window.location.origin); toast.success("Demo URL copied"); } catch { /* */ } }}><Share2 className="mr-1 h-4 w-4" /> Share demo</Button>
        <Button variant="destructive" className="touch-target col-span-2" onClick={() => { if (confirm("Reset all demo data?")) { reset(); window.location.href = "/"; } }}>Reset demo</Button>
      </div>
    </div>
  );
}
