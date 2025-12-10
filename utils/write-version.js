import { execSync } from "node:child_process";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve("src", "_data");
const VERSION_FILE = path.join(DATA_DIR, "version.json");

const MAJOR = 1;
const MINOR = 0;

function safeExec(cmd) {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch (_) {
    return null;
  }
}

function buildVersion() {
  const count = safeExec("git rev-list --count HEAD") || "0";
  const sha = safeExec("git rev-parse --short HEAD") || "unknown";
  const timestamp = new Date().toISOString();

  // Use git commit count as the patch number to keep a monotonically increasing sequence.
  const patch = Number(count) || 0;
  const version = `${MAJOR}.${MINOR}.${patch}`;

  return { version, sha, timestamp, major: MAJOR, minor: MINOR, patch };
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function main() {
  ensureDataDir();
  const payload = buildVersion();
  writeFileSync(VERSION_FILE, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Version written to ${VERSION_FILE}: ${payload.version} (${payload.sha})`);
}

main();
