import { useParams, Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Printer, Share2 } from "lucide-react";
import { SourceBadge } from "@/components/SourceBadge";
import { toast } from "sonner";

export default function Report() {
  const { id = "" } = useParams();
  const { state } = useStore();
  const job = state.jobs.find((j) => j.id === id);
  if (!job) return <div className="p-6">Not found</div>;
  const c = state.customers.find((x) => x.id === job.customerId);
  const p = state.properties.find((x) => x.id === job.propertyId);
  const eq = state.equipment.find((x) => x.id === job.equipmentId);
  const diag = state.diag[job.id];
  const measurements = diag?.measurements ?? [];
  const auth = state.auths.find((a) => a.jobId === job.id);
  const jparts = state.jobParts.filter((jp) => jp.jobId === job.id);

  const share = async () => {
    try { await navigator.clipboard.writeText(window.location.href); toast.success("Report link copied"); } catch { /* */ }
  };

  return (
    <div className="bg-muted/30 p-3">
      <div className="no-print mb-3 flex gap-2">
        <Button onClick={() => window.print()} className="touch-target flex-1"><Printer className="mr-1 h-4 w-4" /> Print / Save PDF</Button>
        <Button variant="outline" onClick={share} className="touch-target flex-1"><Share2 className="mr-1 h-4 w-4" /> Share</Button>
      </div>
      <article className="print-page mx-auto max-w-2xl space-y-4 rounded-xl bg-card p-6 shadow">
        <header className="flex items-start justify-between border-b pb-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{state.company.name}</div>
            <h1 className="text-xl font-bold">Service Report</h1>
            <div className="text-xs text-muted-foreground">{state.company.address} · {state.company.phone}</div>
          </div>
          <div className="text-right text-xs">
            <div>Job #{job.id.toUpperCase()}</div>
            <div>{new Date().toLocaleString()}</div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="font-semibold">Customer</div>
            <div>{c?.name}</div>
            <div className="text-muted-foreground">{c?.phone}</div>
          </div>
          <div>
            <div className="font-semibold">Property</div>
            <div>{p?.address}</div>
          </div>
        </section>

        {eq && (
          <section>
            <div className="text-sm font-semibold">Equipment</div>
            <div className="mt-1 rounded-md border p-2 text-sm">
              <div>{eq.manufacturer} {eq.model}</div>
              <div className="text-xs text-muted-foreground">Serial {eq.serial} · {eq.type}</div>
              {eq.manualUrls[0] && <a className="text-xs text-info underline" href={eq.manualUrls[0].url} target="_blank" rel="noreferrer">{eq.manualUrls[0].label}</a>}
            </div>
          </section>
        )}

        <section>
          <div className="text-sm font-semibold">Complaint</div>
          <div className="text-sm">{job.complaint}</div>
        </section>

        <section>
          <div className="text-sm font-semibold">Safety acknowledgments</div>
          <ul className="ml-5 list-disc text-xs">
            <li>Qualified to perform electrical tests; lockout/tagout and voltage verification followed.</li>
            <li>Did not bypass safety devices.</li>
          </ul>
        </section>

        {eq?.specs.length ? (
          <section>
            <div className="text-sm font-semibold">Verified manufacturer specs used</div>
            <ul className="mt-1 grid grid-cols-2 gap-1 text-xs">
              {eq.specs.filter(s => ["mca","mop","vrange","elec","charge"].includes(s.key)).map((s) => (
                <li key={s.key} className="rounded-md border p-2"><strong>{s.label}:</strong> {s.value}</li>
              ))}
            </ul>
            <div className="mt-2"><SourceBadge source={eq.specs[0].source} compact /></div>
          </section>
        ) : null}

        <section>
          <div className="text-sm font-semibold">Technician observations & measurements</div>
          {measurements.length === 0 ? (
            <div className="text-xs text-muted-foreground">No measurements recorded yet.</div>
          ) : (
            <table className="mt-1 w-full text-xs">
              <thead className="text-left text-muted-foreground"><tr><th>Step</th><th>Reading</th><th>Result</th></tr></thead>
              <tbody>
                {measurements.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="py-1 pr-2">{m.stepId} · {m.label}</td>
                    <td className="py-1 pr-2">{m.value} {m.unit}</td>
                    <td className="py-1">{m.withinRange === undefined ? "—" : m.withinRange ? "Within range" : "Out of range"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <div className="text-sm font-semibold">Diagnostic reasoning</div>
          <p className="text-sm">{diag?.hypothesis ?? "Diagnostic in progress."}</p>
        </section>

        <section>
          <div className="text-sm font-semibold">Work performed</div>
          <p className="text-sm">Replaced installed dual-run capacitor after verifying correct replacement against installed component and unit documentation. Retested unit under load; current within manufacturer maximum overcurrent protection.</p>
        </section>

        {jparts.length > 0 && (
          <section>
            <div className="text-sm font-semibold">Parts used</div>
            <ul className="ml-5 list-disc text-sm">
              {jparts.map((jp) => {
                const part = state.parts.find((p) => p.id === jp.partId);
                return <li key={jp.partId}>{jp.qty} × {part?.name} — ${part?.price.toFixed(2)} <span className="text-xs text-muted-foreground">{part?.compatibilityNote}</span></li>;
              })}
            </ul>
          </section>
        )}

        <section className="grid grid-cols-2 gap-3 text-sm">
          <div><div className="font-semibold">Before</div><div className="text-xs text-muted-foreground">Compressor not running, capacitor HERM 27.8 µF (below tolerance).</div></div>
          <div><div className="font-semibold">After</div><div className="text-xs text-muted-foreground">Outdoor unit running, total current 9.1 A (below MOP 15 A).</div></div>
        </section>

        <section>
          <div className="text-sm font-semibold">Recommendations</div>
          <ul className="ml-5 list-disc text-xs">
            <li>Schedule seasonal maintenance for indoor coil cleaning and condensate line flush.</li>
            <li>Replace return air filter every 60–90 days.</li>
          </ul>
        </section>

        <section className="grid grid-cols-2 gap-4 border-t pt-3 text-xs">
          <div>
            <div className="font-semibold">Customer signature</div>
            {auth?.signatureDataUrl ? (
              <img alt="signature" src={auth.signatureDataUrl} className="mt-1 h-16" />
            ) : <div className="text-muted-foreground">Not signed yet.</div>}
            <div>{auth?.signedBy} {auth?.approvedAt ? `· ${new Date(auth.approvedAt).toLocaleString()}` : ""}</div>
          </div>
          <div>
            <div className="font-semibold">Internal notes (not shared with customer)</div>
            <div className="text-muted-foreground">Verified Goodman SS-GSXN3 values. Capacitor µF treated as technician observation. Owner approval not required (within standard parts).</div>
          </div>
        </section>

        <footer className="border-t pt-3 text-[10px] text-muted-foreground">Demo report generated by HVAC Field Copilot. Customer details, prices and prior cases are demo data.</footer>
      </article>
      <div className="no-print mt-4 text-center">
        <Link className="text-sm underline" to={`/app/jobs/${job.id}`}>← Back to job</Link>
      </div>
    </div>
  );
}
