import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";

import App from "@/App";
import i18n, { LANGS } from "@/i18n";
import { resolveAnswer } from "@/lib/answers/resolver";
import { manufacturerDocsForEquipment, MANUFACTURER_SOURCE_LIBRARY, manualLinksForEquipment } from "@/lib/manufacturerSources";
import { documentationResearchForEquipment, top50ResearchStats, US_HVAC_TOP_50_DOCUMENTATION_RESEARCH } from "@/lib/hvacTop50";
import {
  HVAC_COMPANY_WEBSITE_REVIEW,
  HVAC_FIELD_SERVICE_PLATFORM_REVIEW,
  HVAC_MARKET_SYSTEM_PRIORITIES,
} from "@/lib/hvacMarketSystems";
import { getPrimaryAction } from "@/lib/primaryAction";
import { getReviewEndpoint, hostedReviewEndpointForLocation } from "@/lib/reviewCapture";
import { DOCS, EQUIPMENT, INITIAL_DIAG, JOBS } from "@/lib/seed";
import { DEMO_DATA_VERSION, DEMO_STORE_KEY, StoreProvider, useStore, type StoreState } from "@/lib/store";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function isToday(value: string) {
  const d = new Date(value);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate()
  );
}

function StoreProbe({ onState }: { onState: (state: StoreState) => void }) {
  const { state } = useStore();

  useEffect(() => {
    onState(state);
  }, [onState, state]);

  return (
    <div data-testid="store-counts">
      {state.customers.length}:{state.jobs.length}:{state.demoDataVersion}
    </div>
  );
}

function runIndexRedirect(search: string) {
  const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
  const script = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1];
  if (!script) throw new Error("index redirect script not found");

  let replacedPath = "";
  vm.runInNewContext(script, {
    URLSearchParams,
    window: {
      location: {
        search,
        pathname: "/field-copilot-pro/",
        hash: "",
      },
      history: {
        replaceState: (_state: unknown, _title: string, path: string) => {
          replacedPath = path;
        },
      },
    },
  });
  return replacedPath;
}

describe("migration baseline", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    window.localStorage.clear();
    window.history.pushState({}, "", "/");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("renders the application landing page", async () => {
    render(<App />);

    expect(await screen.findByText("Enter Demo as Technician")).toBeInTheDocument();
    expect(screen.getByText("Field Copilot")).toBeInTheDocument();
    expect(screen.getByText("Field demo")).toBeInTheDocument();
    expect(screen.getByText("How it works")).toBeInTheDocument();
  });

  it("shows today's first scheduled repair as the technician focus instead of pretending the tech is already on site", async () => {
    window.history.pushState({}, "", "/app/today");

    render(<App />);

    expect(await screen.findByText("First scheduled stop")).toBeInTheDocument();
    expect(screen.getByText("Start travel in Maps")).toBeInTheDocument();
    expect(screen.getAllByText("Scheduled").length).toBeGreaterThan(0);
  });

  it("shows the same next move on the technician jobs list as the current field priority", async () => {
    window.history.pushState({}, "", "/app/jobs");

    render(<App />);

    expect(await screen.findByText("Next move")).toBeInTheDocument();
    expect(screen.getByText("Start travel in Maps")).toBeInTheDocument();
    expect(screen.getByText("Open the route and start travel timing for this stop")).toBeInTheDocument();
  });

  it("shows travel, access, and source readiness on the technician jobs list", async () => {
    window.history.pushState({}, "", "/app/jobs");

    render(<App />);

    expect(await screen.findByText("Ready for this stop")).toBeInTheDocument();
    expect(screen.getByText("Travel")).toBeInTheDocument();
    expect(screen.getByText("Access")).toBeInTheDocument();
    expect(screen.getByText("Source")).toBeInTheDocument();
    expect(screen.getByText("Open full job")).toBeInTheDocument();
  });

  it("keeps current priority, next stop, and blocked work visible on the today page", async () => {
    window.history.pushState({}, "", "/app/today");

    render(<App />);

    expect(await screen.findByText("Shift focus")).toBeInTheDocument();
    expect(screen.getByText("Current priority")).toBeInTheDocument();
    expect(screen.getByText("Queue next stop")).toBeInTheDocument();
    expect(screen.getByText("Blocked or follow-up")).toBeInTheDocument();
    expect(screen.getByText("Open full schedule")).toBeInTheDocument();
  });

  it("preserves review endpoint parameters during the GitHub Pages SPA redirect", () => {
    const redirected = runIndexRedirect(
      "?p=%2Freview&reviewEndpoint=https%3A%2F%2Freviews.example%2Freview-note&cacheBust=123",
    );

    expect(redirected).toBe(
      "/field-copilot-pro/review?reviewEndpoint=https%3A%2F%2Freviews.example%2Freview-note&cacheBust=123",
    );
  });

  it("renders the technician diagnostic route from the main route configuration", async () => {
    window.history.pushState({}, "", "/app/jobs/j-1/diagnose");

    render(<App />);

    expect(await screen.findByText("Confirm customer complaint")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/app/jobs/j-1/diagnose");
    expect(screen.queryByText("404")).not.toBeInTheDocument();
  });

  it("initializes the demo store with customers, jobs, version metadata, and current-day jobs", async () => {
    let observed: StoreState | undefined;

    render(
      <StoreProvider>
        <StoreProbe onState={(state) => { observed = state; }} />
      </StoreProvider>,
    );

    await waitFor(() => expect(observed).toBeDefined());

    expect(observed?.customers.length).toBeGreaterThan(0);
    expect(observed?.jobs.length).toBeGreaterThan(0);
    expect(observed?.demoDataVersion).toBe(DEMO_DATA_VERSION);
    expect(observed?.demoAnchor).toBe(todayKey());
    expect(observed?.jobs.some((job) => isToday(job.scheduledFor))).toBe(true);
  });

  it("reseeds stale demo data when the stored version or date anchor is outdated", async () => {
    window.localStorage.setItem(DEMO_STORE_KEY, JSON.stringify({
      demoDataVersion: "stale-version",
      demoAnchor: "2000-1-1",
      jobs: [{ id: "stale-job" }],
      customers: [],
    }));

    let observed: StoreState | undefined;

    render(
      <StoreProvider>
        <StoreProbe onState={(state) => { observed = state; }} />
      </StoreProvider>,
    );

    await waitFor(() => expect(observed).toBeDefined());

    expect(observed?.demoDataVersion).toBe(DEMO_DATA_VERSION);
    expect(observed?.demoAnchor).toBe(todayKey());
    expect(observed?.customers.length).toBeGreaterThan(0);
    expect(observed?.jobs.some((job) => job.id === "stale-job")).toBe(false);
  });

  it("reseeds fresh demo state from a shareable resetDemo=1 link and removes the reset flag from the URL", async () => {
    window.localStorage.setItem(DEMO_STORE_KEY, JSON.stringify({
      demoDataVersion: DEMO_DATA_VERSION,
      demoAnchor: todayKey(),
      jobs: JOBS.map((job) => job.id === "j-1" ? { ...job, status: "On Site" } : job),
      customers: [],
    }));
    window.history.pushState({}, "", "/app/today?resetDemo=1");

    let observed: StoreState | undefined;

    render(
      <StoreProvider>
        <StoreProbe onState={(state) => { observed = state; }} />
      </StoreProvider>,
    );

    await waitFor(() => expect(observed).toBeDefined());

    expect(observed?.demoDataVersion).toBe(DEMO_DATA_VERSION);
    expect(observed?.jobs.find((job) => job.id === "j-1")?.status).toBe("Scheduled");
    expect(observed?.customers.length).toBeGreaterThan(0);
    expect(window.location.search).not.toContain("resetDemo=1");
  });

  it("initializes English, Spanish, and French translation resources", async () => {
    expect(LANGS.map((lang) => lang.code)).toEqual(["en", "es", "fr"]);
    expect(i18n.hasResourceBundle("en", "translation")).toBe(true);
    expect(i18n.hasResourceBundle("es", "translation")).toBe(true);
    expect(i18n.hasResourceBundle("fr", "translation")).toBe(true);

    await i18n.changeLanguage("en");
    expect(i18n.t("nav.today")).toBe("Today");

    await i18n.changeLanguage("es");
    expect(i18n.t("nav.today")).toBe("Hoy");
    expect(i18n.t("nav.jobs")).toBe("Órdenes");

    await i18n.changeLanguage("fr");
    expect(i18n.t("nav.today")).toBe("Aujourd'hui");
    expect(i18n.t("landing.enterAsOwner")).toBe("Démo propriétaire");
  });

  it("points the primary job diagnostic action to /diagnose instead of /diagnostics", () => {
    const job = JOBS.find((item) => item.id === "j-1");
    expect(job).toBeDefined();

    const action = getPrimaryAction({ ...job!, status: "On Site" }, { ...INITIAL_DIAG, results: [] });

    expect(action.kind).toBe("start-diagnosis");
    expect(action.to).toBe("/app/jobs/j-1/diagnose");
    expect(action.to).not.toContain("/diagnostics");
  });

  it("shows sync as read-only status on the today page instead of a toggleable control", async () => {
    window.history.pushState({}, "", "/app/today");

    render(<App />);

    expect(await screen.findByLabelText(/synced|offline/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /synced|offline/i })).not.toBeInTheDocument();
  });

  it("opens the exact follow-up visit from the today page follow-up section", async () => {
    let observed: StoreState | undefined;

    render(
      <StoreProvider>
        <StoreProbe onState={(state) => { observed = state; }} />
      </StoreProvider>,
    );

    await waitFor(() => expect(observed).toBeDefined());

    const alexJobs = observed!.jobs.filter((job) => job.technicianId === "u-alex");
    const forcedFollowUp = alexJobs[0];
    const forcedState: StoreState = {
      ...observed!,
      jobs: observed!.jobs.map((job) => {
        if (job.technicianId !== "u-alex") return job;
        return {
          ...job,
          status: job.id === forcedFollowUp.id ? "Follow-Up" : "Completed",
        };
      }),
    };

    cleanup();
    window.localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(forcedState));
    window.history.pushState({}, "", "/app/today");

    render(<App />);

    const followUpHeading = await screen.findByText("Needs follow-up");
    const followUpSection = followUpHeading.closest("section");
    expect(followUpSection).not.toBeNull();

    const followUpLinks = within(followUpSection as HTMLElement).getAllByRole("link");
    expect(followUpLinks.length).toBeGreaterThan(0);

    const href = followUpLinks[0].getAttribute("href");
    expect(href).toBe(`/app/jobs/${forcedFollowUp.id}`);

    fireEvent.click(followUpLinks[0]);

    await waitFor(() => expect(window.location.pathname).toBe(href));
  });

  it("keeps the customer report free of raw vendor links and lets the tech return to the job", async () => {
    window.history.pushState({}, "", "/app/jobs/j-2/report");

    render(<App />);

    expect(await screen.findByText("Customer-ready report")).toBeInTheDocument();
    expect(screen.queryByText(/fujitsugeneral\.com/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Technical source documents stay linked in the equipment profile/i)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /back to job/i })[0]);

    await waitFor(() => expect(window.location.pathname).toBe("/app/jobs/j-2"));
  });

  it("submits a parts request that really moves the job to Waiting for Parts and saves the office handoff", async () => {
    window.history.pushState({}, "", "/app/jobs/j-2/parts-request");

    render(<App />);

    fireEvent.change(await screen.findByPlaceholderText(/Dual-run capacitor/i), {
      target: { value: "OEM blower motor" },
    });
    fireEvent.change(screen.getByPlaceholderText(/If known/i), {
      target: { value: "MTR-220-ECM" },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Ferguson/i), {
      target: { value: "Johnstone" },
    });

    fireEvent.click(screen.getByRole("button", { name: /submit part request/i }));

    await waitFor(() => expect(window.location.pathname).toBe("/app/jobs/j-2"));

    const persisted = JSON.parse(window.localStorage.getItem(DEMO_STORE_KEY) ?? "{}") as StoreState;
    const savedJob = persisted.jobs.find((job) => job.id === "j-2");
    const savedRequest = persisted.partRequests.find((request) => request.jobId === "j-2" && request.name === "OEM blower motor");

    expect(savedJob?.status).toBe("Waiting for Parts");
    expect(savedJob?.notes).toContain("Office handoff");
    expect(savedRequest?.status).toBe("Identification Needed");
    expect(savedRequest?.supplier).toBe("Johnstone");
  });

  it("uses time-on-site wording on the job detail instead of active labor", async () => {
    const stored = JSON.parse(window.localStorage.getItem(DEMO_STORE_KEY) ?? "null") as StoreState | null;

    if (!stored) {
      window.history.pushState({}, "", "/app/jobs/j-2");
      render(<App />);
      await screen.findByText(/Owen Hall/i);
      cleanup();
    }

    const refreshed = JSON.parse(window.localStorage.getItem(DEMO_STORE_KEY) ?? "{}") as StoreState;
    const arrivedState: StoreState = {
      ...refreshed,
      jobs: refreshed.jobs.map((job) => (
        job.id === "j-2"
          ? {
            ...job,
            status: "On Site",
            arrivedAt: "2026-07-01T14:00:00.000Z",
            completedAt: undefined,
          }
          : job
      )),
    };

    window.localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(arrivedState));
    window.history.pushState({}, "", "/app/jobs/j-2");

    render(<App />);

    expect(await screen.findByText(/Time on site:/i)).toBeInTheDocument();
    expect(screen.queryByText(/Active labor:/i)).not.toBeInTheDocument();
  });

  it("shows visit readiness with travel, arrival, and linked source context on the job detail page", async () => {
    window.history.pushState({}, "", "/app/jobs/j-2");

    render(<App />);

    expect(await screen.findByText("Visit readiness")).toBeInTheDocument();
    expect(screen.getAllByText("Travel").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Arrival").length).toBeGreaterThan(0);
    expect(screen.getByText("Linked source")).toBeInTheDocument();
    expect(screen.getByText("Technician next steps")).toBeInTheDocument();
    expect(screen.getByText("1. Diagnose")).toBeInTheDocument();
    expect(screen.getByText("2. Approval")).toBeInTheDocument();
    expect(screen.getByText("3. Report")).toBeInTheDocument();
  });

  it("keeps arrival essentials and quick gate-code access visible on the job detail page", async () => {
    window.history.pushState({}, "", "/app/jobs/j-1");

    render(<App />);

    expect(await screen.findByText("Best next move")).toBeInTheDocument();
    expect(screen.getByText("Leave for the stop first so the visit timeline starts in the right order.")).toBeInTheDocument();
    expect(await screen.findByText("Arrival essentials")).toBeInTheDocument();
    expect(screen.getAllByText(/Gate code/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
  });

  it("declining approval moves the job to follow-up and records the declined decision", async () => {
    window.history.pushState({}, "", "/app/jobs/j-2/approval");

    render(<App />);

    expect(await screen.findByText("Closeout readiness")).toBeInTheDocument();
    expect(screen.getByText("Awaiting signature")).toBeInTheDocument();
    expect(screen.getByText(/Customer signature required before Approve unlocks/i)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: /decline and follow up/i }));
    fireEvent.click(await screen.findByRole("button", { name: /decline and create follow-up/i }));

    await waitFor(() => expect(window.location.pathname).toBe("/app/jobs/j-2"));

    const persisted = JSON.parse(window.localStorage.getItem(DEMO_STORE_KEY) ?? "{}") as StoreState;
    const savedJob = persisted.jobs.find((job) => job.id === "j-2");
    const savedAuth = persisted.auths.find((auth) => auth.jobId === "j-2");

    expect(savedJob?.status).toBe("Follow-Up");
    expect(savedAuth?.decision).toBe("declined");
  });

  it("gives technicians alternate actions from the diagnostic route without forcing a restart", async () => {
    window.history.pushState({}, "", "/app/jobs/j-2/diagnose");

    render(<App />);

    expect(await screen.findByText("Other actions from this step")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open steps breakdown/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^parts request$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^customer approval$/i })).toBeInTheDocument();
  });

  it("shows what the current diagnostic step decides and where each answer goes next", async () => {
    window.history.pushState({}, "", "/app/jobs/j-2/diagnose");

    render(<App />);

    expect(await screen.findByText("This step decides")).toBeInTheDocument();
    expect(screen.getByText("Why it matters")).toBeInTheDocument();
    expect(screen.getByText("Next after this answer")).toBeInTheDocument();
    expect(screen.getAllByText(/Continues to B - Indoor blower & airflow/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Routes into Thermostat \/ control - ALT-T/i)).toBeInTheDocument();
  });

  it("warns on the service report when customer approval has not been captured yet", async () => {
    window.history.pushState({}, "", "/app/jobs/j-2/report");

    render(<App />);

    expect(await screen.findByText(/Customer approval still needs to be captured/i)).toBeInTheDocument();
    expect(screen.getByText("Closeout status")).toBeInTheDocument();
    expect(screen.getByText("Internal draft only")).toBeInTheDocument();
    expect(screen.getByText(/1. Capture customer approval. 2. Return here. 3. Save, print, or share the finished report./i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open customer approval/i })).toBeInTheDocument();
    expect(screen.getByText(/not ready as a final customer handoff/i)).toBeInTheDocument();
  });

  it("shows clean document metadata in the technician document library", async () => {
    window.history.pushState({}, "", "/app/documents");

    render(<App />);

    expect((await screen.findAllByText("Document library")).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Â/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/Manufacturer-linked/i).length).toBeGreaterThan(0);
  });

  it("puts source-backed and review-queue document counts ahead of the document list", async () => {
    window.history.pushState({}, "", "/app/documents");

    render(<App />);

    expect(await screen.findByText("Source library focus")).toBeInTheDocument();
    expect(screen.getByText("Source-backed")).toBeInTheDocument();
    expect(screen.getAllByText("Approved").length).toBeGreaterThan(0);
    expect(screen.getByText("Review queue")).toBeInTheDocument();
  });

  it("shows status, linked specs, and source guidance in the document viewer", async () => {
    window.history.pushState({}, "", "/app/documents/d-2");

    render(<App />);

    expect(await screen.findByText("Linked specs")).toBeInTheDocument();
    expect(screen.getByText("Official link available")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open official source/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back to documents/i })).toBeInTheDocument();
  });

  it("seeds official manufacturer source links onto matching demo equipment", () => {
    expect(MANUFACTURER_SOURCE_LIBRARY.length).toBeGreaterThan(10);
    expect(DOCS.some((doc) => doc.id === "mfg-carrier-ac")).toBe(true);

    const linkedEquipment = EQUIPMENT.filter((item) => item.manualUrls.length > 0);
    expect(linkedEquipment.length).toBeGreaterThan(10);

    const carrierLike = { ...EQUIPMENT[0], manufacturer: "Carrier", type: "Air Conditioner", category: "Air Conditioner" as const };
    expect(manufacturerDocsForEquipment(carrierLike).length).toBeGreaterThan(0);
  });

  it("answers document-reader questions from linked sources without promoting unverified specs", () => {
    const carrier = {
      ...EQUIPMENT[0],
      id: "eq-test-carrier",
      manufacturer: "Carrier",
      model: "24SCA5",
      serial: "TEST123",
      family: "Carrier",
      type: "Air Conditioner",
      category: "Air Conditioner" as const,
      verificationStatus: "Verification Required" as const,
      specs: [],
    };
    carrier.manualUrls = manualLinksForEquipment(carrier);

    const answer = resolveAnswer("What official documents are linked?", {
      equipment: carrier,
      allEquipment: EQUIPMENT,
    });

    expect(answer.isSimulated).toBe(true);
    expect(answer.confidence).toBe("medium");
    expect(answer.source?.kind).toBe("verification_required");
    expect(answer.answer).toContain("Linked official source");
    expect(answer.answer).not.toMatch(/\b(MCA|MOP):/);
    expect(answer.verificationNeeded?.length).toBeGreaterThan(0);
  });

  it("loads the national top-50 HVAC documentation research into equipment and documents", () => {
    expect(US_HVAC_TOP_50_DOCUMENTATION_RESEARCH).toHaveLength(50);
    expect(top50ResearchStats().officialPdfCount).toBeGreaterThanOrEqual(8);
    expect(DOCS.some((doc) => doc.id === "top50-doc-01")).toBe(true);

    const goodman = EQUIPMENT.find((item) => item.id === "eq-1");
    expect(goodman).toBeDefined();

    const goodmanResearch = documentationResearchForEquipment(goodman!);
    expect(goodmanResearch.some((row) => row.documentUrl.includes("ss-gsxn3.pdf"))).toBe(true);
    expect(goodman?.manualUrls.some((link) => link.url.includes("ss-gsxn3.pdf"))).toBe(true);

    const mappedEquipment = EQUIPMENT.filter((item) => documentationResearchForEquipment(item).length > 0);
    expect(mappedEquipment.length).toBeGreaterThan(50);
  });

  it("loads HVAC company website and field-service system research for the owner market view", async () => {
    expect(HVAC_COMPANY_WEBSITE_REVIEW.length).toBeGreaterThanOrEqual(6);
    expect(HVAC_COMPANY_WEBSITE_REVIEW.some((item) => item.website.includes("onehourheatandair.com"))).toBe(true);
    expect(HVAC_FIELD_SERVICE_PLATFORM_REVIEW.some((item) => item.platform === "ServiceTitan")).toBe(true);
    expect(HVAC_MARKET_SYSTEM_PRIORITIES.some((item) => item.id === "equipment-documents")).toBe(true);

    window.history.pushState({}, "", "/app/owner/market-systems");
    render(<App />);

    expect(await screen.findByText("HVAC market systems")).toBeInTheDocument();
    expect(screen.getByText("One Hour Heating & Air Conditioning")).toBeInTheDocument();
    expect(screen.getByText("ServiceTitan")).toBeInTheDocument();
  });

  it("shows the owner equipment source review queue ahead of the full equipment grid", async () => {
    window.history.pushState({}, "", "/app/owner/equipment");

    render(<App />);

    expect(await screen.findByText("Source review queue")).toBeInTheDocument();
    expect(screen.getByText(/These records still need stronger literature confidence/i)).toBeInTheDocument();
  });

  it("surfaces truck stock risk and fit review counts on the parts page", async () => {
    window.history.pushState({}, "", "/app/parts");

    render(<App />);

    expect(await screen.findByText("Truck stock focus")).toBeInTheDocument();
    expect(screen.getByText("Low stock")).toBeInTheDocument();
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
    expect(screen.getByText("Fit review required")).toBeInTheDocument();
  });

  it("autosaves review-layer drafts while the reviewer types", async () => {
    window.history.pushState({}, "", "/app/today");

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /review layer/i }));
    fireEvent.change(screen.getByPlaceholderText(/Capture what feels wrong/i), {
      target: { value: "Today page cards need stronger scan hierarchy." },
    });
    expect(screen.queryByRole("button", { name: /^Review layer,/i })).not.toBeInTheDocument();

    await waitFor(() => {
      const drafts = JSON.parse(window.localStorage.getItem("field-copilot-review-drafts-v1") ?? "{}");
      expect(drafts["/app/today"].text).toBe("Today page cards need stronger scan hierarchy.");
      expect(drafts["/app/today"].kind).toBe("ux");
      expect(drafts["/app/today"].priority).toBe("medium");
    });

    expect(screen.getByText(/Draft saved/i)).toBeInTheDocument();
  });

  it("captures review-layer notes with live endpoint sync metadata", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    window.history.pushState(
      {},
      "",
      "/app/owner/equipment?reviewEndpoint=https%3A%2F%2Freviews.example%2Fcapture&cacheBust=123&view=list",
    );

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /review layer/i }));
    fireEvent.change(screen.getByPlaceholderText(/Capture what feels wrong/i), {
      target: { value: "Owner equipment source cards need clearer scan hierarchy." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send note/i }));

    await waitFor(() => {
      const notes = JSON.parse(window.localStorage.getItem("field-copilot-review-notes-v1") ?? "[]");
      expect(notes[0].note).toBe("Owner equipment source cards need clearer scan hierarchy.");
      expect(notes[0].path).toBe("/app/owner/equipment?view=list");
      expect(notes[0].pageLabel).toBe("Owner equipment");
      expect(notes[0].kind).toBe("ux");
      expect(notes[0].priority).toBe("medium");
      expect(notes[0].syncState).toBe("sent");
      expect(notes[0].syncedAt).toBeTruthy();
    });

    expect(await screen.findByText("Review handoff")).toBeInTheDocument();
    expect(screen.getByText("Codex received 1 submitted note.")).toBeInTheDocument();
    expect(screen.getByText(/Close with X when you are done/i)).toBeInTheDocument();
    expect(screen.getByText(/Last received: Owner equipment source cards need clearer scan hierarchy/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close review" })).not.toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith("https://reviews.example/capture", expect.objectContaining({
      method: "POST",
      headers: { "content-type": "application/json" },
    }));
  }, 10000);

  it("shows the live review conversation as a chat transcript", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("/review-messages")) {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            messages: [{
              id: "msg-live-chat",
              sessionId: "review-session",
              author: "codex",
              text: "I saw that note and will follow your next steps.",
              createdAt: "2026-06-30T18:30:00.000Z",
              routePath: "/app/today",
              pageLabel: "Technician today",
            }],
          }),
        };
      }
      return { ok: true, json: async () => ({ ok: true }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    window.localStorage.setItem("field-copilot-review-session-v1", "review-session");
    window.history.pushState(
      {},
      "",
      "/app/today?reviewEndpoint=https%3A%2F%2Freviews.example%2Freview-note",
    );

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /review layer/i }));
    fireEvent.change(screen.getByPlaceholderText(/Capture what feels wrong/i), {
      target: { value: "The current screen needs tighter spacing." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send note/i }));

    expect(await screen.findByText("Live exchange")).toBeInTheDocument();
    expect(await screen.findByText("I saw that note and will follow your next steps.")).toBeInTheDocument();
    expect(screen.getAllByText("The current screen needs tighter spacing.").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("You").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Codex").length).toBeGreaterThanOrEqual(1);
  });

  it("shows a pending Codex state instead of stale broadcast replies after a new live note", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("/review-messages")) {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            messages: [{
              id: "msg-broadcast-old",
              sessionId: "broadcast",
              author: "codex",
              text: "Old broadcast message that should not replace pending state.",
              createdAt: "2026-06-29T22:00:00.000Z",
            }],
          }),
        };
      }
      return { ok: true, json: async () => ({ ok: true }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    window.history.pushState(
      {},
      "",
      "/app/today?reviewEndpoint=https%3A%2F%2Freviews.example%2Freview-note",
    );

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /review layer/i }));
    fireEvent.change(screen.getByPlaceholderText(/Capture what feels wrong/i), {
      target: { value: "Newest live note should wait for a fresh reply." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send note/i }));

    expect(await screen.findByText("Waiting for Codex to answer your latest note.")).toBeInTheDocument();
    expect(screen.getAllByText("I saw your latest note. Reply pending from Codex.").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Old broadcast message that should not replace pending state.")).not.toBeInTheDocument();
  });

  it("shows a live follow chip even while the review panel is closed", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("/review-messages")) {
        return { ok: true, json: async () => ({ ok: true, messages: [] }) };
      }
      return { ok: true, json: async () => ({ ok: true }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    window.history.pushState(
      {},
      "",
      "/app/today?reviewEndpoint=https%3A%2F%2Freviews.example%2Freview-note",
    );

    render(<App />);

    expect(await screen.findByRole("button", { name: /Following Technician today\. Opened Technician today/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Move review launcher/i })).toBeInTheDocument();
    expect(screen.getByText(/Opened Technician today/i)).toBeInTheDocument();
  });

  it("clears a saved review endpoint when resetReviewEndpoint=1 is present", async () => {
    window.localStorage.setItem("field-copilot-review-endpoint-v1", "https://reviews.example/review-note");
    window.history.pushState({}, "", "/app/today?resetReviewEndpoint=1");

    render(<App />);

    expect(window.localStorage.getItem("field-copilot-review-endpoint-v1")).toBeNull();

    fireEvent.click(await screen.findByRole("button", { name: /review layer/i }));

    expect(await screen.findByText("Local capture is active on this phone.")).toBeInTheDocument();
    expect(screen.queryByText("Following live")).not.toBeInTheDocument();
  });

  it("uses the production review webhook by default on the hosted GitHub Pages site", () => {
    expect(hostedReviewEndpointForLocation("lindadata.github.io", "/field-copilot-pro/app/today", "")).toBe(
      "https://soft-unit-ba5d.sergio-mora.workers.dev/review-note",
    );
    expect(hostedReviewEndpointForLocation("localhost", "/app/today", "")).toBe("");
    expect(getReviewEndpoint()).toBe("");
  });

  it("keeps notes local and shows webhook unreachable copy when the live webhook fails", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("/review-messages") || String(url).includes("/review-note")) {
        throw new TypeError("Load failed");
      }
      return { ok: true, json: async () => ({ ok: true }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    window.history.pushState(
      {},
      "",
      "/app/today?reviewEndpoint=https%3A%2F%2Freviews.example%2Freview-note",
    );

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /review layer/i }));
    fireEvent.change(screen.getByPlaceholderText(/Capture what feels wrong/i), {
      target: { value: "Live webhook is broken but this note must stay local." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send note/i }));

    await waitFor(() => {
      expect(screen.getByText("Webhook unreachable. Note saved locally. Use Copy or retry after Cloudflare deploy is fixed.")).toBeInTheDocument();
    });

    const notes = JSON.parse(window.localStorage.getItem("field-copilot-review-notes-v1") ?? "[]") as Array<{
      note?: string;
      syncState?: string;
      lastError?: string;
    }>;
    expect(notes[0]?.note).toBe("Live webhook is broken but this note must stay local.");
    expect(notes[0]?.syncState).toBe("error");
    expect(notes[0]?.lastError).toBe("Webhook unreachable. Note saved locally. Use Copy or retry after Cloudflare deploy is fixed.");
  });

  it("restores a persisted position for the closed review launcher", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("/review-messages")) {
        return { ok: true, json: async () => ({ ok: true, messages: [] }) };
      }
      return { ok: true, json: async () => ({ ok: true }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    window.localStorage.setItem("field-copilot-review-launcher-position-v1", JSON.stringify({
      x: 144,
      y: 188,
    }));
    window.history.pushState(
      {},
      "",
      "/app/today?reviewEndpoint=https%3A%2F%2Freviews.example%2Freview-note",
    );

    render(<App />);

    const moveButton = await screen.findByRole("button", { name: /move review launcher/i });
    const launcher = moveButton.closest("div[style]") as HTMLDivElement | null;
    expect(launcher).not.toBeNull();

    expect(launcher?.style.left).toBe("144px");
    expect(launcher?.style.top).toBe("188px");
  });

  it("shows a dedicated drag handle for the compact mobile launcher and keeps its saved position", async () => {
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
    try {
      const fetchMock = vi.fn(async (url: string | URL | Request) => {
        if (String(url).includes("/review-messages")) {
          return { ok: true, json: async () => ({ ok: true, messages: [] }) };
        }
        return { ok: true, json: async () => ({ ok: true }) };
      });
      vi.stubGlobal("fetch", fetchMock);
      window.localStorage.setItem("field-copilot-review-launcher-position-v1", JSON.stringify({
        x: 240,
        y: 188,
      }));
      window.history.pushState(
        {},
        "",
        "/app/today?reviewEndpoint=https%3A%2F%2Freviews.example%2Freview-note",
      );

      render(<App />);

      const reviewButton = await screen.findByRole("button", { name: /review layer, 0 open notes/i });
      const launcher = reviewButton.closest("div[style]") as HTMLDivElement | null;
      const moveButton = await screen.findByRole("button", { name: /move review launcher/i });

      expect(launcher).not.toBeNull();
      expect(moveButton).toBeVisible();
      expect(Number.parseInt(launcher?.style.left ?? "0", 10)).toBe(240);
    } finally {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
      Object.defineProperty(window, "innerHeight", { configurable: true, value: originalHeight });
    }
  });

  it("keeps the compact launcher drag handle separate from the open action on mobile", async () => {
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
    try {
      const fetchMock = vi.fn(async (url: string | URL | Request) => {
        if (String(url).includes("/review-messages")) {
          return { ok: true, json: async () => ({ ok: true, messages: [] }) };
        }
        return { ok: true, json: async () => ({ ok: true }) };
      });
      vi.stubGlobal("fetch", fetchMock);
      window.localStorage.setItem("field-copilot-review-launcher-position-v1", JSON.stringify({
        x: 140,
        y: 188,
      }));
      window.history.pushState(
        {},
        "",
        "/app/today?reviewEndpoint=https%3A%2F%2Freviews.example%2Freview-note",
      );

      render(<App />);

      const reviewButton = await screen.findByRole("button", { name: /review layer, 0 open notes/i });
      const moveButton = await screen.findByRole("button", { name: /move review launcher/i });

      expect(moveButton).toBeVisible();
      fireEvent.click(reviewButton);

      expect(await screen.findByText("Capture this screen")).toBeInTheDocument();
    } finally {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
      Object.defineProperty(window, "innerHeight", { configurable: true, value: originalHeight });
    }
  });

  it("repositions the compact launcher away from primary mobile review-avoid regions", async () => {
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
    const rectSpy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function mockRect(this: HTMLElement) {
      if (this.getAttribute("data-review-launcher") === "true") {
        return {
          x: 26,
          y: 548,
          left: 26,
          top: 548,
          right: 106,
          bottom: 625,
          width: 80,
          height: 77,
          toJSON() { return this; },
        } as DOMRect;
      }

      if (this.getAttribute("data-review-avoid") === "landing-primary-actions") {
        return {
          x: 20,
          y: 536,
          left: 20,
          top: 536,
          right: 355,
          bottom: 640,
          width: 335,
          height: 104,
          toJSON() { return this; },
        } as DOMRect;
      }

      return {
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        toJSON() { return this; },
      } as DOMRect;
    });

    try {
      const fetchMock = vi.fn(async (url: string | URL | Request) => {
        if (String(url).includes("/review-messages")) {
          return { ok: true, json: async () => ({ ok: true, messages: [] }) };
        }
        return { ok: true, json: async () => ({ ok: true }) };
      });
      vi.stubGlobal("fetch", fetchMock);
      window.localStorage.setItem("field-copilot-review-launcher-position-v1", JSON.stringify({
        x: 26,
        y: 548,
      }));
      window.history.pushState(
        {},
        "",
        "/?reviewEndpoint=https%3A%2F%2Freviews.example%2Freview-note",
      );

      render(<App />);

      const reviewButton = await screen.findByRole("button", { name: /review layer, 0 open notes/i });
      const launcher = reviewButton.closest("[data-review-launcher='true']") as HTMLDivElement | null;
      expect(launcher).not.toBeNull();

      await waitFor(() => {
        expect(Number.parseInt(launcher?.style.left ?? "0", 10)).toBeGreaterThan(200);
        expect(Number.parseInt(launcher?.style.top ?? "0", 10)).toBeGreaterThan(700);
      });
    } finally {
      rectSpy.mockRestore();
      Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
      Object.defineProperty(window, "innerHeight", { configurable: true, value: originalHeight });
    }
  });

  it("keeps received-note handoff status after a sent note is resolved", async () => {
    window.localStorage.setItem("field-copilot-review-notes-v1", JSON.stringify([{
      id: "note-resolved-live",
      path: "/app/today",
      pageLabel: "Technician today",
      note: "Resolved but still received by Codex.",
      status: "resolved",
      createdAt: "2026-06-30T17:00:00.000Z",
      updatedAt: "2026-06-30T17:01:00.000Z",
      kind: "ux",
      priority: "medium",
      syncState: "sent",
      syncedAt: "2026-06-30T17:00:05.000Z",
      viewport: "390x844",
    }]));
    window.history.pushState(
      {},
      "",
      "/app/today?reviewEndpoint=https%3A%2F%2Freviews.example%2Freview-note",
    );

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /review layer/i }));

    expect(await screen.findByText("Review handoff")).toBeInTheDocument();
    expect(screen.getByText("Codex received 1 submitted note.")).toBeInTheDocument();
    expect(screen.getByText(/Last received: Resolved but still received by Codex/i)).toBeInTheDocument();
  });

  it("shows draft-not-submitted handoff copy even when earlier notes were already sent", async () => {
    window.localStorage.setItem("field-copilot-review-notes-v1", JSON.stringify([{
      id: "note-sent-live",
      path: "/app/today",
      pageLabel: "Technician today",
      note: "Earlier submitted note.",
      status: "open",
      createdAt: "2026-06-30T17:10:00.000Z",
      updatedAt: "2026-06-30T17:10:00.000Z",
      kind: "ux",
      priority: "medium",
      syncState: "sent",
      syncedAt: "2026-06-30T17:10:05.000Z",
      viewport: "390x844",
    }]));
    window.localStorage.setItem("field-copilot-review-drafts-v1", JSON.stringify({
      "/app/today": {
        text: "Newest thought is still a draft.",
        kind: "ux",
        priority: "medium",
        updatedAt: "2026-06-30T17:11:00.000Z",
      },
    }));
    window.history.pushState(
      {},
      "",
      "/app/today?reviewEndpoint=https%3A%2F%2Freviews.example%2Freview-note",
    );

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /review layer/i }));

    expect(await screen.findByText("Review handoff")).toBeInTheDocument();
    expect(screen.getByText("Draft not submitted yet.")).toBeInTheDocument();
    expect(screen.getByText(/Your latest text is still a draft/i)).toBeInTheDocument();
    expect(screen.getByText(/1 submitted note already stays in this session/i)).toBeInTheDocument();
    expect(screen.getByText(/Last received: Earlier submitted note/i)).toBeInTheDocument();
  });

  it("keeps reviewing context scoped to the current page instead of older session actions", async () => {
    window.localStorage.setItem("field-copilot-review-actions-v1", JSON.stringify([{
      id: "action-owner-shortcut",
      kind: "shortcut",
      path: "/app/owner/equipment",
      pageLabel: "Owner equipment",
      label: "Opened Owner equipment",
      createdAt: "2026-06-30T16:55:00.000Z",
      syncState: "sent",
      syncedAt: "2026-06-30T16:55:02.000Z",
      viewport: "390x844",
    }]));
    window.history.pushState({}, "", "/app/today");

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /review layer/i }));

    expect(await screen.findByText("Reviewing: Technician today")).toBeInTheDocument();
    expect(screen.queryByText("Reviewing: Opened Owner equipment")).not.toBeInTheDocument();
  });

  it("shows the latest tracked interaction in follow mode and ignores older sessions", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("/review-messages")) {
        return { ok: true, json: async () => ({ ok: true, messages: [] }) };
      }
      return { ok: true, json: async () => ({ ok: true }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    window.localStorage.setItem("field-copilot-review-session-v1", "review-active-session");
    window.localStorage.setItem("field-copilot-review-actions-v1", JSON.stringify([{
      id: "action-old-session",
      sessionId: "review-old-session",
      kind: "click",
      path: "/",
      pageLabel: "Main demo landing",
      label: "Old session action",
      createdAt: "2026-06-30T16:00:00.000Z",
      syncState: "sent",
      syncedAt: "2026-06-30T16:00:01.000Z",
      viewport: "390x844",
    }]));
    window.history.pushState(
      {},
      "",
      "/?reviewEndpoint=https%3A%2F%2Freviews.example%2Freview-note",
    );

    render(<App />);

    const ownerButton = await screen.findByText("Enter Demo as Owner");
    fireEvent.focusIn(ownerButton);
    fireEvent.click(await screen.findByRole("button", { name: /review layer/i }));

    expect(await screen.findByText("Follow mode")).toBeInTheDocument();
    expect(screen.getByText("Last tracked: Focused Enter Demo as Owner")).toBeInTheDocument();
    expect(screen.queryByText("Old session action")).not.toBeInTheDocument();
  });

  it("keeps scroll-only activity out of the primary review context", async () => {
    window.localStorage.setItem("field-copilot-review-session-v1", "review-scroll-context");
    window.localStorage.setItem("field-copilot-review-actions-v1", JSON.stringify([
      {
        id: "action-scroll-top",
        sessionId: "review-scroll-context",
        kind: "scroll",
        path: "/",
        pageLabel: "Main demo landing",
        label: "Scrolled to top",
        detail: "0% down the page",
        createdAt: "2026-06-30T18:00:05.000Z",
        syncState: "sent",
      },
      {
        id: "action-route-root",
        sessionId: "review-scroll-context",
        kind: "route",
        path: "/",
        pageLabel: "Main demo landing",
        label: "Viewing page",
        createdAt: "2026-06-30T18:00:00.000Z",
        syncState: "sent",
      },
    ]));
    window.history.pushState({}, "", "/");

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /review layer/i }));

    expect(await screen.findByText("Reviewing: Main demo landing")).toBeInTheDocument();
    expect(screen.queryByText("Reviewing: Scrolled to top")).not.toBeInTheDocument();
  });

  it("shows a guided local review state instead of an empty offline exchange", async () => {
    window.localStorage.setItem("field-copilot-review-session-v1", "review-local-mode");
    window.localStorage.setItem("field-copilot-review-actions-v1", JSON.stringify([
      {
        id: "action-route-root",
        sessionId: "review-local-mode",
        kind: "route",
        path: "/",
        pageLabel: "Main demo landing",
        label: "Viewing page",
        createdAt: "2026-06-30T18:00:00.000Z",
        syncState: "local",
      },
    ]));
    window.history.pushState({}, "", "/");

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /review layer/i }));

    expect(await screen.findByText("Local review mode")).toBeInTheDocument();
    expect(screen.getByText("Self-review prompt for Main demo landing")).toBeInTheDocument();
    expect(screen.getByText("Latest note you sent")).toBeInTheDocument();
    expect(screen.getByText("No submitted note in this session yet.")).toBeInTheDocument();
    expect(screen.getByText("Latest Codex reply")).toBeInTheDocument();
    expect(screen.getByText("Open this page with a live review link to see Codex replies here.")).toBeInTheDocument();
    expect(screen.getByText(/Send a note to save feedback with page, route, viewport, and time/i)).toBeInTheDocument();
    expect(screen.getByText(/saved locally/i)).toBeInTheDocument();
    expect(screen.queryByText("Main demo landing - /")).not.toBeInTheDocument();
  });

  it("keeps the latest sent note and latest Codex reply visible without opening the conversation trail", async () => {
    window.localStorage.setItem("field-copilot-review-session-v1", "review-live-summary");
    window.localStorage.setItem("field-copilot-review-notes-v1", JSON.stringify([{
      id: "note-live-summary",
      sessionId: "review-live-summary",
      path: "/app/today",
      pageLabel: "Technician today",
      note: "The sticky review button should stay small on mobile.",
      status: "open",
      createdAt: "2026-06-30T20:00:00.000Z",
      updatedAt: "2026-06-30T20:00:00.000Z",
      kind: "ux",
      priority: "medium",
      syncState: "sent",
      syncedAt: "2026-06-30T20:00:02.000Z",
      viewport: "390x844",
    }]));

    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("/review-messages")) {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            messages: [{
              id: "msg-live-summary",
              sessionId: "review-live-summary",
              author: "codex",
              text: "I saw that note and will keep the launcher compact.",
              createdAt: "2026-06-30T20:00:05.000Z",
              routePath: "/app/today",
              pageLabel: "Technician today",
            }],
          }),
        };
      }
      return { ok: true, json: async () => ({ ok: true }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    window.history.pushState(
      {},
      "",
      "/app/today?reviewEndpoint=https%3A%2F%2Freviews.example%2Freview-note",
    );

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /review layer/i }));

    expect(await screen.findByText("Latest note you sent")).toBeInTheDocument();
    expect(screen.getAllByText("The sticky review button should stay small on mobile.").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Latest Codex reply")).toBeInTheDocument();
    expect(screen.getAllByText("I saw that note and will keep the launcher compact.").length).toBeGreaterThanOrEqual(1);
  });

  it("surfaces critical specs first on the equipment profile specs view", async () => {
    window.history.pushState({}, "", "/app/equipment/eq-15#specs");

    render(<App />);

    expect(await screen.findByText("Critical specs for this visit")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open linked documentation/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open service history/i })).toBeInTheDocument();
  });

  it("starts the equipment profile with a technician brief that prioritizes source, critical values, and history", async () => {
    window.history.pushState({}, "", "/app/equipment/eq-15");

    render(<App />);

    expect(await screen.findByText("Technician brief")).toBeInTheDocument();
    expect(screen.getByText("Best source for this stop")).toBeInTheDocument();
    expect(screen.getByText("Visit-critical values")).toBeInTheDocument();
    expect(screen.getByText("Service pattern")).toBeInTheDocument();
  });

  it("defines manufacturer verified on the equipment profile so the reviewer can explain it", async () => {
    window.history.pushState({}, "", "/app/equipment/eq-1");

    render(<App />);

    expect(await screen.findByText('What "Manufacturer Verified" means')).toBeInTheDocument();
    expect(screen.getByText(/official manufacturer source or nameplate-backed value attached/i)).toBeInTheDocument();
  });

  it("puts source trust and source follow-up ahead of the technician equipment list", async () => {
    window.history.pushState({}, "", "/app/equipment");

    render(<App />);

    expect(await screen.findByText("Source trust for this fleet")).toBeInTheDocument();
    expect(screen.getByText("Needs source follow-up")).toBeInTheDocument();
    expect(screen.getByText("Source-backed")).toBeInTheDocument();
    expect(screen.getByText("Exact match")).toBeInTheDocument();
  });

  it("starts the owner dashboard with an operations scan before the deeper tabs", async () => {
    window.history.pushState({}, "", "/app/owner");

    render(<App />);

    expect(await screen.findByText("Operations scan")).toBeInTheDocument();
    expect(screen.getByText("Needs intervention now")).toBeInTheDocument();
    expect(screen.getByText("Crews moving today")).toBeInTheDocument();
    expect(screen.getByText("Closeout risk")).toBeInTheDocument();
  });

  it("shows the exact screen, last action, and route before the reviewer submits a note", async () => {
    window.history.pushState({}, "", "/");

    render(<App />);

    const ownerButton = await screen.findByText("Enter Demo as Owner");
    fireEvent.focusIn(ownerButton);
    fireEvent.click(await screen.findByRole("button", { name: /review layer/i }));

    expect(await screen.findByText("Screen")).toBeInTheDocument();
    expect(screen.getByText("Last action")).toBeInTheDocument();
    expect(screen.getByText("Route")).toBeInTheDocument();
    expect(screen.getAllByText("Main demo landing").length).toBeGreaterThan(0);
    expect(screen.getByText("Focused Enter Demo as Owner")).toBeInTheDocument();
    expect(screen.getAllByText("/").length).toBeGreaterThan(0);
  });

  it("lets the review layer switch between notes and functionality capture modes", async () => {
    window.history.pushState({}, "", "/");

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /review layer/i }));

    fireEvent.click(screen.getByRole("button", { name: "Functionality" }));
    expect(await screen.findByText("Functionality note")).toBeInTheDocument();

    const textarea = screen.getByLabelText("Functionality note") as HTMLTextAreaElement;
    expect(textarea.placeholder).toMatch(/interaction failure/i);

    fireEvent.click(screen.getByRole("button", { name: "Broken button" }));
    await waitFor(() => {
      expect(textarea.value).toContain("Broken button:");
      expect(textarea.value).toContain("Expected:");
      expect(textarea.value).toContain("Actual:");
    });

    fireEvent.click(screen.getByRole("button", { name: "Notes" }));
    expect(await screen.findByText("Review note")).toBeInTheDocument();
  });

  it("shows friendly live-sync fallback copy instead of raw transport errors", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("/review-messages")) {
        return { ok: false, status: 503, json: async () => ({ ok: false }) };
      }
      return { ok: false, status: 500, json: async () => ({ ok: false }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    window.history.pushState(
      {},
      "",
      "/app/today?reviewEndpoint=https%3A%2F%2Freviews.example%2Freview-note",
    );

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /review layer/i }));
    fireEvent.change(screen.getByPlaceholderText(/Capture what feels wrong/i), {
      target: { value: "Live review should fail gracefully." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send note/i }));

    expect(await screen.findByText("Live sync is unavailable right now.")).toBeInTheDocument();
    expect(screen.getAllByText("Live sync is temporarily unavailable.").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Codex replies are temporarily unavailable.")).toBeInTheDocument();
    expect(screen.queryByText("Review sync failed: 500")).not.toBeInTheDocument();
    expect(screen.queryByText("Review messages failed: 503")).not.toBeInTheDocument();
  });

  it("streams floating review-layer drafts and tracked actions to the live endpoint", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("/review-messages")) {
        return { ok: true, json: async () => ({ ok: true, messages: [] }) };
      }
      return { ok: true, json: async () => ({ ok: true }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    window.history.pushState(
      {},
      "",
      "/?reviewEndpoint=https%3A%2F%2Freviews.example%2Freview-note",
    );

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /review layer/i }));
    expect(await screen.findByText("I can see this review session live.")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/Capture what feels wrong/i), {
      target: { value: "Testing" },
    });

    await waitFor(() => {
      const actions = JSON.parse(window.localStorage.getItem("field-copilot-review-actions-v1") ?? "[]") as Array<{
        detail?: string;
        label?: string;
        syncState?: string;
      }>;

      expect(actions.some((action) => (
        action.label === "Live note draft"
        && action.detail === "Testing"
        && action.syncState === "sent"
      ))).toBe(true);
    }, { timeout: 2500 });

    expect(fetchMock).toHaveBeenCalledWith("https://reviews.example/review-note", expect.objectContaining({
      method: "POST",
      body: expect.stringContaining("\"label\":\"Live note draft\""),
    }));
  });

  it("renders the centered review workspace and captures notes for the framed app route", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("/review-messages")) {
        return { ok: true, json: async () => ({ ok: true, messages: [] }) };
      }
      return { ok: true, json: async () => ({ ok: true }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    window.history.pushState(
      {},
      "",
      "/review?reviewEndpoint=https%3A%2F%2Freviews.example%2Freview-note",
    );

    render(<App />);

    expect(await screen.findByText("Review workspace")).toBeInTheDocument();
    expect(screen.getByTitle("Field Copilot review canvas")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Review layer,/i })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Your note"), {
      target: { value: "Centered review canvas needs to stay easy to scan." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Capture/i }));

    await waitFor(() => {
      const notes = JSON.parse(window.localStorage.getItem("field-copilot-review-notes-v1") ?? "[]");
      expect(notes[0].note).toBe("Centered review canvas needs to stay easy to scan.");
      expect(notes[0].path).toBe("/app/today");
      expect(notes[0].pageLabel).toBe("Technician today");
      expect(notes[0].syncState).toBe("sent");
    });
  }, 10000);

  it("streams live review drafts before the reviewer presses Capture", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request, _init?: RequestInit) => {
      if (String(url).includes("/review-messages")) {
        return { ok: true, json: async () => ({ ok: true, messages: [] }) };
      }
      return { ok: true, json: async () => ({ ok: true }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    window.history.pushState(
      {},
      "",
      "/review?reviewEndpoint=https%3A%2F%2Freviews.example%2Freview-note",
    );

    render(<App />);

    expect(await screen.findByText("Review workspace")).toBeInTheDocument();
    const exactPhrase = "Codex notetaker phrase: copper spiral 742.";
    fireEvent.change(screen.getByLabelText("Your note"), {
      target: { value: exactPhrase },
    });

    await waitFor(() => {
      const draftCall = fetchMock.mock.calls.find((call) => {
        const body = String((call[1] as RequestInit | undefined)?.body ?? "");
        return body.includes("\"label\":\"Live note draft\"");
      });
      expect(draftCall).toBeTruthy();
      const body = String((draftCall?.[1] as RequestInit | undefined)?.body ?? "");
      expect(body).toContain(exactPhrase);
      expect(body).toContain("\"target\":\"review-note-text\"");
      expect(body).toContain("\"path\":\"/app/today\"");
      expect(screen.getByLabelText("Latest thing you sent")).toHaveValue(exactPhrase);
      expect(screen.getByLabelText("Latest submission sync status")).toHaveTextContent("sent live");
    }, { timeout: 2500 });
  });

  it("does not show stale sync errors after a newer live draft sync succeeds", async () => {
    let draftAttempts = 0;
    let resolveFirstDraft: ((value: { ok: boolean; status?: number; json: () => Promise<{ ok: boolean }> }) => void) | undefined;

    const fetchMock = vi.fn((url: string | URL | Request, init?: RequestInit) => {
      if (String(url).includes("/review-messages")) {
        return Promise.resolve({ ok: true, json: async () => ({ ok: true, messages: [] }) });
      }

      const body = String(init?.body ?? "");
      if (body.includes("\"label\":\"Live note draft\"")) {
        draftAttempts += 1;
        if (draftAttempts === 1) {
          return new Promise((resolve) => {
            resolveFirstDraft = resolve;
          });
        }
      }

      return Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
    });
    vi.stubGlobal("fetch", fetchMock);
    window.history.pushState(
      {},
      "",
      "/review?reviewEndpoint=https%3A%2F%2Freviews.example%2Freview-note",
    );

    render(<App />);

    expect(await screen.findByText("Review workspace")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Your note"), {
      target: { value: "First delayed draft will fail after the next draft." },
    });

    await waitFor(() => expect(draftAttempts).toBe(1), { timeout: 2500 });

    fireEvent.change(screen.getByLabelText("Your note"), {
      target: { value: "Second draft syncs cleanly and should stay trusted." },
    });

    await waitFor(() => {
      expect(draftAttempts).toBe(2);
      expect(screen.getByLabelText("Latest thing you sent")).toHaveValue("Second draft syncs cleanly and should stay trusted.");
    }, { timeout: 2500 });

    resolveFirstDraft?.({ ok: false, status: 500, json: async () => ({ ok: false }) });

    await waitFor(() => {
      const actions = JSON.parse(window.localStorage.getItem("field-copilot-review-actions-v1") ?? "[]") as Array<{
        detail?: string;
        syncState?: string;
      }>;
      expect(actions.some((action) => (
        action.detail === "First delayed draft will fail after the next draft."
        && action.syncState === "error"
      ))).toBe(true);
    });
    expect(screen.queryByText("Review action sync failed: 500")).not.toBeInTheDocument();
  });

  it("tracks review workspace route shortcuts and messages to Codex", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("/review-messages")) {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            messages: [{
              id: "msg-test",
              sessionId: "broadcast",
              author: "codex",
              text: "I can see your review notes live.",
              createdAt: "2026-06-29T21:30:00.000Z",
            }],
          }),
        };
      }
      return { ok: true, json: async () => ({ ok: true }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    window.history.pushState(
      {},
      "",
      "/review?reviewEndpoint=https%3A%2F%2Freviews.example%2Freview-note",
    );

    render(<App />);

    expect(await screen.findByText("Review workspace")).toBeInTheDocument();
    expect((await screen.findAllByText("I can see your review notes live.")).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText("Latest Codex response")).toHaveValue("I can see your review notes live.");
    expect(screen.getByText("Conversation")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Refresh replies/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Copy exchange/i })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Owner equipment" }));
    expect(screen.getByText("Reviewing now")).toBeInTheDocument();
    expect(screen.getAllByText("Opened Owner equipment").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByPlaceholderText("Write your note about: Opened Owner equipment")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/Message to Codex while reviewing/i), {
      target: { value: "The owner equipment filters feel crowded on mobile." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send to Codex/i }));

    await waitFor(() => {
      const actions = JSON.parse(window.localStorage.getItem("field-copilot-review-actions-v1") ?? "[]") as Array<{
        kind: string;
        path: string;
        label: string;
        detail?: string;
      }>;

      expect(actions.some((action) => (
        action.kind === "shortcut"
        && action.path === "/app/owner/equipment"
        && action.label === "Opened Owner equipment"
      ))).toBe(true);
      expect(actions.some((action) => (
        action.kind === "chat"
        && action.label === "Message to Codex"
        && action.detail === "The owner equipment filters feel crowded on mobile."
      ))).toBe(true);
      expect(screen.getByLabelText("Latest thing you sent")).toHaveValue("The owner equipment filters feel crowded on mobile.");
    });

    expect(screen.getAllByText("The owner equipment filters feel crowded on mobile.").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText("Latest Codex response")).toHaveValue("Waiting for Codex to answer your latest note.");
    expect(screen.getByText("I saw your latest note. Reply pending from Codex.")).toBeInTheDocument();
    expect(screen.queryByText("I can see your review notes live.")).not.toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith("https://reviews.example/review-note", expect.objectContaining({
      method: "POST",
      body: expect.stringContaining("\"event\":\"review_action\""),
    }));

    fireEvent.click(screen.getByRole("button", { name: "Hide session trail" }));
    expect(screen.getByText(/Trail hidden/i)).toBeInTheDocument();
    expect(screen.getByText(/actions are still being tracked/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show session trail" }));
    expect(screen.queryByText(/Trail hidden/i)).not.toBeInTheDocument();
  }, 15000);
});
