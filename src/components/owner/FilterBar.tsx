import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, Download, Users, X } from "lucide-react";
import {
  JOB_TYPES, RANGE_OPTIONS, activeFilterCount, summarize, type JobFilters,
  rangeBounds, type RangeBounds,
} from "@/lib/filters";
import type { JobStatus, UserProfile } from "@/lib/types";

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
  onExport?: () => void;
  /** Hide controls the caller doesn't want (e.g. a customer-detail page hides customer filter). */
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

export default function FilterBar({ filters, patch, reset, techs, brands, onExport, hide }: Props) {
  const b: RangeBounds = rangeBounds(filters);
  const count = activeFilterCount(filters);
  const chips = summarize(filters, b);

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
            values={filters.techIds}
            onChange={(techIds) => patch({ techIds })}
            options={techs.map((t) => ({ value: t.id, label: t.name, sub: t.role }))}
          />
        )}

        {!hide?.brand && (
          <MultiCheck
            label="Brands" allLabel="All brands"
            values={filters.brands}
            onChange={(brandsNext) => patch({ brands: brandsNext })}
            options={brands.map((b) => ({ value: b, label: b }))}
          />
        )}

        {!hide?.jobType && (
          <MultiCheck
            label="Job types" allLabel="All job types"
            values={filters.jobTypes}
            onChange={(jobTypes) => patch({ jobTypes })}
            options={JOB_TYPES.map((t) => ({ value: t, label: t }))}
          />
        )}

        {!hide?.status && (
          <MultiCheck
            label="Statuses" allLabel="All statuses"
            values={filters.statuses}
            onChange={(s) => patch({ statuses: s as JobStatus[] })}
            options={STATUSES.map((s) => ({ value: s, label: s }))}
          />
        )}

        <Button variant="ghost" className="h-9" onClick={reset} disabled={count === 0 && filters.range === "last-30"}>
          <X className="mr-1 h-4 w-4" /> Reset
        </Button>
        {onExport && (
          <Button variant="outline" className="h-9" onClick={onExport}>
            <Download className="mr-1 h-4 w-4" /> Export
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1 text-[11px]">
        {chips.map((c) => (
          <span key={c} className="rounded bg-muted px-2 py-0.5 text-muted-foreground">{c}</span>
        ))}
        {b.invalid && <span className="rounded bg-destructive/10 px-2 py-0.5 text-destructive">{b.invalid}</span>}
      </div>
    </div>
  );
}
