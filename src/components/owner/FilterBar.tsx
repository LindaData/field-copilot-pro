import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, Download, Users, X } from "lucide-react";
import {
  JOB_TYPES, SERVICE_CATEGORIES, BILLING_TYPES, RANGE_OPTIONS,
  activeFilterCount, buildChips, rangeBounds, type JobFilters, type RangeBounds,
} from "@/lib/filters";
import type { Customer, JobStatus, UserProfile } from "@/lib/types";

const STATUSES: JobStatus[] = [
  "Scheduled", "En Route", "On Site", "Diagnosing",
  "Waiting for Approval", "Waiting for Parts", "Completed", "Follow-Up",
];

interface Props {
  filters: JobFilters;
  patch: (p: Partial<JobFilters>) => void;
  reset: () => void;
  techs: UserProfile[];
  brands: string[];
  cities?: string[];
  equipmentTypes?: string[];
  customers?: Customer[];
  onExport?: () => void;
  matchedCount?: number;
  hide?: { brand?: boolean; jobType?: boolean; status?: boolean; tech?: boolean };
}

function MultiCheck({
  label, icon: Icon, values, options, onChange, allLabel,
}: {
  label: string;
  icon?: typeof Users;
  values: string[];
  options: { value: string; label: string; sub?: string }[];
  onChange: (next: string[]) => void;
  allLabel: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 gap-1">
          {Icon && <Icon className="h-4 w-4" />}
          {values.length === 0 ? allLabel : `${label}: ${values.length}`}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <div className="mb-2 text-xs font-semibold">{label}</div>
        <label className="flex items-center gap-2 py-1 text-sm">
          <input type="checkbox" checked={values.length === 0} onChange={() => onChange([])} /> {allLabel}
        </label>
        <div className="max-h-72 overflow-y-auto">
          {options.map((o) => {
            const checked = values.includes(o.value);
            return (
              <label key={o.value} className="flex items-center gap-2 py-1 text-sm">
                <input
                  type="checkbox" checked={checked}
                  onChange={(e) => onChange(e.target.checked ? [...values, o.value] : values.filter((x) => x !== o.value))}
                />
                <span>{o.label}{o.sub && <span className="ml-1 text-[10px] text-muted-foreground">· {o.sub}</span>}</span>
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function FilterBar({
  filters, patch, reset, techs, brands, cities = [], equipmentTypes = [],
  customers = [], onExport, matchedCount, hide,
}: Props) {
  const b: RangeBounds = rangeBounds(filters);
  const count = activeFilterCount(filters);
  const chips = buildChips(filters, patch, {
    techs: techs.map((t) => ({ id: t.id, name: t.name })),
    customers: customers.map((c) => ({ id: c.id, name: c.name })),
  });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filters.range} onValueChange={(v) => patch({ range: v as JobFilters["range"] })}>
          <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((r) => (<SelectItem key={r.k} value={r.k}>{r.label}</SelectItem>))}
          </SelectContent>
        </Select>

        {filters.range === "custom" && (
          <div className="flex items-center gap-1">
            <Input type="date" value={filters.customStart ?? ""} onChange={(e) => patch({ customStart: e.target.value })} className="h-9 w-36" />
            <span className="text-xs text-muted-foreground">→</span>
            <Input type="date" value={filters.customEnd ?? ""} onChange={(e) => patch({ customEnd: e.target.value })} className="h-9 w-36" />
          </div>
        )}

        {!hide?.tech && (
          <MultiCheck
            label="Technicians" icon={Users} allLabel="All technicians"
            values={filters.techIds} onChange={(v) => patch({ techIds: v })}
            options={techs.map((t) => ({ value: t.id, label: t.name, sub: t.active === false ? "inactive" : t.role }))}
          />
        )}

        {!hide?.brand && (
          <MultiCheck label="Brands" allLabel="All brands"
            values={filters.brands} onChange={(v) => patch({ brands: v })}
            options={brands.map((b) => ({ value: b, label: b }))}
          />
        )}

        {equipmentTypes.length > 0 && (
          <MultiCheck label="Equip type" allLabel="All equipment"
            values={filters.equipmentTypes} onChange={(v) => patch({ equipmentTypes: v })}
            options={equipmentTypes.map((t) => ({ value: t, label: t }))}
          />
        )}

        {!hide?.jobType && (
          <MultiCheck label="Job types" allLabel="All job types"
            values={filters.jobTypes} onChange={(v) => patch({ jobTypes: v })}
            options={JOB_TYPES.map((t) => ({ value: t, label: t }))}
          />
        )}

        <MultiCheck label="Category" allLabel="All categories"
          values={filters.serviceCategories} onChange={(v) => patch({ serviceCategories: v })}
          options={SERVICE_CATEGORIES.map((t) => ({ value: t, label: t }))}
        />

        <MultiCheck label="Billing" allLabel="All billing"
          values={filters.billingTypes} onChange={(v) => patch({ billingTypes: v })}
          options={BILLING_TYPES.map((t) => ({ value: t, label: t }))}
        />

        {cities.length > 0 && (
          <MultiCheck label="City" allLabel="All cities"
            values={filters.cities} onChange={(v) => patch({ cities: v })}
            options={cities.map((c) => ({ value: c, label: c }))}
          />
        )}

        {customers.length > 0 && (
          <MultiCheck label="Customer" allLabel="All customers"
            values={filters.customerIds} onChange={(v) => patch({ customerIds: v })}
            options={customers.map((c) => ({ value: c.id, label: c.name, sub: c.city }))}
          />
        )}

        {!hide?.status && (
          <MultiCheck label="Statuses" allLabel="All statuses"
            values={filters.statuses} onChange={(s) => patch({ statuses: s as JobStatus[] })}
            options={STATUSES.map((s) => ({ value: s, label: s }))}
          />
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 gap-1">More <ChevronDown className="h-3 w-3" /></Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-3">
            <label className="flex items-center justify-between text-sm">
              <span>Open jobs only</span>
              <Switch checked={!!filters.openOnly} onCheckedChange={(v) => patch({ openOnly: v })} />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>Waiting for parts</span>
              <Switch checked={!!filters.waitingPartsOnly} onCheckedChange={(v) => patch({ waitingPartsOnly: v })} />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>Callbacks only</span>
              <Switch checked={!!filters.callbackOnly} onCheckedChange={(v) => patch({ callbackOnly: v })} />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>Maintenance plan customers</span>
              <Switch checked={!!filters.maintenancePlanOnly} onCheckedChange={(v) => patch({ maintenancePlanOnly: v })} />
            </label>
            <div>
              <div className="mb-1 text-xs font-semibold">Revenue range ($)</div>
              <div className="flex items-center gap-1">
                <Input type="number" placeholder="Min" className="h-8" value={filters.revenueMin ?? ""}
                  onChange={(e) => patch({ revenueMin: e.target.value === "" ? undefined : Number(e.target.value) })} />
                <span className="text-xs text-muted-foreground">–</span>
                <Input type="number" placeholder="Max" className="h-8" value={filters.revenueMax ?? ""}
                  onChange={(e) => patch({ revenueMax: e.target.value === "" ? undefined : Number(e.target.value) })} />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button variant="ghost" className="h-9" onClick={reset} disabled={count === 0 && filters.range === "last-30"}>
          <X className="mr-1 h-4 w-4" /> Clear all
        </Button>
        {onExport && (
          <Button variant="outline" className="h-9" onClick={onExport}>
            <Download className="mr-1 h-4 w-4" /> Export
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1 text-[11px]">
        <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground">{b.label}</span>
        {typeof matchedCount === "number" && (
          <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground">{matchedCount} match{matchedCount === 1 ? "" : "es"}</span>
        )}
        {chips.map((c) => (
          <button key={c.key} onClick={c.clear} className="group inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-primary hover:bg-primary/20">
            {c.label} <X className="h-3 w-3 opacity-60 group-hover:opacity-100" />
          </button>
        ))}
        {count > 0 && (
          <button onClick={reset} className="text-muted-foreground underline">Clear all ({count})</button>
        )}
        {b.invalid && <span className="rounded bg-destructive/10 px-2 py-0.5 text-destructive">{b.invalid}</span>}
      </div>
    </div>
  );
}
