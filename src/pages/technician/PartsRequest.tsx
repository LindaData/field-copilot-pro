import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Camera, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import type { PartRequest } from "@/lib/types";

export default function PartsRequest() {
  const { id = "" } = useParams();
  const { state, addPartRequest, setJobStatus } = useStore();
  const { t } = useTranslation();
  const nav = useNavigate();
  const job = state.jobs.find((j) => j.id === id);
  const eq = job ? state.equipment.find((e) => e.id === job.equipmentId) : undefined;
  const existing = state.partRequests.filter((p) => p.jobId === id);

  const [name, setName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [equipmentModel, setEquipmentModel] = useState(eq?.model ?? "");
  const [specs, setSpecs] = useState("");
  const [qty, setQty] = useState("1");
  const [urgency, setUrgency] = useState<PartRequest["urgency"]>("Normal");
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");
  const [compatibility, setCompatibility] = useState<PartRequest["compatibility"]>("Unknown");
  const [photo, setPhoto] = useState<string | undefined>();
  const [moveStatus, setMoveStatus] = useState(true);

  if (!job) return <div className="p-6">{t("common.jobNotFound")}</div>;

  const onPhoto: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => setPhoto(r.result as string); r.readAsDataURL(f);
  };

  const submit = () => {
    if (!name.trim()) { toast.error(t("partsRequest.toast.nameRequired")); return; }
    const now = new Date().toISOString();
    const pr: PartRequest = {
      id: `pr-${Date.now()}`, jobId: job.id, customerId: job.customerId,
      equipmentId: job.equipmentId, technicianId: job.technicianId,
      name: name.trim(), partNumber: partNumber.trim() || undefined,
      equipmentModel: equipmentModel.trim() || undefined,
      specs: specs.trim() || undefined,
      qty: Math.max(1, parseInt(qty || "1", 10)),
      urgency, supplier: supplier.trim() || undefined,
      photoDataUrl: photo, notes: notes.trim() || undefined,
      compatibility,
      status: compatibility === "Unknown" ? "Identification Needed" : "Compatibility Review",
      createdAt: now, updatedAt: now,
    };
    addPartRequest(pr);
    if (moveStatus) setJobStatus(job.id, "Waiting for Parts");
    toast.success(t("partsRequest.toast.submitted"));
    nav(`/app/jobs/${job.id}`);
  };

  const compLabel = (c: PartRequest["compatibility"]) =>
    c === "Verified by qualified user" ? t("partsRequest.comp.Verified")
    : c === "Likely" ? t("partsRequest.comp.Likely")
    : t("partsRequest.comp.Unknown");

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <button onClick={() => nav(-1)} className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft className="h-3 w-3" /> {t("partsRequest.back")}</button>
      <h1 className="text-lg font-semibold">{t("partsRequest.title")}</h1>

      <div className="card-elev space-y-3 p-4">
        <Field label={t("partsRequest.fields.name")}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("partsRequest.namePlaceholder")} className="touch-target" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t("partsRequest.fields.partNumber")}><Input value={partNumber} onChange={(e) => setPartNumber(e.target.value)} placeholder={t("partsRequest.ph.partNumber")} className="touch-target" /></Field>
          <Field label={t("partsRequest.fields.qty")}><Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} className="touch-target" /></Field>
        </div>
        <Field label={t("partsRequest.fields.model")}><Input value={equipmentModel} onChange={(e) => setEquipmentModel(e.target.value)} className="touch-target" /></Field>
        <Field label={t("partsRequest.fields.specs")}><Textarea value={specs} onChange={(e) => setSpecs(e.target.value)} placeholder={t("partsRequest.ph.specs")} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t("partsRequest.fields.urgency")}>
            <Select value={urgency} onValueChange={(v) => setUrgency(v as PartRequest["urgency"]) }>
              <SelectTrigger className="touch-target"><SelectValue /></SelectTrigger>
              <SelectContent>{(["Low","Normal","High","Critical"] as const).map((u) => (<SelectItem key={u} value={u}>{t(`partsRequest.urgency.${u}`)}</SelectItem>))}</SelectContent>
            </Select>
          </Field>
          <Field label={t("partsRequest.fields.supplier")}><Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder={t("partsRequest.ph.supplier")} className="touch-target" /></Field>
        </div>
        <Field label={t("partsRequest.fields.compatibility")}>
          <Select value={compatibility} onValueChange={(v) => setCompatibility(v as PartRequest["compatibility"])}>
            <SelectTrigger className="touch-target"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Unknown">{t("partsRequest.comp.Unknown")}</SelectItem>
              <SelectItem value="Likely">{t("partsRequest.comp.Likely")}</SelectItem>
              <SelectItem value="Verified by qualified user">{t("partsRequest.comp.Verified")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {compatibility !== "Verified by qualified user" && (
          <div className="rounded-md border border-warning/40 bg-warning/10 px-2 py-1 text-[11px]"><ShieldAlert className="mr-1 inline h-3 w-3" /> {t("partsRequest.compNotice", { value: compLabel(compatibility) })}</div>
        )}
        <Field label={t("partsRequest.fields.photo")}>
          <label className="flex h-24 cursor-pointer items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
            {photo ? <img src={photo} alt="part" className="h-full object-contain" /> : <span><Camera className="mr-1 inline h-4 w-4" /> {t("partsRequest.takePhoto")}</span>}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />
          </label>
        </Field>
        <Field label={t("partsRequest.fields.notes")}><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("partsRequest.ph.notes")} /></Field>

        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={moveStatus} onChange={(e) => setMoveStatus(e.target.checked)} className="h-4 w-4" />
          {t("partsRequest.moveStatus")}
        </label>

        <Button className="touch-target h-12 w-full" onClick={submit}>{t("partsRequest.submit")}</Button>
      </div>

      {existing.length > 0 && (
        <div className="card-elev p-4">
          <div className="mb-2 text-sm font-semibold">{t("partsRequest.existing")}</div>
          <ul className="space-y-1 text-xs">
            {existing.map((pr) => (
              <li key={pr.id} className="flex items-center justify-between rounded-md border p-2">
                <div>
                  <div className="font-medium">{pr.name} <span className="text-muted-foreground">×{pr.qty}</span></div>
                  <div className="text-[10px] text-muted-foreground">{compLabel(pr.compatibility)}</div>
                </div>
                <Badge variant="outline">{pr.status}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
