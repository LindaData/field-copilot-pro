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
const messagesNdjsonPath = resolve(outputDir, "live-review-messages.ndjson");
const messagesMarkdownPath = resolve(outputDir, "live-review-messages.md");
const maxBodyBytes = 1024 * 1024;
const bridgeKey = String(process.env.REVIEW_BRIDGE_KEY || "").trim();

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
    "access-control-allow-headers": "content-type, x-review-bridge-key",
    "access-control-allow-private-network": "true",
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

function actionMarkdown(record) {
  return [
    "## Review action",
    "",
    `- Action: ${record.kind}`,
    `- Page: ${record.pageLabel}`,
    `- Route: \`${record.path}\``,
    `- Label: ${record.label}`,
    record.target ? `- Target: ${record.target}` : "",
    record.detail ? `- Detail: ${record.detail}` : "",
    `- Created: ${record.createdAt}`,
    `- Received: ${record.receivedAt}`,
    `- Session: \`${record.sessionId}\``,
    record.viewport ? `- Viewport: ${record.viewport}` : "",
    "",
  ].filter(Boolean).join("\n");
}

function messageMarkdown(record) {
  return [
    "## Review bridge message",
    "",
    `- Author: ${record.author}`,
    `- Session: \`${record.sessionId}\``,
    record.pageLabel ? `- Page: ${record.pageLabel}` : "",
    record.routePath ? `- Route: \`${record.routePath}\`` : "",
    `- Created: ${record.createdAt}`,
    `- Received: ${record.receivedAt}`,
    "",
    record.text,
    "",
  ].filter(Boolean).join("\n");
}

function normalizeMessagePayload(payload) {
  const text = safeString(payload?.text).slice(0, 4000);
  if (!text) throw new Error("empty_message");

  return {
    id: safeString(payload.id, `message-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    event: "review_message",
    sessionId: safeString(payload.sessionId, "broadcast"),
    author: ["codex", "reviewer", "system"].includes(payload.author) ? payload.author : "codex",
    text,
    routePath: safeString(payload.routePath),
    pageLabel: safeString(payload.pageLabel),
    createdAt: safeString(payload.createdAt, new Date().toISOString()),
    receivedAt: new Date().toISOString(),
  };
}

function normalizePayload(payload) {
  if (payload?.event === "review_action") {
    const action = payload.action || {};
    const label = safeString(action.label).slice(0, 1000);
    if (!label) throw new Error("empty_action");

    return {
      id: safeString(action.id, `action-${Date.now()}`),
      event: "review_action",
      repo: safeString(payload.repo, "LindaData/field-copilot-pro"),
      inboxIssue: safeString(payload.inboxIssue, "local"),
      sessionId: safeString(payload.sessionId, "unknown-session"),
      kind: safeString(action.kind, "click"),
      pageLabel: safeString(action.pageLabel, "Unknown page"),
      path: safeString(action.path || payload.routePath || payload.path, "unknown"),
      label,
      target: safeString(action.target),
      detail: safeString(action.detail).slice(0, 4000),
      createdAt: safeString(action.createdAt, new Date().toISOString()),
      viewport: safeString(action.viewport || payload.viewport),
      userAgent: safeString(payload.userAgent),
      receivedAt: new Date().toISOString(),
    };
  }

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
  try {
    await readFile(messagesMarkdownPath, "utf8");
  } catch {
    await writeFile(messagesMarkdownPath, "# Field Copilot live review messages\n\n", "utf8");
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

async function getJsonMessages() {
  try {
    const raw = await readFile(messagesNdjsonPath, "utf8");
    return raw
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

function assertBridgeWriteAllowed(req) {
  if (!bridgeKey) return;
  if (req.headers["x-review-bridge-key"] !== bridgeKey) {
    throw new Error("unauthorized_bridge_write");
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
      json(res, 200, {
        ok: true,
        notesUrl: `http://127.0.0.1:${port}/notes`,
        messagesUrl: `http://127.0.0.1:${port}/messages`,
        bridgeKeyRequired: Boolean(bridgeKey),
      }, origin);
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

    if (req.method === "GET" && url.pathname === "/messages") {
      const markdown = await readFile(messagesMarkdownPath, "utf8");
      text(res, 200, markdown, origin);
      return;
    }

    if (req.method === "GET" && url.pathname === "/messages.json") {
      json(res, 200, { ok: true, messages: await getJsonMessages() }, origin);
      return;
    }

    if (req.method === "GET" && url.pathname === "/review-feed") {
      json(res, 200, { ok: true, notes: await getJsonNotes(), messages: await getJsonMessages() }, origin);
      return;
    }

    if (req.method === "GET" && url.pathname === "/review-messages") {
      const sessionId = safeString(url.searchParams.get("sessionId"));
      const messages = (await getJsonMessages())
        .filter((message) => !sessionId || message.sessionId === sessionId || message.sessionId === "broadcast")
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      json(res, 200, { ok: true, messages }, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/review-note") {
      const body = await readBody(req);
      const record = normalizePayload(JSON.parse(body));
      await appendFile(ndjsonPath, `${JSON.stringify(record)}\n`, "utf8");
      await appendFile(markdownPath, `${record.event === "review_action" ? actionMarkdown(record) : noteMarkdown(record)}\n`, "utf8");
      json(res, 200, { ok: true, id: record.id, notesUrl: `http://127.0.0.1:${port}/notes` }, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/review-message") {
      assertBridgeWriteAllowed(req);
      const body = await readBody(req);
      const record = normalizeMessagePayload(JSON.parse(body));
      await appendFile(messagesNdjsonPath, `${JSON.stringify(record)}\n`, "utf8");
      await appendFile(messagesMarkdownPath, `${messageMarkdown(record)}\n`, "utf8");
      json(res, 200, { ok: true, id: record.id, messagesUrl: `http://127.0.0.1:${port}/messages` }, origin);
      return;
    }

    json(res, 404, { ok: false, error: "not_found" }, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "server_error";
    const status = message === "unauthorized_bridge_write"
      ? 401
      : message === "empty_note" || message === "empty_action" || message === "empty_message"
        ? 400
        : 500;
    json(res, status, { ok: false, error: message }, origin);
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Review note server listening on http://127.0.0.1:${port}`);
  console.log(`Open notes at http://127.0.0.1:${port}/notes`);
});
