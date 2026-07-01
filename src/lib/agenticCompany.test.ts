import { describe, expect, it } from "vitest";
import {
  CEO_ID,
  createAgentConversation,
  getCeoFacingAgents,
  getDirectReports,
  LINDADATA_AGENTS,
  routeExecutiveForRequest,
} from "./agenticCompany";

describe("LindaData agentic company", () => {
  it("keeps specialists from talking directly to the CEO", () => {
    const conversation = createAgentConversation(
      "Build the HVAC review layer, save notes to GitHub, and make Codex-ready fixes.",
    );

    const specialistToCeo = conversation.messages.filter((message) => {
      const sender = LINDADATA_AGENTS.find((agent) => agent.id === message.from);
      return sender?.tier === "specialist" && message.to === CEO_ID;
    });

    expect(specialistToCeo).toHaveLength(0);
  });

  it("routes HVAC review-layer work to product, technology, data, and QA executives", () => {
    const routed = routeExecutiveForRequest(
      "Review the HVAC owner equipment page, fix the mobile review layer, collect equipment documentation, and open a PR.",
    );

    expect(routed).toContain("chief-of-staff");
    expect(routed).toContain("cto");
    expect(routed).toContain("cpo");
    expect(routed).toContain("cdo");
    expect(routed).toContain("qa-release-chief");
  });

  it("routes secret and token work through the safety chief", () => {
    const routed = routeExecutiveForRequest(
      "Make sure the GitHub token, API key, and review key are never exposed in frontend code.",
    );

    expect(routed).toContain("ciso");
  });

  it("exposes only executives as CEO-facing agents", () => {
    expect(getCeoFacingAgents().every((agent) => agent.tier === "executive")).toBe(true);
  });

  it("has direct reports under the CTO for implementation work", () => {
    const ctoReports = getDirectReports("cto").map((agent) => agent.id);

    expect(ctoReports).toEqual(expect.arrayContaining(["frontend-builder", "backend-api-builder", "github-codex-operator"]));
  });
});
