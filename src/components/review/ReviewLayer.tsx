import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useLocation } from "react-router-dom";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ClipboardCopy,
  Cloud,
  CloudOff,
  GripHorizontal,
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
  matchesReviewSession,
  normalizeReviewErrorMessage,
  pageLabelFor,
  reviewConversationEntries,
  postReviewAction,
  postReviewNote,
  REVIEW_ACTIONS_KEY,
  REVIEW_DRAFTS_KEY,
  REVIEW_INBOX_ISSUE,
  REVIEW_KINDS,
  REVIEW_NOTES_KEY,
  REVIEW_PRIORITIES,
  REVIEW_WEBHOOK_UNREACHABLE_HELP,
  REVIEW_WEBHOOK_UNREACHABLE_MESSAGE,
  reviewPathFor,
  saveActions,
  saveDrafts,
  saveNotes,
  syncClass,
  syncLabel,
  type ReviewAction,
  type ReviewActionKind,
  type ReviewBridgeMessage,
  type ReviewConversationEntry,
  type ReviewDraft,
  type ReviewDrafts,
  type ReviewNote,
  type ReviewView,
} from "@/lib/reviewCapture";
import { cn } from "@/lib/utils";

type LiveDraftState = "idle" | "waiting" | "sending" | "sent" | "error";
type ReviewLauncherPosition = { x: number; y: number };

const REVIEW_LAUNCHER_POSITION_KEY = "field-copilot-review-launcher-position-v1";
const REVIEW_LAUNCHER_MARGIN = 12;
const REVIEW_LAUNCHER_MAX_WIDTH = 352;
const REVIEW_LAUNCHER_MAX_HEIGHT = 160;

function clampLauncherPosition(position: ReviewLauncherPosition) {
  if (typeof window === "undefined") return position;
  const maxWidth = Math.min(REVIEW_LAUNCHER_MAX_WIDTH, Math.max(220, window.innerWidth - (REVIEW_LAUNCHER_MARGIN * 2)));
  const maxX = Math.max(REVIEW_LAUNCHER_MARGIN, window.innerWidth - maxWidth - REVIEW_LAUNCHER_MARGIN);
  const maxY = Math.max(REVIEW_LAUNCHER_MARGIN, window.innerHeight - REVIEW_LAUNCHER_MAX_HEIGHT - REVIEW_LAUNCHER_MARGIN);
  return {
    x: Math.min(Math.max(REVIEW_LAUNCHER_MARGIN, position.x), maxX),
    y: Math.min(Math.max(REVIEW_LAUNCHER_MARGIN, position.y), maxY),
  };
}

function defaultLauncherPosition(): ReviewLauncherPosition {
  if (typeof window === "undefined") return { x: REVIEW_LAUNCHER_MARGIN, y: REVIEW_LAUNCHER_MARGIN };
  return clampLauncherPosition({
    x: window.innerWidth - Math.min(REVIEW_LAUNCHER_MAX_WIDTH, Math.max(220, window.innerWidth - (REVIEW_LAUNCHER_MARGIN * 2))) - REVIEW_LAUNCHER_MARGIN,
    y: window.innerHeight - 132,
  });
}

function loadLauncherPosition(): ReviewLauncherPosition {
  if (typeof window === "undefined") return defaultLauncherPosition();
  try {
    const raw = window.localStorage.getItem(REVIEW_LAUNCHER_POSITION_KEY);
    if (!raw) return defaultLauncherPosition();
    const parsed = JSON.parse(raw) as Partial<ReviewLauncherPosition>;
    if (typeof parsed.x !== "number" || typeof parsed.y !== "number") return defaultLauncherPosition();
    return clampLauncherPosition({ x: parsed.x, y: parsed.y });
  } catch {
    return defaultLauncherPosition();
  }
}

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

function isLiveDraftAction(action: ReviewAction) {
  return action.kind === "input" && action.label === "Live note draft";
}

function isConversationAction(action: ReviewAction) {
  return action.kind === "chat" || action.kind === "note" || isLiveDraftAction(action);
}

function describeAction(action: ReviewAction | null) {
  if (!action) return "Waiting for your next interaction.";

  switch (action.kind) {
    case "route":
      return `Opened ${action.pageLabel}`;
    case "click":
      return `Tapped ${action.label}`;
    case "focus":
      return `Focused ${action.label}`;
    case "submit":
      return `Submitted ${action.label}`;
    case "shortcut":
      return action.label;
    case "device":
      return action.label;
    case "scroll":
      return action.label;
    case "visibility":
      return action.label;
    case "chat":
      return "Sent a message to Codex";
    case "note":
      return "Submitted a review note";
    case "input":
      return action.detail ? `${action.label}: ${shortText(action.detail, 72)}` : action.label;
    default:
      return action.label;
  }
}

function conversationBadge(entry: ReviewConversationEntry) {
  if (entry.author === "codex") return "Reply";
  return entry.channel === "chat" ? "Message" : "Note";
}

export function ReviewLayer() {
  const location = useLocation();
  const layerRef = useRef<HTMLDivElement | null>(null);
  const launcherRef = useRef<HTMLDivElement | null>(null);
  const conversationRef = useRef<HTMLDivElement | null>(null);
  const launcherDragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const lastRouteRef = useRef("");
  const lastLiveDraftRef = useRef("");
  const passiveActionRef = useRef<Record<string, number>>({});
  const lastScrollBucketRef = useRef("");
  const lastVisibilityStateRef = useRef(typeof document === "undefined" ? "visible" : document.visibilityState);
  const lastViewportRef = useRef<string | undefined>(currentViewport());
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ReviewView>("page");
  const [notes, setNotes] = useState<ReviewNote[]>(() => loadNotes());
  const [actions, setActions] = useState<ReviewAction[]>(() => loadActions());
  const [drafts, setDrafts] = useState<ReviewDrafts>(() => loadDrafts());
  const [sessionId] = useState(() => getReviewSessionId());
  const [reviewEndpoint, setReviewEndpoint] = useState(() => getReviewEndpoint());
  const [endpointReachable, setEndpointReachable] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [bridgeMessages, setBridgeMessages] = useState<ReviewBridgeMessage[]>([]);
  const [lastBridgeError, setLastBridgeError] = useState<string | null>(null);
  const [liveDraftState, setLiveDraftState] = useState<LiveDraftState>("idle");
  const [liveDraftAt, setLiveDraftAt] = useState<string | null>(null);
  const [launcherPosition, setLauncherPosition] = useState<ReviewLauncherPosition>(() => loadLauncherPosition());
  const [draggingLauncher, setDraggingLauncher] = useState(false);

  const pageLabel = pageLabelFor(location.pathname);
  const path = reviewPathFor(location);
  const currentDraft = drafts[path] ?? EMPTY_REVIEW_DRAFT;
  const endpointConfigured = reviewEndpoint.length > 0;
  const liveConnectionVerified = endpointConfigured && endpointReachable;
  const endpointIssue = lastSyncError ?? lastBridgeError;
  const endpointStatus = !endpointConfigured
    ? "local"
    : liveConnectionVerified
      ? "live"
      : endpointIssue
        ? "failed"
        : "checking";
  const hiddenForReviewWorkspace = location.pathname === "/review" || new URLSearchParams(location.search).get("reviewFrame") === "1";

  useEffect(() => {
    setReviewEndpoint(getReviewEndpoint(location.search));
  }, [location.search]);

  useEffect(() => {
    setEndpointReachable(false);
    setLastSyncError(null);
    setLastBridgeError(null);
    setBridgeMessages([]);
  }, [reviewEndpoint]);

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
      if (event.key === REVIEW_LAUNCHER_POSITION_KEY) setLauncherPosition(loadLauncherPosition());
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(REVIEW_LAUNCHER_POSITION_KEY, JSON.stringify(launcherPosition));
    } catch {
      // ignore storage errors
    }
  }, [launcherPosition]);

  useEffect(() => {
    const handleResize = () => {
      setLauncherPosition((current) => clampLauncherPosition(current));
    };

    const handleDragMove = (event: PointerEvent | MouseEvent) => {
      const activeDrag = launcherDragRef.current;
      if (!activeDrag) return;
      const dx = event.clientX - activeDrag.startX;
      const dy = event.clientY - activeDrag.startY;
      if (!activeDrag.moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
        activeDrag.moved = true;
        setDraggingLauncher(true);
      }
      setLauncherPosition(clampLauncherPosition({
        x: activeDrag.originX + dx,
        y: activeDrag.originY + dy,
      }));
    };

    const handlePointerEnd = () => {
      if (!launcherDragRef.current) return;
      launcherDragRef.current = null;
      setDraggingLauncher(false);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("pointermove", handleDragMove);
    window.addEventListener("mousemove", handleDragMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);
    window.addEventListener("mouseup", handlePointerEnd);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", handleDragMove);
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
      window.removeEventListener("mouseup", handlePointerEnd);
    };
  }, []);

  const sessionNotes = useMemo(
    () => notes.filter((note) => matchesReviewSession(note.sessionId, sessionId)),
    [notes, sessionId],
  );
  const openNotes = useMemo(
    () => sessionNotes.filter((note) => note.status !== "resolved"),
    [sessionNotes],
  );
  const currentPageNotes = useMemo(
    () => openNotes.filter((note) => note.path === path),
    [openNotes, path],
  );
  const sessionActions = useMemo(
    () => actions.filter((action) => matchesReviewSession(action.sessionId, sessionId)),
    [actions, sessionId],
  );
  const visibleNotes = view === "page" ? currentPageNotes : openNotes;
  const pendingNotes = openNotes.filter((note) => !note.syncedAt && note.syncState !== "sending");
  const sendingCount = openNotes.filter((note) => note.syncState === "sending").length;
  const errorCount = openNotes.filter((note) => note.syncState === "error").length;
  const openCount = openNotes.length;
  const pendingActions = sessionActions.filter((action) => !action.syncedAt && action.syncState !== "sending");
  const sendingActionCount = sessionActions.filter((action) => action.syncState === "sending").length;
  const submittedNotes = useMemo(
    () => sessionNotes.filter((note) => Boolean(note.syncedAt) || note.syncState === "sent"),
    [sessionNotes],
  );
  const queuedOpenNotes = openNotes.filter((note) => !note.syncedAt && note.syncState !== "sent");
  const pendingActionCount = sessionActions.filter((action) => !action.syncedAt && action.syncState !== "sent").length;
  const latestSubmittedNote = submittedNotes[0] ?? null;
  const hasDraftText = currentDraft.text.trim().length > 0;
  const currentPathActions = useMemo(
    () => sessionActions.filter((action) => action.path === path),
    [sessionActions, path],
  );
  const recentTrackedActions = useMemo(
    () => sessionActions.filter((action) => !isLiveDraftAction(action)).slice(0, 4),
    [sessionActions],
  );
  const sessionBridgeMessages = useMemo(
    () => bridgeMessages.filter((message) => message.sessionId === sessionId),
    [bridgeMessages, sessionId],
  );
  const hasSessionConversationActivity = sessionNotes.length > 0 || sessionActions.some(isConversationAction);
  const visibleBridgeMessages = useMemo(() => (
    sessionBridgeMessages.length > 0
      ? sessionBridgeMessages
      : hasSessionConversationActivity
        ? []
        : bridgeMessages.filter((message) => message.sessionId === "broadcast")
  ), [bridgeMessages, hasSessionConversationActivity, sessionBridgeMessages]);
  const conversationEntries = useMemo(
    () => reviewConversationEntries(sessionId, sessionNotes, sessionActions, visibleBridgeMessages),
    [sessionActions, sessionId, sessionNotes, visibleBridgeMessages],
  );
  const lastTrackedAction = recentTrackedActions[0] ?? null;
  const pageCountInSession = useMemo(
    () => new Set(sessionActions.map((action) => action.path)).size,
    [sessionActions],
  );
  const reviewContextAction = currentPathActions.find((action) => ["click", "submit", "shortcut", "device", "focus", "scroll"].includes(action.kind))
    ?? currentPathActions.find((action) => action.kind === "route")
    ?? null;
  const latestBridgeMessage = visibleBridgeMessages[0] ?? null;
  const reviewContextTitle = reviewContextAction?.kind === "route"
    ? pageLabel
    : reviewContextAction?.label ?? pageLabel;
  const followChipText = lastTrackedAction ? describeAction(lastTrackedAction) : `Following ${pageLabel}`;
  const latestConversationEntry = conversationEntries[conversationEntries.length - 1] ?? null;
  const awaitingCodexReply = liveConnectionVerified && latestConversationEntry?.author === "reviewer";
  const visibleConversationEntries = useMemo(() => {
    const recent = conversationEntries.slice(-6);
    if (!awaitingCodexReply || !latestConversationEntry) return recent;

    return [
      ...recent,
      {
        id: `pending-${latestConversationEntry.id}`,
        author: "codex" as const,
        channel: "reply" as const,
        text: "I saw your latest note. Reply pending from Codex.",
        createdAt: latestConversationEntry.createdAt,
        pageLabel: latestConversationEntry.pageLabel,
        path: latestConversationEntry.path,
      },
    ];
  }, [awaitingCodexReply, conversationEntries, latestConversationEntry]);

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

  const endpointBadgeClass = endpointStatus === "live"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : endpointStatus === "failed"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : "border-amber-300 bg-amber-50 text-amber-800";
  const endpointHeaderLabel = endpointStatus === "live"
    ? "Codex live"
    : endpointStatus === "checking"
      ? "checking webhook"
      : endpointStatus === "failed"
        ? "webhook issue"
        : "local only";
  const followModeLabel = endpointStatus === "live"
    ? "live"
    : endpointStatus === "checking"
      ? "checking"
      : endpointStatus === "failed"
        ? "issue"
        : "local";
  const followModeBody = endpointStatus === "live"
    ? "This review link follows the screen, click trail, and notes while you move."
    : endpointStatus === "checking"
      ? "This phone has a review endpoint saved, but live sync is not confirmed yet."
      : endpointStatus === "failed"
        ? "The saved review endpoint is not responding. Notes stay local until the webhook works again."
        : "This device can still capture a local trail until the live endpoint is connected.";
  const sessionStatusTitle = endpointStatus === "live"
    ? "I can see this review session live."
    : endpointStatus === "checking"
      ? "Checking the live webhook from this phone."
      : endpointStatus === "failed"
        ? REVIEW_WEBHOOK_UNREACHABLE_MESSAGE
        : "I cannot see notes from this phone yet.";
  const sessionStatusBody = endpointStatus === "live"
    ? "I am tracking page changes, taps, focus, scrolling, and anything you type here, even while this panel is closed."
    : endpointStatus === "checking"
      ? "This phone has a saved review endpoint, but I will not claim live visibility until the webhook responds."
      : endpointStatus === "failed"
        ? "Use Copy now, or retry after the Cloudflare deploy and secret are fixed."
        : "Open the live review link with a reviewEndpoint so feedback reaches Codex.";
  const launcherStatusLabel = endpointStatus === "live"
    ? "Following live"
    : endpointStatus === "checking"
      ? "Checking webhook"
      : endpointStatus === "failed"
        ? "Webhook issue"
        : "Tracking locally";
  const launcherDotClass = endpointStatus === "live"
    ? "bg-emerald-500"
    : endpointStatus === "failed"
      ? "bg-destructive"
      : "bg-amber-500";

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
        setEndpointReachable(true);
        setLastBridgeError(null);
        setLastSyncError(null);
        patchAction(action.id, {
          syncedAt: new Date().toISOString(),
          syncState: "sent",
          lastError: undefined,
        });
      }
      return sent;
    } catch (error) {
      const message = normalizeReviewErrorMessage(error, "Review action submit failed");
      setEndpointReachable(false);
      setLastSyncError(message);
      patchAction(action.id, {
        syncState: "error",
        lastError: message,
      });
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
      sessionId,
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
  }, [path, sessionId, submitAction]);

  const recordPassiveAction = useCallback((
    kind: ReviewActionKind,
    label: string,
    detail?: string,
    target?: string,
    pathOverride?: string,
    dedupeMs = 1800,
  ) => {
    const actionPath = pathOverride ?? path;
    const signature = [kind, actionPath, label, detail ?? "", target ?? ""].join("\u001f");
    const now = Date.now();
    const lastSeen = passiveActionRef.current[signature] ?? 0;

    if (dedupeMs > 0 && now - lastSeen < dedupeMs) return null;

    passiveActionRef.current[signature] = now;
    return recordAction(kind, label, detail, target, actionPath);
  }, [path, recordAction]);

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
        setEndpointReachable(true);
        setLastBridgeError(null);
        setLastSyncError(null);
        const syncedAt = new Date().toISOString();
        patchNote(note.id, {
          syncedAt,
          syncState: "sent",
          lastError: undefined,
        });
      }
      return sent;
    } catch (error) {
      const message = normalizeReviewErrorMessage(error, "Review submit failed", { localNoteFallback: true });
      setEndpointReachable(false);
      patchNote(note.id, {
        syncState: "error",
        lastError: message,
      });
      setLastSyncError(message);
      toast.error(message);
      return false;
    }
  }, [endpointConfigured, patchNote, reviewEndpoint, sessionId]);

  const refreshBridgeMessages = useCallback(async () => {
    if (!endpointConfigured) {
      setEndpointReachable(false);
      setBridgeMessages([]);
      setLastBridgeError(null);
      return;
    }

    try {
      const messages = await fetchReviewMessages(reviewEndpoint, sessionId);
      setEndpointReachable(true);
      setBridgeMessages(messages);
      setLastBridgeError(null);
    } catch (error) {
      setEndpointReachable(false);
      setLastBridgeError(normalizeReviewErrorMessage(error, "Review bridge unavailable"));
    }
  }, [endpointConfigured, reviewEndpoint, sessionId]);

  const addNote = () => {
    const text = currentDraft.text.trim();
    if (!text) return;

    const now = new Date().toISOString();
    const note: ReviewNote = {
      id: makeNoteId(),
      sessionId,
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
      description: liveConnectionVerified
        ? "Syncing live now."
        : endpointConfigured
          ? "Saved locally while the webhook is checked."
          : "Saved locally on this device.",
    });
    void submitNote(note);
  };

  const submitAllUnsynced = async () => {
    if (!endpointConfigured) {
      toast("Live endpoint not connected", { description: "Notes are saved locally and can be exported." });
      return;
    }
    if (endpointStatus === "failed") {
      toast("Webhook unreachable", { description: REVIEW_WEBHOOK_UNREACHABLE_MESSAGE });
    }
    if (pendingNotes.length + pendingActions.length === 0) {
      toast.success(liveConnectionVerified ? "All review notes and actions are already live" : "No pending review items");
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
    if (!open) return;
    const node = conversationRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [open, visibleConversationEntries.length]);

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
      return Boolean(
        element
        && (
          layerRef.current?.contains(element)
          || launcherRef.current?.contains(element)
        ),
      );
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

    const handleFocusIn = (event: FocusEvent) => {
      if (shouldIgnore(event.target)) return;
      const element = closestTrackable(event.target);
      if (!element) return;
      recordPassiveAction("focus", elementLabel(element), undefined, elementTarget(element));
    };

    const handleSubmit = (event: SubmitEvent) => {
      if (shouldIgnore(event.target)) return;
      const element = closestTrackable(event.target);
      if (!element) return;
      recordAction("submit", elementLabel(element), undefined, elementTarget(element));
    };

    document.addEventListener("click", handleClick, true);
    document.addEventListener("change", handleChange, true);
    document.addEventListener("focusin", handleFocusIn, true);
    document.addEventListener("submit", handleSubmit, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("change", handleChange, true);
      document.removeEventListener("focusin", handleFocusIn, true);
      document.removeEventListener("submit", handleSubmit, true);
    };
  }, [hiddenForReviewWorkspace, recordAction, recordPassiveAction]);

  useEffect(() => {
    if (hiddenForReviewWorkspace) return undefined;

    const handleResize = () => {
      const viewport = currentViewport();
      if (!viewport || viewport === lastViewportRef.current) return;
      lastViewportRef.current = viewport;
      recordPassiveAction("device", `Viewport changed to ${viewport}`, undefined, "browser-viewport", path, 0);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [hiddenForReviewWorkspace, path, recordPassiveAction]);

  useEffect(() => {
    if (hiddenForReviewWorkspace) return undefined;

    const handleVisibilityChange = () => {
      const state = document.visibilityState;
      if (state === lastVisibilityStateRef.current) return;
      lastVisibilityStateRef.current = state;
      recordPassiveAction(
        "visibility",
        state === "hidden" ? "Moved app to background" : "Returned to the app",
        state,
        "browser-visibility",
        path,
        0,
      );
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [hiddenForReviewWorkspace, path, recordPassiveAction]);

  useEffect(() => {
    if (hiddenForReviewWorkspace) return undefined;

    lastScrollBucketRef.current = "";
    let raf = 0;

    const emitScrollBucket = () => {
      raf = 0;
      const doc = document.documentElement;
      const maxScroll = Math.max(doc.scrollHeight - window.innerHeight, 0);
      if (maxScroll <= 0) return;

      const ratio = Math.max(0, Math.min(1, window.scrollY / maxScroll));
      const bucket = ratio >= 0.95
        ? "bottom"
        : ratio >= 0.75
          ? "75%"
          : ratio >= 0.5
            ? "50%"
            : ratio >= 0.25
              ? "25%"
              : "top";
      const signature = `${path}\u001f${bucket}`;
      if (signature === lastScrollBucketRef.current) return;
      lastScrollBucketRef.current = signature;
      recordPassiveAction("scroll", `Scrolled to ${bucket}`, `${Math.round(ratio * 100)}% down the page`, "browser-scroll", path, 0);
    };

    const handleScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(emitScrollBucket);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [hiddenForReviewWorkspace, path, recordPassiveAction]);

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
        sessionId,
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
        description: liveConnectionVerified
          ? "Your latest text is still a draft. Reopen Review and tap Send note to submit it to Codex."
          : "Your draft stays on this device until you copy it or the webhook responds successfully.",
      });
      return;
    }

    if (endpointConfigured && queuedOpenNotes.length > 0) {
      toast("Review layer hidden", {
        description: `${queuedOpenNotes.length} submitted ${plural(queuedOpenNotes.length, "note")} still ${plural(queuedOpenNotes.length, "needs", "need")} sync. Reopen Review history if you need to retry.`,
      });
      return;
    }

    if (liveConnectionVerified && submittedNotes.length > 0) {
      toast.success("Review layer hidden", {
        description: `Codex received ${submittedNotes.length} ${plural(submittedNotes.length, "note")}. Notes stay in the live review feed for follow-up.`,
      });
      return;
    }

    toast("Review layer hidden", {
      description: endpointConfigured ? REVIEW_WEBHOOK_UNREACHABLE_HELP : "Live endpoint is not connected.",
    });
  };

  const startLauncherDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    launcherDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: launcherPosition.x,
      originY: launcherPosition.y,
      moved: false,
    };
  };

  if (hiddenForReviewWorkspace) return null;

  return (
    <>
      {open ? (
        <div
          ref={layerRef}
          className="fixed inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-50 flex flex-col items-end gap-2 md:inset-auto md:bottom-5 md:right-5 md:w-[420px]"
        >
          <div className="flex max-h-[68svh] w-full flex-col overflow-hidden rounded-[20px] border bg-card shadow-xl md:max-h-[72vh] md:rounded-lg">
            <div className="border-b p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    <StickyNote className="h-4 w-4 text-primary" />
                    Live review
                    <Badge variant="outline" className={cn("gap-1", endpointBadgeClass)}>
                      {endpointStatus === "live" ? <Cloud className="h-3 w-3" /> : <CloudOff className="h-3 w-3" />}
                      {endpointHeaderLabel}
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
              <section className="rounded-xl border bg-card/70 p-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold">Follow mode</div>
                    <Badge variant="outline" className={cn("gap-1 text-[10px] uppercase tracking-normal", endpointBadgeClass)}>
                      {endpointStatus === "live" ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      {followModeLabel}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {followModeBody}
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] uppercase tracking-normal">
                  {sessionActions.length} tracked
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-muted/30 px-2 py-2">
                  <div className="text-[10px] uppercase tracking-normal text-muted-foreground">Pages</div>
                  <div className="mt-1 text-sm font-semibold">{pageCountInSession || 1}</div>
                </div>
                <div className="rounded-lg bg-muted/30 px-2 py-2">
                  <div className="text-[10px] uppercase tracking-normal text-muted-foreground">Notes sent</div>
                  <div className="mt-1 text-sm font-semibold">{submittedNotes.length}</div>
                </div>
                <div className="rounded-lg bg-muted/30 px-2 py-2">
                  <div className="text-[10px] uppercase tracking-normal text-muted-foreground">Open notes</div>
                  <div className="mt-1 text-sm font-semibold">{openCount}</div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <div className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground">
                  Reviewing: {reviewContextTitle}
                </div>
                <div className="rounded-full bg-muted/60 px-2.5 py-1 text-[11px] text-muted-foreground">
                  {reviewContextAction ? `${reviewContextAction.pageLabel} - ${reviewContextAction.path}` : `${pageLabel} - ${path}`}
                </div>
              </div>

              <div className={cn(
                "mt-3 rounded-lg border px-3 py-2 text-xs",
                endpointStatus === "live"
                  ? "border-emerald-200/80 bg-emerald-50/80 text-emerald-950"
                  : endpointStatus === "failed"
                    ? "border-destructive/30 bg-destructive/10 text-foreground"
                    : "border-amber-300/80 bg-amber-50/80 text-amber-950",
              )}>
                <div className="font-medium">
                  {sessionStatusTitle}
                </div>
                <div className="mt-1 leading-relaxed">
                  {sessionStatusBody}
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  Last tracked: {describeAction(lastTrackedAction)}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Close this panel any time. The floating review launcher can be dragged if it covers the page.
                </div>
              </div>

              {recentTrackedActions.length > 1 ? (
                <div className="mt-2 rounded-lg border bg-background/70 px-3 py-2 text-[11px] text-muted-foreground">
                  Recent: {recentTrackedActions.slice(0, 3).map((action) => describeAction(action)).join(" | ")}
                </div>
              ) : null}
            </section>

            <section className="rounded-xl border bg-background p-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">Capture this screen</div>
                  <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Attach feedback to what you are looking at right now. Enter adds a new line. Use Send note or Ctrl/Cmd+Enter to submit.
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] uppercase tracking-normal">
                  {openCount} open
                </Badge>
              </div>

              <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
                {REVIEW_KINDS.map((kind) => (
                  <button
                    key={kind.value}
                    type="button"
                    onClick={() => updateDraft({ kind: kind.value })}
                    className={cn(
                      "h-8 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors",
                      currentDraft.kind === kind.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground",
                    )}
                  >
                    {kind.label}
                  </button>
                ))}
              </div>

              <div className="mt-2 inline-flex rounded-full border bg-muted/30 p-0.5">
                {REVIEW_PRIORITIES.map((priority) => (
                  <button
                    key={priority.value}
                    type="button"
                    onClick={() => updateDraft({ priority: priority.value })}
                    className={cn(
                      "h-7 rounded-full px-3 text-xs font-medium transition-colors",
                      currentDraft.priority === priority.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {priority.label}
                  </button>
                ))}
              </div>

              <label htmlFor="review-layer-note-text" className="mt-3 block text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">
                Review note
              </label>
              <div className="mt-1 rounded-xl border bg-muted/10 p-2">
                <div className="mb-2 rounded-lg bg-background px-2.5 py-2 text-[11px] text-muted-foreground">
                  Sending this note with: <span className="font-medium text-foreground">{reviewContextTitle}</span>
                </div>
                <textarea
                  id="review-layer-note-text"
                  value={currentDraft.text}
                  onChange={(event) => updateDraft({ text: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                      event.preventDefault();
                      addNote();
                    }
                  }}
                  placeholder="Capture what feels wrong or missing on this exact screen. Enter adds a new line. Use Send note when you are ready."
                  className="min-h-[112px] w-full resize-none rounded-lg border-0 bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              <div className="mt-2 flex items-center justify-between gap-3">
                <div className={cn(
                  "text-[11px]",
                  liveDraftState === "error" ? "text-destructive" : liveDraftState === "sent" ? "text-emerald-700" : "text-muted-foreground",
                )} aria-live="polite">
                  {currentDraft.text ? `Draft saved ${formatWhen(currentDraft.updatedAt)} - live ${liveDraftLabel(liveDraftState, liveDraftAt)}` : "Ready"}
                </div>
                {latestSubmittedNote ? (
                  <div className="max-w-[48%] truncate text-[11px] text-muted-foreground">
                    Last sent: {shortText(latestSubmittedNote.note, 48)}
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground">No submitted notes yet</div>
                )}
              </div>

              <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                <Button onClick={addNote} disabled={!currentDraft.text.trim()} className="h-10 rounded-full">
                  <MessageSquarePlus className="mr-1 h-4 w-4" /> Send note
                </Button>
                <Button variant="outline" onClick={copyExport} className="h-10 rounded-full px-3" aria-label="Copy review notes">
                  <ClipboardCopy className="h-4 w-4" />
                </Button>
              </div>
            </section>

            <div className="rounded-xl border bg-background p-3 text-xs shadow-sm">
              <div className="flex items-start gap-2">
                <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold">Live exchange</div>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-normal">
                      {visibleConversationEntries.length ? `${visibleConversationEntries.length} shown` : endpointConfigured ? "listening" : "offline"}
                    </Badge>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    What you said, what Codex answered, and the order it happened.
                  </div>

                  {visibleConversationEntries.length > 0 ? (
                    <div ref={conversationRef} className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">
                      {visibleConversationEntries.map((entry) => {
                        const isReviewer = entry.author === "reviewer";
                        const isPendingReply = entry.id.startsWith("pending-");

                        return (
                          <div key={entry.id} className={cn("flex", isReviewer ? "justify-end" : "justify-start")}>
                            <div
                              className={cn(
                                "max-w-[88%] rounded-2xl border px-3 py-2 shadow-sm",
                                isReviewer
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                                  : isPendingReply
                                    ? "border-sky-200 border-dashed bg-sky-50 text-sky-950"
                                  : "border-sky-200 bg-sky-50 text-sky-950",
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-[10px] font-semibold uppercase tracking-normal">
                                  {isReviewer ? "You" : "Codex"}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="outline" className="text-[10px] uppercase tracking-normal">
                                    {conversationBadge(entry)}
                                  </Badge>
                                  {isReviewer ? (
                                    <Badge variant="outline" className={cn("text-[10px] uppercase tracking-normal", syncClass({
                                      syncState: entry.syncState,
                                      syncedAt: entry.syncedAt,
                                    }))}>
                                      {syncLabel({
                                        syncState: entry.syncState,
                                        syncedAt: entry.syncedAt,
                                      })}
                                    </Badge>
                                  ) : null}
                                  <span className="text-[10px] text-muted-foreground">{formatWhen(entry.createdAt)}</span>
                                </div>
                              </div>
                              <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{entry.text}</div>
                              {entry.pageLabel || entry.path ? (
                                <div className="mt-1 break-all text-[10px] text-muted-foreground">
                                  {[entry.pageLabel, entry.path].filter(Boolean).join(" - ")}
                                </div>
                              ) : null}
                              {isPendingReply ? (
                                <div className="mt-1 text-[10px] text-muted-foreground">Waiting for the next Codex bridge reply.</div>
                              ) : null}
                              {entry.lastError ? (
                                <div className="mt-1 text-[10px] text-destructive">{entry.lastError}</div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-2 rounded-lg border border-dashed p-3 text-[11px] leading-relaxed text-muted-foreground">
                      {liveConnectionVerified
                        ? "Send a note and I will echo the live conversation here."
                        : endpointConfigured
                          ? "Webhook not confirmed yet. Notes stay local until the bridge responds."
                          : "Connect the live endpoint to see the running conversation here."}
                    </div>
                  )}

                  {awaitingCodexReply ? (
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      Waiting for Codex to answer your latest note.
                    </div>
                  ) : latestBridgeMessage ? (
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      Latest reply: {shortText(latestBridgeMessage.text, 110)}
                    </div>
                  ) : null}
                  {lastBridgeError ? <div className="mt-1 text-[11px] text-destructive">{lastBridgeError}</div> : null}
                </div>
              </div>
            </div>

            <div
              className={cn(
                "rounded-xl border p-3 text-xs shadow-sm",
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

                <div className="rounded-lg border border-dashed bg-background/70 px-3 py-2 text-[11px] text-muted-foreground">
                  Capture controls are above. This section is for sync status, retries, and note cleanup.
                </div>

                <Button variant="outline" className="w-full" onClick={submitAllUnsynced} disabled={sendingCount + sendingActionCount > 0}>
                  {sendingCount + sendingActionCount > 0 ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
                  {endpointConfigured ? "Sync pending notes and actions" : "Local only - copy notes"}
                </Button>

                <div className="rounded-md border bg-background p-2 text-xs text-muted-foreground">
                  {liveConnectionVerified
                    ? `Live endpoint connected to review inbox #${REVIEW_INBOX_ISSUE}. Session: ${sessionId}`
                    : endpointConfigured
                      ? `Review endpoint saved but not yet confirmed. Session: ${sessionId}`
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
        </div>
      ) : null}

      {!open ? (
        <div
          ref={launcherRef}
          className="fixed z-50 max-w-[min(calc(100vw-1rem),22rem)]"
          style={{
            left: `${launcherPosition.x}px`,
            top: `${launcherPosition.y}px`,
          }}
        >
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onPointerDown={startLauncherDrag}
              aria-label="Move review launcher"
              className={cn(
                "inline-flex max-w-full items-center gap-2 self-end rounded-full border bg-background/95 px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur transition-colors touch-none select-none",
                draggingLauncher ? "cursor-grabbing border-primary text-foreground" : "cursor-grab hover:border-foreground/20 hover:text-foreground",
              )}
            >
              <GripHorizontal className="h-3.5 w-3.5" />
              {draggingLauncher ? "Moving review" : "Drag to move"}
            </button>

            {(endpointConfigured || sessionActions.length > 0) ? (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="max-w-[min(calc(100vw-1rem),22rem)] rounded-2xl border bg-card/95 px-3 py-2 text-left shadow-lg backdrop-blur transition-colors hover:border-foreground/20"
                aria-label={`Following ${pageLabel}. ${followChipText}`}
              >
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className={cn("h-2.5 w-2.5 rounded-full", launcherDotClass)} />
                  {launcherStatusLabel}
                  <span className="text-muted-foreground">{sessionActions.length} actions</span>
                </div>
                <div className="mt-1 truncate text-sm font-medium">{pageLabel}</div>
                <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{followChipText}</div>
              </button>
            ) : null}

            <Button
              type="button"
              onClick={() => setOpen(true)}
              className={cn("h-11 self-end rounded-full px-4 shadow-lg", openCount > 0 ? "pr-3" : "")}
              aria-label={`Review layer, ${openCount} open notes`}
            >
              <span className="inline-flex items-center gap-2">
                <StickyNote className="h-4 w-4" />
                Review
              </span>
              {openCount === 0 ? <span className="text-xs text-primary-foreground/80">Open</span> : null}
              {openCount > 0 ? <span className="rounded-full bg-primary-foreground px-2 py-0.5 text-xs text-primary">{openCount}</span> : null}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
