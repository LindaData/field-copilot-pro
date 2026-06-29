const args = process.argv.slice(2);

function argValue(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : "";
}

const endpoint = argValue("--endpoint") || process.env.REVIEW_MESSAGE_ENDPOINT || "http://127.0.0.1:8787/review-message";
const sessionId = argValue("--session") || process.env.REVIEW_SESSION_ID || "broadcast";
const text = argValue("--text") || args.join(" ").trim();
const bridgeKey = process.env.REVIEW_BRIDGE_KEY || "";

if (!text) {
  console.error("Usage: node scripts/review-reply.mjs --text \"Reply text\" [--session review-session-id] [--endpoint URL]");
  process.exit(1);
}

const headers = { "content-type": "application/json" };
if (bridgeKey) headers["x-review-bridge-key"] = bridgeKey;

const response = await fetch(endpoint, {
  method: "POST",
  headers,
  body: JSON.stringify({
    author: "codex",
    sessionId,
    text,
    createdAt: new Date().toISOString(),
  }),
});

if (!response.ok) {
  const body = await response.text();
  throw new Error(`Review reply failed: ${response.status} ${body}`);
}

const payload = await response.json();
console.log(JSON.stringify({ ok: true, id: payload.id, sessionId }, null, 2));
