import { Info } from "lucide-react";

/**
 * Persistent demo-data ribbon. Mounted in both shells so it is always visible
 * regardless of route. Owners and technicians can never mistake this build
 * for a live production environment.
 */
export function DemoBanner() {
  return (
    <div className="flex items-start gap-2 border-b border-accent/50 bg-accent/20 px-3 py-1 text-[10px] text-accent-foreground sm:text-[11px]">
      <Info className="mt-[1px] h-3.5 w-3.5 shrink-0" />
      <div className="leading-snug">
        <span className="font-semibold">Demo build.</span>{" "}
        AI guidance, GPS, OCR, messages, and payments are simulated. Only items labeled
        <em> Manufacturer Verified</em> use source-backed equipment details.
      </div>
    </div>
  );
}
