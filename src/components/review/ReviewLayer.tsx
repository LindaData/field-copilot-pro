import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCopy,
  Cloud,
  CloudOff,
  Loader2,
  MessageSquarePlus,
  RefreshCw,
  Send,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const REVIEW_NOTES_KEY = "field-copilot-review-notes-v1";
const REVIEW_DRAFTS_KEY = "field-copilot-review-drafts-v1";
const REVIEW_SESSION_KEY = "field-copilot-review-session-v1";
const REVIEW_ENDPOINT_KEY = "field-copilot-review-endpoint-v1";
const BUILD_REVIEW_ENDPOINT = String(import.meta.env.VITE_REVIEW_ENDPOINT ?? "").trim();
const REVIEW_INBOX_ISSUE = 30;

type ReviewStatus = "open" | "resolved";
type NoteSyncState = "local" | "sending" | "sent" | "error";
type ReviewPriority = "low" | "medium" | "high";
type ReviewKind = "ux" | "bug" | "copy" | "data" | "workflow";
type ReviewView = "page" | "all";

interface ReviewNote {
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

interface ReviewDraft {
  text: string;
  kind: ReviewKind;
  priority: ReviewPriority;
  updatedAt: string;
}

type ReviewDrafts = Record<string, ReviewDraft>;

const REVIEW_KINDS: Array<{ value: ReviewKind; label: string }> = [
  { value: "ux", label: "UX" },
  { value: "bug", label: "Bug" },
  { value: "copy", label: "Copy" },
  { value: "data", label: "Data" },
  { value: "workflow", label: "Flow" },
];

const REVIEW_PRIORITIES: Array<{ value: ReviewPriority; label: string }> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Med" },
  { value: "high", label: "High" },
];

const PAGE_LABELS: Record<string, string> = {
  "/": "Main demo landing",
  "/signin": "Sign in",
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

const EMPTY_DRAFT: ReviewDraft = {
  text: "",
  kind: "ux",
  priority: "medium",
  updatedAt: "",
};

function pageLabelFor(pathname: string) {
  if (PAGE_LABELS[pathname]) return PAGE_LABELS[pathname];
  if (/^\/app\/jobs\/[^/]+\/diagnose/.test(pathname)) return "Guided diagnosis";
  if (/^\/app\/jobs\/[^/]+\/approval/.test(pathname)) return "Customer approval";
  if (/^\/app\/jobs\/[^/]+\/report/.test(pathname)) return "Service report";
  if (/^\/app\/jobs\/[^/]+/.test(pathname)) return "Job detail";
  if (/^\/app\/equipment\/[^/]+/.test(pathname)) return "Equipment profile";
  if (/^\/app\/documents\/[^/]+/.test(pathname)) return "Document viewer";
  return pathname;
}

function reviewPathFor(location: ReturnType<typeof useLocation>) {
  const params = new URLSearchParams(location.search);
  params.delete("reviewEndpoint");
  params.delete("cacheBust");
  const query = params.toString();
  return `${location.pathname}${query ? `?${query}` : ""}${location.hash}`;
}

function isReviewKind(value: unknown): value is ReviewKind {
  return REVIEW_KINDS.some((kind) => kind.value === value);
}

function isReviewPriority(value: unknown): value is ReviewPriority {
  return REVIEW_PRIORITIES.some((priority) => priority.value === value);
}

function isNoteSyncState(value: unknown): value is NoteSyncState {
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

function loadNotes(): ReviewNote[] {
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

function saveNotes(notes: ReviewNote[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REVIEW_NOTES_KEY, JSON.stringify(notes));
}

function loadDrafts(): ReviewDrafts {
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

function saveDrafts(drafts: ReviewDrafts) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REVIEW_DRAFTS_KEY, JSON.stringify(drafts));
}

function getReviewSessionId() {
  if (typeof window === "undefined") return "server";
  const existing = window.localStorage.getItem(REVIEW_SESSION_KEY);
  if (existing) return existing;
  const id = `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  window.localStorage.setItem(REVIEW_SESSION_KEY, id);
  return id;
}

function getReviewEndpoint(search = typeof window === "undefined" ? "" : window.location.search) {
  if (typeof window === "undefined") return BUILD_REVIEW_ENDPOINT;
  const params = new URLSearchParams(search);
  const fromQuery = params.get("reviewEndpoint")?.trim();
  if (fromQuery) {
    window.localStorage.setItem(REVIEW_ENDPOINT_KEY, fromQuery);
    return fromQuery;
  }
  return window.localStorage.getItem(REVIEW_ENDPOINT_KEY)?.trim() || BUILD_REVIEW_ENDPOINT;
}

function makeNoteId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `rn-${crypto.randomUUID()}`;
  }
  return `rn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function currentViewport() {
  if (typeof window === "undefined") return undefined;
  return `${window.innerWidth}x${window.innerHeight}`;
}

function formatWhen(value?: string) {
  if (!value) return "not saved";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "saved";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function makeExport(notes: ReviewNote[]) {
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

async function postReviewNote(endpoint: string, sessionId: string, note: ReviewNote) {
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

function syncLabel(note: ReviewNote) {
  if (note.syncState === "sending") return "sending";
  if (note.syncState === "error") return "needs retry";
  if (note.syncedAt || note.syncState === "sent") return "sent";
  return "local";
}

function syncClass(note: ReviewNote) {
  if (note.syncState === "sending") return "border-blue-200 bg-blue-50 text-blue-700";
  if (note.syncState === "error") return "border-destructive/30 bg-destructive/10 text-destructive";
  if (note.syncedAt || note.syncState === "sent") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-muted-foreground/20 bg-muted text-muted-foreground";
}

export function ReviewLayer() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ReviewView>("page");
  const [notes, setNotes] = useState<ReviewNote[]>(() => loadNotes());
  const [drafts, setDrafts] = useState<ReviewDrafts>(() => loadDrafts());
  const [sessionId] = useState(() => getReviewSessionId());
  const [reviewEndpoint, setReviewEndpoint] = useState(() => getReviewEndpoint());
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  const pageLabel = pageLabelFor(location.pathname);
  const path = reviewPathFor(location);
  const currentDraft = drafts[path] ?? EMPTY_DRAFT;
  const endpointConfigured = reviewEndpoint.length > 0;

  useEffect(() => {
    setReviewEndpoint(getReviewEndpoint(location.search));
  }, [location.search]);

  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  useEffect(() => {
    saveDrafts(drafts);
  }, [drafts]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === REVIEW_NOTES_KEY) setNotes(loadNotes());
      if (event.key === REVIEW_DRAFTS_KEY) setDrafts(loadDrafts());
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const currentPageNotes = useMemo(
    () => notes.filter((note) => note.path === path && note.status !== "resolved"),
    [notes, path],
  );
  const openNotes = useMemo(
    () => notes.filter((note) => note.status !== "resolved"),
    [notes],
  );
  const visibleNotes = view === "page" ? currentPageNotes : openNotes;
  const pendingNotes = openNotes.filter((note) => !note.syncedAt && note.syncState !== "sending");
  const sendingCount = openNotes.filter((note) => note.syncState === "sending").length;
  const errorCount = openNotes.filter((note) => note.syncState === "error").length;
  const openCount = openNotes.length;

  const updateDraft = (patch: Partial<ReviewDraft>) => {
    const updatedAt = new Date().toISOString();
    setDrafts((existing) => ({
      ...existing,
      [path]: {
        ...EMPTY_DRAFT,
        ...(existing[path] ?? {}),
        ...patch,
        updatedAt,
      },
    }));
  };

  const clearCurrentDraft = () => {
    setDrafts((existing) => {
      const next = { ...existing };
      delete next[path];
      return next;
    });
  };

  const patchNote = useCallback((id: string, patch: Partial<ReviewNote>) => {
    setNotes((existing) => existing.map((note) => (
      note.id === id ? { ...note, ...patch, updatedAt: new Date().toISOString() } : note
    )));
  }, []);

  const submitNote = useCallback(async (note: ReviewNote) => {
    if (!endpointConfigured || note.status === "resolved") return false;

    patchNote(note.id, {
      syncState: "sending",
      lastError: undefined,
      attempts: (note.attempts ?? 0) + 1,
    });
    setLastSyncError(null);

    try {
      const sent = await postReviewNote(reviewEndpoint, sessionId, note);
      if (sent) {
        const syncedAt = new Date().toISOString();
        patchNote(note.id, {
          syncedAt,
          syncState: "sent",
          lastError: undefined,
        });
      }
      return sent;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Review submit failed";
      patchNote(note.id, {
        syncState: "error",
        lastError: message,
      });
      setLastSyncError(message);
      toast.error("Note saved locally. Live submit failed.");
      return false;
    }
  }, [endpointConfigured, patchNote, reviewEndpoint, sessionId]);

  const addNote = () => {
    const text = currentDraft.text.trim();
    if (!text) return;

    const now = new Date().toISOString();
    const note: ReviewNote = {
      id: makeNoteId(),
      path,
      pageLabel,
      note: text,
      status: "open",
      createdAt: now,
      updatedAt: now,
      kind: currentDraft.kind,
      priority: currentDraft.priority,
      syncState: "local",
      attempts: 0,
      viewport: currentViewport(),
    };

    setNotes((existing) => [note, ...existing]);
    clearCurrentDraft();
    toast.success("Review note captured", {
      description: endpointConfigured ? "Syncing live now." : "Saved locally on this device.",
    });
    void submitNote(note);
  };

  const submitAllUnsynced = async () => {
    if (!endpointConfigured) {
      toast("Live endpoint not connected", { description: "Notes are saved locally and can be exported." });
      return;
    }
    if (pendingNotes.length === 0) {
      toast.success("All review notes are already live");
      return;
    }

    for (const note of pendingNotes) {
      const sent = await submitNote(note);
      if (!sent) return;
    }
    toast.success("Review notes synced");
  };

  const resolveNote = (id: string) => {
    patchNote(id, { status: "resolved" });
  };

  const deleteNote = (id: string) => {
    setNotes((existing) => existing.filter((note) => note.id !== id));
  };

  const copyExport = async () => {
    const payload = makeExport(notes);
    try {
      await navigator.clipboard.writeText(payload);
      toast.success("Review notes copied", { description: "Fallback export copied to clipboard." });
    } catch {
      toast.error("Could not copy notes");
    }
  };

  const clearResolved = () => {
    setNotes((existing) => existing.filter((note) => note.status !== "resolved"));
  };

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] right-2 z-50 flex max-w-[calc(100vw-1rem)] flex-col items-end gap-2 md:bottom-5 md:right-5">
      {open && (
        <div className="flex max-h-[min(82vh,720px)] w-[min(96vw,480px)] flex-col overflow-hidden rounded-lg border bg-card shadow-xl">
          <div className="border-b p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  <StickyNote className="h-4 w-4 text-primary" />
                  Review layer
                  <Badge variant="outline" className={cn("gap-1", endpointConfigured ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground")}>
                    {endpointConfigured ? <Cloud className="h-3 w-3" /> : <CloudOff className="h-3 w-3" />}
                    {endpointConfigured ? "Live sync" : "Local capture"}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{pageLabel}</div>
                <div className="mt-0.5 break-all text-[11px] text-muted-foreground">{path}</div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setOpen(false)} aria-label="Close review layer">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
              <div className="rounded-md border bg-background px-2 py-1.5">
                <div className="text-sm font-semibold">{currentPageNotes.length}</div>
                <div className="text-muted-foreground">this page</div>
              </div>
              <div className="rounded-md border bg-background px-2 py-1.5">
                <div className="text-sm font-semibold">{openCount}</div>
                <div className="text-muted-foreground">open</div>
              </div>
              <div className="rounded-md border bg-background px-2 py-1.5">
                <div className="text-sm font-semibold">{pendingNotes.length + sendingCount}</div>
                <div className="text-muted-foreground">to sync</div>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            <div className="space-y-2">
              <div className="flex gap-1 overflow-x-auto pb-1">
                {REVIEW_KINDS.map((kind) => (
                  <button
                    key={kind.value}
                    type="button"
                    onClick={() => updateDraft({ kind: kind.value })}
                    className={cn(
                      "h-8 shrink-0 rounded-md border px-2 text-xs font-medium",
                      currentDraft.kind === kind.value ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {kind.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex rounded-md border bg-background p-0.5">
                  {REVIEW_PRIORITIES.map((priority) => (
                    <button
                      key={priority.value}
                      type="button"
                      onClick={() => updateDraft({ priority: priority.value })}
                      className={cn(
                        "h-7 rounded px-2 text-xs font-medium",
                        currentDraft.priority === priority.value ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {priority.label}
                    </button>
                  ))}
                </div>
                <div className="text-[11px] text-muted-foreground" aria-live="polite">
                  {currentDraft.text ? `Draft saved ${formatWhen(currentDraft.updatedAt)}` : "Ready"}
                </div>
              </div>

              <textarea
                value={currentDraft.text}
                onChange={(event) => updateDraft({ text: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    addNote();
                  }
                }}
                placeholder="Capture what feels wrong or missing on this exact screen. Enter submits; Shift+Enter starts a new line."
                className="min-h-[104px] w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={addNote} disabled={!currentDraft.text.trim()}>
                <MessageSquarePlus className="mr-1 h-4 w-4" /> Capture
              </Button>
              <Button variant="outline" onClick={copyExport}>
                <ClipboardCopy className="mr-1 h-4 w-4" /> Copy
              </Button>
            </div>
            <Button variant="outline" className="w-full" onClick={submitAllUnsynced} disabled={sendingCount > 0}>
              {sendingCount > 0 ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
              {endpointConfigured ? "Sync saved notes" : "Export mode active"}
            </Button>

            <div className="rounded-md border bg-muted/40 p-2 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                {endpointConfigured ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600" /> : <AlertCircle className="mt-0.5 h-3.5 w-3.5 text-amber-600" />}
                <div>
                  {endpointConfigured
                    ? `Live endpoint connected to review inbox #${REVIEW_INBOX_ISSUE}. Session: ${sessionId}`
                    : "No live endpoint is connected. Notes autosave locally and can be copied for fallback review."}
                  {lastSyncError ? <div className="mt-1 text-destructive">{lastSyncError}</div> : null}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="inline-flex rounded-md border bg-background p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setView("page")}
                    className={cn("rounded px-2 py-1 font-medium", view === "page" ? "bg-muted text-foreground" : "text-muted-foreground")}
                  >
                    This page
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("all")}
                    className={cn("rounded px-2 py-1 font-medium", view === "all" ? "bg-muted text-foreground" : "text-muted-foreground")}
                  >
                    All open
                  </button>
                </div>
                <div className="text-xs text-muted-foreground">{visibleNotes.length} shown</div>
              </div>

              <div className="space-y-2">
                {visibleNotes.length === 0 ? (
                  <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                    No open notes here yet. Capture the rough edge while it is fresh.
                  </div>
                ) : visibleNotes.map((note) => (
                  <div key={note.id} className="rounded-md border bg-background p-2 text-xs shadow-sm">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-normal">{note.kind ?? "ux"}</Badge>
                      <Badge variant="outline" className="text-[10px] uppercase tracking-normal">{note.priority ?? "medium"}</Badge>
                      <Badge variant="outline" className={cn("gap-1 text-[10px] uppercase tracking-normal", syncClass(note))}>
                        {note.syncState === "sending" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                        {syncLabel(note)}
                      </Badge>
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{note.note}</div>
                    {view === "all" ? (
                      <div className="mt-2 break-all rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                        {note.pageLabel} - {note.path}
                      </div>
                    ) : null}
                    {note.lastError ? <div className="mt-2 text-[11px] text-destructive">{note.lastError}</div> : null}
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span>{formatWhen(note.createdAt)}{note.viewport ? ` - ${note.viewport}` : ""}</span>
                      <div className="flex items-center gap-2">
                        {endpointConfigured && note.syncState !== "sent" ? (
                          <button className="inline-flex items-center gap-1 underline underline-offset-2" onClick={() => void submitNote(note)}>
                            <RefreshCw className="h-3 w-3" /> retry
                          </button>
                        ) : null}
                        <button className="underline underline-offset-2" onClick={() => resolveNote(note.id)}>resolve</button>
                        <button className="text-destructive underline underline-offset-2" onClick={() => deleteNote(note.id)}>delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
              <span>{openCount} open - {pendingNotes.length} pending - {errorCount} errors</span>
              <button className="inline-flex items-center gap-1 underline underline-offset-2" onClick={clearResolved}>
                <Trash2 className="h-3 w-3" /> Clear resolved
              </button>
            </div>
          </div>
        </div>
      )}

      <Button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn("h-11 rounded-full shadow-lg", openCount > 0 ? "pr-3" : "")}
        aria-label={`Review layer, ${openCount} open notes`}
      >
        <StickyNote className="h-4 w-4" />
        Review
        {openCount > 0 ? <span className="rounded-full bg-primary-foreground px-2 py-0.5 text-xs text-primary">{openCount}</span> : null}
      </Button>
    </div>
  );
}
