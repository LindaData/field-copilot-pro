import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Bot, Camera, ClipboardList, FileText, MapPin, Phone, ShieldAlert, Wrench } from "lucide-react";
import { toast } from "sonner";

export default function JobDetail() {
  const { id = "" } = useParams();
  const { state, setJobStatus } = useStore();
  const nav = useNavigate();
  const job = state.jobs.find((j) => j.id === id);
  if (!job) return <div className="p-6">Job not found. <Link className="underline" to="/app/jobs">Back</Link></div>;

  const c = state.customers.find((x) => x.id === job.customerId);
  const p = state.properties.find((x) => x.id === job.propertyId);
  const eq = state.equipment.find((x) => x.id === job.equipmentId);
  const diag = state.diag[job.id];
  const hasReport = diag?.completed;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="card-elev p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs text-muted-foreground">{new Date(job.scheduledFor).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}</div>
            <h1 className="text-lg font-semibold leading-tight">{c?.name}</h1>
            <div className="mt-1 text-sm text-foreground/90">{job.complaint}</div>
          </div>
          <Badge>{job.status}</Badge>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
          <div className="inline-flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /> {p?.address}</div>
          {p?.accessNotes && <div className="rounded-md bg-muted px-2 py-1 text-xs">Access: {p.accessNotes}</div>}
          <a href={`tel:${c?.phone}`} className="inline-flex items-center gap-2 text-info"><Phone className="h-4 w-4" /> {c?.phone}</a>
        </div>
      </div>

      <section className="card-elev p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold">Equipment</div>
          {!eq && <Link to="/app/scan"><Button size="sm" variant="outline" className="touch-target"><Camera className="mr-1 h-4 w-4" /> Scan</Button></Link>}
        </div>
        {eq ? (
          <Link to={`/app/equipment/${eq.id}`} className="block rounded-lg border p-3 hover:bg-muted/30">
            <div className="text-sm font-semibold">{eq.manufacturer} {eq.model}</div>
            <div className="text-xs text-muted-foreground">Serial {eq.serial} · {eq.type}</div>
            <div className="mt-1 inline-flex items-center gap-1 text-xs text-primary"><Wrench className="h-3 w-3" /> View specs & manuals</div>
          </Link>
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No equipment attached yet. Use Scan to add the data plate.</div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <Link to={`/app/jobs/${job.id}/diagnose`}>
          <Button className="touch-target h-14 w-full justify-between text-base" onClick={() => { if (job.status === "Scheduled" || job.status === "En Route") setJobStatus(job.id, "Diagnosing"); }}>
            <span className="inline-flex items-center gap-2"><Bot className="h-5 w-5" /> {diag?.results?.length ? "Resume diagnostic" : "Start guided diagnostic"}</span>
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
        <Link to={`/app/jobs/${job.id}/approval`}>
          <Button variant="outline" className="touch-target h-12 w-full justify-between"><span className="inline-flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Customer approval</span><ArrowRight className="h-5 w-5" /></Button>
        </Link>
        <Link to={`/app/jobs/${job.id}/report`}>
          <Button variant="outline" className="touch-target h-12 w-full justify-between"><span className="inline-flex items-center gap-2"><FileText className="h-5 w-5" /> {hasReport ? "View" : "Generate"} service report</span><ArrowRight className="h-5 w-5" /></Button>
        </Link>
      </section>

      <section className="card-elev p-4">
        <div className="text-sm font-semibold">Job status</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(["En Route","On Site","Diagnosing","Waiting for Approval","Waiting for Parts","Completed"] as const).map((s) => (
            <Button key={s} variant={job.status === s ? "default" : "outline"} size="sm" className="touch-target justify-start text-xs" onClick={() => { setJobStatus(job.id, s); toast.success(`Status → ${s}`); }}>
              {s}
            </Button>
          ))}
        </div>
      </section>

      <Button variant="ghost" className="touch-target text-destructive" onClick={() => { setJobStatus(job.id, "Follow-Up"); toast("Escalated as follow-up"); nav("/app/jobs"); }}>
        <ShieldAlert className="mr-1 h-4 w-4" /> Stop & escalate this job
      </Button>
    </div>
  );
}
