import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Printer, Share2 } from "lucide-react";
import { SourceBadge } from "@/components/SourceBadge";
import { toast } from "sonner";
import { useStatusLabel } from "@/i18n/status";
import { useDynamicText } from "@/i18n/dynamic";
import { shareOrCopyUrl, shareableCurrentUrl } from "@/lib/native";

export default function Report() {
  const { id = "" } = useParams();
  const { state } = useStore();
  const { t } = useTranslation();
  const statusLabel = useStatusLabel();
  const tx = useDynamicText();
  const job = state.jobs.find((j) => j.id === id);
  if (!job) return <div className="p-6">{t("common.notFound")}</div>;
  const c = state.customers.find((x) => x.id === job.customerId);
  const p = state.properties.find((x) => x.id === job.propertyId);
  const eq = state.equipment.find((x) => x.id === job.equipmentId);
  const diag = state.diag[job.id];
  const measurements = diag?.measurements ?? [];
  const auth = state.auths.find((a) => a.jobId === job.id);
  const jparts = state.jobParts.filter((jp) => jp.jobId === job.id);

  const share = async () => {
    try {
      await shareOrCopyUrl({
        title: t("report.title"),
        text: t("report.title"),
        url: shareableCurrentUrl(),
      });
      toast.success(t("report.shareToast"));
    } catch { /* */ }
  };

  return (
    <div className="bg-muted/30 p-3">
      <div className="no-print mb-3 flex gap-2">
        <Button onClick={() => window.print()} className="touch-target flex-1"><Printer className="mr-1 h-4 w-4" /> {t("report.print")}</Button>
        <Button variant="outline" onClick={share} className="touch-target flex-1"><Share2 className="mr-1 h-4 w-4" /> {t("report.share")}</Button>
      </div>
      <article className="print-page mx-auto max-w-2xl space-y-4 rounded-xl bg-card p-6 shadow">
        <header className="flex items-start justify-between border-b pb-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{state.company.name}</div>
            <h1 className="text-xl font-bold">{t("report.title")}</h1>
            <div className="text-xs text-muted-foreground">{state.company.address} · {state.company.phone}</div>
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

        {eq && (
          <section>
            <div className="text-sm font-semibold">{t("report.equipment")}</div>
            <div className="mt-1 rounded-md border p-2 text-sm">
              <div>{eq.manufacturer} {eq.model}</div>
              <div className="text-xs text-muted-foreground">Serial {eq.serial} · {eq.type}</div>
              {eq.manualUrls[0] && <a className="text-xs text-info underline" href={eq.manualUrls[0].url} target="_blank" rel="noreferrer">{eq.manualUrls[0].label}</a>}
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
              {eq.specs.filter(s => ["mca","mop","vrange","elec","charge"].includes(s.key)).map((s) => (
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
                    <td className="py-1 pr-2">{m.stepId} · {m.label}</td>
                    <td className="py-1 pr-2">{m.value} {m.unit}</td>
                    <td className="py-1">{m.withinRange === undefined ? "—" : m.withinRange ? t("report.withinRange") : t("report.outOfRange")}</td>
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

        {jparts.length > 0 && (
          <section>
            <div className="text-sm font-semibold">{t("report.partsUsed")}</div>
            <ul className="ml-5 list-disc text-sm">
              {jparts.map((jp) => {
                const part = state.parts.find((p) => p.id === jp.partId);
                return <li key={jp.partId}>{jp.qty} × {part?.name} — ${part?.price.toFixed(2)} <span className="text-xs text-muted-foreground">{part?.compatibilityNote}</span></li>;
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
            <div>{auth?.signedBy} {auth?.approvedAt ? `· ${new Date(auth.approvedAt).toLocaleString()}` : ""}</div>
          </div>
          <div>
            <div className="font-semibold">{t("report.internalNotes")}</div>
            <div className="text-muted-foreground">{t("report.internalBody")}</div>
          </div>
        </section>

        <footer className="border-t pt-3 text-[10px] text-muted-foreground">{t("report.footer")} · {statusLabel(job.status)}</footer>
      </article>
      <div className="no-print mt-4 text-center">
        <Link className="text-sm underline" to={`/app/jobs/${job.id}`}>{t("report.backToJob")}</Link>
      </div>
    </div>
  );
}
