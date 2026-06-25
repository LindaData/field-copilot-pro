import { useStore } from "@/lib/store";
import { Input } from "@/components/ui/input";

export default function Settings() {
  const { state } = useStore();
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="card-elev p-4">
        <h1 className="text-base font-semibold">Company profile</h1>
        <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
          <label>Company name<Input className="mt-1 touch-target" defaultValue={state.company.name} /></label>
          <label>Phone<Input className="mt-1 touch-target" defaultValue={state.company.phone} /></label>
          <label>Address<Input className="mt-1 touch-target" defaultValue={state.company.address} /></label>
          <div className="grid grid-cols-2 gap-2">
            <label>Labor rate ($/hr)<Input className="mt-1 touch-target" defaultValue={state.company.laborRate} /></label>
            <label>Tax (%)<Input className="mt-1 touch-target" defaultValue={state.company.tax} /></label>
          </div>
        </div>
      </div>

      <div className="card-elev p-4">
        <h2 className="text-sm font-semibold">Users</h2>
        <ul className="mt-2 divide-y text-sm">
          {state.users.map((u) => (
            <li key={u.id} className="flex items-center gap-3 py-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${u.avatarColor}`}>{u.name.split(" ").map(p => p[0]).join("")}</div>
              <div className="flex-1">{u.name}</div>
              <div className="text-xs text-muted-foreground">{u.role}</div>
            </li>
          ))}
        </ul>
      </div>

      <div className="card-elev p-4">
        <h2 className="text-sm font-semibold">Integrations</h2>
        <p className="mt-1 text-xs text-muted-foreground">Future AI provider integration will live here. API keys are never stored client-side in this demo.</p>
        <div className="mt-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">Connect provider — coming in V2</div>
      </div>

      <div className="card-elev p-4">
        <h2 className="text-sm font-semibold">Audit log</h2>
        <p className="mt-1 text-xs text-muted-foreground">Full audit log UI is on the V2 roadmap. Job and diagnostic actions are already tracked in local state.</p>
      </div>
    </div>
  );
}
