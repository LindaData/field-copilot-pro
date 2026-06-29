import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { ClipboardCopy, MessageSquarePlus, Send, StickyNote, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const REVIEW_NOTES_KEY = "field-copilot-review-notes-v1";
const REVIEW_SESSION_KEY = "field-copilot-review-session-v1";
const REVIEW_ENDPOINT_KEY = "field-copilot-review-endpoint-v1";
const BUILD_REVIEW_ENDPOINT = String(import.meta.env.VITE_REVIEW_ENDPOINT ?? "").trim();
const REVIEW_INBOX_ISSUE = 30;

type ReviewStatus = "open" | "resolved";
type SyncState = "idle" | "sending" | "sent" | "error";

interface ReviewNote {
  id: string;
  path: string;
  pageLabel: string;
  note: string;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
}

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

function loadNotes(): ReviewNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REVIEW_NOTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((note): note is ReviewNote => (
      typeof note?.id === "string"
      && typeof note?.path === "string"
      && typeof note?.note === "string"
      && typeof note?.createdAt === "string"
    ));
  } catch {
    return [];
  }
}

function saveNotes(notes: ReviewNote[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REVIEW_NOTES_KEY, JSON.stringify(notes));
}

function getReviewSessionId() {
  if (typeof window === "undefined") return "server";
  const existing = window.localStorage.getItem(REVIEW_SESSION_KEY);
  if (existing) return existing;
  const id = `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  window.localStorage.setItem(REVIEW_SESSION_KEY, id);
  return id;
}

function getReviewEndpoint() {
  if (typeof window === "undefined") return BUILD_REVIEW_ENDPOINT;
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("reviewEndpoint")?.trim();
  if (fromQuery) {
    window.localStorage.setItem(REVIEW_ENDPOINT_KEY, fromQuery);
    return fromQuery;
  }
  return window.localStorage.getItem(REVIEW_ENDPOINT_KEY)?.trim() || BUILD_REVIEW_ENDPOINT;
}

function makeExport(notes: ReviewNote[]) {
  const openNotes = notes.filter((note) => note.status !== "resolved");
  const grouped = openNotes.reduce<Record<string, ReviewNote[]>>((acc, note) => {
    const key = `${note.pageLabel} — ${note.path}`;
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
      lines.push(`- [${note.createdAt}] ${note.note}`);
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
      userAgent: typeof navigator === "undefined" ? undefined : navigator.userAgent,
    }),
  });
  if (!response.ok) throw new Error(`Review sync failed: ${response.status}`);
  return true;
}

export function ReviewLayer() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [notes, setNotes] = useState<ReviewNote[]>(() => loadNotes());
  const [sessionId] = useState(() => getReviewSessionId());
  const [reviewEndpoint] = useState(() => getReviewEndpoint());
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const pageLabel = pageLabelFor(location.pathname);
  const path = `${location.pathname}${location.search}${location.hash}`;
  const endpointConfigured = reviewEndpoint.length > 0;

  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  const currentPageNotes = useMemo(
    () => notes.filter((note) => note.path === path && note.status !== "resolved"),
    [notes, path],
  );
  const openNotes = notes.filter((note) => note.status !== "resolved");
  const openCount = openNotes.length;
  const unsyncedNotes = openNotes.filter((note) => !note.syncedAt);

  const markSynced = (id: string) => {
    const syncedAt = new Date().toISOString();
    setNotes((existing) => existing.map((note) => (
      note.id === id ? { ...note, syncedAt, updatedAt: syncedAt } : note
    )));
  };

  const submitNote = async (note: ReviewNote) => {
    if (!endpointConfigured) return;
    setSyncState("sending");
    setLastSyncError(null);
    try {
      const sent = await postReviewNote(reviewEndpoint, sessionId, note);
      if (sent) {
        markSynced(note.id);
        setSyncState("sent");
      }
    } catch (error) {
      setSyncState("error");
      setLastSyncError(error instanceof Error ? error.message : "Review submit failed");
      toast.error("Note saved locally. Submit failed.");
    }
  };

  const addNote = () => {
    const text = draft.trim();
    if (!text) return;
    const now = new Date().toISOString();
    const note: ReviewNote = {
      id: `rn-${Date.now()}`,
      path,
      pageLabel,
      note: text,
      status: "open",
      createdAt: now,
      updatedAt: now,
    };
    setNotes((existing) => [note, ...existing]);
    setDraft("");
    toast.success(endpointConfigured ? "Review note submitted" : "Review note saved locally", { description: pageLabel });
    void submitNote(note);
  };

  const submitAllUnsynced = async () => {
    if (!endpointConfigured) {
      toast("Review endpoint not configured", { description: "Notes are still saved locally on this device." });
      return;
    }
    if (unsyncedNotes.length === 0) {
      toast.success("All review notes are already submitted");
      return;
    }
    setSyncState("sending");
    for (const note of unsyncedNotes) {
      try {
        const sent = await postReviewNote(reviewEndpoint, sessionId, note);
        if (sent) markSynced(note.id);
      } catch (error) {
        setSyncState("error");
        setLastSyncError(error instanceof Error ? error.message : "Review submit failed");
        toast.error("Some review notes did not submit");
        return;
      }
    }
    setSyncState("sent");
    toast.success("Review notes submitted");
  };

  const resolveNote = (id: string) => {
    setNotes((existing) => existing.map((note) => (
      note.id === id ? { ...note, status: "resolved", updatedAt: new Date().toISOString() } : note
    )));
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
    <div className="fixed bottom-24 right-3 z-50 flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-2 md:bottom-5 md:right-5">
      {open && (
        <div className="w-[min(92vw,440px)] rounded-xl border bg-card shadow-xl">
          <div className="flex items-start justify-between gap-3 border-b p-3">
            <div>
              <div className="inline-flex items-center gap-2 text-sm font-semibold">
                <StickyNote className="h-4 w-4 text-primary" /> Review layer
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">{pageLabel}</div>
              <div className="mt-0.5 break-all text-[11px] text-muted-foreground">{path}</div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)} aria-label="Close review layer">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3 p-3">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  addNote();
                }
              }}
              placeholder="Type note, press Enter to submit for this exact page. Shift+Enter for a new line."
              className="min-h-[88px] w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={addNote} disabled={!draft.trim()}>
                <MessageSquarePlus className="mr-1 h-4 w-4" /> Submit
              </Button>
              <Button variant="outline" onClick={copyExport}>
                <ClipboardCopy className="mr-1 h-4 w-4" /> Copy fallback
              </Button>
            </div>
            <Button variant="outline" className="w-full" onClick={submitAllUnsynced} disabled={syncState === "sending" || unsyncedNotes.length === 0}>
              <Send className="mr-1 h-4 w-4" /> Submit saved notes
            </Button>

            <div className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
              {endpointConfigured
                ? `Submit sends to review inbox #${REVIEW_INBOX_ISSUE}. Session: ${sessionId}`
                : "Endpoint not connected yet. Submit saves notes locally only until the worker endpoint is deployed and opened once with ?reviewEndpoint=<worker-url>."}
              {lastSyncError ? <div className="mt-1 text-destructive">{lastSyncError}</div> : null}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-semibold">This page</span>
                <span className="text-muted-foreground">{currentPageNotes.length} open</span>
              </div>
              <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {currentPageNotes.length === 0 ? (
                  <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">No notes for this page yet.</div>
                ) : currentPageNotes.map((note) => (
                  <div key={note.id} className="rounded-md border p-2 text-xs">
                    <div className="whitespace-pre-wrap text-sm">{note.note}</div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span>{note.syncedAt ? "submitted" : "local only"} · {new Date(note.createdAt).toLocaleString()}</span>
                      <div className="flex items-center gap-1">
                        <button className="underline underline-offset-2" onClick={() => resolveNote(note.id)}>resolve</button>
                        <button className="text-destructive underline underline-offset-2" onClick={() => deleteNote(note.id)}>delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
              <span>{openCount} open · {unsyncedNotes.length} local only · {syncState}</span>
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
      >
        <StickyNote className="h-4 w-4" />
        Review
        {openCount > 0 ? <span className="rounded-full bg-primary-foreground px-2 py-0.5 text-xs text-primary">{openCount}</span> : null}
      </Button>
    </div>
  );
}
