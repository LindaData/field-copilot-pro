import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Download, FileText, Printer, Share2 } from "lucide-react";
import { SourceBadge } from "@/components/SourceBadge";
import { toast } from "sonner";
import { useStatusLabel } from "@/i18n/status";
import { useDynamicText } from "@/i18n/dynamic";
import { copyText, shareOrCopyUrl, shareableCurrentUrl } from "@/lib/native";

export default function Report() {
  const { id = "" } = useParams();
  const { state } = useStore();
  const { t } = useTranslation();
  const statusLabel = useStatusLabel();
  const tx = useDynamicText();
  const nav = useNavigate();
  const job = state.jobs.find((j) => j.id === id);
  if (!job) return <div className="p-6">{t("common.notFound")}</div>;
  const c = state.customers.find((x) => x.id === job.customerId);
  const p = state.properties.find((x) => x.id === job.propertyId);
  const eq = state.equipment.find((x) => x.id === job.equipmentId);
  const diag = state.diag[job.id];
  const measurements = diag?.measurements ?? [];
  const auth = state.auths.find((a) => a.jobId === job.id);
  const jparts = state.jobParts.filter((jp) => jp.jobId === job.id);
  const measurementsInRange = measurements.filter((measurement) => measurement.withinRange === true).length;
  const measurementsOutOfRange = measurements.filter((measurement) => measurement.withinRange === false).length;
  const approvalCaptured = Boolean(auth?.signedBy);
  const reportReadyForCustomer = approvalCaptured;
  const shareSummary = `${state.company.name} service report for ${c?.name ?? job.id.toUpperCase()}\n${diag?.hypothesis ?? t("report.diagInProgress")}`;

  const partsSummary = jparts.length > 0
    ? jparts.map((jp) => {
      const part = state.parts.find((candidate) => candidate.id === jp.partId);
      return `${jp.qty} x ${part?.name ?? jp.partId}`;
    }).join("; ")
    : "No parts recorded.";

  const measurementSummary = measurements.length > 0
    ? measurements.map((m) => `${m.stepId} ${m.label}: ${m.value} ${m.unit}${m.withinRange === undefined ? "" : m.withinRange ? " (within range)" : " (out of range)"}`).join("\n")
    : "No measurements captured.";

  const reportText = [
    `${state.company.name} - ${t("report.title")}`,
    `Job: ${job.id.toUpperCase()}`,
    `Customer: ${c?.name ?? "-"}`,
    `Property: ${p?.address ?? "-"}`,
    `Equipment: ${eq ? `${eq.manufacturer} ${eq.model} / ${eq.serial}` : "None linked"}`,
    `Complaint: ${tx(job.complaint)}`,
    `Diagnostic reasoning: ${diag?.hypothesis ?? t("report.diagInProgress")}`,
    `Measurements:\n${measurementSummary}`,
    `Parts: ${partsSummary}`,
    `Status: ${statusLabel(job.status)}`,
    auth?.signedBy ? `Customer approval: ${auth.signedBy} at ${auth.approvedAt ? new Date(auth.approvedAt).toLocaleString() : "-"}` : "Customer approval: not signed",
  ].join("\n\n");

  const saveSummary = () => {
    downloadTextFile(`field-copilot-report-${job.id}.txt`, reportText);
    toast.success("Service report summary saved.");
  };

  const share = async () => {
    try {
      const result = await shareOrCopyUrl({
        title: `${t("report.title")} - ${c?.name ?? job.id.toUpperCase()}`,
        text: shareSummary,
        url: shareableCurrentUrl(),
      });
      if (result === "shared") {
        toast.success(t("report.shareToast"));
        return;
      }

      await copyText(`${reportText}\n\n${shareableCurrentUrl()}`);
      toast.success("Native share was unavailable. Report summary and link copied.");
    } catch {
      // share sheet was dismissed
    }
  };

  const printReport = () => {
    window.print();
    toast.success("Print dialog opened.");
  };

  return (
    <div className="bg-muted/30 p-3 pb-28">
      <div className="no-print mx-auto mb-3 max-w-2xl rounded-xl border bg-card p-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-normal text-muted-foreground">Customer report</div>
            <div className="mt-1 text-sm text-muted-foreground">Save, print, or share when ready.</div>
          </div>
          <div className="stat-pill bg-muted text-muted-foreground">{statusLabel(job.status)}</div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" className="touch-target h-10" onClick={() => nav(`/app/jobs/${job.id}`)}>
            <ArrowLeft className="mr-1 h-4 w-4" /> {t("report.backToJob")}
          </Button>
          {!approvalCaptured ? (
            <Button variant="outline" className="touch-target h-10" onClick={() => nav(`/app/jobs/${job.id}/approval`)}>
              Open approval
            </Button>
          ) : null}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="text-[11px] uppercase tracking-normal text-muted-foreground">Measurements</div>
            <div className="mt-1 font-semibold">{measurements.length}</div>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="text-[11px] uppercase tracking-normal text-muted-foreground">Parts</div>
            <div className="mt-1 font-semibold">{jparts.length}</div>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="text-[11px] uppercase tracking-normal text-muted-foreground">Approval</div>
            <div className="mt-1 font-semibold">{approvalCaptured ? "Signed" : "Pending"}</div>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
            <div className="text-[11px] uppercase tracking-normal text-muted-foreground">Status</div>
            <div className="mt-1 text-sm font-medium">{reportReadyForCustomer ? "Ready to share" : "Draft only"}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {reportReadyForCustomer
                ? "Approval is saved."
                : "Approval still required."}
            </div>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3">
            <div className="text-[11px] uppercase tracking-normal text-muted-foreground">Approval</div>
            <div className="mt-1 text-sm font-medium">{approvalCaptured ? "Signed" : "Still needed"}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {approvalCaptured
                ? "Attached to this report."
                : "Open approval first."}
            </div>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3">
            <div className="text-[11px] uppercase tracking-normal text-muted-foreground">Next</div>
            <div className="mt-1 text-sm font-medium">
              {approvalCaptured ? "Save, print, or share the finished report." : "Open approval, then come back here."}
            </div>
          </div>
        </div>
        {!approvalCaptured ? (
          <div className="mt-3 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
            <div className="font-semibold">Approval required before handoff.</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Open approval, then return here.
            </div>
            <Button variant="outline" className="mt-3 touch-target h-10" onClick={() => nav(`/app/jobs/${job.id}/approval`)}>
              Open customer approval
            </Button>
          </div>
        ) : null}
      </div>

      <article className="print-page mx-auto max-w-2xl space-y-4 rounded-xl bg-card p-6 shadow">
        <header className="flex items-start justify-between border-b pb-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{state.company.name}</div>
            <h1 className="text-xl font-bold">{t("report.title")}</h1>
            <div className="text-xs text-muted-foreground">{state.company.address} - {state.company.phone}</div>
          </div>
          <div className="text-right text-xs">
            <div>{t("report.jobNo", { id: job.id.toUpperCase() })}</div>
            <div>{new Date().toLocaleString()}</div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="font-semibold">{t("report.customer")}</div>
            <div>{c?.name}</div>
            <div className="text-muted-foreground">{c?.phone}</div>
          </div>
          <div>
            <div className="font-semibold">{t("report.property")}</div>
            <div>{p?.address}</div>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="text-[10px] uppercase tracking-normal text-muted-foreground">In range</div>
            <div className="mt-1 font-semibold">{measurementsInRange}</div>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="text-[10px] uppercase tracking-normal text-muted-foreground">Out of range</div>
            <div className="mt-1 font-semibold">{measurementsOutOfRange}</div>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="text-[10px] uppercase tracking-normal text-muted-foreground">Approval</div>
            <div className="mt-1 font-semibold">{approvalCaptured ? "Captured" : "Not signed"}</div>
          </div>
        </section>

        {eq && (
          <section>
            <div className="text-sm font-semibold">{t("report.equipment")}</div>
            <div className="mt-1 rounded-md border p-2 text-sm">
              <div>{eq.manufacturer} {eq.model}</div>
              <div className="text-xs text-muted-foreground">Serial {eq.serial} - {eq.type}</div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                Source documents stay in the equipment record, not in the customer copy.
              </div>
            </div>
          </section>
        )}

        <section>
          <div className="text-sm font-semibold">{t("report.complaint")}</div>
          <div className="text-sm">{tx(job.complaint)}</div>
        </section>

        <section>
          <div className="text-sm font-semibold">{t("report.safetyAck")}</div>
          <ul className="ml-5 list-disc text-xs">
            <li>{t("report.safetyAck1")}</li>
            <li>{t("report.safetyAck2")}</li>
          </ul>
        </section>

        {eq?.specs.length ? (
          <section>
            <div className="text-sm font-semibold">{t("report.verifiedSpecs")}</div>
            <ul className="mt-1 grid grid-cols-2 gap-1 text-xs">
              {eq.specs.filter((s) => ["mca", "mop", "vrange", "elec", "charge"].includes(s.key)).map((s) => (
                <li key={s.key} className="rounded-md border p-2"><strong>{s.label}:</strong> {s.value}</li>
              ))}
            </ul>
            <div className="mt-2"><SourceBadge source={eq.specs[0].source} compact /></div>
          </section>
        ) : null}

        <section>
          <div className="text-sm font-semibold">{t("report.observations")}</div>
          {measurements.length === 0 ? (
            <div className="text-xs text-muted-foreground">{t("report.noMeasurements")}</div>
          ) : (
            <table className="mt-1 w-full text-xs">
              <thead className="text-left text-muted-foreground"><tr><th>{t("report.thead.step")}</th><th>{t("report.thead.reading")}</th><th>{t("report.thead.result")}</th></tr></thead>
              <tbody>
                {measurements.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="py-1 pr-2">{m.stepId} - {m.label}</td>
                    <td className="py-1 pr-2">{m.value} {m.unit}</td>
                    <td className="py-1">{m.withinRange === undefined ? "-" : m.withinRange ? t("report.withinRange") : t("report.outOfRange")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <div className="text-sm font-semibold">{t("report.diagReasoning")}</div>
          <p className="text-sm">{diag?.hypothesis ?? t("report.diagInProgress")}</p>
        </section>

        <section>
          <div className="text-sm font-semibold">{t("report.workPerformed")}</div>
          <p className="text-sm">{t("report.workSummary")}</p>
        </section>

        <section className="rounded-lg border bg-muted/20 p-4">
          <div className="inline-flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Customer summary
          </div>
          <p className="mt-2 text-sm leading-relaxed">
            {diag?.hypothesis
              ? `We identified ${diag.hypothesis.toLowerCase()}. The technician recorded ${measurements.length} field reading${measurements.length === 1 ? "" : "s"} and documented ${jparts.length || "no"} replacement part${jparts.length === 1 ? "" : "s"} on this visit.`
              : "The technician documented the visit, captured the current condition, and left the next recommended steps in this report."}
          </p>
          {!approvalCaptured ? (
            <div className="mt-3 rounded-md border bg-background/70 px-3 py-2 text-xs text-muted-foreground">
              Customer approval has not been recorded yet. Keep this as an internal draft until the approval step is complete.
            </div>
          ) : null}
        </section>

        {jparts.length > 0 && (
          <section>
            <div className="text-sm font-semibold">{t("report.partsUsed")}</div>
            <ul className="ml-5 list-disc text-sm">
              {jparts.map((jp) => {
                const part = state.parts.find((candidate) => candidate.id === jp.partId);
                return <li key={jp.partId}>{jp.qty} x {part?.name} - ${part?.price.toFixed(2)} <span className="text-xs text-muted-foreground">{part?.compatibilityNote}</span></li>;
              })}
            </ul>
          </section>
        )}

        <section className="grid grid-cols-2 gap-3 text-sm">
          <div><div className="font-semibold">{t("report.before")}</div><div className="text-xs text-muted-foreground">{t("report.beforeBody")}</div></div>
          <div><div className="font-semibold">{t("report.after")}</div><div className="text-xs text-muted-foreground">{t("report.afterBody")}</div></div>
        </section>

        <section>
          <div className="text-sm font-semibold">{t("report.recommendations")}</div>
          <ul className="ml-5 list-disc text-xs">
            <li>{t("report.rec1")}</li>
            <li>{t("report.rec2")}</li>
          </ul>
        </section>

        <section className="grid grid-cols-2 gap-4 border-t pt-3 text-xs">
          <div>
            <div className="font-semibold">{t("report.customerSig")}</div>
            {auth?.signatureDataUrl ? (
              <img alt="signature" src={auth.signatureDataUrl} className="mt-1 h-16" />
            ) : <div className="text-muted-foreground">{t("report.notSigned")}</div>}
            <div>{auth?.signedBy} {auth?.approvedAt ? `- ${new Date(auth.approvedAt).toLocaleString()}` : ""}</div>
          </div>
          <div>
            <div className="font-semibold">{t("report.internalNotes")}</div>
            <div className="text-muted-foreground">{t("report.internalBody")}</div>
          </div>
        </section>

        <footer className="border-t pt-3 text-[10px] text-muted-foreground">{t("report.footer")} - {statusLabel(job.status)}</footer>
      </article>

      <div
        data-review-avoid="report-bottom-actions"
        className="no-print fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-lg backdrop-blur"
      >
        <div className="mx-auto grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4">
          <Button variant="outline" className="touch-target" onClick={() => nav(`/app/jobs/${job.id}`)}>
            <ArrowLeft className="mr-1 h-4 w-4" /> {t("report.backToJob")}
          </Button>
          <Button onClick={saveSummary} variant="outline" className="touch-target">
            <Download className="mr-1 h-4 w-4" /> Save text copy
          </Button>
          <Button onClick={printReport} className="touch-target">
            <Printer className="mr-1 h-4 w-4" /> {t("report.print")}
          </Button>
          <Button variant="outline" onClick={share} className="touch-target">
            <Share2 className="mr-1 h-4 w-4" /> {t("report.share")}
          </Button>
        </div>
        <div className="mx-auto mt-2 flex max-w-2xl items-center gap-2 text-[11px] text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          Share opens the native share sheet when supported, or copies the report summary plus live link as fallback.
        </div>
      </div>
    </div>
  );
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
