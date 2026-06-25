import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function OwnerJobs() {
  const { state } = useStore();
  const [q, setQ] = useState("");
  const rows = state.jobs.filter((j) => {
    if (!q) return true;
    const c = state.customers.find((c) => c.id === j.customerId);
    return [c?.name, j.complaint, j.status].some((x) => x?.toLowerCase().includes(q.toLowerCase()));
  });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Jobs</h1>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search jobs…" className="w-64" />
      </div>
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="px-3 py-2">Customer</th><th>Complaint</th><th>Technician</th><th>Status</th><th>Scheduled</th></tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((j) => {
              const c = state.customers.find((x) => x.id === j.customerId);
              const u = state.users.find((x) => x.id === j.technicianId);
              return (
                <tr key={j.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{c?.name}</td>
                  <td className="text-muted-foreground">{j.complaint}</td>
                  <td>{u?.name}</td>
                  <td><Badge variant="secondary">{j.status}</Badge></td>
                  <td className="text-xs text-muted-foreground">{new Date(j.scheduledFor).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
