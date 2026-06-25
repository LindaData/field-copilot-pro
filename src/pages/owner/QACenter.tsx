import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { TESTS, runAll, APP_VERSION } from "@/lib/qa/registry";
import type { QARun, TestCategory } from "@/lib/qa/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, AlertTriangle, HelpCircle, Download, RotateCcw, Play } from "lucide-react";

const STATUS_META: Record<string, { color: string; icon: any; label: string }> = {
  pass: { color: "text-emerald-600", icon: CheckCircle2, label: "Pass" },
  fail: { color: "text-destructive", icon: XCircle, label: "Fail" },
  blocked: { color: "text-amber-600", icon: AlertTriangle, label: "Blocked" },
  "human-review": { color: "text-blue-600", icon: HelpCircle, label: "Human review" },
  "not-run": { color: "text-muted-foreground", icon: HelpCircle, label: "Not run" },
};

export default function QACenter() {
  const { state, setState } = useStore();
  const runs: QARun[] = (state as any).qaRuns ?? [];
  const last = runs[0];
  const [filter, setFilter] = useState<TestCategory | "All">("All");
  const [search, setSearch] = useState("");

  const summary = useMemo(() => {
    const c = { pass: 0, fail: 0, blocked: 0, "human-review": 0, "not-run": 0 } as Record<string, number>;
    for (const t of TESTS) {
      const r = last?.results[t.id];
      c[r?.status ?? "not-run"]++;
    }
    const criticalFails = TESTS.filter((t) => {
      const r = last?.results[t.id];
      return r?.status === "fail" && (t.severity === "P0" || t.severity === "P1");
    });
    const humanCount = c["human-review"];
    let verdict: "Go" | "Conditional Go" | "No-Go" = "No-Go";
    let why = "Run the suite first.";
    if (last) {
      const p0fail = TESTS.some((t) => t.severity === "P0" && last.results[t.id]?.status === "fail");
      const p1fail = TESTS.some((t) => t.severity === "P1" && last.results[t.id]?.status === "fail");
      if (p0fail) { verdict = "No-Go"; why = "P0 defect open — safety / data / verified-spec failure."; }
      else if (p1fail) { verdict = "No-Go"; why = "P1 core-workflow defect open."; }
      else if (humanCount > 0) { verdict = "Conditional Go"; why = `${humanCount} test(s) still require qualified HVAC field validation.`; }
      else { verdict = "Go"; why = "All automated tests passing and no field-required gaps."; }
    }
    const total = TESTS.length;
    const score = total ? Math.round(((c.pass + c["human-review"] * 0.5) / total) * 100) : 0;
    return { counts: c, criticalFails, verdict, why, score, total };
  }, [last]);

  const run = () => {
    const results = runAll(state);
    const newRun: QARun = { id: `run-${Date.now()}`, startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), appVersion: APP_VERSION, results };
    setState((s) => ({ ...s, qaRuns: [newRun, ...((s as any).qaRuns ?? [])].slice(0, 25) } as any));
  };

  const reset = () => setState((s) => ({ ...s, qaRuns: [] } as any));

  const exportReport = () => {
    const report = { generatedAt: new Date().toISOString(), appVersion: APP_VERSION, summary, run: last, tests: TESTS.map((t) => ({ ...t, run: undefined, result: last?.results[t.id] ?? null })) };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `qa-report-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const categories: (TestCategory | "All")[] = ["All", ...Array.from(new Set(TESTS.map((t) => t.category)))];
  const rows = TESTS.filter((t) => (filter === "All" || t.category === filter) && (!search || `${t.id} ${t.scenario}`.toLowerCase().includes(search.toLowerCase())));

  const verdictColor = summary.verdict === "Go" ? "bg-emerald-600" : summary.verdict === "Conditional Go" ? "bg-amber-500" : "bg-destructive";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">QA &amp; Release Center</h1>
          <p className="text-sm text-muted-foreground">Build {APP_VERSION} · {TESTS.length} tests · last run {last ? new Date(last.startedAt).toLocaleString() : "never"}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={run}><Play className="mr-1 h-4 w-4" /> Run all tests</Button>
          <Button variant="outline" onClick={exportReport} disabled={!last}><Download className="mr-1 h-4 w-4" /> Export</Button>
          <Button variant="outline" onClick={reset} disabled={!runs.length}><RotateCcw className="mr-1 h-4 w-4" /> Reset history</Button>
        </div>
      </div>

      <Card className={`p-4 text-primary-foreground ${verdictColor}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase opacity-80">Release recommendation</div>
            <div className="text-2xl font-bold">{summary.verdict}</div>
            <div className="text-sm opacity-90">{summary.why}</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase opacity-80">Readiness score</div>
            <div className="text-3xl font-bold">{summary.score}<span className="text-base opacity-80">/100</span></div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {(["pass","fail","blocked","human-review","not-run"] as const).map((k) => {
          const M = STATUS_META[k]; const Icon = M.icon;
          return (
            <Card key={k} className="p-3">
              <div className={`inline-flex items-center gap-1 text-xs font-medium ${M.color}`}><Icon className="h-4 w-4" /> {M.label}</div>
              <div className="mt-1 text-2xl font-bold">{summary.counts[k]}</div>
            </Card>
          );
        })}
      </div>

      <Card className="p-4">
        <div className="text-sm font-semibold">Critical defects (P0/P1 failing)</div>
        {summary.criticalFails.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">None recorded in last run.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {summary.criticalFails.map((t) => (
              <li key={t.id} className="flex items-start gap-2">
                <Badge variant="destructive">{t.severity}</Badge>
                <span><strong>{t.id}</strong> — {t.scenario}<div className="text-xs text-muted-foreground">{last?.results[t.id]?.actual}</div></span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tests…" className="w-64" />
        <div className="flex flex-wrap gap-1">
          {categories.map((c) => (
            <button key={c} onClick={() => setFilter(c)} className={`rounded-md border px-2 py-1 text-xs ${filter === c ? "bg-primary text-primary-foreground" : "bg-card"}`}>{c}</button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">ID</th><th>Category</th><th>Sev</th><th>Kind</th>
              <th className="w-1/3">Scenario</th><th>Status</th><th>Actual</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((t) => {
              const r = last?.results[t.id];
              const M = STATUS_META[r?.status ?? "not-run"]; const Icon = M.icon;
              return (
                <tr key={t.id} className="align-top hover:bg-muted/30">
                  <td className="px-3 py-2 font-mono text-xs">{t.id}</td>
                  <td className="text-xs">{t.category}</td>
                  <td><Badge variant={t.severity === "P0" ? "destructive" : t.severity === "P1" ? "default" : "secondary"}>{t.severity}</Badge></td>
                  <td className="text-xs text-muted-foreground">{t.kind}</td>
                  <td className="text-xs">{t.scenario}<div className="mt-0.5 text-muted-foreground">Expected: {t.expected}</div></td>
                  <td><span className={`inline-flex items-center gap-1 text-xs font-medium ${M.color}`}><Icon className="h-3.5 w-3.5" />{M.label}</span></td>
                  <td className="text-xs text-muted-foreground">{r?.actual ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card className="border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Disclaimer.</strong> Final HVAC diagnostic and safety validation requires review and field testing by qualified HVAC professionals using actual equipment, instruments, manufacturer documentation, applicable codes, and company procedures. Automated &amp; simulated tests passing do not constitute technical validation.
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold">Run history</div>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {runs.slice(0, 10).map((r) => {
            const counts = Object.values(r.results).reduce((acc: any, x) => ({ ...acc, [x.status]: (acc[x.status] ?? 0) + 1 }), {} as any);
            return <li key={r.id}>{new Date(r.startedAt).toLocaleString()} · v{r.appVersion} · pass {counts.pass ?? 0} / fail {counts.fail ?? 0} / human {counts["human-review"] ?? 0}</li>;
          })}
          {runs.length === 0 && <li>No runs yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
