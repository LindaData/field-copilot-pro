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
import {
  currentViewport,
  EMPTY_REVIEW_DRAFT,
  formatWhen,
  getReviewEndpoint,
  getReviewSessionId,
  loadDrafts,
  loadNotes,
  makeExport,
  makeNoteId,
  pageLabelFor,
  postReviewNote,
  REVIEW_DRAFTS_KEY,
  REVIEW_INBOX_ISSUE,
  REVIEW_KINDS,
  REVIEW_NOTES_KEY,
  REVIEW_PRIORITIES,
  reviewPathFor,
  saveDrafts,
  saveNotes,
  syncClass,
  syncLabel,
  type ReviewDraft,
  type ReviewDrafts,
  type ReviewNote,
  type ReviewView,
} from "@/lib/reviewCapture";
import { cn } from "@/lib/utils";

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
  const currentDraft = drafts[path] ?? EMPTY_REVIEW_DRAFT;
  const endpointConfigured = reviewEndpoint.length > 0;
  const hiddenForReviewWorkspace = location.pathname === "/review" || new URLSearchParams(location.search).get("reviewFrame") === "1";

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
        ...EMPTY_REVIEW_DRAFT,
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

  if (hiddenForReviewWorkspace) return null;

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
