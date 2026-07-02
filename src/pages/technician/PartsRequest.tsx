import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Camera, ChevronRight, ClipboardList, ImagePlus, ShieldAlert, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import type { PartRequest } from "@/lib/types";

export default function PartsRequest() {
  const { id = "" } = useParams();
  const { state, addPartRequest, setJobStatus, updateJob } = useStore();
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

  const customer = state.customers.find((c) => c.id === job.customerId);

  const onPhoto: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submit = () => {
    if (!name.trim()) {
      toast.error(t("partsRequest.toast.nameRequired"));
      return;
    }

    const now = new Date().toISOString();
    const quantity = Math.max(1, parseInt(qty || "1", 10));
    const requestStatus: PartRequest["status"] =
      compatibility === "Unknown"
        ? "Identification Needed"
        : moveStatus
          ? "Requested"
          : "Compatibility Review";
    const officeHandoff = moveStatus
      ? `Office handoff ${new Date(now).toLocaleString()}: ${name.trim()} x${quantity}${partNumber.trim() ? ` - PN ${partNumber.trim()}` : ""}${supplier.trim() ? ` via ${supplier.trim()}` : ""}.`
      : undefined;

    const request: PartRequest = {
      id: `pr-${Date.now()}`,
      jobId: job.id,
      customerId: job.customerId,
      equipmentId: job.equipmentId,
      technicianId: job.technicianId,
      name: name.trim(),
      partNumber: partNumber.trim() || undefined,
      equipmentModel: equipmentModel.trim() || undefined,
      specs: specs.trim() || undefined,
      qty: quantity,
      urgency,
      supplier: supplier.trim() || undefined,
      photoDataUrl: photo,
      notes: [notes.trim(), officeHandoff].filter(Boolean).join("\n\n") || undefined,
      compatibility,
      status: requestStatus,
      createdAt: now,
      updatedAt: now,
    };

    addPartRequest(request);

    if (moveStatus) {
      setJobStatus(job.id, "Waiting for Parts");
      updateJob(job.id, {
        notes: [job.notes, officeHandoff].filter(Boolean).join("\n"),
      });
    }

    toast.success(moveStatus ? "Parts request submitted and job moved to Waiting for Parts." : t("partsRequest.toast.submitted"));
    nav(`/app/jobs/${job.id}`);
  };

  const compLabel = (value: PartRequest["compatibility"]) =>
    value === "Verified by qualified user" ? t("partsRequest.comp.Verified")
      : value === "Likely" ? t("partsRequest.comp.Likely")
        : t("partsRequest.comp.Unknown");

  const handoffPreview = moveStatus
    ? `Office handoff: request ${name.trim() || "part"} for ${customer?.name ?? "customer"} and move job to Waiting for Parts.`
    : "Keep the current visit moving and send this request for compatibility review only.";
  const selectedPhotoLabel = photo ? "1 photo attached for office review." : "No photo attached yet.";

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <button onClick={() => nav(-1)} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft className="h-3 w-3" /> {t("partsRequest.back")}
      </button>

      <div className="card-elev p-4">
        <div className="text-[11px] uppercase tracking-normal text-muted-foreground">Parts workflow</div>
        <h1 className="mt-1 text-lg font-semibold">{t("partsRequest.title")}</h1>
        <div className="mt-1 text-sm text-muted-foreground">
          Capture enough context for office purchasing without forcing the technician to write a long narrative.
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="text-[11px] uppercase tracking-normal text-muted-foreground">Equipment</div>
            <div className="mt-1 font-medium">{eq ? `${eq.manufacturer} ${eq.model}` : "Not linked yet"}</div>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="text-[11px] uppercase tracking-normal text-muted-foreground">Customer</div>
            <div className="mt-1 font-medium">{customer?.name ?? "Unknown customer"}</div>
          </div>
        </div>
      </div>

      <div className="card-elev space-y-3 p-4">
        <div className="rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground">
          Fill in the exact part details first. Then decide whether this job should pause now for office parts coordination or stay in the current visit status.
        </div>

        <Field label={t("partsRequest.fields.name")}>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("partsRequest.namePlaceholder")} className="touch-target" />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label={t("partsRequest.fields.partNumber")}>
            <Input value={partNumber} onChange={(event) => setPartNumber(event.target.value)} placeholder={t("partsRequest.ph.partNumber")} className="touch-target" />
          </Field>
          <Field label={t("partsRequest.fields.qty")}>
            <Input type="number" min={1} value={qty} onChange={(event) => setQty(event.target.value)} className="touch-target" />
          </Field>
        </div>

        <Field label={t("partsRequest.fields.model")}>
          <Input value={equipmentModel} onChange={(event) => setEquipmentModel(event.target.value)} className="touch-target" />
        </Field>

        <Field label={t("partsRequest.fields.specs")}>
          <Textarea value={specs} onChange={(event) => setSpecs(event.target.value)} placeholder={t("partsRequest.ph.specs")} />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label={t("partsRequest.fields.urgency")}>
            <Select value={urgency} onValueChange={(value) => setUrgency(value as PartRequest["urgency"])}>
              <SelectTrigger className="touch-target"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["Low", "Normal", "High", "Critical"] as const).map((value) => (
                  <SelectItem key={value} value={value}>{t(`partsRequest.urgency.${value}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("partsRequest.fields.supplier")}>
            <Input value={supplier} onChange={(event) => setSupplier(event.target.value)} placeholder={t("partsRequest.ph.supplier")} className="touch-target" />
          </Field>
        </div>

        <Field label={t("partsRequest.fields.compatibility")}>
          <div className="mb-1 text-[11px] text-muted-foreground">Fit confidence for the installed equipment</div>
          <Select value={compatibility} onValueChange={(value) => setCompatibility(value as PartRequest["compatibility"])}>
            <SelectTrigger className="touch-target"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Unknown">{t("partsRequest.comp.Unknown")}</SelectItem>
              <SelectItem value="Likely">{t("partsRequest.comp.Likely")}</SelectItem>
              <SelectItem value="Verified by qualified user">{t("partsRequest.comp.Verified")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {compatibility !== "Verified by qualified user" ? (
          <div className="rounded-md border border-warning/40 bg-warning/10 px-2 py-1 text-[11px]">
            <ShieldAlert className="mr-1 inline h-3 w-3" /> {t("partsRequest.compNotice", { value: compLabel(compatibility) })}
          </div>
        ) : null}

        <Field label={t("partsRequest.fields.photo")}>
          <div className="space-y-2">
            <div className="flex h-28 items-center justify-center rounded-md border border-dashed bg-muted/20 text-xs text-muted-foreground">
              {photo ? <img src={photo} alt="part" className="h-full max-w-full object-contain" /> : <span>Attach the failed part, nameplate, or wiring photo for office review.</span>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex h-10 cursor-pointer items-center justify-center rounded-md border text-xs font-medium">
                <Camera className="mr-1 h-4 w-4" /> {t("partsRequest.takePhoto")}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />
              </label>
              <label className="flex h-10 cursor-pointer items-center justify-center rounded-md border text-xs font-medium">
                <ImagePlus className="mr-1 h-4 w-4" /> Upload image
                <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
              </label>
            </div>
            {photo ? (
              <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setPhoto(undefined)}>
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove photo
              </Button>
            ) : null}
            <div className="text-[11px] text-muted-foreground">{selectedPhotoLabel}</div>
          </div>
        </Field>

        <Field label={t("partsRequest.fields.notes")}>
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={t("partsRequest.ph.notes")} />
        </Field>

        <div className="rounded-xl border border-warning/40 bg-warning/10 p-4">
          <div className="flex items-start gap-2">
            <ClipboardList className="mt-0.5 h-4 w-4 text-warning" />
            <div className="min-w-0">
              <div className="text-sm font-semibold">Office handoff</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Decide whether this request should pause the job now or stay as a review item while the current visit continues.
              </div>
            </div>
          </div>
          <label className="mt-4 flex items-center gap-2 text-xs">
            <input type="checkbox" checked={moveStatus} onChange={(event) => setMoveStatus(event.target.checked)} className="h-4 w-4" />
            {t("partsRequest.moveStatus")}
          </label>
          <div className="mt-2 rounded-lg border bg-background/80 px-3 py-2 text-xs text-muted-foreground">
            {handoffPreview}
          </div>
          {moveStatus ? (
            <div className="mt-2 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Submitting will move this job to <span className="font-medium text-foreground">Waiting for Parts</span> and add an office handoff note to the job.
            </div>
          ) : (
            <div className="mt-2 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Submit now to log the request while keeping the current job status unchanged.
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full bg-background px-2.5 py-1 text-foreground">{selectedPhotoLabel}</span>
            <span className="rounded-full bg-background px-2.5 py-1 text-foreground">
              {moveStatus ? "Job will move to Waiting for Parts" : "Job status will stay as-is"}
            </span>
          </div>
        </div>

        <Button className="touch-target h-12 w-full justify-between" onClick={submit}>
          <span className="inline-flex items-center gap-2"><Wrench className="h-4 w-4" /> {t("partsRequest.submit")}</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {existing.length > 0 ? (
        <div className="card-elev p-4">
          <div className="mb-2 text-sm font-semibold">{t("partsRequest.existing")}</div>
          <ul className="space-y-1 text-xs">
            {existing.map((request) => (
              <li key={request.id} className="flex items-center justify-between rounded-md border p-2">
                <div>
                  <div className="font-medium">{request.name} <span className="text-muted-foreground">x{request.qty}</span></div>
                  <div className="text-[10px] text-muted-foreground">{compLabel(request.compatibility)}{request.photoDataUrl ? " - Photo attached" : ""}</div>
                </div>
                <Badge variant="outline">{request.status}</Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
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
