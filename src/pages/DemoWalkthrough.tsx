import { Link, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { CheckCircle2, ClipboardList, RotateCcw, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useStore } from "@/lib/store";

function minutesLabel(value?: number) {
  if (!value) return "0m";
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  return hours ? `${hours}h ${mins}m` : `${mins}m`;
}

export default function DemoWalkthrough() {
  const { state, reset } = useStore();
  const navigate = useNavigate();

  const perfectMaintenance = useMemo(() => (
    state.jobs.find((job) => (
      job.status === "Completed"
      && job.jobType === "Maintenance"
      && job.serviceCategory === "Tune-Up"
      && job.firstTimeFix === true
      && job.isCallback !== true
      && (job.partsCost ?? 0) === 0
      && (job.pausedMinutes ?? 0) === 0
      && (job.rating ?? 0) >= 4
    ))
    ?? state.jobs.find((job) => job.status === "Completed" && job.jobType === "Maintenance")
  ), [state.jobs]);

  const activeRepair = state.jobs.find((job) => job.id === "j-1");
  const perfectCustomer = perfectMaintenance ? state.customers.find((c) => c.id === perfectMaintenance.customerId) : undefined;
  const perfectProperty = perfectMaintenance ? state.properties.find((p) => p.id === perfectMaintenance.propertyId) : undefined;
  const perfectEquipment = perfectMaintenance ? state.equipment.find((e) => e.id === perfectMaintenance.equipmentId) : undefined;

  const doReset = () => {
    if (confirm("Reset all demo data?")) {
      reset();
      toast.success("Demo reset");
      navigate("/app/demo-walkthrough");
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 p-4">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Demo layer
        </div>
        <h1 className="mt-3 text-2xl font-bold">Demo walkthrough</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Use this page as the boss-level script before reviewing the app. Reset first, then walk through the perfect maintenance example and the active repair example.
        </p>
      </div>

      <Card className="border-warning/40 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold">Start clean</div>
            <p className="mt-1 text-xs text-muted-foreground">Returns jobs, diagnostics, approvals, feedback, and local demo edits to seeded defaults.</p>
          </div>
          <Button variant="destructive" onClick={doReset}>
            <RotateCcw className="mr-2 h-4 w-4" /> Reset demo
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="h-4 w-4 text-success" /> Perfect maintenance example
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Regular maintenance, everything goes to plan, no escalation, no parts delay, no callback.</p>
            </div>
            <Badge variant="outline" className="border-success/40 text-success">Clean</Badge>
          </div>

          {perfectMaintenance ? (
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <div className="font-semibold">{perfectCustomer?.name ?? "Maintenance customer"}</div>
                <div className="text-xs text-muted-foreground">{perfectProperty?.address ?? "Property on file"}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md border p-2"><div className="font-semibold">{perfectMaintenance.id}</div><div className="text-muted-foreground">Ticket</div></div>
                <div className="rounded-md border p-2"><div className="font-semibold">{perfectMaintenance.status}</div><div className="text-muted-foreground">Status</div></div>
                <div className="rounded-md border p-2"><div className="font-semibold">{minutesLabel(perfectMaintenance.totalDurationMinutes)}</div><div className="text-muted-foreground">Duration</div></div>
                <div className="rounded-md border p-2"><div className="font-semibold">{perfectMaintenance.rating ?? 5}/5</div><div className="text-muted-foreground">Review</div></div>
              </div>
              <div className="rounded-md bg-muted p-3 text-xs">
                Expected story: technician arrives, performs seasonal tune-up, documents the visit, customer is satisfied, and the job closes cleanly.
              </div>
              <Button asChild className="w-full">
                <Link to={`/app/jobs/${perfectMaintenance.id}`}>Open perfect maintenance ticket</Link>
              </Button>
              {perfectEquipment ? (
                <Button asChild variant="outline" className="w-full">
                  <Link to={`/app/equipment/${perfectEquipment.id}`}>Open linked equipment</Link>
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 rounded-md border p-3 text-sm text-muted-foreground">No completed maintenance ticket found. Reset demo and review seeded data.</div>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 text-sm font-semibold">
                <Wrench className="h-4 w-4 text-primary" /> Today's repair example
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Goodman no-cooling scenario with manufacturer docs/specs, realistic dispatch timing, and step-by-step diagnosis.</p>
            </div>
            <Badge variant="outline">Scheduled</Badge>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-md bg-muted p-3 text-xs">
              Expected story: start travel, open the job, review equipment, ask the Copilot/spec reader, then continue diagnosis after arrival while verifying source-linked data.
            </div>
            <Button asChild className="w-full" variant="outline">
              <Link to={activeRepair ? `/app/jobs/${activeRepair.id}` : "/app/jobs"}>Open today's repair ticket</Link>
            </Button>
            <Button asChild className="w-full" variant="outline">
              <Link to="/app/equipment/eq-1">Open verified Goodman equipment</Link>
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="inline-flex items-center gap-2 text-sm font-semibold">
          <ClipboardList className="h-4 w-4 text-primary" /> Review checklist
        </div>
        <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
          <Link to="/app/today" className="rounded-md border p-3 hover:bg-muted/40">
            <div className="font-semibold">1. Technician view</div>
            <div className="text-xs text-muted-foreground">Today, jobs, scan, Copilot, and More.</div>
          </Link>
          <Link to="/app/owner/equipment" className="rounded-md border p-3 hover:bg-muted/40">
            <div className="font-semibold">2. Owner equipment</div>
            <div className="text-xs text-muted-foreground">Source links, verification labels, and review queue.</div>
          </Link>
          <Link to="/app/feedback" className="rounded-md border p-3 hover:bg-muted/40">
            <div className="font-semibold">3. Feedback loop</div>
            <div className="text-xs text-muted-foreground">Capture confusing parts before the next build pass.</div>
          </Link>
        </div>
      </Card>

      <Card className="p-4">
        <div className="inline-flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-success" /> Demo rule
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          The perfect maintenance path shows how the app should feel when there is no drama. The active repair path shows where source-linked documentation and safety labels matter.
        </p>
      </Card>
    </div>
  );
}
