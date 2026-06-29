import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { ClipboardCopy, MessageSquarePlus, StickyNote, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const REVIEW_NOTES_KEY = "field-copilot-review-notes-v1";

type ReviewStatus = "open" | "resolved";

interface ReviewNote {
  id: string;
  path: string;
  pageLabel: string;
  note: string;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
}

const PAGE_LABELS: Record<string, string> = {
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

export function ReviewLayer() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [notes, setNotes] = useState<ReviewNote[]>(() => loadNotes());
  const pageLabel = pageLabelFor(location.pathname);
  const path = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  const currentPageNotes = useMemo(
    () => notes.filter((note) => note.path === path && note.status !== "resolved"),
    [notes, path],
  );
  const openCount = notes.filter((note) => note.status !== "resolved").length;

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
    toast.success("Review note added", { description: pageLabel });
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
      toast.success("Review notes copied", { description: "Paste them into ChatGPT so I can follow page-by-page." });
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
        <div className="w-[min(92vw,420px)] rounded-xl border bg-card shadow-xl">
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
              placeholder="Add a note for this exact page…"
              className="min-h-[88px] w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={addNote} disabled={!draft.trim()}>
                <MessageSquarePlus className="mr-1 h-4 w-4" /> Add note
              </Button>
              <Button variant="outline" onClick={copyExport}>
                <ClipboardCopy className="mr-1 h-4 w-4" /> Copy all
              </Button>
            </div>

            <div className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
              Notes attach to the current route, so exported feedback tells ChatGPT exactly which page each note came from.
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
                      <span>{new Date(note.createdAt).toLocaleString()}</span>
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
              <span>{openCount} open total</span>
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
