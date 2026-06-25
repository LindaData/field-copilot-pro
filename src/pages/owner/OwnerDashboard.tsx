import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Wallet, Wrench, Users, Clock, Briefcase, AlertTriangle } from "lucide-react";

const KPI = ({ icon: Icon, label, value, delta, good }: { icon: typeof Wallet; label: string; value: string; delta?: string; good?: boolean }) => (
  <Card className="p-4">
    <div className="flex items-center justify-between">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <div className="mt-1 text-2xl font-bold">{value}</div>
    {delta && (
      <div className={`mt-1 inline-flex items-center gap-1 text-xs ${good ? "text-success" : "text-destructive"}`}>
        {good ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />} {delta}
      </div>
    )}
  </Card>
);

export default function OwnerDashboard() {
  const { state } = useStore();
  const [range, setRange] = useState("30");
  const [tech, setTech] = useState("all");
  const openJobs = state.jobs.filter((j) => j.status !== "Completed").length;

  const failureModes = [
    { name: "Failed dual-run capacitor", pct: 38 },
    { name: "Pitted contactor", pct: 22 },
    { name: "Low refrigerant / leak", pct: 15 },
    { name: "TXV issue", pct: 12 },
    { name: "Thermostat / controls", pct: 8 },
    { name: "Other", pct: 5 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Operations overview</h1>
          <div className="text-xs text-muted-foreground">All values are demo data.</div>
        </div>
        <div className="flex gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Year to date</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tech} onValueChange={setTech}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Technician" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All technicians</SelectItem>
              {state.users.filter(u => u.role !== "Owner").map(u => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="w-32"><SelectValue placeholder="Brand" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All brands</SelectItem>
              <SelectItem value="goodman">Goodman</SelectItem>
              <SelectItem value="carrier">Carrier</SelectItem>
              <SelectItem value="trane">Trane</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="w-32"><SelectValue placeholder="Job type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All job types</SelectItem>
              <SelectItem value="service">Service</SelectItem>
              <SelectItem value="maint">Maintenance</SelectItem>
              <SelectItem value="install">Install</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI icon={Wrench} label="First-time fix rate" value="87%" delta="+6 pts vs prior 30d" good />
        <KPI icon={AlertTriangle} label="Callback rate" value="4.8%" delta="−1.7 pts" good />
        <KPI icon={Clock} label="Avg diagnostic time" value="42 min" delta="−18 min" good />
        <KPI icon={Briefcase} label="Open jobs" value={String(openJobs)} delta="3 in waiting" />
        <KPI icon={Wallet} label="Revenue" value="$182,440" delta="+12% MoM" good />
        <KPI icon={Wallet} label="Gross margin" value="58%" delta="+3 pts" good />
        <KPI icon={Users} label="Technician utilization" value="76%" delta="+4 pts" good />
        <KPI icon={Wallet} label="Est. monthly savings" value="$11,820" delta="vs paper workflow" good />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-4">
          <div className="mb-3 text-sm font-semibold">Top failure modes</div>
          <div className="space-y-2">
            {failureModes.map((f) => (
              <div key={f.name}>
                <div className="flex justify-between text-sm"><span>{f.name}</span><span className="font-medium">{f.pct}%</span></div>
                <div className="h-2 w-full rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${f.pct}%` }} /></div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-3 text-sm font-semibold">Parts causing return trips</div>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span>Generic dual-run capacitor</span><Badge variant="secondary">5</Badge></li>
            <li className="flex justify-between"><span>30A 2P contactor</span><Badge variant="secondary">3</Badge></li>
            <li className="flex justify-between"><span>TXV 2-ton</span><Badge variant="secondary">2</Badge></li>
          </ul>
          <div className="mt-3 text-[11px] text-muted-foreground">Verify each generic part against installed components.</div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-3 text-sm font-semibold">Recent jobs</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="py-2">Customer</th><th>Complaint</th><th>Technician</th><th>Status</th><th>Time</th></tr>
            </thead>
            <tbody className="divide-y">
              {state.jobs.map((j) => {
                const c = state.customers.find(x => x.id === j.customerId);
                const u = state.users.find(x => x.id === j.technicianId);
                return (
                  <tr key={j.id}>
                    <td className="py-2">{c?.name}</td>
                    <td className="text-muted-foreground">{j.complaint}</td>
                    <td>{u?.name}</td>
                    <td><Badge variant="secondary">{j.status}</Badge></td>
                    <td className="text-xs text-muted-foreground">{new Date(j.scheduledFor).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
