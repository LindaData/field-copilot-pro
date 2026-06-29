export const REVIEW_NOTES_KEY = "field-copilot-review-notes-v1";
export const REVIEW_DRAFTS_KEY = "field-copilot-review-drafts-v1";
export const REVIEW_ACTIONS_KEY = "field-copilot-review-actions-v1";
export const REVIEW_SESSION_KEY = "field-copilot-review-session-v1";
export const REVIEW_ENDPOINT_KEY = "field-copilot-review-endpoint-v1";
export const REVIEW_INBOX_ISSUE = 30;

const BUILD_REVIEW_ENDPOINT = String(import.meta.env.VITE_REVIEW_ENDPOINT ?? "").trim();

export type ReviewStatus = "open" | "resolved";
export type NoteSyncState = "local" | "sending" | "sent" | "error";
export type ReviewPriority = "low" | "medium" | "high";
export type ReviewKind = "ux" | "bug" | "copy" | "data" | "workflow";
export type ReviewView = "page" | "all";
export type ReviewActionKind = "route" | "click" | "input" | "submit" | "shortcut" | "device" | "chat" | "note";

export interface ReviewNote {
  id: string;
  path: string;
  pageLabel: string;
  note: string;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
  kind?: ReviewKind;
  priority?: ReviewPriority;
  syncState?: NoteSyncState;
  lastError?: string;
  attempts?: number;
  viewport?: string;
}

export interface ReviewDraft {
  text: string;
  kind: ReviewKind;
  priority: ReviewPriority;
  updatedAt: string;
}

export type ReviewDrafts = Record<string, ReviewDraft>;

export interface ReviewAction {
  id: string;
  kind: ReviewActionKind;
  path: string;
  pageLabel: string;
  label: string;
  target?: string;
  detail?: string;
  createdAt: string;
  syncedAt?: string;
  syncState?: NoteSyncState;
  lastError?: string;
  viewport?: string;
}

export interface ReviewBridgeMessage {
  id: string;
  sessionId: string;
  author: "codex" | "reviewer" | "system";
  text: string;
  createdAt: string;
  routePath?: string;
  pageLabel?: string;
}

export interface ReviewLocationLike {
  pathname: string;
  search: string;
  hash: string;
}

export const REVIEW_KINDS: Array<{ value: ReviewKind; label: string }> = [
  { value: "ux", label: "UX" },
  { value: "bug", label: "Bug" },
  { value: "copy", label: "Copy" },
  { value: "data", label: "Data" },
  { value: "workflow", label: "Flow" },
];

export const REVIEW_PRIORITIES: Array<{ value: ReviewPriority; label: string }> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Med" },
  { value: "high", label: "High" },
];

export const EMPTY_REVIEW_DRAFT: ReviewDraft = {
  text: "",
  kind: "ux",
  priority: "medium",
  updatedAt: "",
};

const PAGE_LABELS: Record<string, string> = {
  "/": "Main demo landing",
  "/signin": "Sign in",
  "/review": "Review workspace",
  "/app": "Main technician demo",
  "/app/demo-walkthrough": "Demo walkthrough",
  "/app/owner/demo-walkthrough": "Owner demo walkthrough",
  "/app/today": "Technician today",
  "/app/jobs": "Technician jobs",
  "/app/scan": "Scan equipment",
  "/app/copilot": "Technician Copilot",
  "/app/equipment": "Technician equipment",
  "/app/documents": "Document library",
  "/app/parts": "Parts inventory",
  "/app/knowledge": "Knowledge base",
  "/app/training": "Training",
  "/app/more": "Technician more",
  "/app/owner": "Owner dashboard",
  "/app/owner/jobs": "Owner jobs",
  "/app/owner/customers": "Owner customers",
  "/app/owner/equipment": "Owner equipment",
  "/app/owner/more": "Owner more",
  "/app/feedback": "Feedback",
  "/app/owner/feedback": "Owner feedback",
};

export const REVIEW_ROUTE_SHORTCUTS = [
  { label: "Landing", path: "/" },
  { label: "Tech today", path: "/app/today" },
  { label: "Jobs", path: "/app/jobs" },
  { label: "Scan", path: "/app/scan" },
  { label: "Copilot", path: "/app/copilot" },
  { label: "Equipment", path: "/app/equipment" },
  { label: "Documents", path: "/app/documents" },
  { label: "Owner dashboard", path: "/app/owner" },
  { label: "Owner equipment", path: "/app/owner/equipment" },
  { label: "Owner jobs", path: "/app/owner/jobs" },
];

export const REVIEW_PROMPTS = [
  "Is the next action obvious without reading the whole screen?",
  "Does the page tell the truth about demo vs production behavior?",
  "Would a tired field tech understand the status under pressure?",
  "Does the owner view support fast scanning and prioritization?",
  "Are source/document trust levels visible before a decision is made?",
];

export function pageLabelFor(pathname: string) {
  if (PAGE_LABELS[pathname]) return PAGE_LABELS[pathname];
  if (/^\/app\/jobs\/[^/]+\/diagnose/.test(pathname)) return "Guided diagnosis";
  if (/^\/app\/jobs\/[^/]+\/approval/.test(pathname)) return "Customer approval";
  if (/^\/app\/jobs\/[^/]+\/report/.test(pathname)) return "Service report";
  if (/^\/app\/jobs\/[^/]+/.test(pathname)) return "Job detail";
  if (/^\/app\/equipment\/[^/]+/.test(pathname)) return "Equipment profile";
  if (/^\/app\/documents\/[^/]+/.test(pathname)) return "Document viewer";
  return pathname;
}

export function reviewPathFor(location: ReviewLocationLike) {
  const params = new URLSearchParams(location.search);
  params.delete("reviewEndpoint");
  params.delete("cacheBust");
  params.delete("reviewFrame");
  const query = params.toString();
  return `${location.pathname}${query ? `?${query}` : ""}${location.hash}`;
}

export function isReviewKind(value: unknown): value is ReviewKind {
  return REVIEW_KINDS.some((kind) => kind.value === value);
}

export function isReviewPriority(value: unknown): value is ReviewPriority {
  return REVIEW_PRIORITIES.some((priority) => priority.value === value);
}

export function isNoteSyncState(value: unknown): value is NoteSyncState {
  return value === "local" || value === "sending" || value === "sent" || value === "error";
}

function normalizeNote(raw: unknown): ReviewNote | null {
  if (!raw || typeof raw !== "object") return null;
  const note = raw as Partial<ReviewNote>;

  if (
    typeof note.id !== "string"
    || typeof note.path !== "string"
    || typeof note.note !== "string"
    || typeof note.createdAt !== "string"
  ) {
    return null;
  }

  const syncedAt = typeof note.syncedAt === "string" ? note.syncedAt : undefined;
  const syncState = syncedAt ? "sent" : isNoteSyncState(note.syncState) ? note.syncState : "local";

  return {
    id: note.id,
    path: note.path,
    pageLabel: typeof note.pageLabel === "string" ? note.pageLabel : pageLabelFor(note.path),
    note: note.note,
    status: note.status === "resolved" ? "resolved" : "open",
    createdAt: note.createdAt,
    updatedAt: typeof note.updatedAt === "string" ? note.updatedAt : note.createdAt,
    syncedAt,
    kind: isReviewKind(note.kind) ? note.kind : "ux",
    priority: isReviewPriority(note.priority) ? note.priority : "medium",
    syncState,
    lastError: typeof note.lastError === "string" ? note.lastError : undefined,
    attempts: typeof note.attempts === "number" ? note.attempts : 0,
    viewport: typeof note.viewport === "string" ? note.viewport : undefined,
  };
}

function normalizeAction(raw: unknown): ReviewAction | null {
  if (!raw || typeof raw !== "object") return null;
  const action = raw as Partial<ReviewAction>;
  if (
    typeof action.id !== "string"
    || typeof action.kind !== "string"
    || typeof action.path !== "string"
    || typeof action.label !== "string"
    || typeof action.createdAt !== "string"
  ) {
    return null;
  }

  return {
    id: action.id,
    kind: action.kind as ReviewActionKind,
    path: action.path,
    pageLabel: typeof action.pageLabel === "string" ? action.pageLabel : pageLabelFor(action.path),
    label: action.label,
    target: typeof action.target === "string" ? action.target : undefined,
    detail: typeof action.detail === "string" ? action.detail : undefined,
    createdAt: action.createdAt,
    syncedAt: typeof action.syncedAt === "string" ? action.syncedAt : undefined,
    syncState: isNoteSyncState(action.syncState) ? action.syncState : action.syncedAt ? "sent" : "local",
    lastError: typeof action.lastError === "string" ? action.lastError : undefined,
    viewport: typeof action.viewport === "string" ? action.viewport : undefined,
  };
}

export function loadNotes(): ReviewNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REVIEW_NOTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeNote).filter((note): note is ReviewNote => Boolean(note));
  } catch {
    return [];
  }
}

export function saveNotes(notes: ReviewNote[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REVIEW_NOTES_KEY, JSON.stringify(notes));
}

export function loadActions(): ReviewAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REVIEW_ACTIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeAction).filter((action): action is ReviewAction => Boolean(action));
  } catch {
    return [];
  }
}

export function saveActions(actions: ReviewAction[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REVIEW_ACTIONS_KEY, JSON.stringify(actions.slice(0, 300)));
}

export function loadDrafts(): ReviewDrafts {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(REVIEW_DRAFTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return Object.entries(parsed).reduce<ReviewDrafts>((acc, [path, draft]) => {
      if (!draft || typeof draft !== "object") return acc;
      const item = draft as Partial<ReviewDraft>;
      acc[path] = {
        text: typeof item.text === "string" ? item.text : "",
        kind: isReviewKind(item.kind) ? item.kind : "ux",
        priority: isReviewPriority(item.priority) ? item.priority : "medium",
        updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : "",
      };
      return acc;
    }, {});
  } catch {
    return {};
  }
}

export function saveDrafts(drafts: ReviewDrafts) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REVIEW_DRAFTS_KEY, JSON.stringify(drafts));
}

export function getReviewSessionId() {
  if (typeof window === "undefined") return "server";
  const existing = window.localStorage.getItem(REVIEW_SESSION_KEY);
  if (existing) return existing;
  const id = `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  window.localStorage.setItem(REVIEW_SESSION_KEY, id);
  return id;
}

export function getReviewEndpoint(search = typeof window === "undefined" ? "" : window.location.search) {
  if (typeof window === "undefined") return BUILD_REVIEW_ENDPOINT;
  const params = new URLSearchParams(search);
  const fromQuery = params.get("reviewEndpoint")?.trim();
  if (fromQuery) {
    window.localStorage.setItem(REVIEW_ENDPOINT_KEY, fromQuery);
    return fromQuery;
  }
  return window.localStorage.getItem(REVIEW_ENDPOINT_KEY)?.trim() || BUILD_REVIEW_ENDPOINT;
}

export function makeNoteId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `rn-${crypto.randomUUID()}`;
  }
  return `rn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeActionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `ra-${crypto.randomUUID()}`;
  }
  return `ra-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function currentViewport() {
  if (typeof window === "undefined") return undefined;
  return `${window.innerWidth}x${window.innerHeight}`;
}

export function formatWhen(value?: string) {
  if (!value) return "not saved";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "saved";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function makeExport(notes: ReviewNote[]) {
  const openNotes = notes.filter((note) => note.status !== "resolved");
  const grouped = openNotes.reduce<Record<string, ReviewNote[]>>((acc, note) => {
    const key = `${note.pageLabel} - ${note.path}`;
    acc[key] = [...(acc[key] ?? []), note];
    return acc;
  }, {});

  const lines = [
    "# Field Copilot review notes",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Open notes: ${openNotes.length}`,
    "",
  ];

  Object.entries(grouped).forEach(([page, pageNotes]) => {
    lines.push(`## ${page}`);
    pageNotes.forEach((note) => {
      lines.push(`- [${note.priority ?? "medium"} / ${note.kind ?? "ux"} / ${note.syncState ?? "local"}] ${note.note}`);
    });
    lines.push("");
  });

  if (openNotes.length === 0) lines.push("No open notes.");
  return lines.join("\n");
}

export function makeSessionExport(notes: ReviewNote[], actions: ReviewAction[]) {
  const lines = [
    "# Field Copilot review session",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Open notes: ${notes.filter((note) => note.status !== "resolved").length}`,
    `Tracked actions: ${actions.length}`,
    "",
    "## Timeline",
  ];

  [...actions]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .forEach((action) => {
      lines.push(`- [${action.createdAt}] ${action.kind.toUpperCase()} ${action.pageLabel} (${action.path}) - ${action.label}${action.detail ? ` - ${action.detail}` : ""}`);
    });

  lines.push("", makeExport(notes));
  return lines.join("\n");
}

export async function postReviewNote(endpoint: string, sessionId: string, note: ReviewNote) {
  if (!endpoint) return false;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      event: "review_note",
      repo: "LindaData/field-copilot-pro",
      inboxIssue: REVIEW_INBOX_ISSUE,
      sessionId,
      note,
      url: typeof window === "undefined" ? note.path : window.location.href,
      routePath: note.path,
      viewport: note.viewport,
      userAgent: typeof navigator === "undefined" ? undefined : navigator.userAgent,
    }),
  });
  if (!response.ok) throw new Error(`Review sync failed: ${response.status}`);
  return true;
}

export async function postReviewAction(endpoint: string, sessionId: string, action: ReviewAction) {
  if (!endpoint) return false;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      event: "review_action",
      repo: "LindaData/field-copilot-pro",
      inboxIssue: REVIEW_INBOX_ISSUE,
      sessionId,
      action,
      routePath: action.path,
      viewport: action.viewport,
      userAgent: typeof navigator === "undefined" ? undefined : navigator.userAgent,
    }),
  });
  if (!response.ok) throw new Error(`Review action sync failed: ${response.status}`);
  return true;
}

export function reviewEndpointUrl(endpoint: string, pathname: string) {
  if (!endpoint) return "";
  try {
    const url = new URL(endpoint);
    url.pathname = /\/review-note\/?$/.test(url.pathname)
      ? url.pathname.replace(/\/review-note\/?$/, pathname)
      : pathname;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function normalizeBridgeMessage(raw: unknown): ReviewBridgeMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const message = raw as Partial<ReviewBridgeMessage>;
  if (
    typeof message.id !== "string"
    || typeof message.sessionId !== "string"
    || typeof message.text !== "string"
    || typeof message.createdAt !== "string"
  ) {
    return null;
  }

  const author = message.author === "reviewer" || message.author === "system" ? message.author : "codex";

  return {
    id: message.id,
    sessionId: message.sessionId,
    author,
    text: message.text,
    createdAt: message.createdAt,
    routePath: typeof message.routePath === "string" ? message.routePath : undefined,
    pageLabel: typeof message.pageLabel === "string" ? message.pageLabel : undefined,
  };
}

export async function fetchReviewMessages(endpoint: string, sessionId: string) {
  const messagesUrl = reviewEndpointUrl(endpoint, "/review-messages");
  if (!messagesUrl) return [];
  const url = new URL(messagesUrl);
  url.searchParams.set("sessionId", sessionId);
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { "content-type": "application/json" },
  });
  if (!response.ok) throw new Error(`Review messages failed: ${response.status}`);
  const payload = await response.json() as { messages?: unknown[] };
  return Array.isArray(payload.messages)
    ? payload.messages.map(normalizeBridgeMessage).filter((message): message is ReviewBridgeMessage => Boolean(message))
    : [];
}

export function syncLabel(item: Pick<ReviewNote, "syncState" | "syncedAt">) {
  if (item.syncState === "sending") return "sending";
  if (item.syncState === "error") return "needs retry";
  if (item.syncedAt || item.syncState === "sent") return "sent";
  return "local";
}

export function syncClass(item: Pick<ReviewNote, "syncState" | "syncedAt">) {
  if (item.syncState === "sending") return "border-blue-200 bg-blue-50 text-blue-700";
  if (item.syncState === "error") return "border-destructive/30 bg-destructive/10 text-destructive";
  if (item.syncedAt || item.syncState === "sent") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-muted-foreground/20 bg-muted text-muted-foreground";
}
