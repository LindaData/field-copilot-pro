import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  Loader2,
  Maximize2,
  MessageSquarePlus,
  Monitor,
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
  REVIEW_KINDS,
  REVIEW_NOTES_KEY,
  REVIEW_PRIORITIES,
  REVIEW_PROMPTS,
  REVIEW_ROUTE_SHORTCUTS,
  reviewPathFor,
  saveDrafts,
  saveNotes,
  syncClass,
  syncLabel,
  type ReviewDraft,
  type ReviewDrafts,
  type ReviewNote,
} from "@/lib/reviewCapture";
import { cn } from "@/lib/utils";

type DeviceMode = "phone" | "tablet" | "desktop";

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
  if (!endpoint) return "";
  try {
    const url = new URL(endpoint);
    url.pathname = url.pathname.replace(/\/review-note\/?$/, "/notes");
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function chatBridgeText(notesUrl: string) {
  return [
    "Review the latest Field Copilot UI notes.",
    notesUrl ? `Notes feed: ${notesUrl}` : "Use the copied review notes below.",
    "Summarize the top usability problems, group them by screen, and propose the smallest safe fixes first.",
  ].join("\n");
}

export default function ReviewWorkspace() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("phone");
  const [targetPath, setTargetPath] = useState("/app/today");
  const [framePath, setFramePath] = useState("/app/today");
  const [notes, setNotes] = useState<ReviewNote[]>(() => loadNotes());
  const [drafts, setDrafts] = useState<ReviewDrafts>(() => loadDrafts());
  const [sessionId] = useState(() => getReviewSessionId());
  const [reviewEndpoint, setReviewEndpoint] = useState(() => getReviewEndpoint());
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  const activeMode = DEVICE_MODES.find((mode) => mode.value === deviceMode) ?? DEVICE_MODES[0];
  const frameSrc = useMemo(() => appUrlFor(targetPath), [targetPath]);
  const pageLabel = pageLabelFor(framePath.split("?")[0].split("#")[0] || framePath);
  const currentDraft = drafts[framePath] ?? EMPTY_REVIEW_DRAFT;
  const endpointConfigured = reviewEndpoint.length > 0;
  const notesUrl = endpointNotesUrl(reviewEndpoint);

  useEffect(() => {
    setReviewEndpoint(getReviewEndpoint(window.location.search));
  }, []);

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

  const openNotes = notes.filter((note) => note.status !== "resolved");
  const currentPageNotes = openNotes.filter((note) => note.path === framePath);
  const pendingNotes = openNotes.filter((note) => !note.syncedAt && note.syncState !== "sending");
  const sendingCount = openNotes.filter((note) => note.syncState === "sending").length;

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
    toast.success("Review notes synced");
  };

  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(makeExport(notes));
      toast.success("Copied review notes");
    } catch {
      toast.error("Could not copy notes");
    }
  };

  const copyChatBridge = async () => {
    try {
      await navigator.clipboard.writeText(`${chatBridgeText(notesUrl)}\n\n${makeExport(notes)}`);
      toast.success("Copied chat handoff");
    } catch {
      toast.error("Could not copy chat handoff");
    }
  };

  const syncFramePath = useCallback(() => {
    const frame = iframeRef.current;
    const win = frame?.contentWindow;
    if (!win) return;
    try {
      const frameLocation = win.location;
      const route = reviewPathFor({
        pathname: stripBasePath(frameLocation.pathname),
        search: frameLocation.search,
        hash: frameLocation.hash,
      });
      setFramePath(route);
    } catch {
      // If the iframe ever becomes cross-origin, keep the last route instead of breaking capture.
    }
  }, []);

  useEffect(() => {
    const interval = window.setInterval(syncFramePath, 600);
    return () => window.clearInterval(interval);
  }, [syncFramePath]);

  const openCanvasInNewTab = () => {
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
            <div className="mt-1 text-xs text-slate-400">Centered app canvas with review prompts, capture, notes, and chat handoff around it.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md border border-white/10 px-2 py-1 text-slate-300">{openNotes.length} open</span>
            <span className="rounded-md border border-white/10 px-2 py-1 text-slate-300">{pendingNotes.length + sendingCount} to sync</span>
            {notesUrl ? (
              <a href={notesUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-cyan-300/30 px-2 py-1 text-cyan-100 hover:bg-cyan-300/10">
                Notes feed <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1800px] gap-4 p-4 xl:grid-cols-[320px_minmax(440px,1fr)_380px]">
        <aside className="space-y-4">
          <section className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
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

          <section className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="text-sm font-semibold">Open a screen</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {REVIEW_ROUTE_SHORTCUTS.map((route) => (
                <button
                  key={route.path}
                  type="button"
                  onClick={() => {
                    setTargetPath(route.path);
                    setFramePath(route.path);
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

          <section className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="text-sm font-semibold">Chat bridge</div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Notes save as browser review data and, when the local endpoint is running, as plain text this chat can read from the laptop.
            </p>
            <Button variant="secondary" className="mt-3 h-9 w-full" onClick={copyChatBridge}>
              <ClipboardCopy className="mr-1 h-4 w-4" /> Copy chat handoff
            </Button>
          </section>
        </aside>

        <section className="min-w-0 rounded-lg border border-white/10 bg-slate-900/80 p-3">
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
                      onClick={() => setDeviceMode(mode.value)}
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

          <div className="flex min-h-[720px] items-start justify-center overflow-auto rounded-lg border border-white/10 bg-slate-950 p-4">
            <div
              className="overflow-hidden rounded-[24px] border border-slate-700 bg-background shadow-2xl"
              style={{ width: activeMode.width, height: activeMode.height }}
            >
              <iframe
                ref={iframeRef}
                title="Field Copilot review canvas"
                src={frameSrc}
                onLoad={syncFramePath}
                className="h-full w-full border-0 bg-background"
              />
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">Capture UI feedback</div>
                <div className="mt-1 text-xs text-slate-400">{currentPageNotes.length} open on this screen</div>
              </div>
              {endpointConfigured ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : null}
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
              <span className="text-[11px] text-slate-500">{currentDraft.text ? `Draft ${formatWhen(currentDraft.updatedAt)}` : "Ready"}</span>
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
              placeholder="Write the UI note for the centered screen. Enter captures; Shift+Enter adds a line."
              className="mt-3 min-h-[132px] w-full resize-none rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-cyan-300"
            />

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button onClick={addNote} disabled={!currentDraft.text.trim()}>
                <MessageSquarePlus className="mr-1 h-4 w-4" /> Capture
              </Button>
              <Button variant="secondary" onClick={copyExport}>
                <ClipboardCopy className="mr-1 h-4 w-4" /> Copy
              </Button>
            </div>
            <Button variant="secondary" className="mt-2 w-full" onClick={submitAllUnsynced} disabled={sendingCount > 0}>
              {sendingCount > 0 ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
              {endpointConfigured ? "Sync pending notes" : "Local/export mode"}
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
        </aside>
      </main>
    </div>
  );
}
