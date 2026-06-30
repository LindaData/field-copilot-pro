import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  AlertCircle,
  Bot,
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
  fetchReviewMessages,
  formatWhen,
  getReviewEndpoint,
  getReviewSessionId,
  loadActions,
  loadDrafts,
  loadNotes,
  makeExport,
  makeActionId,
  makeNoteId,
  pageLabelFor,
  postReviewAction,
  postReviewNote,
  REVIEW_ACTIONS_KEY,
  REVIEW_DRAFTS_KEY,
  REVIEW_INBOX_ISSUE,
  REVIEW_KINDS,
  REVIEW_NOTES_KEY,
  REVIEW_PRIORITIES,
  reviewPathFor,
  saveActions,
  saveDrafts,
  saveNotes,
  syncClass,
  syncLabel,
  type ReviewAction,
  type ReviewActionKind,
  type ReviewBridgeMessage,
  type ReviewDraft,
  type ReviewDrafts,
  type ReviewNote,
  type ReviewView,
} from "@/lib/reviewCapture";
import { cn } from "@/lib/utils";

type LiveDraftState = "idle" | "waiting" | "sending" | "sent" | "error";

function shortText(value: string | null | undefined, max = 140) {
  const clean = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean.length > max ? `${clean.slice(0, max - 1)}...` : clean;
}

function closestTrackable(target: EventTarget | null) {
  const element = target as Element | null;
  if (!element || typeof element.closest !== "function") return null;
  return element.closest("button,a,input,select,textarea,[role='button'],[role='link'],[data-review-track],form");
}

function elementLabel(element: Element) {
  const tag = element.tagName.toLowerCase();
  const inputType = element.getAttribute("type")?.toLowerCase() ?? "";
  const safeValue = tag === "button" || ["button", "submit", "reset"].includes(inputType)
    ? element.getAttribute("value")
    : "";

  return shortText(
    element.getAttribute("data-review-label")
      || element.getAttribute("aria-label")
      || element.getAttribute("title")
      || safeValue
      || element.textContent
      || element.getAttribute("placeholder")
      || element.getAttribute("name")
      || element.getAttribute("id")
      || tag,
  ) || tag;
}

function elementTarget(element: Element) {
  const tag = element.tagName.toLowerCase();
  const id = element.getAttribute("id");
  const role = element.getAttribute("role");
  const type = element.getAttribute("type");
  const href = tag === "a" ? element.getAttribute("href") : "";
  return [tag, role ? `role=${role}` : "", type ? `type=${type}` : "", id ? `#${id}` : "", href ? `href=${href}` : ""]
    .filter(Boolean)
    .join(" ");
}

function inputDetail(element: Element) {
  const tag = element.tagName.toLowerCase();
  const input = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  const type = (input as HTMLInputElement).type?.toLowerCase?.() ?? "";

  if (tag === "select") {
    const select = element as HTMLSelectElement;
    const selected = select.selectedOptions?.[0]?.textContent || select.value;
    return `selected=${shortText(selected, 80)}`;
  }

  if (tag === "input" && ["checkbox", "radio"].includes(type)) {
    return `checked=${(input as HTMLInputElement).checked ? "true" : "false"}`;
  }

  if (tag === "input" && type === "range") {
    return `value=${shortText((input as HTMLInputElement).value, 40)}`;
  }

  return "value changed";
}

function liveDraftLabel(state: LiveDraftState, savedAt: string | null) {
  if (state === "waiting") return "queued";
  if (state === "sending") return "sending";
  if (state === "sent") return savedAt ? `sent ${formatWhen(savedAt)}` : "sent";
  if (state === "error") return "needs retry";
  return "ready";
}

function plural(count: number, singular: string, pluralLabel = `${singular}s`) {
  return count === 1 ? singular : pluralLabel;
}

export function ReviewLayer() {
  const location = useLocation();
  const layerRef = useRef<HTMLDivElement | null>(null);
  const lastRouteRef = useRef("");
  const lastLiveDraftRef = useRef("");
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ReviewView>("page");
  const [notes, setNotes] = useState<ReviewNote[]>(() => loadNotes());
  const [actions, setActions] = useState<ReviewAction[]>(() => loadActions());
  const [drafts, setDrafts] = useState<ReviewDrafts>(() => loadDrafts());
  const [sessionId] = useState(() => getReviewSessionId());
  const [reviewEndpoint, setReviewEndpoint] = useState(() => getReviewEndpoint());
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [bridgeMessages, setBridgeMessages] = useState<ReviewBridgeMessage[]>([]);
  const [lastBridgeError, setLastBridgeError] = useState<string | null>(null);
  const [liveDraftState, setLiveDraftState] = useState<LiveDraftState>("idle");
  const [liveDraftAt, setLiveDraftAt] = useState<string | null>(null);

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
    saveActions(actions);
  }, [actions]);

  useEffect(() => {
    saveDrafts(drafts);
  }, [drafts]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === REVIEW_NOTES_KEY) setNotes(loadNotes());
      if (event.key === REVIEW_ACTIONS_KEY) setActions(loadActions());
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
  const pendingActions = actions.filter((action) => !action.syncedAt && action.syncState !== "sending");
  const sendingActionCount = actions.filter((action) => action.syncState === "sending").length;
  const submittedNotes = useMemo(
    () => notes.filter((note) => Boolean(note.syncedAt) || note.syncState === "sent"),
    [notes],
  );
  const queuedOpenNotes = openNotes.filter((note) => !note.syncedAt && note.syncState !== "sent");
  const pendingActionCount = actions.filter((action) => !action.syncedAt && action.syncState !== "sent").length;
  const latestSubmittedNote = submittedNotes[0] ?? null;
  const hasDraftText = currentDraft.text.trim().length > 0;
  const currentPathActions = useMemo(
    () => actions.filter((action) => action.path === path),
    [actions, path],
  );
  const reviewContextAction = currentPathActions.find((action) => ["click", "submit", "shortcut", "device"].includes(action.kind))
    ?? currentPathActions.find((action) => action.kind === "route")
    ?? null;
  const latestBridgeMessage = bridgeMessages[0] ?? null;
  const reviewContextTitle = reviewContextAction?.kind === "route"
    ? pageLabel
    : reviewContextAction?.label ?? pageLabel;

  let handoffTone: "received" | "draft" | "pending" | "local";
  let handoffTitle: string;
  let handoffBody: string;

  if (!endpointConfigured) {
    handoffTone = "local";
    handoffTitle = "Review notes are local on this device.";
    handoffBody = "Closing keeps notes in this browser only. Copy the notes or reopen with a live review link before relying on Codex to see them.";
  } else if (hasDraftText) {
    handoffTone = "draft";
    handoffTitle = "Draft not submitted yet.";
    handoffBody = submittedNotes.length > 0
      ? `Your latest text is still a draft. Tap Send note before closing if you want Codex to act on it. ${submittedNotes.length} submitted ${plural(submittedNotes.length, "note")} ${plural(submittedNotes.length, "already stays", "already stay")} in this session.`
      : "Your latest text is still a draft. Tap Send note before closing if you want Codex to act on it.";
  } else if (queuedOpenNotes.length > 0) {
    handoffTone = "pending";
    handoffTitle = `${queuedOpenNotes.length} submitted ${plural(queuedOpenNotes.length, "note")} still syncing.`;
    handoffBody = "You can keep reviewing. The note stays queued here and can be retried from Review history if live sync does not finish.";
  } else if (submittedNotes.length > 0) {
    handoffTone = "received";
    handoffTitle = `Codex received ${submittedNotes.length} submitted ${plural(submittedNotes.length, "note")}.`;
    handoffBody = "Close with X when you are done. Submitted notes stay in this session, and I pair them with the page, click trail, route, viewport, and timestamps.";
  } else {
    handoffTone = "draft";
    handoffTitle = "No submitted notes received yet.";
    handoffBody = "Typed drafts can stream live, but Send note is what locks feedback into the review feed before you close.";
  }

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

  const patchAction = useCallback((id: string, patch: Partial<ReviewAction>) => {
    setActions((existing) => existing.map((action) => (
      action.id === id ? { ...action, ...patch } : action
    )));
  }, []);

  const submitAction = useCallback(async (action: ReviewAction) => {
    if (!endpointConfigured) return false;

    patchAction(action.id, {
      syncState: "sending",
      lastError: undefined,
    });
    setLastSyncError(null);

    try {
      const sent = await postReviewAction(reviewEndpoint, sessionId, action);
      if (sent) {
        patchAction(action.id, {
          syncedAt: new Date().toISOString(),
          syncState: "sent",
          lastError: undefined,
        });
      }
      return sent;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Review action submit failed";
      patchAction(action.id, {
        syncState: "error",
        lastError: message,
      });
      setLastSyncError(message);
      return false;
    }
  }, [endpointConfigured, patchAction, reviewEndpoint, sessionId]);

  const recordAction = useCallback((
    kind: ReviewActionKind,
    label: string,
    detail?: string,
    target?: string,
    pathOverride?: string,
  ) => {
    const actionPath = pathOverride ?? path;
    const action: ReviewAction = {
      id: makeActionId(),
      kind,
      path: actionPath,
      pageLabel: pageLabelFor(actionPath.split("?")[0].split("#")[0] || actionPath),
      label: shortText(label, 220),
      target: target ? shortText(target, 260) : undefined,
      detail: detail ? shortText(detail, 1000) : undefined,
      createdAt: new Date().toISOString(),
      syncState: "local",
      viewport: currentViewport(),
    };

    setActions((existing) => [action, ...existing].slice(0, 300));
    void submitAction(action);
    return action;
  }, [path, submitAction]);

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

  const refreshBridgeMessages = useCallback(async () => {
    if (!endpointConfigured) {
      setBridgeMessages([]);
      setLastBridgeError(null);
      return;
    }

    try {
      const messages = await fetchReviewMessages(reviewEndpoint, sessionId);
      setBridgeMessages(messages);
      setLastBridgeError(null);
    } catch (error) {
      setLastBridgeError(error instanceof Error ? error.message : "Review bridge unavailable");
    }
  }, [endpointConfigured, reviewEndpoint, sessionId]);

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
    if (pendingNotes.length + pendingActions.length === 0) {
      toast.success("All review notes and actions are already live");
      return;
    }

    for (const note of pendingNotes) {
      const sent = await submitNote(note);
      if (!sent) return;
    }
    for (const action of pendingActions) {
      const sent = await submitAction(action);
      if (!sent) return;
    }
    toast.success("Review notes synced");
  };

  useEffect(() => {
    void refreshBridgeMessages();
    const interval = window.setInterval(() => {
      void refreshBridgeMessages();
    }, 3500);
    return () => window.clearInterval(interval);
  }, [refreshBridgeMessages]);

  useEffect(() => {
    if (hiddenForReviewWorkspace) return;
    if (lastRouteRef.current === path) return;
    lastRouteRef.current = path;
    recordAction("route", "Viewing page", undefined, "browser-route", path);
  }, [hiddenForReviewWorkspace, path, recordAction]);

  useEffect(() => {
    if (hiddenForReviewWorkspace) return undefined;

    const shouldIgnore = (target: EventTarget | null) => {
      const element = target as Element | null;
      return Boolean(element && layerRef.current?.contains(element));
    };

    const handleClick = (event: MouseEvent) => {
      if (shouldIgnore(event.target)) return;
      const element = closestTrackable(event.target);
      if (!element) return;
      recordAction("click", elementLabel(element), undefined, elementTarget(element));
    };

    const handleChange = (event: Event) => {
      if (shouldIgnore(event.target)) return;
      const element = closestTrackable(event.target);
      if (!element) return;
      const tag = element.tagName.toLowerCase();
      if (!["input", "select", "textarea"].includes(tag)) return;
      recordAction("input", elementLabel(element), inputDetail(element), elementTarget(element));
    };

    const handleSubmit = (event: SubmitEvent) => {
      if (shouldIgnore(event.target)) return;
      const element = closestTrackable(event.target);
      if (!element) return;
      recordAction("submit", elementLabel(element), undefined, elementTarget(element));
    };

    document.addEventListener("click", handleClick, true);
    document.addEventListener("change", handleChange, true);
    document.addEventListener("submit", handleSubmit, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("change", handleChange, true);
      document.removeEventListener("submit", handleSubmit, true);
    };
  }, [hiddenForReviewWorkspace, recordAction]);

  useEffect(() => {
    const text = currentDraft.text.trim();
    if (!text) {
      setLiveDraftState("idle");
      return undefined;
    }

    if (!endpointConfigured) {
      setLiveDraftState("waiting");
      return undefined;
    }

    setLiveDraftState("waiting");
    const timer = window.setTimeout(() => {
      const key = [
        sessionId,
        path,
        currentDraft.kind,
        currentDraft.priority,
        text,
      ].join("\u001f");

      if (lastLiveDraftRef.current === key) {
        setLiveDraftState("sent");
        return;
      }

      lastLiveDraftRef.current = key;
      const action: ReviewAction = {
        id: makeActionId(),
        kind: "input",
        path,
        pageLabel,
        label: "Live note draft",
        target: "review-layer-note-text",
        detail: text.slice(0, 4000),
        createdAt: new Date().toISOString(),
        syncState: "local",
        viewport: currentViewport(),
      };

      setActions((existing) => [action, ...existing].slice(0, 300));
      setLiveDraftState("sending");
      void submitAction(action).then((sent) => {
        if (sent) {
          setLiveDraftAt(new Date().toISOString());
          setLiveDraftState("sent");
        } else {
          setLiveDraftState("error");
        }
      });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [
    currentDraft.kind,
    currentDraft.priority,
    currentDraft.text,
    endpointConfigured,
    pageLabel,
    path,
    sessionId,
    submitAction,
  ]);

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

  const closeReviewLayer = () => {
    setOpen(false);

    if (hasDraftText) {
      toast("Draft saved", {
        description: endpointConfigured
          ? "Your latest text is still a draft. Reopen Review and tap Send note to submit it to Codex."
          : "Your draft stays on this device until you copy it or reopen with a live review link.",
      });
      return;
    }

    if (endpointConfigured && queuedOpenNotes.length > 0) {
      toast("Review layer hidden", {
        description: `${queuedOpenNotes.length} submitted ${plural(queuedOpenNotes.length, "note")} still ${plural(queuedOpenNotes.length, "needs", "need")} live sync. Reopen Review history if you need to retry.`,
      });
      return;
    }

    if (endpointConfigured && submittedNotes.length > 0) {
      toast.success("Review layer hidden", {
        description: `Codex received ${submittedNotes.length} ${plural(submittedNotes.length, "note")}. Notes stay in the live review feed for follow-up.`,
      });
      return;
    }

    toast("Review layer hidden", {
      description: endpointConfigured ? "No submitted notes in this session yet." : "Live endpoint is not connected.",
    });
  };

  if (hiddenForReviewWorkspace) return null;

  return (
    <div
      ref={layerRef}
      className={cn(
        "fixed inset-x-2 z-50 flex flex-col items-end gap-2 md:inset-auto md:right-5 md:w-[420px]",
        open ? "bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] md:bottom-5" : "bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] md:bottom-5",
      )}
    >
      {open && (
        <div className="flex max-h-[68svh] w-full flex-col overflow-hidden rounded-[20px] border bg-card shadow-xl md:max-h-[72vh] md:rounded-lg">
          <div className="border-b p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  <StickyNote className="h-4 w-4 text-primary" />
                  Live review
                  <Badge variant="outline" className={cn("gap-1", endpointConfigured ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-300 bg-amber-50 text-amber-800")}>
                    {endpointConfigured ? <Cloud className="h-3 w-3" /> : <CloudOff className="h-3 w-3" />}
                    {endpointConfigured ? "Codex live" : "local only"}
                  </Badge>
                </div>
                <div className="mt-1 truncate text-xs text-muted-foreground">{pageLabel}</div>
                <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{path}</div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={closeReviewLayer} aria-label="Close review layer">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
            <div className={cn(
              "rounded-md border p-2 text-xs",
              endpointConfigured ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-300 bg-amber-50 text-amber-950",
            )}>
              <div className="flex items-start gap-2">
                {endpointConfigured ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" /> : <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />}
                <div className="min-w-0">
                  <div className="font-semibold">
                    {endpointConfigured ? "I can see this review session live." : "I cannot see notes from this phone yet."}
                  </div>
                  <div className="mt-0.5">
                    {endpointConfigured
                      ? "I am tracking page changes, taps, and anything you type here."
                      : "Open the live review link with a reviewEndpoint so feedback reaches Codex."}
                  </div>
                  <div className="mt-1 break-words text-[11px] text-muted-foreground">
                    Reviewing: {reviewContextTitle}
                  </div>
                  <div className="mt-0.5 break-all text-[11px] text-muted-foreground">
                    {reviewContextAction ? `${reviewContextAction.pageLabel} - ${reviewContextAction.path}` : `${pageLabel} - ${path}`}
                  </div>
                </div>
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
              className="min-h-[112px] w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />

            <div className="flex items-center justify-between gap-2">
              <div className={cn(
                "text-[11px]",
                liveDraftState === "error" ? "text-destructive" : liveDraftState === "sent" ? "text-emerald-700" : "text-muted-foreground",
              )} aria-live="polite">
                {currentDraft.text ? `Draft saved ${formatWhen(currentDraft.updatedAt)} - live ${liveDraftLabel(liveDraftState, liveDraftAt)}` : "Ready"}
              </div>
              <div className="text-[11px] text-muted-foreground">{openCount} open</div>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Button onClick={addNote} disabled={!currentDraft.text.trim()} className="h-10">
                <MessageSquarePlus className="mr-1 h-4 w-4" /> Send note
              </Button>
              <Button variant="outline" onClick={copyExport} className="h-10 px-3" aria-label="Copy review notes">
                <ClipboardCopy className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-md border bg-background p-2 text-xs">
              <div className="flex items-start gap-2">
                <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold">Codex response</div>
                    {latestBridgeMessage ? (
                      <div className="text-[10px] text-muted-foreground">
                        {formatWhen(latestBridgeMessage.createdAt)}
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-1 max-h-20 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {latestBridgeMessage?.text ?? (endpointConfigured ? "I am listening. Type a note and I will respond in the review feed." : "Connect the live endpoint to receive replies here.")}
                  </div>
                  {latestBridgeMessage ? (
                    <div className="mt-1 break-all text-[10px] text-muted-foreground">
                      {latestBridgeMessage.pageLabel || latestBridgeMessage.author} - {latestBridgeMessage.routePath || "broadcast"}
                    </div>
                  ) : null}
                  {lastBridgeError ? <div className="mt-1 text-[11px] text-destructive">{lastBridgeError}</div> : null}
                </div>
              </div>
            </div>

            <div
              className={cn(
                "rounded-md border p-2 text-xs",
                handoffTone === "received"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                  : handoffTone === "local" || handoffTone === "pending"
                    ? "border-amber-300 bg-amber-50 text-amber-950"
                    : "border-blue-200 bg-blue-50 text-blue-950",
              )}
              aria-live="polite"
            >
              <div className="flex items-start gap-2">
                {handoffTone === "received"
                  ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />
                  : <AlertCircle className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", handoffTone === "draft" ? "text-blue-700" : "text-amber-700")} />}
                <div className="min-w-0">
                  <div className="font-semibold">Review handoff</div>
                  <div className="mt-1 font-medium">{handoffTitle}</div>
                  <div className="mt-1 leading-relaxed">{handoffBody}</div>
                  {latestSubmittedNote ? (
                    <div className="mt-2 rounded border border-emerald-200/80 bg-white/70 px-2 py-1 text-[11px] text-emerald-950">
                      Last received: {shortText(latestSubmittedNote.note, 120)}
                    </div>
                  ) : null}
                  {pendingActionCount > 0 ? (
                    <div className="mt-2 rounded border border-amber-300/80 bg-amber-100/70 px-2 py-1 text-[11px] text-amber-950">
                      {pendingActionCount} tracked {plural(pendingActionCount, "action")} still {plural(pendingActionCount, "needs", "need")} background sync.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <details className="rounded-md border bg-muted/20">
              <summary className="cursor-pointer px-3 py-2 text-xs font-semibold">
                Review history and sync details
              </summary>
              <div className="space-y-3 border-t p-3">
                <div className="flex items-center justify-between gap-2">
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

                <Button variant="outline" className="w-full" onClick={submitAllUnsynced} disabled={sendingCount + sendingActionCount > 0}>
                  {sendingCount + sendingActionCount > 0 ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
                  {endpointConfigured ? "Sync pending notes and actions" : "Local only - copy notes"}
                </Button>

                <div className="rounded-md border bg-background p-2 text-xs text-muted-foreground">
                  {endpointConfigured
                    ? `Live endpoint connected to review inbox #${REVIEW_INBOX_ISSUE}. Session: ${sessionId}`
                    : "No live endpoint is connected. Notes autosave locally and can be copied for fallback review."}
                  {lastSyncError ? <div className="mt-1 text-destructive">{lastSyncError}</div> : null}
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

                <div className="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
                  <span>{openCount} open - {pendingNotes.length + pendingActions.length} pending - {errorCount} errors</span>
                  <button className="inline-flex items-center gap-1 underline underline-offset-2" onClick={clearResolved}>
                    <Trash2 className="h-3 w-3" /> Clear resolved
                  </button>
                </div>
              </div>
            </details>
          </div>
        </div>
      )}

      {!open ? (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className={cn("h-11 rounded-full shadow-lg", openCount > 0 ? "pr-3" : "")}
          aria-label={`Review layer, ${openCount} open notes`}
        >
          <StickyNote className="h-4 w-4" />
          Review
          {openCount > 0 ? <span className="rounded-full bg-primary-foreground px-2 py-0.5 text-xs text-primary">{openCount}</span> : null}
        </Button>
      ) : null}
    </div>
  );
}
