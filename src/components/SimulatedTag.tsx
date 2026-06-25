import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Inline marker for any surface that fakes a real integration —
 * arrival GPS, OCR scan, outgoing customer messages, payments, etc.
 * Use the `kind` prop to keep the wording consistent across the app.
 */
export type SimulatedKind = "AI" | "GPS" | "OCR" | "Communications" | "Payments";

export function SimulatedTag({
  kind, className,
}: { kind: SimulatedKind; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-accent/50 bg-accent/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground",
        className,
      )}
      title={`This action is simulated for the demo. No real ${kind.toLowerCase()} integration runs.`}
    >
      <Sparkles className="h-3 w-3" /> Simulated {kind}
    </span>
  );
}
