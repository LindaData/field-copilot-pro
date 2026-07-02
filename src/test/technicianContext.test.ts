import { describe, expect, it } from "vitest";
import { JOBS } from "@/lib/seed";
import { focusJobForTechnician, openJobsForTechnician } from "@/lib/technicianContext";
import type { Job } from "@/lib/types";

function makeJob(id: string, status: Job["status"], scheduledFor: string): Job {
  return {
    id,
    customerId: "c-1",
    propertyId: "p-1",
    equipmentId: "eq-1",
    technicianId: "u-alex",
    complaint: "No cooling",
    status,
    scheduledFor,
    priority: "Normal",
  };
}

describe("technicianContext", () => {
  it("prefers active in-field work over later scheduled jobs", () => {
    const jobs = [
      makeJob("j-scheduled", "Scheduled", "2026-07-01T10:00:00.000Z"),
      makeJob("j-enroute", "En Route", "2026-07-01T09:00:00.000Z"),
      makeJob("j-onsite", "On Site", "2026-07-01T11:00:00.000Z"),
    ];

    expect(focusJobForTechnician(jobs, "u-alex")?.id).toBe("j-onsite");
  });

  it("keeps the seeded Alex demo focused on the first scheduled repair after reseed", () => {
    const focusJob = focusJobForTechnician(JOBS, "u-alex");

    expect(focusJob?.id).toBe("j-1");
    expect(focusJob?.status).toBe("Scheduled");
  });

  it("filters out completed and cancelled jobs from the open technician queue", () => {
    const jobs = [
      makeJob("j-complete", "Completed", "2026-07-01T08:00:00.000Z"),
      makeJob("j-cancelled", "Cancelled", "2026-07-01T09:00:00.000Z"),
      makeJob("j-follow-up", "Follow-Up", "2026-07-01T10:00:00.000Z"),
    ];

    expect(openJobsForTechnician(jobs, "u-alex").map((job) => job.id)).toEqual(["j-follow-up"]);
  });
});
