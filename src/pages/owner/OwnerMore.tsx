import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Package, Book, Settings as SettingsIcon, ShieldCheck, Cloud } from "lucide-react";

export default function OwnerMore() {
  const { state, reset } = useStore();
  const items = [
    { to: "/app/owner/qa", label: "QA & Release Center", icon: ShieldCheck, sub: "Run tests, view release verdict" },
    { to: "/app/owner/integrations/aws", label: "AWS Storage", icon: Cloud, sub: "Connect S3, RDS, EC2 and Cognito" },
    { to: "/app/documents", label: "Documents", icon: FileText, sub: `${state.docs.length} on file` },
    { to: "/app/parts", label: "Parts & inventory", icon: Package, sub: `${state.parts.length} parts` },
    { to: "/app/knowledge", label: "Knowledge base", icon: Book, sub: `${state.knowledge.length} approved cases` },
    { to: "/app/settings", label: "Settings", icon: SettingsIcon },
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">More</h1>
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
        <div className="text-sm font-semibold">Demo controls</div>
        <p className="mt-1 text-xs text-muted-foreground">Reset returns all data — jobs, diagnostics, approvals — to seeded defaults.</p>
        <Button variant="destructive" className="mt-3" onClick={() => { if (confirm("Reset all demo data?")) { reset(); window.location.href = "/"; } }}>Reset demo</Button>
      </Card>
    </div>
  );
}
