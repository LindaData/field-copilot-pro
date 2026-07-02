import { useStore } from "@/lib/store";
import { useTranslation } from "react-i18next";
import { Package, AlertTriangle } from "lucide-react";

export default function Parts() {
  const { state } = useStore();
  const { t } = useTranslation();
  const lowStockCount = state.parts.filter((part) => part.truckStock <= part.reorderPoint).length;
  const zeroStockCount = state.parts.filter((part) => part.truckStock === 0).length;
  const fitReviewCount = state.parts.filter((part) => Boolean(part.compatibilityNote)).length;
  return (
    <div className="flex flex-col gap-3 p-4">
      <div>
        <h1 className="text-base font-semibold">{t("parts.title")}</h1>
        <p className="text-xs text-muted-foreground">{t("parts.desc")}</p>
      </div>
      <div className="card-elev p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Truck stock focus</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Surface the parts that can block a repair, then keep fit-confidence warnings visible before a technician grabs the wrong replacement.
            </div>
          </div>
          <div className="text-xs font-medium text-muted-foreground">{state.parts.length} stocked parts</div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border bg-muted/10 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">Low stock</div>
            <div className="mt-1 text-sm font-semibold text-foreground">{lowStockCount}</div>
            <div className="mt-1 text-xs text-muted-foreground">At or below reorder level and worth watching before the next call.</div>
          </div>
          <div className="rounded-xl border bg-muted/10 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">Out of stock</div>
            <div className="mt-1 text-sm font-semibold text-foreground">{zeroStockCount}</div>
            <div className="mt-1 text-xs text-muted-foreground">Will force office coordination or a different approved part path.</div>
          </div>
          <div className="rounded-xl border bg-muted/10 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">Fit review required</div>
            <div className="mt-1 text-sm font-semibold text-foreground">{fitReviewCount}</div>
            <div className="mt-1 text-xs text-muted-foreground">Needs installed-component or manufacturer-document verification before field use.</div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {state.parts.map((p) => (
          <div key={p.id} className="card-elev p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary"><Package className="h-5 w-5" /></div>
                <div>
                  <div className="text-sm font-semibold">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.sku} · {p.brand} · {t("parts.leadDays", { days: p.leadTimeDays })}</div>
                </div>
              </div>
              <div className="text-right text-sm">
                <div className="font-semibold">${p.price.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">{t("parts.cost", { value: p.cost.toFixed(2) })}</div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <div>{t("parts.truckStock")} <strong>{p.truckStock}</strong></div>
              <div>{t("parts.reorderAt", { value: p.reorderPoint })}</div>
              <div className={p.truckStock <= p.reorderPoint ? "text-destructive" : "text-success"}>{p.truckStock <= p.reorderPoint ? t("parts.low") : t("parts.ok")}</div>
            </div>
            <div className="mt-2 grid gap-2 text-[11px] sm:grid-cols-2">
              <div className="rounded-lg border bg-muted/10 px-2.5 py-2 text-muted-foreground">
                {p.truckStock === 0
                  ? "No truck stock. Expect office sourcing before this becomes a same-visit repair."
                  : p.truckStock <= p.reorderPoint
                    ? "Low stock. Confirm availability before promising same-visit replacement."
                    : "Stock is healthy enough for routine field use."}
              </div>
              <div className="rounded-lg border bg-muted/10 px-2.5 py-2 text-muted-foreground">
                {p.compatibilityNote
                  ? "Fit confidence is not automatic. Verify against the installed component and equipment documentation first."
                  : "No extra compatibility warning is attached to this stocked part."}
              </div>
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
