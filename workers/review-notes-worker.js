const DEFAULT_REPO = "LindaData/field-copilot-pro";
const DEFAULT_ISSUE = "30";
const MAX_NOTE_LENGTH = 4000;

function corsHeaders(env) {
  const origin = env.ALLOWED_ORIGIN || "https://lindadata.github.io";
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
  };
}

function jsonResponse(payload, status, env) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json",
      ...corsHeaders(env),
    },
  });
}

function noteBody(payload) {
  const note = payload.note || {};
  const safeText = String(note.note || "").slice(0, MAX_NOTE_LENGTH);
  const path = String(note.path || payload.path || "unknown");
  const pageLabel = String(note.pageLabel || "Unknown page");
  const sessionId = String(payload.sessionId || "unknown-session");
  const createdAt = String(note.createdAt || new Date().toISOString());
  const url = String(payload.url || "");

  return [
    "## Review note",
    "",
    `**Page:** ${pageLabel}`,
    `**Route:** \`${path}\``,
    `**Session:** \`${sessionId}\``,
    `**Created:** ${createdAt}`,
    url ? `**URL:** ${url}` : "",
    "",
    safeText,
  ].filter(Boolean).join("\n");
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    if (request.method !== "POST") {
      return jsonResponse({ ok: false, error: "method_not_allowed" }, 405, env);
    }

    const origin = request.headers.get("origin") || "";
    if (env.ALLOWED_ORIGIN && origin !== env.ALLOWED_ORIGIN) {
      return jsonResponse({ ok: false, error: "origin_not_allowed" }, 403, env);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ ok: false, error: "invalid_json" }, 400, env);
    }

    const noteText = String(payload?.note?.note || "").trim();
    if (!noteText) {
      return jsonResponse({ ok: false, error: "empty_note" }, 400, env);
    }

    if (!env.GITHUB_TOKEN) {
      return jsonResponse({ ok: false, error: "missing_github_token" }, 500, env);
    }

    const repo = env.GITHUB_REPO || DEFAULT_REPO;
    const issue = env.GITHUB_INBOX_ISSUE || DEFAULT_ISSUE;
    const apiUrl = `https://api.github.com/repos/${repo}/issues/${issue}/comments`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "accept": "application/vnd.github+json",
        "content-type": "application/json",
        "user-agent": "field-copilot-review-layer",
        "x-github-api-version": "2022-11-28",
      },
      body: JSON.stringify({ body: noteBody(payload) }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return jsonResponse({ ok: false, error: "github_comment_failed", detail }, 502, env);
    }

    const comment = await response.json();
    return jsonResponse({ ok: true, commentUrl: comment.html_url }, 200, env);
  },
};
