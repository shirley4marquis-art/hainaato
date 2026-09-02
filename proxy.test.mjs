import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sourceFiles = [
  "proxy.ts",
  "app/api/admin/login/route.ts",
  "lib/security/http.ts",
];

const sources = await Promise.all(
  sourceFiles.map(async (file) => [file, await readFile(new URL(`./${file}`, import.meta.url), "utf8")]),
);

test("request handling does not resolve visitor location", () => {
  for (const [file, source] of sources) {
    assert.doesNotMatch(source, /resolveCountry|cf-ipcountry|x-vercel-ip-country/, file);
  }
});

test("proxy defaults to English without a country-derived language", () => {
  const proxySource = sources.find(([file]) => file === "proxy.ts")?.[1] ?? "";
  assert.match(proxySource, /const targetLang = langOverride \|\| existingLocale \|\| "en";/);
  assert.match(proxySource, /const EXPLICIT_LOCALE_COOKIE = "haina_locale_explicit";/);
});
