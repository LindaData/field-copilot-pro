import { createServer } from "node:http";
import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const port = Number(process.env.REVIEW_PORT || 8787);
const outputDir = resolve(repoRoot, "data", "review-notes");
const ndjsonPath = resolve(outputDir, "live-review-notes.ndjson");
const markdownPath = resolve(outputDir, "live-review-notes.md");
const maxBodyBytes = 1024 * 1024;

function corsHeaders(origin = "") {
  const allowed = [
    "https://lindadata.github.io",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
  ];
  const allowOrigin = allowed.includes(origin) || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")
    ? origin
    : "https://lindadata.github.io";

  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
  };
}

function json(res, status, payload, origin) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    ...corsHeaders(origin),
  });
  res.end(JSON.stringify(payload));
}

function text(res, status, payload, origin) {
  res.writeHead(status, {
    "content-type": "text/plain; charset=utf-8",
    ...corsHeaders(origin),
  });
  res.end(payload);
}

function safeString(value, fallback = "") {
  return String(value ?? fallback).replace(/\r\n/g, "\n").trim();
}

function noteMarkdown(record) {
  return [
    "## Review note",
    "",
    `- Page: ${record.pageLabel}`,
    `- Route: \`${record.path}\``,
    `- Type: ${record.kind}`,
    `- Priority: ${record.priority}`,
    `- Created: ${record.createdAt}`,
    `- Received: ${record.receivedAt}`,
    `- Session: \`${record.sessionId}\``,
    record.viewport ? `- Viewport: ${record.viewport}` : "",
    record.url ? `- URL: ${record.url}` : "",
    "",
    record.text,
    "",
  ].filter(Boolean).join("\n");
}

function normalizePayload(payload) {
  const note = payload?.note ?? {};
  const textValue = safeString(note.note).slice(0, 4000);
  if (!textValue) throw new Error("empty_note");

  return {
    id: safeString(note.id, `local-${Date.now()}`),
    event: safeString(payload.event, "review_note"),
    repo: safeString(payload.repo, "LindaData/field-copilot-pro"),
    inboxIssue: safeString(payload.inboxIssue, "local"),
    sessionId: safeString(payload.sessionId, "unknown-session"),
    pageLabel: safeString(note.pageLabel, "Unknown page"),
    path: safeString(note.path || payload.routePath || payload.path, "unknown"),
    url: safeString(payload.url),
    text: textValue,
    kind: safeString(note.kind, "ux"),
    priority: safeString(note.priority, "medium"),
    status: safeString(note.status, "open"),
    createdAt: safeString(note.createdAt, new Date().toISOString()),
    viewport: safeString(note.viewport || payload.viewport),
    userAgent: safeString(payload.userAgent),
    receivedAt: new Date().toISOString(),
  };
}

async function readBody(req) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.byteLength;
    if (size > maxBodyBytes) throw new Error("body_too_large");
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function ensureFiles() {
  await mkdir(outputDir, { recursive: true });
  try {
    await readFile(markdownPath, "utf8");
  } catch {
    await writeFile(markdownPath, "# Field Copilot live review notes\n\n", "utf8");
  }
}

async function getJsonNotes() {
  try {
    const raw = await readFile(ndjsonPath, "utf8");
    return raw
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

await ensureFiles();

const server = createServer(async (req, res) => {
  const origin = req.headers.origin || "";
  const url = new URL(req.url || "/", `http://${req.headers.host || `127.0.0.1:${port}`}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders(origin));
    res.end();
    return;
  }

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      json(res, 200, { ok: true, notesUrl: `http://127.0.0.1:${port}/notes` }, origin);
      return;
    }

    if (req.method === "GET" && url.pathname === "/notes") {
      const markdown = await readFile(markdownPath, "utf8");
      text(res, 200, markdown, origin);
      return;
    }

    if (req.method === "GET" && url.pathname === "/notes.json") {
      json(res, 200, { ok: true, notes: await getJsonNotes() }, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/review-note") {
      const body = await readBody(req);
      const record = normalizePayload(JSON.parse(body));
      await appendFile(ndjsonPath, `${JSON.stringify(record)}\n`, "utf8");
      await appendFile(markdownPath, `${noteMarkdown(record)}\n`, "utf8");
      json(res, 200, { ok: true, id: record.id, notesUrl: `http://127.0.0.1:${port}/notes` }, origin);
      return;
    }

    json(res, 404, { ok: false, error: "not_found" }, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "server_error";
    json(res, message === "empty_note" ? 400 : 500, { ok: false, error: message }, origin);
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Review note server listening on http://127.0.0.1:${port}`);
  console.log(`Open notes at http://127.0.0.1:${port}/notes`);
});
