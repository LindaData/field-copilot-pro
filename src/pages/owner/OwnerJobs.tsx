import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { applyJobFilters, deriveJobType } from "@/lib/filters";
import { useJobFilters } from "@/lib/useJobFilters";
import FilterBar from "@/components/owner/FilterBar";

export default function OwnerJobs() {
  const { state } = useStore();
  const { filters, patch, reset } = useJobFilters("owner");
  const [q, setQ] = useState("");

  const techs = state.users.filter((u) => u.role !== "Owner");
  const brands = Array.from(new Set(state.equipment.map((e) => e.manufacturer))).sort();

  const filteredJobs = useMemo(
    () => applyJobFilters(state.jobs, filters, { equipment: state.equipment, properties: state.properties }),
    [state.jobs, state.equipment, state.properties, filters],
  );

  const rows = useMemo(() => {
    if (!q) return filteredJobs;
    const needle = q.toLowerCase();
    return filteredJobs.filter((j) => {
      const c = state.customers.find((c) => c.id === j.customerId);
      return [c?.name, j.complaint, j.status, deriveJobType(j)].some((x) => x?.toLowerCase().includes(needle));
    });
  }, [filteredJobs, q, state.customers]);

  const exportCsv = () => {
    const header = ["id", "customer", "complaint", "type", "technician", "status", "scheduled"];
    const lines = [header.join(",")].concat(rows.map((j) => {
      const c = state.customers.find((x) => x.id === j.customerId);
      const u = state.users.find((x) => x.id === j.technicianId);
      return [j.id, c?.name ?? "", j.complaint.replaceAll(",", ";"), deriveJobType(j), u?.name ?? "", j.status, j.scheduledFor].join(",");
    }));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `jobs-${Date.now()}.csv`; a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Jobs</h1>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-64 pl-8" />
        </div>
      </div>

      <FilterBar filters={filters} patch={patch} reset={reset} techs={techs} brands={brands} onExport={exportCsv} />

      <Card className="overflow-hidden p-0">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No jobs match these filters.
            <div className="mt-3"><Button variant="outline" onClick={reset}>Reset filters</Button></div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Customer</th><th>Complaint</th><th>Type</th>
                <th>Technician</th><th>Status</th><th>Scheduled</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((j) => {
                const c = state.customers.find((x) => x.id === j.customerId);
                const u = state.users.find((x) => x.id === j.technicianId);
                return (
                  <tr key={j.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{c?.name}</td>
                    <td className="text-muted-foreground">{j.complaint}</td>
                    <td className="text-xs">{deriveJobType(j)}</td>
                    <td>{u?.name}</td>
                    <td><Badge variant="secondary">{j.status}</Badge></td>
                    <td className="text-xs text-muted-foreground">
                      {new Date(j.scheduledFor).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <div className="text-xs text-muted-foreground">
        {rows.length} jobs · matches current owner filters · <button className="underline" onClick={exportCsv}><Download className="-mt-0.5 inline h-3 w-3" /> Export CSV</button>
      </div>
    </div>
  );
}
