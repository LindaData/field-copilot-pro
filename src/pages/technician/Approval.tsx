import { useNavigate, useParams } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AlertTriangle, Check, Lock, X } from "lucide-react";

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
  const partPrice = cap.price;
  const laborHrs = 0.75;
  const laborRate = state.company.laborRate;
  const labor = +(laborHrs * laborRate).toFixed(2);
  const subtotal = +(partPrice + labor).toFixed(2);
  const tax = +(subtotal * (state.company.tax / 100)).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);

  useEffect(() => {
    const c = sigRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
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
    <div className="flex flex-col gap-4 p-4">
      <div className="card-elev p-4">
        <h1 className="text-lg font-semibold">{t("approval.title")}</h1>
        <p className="mt-1 text-sm">{t("approval.intro", { name: customer?.name?.split(" ")[0] ?? "" })}</p>
        <div className="mt-3 rounded-md bg-muted/40 p-3 text-sm">
          <div className="font-medium">{t("approval.whatWeFound")}</div>
          <p className="mt-1 text-muted-foreground">{t("approval.findings")}</p>
        </div>

        <div className="mt-3 rounded-md border p-3 text-sm">
          <div className="mb-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-muted-foreground">
            <div className="inline-flex items-center gap-1 font-medium text-foreground"><Lock className="h-3.5 w-3.5" /> Office pricing</div>
            <div className="mt-1">Technicians can explain the estimate and capture approval here, but line-item pricing stays locked to the company rate card.</div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>{t("approval.partRow", { name: cap.name })}</span>
            <span className="font-semibold">${partPrice.toFixed(2)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span>{t("approval.labor")}</span>
            <span className="text-right text-xs">{laborHrs.toFixed(2)} {t("approval.hr")} x ${laborRate.toFixed(2)}{t("approval.perHr")}</span>
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>{t("approval.laborSubtotal")}</span><span>${labor.toFixed(2)}</span></div>
          <div className="mt-1 flex justify-between"><span>{t("approval.subtotal")}</span><span>${subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>{t("approval.tax", { pct: state.company.tax })}</span><span>${tax.toFixed(2)}</span></div>
          <div className="mt-2 flex justify-between border-t pt-2 text-base font-semibold"><span>{t("approval.total")}</span><span>${total.toFixed(2)}</span></div>
          <div className="mt-1 text-[11px] text-muted-foreground">{t("approval.pricesDemo")}</div>
        </div>

        <div className="mt-4">
          <label className="text-xs font-medium">{t("approval.emailReceipt")}</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="touch-target mt-1" />
        </div>

        <div className="mt-4">
          <div className="text-xs font-medium">{t("approval.signature")}</div>
          <div className="mt-1 rounded-md border bg-card">
            <canvas ref={sigRef} width={600} height={180} className="h-40 w-full touch-none rounded-md" />
          </div>
          <Button variant="ghost" size="sm" className="mt-1" onClick={clear}>{t("approval.clear")}</Button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" className="touch-target h-12" onClick={decline}><X className="mr-1 h-5 w-5" /> Decline and follow up</Button>
          <Button className="touch-target h-12" disabled={!signed} onClick={approve}><Check className="mr-1 h-5 w-5" /> {t("approval.approve")}</Button>
        </div>
        <div className="mt-3 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
          Declining sends the estimate back for office follow-up instead of letting the technician edit pricing on site.
        </div>
      </div>
    </div>
  );
}
