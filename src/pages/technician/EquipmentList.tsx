import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import { Wrench } from "lucide-react";

export default function EquipmentList() {
  const { state } = useStore();
  return (
    <div className="flex flex-col gap-3 p-4">
      <div>
        <h1 className="text-lg font-semibold">Equipment</h1>
        <p className="text-xs text-muted-foreground">All equipment on file. Tap a unit to see verified specs and manuals.</p>
      </div>
      <div className="flex flex-col gap-2">
        {state.equipment.map((eq) => (
          <Link key={eq.id} to={`/app/equipment/${eq.id}`} className="card-elev flex items-center gap-3 p-3 active:bg-muted/30">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary"><Wrench className="h-5 w-5" /></div>
            <div className="flex-1">
              <div className="text-sm font-semibold">{eq.manufacturer} {eq.model}</div>
              <div className="text-xs text-muted-foreground">Serial {eq.serial} · {eq.type}</div>
            </div>
            {eq.specs.length > 0 && <span className="stat-pill bg-success/15 text-success">Specs verified</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
