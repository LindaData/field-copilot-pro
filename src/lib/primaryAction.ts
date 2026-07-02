import type { Authorization, DiagnosticSession, Job } from "./types";
import { jobActivePause } from "./store";

export type PrimaryActionKind =
  | "start-travel"
  | "confirm-arrival"
  | "resume-job"
  | "start-diagnosis"
  | "continue-diagnosis"
  | "request-approval"
  | "waiting-approval"
  | "waiting-parts"
  | "complete-documentation"
  | "open-job"
  | "none";

export interface PrimaryAction {
  kind: PrimaryActionKind;
  label: string;
  helper?: string;
  to: string;
  variant?: "default" | "accent" | "muted";
}

/**
 * Returns the single most important next action for the technician.
 * Drives both the Today CTA and the sticky JobDetail CTA.
 */
export function getPrimaryAction(
  job: Job | undefined,
  diag?: DiagnosticSession,
  auth?: Authorization,
): PrimaryAction {
  if (!job) return { kind: "none", label: "No active job", to: "/app/jobs", variant: "muted" };

  const base = `/app/jobs/${job.id}`;
  const active = jobActivePause(job);
  if (active) {
    return {
      kind: "resume-job",
      label: "Resume Job",
      helper: `Paused: ${active.reason}`,
      to: base,
      variant: "accent",
    };
  }

  switch (job.status) {
    case "Scheduled":
      return {
        kind: "start-travel",
        label: "Start travel in Maps",
        helper: "Open the route and start travel timing for this stop",
        to: base,
        variant: "default",
      };
    case "En Route":
      return {
        kind: "confirm-arrival",
        label: "Confirm arrival",
        helper: "Use this when the technician is actually on site",
        to: base,
        variant: "accent",
      };
    case "On Site": {
      const started = !!diag && diag.results.length > 0;
      return started
        ? { kind: "continue-diagnosis", label: "Continue Diagnosis", to: `${base}/diagnose`, variant: "default" }
        : { kind: "start-diagnosis", label: "Start Diagnosis", to: `${base}/diagnose`, variant: "default" };
    }
    case "Diagnosing": {
      const hasHyp = !!diag?.hypothesis;
      const hasAuth = !!auth?.approvedAt;
      if (hasHyp && !hasAuth) {
        return { kind: "request-approval", label: "Get Customer Approval", to: `${base}/approval`, variant: "accent" };
      }
      return { kind: "continue-diagnosis", label: "Continue Diagnosis", to: `${base}/diagnose`, variant: "default" };
    }
    case "Waiting for Approval":
      return {
        kind: "waiting-approval",
        label: "Waiting for Approval",
        helper: "Open quote with customer",
        to: `${base}/approval`,
        variant: "muted",
      };
    case "Waiting for Parts":
      return {
        kind: "waiting-parts",
        label: "View Part Status",
        helper: "Job is on hold for parts",
        to: `${base}/parts-request`,
        variant: "muted",
      };
    case "Completed":
      return { kind: "complete-documentation", label: "View Service Report", to: `${base}/report`, variant: "muted" };
    case "Follow-Up":
      return { kind: "open-job", label: "Open follow-up visit", to: base, variant: "default" };
    default:
      return { kind: "open-job", label: "Open Job", to: base, variant: "default" };
  }
}

export function primaryActionForToday(args: {
  current?: Job;
  upcoming?: Job;
  diag?: DiagnosticSession;
  auth?: Authorization;
}): PrimaryAction {
  if (args.current) return getPrimaryAction(args.current, args.diag, args.auth);
  if (args.upcoming) return getPrimaryAction(args.upcoming);
  return {
    kind: "none",
    label: "All caught up",
    helper: "No more jobs scheduled today",
    to: "/app/jobs",
    variant: "muted",
  };
}
