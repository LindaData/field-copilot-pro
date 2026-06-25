export type Severity = "P0" | "P1" | "P2" | "P3";
export type TestStatus = "pass" | "fail" | "blocked" | "human-review" | "not-run";
export type TestKind = "automated" | "simulated" | "field-required";

export type TestCategory =
  | "Smoke"
  | "Journey"
  | "Diagnostics"
  | "Calculations"
  | "Equipment/OCR"
  | "Spec Accuracy"
  | "Conflicts"
  | "AI Assistant"
  | "Safety"
  | "Parts"
  | "Approval"
  | "Report"
  | "Offline/Sync"
  | "Roles/Security"
  | "AI Security"
  | "Mobile"
  | "Accessibility"
  | "Performance"
  | "Audit"
  | "Field UAT";

export interface TestDef {
  id: string;
  category: TestCategory;
  severity: Severity;
  kind: TestKind;
  scenario: string;
  preconditions?: string;
  steps: string[];
  expected: string;
  // Returns {status, actual} — undefined run = not-run (typically field-required)
  run?: (ctx: import("../store").StoreState) => { status: TestStatus; actual: string };
}

export interface TestResult {
  id: string;
  status: TestStatus;
  actual: string;
  ts: string;
}

export interface QARun {
  id: string;
  startedAt: string;
  finishedAt?: string;
  appVersion: string;
  results: Record<string, TestResult>;
}

export interface FieldFeedback {
  id: string;
  ts: string;
  userId: string;
  jobId?: string;
  step: string;
  rating: 1 | 2 | 3 | 4 | 5;
  clear?: boolean;
  appropriate?: boolean;
  missing?: string;
  trust?: boolean;
  wouldUse?: boolean;
  blocker?: string;
  notes?: string;
}
