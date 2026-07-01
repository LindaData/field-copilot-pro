import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const distDir = path.join(repoRoot, "dist");
const distIndex = path.join(distDir, "index.html");

const STATIC_ROUTES = [
  "/signin",
  "/review",
  "/app",
  "/app/today",
  "/app/demo-walkthrough",
  "/app/jobs",
  "/app/scan",
  "/app/copilot",
  "/app/equipment",
  "/app/documents",
  "/app/parts",
  "/app/knowledge",
  "/app/training",
  "/app/settings",
  "/app/more",
  "/app/feedback",
  "/app/owner",
  "/app/owner/demo-walkthrough",
  "/app/owner/jobs",
  "/app/owner/customers",
  "/app/owner/equipment",
  "/app/owner/market-systems",
  "/app/owner/integrations/aws",
  "/app/owner/more",
  "/app/owner/feedback",
];

function toEntryPath(route) {
  return path.join(distDir, ...route.replace(/^\/+/, "").split("/"), "index.html");
}

async function main() {
  const indexHtml = await readFile(distIndex, "utf8");

  for (const route of STATIC_ROUTES) {
    const entryPath = toEntryPath(route);
    await mkdir(path.dirname(entryPath), { recursive: true });
    await writeFile(entryPath, indexHtml, "utf8");
  }

  console.log(`Generated GitHub Pages route entrypoints for ${STATIC_ROUTES.length} static routes.`);
}

main().catch((error) => {
  console.error(`Failed to generate route entrypoints: ${error.stack || error.message}`);
  process.exitCode = 1;
});
