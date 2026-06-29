import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect } from "react";

import App from "@/App";
import i18n, { LANGS } from "@/i18n";
import { resolveAnswer } from "@/lib/answers/resolver";
import { manufacturerDocsForEquipment, MANUFACTURER_SOURCE_LIBRARY, manualLinksForEquipment } from "@/lib/manufacturerSources";
import { documentationResearchForEquipment, top50ResearchStats, US_HVAC_TOP_50_DOCUMENTATION_RESEARCH } from "@/lib/hvacTop50";
import { getPrimaryAction } from "@/lib/primaryAction";
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

describe("migration baseline", () => {
  beforeEach(() => {
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

  it("initializes English and Spanish translation resources", async () => {
    expect(LANGS.map((lang) => lang.code)).toEqual(["en", "es"]);
    expect(i18n.hasResourceBundle("en", "translation")).toBe(true);
    expect(i18n.hasResourceBundle("es", "translation")).toBe(true);

    await i18n.changeLanguage("en");
    expect(i18n.t("nav.today")).toBe("Today");

    await i18n.changeLanguage("es");
    expect(i18n.t("nav.today")).toBe("Hoy");
  });

  it("points the primary job diagnostic action to /diagnose instead of /diagnostics", () => {
    const job = JOBS.find((item) => item.id === "j-1");
    expect(job).toBeDefined();

    const action = getPrimaryAction({ ...job!, status: "On Site" }, { ...INITIAL_DIAG, results: [] });

    expect(action.kind).toBe("start-diagnosis");
    expect(action.to).toBe("/app/jobs/j-1/diagnose");
    expect(action.to).not.toContain("/diagnostics");
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

  it("autosaves review-layer drafts while the reviewer types", async () => {
    window.history.pushState({}, "", "/app/today");

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /review layer/i }));
    fireEvent.change(screen.getByPlaceholderText(/Capture what feels wrong/i), {
      target: { value: "Today page cards need stronger scan hierarchy." },
    });

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
    fireEvent.click(screen.getByRole("button", { name: /Capture/i }));

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

    expect(fetchMock).toHaveBeenCalledWith("https://reviews.example/capture", expect.objectContaining({
      method: "POST",
      headers: { "content-type": "application/json" },
    }));
  });

  it("renders the centered review workspace and captures notes for the framed app route", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    window.history.pushState(
      {},
      "",
      "/review?reviewEndpoint=https%3A%2F%2Freviews.example%2Fcapture",
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
  });

  it("tracks review workspace route shortcuts and messages to Codex", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    window.history.pushState(
      {},
      "",
      "/review?reviewEndpoint=https%3A%2F%2Freviews.example%2Fcapture",
    );

    render(<App />);

    expect(await screen.findByText("Review workspace")).toBeInTheDocument();

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
    });

    expect(fetchMock).toHaveBeenCalledWith("https://reviews.example/capture", expect.objectContaining({
      method: "POST",
      body: expect.stringContaining("\"event\":\"review_action\""),
    }));

    fireEvent.click(screen.getByRole("button", { name: "Hide session trail" }));
    expect(screen.getByText(/Trail hidden/i)).toBeInTheDocument();
    expect(screen.getByText(/actions are still being tracked/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show session trail" }));
    expect(screen.queryByText(/Trail hidden/i)).not.toBeInTheDocument();
  });
});
