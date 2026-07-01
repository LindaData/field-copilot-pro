const DEFAULT_REPO = "LindaData/field-copilot-pro";
const DEFAULT_ISSUE_NUMBER = "30";
const DEFAULT_ALLOWED_ORIGINS = [
  "https://lindadata.github.io",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

function clean(value, fallback = "") {
  return String(value ?? fallback).replace(/\r\n/g, "\n").trim();
}

function truncate(value, max = 4000) {
  const text = clean(value);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function repoName(env) {
  return clean(env.REVIEW_REPO, DEFAULT_REPO) || DEFAULT_REPO;
}

function issueNumber(env) {
  return clean(env.REVIEW_ISSUE_NUMBER, DEFAULT_ISSUE_NUMBER) || DEFAULT_ISSUE_NUMBER;
}

function allowedOrigins(env) {
  const configured = clean(env.REVIEW_ALLOWED_ORIGIN);
  if (!configured) return DEFAULT_ALLOWED_ORIGINS;
  return configured.split(",").map((item) => item.trim()).filter(Boolean);
}

function corsOrigin(request, env) {
  const origin = request.headers.get("origin") ?? "";
  const allowed = allowedOrigins(env);
  const local = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/i.test(origin);
  const temporaryTunnel = /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/i.test(origin);
  if (origin && (allowed.includes(origin) || local || temporaryTunnel)) return origin;
  return allowed[0] ?? "https://lindadata.github.io";
}

function corsHeaders(request, env) {
  return {
    "access-control-allow-origin": corsOrigin(request, env),
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, x-review-bridge-key",
    "access-control-allow-private-network": "true",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function json(request, env, status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(request, env),
    },
  });
}

function text(request, env, status, body) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      ...corsHeaders(request, env),
    },
  });
}

function githubHeaders(env) {
  const headers = {
    accept: "application/vnd.github+json",
    "content-type": "application/json; charset=utf-8",
    "user-agent": "field-copilot-review-inbox-worker",
    "x-github-api-version": "2022-11-28",
  };

  const token = clean(env.GITHUB_TOKEN);
  if (token) headers.authorization = `Bearer ${token}`;
  return headers;
}

function githubIssueCommentsUrl(env) {
  return `https://api.github.com/repos/${repoName(env)}/issues/${issueNumber(env)}/comments`;
}

async function readIssueComments(env) {
  const response = await fetch(`${githubIssueCommentsUrl(env)}?per_page=100`, {
    method: "GET",
    headers: githubHeaders(env),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`github_read_failed:${response.status}:${truncate(body, 300)}`);
  }

  return await response.json();
}

async function writeIssueComment(env, body) {
  if (!clean(env.GITHUB_TOKEN)) {
    return {
      ok: false,
      status: 503,
      payload: {
        ok: false,
        error: "missing_github_token",
        message: "Set the Cloudflare Worker secret GITHUB_TOKEN before using live review sync.",
      },
    };
  }

  const response = await fetch(githubIssueCommentsUrl(env), {
    method: "POST",
    headers: githubHeaders(env),
    body: JSON.stringify({ body }),
  });

  if (!response.ok) {
    const responseBody = await response.text();
    return {
      ok: false,
      status: response.status,
      payload: {
        ok: false,
        error: "github_comment_failed",
        detail: truncate(responseBody, 500),
      },
    };
  }

  const comment = await response.json();
  return {
    ok: true,
    status: 200,
    payload: {
      ok: true,
      id: comment.id,
      url: comment.html_url,
      inboxIssue: issueNumber(env),
    },
  };
}

function markdownLine(label, value) {
  const textValue = clean(value);
  return textValue ? `- ${label}: ${textValue}` : "";
}

function reviewNoteMarkdown(payload) {
  const note = payload.note ?? {};
  const noteText = truncate(note.note, 4000);
  const pageLabel = clean(note.pageLabel, payload.pageLabel ?? "Unknown page");
  const path = clean(note.path, payload.routePath ?? payload.path ?? "unknown");

  return [
    "## Live review note",
    "",
    markdownLine("Page", pageLabel),
    markdownLine("Route", `\`${path}\``),
    markdownLine("Type", clean(note.kind, "ux")),
    markdownLine("Priority", clean(note.priority, "medium")),
    markdownLine("Session", `\`${clean(payload.sessionId, "unknown-session")}\``),
    markdownLine("Created", clean(note.createdAt, payload.createdAt ?? new Date().toISOString())),
    markdownLine("Viewport", clean(note.viewport, payload.viewport)),
    markdownLine("URL", payload.url),
    "",
    noteText || "(empty note)",
  ].filter(Boolean).join("\n");
}

function reviewChatMarkdown(payload) {
  const action = payload.action ?? {};
  const detail = truncate(action.detail ?? payload.text, 4000);
  const pageLabel = clean(action.pageLabel, payload.pageLabel ?? "Unknown page");
  const path = clean(action.path, payload.routePath ?? payload.path ?? "unknown");

  return [
    "## Live review message",
    "",
    markdownLine("Page", pageLabel),
    markdownLine("Route", `\`${path}\``),
    markdownLine("Label", clean(action.label, "Reviewer message")),
    markdownLine("Session", `\`${clean(payload.sessionId, "unknown-session")}\``),
    markdownLine("Created", clean(action.createdAt, payload.createdAt ?? new Date().toISOString())),
    "",
    detail || "(empty message)",
  ].filter(Boolean).join("\n");
}

function reviewReplyMarkdown(payload) {
  return [
    "## Codex review reply",
    "",
    markdownLine("Author", clean(payload.author, "codex")),
    markdownLine("Session", `\`${clean(payload.sessionId, "broadcast")}\``),
    markdownLine("Created", clean(payload.createdAt, new Date().toISOString())),
    "",
    truncate(payload.text, 4000),
  ].filter(Boolean).join("\n");
}

async function handleReviewNote(request, env) {
  const payload = await request.json();

  if (payload.event === "review_action") {
    const actionKind = clean(payload.action?.kind);
    if (actionKind !== "chat" && actionKind !== "note") {
      return json(request, env, 200, {
        ok: true,
        skipped: true,
        reason: "non_conversation_action_not_written_to_github",
      });
    }

    const result = await writeIssueComment(env, reviewChatMarkdown(payload));
    return json(request, env, result.status, result.payload);
  }

  if (payload.event !== "review_note") {
    return json(request, env, 400, { ok: false, error: "unsupported_event" });
  }

  const noteText = clean(payload.note?.note);
  if (!noteText) return json(request, env, 400, { ok: false, error: "empty_note" });

  const result = await writeIssueComment(env, reviewNoteMarkdown(payload));
  return json(request, env, result.status, result.payload);
}

async function handleNotes(request, env, asJson) {
  const comments = await readIssueComments(env);
  if (asJson) {
    return json(request, env, 200, {
      ok: true,
      repo: repoName(env),
      inboxIssue: issueNumber(env),
      comments: comments.map((comment) => ({
        id: comment.id,
        author: comment.user?.login,
        createdAt: comment.created_at,
        url: comment.html_url,
        body: comment.body ?? "",
      })),
      notes: [],
    });
  }

  const body = [
    `# Field Copilot review inbox #${issueNumber(env)}`,
    "",
    ...comments.map((comment) => [
      `## Comment ${comment.id}`,
      "",
      comment.created_at ? `- Created: ${comment.created_at}` : "",
      comment.html_url ? `- URL: ${comment.html_url}` : "",
      "",
      comment.body ?? "",
      "",
    ].filter(Boolean).join("\n")),
  ].join("\n");

  return text(request, env, 200, body);
}

function bridgeKeyAllowed(request, env) {
  const bridgeKey = clean(env.REVIEW_BRIDGE_KEY);
  if (!bridgeKey) return true;
  return request.headers.get("x-review-bridge-key") === bridgeKey;
}

async function handleReviewMessage(request, env) {
  if (!bridgeKeyAllowed(request, env)) {
    return json(request, env, 401, { ok: false, error: "unauthorized_bridge_write" });
  }

  const payload = await request.json();
  const textValue = clean(payload.text);
  if (!textValue) return json(request, env, 400, { ok: false, error: "empty_message" });

  const result = await writeIssueComment(env, reviewReplyMarkdown(payload));
  return json(request, env, result.status, result.payload);
}

async function handle(request, env) {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  }

  if (request.method === "GET" && url.pathname === "/health") {
    return json(request, env, 200, {
      ok: true,
      bridge: "field-copilot-review-inbox",
      repo: repoName(env),
      inboxIssue: issueNumber(env),
      githubTokenConfigured: Boolean(clean(env.GITHUB_TOKEN)),
      notesUrl: `${url.origin}/notes`,
      reviewNoteUrl: `${url.origin}/review-note`,
    });
  }

  if (request.method === "GET" && url.pathname === "/notes") {
    return handleNotes(request, env, false);
  }

  if (request.method === "GET" && url.pathname === "/notes.json") {
    return handleNotes(request, env, true);
  }

  if (request.method === "GET" && url.pathname === "/review-feed") {
    const comments = await readIssueComments(env);
    return json(request, env, 200, { ok: true, notes: [], messages: [], comments });
  }

  if (request.method === "GET" && url.pathname === "/review-messages") {
    return json(request, env, 200, { ok: true, messages: [] });
  }

  if (request.method === "POST" && url.pathname === "/review-note") {
    return handleReviewNote(request, env);
  }

  if (request.method === "POST" && url.pathname === "/review-message") {
    return handleReviewMessage(request, env);
  }

  return json(request, env, 404, { ok: false, error: "not_found" });
}

export default {
  async fetch(request, env) {
    try {
      return await handle(request, env);
    } catch (error) {
      return json(request, env, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "worker_error",
      });
    }
  },
};
