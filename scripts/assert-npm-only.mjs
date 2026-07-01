import { existsSync } from "node:fs";
import { resolve } from "node:path";

const bunLockPath = resolve(process.cwd(), "bun.lockb");

if (existsSync(bunLockPath)) {
  console.error("bun.lockb is not allowed in this repository.");
  console.error("Use npm and package-lock.json, then remove bun.lockb before committing.");
  process.exit(1);
}

console.log("npm-only guard passed: bun.lockb not found.");
