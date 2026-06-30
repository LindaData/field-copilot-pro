import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Bot,
  CheckCircle2,
  Clock,
  ClipboardCopy,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  Maximize2,
  MessageSquarePlus,
  Monitor,
  MousePointerClick,
  RefreshCw,
  Send,
  Smartphone,
  Tablet,
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
  makeActionId,
  makeNoteId,
  makeSessionExport,
  pageLabelFor,
  postReviewAction,
  postReviewNote,
  REVIEW_ACTIONS_KEY,
  REVIEW_DRAFTS_KEY,
  REVIEW_KINDS,
  REVIEW_NOTES_KEY,
  REVIEW_PRIORITIES,
  REVIEW_PROMPTS,
  REVIEW_ROUTE_SHORTCUTS,
  reviewPathFor,
  reviewEndpointUrl,
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
} from "@/lib/reviewCapture";
import { cn } from "@/lib/utils";

type DeviceMode = "phone" | "tablet" | "desktop";
type LiveDraftState = "idle" | "waiting" | "sending" | "sent" | "error";
type ReviewerSubmission = {
  text: string;
  label: string;
  pageLabel: string;
  path: string;
  target?: string;
  createdAt: string;
};

const DEVICE_MODES: Array<{ value: DeviceMode; label: string; icon: typeof Smartphone; width: number; height: number }> = [
  { value: "phone", label: "Phone", icon: Smartphone, width: 390, height: 760 },
  { value: "tablet", label: "Tablet", icon: Tablet, width: 760, height: 820 },
  { value: "desktop", label: "Desktop", icon: Monitor, width: 1120, height: 820 },
];

function appUrlFor(path: string) {
  const base = import.meta.env.BASE_URL || "/";
  const cleanBase = base.endsWith("/") ? base : `${base}/`;
  const hashIndex = path.indexOf("#");
  const beforeHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : "";
  const queryIndex = beforeHash.indexOf("?");
  const pathname = queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash;
  const query = queryIndex >= 0 ? beforeHash.slice(queryIndex + 1) : "";
  const params = new URLSearchParams(query);
  params.set("reviewFrame", "1");
  const cleanPath = pathname.replace(/^\//, "");
  const search = params.toString();

  return `${cleanBase}${cleanPath}${search ? `?${search}` : ""}${hash}`;
}

function stripBasePath(pathname: string) {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  if (base && base !== "/" && pathname.startsWith(base)) {
    return pathname.slice(base.length) || "/";
  }
  return pathname || "/";
}

function endpointNotesUrl(endpoint: string) {
  return reviewEndpointUrl(endpoint, "/notes");
}

function chatBridgeText(notesUrl: string) {
  return [
    "Review the latest Field Copilot UI notes.",
    notesUrl ? `Notes feed: ${notesUrl}` : "Use the copied review notes below.",
    "Summarize the top usability problems, group them by screen, and propose the smallest safe fixes first.",
  ].join("\n");
}

function shortText(value: string | null | undefined, max = 140) {
  const clean = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean.length > max ? `${clean.slice(0, max - 1)}...` : clean;
}

function liveDraftLabel(state: LiveDraftState, savedAt: string | null) {
  if (state === "waiting") return "Live draft queued";
  if (state === "sending") return "Sending live draft";
  if (state === "sent") return savedAt ? `Live draft sent ${formatWhen(savedAt)}` : "Live draft sent";
  if (state === "error") return "Live draft failed";
  return "Live draft ready";
}

function actionToSubmission(action: ReviewAction): ReviewerSubmission | null {
  const text = action.detail?.trim();
  if (!text) return null;
  const isReviewText = action.kind === "chat"
    || action.kind === "note"
    || (action.kind === "input" && (action.label === "Live note draft" || action.label === "Live chat draft"));

  if (!isReviewText) return null;

  return {
    text,
    label: action.label,
    pageLabel: action.pageLabel,
    path: action.path,
    target: action.target,
    createdAt: action.createdAt,
  };
}

function latestExchangeText(submission: ReviewerSubmission | null, message: ReviewBridgeMessage | null) {
  const lines = [
    "# Field Copilot live review exchange",
    "",
    "## You sent",
    submission?.text || "(No reviewer text captured yet.)",
    "",
    "## Source",
    submission
      ? `${submission.label} - ${submission.pageLabel} - ${submission.path}${submission.target ? ` - ${submission.target}` : ""}`
      : "(No source yet.)",
    "",
    "## Codex replied",
    message?.text || "(No Codex reply yet.)",
  ];

  return lines.join("\n");
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

export default function ReviewWorkspace() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const frameCleanupRef = useRef<(() => void) | null>(null);
  const framePathRef = useRef("/app/today");
  const lastRouteRef = useRef("/app/today");
  const lastLiveNoteDraftRef = useRef("");
  const lastLiveChatDraftRef = useRef("");
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("phone");
  const [targetPath, setTargetPath] = useState("/app/today");
  const [framePath, setFramePath] = useState("/app/today");
  const [notes, setNotes] = useState<ReviewNote[]>(() => loadNotes());
  const [actions, setActions] = useState<ReviewAction[]>(() => loadActions());
  const [drafts, setDrafts] = useState<ReviewDrafts>(() => loadDrafts());
  const [chatDraft, setChatDraft] = useState("");
  const [isTrailVisible, setIsTrailVisible] = useState(true);
  const [bridgeMessages, setBridgeMessages] = useState<ReviewBridgeMessage[]>([]);
  const [lastBridgeError, setLastBridgeError] = useState<string | null>(null);
  const [isRefreshingBridge, setIsRefreshingBridge] = useState(false);
  const [sessionId] = useState(() => getReviewSessionId());
  const [reviewEndpoint, setReviewEndpoint] = useState(() => getReviewEndpoint());
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [liveNoteDraftState, setLiveNoteDraftState] = useState<LiveDraftState>("idle");
  const [liveNoteDraftAt, setLiveNoteDraftAt] = useState<string | null>(null);
  const [liveChatDraftState, setLiveChatDraftState] = useState<LiveDraftState>("idle");
  const [liveChatDraftAt, setLiveChatDraftAt] = useState<string | null>(null);

  const activeMode = DEVICE_MODES.find((mode) => mode.value === deviceMode) ?? DEVICE_MODES[0];
  const frameSrc = useMemo(() => appUrlFor(targetPath), [targetPath]);
  const pageLabel = pageLabelFor(framePath.split("?")[0].split("#")[0] || framePath);
  const currentDraft = drafts[framePath] ?? EMPTY_REVIEW_DRAFT;
  const endpointConfigured = reviewEndpoint.length > 0;
  const notesUrl = endpointNotesUrl(reviewEndpoint);
  const latestBridgeMessage = bridgeMessages[0] ?? null;
  const latestReviewerSubmission = useMemo(() => (
    actions
      .map(actionToSubmission)
      .filter((submission): submission is ReviewerSubmission => Boolean(submission))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
  ), [actions]);

  useEffect(() => {
    framePathRef.current = framePath;
  }, [framePath]);

  useEffect(() => {
    setReviewEndpoint(getReviewEndpoint(window.location.search));
  }, []);

  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  useEffect(() => {
    saveActions(actions);
  }, [actions]);

  useEffect(() => {
    saveDrafts(drafts);
  }, [drafts]);

  const refreshBridgeMessages = useCallback(async (showBusy = false) => {
    if (!endpointConfigured) {
      setBridgeMessages([]);
      setLastBridgeError(null);
      return;
    }

    if (showBusy) setIsRefreshingBridge(true);
    try {
      const messages = await fetchReviewMessages(reviewEndpoint, sessionId);
      setBridgeMessages(messages);
      setLastBridgeError(null);
    } catch (error) {
      setLastBridgeError(error instanceof Error ? error.message : "Review bridge unavailable");
    } finally {
      if (showBusy) setIsRefreshingBridge(false);
    }
  }, [endpointConfigured, reviewEndpoint, sessionId]);

  useEffect(() => {
    void refreshBridgeMessages();
    const interval = window.setInterval(() => {
      void refreshBridgeMessages();
    }, 3500);
    return () => {
      window.clearInterval(interval);
    };
  }, [refreshBridgeMessages]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === REVIEW_NOTES_KEY) setNotes(loadNotes());
      if (event.key === REVIEW_ACTIONS_KEY) setActions(loadActions());
      if (event.key === REVIEW_DRAFTS_KEY) setDrafts(loadDrafts());
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const openNotes = notes.filter((note) => note.status !== "resolved");
  const currentPageNotes = openNotes.filter((note) => note.path === framePath);
  const pendingNotes = openNotes.filter((note) => !note.syncedAt && note.syncState !== "sending");
  const sendingCount = openNotes.filter((note) => note.syncState === "sending").length;
  const actionTrail = actions.slice(0, 80);
  const reviewContextAction = actions.find((action) => !["note", "chat"].includes(action.kind)) ?? null;
  const pendingActions = actions.filter((action) => !action.syncedAt && action.syncState !== "sending");
  const sendingActionCount = actions.filter((action) => action.syncState === "sending").length;

  const updateDraft = (patch: Partial<ReviewDraft>) => {
    const updatedAt = new Date().toISOString();
    setDrafts((existing) => ({
      ...existing,
      [framePath]: {
        ...EMPTY_REVIEW_DRAFT,
        ...(existing[framePath] ?? {}),
        ...patch,
        updatedAt,
      },
    }));
  };

  const clearCurrentDraft = () => {
    setDrafts((existing) => {
      const next = { ...existing };
      delete next[framePath];
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
        patchNote(note.id, { syncedAt, syncState: "sent", lastError: undefined });
      }
      return sent;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Review submit failed";
      patchNote(note.id, { syncState: "error", lastError: message });
      setLastSyncError(message);
      toast.error("Note saved locally. Live submit failed.");
      return false;
    }
  }, [endpointConfigured, patchNote, reviewEndpoint, sessionId]);

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
        const syncedAt = new Date().toISOString();
        patchAction(action.id, { syncedAt, syncState: "sent", lastError: undefined });
      }
      return sent;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Review action submit failed";
      patchAction(action.id, { syncState: "error", lastError: message });
      setLastSyncError(message);
      return false;
    }
  }, [endpointConfigured, patchAction, reviewEndpoint, sessionId]);

  useEffect(() => {
    const text = currentDraft.text;
    if (!text.trim()) {
      setLiveNoteDraftState("idle");
      return undefined;
    }

    if (!endpointConfigured) {
      setLiveNoteDraftState("waiting");
      return undefined;
    }

    setLiveNoteDraftState("waiting");
    const timer = window.setTimeout(() => {
      const key = [
        "note",
        sessionId,
        framePath,
        currentDraft.kind,
        currentDraft.priority,
        text,
      ].join("\u001f");

      if (lastLiveNoteDraftRef.current === key) {
        setLiveNoteDraftState("sent");
        return;
      }

      lastLiveNoteDraftRef.current = key;
      const action: ReviewAction = {
        id: makeActionId(),
        kind: "input",
        path: framePath,
        pageLabel,
        label: "Live note draft",
        target: "review-note-text",
        detail: text.slice(0, 4000),
        createdAt: new Date().toISOString(),
        syncState: "local",
        viewport: currentViewport(),
      };

      setActions((existing) => [action, ...existing].slice(0, 300));
      setLiveNoteDraftState("sending");
      void submitAction(action).then((sent) => {
        if (sent) {
          setLiveNoteDraftAt(new Date().toISOString());
          setLiveNoteDraftState("sent");
        } else {
          setLiveNoteDraftState("error");
        }
      });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [
    currentDraft.kind,
    currentDraft.priority,
    currentDraft.text,
    endpointConfigured,
    framePath,
    pageLabel,
    sessionId,
    submitAction,
  ]);

  useEffect(() => {
    const text = chatDraft;
    if (!text.trim()) {
      setLiveChatDraftState("idle");
      return undefined;
    }

    if (!endpointConfigured) {
      setLiveChatDraftState("waiting");
      return undefined;
    }

    setLiveChatDraftState("waiting");
    const timer = window.setTimeout(() => {
      const key = ["chat", sessionId, framePath, text].join("\u001f");
      if (lastLiveChatDraftRef.current === key) {
        setLiveChatDraftState("sent");
        return;
      }

      lastLiveChatDraftRef.current = key;
      const action: ReviewAction = {
        id: makeActionId(),
        kind: "input",
        path: framePath,
        pageLabel,
        label: "Live chat draft",
        target: "review-chat",
        detail: text.slice(0, 4000),
        createdAt: new Date().toISOString(),
        syncState: "local",
        viewport: currentViewport(),
      };

      setActions((existing) => [action, ...existing].slice(0, 300));
      setLiveChatDraftState("sending");
      void submitAction(action).then((sent) => {
        if (sent) {
          setLiveChatDraftAt(new Date().toISOString());
          setLiveChatDraftState("sent");
        } else {
          setLiveChatDraftState("error");
        }
      });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [
    chatDraft,
    endpointConfigured,
    framePath,
    pageLabel,
    sessionId,
    submitAction,
  ]);

  const readCurrentFrameRoute = useCallback(() => {
    const frame = iframeRef.current;
    const win = frame?.contentWindow;
    if (!win) return framePathRef.current;

    try {
      const frameLocation = win.location;
      return reviewPathFor({
        pathname: stripBasePath(frameLocation.pathname),
        search: frameLocation.search,
        hash: frameLocation.hash,
      });
    } catch {
      return framePathRef.current;
    }
  }, []);

  const recordAction = useCallback((
    kind: ReviewActionKind,
    label: string,
    detail?: string,
    target?: string,
    pathOverride?: string,
  ) => {
    const path = pathOverride || framePathRef.current;
    const cleanPath = path.split("?")[0].split("#")[0] || path;
    const action: ReviewAction = {
      id: makeActionId(),
      kind,
      path,
      pageLabel: pageLabelFor(cleanPath),
      label: shortText(label, 180) || kind,
      target: target ? shortText(target, 180) : undefined,
      detail: detail ? shortText(detail, 240) : undefined,
      createdAt: new Date().toISOString(),
      syncState: "local",
      viewport: currentViewport(),
    };

    setActions((existing) => [action, ...existing].slice(0, 300));
    void submitAction(action);
    return action;
  }, [submitAction]);

  const addNote = () => {
    const text = currentDraft.text.trim();
    if (!text) return;

    const now = new Date().toISOString();
    const note: ReviewNote = {
      id: makeNoteId(),
      path: framePath,
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
    recordAction("note", "Captured review note", text, "review-note", framePath);
    clearCurrentDraft();
    toast.success("Review note captured", {
      description: endpointConfigured ? "Syncing live now." : "Saved locally in this browser.",
    });
    void submitNote(note);
  };

  const submitAllUnsynced = async () => {
    if (!endpointConfigured) {
      toast("Live endpoint not connected", { description: "Use Copy chat handoff or local notes instead." });
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
    toast.success("Review session synced");
  };

  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(makeSessionExport(notes, actions));
      toast.success("Copied review session");
    } catch {
      toast.error("Could not copy session");
    }
  };

  const copyChatBridge = async () => {
    try {
      await navigator.clipboard.writeText(`${chatBridgeText(notesUrl)}\n\n${makeSessionExport(notes, actions)}`);
      toast.success("Copied chat handoff");
    } catch {
      toast.error("Could not copy chat handoff");
    }
  };

  const copyLatestExchange = async () => {
    try {
      await navigator.clipboard.writeText(latestExchangeText(latestReviewerSubmission, latestBridgeMessage));
      toast.success("Copied latest exchange");
    } catch {
      toast.error("Could not copy exchange");
    }
  };

  const sendChatMessage = () => {
    const text = chatDraft.trim();
    if (!text) return;
    recordAction("chat", "Message to Codex", text, "review-chat", framePath);
    setChatDraft("");
    toast.success("Message saved to review session", {
      description: endpointConfigured ? "Also syncing to the local endpoint." : "Use Copy chat handoff when ready.",
    });
  };

  const syncFramePath = useCallback(() => {
    const route = readCurrentFrameRoute();
    setFramePath(route);
    if (route !== lastRouteRef.current) {
      lastRouteRef.current = route;
      recordAction("route", "Route changed", undefined, "review-iframe", route);
    }
  }, [readCurrentFrameRoute, recordAction]);

  const attachFrameListeners = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    frameCleanupRef.current?.();

    const handleClick = (event: MouseEvent) => {
      const element = closestTrackable(event.target);
      if (!element) return;
      const tag = element.tagName.toLowerCase();
      if (["input", "select", "textarea", "option", "form"].includes(tag)) return;
      recordAction("click", elementLabel(element), undefined, elementTarget(element), readCurrentFrameRoute());
    };

    const handleChange = (event: Event) => {
      const element = closestTrackable(event.target);
      if (!element) return;
      const tag = element.tagName.toLowerCase();
      if (!["input", "select", "textarea"].includes(tag)) return;
      recordAction("input", elementLabel(element), inputDetail(element), elementTarget(element), readCurrentFrameRoute());
    };

    const handleSubmit = (event: SubmitEvent) => {
      const element = closestTrackable(event.target);
      if (!element || element.tagName.toLowerCase() !== "form") return;
      recordAction("submit", elementLabel(element), undefined, elementTarget(element), readCurrentFrameRoute());
    };

    doc.addEventListener("click", handleClick, true);
    doc.addEventListener("change", handleChange, true);
    doc.addEventListener("submit", handleSubmit, true);
    frameCleanupRef.current = () => {
      doc.removeEventListener("click", handleClick, true);
      doc.removeEventListener("change", handleChange, true);
      doc.removeEventListener("submit", handleSubmit, true);
    };
  }, [readCurrentFrameRoute, recordAction]);

  useEffect(() => {
    const interval = window.setInterval(syncFramePath, 600);
    return () => window.clearInterval(interval);
  }, [syncFramePath]);

  useEffect(() => () => frameCleanupRef.current?.(), []);

  const openCanvasInNewTab = () => {
    recordAction("click", "Opened canvas in new tab", framePath, "open-canvas", framePath);
    window.open(appUrlFor(framePath), "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Bot className="h-4 w-4 text-cyan-300" />
              Review workspace
              <Badge variant="outline" className={cn("border-white/15 text-slate-100", endpointConfigured ? "bg-emerald-500/15 text-emerald-100" : "bg-amber-500/15 text-amber-100")}>
                {endpointConfigured ? "Endpoint live" : "Local only"}
              </Badge>
            </div>
            <div className="mt-1 text-xs text-slate-400">Centered app canvas with live action tracking, review prompts, notes, and chat handoff around it.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md border border-white/10 px-2 py-1 text-slate-300">{openNotes.length} open</span>
            <span className="rounded-md border border-white/10 px-2 py-1 text-slate-300">{actions.length} actions</span>
            <span className="rounded-md border border-white/10 px-2 py-1 text-slate-300">{pendingNotes.length + pendingActions.length + sendingCount + sendingActionCount} to sync</span>
            {notesUrl ? (
              <a href={notesUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-cyan-300/30 px-2 py-1 text-cyan-100 hover:bg-cyan-300/10">
                Notes feed <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1800px] gap-4 p-4 xl:grid-cols-[320px_minmax(440px,1fr)_380px]">
        <aside className="order-2 flex flex-col gap-4 xl:order-none">
          <section className="order-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="text-sm font-semibold">AI review coach</div>
            <div className="mt-1 text-xs text-slate-400">Use these prompts while moving through the centered app.</div>
            <div className="mt-3 space-y-2">
              {REVIEW_PROMPTS.map((prompt) => (
                <div key={prompt} className="rounded-md border border-white/10 bg-slate-900/80 p-2 text-xs leading-relaxed text-slate-200">
                  {prompt}
                </div>
              ))}
            </div>
          </section>

          <section className="order-2 rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="text-sm font-semibold">Open a screen</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {REVIEW_ROUTE_SHORTCUTS.map((route) => (
                <button
                  key={route.path}
                  type="button"
                  onClick={() => {
                    setTargetPath(route.path);
                    setFramePath(route.path);
                    recordAction("shortcut", `Opened ${route.label}`, route.path, "route-shortcut", route.path);
                  }}
                  className={cn(
                    "rounded-md border px-2 py-2 text-left text-xs hover:bg-white/10",
                    framePath.split("?")[0] === route.path ? "border-cyan-300/50 bg-cyan-300/10 text-cyan-100" : "border-white/10 text-slate-300",
                  )}
                >
                  {route.label}
                </button>
              ))}
            </div>
          </section>

          <section className="order-1 rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="text-sm font-semibold">Chat bridge</div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Notes, clicks, route moves, and messages save as browser review data. With the local endpoint running, they also save as plain text this chat can read from the laptop.
            </p>
            <div className="mt-3 rounded-md border border-emerald-300/25 bg-emerald-300/10 p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-emerald-100">Live notetaker</div>
                <Badge variant="outline" className={cn("border-white/15 text-[10px] uppercase", latestReviewerSubmission ? "text-emerald-100" : "text-slate-300")}>
                  {latestReviewerSubmission ? "capturing" : endpointConfigured ? "ready" : "offline"}
                </Badge>
              </div>

              <label htmlFor="latest-reviewer-submission" className="mt-3 block text-[10px] font-semibold uppercase tracking-normal text-emerald-100">
                You sent
              </label>
              <textarea
                id="latest-reviewer-submission"
                aria-label="Latest thing you sent"
                readOnly
                value={latestReviewerSubmission?.text ?? ""}
                placeholder={endpointConfigured ? "Your next note or message will appear here." : "Open with a review endpoint to show live notes here."}
                className="mt-1 min-h-[74px] w-full resize-none rounded-md border border-emerald-300/20 bg-slate-950 px-2 py-2 text-xs leading-relaxed text-slate-100 outline-none placeholder:text-slate-500"
              />
              {latestReviewerSubmission ? (
                <div className="mt-1 break-all text-[10px] text-emerald-100/80">
                  {latestReviewerSubmission.label} - {latestReviewerSubmission.pageLabel} - {latestReviewerSubmission.path}
                  {latestReviewerSubmission.target ? ` - ${latestReviewerSubmission.target}` : ""}
                </div>
              ) : null}

              <label htmlFor="latest-codex-response" className="mt-3 block text-[10px] font-semibold uppercase tracking-normal text-cyan-100">
                Codex replied
              </label>
              <textarea
                id="latest-codex-response"
                aria-label="Latest Codex response"
                readOnly
                value={latestBridgeMessage?.text ?? ""}
                placeholder={endpointConfigured ? "Codex responses will appear here." : "Connect the review endpoint to receive replies here."}
                className="mt-1 min-h-[86px] w-full resize-none rounded-md border border-cyan-300/20 bg-slate-950 px-2 py-2 text-xs leading-relaxed text-slate-100 outline-none placeholder:text-slate-500"
              />
              {latestBridgeMessage ? (
                <div className="mt-1 break-all text-[10px] text-cyan-100/80">
                  {latestBridgeMessage.pageLabel || "Codex"}{latestBridgeMessage.routePath ? ` - ${latestBridgeMessage.routePath}` : ""} - {formatWhen(latestBridgeMessage.createdAt)}
                </div>
              ) : null}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => void refreshBridgeMessages(true)}
                  disabled={!endpointConfigured || isRefreshingBridge}
                >
                  {isRefreshingBridge ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1 h-3.5 w-3.5" />}
                  Refresh replies
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={copyLatestExchange}
                >
                  <ClipboardCopy className="mr-1 h-3.5 w-3.5" />
                  Copy exchange
                </Button>
              </div>
            </div>
            <div className="mt-3 rounded-md border border-white/10 bg-slate-950 p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-cyan-100">Codex replies</div>
                <Badge variant="outline" className={cn("border-white/15 text-[10px] uppercase", latestBridgeMessage ? "text-emerald-100" : "text-slate-300")}>
                  {latestBridgeMessage ? "live" : endpointConfigured ? "listening" : "offline"}
                </Badge>
              </div>
              {latestBridgeMessage ? (
                <div className="mt-2 space-y-2">
                  {bridgeMessages.slice(0, 3).map((message) => (
                    <div key={message.id} className="rounded border border-cyan-300/15 bg-cyan-300/10 p-2">
                      <div className="text-[10px] uppercase text-cyan-100">{message.author} - {formatWhen(message.createdAt)}</div>
                      <div className="mt-1 text-xs leading-relaxed text-slate-100">{message.text}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-xs leading-relaxed text-slate-400">
                  {endpointConfigured ? "I can reply here once the bridge receives your session." : "Open with a review endpoint to enable live replies."}
                </div>
              )}
              {lastBridgeError ? <div className="mt-2 text-[11px] text-amber-200">{lastBridgeError}</div> : null}
            </div>
            <textarea
              value={chatDraft}
              onChange={(event) => setChatDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendChatMessage();
                }
              }}
              placeholder="Message to Codex while reviewing. Example: the button I just clicked feels unclear."
              className="mt-3 min-h-[96px] w-full resize-none rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-cyan-300"
            />
            <div className={cn(
              "mt-1 text-[11px]",
              liveChatDraftState === "error" ? "text-red-300" : liveChatDraftState === "sent" ? "text-emerald-300" : "text-slate-500",
            )}>
              {liveDraftLabel(liveChatDraftState, liveChatDraftAt)}
            </div>
            <Button className="mt-2 h-9 w-full" onClick={sendChatMessage} disabled={!chatDraft.trim()}>
              <Send className="mr-1 h-4 w-4" /> Send to Codex
            </Button>
            <Button variant="secondary" className="mt-3 h-9 w-full" onClick={copyChatBridge}>
              <ClipboardCopy className="mr-1 h-4 w-4" /> Copy chat handoff
            </Button>
          </section>
        </aside>

        <section className="order-3 min-w-0 rounded-lg border border-white/10 bg-slate-900/80 p-3 xl:order-none">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{pageLabel}</div>
              <div className="truncate text-xs text-slate-400">{framePath}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-md border border-white/10 bg-slate-950 p-0.5">
                {DEVICE_MODES.map((mode) => {
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => {
                        if (deviceMode !== mode.value) {
                          setDeviceMode(mode.value);
                          recordAction("device", `Switched to ${mode.label}`, undefined, "device-toggle", framePath);
                        }
                      }}
                      className={cn("inline-flex h-8 items-center gap-1 rounded px-2 text-xs", deviceMode === mode.value ? "bg-cyan-300 text-slate-950" : "text-slate-300 hover:bg-white/10")}
                    >
                      <Icon className="h-3.5 w-3.5" /> {mode.label}
                    </button>
                  );
                })}
              </div>
              <Button variant="secondary" size="sm" className="h-9" onClick={openCanvasInNewTab}>
                <Maximize2 className="mr-1 h-4 w-4" /> Open
              </Button>
            </div>
          </div>

          {latestBridgeMessage ? (
            <div className="mb-3 rounded-lg border border-cyan-300/25 bg-cyan-300/10 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-cyan-100">
                <Bot className="h-3.5 w-3.5" />
                Codex reply
                <span className="text-slate-400">{formatWhen(latestBridgeMessage.createdAt)}</span>
              </div>
              <div className="mt-2 text-sm leading-relaxed text-slate-100">{latestBridgeMessage.text}</div>
            </div>
          ) : null}

          <div className="flex min-h-[720px] items-start justify-center overflow-auto rounded-lg border border-white/10 bg-slate-950 p-4">
            <div
              className="overflow-hidden rounded-[24px] border border-slate-700 bg-background shadow-2xl"
              style={{ width: activeMode.width, height: activeMode.height }}
            >
              <iframe
                ref={iframeRef}
                title="Field Copilot review canvas"
                src={frameSrc}
                onLoad={() => {
                  syncFramePath();
                  attachFrameListeners();
                }}
                className="h-full w-full border-0 bg-background"
              />
            </div>
          </div>
        </section>

        <aside className="order-1 space-y-4 xl:order-none">
          <section className="rounded-lg border border-white/10 bg-white/[0.04] p-3 xl:sticky xl:top-24">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">Capture UI feedback</div>
                <div className="mt-1 text-xs text-slate-400">{currentPageNotes.length} open on this screen</div>
              </div>
              {endpointConfigured ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : null}
            </div>

            <div className="mt-3 rounded-md border border-cyan-300/20 bg-cyan-300/10 p-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-100">
                <MousePointerClick className="h-3.5 w-3.5" />
                Reviewing now
              </div>
              <div className="mt-2 text-sm font-medium leading-snug text-slate-100">
                {reviewContextAction ? reviewContextAction.label : pageLabel}
              </div>
              <div className="mt-1 break-all text-[11px] leading-relaxed text-slate-400">
                {reviewContextAction ? `${reviewContextAction.pageLabel} - ${reviewContextAction.path}` : `${pageLabel} - ${framePath}`}
              </div>
              {reviewContextAction?.target ? (
                <div className="mt-1 break-all text-[10px] text-slate-500">{reviewContextAction.target}</div>
              ) : null}
            </div>

            <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
              {REVIEW_KINDS.map((kind) => (
                <button
                  key={kind.value}
                  type="button"
                  onClick={() => updateDraft({ kind: kind.value })}
                  className={cn(
                    "h-8 shrink-0 rounded-md border px-2 text-xs font-medium",
                    currentDraft.kind === kind.value ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-white/10 bg-slate-950 text-slate-300 hover:bg-white/10",
                  )}
                >
                  {kind.label}
                </button>
              ))}
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="inline-flex rounded-md border border-white/10 bg-slate-950 p-0.5">
                {REVIEW_PRIORITIES.map((priority) => (
                  <button
                    key={priority.value}
                    type="button"
                    onClick={() => updateDraft({ priority: priority.value })}
                    className={cn("h-7 rounded px-2 text-xs font-medium", currentDraft.priority === priority.value ? "bg-white/15 text-white" : "text-slate-400")}
                  >
                    {priority.label}
                  </button>
                ))}
              </div>
              <span className={cn(
                "text-[11px]",
                liveNoteDraftState === "error" ? "text-red-300" : liveNoteDraftState === "sent" ? "text-emerald-300" : "text-slate-500",
              )}>
                {currentDraft.text ? `${formatWhen(currentDraft.updatedAt)} - ${liveDraftLabel(liveNoteDraftState, liveNoteDraftAt)}` : "Ready"}
              </span>
            </div>

            <label htmlFor="review-note-text" className="mt-3 block text-xs font-semibold uppercase tracking-normal text-slate-400">
              Your note
            </label>
            <textarea
              id="review-note-text"
              value={currentDraft.text}
              onChange={(event) => updateDraft({ text: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  addNote();
                }
              }}
              placeholder={reviewContextAction ? `Write your note about: ${reviewContextAction.label}` : "Write your note for the centered screen."}
              className="mt-1.5 min-h-[132px] w-full resize-none rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-cyan-300"
            />

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button onClick={addNote} disabled={!currentDraft.text.trim()}>
                <MessageSquarePlus className="mr-1 h-4 w-4" /> Capture
              </Button>
              <Button variant="secondary" onClick={copyExport}>
                <ClipboardCopy className="mr-1 h-4 w-4" /> Copy
              </Button>
            </div>
            <Button variant="secondary" className="mt-2 w-full" onClick={submitAllUnsynced} disabled={sendingCount + sendingActionCount > 0}>
              {sendingCount + sendingActionCount > 0 ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
              {endpointConfigured ? "Sync pending session" : "Local/export mode"}
            </Button>
            {lastSyncError ? <div className="mt-2 text-xs text-red-300">{lastSyncError}</div> : null}
          </section>

          <section className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold">Live note queue</div>
              <button type="button" onClick={() => setNotes(loadNotes())} className="inline-flex items-center gap-1 text-xs text-cyan-200">
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
            </div>
            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {openNotes.length === 0 ? (
                <div className="rounded-md border border-dashed border-white/15 p-3 text-xs text-slate-400">No open notes yet.</div>
              ) : openNotes.map((note) => (
                <div key={note.id} className="rounded-md border border-white/10 bg-slate-950 p-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="border-white/15 text-[10px] uppercase text-slate-200">{note.kind ?? "ux"}</Badge>
                    <Badge variant="outline" className="border-white/15 text-[10px] uppercase text-slate-200">{note.priority ?? "medium"}</Badge>
                    <Badge variant="outline" className={cn("text-[10px] uppercase", syncClass(note))}>{syncLabel(note)}</Badge>
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-100">{note.note}</div>
                  <div className="mt-2 break-all rounded bg-white/5 px-2 py-1 text-[11px] text-slate-400">{note.pageLabel} - {note.path}</div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span>{formatWhen(note.createdAt)}</span>
                    <div className="flex items-center gap-2">
                      {endpointConfigured && note.syncState !== "sent" ? (
                        <button type="button" onClick={() => void submitNote(note)} className="text-cyan-200 underline underline-offset-2">retry</button>
                      ) : null}
                      <button type="button" onClick={() => patchNote(note.id, { status: "resolved" })} className="underline underline-offset-2">resolve</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Session trail</div>
                <div className="mt-1 text-xs text-slate-400">Routes, buttons, controls, notes, and chat messages.</div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setActions(loadActions())} className="inline-flex items-center gap-1 text-xs text-cyan-200">
                  <RefreshCw className="h-3 w-3" /> Refresh
                </button>
                <button
                  type="button"
                  onClick={() => setIsTrailVisible((visible) => !visible)}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
                  aria-label={isTrailVisible ? "Hide session trail" : "Show session trail"}
                >
                  {isTrailVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {isTrailVisible ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            {!isTrailVisible ? (
              <div className="rounded-md border border-dashed border-white/15 p-3 text-xs text-slate-400">
                Trail hidden. {actions.length} actions are still being tracked.
              </div>
            ) : (
            <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {actionTrail.length === 0 ? (
                <div className="rounded-md border border-dashed border-white/15 p-3 text-xs text-slate-400">No tracked actions yet. Open the canvas and start reviewing.</div>
              ) : actionTrail.map((action) => {
                const ActionIcon = action.kind === "click"
                  ? MousePointerClick
                  : action.kind === "route" || action.kind === "shortcut"
                    ? Activity
                    : action.kind === "chat"
                      ? Bot
                      : Clock;
                return (
                  <div key={action.id} className="rounded-md border border-white/10 bg-slate-950 p-2 text-xs">
                    <div className="flex items-start gap-2">
                      <ActionIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-200" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="border-white/15 text-[10px] uppercase text-slate-200">{action.kind}</Badge>
                          <Badge variant="outline" className={cn("text-[10px] uppercase", syncClass(action))}>{syncLabel(action)}</Badge>
                          <span className="text-[11px] text-slate-500">{formatWhen(action.createdAt)}</span>
                        </div>
                        <div className="mt-1 break-words text-sm leading-snug text-slate-100">{action.label}</div>
                        {action.detail ? <div className="mt-1 break-words text-[11px] leading-relaxed text-slate-400">{action.detail}</div> : null}
                        <div className="mt-1 break-all text-[11px] text-slate-500">{action.pageLabel} - {action.path}</div>
                        {action.target ? <div className="mt-1 break-all text-[10px] text-slate-600">{action.target}</div> : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </section>
        </aside>
      </main>
    </div>
  );
}
