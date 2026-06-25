import { useStore } from "@/lib/store";
import { Package, AlertTriangle } from "lucide-react";

export default function Parts() {
  const { state } = useStore();
  return (
    <div className="flex flex-col gap-3 p-4">
      <div>
        <h1 className="text-base font-semibold">Parts & inventory</h1>
        <p className="text-xs text-muted-foreground">Truck stock, reorder points, and demo pricing. Generic parts must be verified against installed components.</p>
      </div>
      <div className="flex flex-col gap-2">
        {state.parts.map((p) => (
          <div key={p.id} className="card-elev p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary"><Package className="h-5 w-5" /></div>
                <div>
                  <div className="text-sm font-semibold">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.sku} · {p.brand} · Lead {p.leadTimeDays}d</div>
                </div>
              </div>
              <div className="text-right text-sm">
                <div className="font-semibold">${p.price.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">cost ${p.cost.toFixed(2)}</div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <div>Truck stock: <strong>{p.truckStock}</strong></div>
              <div>Reorder at: {p.reorderPoint}</div>
              <div className={p.truckStock <= p.reorderPoint ? "text-destructive" : "text-success"}>{p.truckStock <= p.reorderPoint ? "Low" : "OK"}</div>
            </div>
            {p.compatibilityNote && (
              <div className="mt-2 inline-flex items-start gap-1 rounded-md border border-accent/40 bg-accent/10 p-2 text-[11px]">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5" /> {p.compatibilityNote}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
