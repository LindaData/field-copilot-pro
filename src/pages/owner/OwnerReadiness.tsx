import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, Database, ShieldCheck, HardDrive, Bell, FileDown, Activity, Mail, Users, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { Link } from "react-router-dom";

type Status = "ready" | "demo" | "missing";

const STATUS: Record<Status, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  ready:   { label: "Production-ready",  cls: "text-success",            Icon: CheckCircle2 },
  demo:    { label: "Demo / simulated",  cls: "text-accent-foreground",  Icon: AlertTriangle },
  missing: { label: "Not yet implemented", cls: "text-destructive",      Icon: XCircle },
};

function Row({ icon: Icon, title, status, detail, action }: {
  icon: typeof Database; title: string; status: Status; detail: string; action?: React.ReactNode;
}) {
  const s = STATUS[status];
  return (
    <div className="flex items-start gap-3 border-b border-border/60 px-4 py-3 last:border-b-0">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium">{title}</div>
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${s.cls}`}>
            <s.Icon className="h-3 w-3" /> {s.label}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">{detail}</div>
      </div>
      {action}
    </div>
  );
}

export default function OwnerReadiness() {
  const { state } = useStore();

  const exportAll = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      environment: "demo",
      counts: {
        customers: state.customers.length,
        properties: state.properties.length,
        equipment: state.equipment.length,
        jobs: state.jobs.length,
        parts: state.parts.length,
        reports: state.serviceReports.length,
      },
      jobs: state.jobs,
      customers: state.customers,
      properties: state.properties,
      equipment: state.equipment,
      serviceReports: state.serviceReports,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `export-${Date.now()}.json`; a.click();
  };

  const auditLog = (state as unknown as { auditLog?: unknown[] }).auditLog ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Commercial readiness</h1>
        <p className="text-sm text-muted-foreground">
          Honest status of every system an owner would evaluate before paying for a pilot.
          Anything labeled <span className="font-semibold">demo</span> does not yet talk to a real
          external service.
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide">Environment</div>
        <Row icon={Activity} title="Environment" status="demo"
          detail="This build runs entirely in the browser with a deterministic seeded dataset. No tenant isolation between browsers." />
        <Row icon={ShieldCheck} title="Authentication" status="demo"
          detail="Profile switcher only — no password, MFA, SSO, or session expiry. Cognito wiring is scaffolded but not connected." />
        <Row icon={Database} title="Database" status="demo"
          detail="State persists in IndexedDB/localStorage on this device. Repository abstraction is ready for RDS via the AWS Storage wizard."
          action={<Link to="/app/owner/integrations/aws"><Button variant="outline" size="sm">Open AWS wizard</Button></Link>} />
        <Row icon={HardDrive} title="File storage" status="demo"
          detail="Photos are stored as base64 in the same local store. S3 upload path is scaffolded but disabled." />
        <Row icon={HardDrive} title="Backup" status="missing"
          detail="No automated snapshots. Use the data export below before clearing browser storage." />
        <Row icon={Bell} title="Error monitoring" status="missing"
          detail="No Sentry / CloudWatch wiring. Console errors are not collected centrally." />
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide">Operations</div>
        <Row icon={FileDown} title="Data export" status="ready"
          detail={`Export ${state.jobs.length} jobs, ${state.customers.length} customers, and all related records as JSON.`}
          action={<Button size="sm" onClick={exportAll}>Export</Button>} />
        <Row icon={BookOpen} title="Audit log" status={auditLog.length ? "ready" : "demo"}
          detail={auditLog.length ? `${auditLog.length} events captured this session.` : "Status changes are logged in memory; persistence ships with the RDS integration."} />
        <Row icon={Mail} title="Customer communications" status="demo"
          detail="SMS and email notifications are simulated. Outgoing messages are recorded in the timeline but never sent." />
        <Row icon={Users} title="Pilot feedback" status="demo"
          detail="In-app rating capture is wired. Aggregated NPS/CSAT reporting is on the roadmap." />
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide">Known limitations</div>
        <div className="space-y-2 px-4 py-3 text-sm">
          <div>• GPS arrival, OCR nameplate capture, AI replies, payments, and customer messaging are <span className="font-semibold">simulated</span>.</div>
          <div>• Only one verified equipment record (Goodman GSXN3) ships with manufacturer-confirmed specs. All other equipment specs are labeled as inferred.</div>
          <div>• Multi-tenant data isolation is not yet enforced — every browser sees the same seeded company.</div>
          <div>• Offline queueing UI is shown but a real sync engine is not implemented.</div>
          <div>• Reports are generated client-side as printable HTML. PDF rendering and customer email delivery are planned for the pilot release.</div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold">Release readiness</div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="secondary">Phase: Pilot-ready demo</Badge>
          <Badge className="bg-success text-success-foreground">Core technician flow: complete</Badge>
          <Badge className="bg-success text-success-foreground">Owner dashboard: complete</Badge>
          <Badge variant="outline">AWS integration: scaffolded</Badge>
          <Badge variant="outline">Production hardening: pending pilot</Badge>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          Support contact: <a className="underline" href="mailto:support@example.com">support@example.com</a>
        </div>
      </Card>
    </div>
  );
}
