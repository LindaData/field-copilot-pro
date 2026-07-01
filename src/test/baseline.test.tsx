import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("initializes English, Spanish, and French translation resources", async () => {
    expect(LANGS.map((lang) => lang.code)).toEqual(["en", "es", "fr"]);
    expect(i18n.hasResourceBundle("en", "translation")).toBe(true);
    expect(i18n.hasResourceBundle("es", "translation")).toBe(true);
    expect(i18n.hasResourceBundle("fr", "translation")).toBe(true);

    await i18n.changeLanguage("en");
    expect(i18n.t("nav.today")).toBe("Today");

    await i18n.changeLanguage("es");
    expect(i18n.t("nav.today")).toBe("Hoy");

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
    expect(screen.getByText("I saw your latest note. Reply pending from Codex.")).toBeInTheDocument();
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

    expect(await screen.findByText("Following live")).toBeInTheDocument();
    expect(screen.getByText("Technician today")).toBeInTheDocument();
    expect(screen.getByText(/Opened Technician today/i)).toBeInTheDocument();
  });

  it("clears a saved review endpoint when resetReviewEndpoint=1 is present", async () => {
    window.localStorage.setItem("field-copilot-review-endpoint-v1", "https://reviews.example/review-note");
    window.history.pushState({}, "", "/app/today?resetReviewEndpoint=1");

    render(<App />);

    expect(window.localStorage.getItem("field-copilot-review-endpoint-v1")).toBeNull();

    fireEvent.click(await screen.findByRole("button", { name: /review layer/i }));

    expect(await screen.findByText("I cannot see notes from this phone yet.")).toBeInTheDocument();
    expect(screen.queryByText("Following live")).not.toBeInTheDocument();
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
