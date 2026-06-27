import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useEffect } from "react";

import App from "@/App";
import i18n, { LANGS } from "@/i18n";
import { getPrimaryAction } from "@/lib/primaryAction";
import { INITIAL_DIAG, JOBS } from "@/lib/seed";
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
});
