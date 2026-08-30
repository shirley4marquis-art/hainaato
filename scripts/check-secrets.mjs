// Fails (exit 1) if anything that looks like a server secret appears in code
// that ships to the browser (spec §9, §14). Run after `npm run build`:
//
//   node scripts/check-secrets.mjs
//
// Scans:
//   - .next/static/**            (the actual client bundles, if built)
//   - app/**/*.{ts,tsx}          (source, excluding route.ts / server-only)
//
// It looks for known secret env-var NAMES being referenced outside server code
// and for value-shaped patterns (Resend keys, Postgres URLs, JWT service keys).
import { readFile, readdir, stat } from "node:fs/promises";
import { join, extname } from "node:path";

const ROOT = process.cwd();

const SECRET_NAMES = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRM_DATABASE_URL",
  "IMPORT_DATABASE_URL",
  "RESEND_API_KEY",
  "INTERNAL_PDF_SECRET",
  "CRON_SECRET",
  "EDGE_AUTH_SECRET",
  "TURNSTILE_SECRET_KEY",
  "VERCEL_API_TOKEN",
  "IP_HASH_SALT",
];

// Only an actual read of the var is a risk — not a var name appearing in prose.
const SECRET_NAME_PATTERNS = SECRET_NAMES.map(
  (n) => new RegExp(`process\\.env(?:\\.${n}\\b|\\[["'\`]${n}["'\`]\\])`)
);

const SECRET_VALUE_PATTERNS = [
  { name: "Resend API key", re: /re_[A-Za-z0-9]{16,}/ },
  { name: "Postgres connection string", re: /postgres(?:ql)?:\/\/[^\s"'`]+/ },
  { name: "Generic bearer secret", re: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/ },
];

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".git"].includes(entry.name)) continue;
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

const findings = [];

// 1. Built client bundles — the ground truth for what reaches browsers.
for await (const file of walk(join(ROOT, ".next", "static"))) {
  if (![".js", ".mjs", ".json"].includes(extname(file))) continue;
  const text = await readFile(file, "utf8").catch(() => "");
  for (let i = 0; i < SECRET_NAME_PATTERNS.length; i++) {
    if (SECRET_NAME_PATTERNS[i].test(text)) {
      findings.push(`${file}: reads server env var process.env.${SECRET_NAMES[i]}`);
    }
  }
  for (const { name, re } of SECRET_VALUE_PATTERNS) {
    const m = text.match(re);
    if (m) findings.push(`${file}: contains ${name}-shaped value (${m[0].slice(0, 12)}…)`);
  }
}

// 2. Client source files ("use client") — must not read server secrets.
for await (const file of walk(join(ROOT, "app"))) {
  if (![".ts", ".tsx"].includes(extname(file))) continue;
  if (/route\.ts$/.test(file)) continue;
  const text = await readFile(file, "utf8").catch(() => "");
  if (!/^["']use client["']/m.test(text)) continue;
  for (let i = 0; i < SECRET_NAME_PATTERNS.length; i++) {
    if (SECRET_NAME_PATTERNS[i].test(text)) {
      findings.push(`${file}: client component reads process.env.${SECRET_NAMES[i]}`);
    }
  }
}

const staticDir = await stat(join(ROOT, ".next", "static")).catch(() => null);
if (!staticDir) {
  console.warn("⚠  .next/static not found — run `npm run build` first for a full scan.");
}

if (findings.length) {
  console.error("✗ Potential secret exposure:\n" + findings.map((f) => "  - " + f).join("\n"));
  process.exit(1);
}
console.log("✓ No server secrets detected in client-facing code.");
