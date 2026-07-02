import { useNavigate, useParams } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Check, ChevronRight, Lock, Mail, MapPin, ReceiptText, ShieldAlert, Signature, Wrench, X } from "lucide-react";

export default function Approval() {
  const { id = "" } = useParams();
  const { state, setAuth, addJobPart, setJobStatus, parts } = { ...useStore(), parts: useStore().state.parts };
  const { t } = useTranslation();
  const job = state.jobs.find((j) => j.id === id);
  const cap = parts.find((p) => p.id === "pt-1")!;
  const nav = useNavigate();
  const sigRef = useRef<HTMLCanvasElement | null>(null);
  const [signed, setSigned] = useState(false);
  const [email, setEmail] = useState(state.customers.find((c) => c.id === job?.customerId)?.email ?? "");
  const [confirmDeclineOpen, setConfirmDeclineOpen] = useState(false);
  const partPrice = cap.price;
  const laborHrs = 0.75;
  const laborRate = state.company.laborRate;
  const labor = +(laborHrs * laborRate).toFixed(2);
  const subtotal = +(partPrice + labor).toFixed(2);
  const tax = +(subtotal * (state.company.tax / 100)).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);

  useEffect(() => {
    if (typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent)) return;
    const c = sigRef.current; if (!c) return;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = c.getContext("2d");
    } catch {
      return;
    }
    if (!ctx) return;
    ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 2; ctx.lineCap = "round";
    let drawing = false;
    const pos = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
    };
    const down = (e: PointerEvent) => { drawing = true; setSigned(true); const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const move = (e: PointerEvent) => { if (!drawing) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
    const up = () => { drawing = false; };
    c.addEventListener("pointerdown", down); c.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      c.removeEventListener("pointerdown", down);
      c.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  if (!job) return <div className="p-6">{t("common.notFound")}</div>;
  const customer = state.customers.find((c) => c.id === job.customerId);
  const property = state.properties.find((item) => item.id === job.propertyId);
  const equipment = state.equipment.find((item) => item.id === job.equipmentId);

  const approve = () => {
    const dataUrl = sigRef.current?.toDataURL() ?? "";
    setAuth({
      jobId: job.id,
      signedBy: customer?.name,
      signatureDataUrl: dataUrl,
      approvedAt: new Date().toISOString(),
      total,
      email,
      decision: "approved",
    });
    addJobPart({ jobId: job.id, partId: cap.id, qty: 1 });
    setJobStatus(job.id, "Waiting for Parts");
    toast.success(t("approval.toast.approved"));
    nav(`/app/jobs/${job.id}/diagnose`);
  };

  const decline = () => {
    setAuth({
      jobId: job.id,
      signedBy: customer?.name,
      approvedAt: new Date().toISOString(),
      decision: "declined",
      email,
    });
    setJobStatus(job.id, "Follow-Up");
    toast.success("Approval declined. Job moved to follow-up for office review.");
    nav(`/app/jobs/${job.id}`);
  };

  const clear = () => {
    const c = sigRef.current; if (!c) return;
    const ctx = c.getContext("2d");
    ctx?.clearRect(0, 0, c.width, c.height);
    setSigned(false);
  };

  return (
    <>
    <div className="flex flex-col gap-4 p-4 pb-24">
      <button onClick={() => nav(`/app/jobs/${job.id}`)} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft className="h-3 w-3" /> Back to job
      </button>

      <div className="card-elev p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">{t("approval.title")}</h1>
            <p className="mt-1 text-sm">{t("approval.intro", { name: customer?.name?.split(" ")[0] ?? "" })}</p>
          </div>
          <div className="stat-pill bg-muted text-muted-foreground">
            <Lock className="h-3 w-3" /> Locked
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border bg-muted/20 p-3">
            <div className="text-[11px] uppercase tracking-normal text-muted-foreground">Customer</div>
            <div className="mt-1 text-sm font-medium">{customer?.name ?? "Unknown customer"}</div>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3">
            <div className="text-[11px] uppercase tracking-normal text-muted-foreground">Equipment</div>
            <div className="mt-1 text-sm font-medium">{equipment ? `${equipment.manufacturer} ${equipment.model}` : "Equipment not linked"}</div>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3">
            <div className="text-[11px] uppercase tracking-normal text-muted-foreground">Property</div>
            <div className="mt-1 text-sm font-medium">{property?.address ?? "Property not linked"}</div>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border bg-muted/20 p-3">
            <div className="text-[11px] uppercase tracking-normal text-muted-foreground">Problem found</div>
            <div className="mt-1 text-sm font-medium">{t("approval.findings")}</div>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3">
            <div className="text-[11px] uppercase tracking-normal text-muted-foreground">Decision needed</div>
            <div className="mt-1 text-sm font-medium">Approve repair now or send to office follow-up.</div>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3">
            <div className="text-[11px] uppercase tracking-normal text-muted-foreground">Pricing control</div>
            <div className="mt-1 text-sm font-medium">Technician cannot change pricing on site.</div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border p-4 text-sm">
          <div className="mb-3 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-muted-foreground">
            <div className="inline-flex items-center gap-1 font-medium text-foreground"><Lock className="h-3.5 w-3.5" /> Office pricing</div>
            <div className="mt-1">This estimate is read-only for technicians. Approval captures customer consent. Decline sends it back for office follow-up.</div>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ReceiptText className="h-4 w-4 text-primary" />
            Estimate summary
          </div>
          <div className="mt-3 space-y-2">
            <div className="rounded-lg border bg-background px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span>{t("approval.partRow", { name: cap.name })}</span>
                <span className="font-semibold">${partPrice.toFixed(2)}</span>
              </div>
            </div>
            <div className="rounded-lg border bg-background px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span>{t("approval.labor")}</span>
                <span className="text-right text-xs">{laborHrs.toFixed(2)} {t("approval.hr")} x ${laborRate.toFixed(2)}{t("approval.perHr")}</span>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">{t("approval.laborSubtotal")}: ${labor.toFixed(2)}</div>
            </div>
          </div>
          <div className="mt-3 rounded-lg bg-muted/20 px-3 py-3">
            <div className="flex justify-between"><span>{t("approval.subtotal")}</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="mt-1 flex justify-between"><span>{t("approval.tax", { pct: state.company.tax })}</span><span>${tax.toFixed(2)}</span></div>
            <div className="mt-2 flex justify-between border-t pt-2 text-base font-semibold"><span>{t("approval.total")}</span><span>${total.toFixed(2)}</span></div>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {t("approval.pricesDemo")} This screen captures consent only. Technicians cannot rewrite pricing here.
          </div>
        </div>

        <div className="mt-4 rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Mail className="h-4 w-4 text-primary" />
            Receipt and signature
          </div>
          <label className="mt-3 block text-xs font-medium">{t("approval.emailReceipt")}</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="touch-target mt-1" />
          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Signature className="h-3.5 w-3.5" />
            {t("approval.signature")}
          </div>
          <div className="mt-1 rounded-md border bg-card">
            <canvas ref={sigRef} width={600} height={180} className="h-40 w-full touch-none rounded-md" />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="text-[11px] text-muted-foreground">
              {signed ? "Signature captured. Approval is ready to send." : "Have the customer sign here to approve the locked estimate."}
            </div>
            <Button variant="ghost" size="sm" className="shrink-0" onClick={clear}>{t("approval.clear")}</Button>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-4">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 text-warning" />
            <div>
              <div className="text-sm font-semibold">Customer decision</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Approve keeps this repair moving. Decline creates a follow-up for office review and re-quote handling.
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border bg-background/80 p-3 text-xs">
              <div className="font-semibold text-foreground">If approved</div>
              <div className="mt-1 text-muted-foreground">
                The visit keeps moving, the approval is saved on the job, and the technician returns to the workflow with pricing locked.
              </div>
            </div>
            <div className="rounded-lg border bg-background/80 p-3 text-xs">
              <div className="font-semibold text-foreground">If declined</div>
              <div className="mt-1 text-muted-foreground">
                The estimate is marked declined and the job moves into office follow-up for re-quote or scheduling.
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button variant="outline" className="touch-target h-12 justify-between" onClick={() => setConfirmDeclineOpen(true)}>
              <span className="inline-flex items-center gap-2"><X className="h-5 w-5" /> Decline and follow up</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button className="touch-target h-12 justify-between" disabled={!signed} onClick={approve}>
              <span className="inline-flex items-center gap-2"><Check className="h-5 w-5" /> {t("approval.approve")}</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="mt-3 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
          Declining sends the estimate back for office follow-up instead of letting the technician edit pricing on site.
        </div>
        <div className="mt-2 rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          <Wrench className="mr-1 inline h-3.5 w-3.5" />
          Use this screen when the customer needs a clear yes or no. Use job follow-up instead when the issue is scheduling, office coordination, or a return visit.
        </div>
        {property?.address ? (
          <div className="mt-2 rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <MapPin className="mr-1 inline h-3.5 w-3.5" />
            Approval recorded for {property.address}.
          </div>
        ) : null}
      </div>
    </div>
    <Dialog open={confirmDeclineOpen} onOpenChange={setConfirmDeclineOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send this estimate to office follow-up?</DialogTitle>
          <DialogDescription>
            Declining will mark the estimate as declined and move the job into office follow-up without letting the technician change pricing.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p>The technician will not change pricing here. Declining marks this approval as declined and moves the job into follow-up for office review.</p>
          <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Customer and estimate context stay tied to the job record.
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setConfirmDeclineOpen(false)}>{t("common.cancel")}</Button>
          <Button variant="destructive" onClick={() => {
            setConfirmDeclineOpen(false);
            decline();
          }}>
            Decline and create follow-up
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
