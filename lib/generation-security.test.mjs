import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const root = process.cwd();
function load(file, mocks = {}, cache = new Map()) {
  const filename = path.resolve(root, file);
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = { exports: {} };
  cache.set(filename, mod);
  const require = createRequire(filename);
  const localRequire = (id) => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id.startsWith(".")) {
      const resolved = path.resolve(path.dirname(filename), id);
      if (fs.existsSync(resolved + ".ts")) return load(resolved + ".ts", mocks, cache);
    }
    return require(id);
  };
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
  new Function("require", "module", "exports", outputText)(localRequire, mod, mod.exports);
  return mod.exports;
}

test("PDF destinations cannot be controlled by request hosts or absolute paths", () => {
  const previous = process.env.PDF_RENDER_ORIGIN;
  process.env.PDF_RENDER_ORIGIN = "https://www.nindgeauto.com";
  try {
    const { pdfTarget } = load("lib/security/generation.ts");
    assert.equal(pdfTarget("/admin/quotes/EST0001/print", "https://attacker.invalid").origin, "https://www.nindgeauto.com");
    for (const input of ["https://attacker.invalid", "//attacker.invalid/x", "/\\attacker.invalid/x", "/admin/login", "/admin/quotes/EST0001/print?redirect=https://evil.test", "/admin/quotes/../print"]) assert.throws(() => pdfTarget(input, "https://www.nindgeauto.com"), input);
  } finally {
    if (previous === undefined) delete process.env.PDF_RENDER_ORIGIN;
    else process.env.PDF_RENDER_ORIGIN = previous;
  }
});

test("mailbox parsing rejects lists, control characters, and display-name injection", () => {
  const { isSingleEmail } = load("lib/security/generation.ts");
  assert.equal(isSingleEmail("buyer+quote@real-domain.co.uk"), true);
  for (const value of ["a,b@domain.com", "Buyer <a@domain.com>", "a@domain.com\r\nBcc: x@evil.com", "a\0@domain.com", "a@-domain.com", "a..b@domain.com", "a".repeat(65) + "@domain.com"]) assert.equal(isSingleEmail(value), false, value);
});

test("email templates escape markup and exclude executable links", async () => {
  const { customSalesEmailHtml, sendEmail } = load("lib/email.ts");
  const html = customSalesEmailHtml({ customerName: '<img src=x onerror="alert(1)">', heading: "Test", message: "<script>alert(1)</script>", callToActionLabel: "Open", callToActionUrl: "javascript:alert(1)", downloadLinks: [{ label: "Bad", url: "data:text/html,<script>" }, { label: "Good", url: "https://files.example.com/a.pdf" }] });
  assert.doesNotMatch(html, /javascript:|data:text\/html|<script>|onerror="/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /https:\/\/files.example.com\/a.pdf/);
  assert.equal((await sendEmail({ to: "a,b@domain.com", subject: "Hello", html: "Hi" })).ok, false);
  assert.equal((await sendEmail({ to: "a@domain.com", subject: "Hello\r\nBcc: x", html: "Hi" })).ok, false);
});

test("JSON input is bounded even without a Content-Length header", async () => {
  const { readJsonObject } = load("lib/security/request-body.ts");
  for (const body of ["null", "[]", "42", '"text"', "{"]) await assert.rejects(readJsonObject(new Request("https://local.test", { method: "POST", body })));
  await assert.rejects(readJsonObject(new Request("https://local.test", { method: "POST", body: JSON.stringify({ text: "a".repeat(100) }) }), 50));
  assert.deepEqual(await readJsonObject(new Request("https://local.test", { method: "POST", body: '{"name":"Buyer"}' })), { name: "Buyer" });
});

test("quote-status rejects missing or forged tokens before touching the CRM", async () => {
  let lookups = 0;
  const { GET } = load("app/api/quote-status/route.ts", {
    "../../../lib/security/http": { guardRequest: async () => null },
    "../../../lib/crm": { getQuoteStatus: async () => { lookups++; return { ref: "EST0001" }; } },
    "../../../lib/quote-access": { verifyQuoteAccessToken: (ref, token) => ref === "EST0001" && token === "signed" },
  });
  const req = (token) => ({ nextUrl: new URL(`https://local.test/api/quote-status?ref=EST0001&token=${token}`) });
  assert.equal((await GET(req(""))).status, 403);
  assert.equal((await GET(req("forged"))).status, 403);
  assert.equal(lookups, 0);
  const response = await GET(req("signed"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(lookups, 1);
});

test("public customer records never reuse a claimed existing phone or email", async () => {
  const previous = process.env.CRM_DATABASE_URL;
  process.env.CRM_DATABASE_URL = "postgresql://test.invalid/no-connection";
  const queries = [];
  const client = { release() {}, async query(sql) {
    queries.push(sql);
    if (sql.includes("pg_advisory_xact_lock")) throw new Error("stop before quote creation");
    if (sql.startsWith("INSERT INTO customers")) return { rows: [{ id: 123 }] };
    return { rows: [] };
  } };
  try {
    const { adminSaveQuote } = load("lib/crm.ts", { pg: { types: { setTypeParser() {} }, Pool: class { async connect() { return client; } } } });
    const input = { customer: { name: "Attacker", phone: "existing-phone", email: "new@domain.com" }, items: [] };
    await assert.rejects(adminSaveQuote(input, { publicSubmission: true }), /stop before quote creation/);
    assert.ok(queries.some(sql => sql.startsWith("INSERT INTO customers")));
    assert.ok(!queries.some(sql => sql.startsWith("SELECT * FROM customers")));
    await assert.rejects(adminSaveQuote({ ...input, customer: { ...input.customer, id: 7 } }, { publicSubmission: true }), /must create new records/);
    await assert.rejects(adminSaveQuote({ ...input, ref: "EST0001" }, { publicSubmission: true }), /must create new records/);
  } finally {
    if (previous === undefined) delete process.env.CRM_DATABASE_URL;
    else process.env.CRM_DATABASE_URL = previous;
  }
});

test("admin boundary rejects anonymous users, non-staff, and cross-site writes", async () => {
  let user = null;
  const { guardAdminRequest } = load("lib/security/admin.ts", {
    "../supabase/server": { createClient: async () => ({ auth: { getUser: async () => ({ data: { user }, error: null }) } }) },
  });
  assert.equal((await guardAdminRequest(new Request("https://local.test"))).status, 401);
  user = { app_metadata: { role: "customer" }, user_metadata: { role: "admin" } };
  assert.equal((await guardAdminRequest(new Request("https://local.test"))).status, 403);
  user = { app_metadata: { role: "admin" } };
  assert.equal((await guardAdminRequest(new Request("https://local.test", { method: "POST", headers: { origin: "https://evil.test" } }))).status, 403);
  assert.equal(await guardAdminRequest(new Request("https://local.test", { method: "POST", headers: { origin: "https://local.test" } })), null);
});

test("duplicate listings cannot unlock promotional pricing or select existing customers", async () => {
  let saved;
  let options;
  const { POST } = load("app/api/quote-requests/route.ts", {
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) }, after() {} },
    "../../../lib/security/http": { guardRequest: async () => null },
    "../../../lib/security/rate-limit": { checkRateLimit: async () => ({ ok: true }) },
    "../../../lib/vehicles": { getVehicleIndexEntryBySlug: () => ({ brand: "Toyota", model: "Test", condition: "new" }) },
    "../../../lib/vehicle-details": { getVehicleBySlug: () => ({ priceCNY: 6000, images: [], specs: {}, bodyType: "SUV" }) },
    "../../../lib/image-ranking": { rankVehicleImages: (images) => images },
    "../../../lib/currency": { convertFromCNY: (price) => price },
    "../../../lib/vehicle-document-details": { buildVehicleConfigurationRows: () => [], buildVehicleFactRows: () => [], formatRowsForHistory: () => "" },
    "../../../lib/crm": { adminSaveQuote: async (input, opts) => { saved = input; options = opts; return "EST0001"; }, adminGetQuote: async () => null },
    "../../../lib/quote-access": { createQuoteAccessToken: () => "signed" },
  });
  const response = await POST(new Request("https://local.test/api/quote-requests", { method: "POST", body: JSON.stringify({ name: "Buyer", email: "buyer@real-domain.com", country: "China", vehicles: Array.from({ length: 3 }, () => ({ slug: "same-car", qty: 1 })) }) }));
  assert.equal(response.status, 200);
  assert.equal(saved.items.length, 1);
  assert.equal(saved.items[0].fobFinal, 6000);
  assert.deepEqual(options, { publicSubmission: true });
});

test("generation limiters fail closed without a database", async () => {
  const { checkRateLimit } = load("lib/security/rate-limit.ts", { pg: { types: { setTypeParser() {} } } });
  const result = await checkRateLimit({ key: "test", limit: 1, windowSec: 60, failClosed: true });
  assert.equal(result.ok, false);
  assert.equal(result.retryAfter, 60);
});

// Run the existing quote totals / promotion regressions through the same
// TypeScript loader, without adding a runtime dependency.
load("lib/quote-document.test.ts");
