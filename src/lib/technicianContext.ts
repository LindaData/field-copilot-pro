import type { Job, JobStatus } from "./types";

const OPEN_STATUSES: JobStatus[] = [
  "Scheduled",
  "En Route",
  "Near Destination",
  "On Site",
  "Diagnosing",
  "Paused",
  "Waiting for Customer",
  "Waiting for Approval",
  "Waiting for Parts",
  "Repairing",
  "Verifying",
  "Documentation",
  "Follow-Up",
];

const FOCUS_PRIORITY: JobStatus[][] = [
  ["On Site", "Diagnosing", "Repairing", "Verifying", "Documentation"],
  ["En Route", "Near Destination"],
  ["Scheduled"],
  ["Waiting for Customer", "Waiting for Approval", "Waiting for Parts", "Paused"],
  ["Follow-Up"],
];

function bySchedule(a: Job, b: Job) {
  return +new Date(a.scheduledFor) - +new Date(b.scheduledFor);
}

export function openJobsForTechnician(jobs: Job[], technicianId: string) {
  return jobs
    .filter((job) => job.technicianId === technicianId)
    .filter((job) => OPEN_STATUSES.includes(job.status))
    .sort(bySchedule);
}

export function focusJobForTechnician(jobs: Job[], technicianId: string) {
  const openJobs = openJobsForTechnician(jobs, technicianId);

  for (const group of FOCUS_PRIORITY) {
    const match = openJobs.find((job) => group.includes(job.status));
    if (match) return match;
  }

  return openJobs[0];
}
