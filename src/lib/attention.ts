/**
 * Owner "Needs Attention" derivation + dashboard drill-down presets.
 *
 * Everything here is computed against the same filtered job set used by the
 * Today and Performance tabs, so the dashboard never shows numbers that
 * cannot be reproduced by clicking through to a list.
 */
import type {
  Authorization, DiagnosticSession, Job, ServiceReport,
} from "./types";
import type { JobFilters } from "./filters";

export type AttentionKind =
  | "overdue"
  | "paused-too-long"
  | "waiting-approval"
  | "waiting-parts"
  | "possible-callback"
  | "diag-review"
  | "missing-report"
  | "customer-follow-up";

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  jobId?: string;
  customerId?: string;
  title: string;
  detail: string;
  /** Route that opens the underlying record. */
  href: string;
  /** Approximate severity for visual sort: higher = more urgent. */
  weight: number;
}

const OVERDUE_GRACE_MS = 60 * 60 * 1000;        // 1h past schedule with no travel
const LONG_PAUSE_MS = 30 * 60 * 1000;           // single pause > 30 min
const CALLBACK_WINDOW_MS = 30 * 86_400_000;     // 30 days

function activePauseMs(j: Job, now: number): number {
  const active = j.pauses?.find((p) => !p.endedAt);
  if (!active) return 0;
  return now - +new Date(active.startedAt);
}

export interface AttentionCtx {
  jobs: Job[];
  diag: Record<string, DiagnosticSession>;
  auths: Authorization[];
  reports: ServiceReport[];
  customerFeedback: { jobId: string; rating: number }[];
  now?: number;
}

export function computeAttention(ctx: AttentionCtx): AttentionItem[] {
  const now = ctx.now ?? Date.now();
  const out: AttentionItem[] = [];

  for (const j of ctx.jobs) {
    if (j.status === "Cancelled" || j.status === "Completed") {
      if (j.status === "Completed" && !ctx.reports.some((r) => r.jobId === j.id)) {
        out.push({
          id: `mr:${j.id}`, kind: "missing-report", jobId: j.id,
          customerId: j.customerId,
          title: "Service report missing",
          detail: "Completed job has no customer-ready report on file.",
          href: `/app/owner/jobs?preset=missing-report&focus=${j.id}`,
          weight: 50,
        });
      }
      continue;
    }

    // Overdue scheduled
    if (j.status === "Scheduled" && +new Date(j.scheduledFor) + OVERDUE_GRACE_MS < now) {
      out.push({
        id: `od:${j.id}`, kind: "overdue", jobId: j.id, customerId: j.customerId,
        title: "Scheduled job is overdue",
        detail: `Scheduled ${new Date(j.scheduledFor).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}, technician has not started travel.`,
        href: `/app/owner/jobs?preset=overdue&focus=${j.id}`,
        weight: 90,
      });
    }

    // Paused too long
    const apMs = activePauseMs(j, now);
    if (apMs > LONG_PAUSE_MS) {
      out.push({
        id: `pl:${j.id}`, kind: "paused-too-long", jobId: j.id, customerId: j.customerId,
        title: "Job paused over 30 minutes",
        detail: `Paused for ${Math.round(apMs / 60000)} min · ${j.pauses!.find((p) => !p.endedAt)?.reason}`,
        href: `/app/owner/jobs?preset=paused&focus=${j.id}`,
        weight: 80,
      });
    }

    if (j.status === "Waiting for Approval") {
      out.push({
        id: `wa:${j.id}`, kind: "waiting-approval", jobId: j.id, customerId: j.customerId,
        title: "Waiting for customer approval",
        detail: "Estimate sent, no decision yet.",
        href: `/app/owner/jobs?preset=waiting-approval&focus=${j.id}`,
        weight: 70,
      });
    }
    if (j.status === "Waiting for Parts") {
      out.push({
        id: `wp:${j.id}`, kind: "waiting-parts", jobId: j.id, customerId: j.customerId,
        title: "Waiting on parts",
        detail: "Job paused until ordered part arrives.",
        href: `/app/owner/jobs?preset=waiting-parts&focus=${j.id}`,
        weight: 60,
      });
    }

    // Diagnostic flagged for review (steps invalidated)
    const d = ctx.diag[j.id];
    if (d && (d.invalidatedStepIds?.length ?? 0) > 0) {
      out.push({
        id: `dr:${j.id}`, kind: "diag-review", jobId: j.id, customerId: j.customerId,
        title: "Diagnostic needs review",
        detail: `${d.invalidatedStepIds!.length} step(s) marked needs-review after a re-answer.`,
        href: `/app/owner/jobs?preset=diag-review&focus=${j.id}`,
        weight: 65,
      });
    }
  }

  // Possible callbacks — same customer + same complaint within window
  const completedByCustomer = new Map<string, Job[]>();
  for (const j of ctx.jobs) {
    if (j.status !== "Completed") continue;
    const arr = completedByCustomer.get(j.customerId) ?? [];
    arr.push(j); completedByCustomer.set(j.customerId, arr);
  }
  for (const [custId, jobs] of completedByCustomer) {
    const sorted = [...jobs].sort((a, b) => +new Date(a.scheduledFor) - +new Date(b.scheduledFor));
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1], cur = sorted[i];
      const gap = +new Date(cur.scheduledFor) - +new Date(prev.scheduledFor);
      if (gap > CALLBACK_WINDOW_MS) continue;
      if (cur.isCallback || (cur.serviceCategory && cur.serviceCategory === prev.serviceCategory)) {
        out.push({
          id: `pc:${cur.id}`, kind: "possible-callback", jobId: cur.id, customerId: custId,
          title: cur.isCallback ? "Confirmed callback" : "Possible callback",
          detail: `${cur.serviceCategory ?? "Service"} visit within ${Math.round(gap / 86_400_000)}d of prior visit.`,
          href: `/app/owner/jobs?preset=callback&focus=${cur.id}`,
          weight: cur.isCallback ? 75 : 45,
        });
      }
    }
  }

  // Customer follow-ups — low ratings
  for (const fb of ctx.customerFeedback) {
    if (fb.rating <= 3) {
      const j = ctx.jobs.find((x) => x.id === fb.jobId);
      if (!j) continue;
      out.push({
        id: `cf:${fb.jobId}`, kind: "customer-follow-up", jobId: fb.jobId, customerId: j.customerId,
        title: `Customer rated ${fb.rating}/5`,
        detail: "Low rating — owner should reach out before review request.",
        href: `/app/owner/jobs?preset=follow-up&focus=${fb.jobId}`,
        weight: 55,
      });
    }
  }

  return out.sort((a, b) => b.weight - a.weight);
}

/** Map a dashboard preset key to a filter override applied on top of the current filters. */
export function presetToFilterPatch(preset: string): Partial<JobFilters> {
  switch (preset) {
    case "overdue":          return { statuses: ["Scheduled"] };
    case "paused":           return { openOnly: true };
    case "waiting-approval": return { statuses: ["Waiting for Approval"] };
    case "waiting-parts":    return { statuses: ["Waiting for Parts"] };
    case "missing-report":   return { statuses: ["Completed"] };
    case "diag-review":      return { openOnly: true };
    case "callback":         return { visitType: "callback" };
    case "follow-up":        return { statuses: ["Completed", "Follow-Up"] };
    case "en-route":         return { statuses: ["En Route", "Near Destination"] };
    case "on-site":          return { statuses: ["On Site", "Diagnosing", "Repairing", "Verifying", "Documentation"] };
    case "completed-today":  return { statuses: ["Completed"], range: "today" };
    case "first-visit":      return { visitType: "first" };
    case "open":             return { openOnly: true };
    default:                 return {};
  }
}

export const PRESET_LABELS: Record<string, string> = {
  overdue: "Overdue scheduled jobs",
  paused: "Paused jobs",
  "waiting-approval": "Waiting for approval",
  "waiting-parts": "Waiting for parts",
  "missing-report": "Completed without a report",
  "diag-review": "Diagnostic needs review",
  callback: "Callbacks",
  "follow-up": "Customer follow-ups",
  "en-route": "Crews en route",
  "on-site": "Crews on site",
  "completed-today": "Completed today",
  "first-visit": "First visits",
  open: "Open jobs",
};
