// Tests for the geo-restriction decision logic used by proxy.ts.
// Run: npm run security:test-geo
import test from "node:test";
import assert from "node:assert/strict";

process.env.BLOCKED_COUNTRIES = "CN, RU";
process.env.GEO_IP_ALLOWLIST = "203.0.113.7, 198.51.100.9";
delete process.env.EDGE_CONFIG;

const { getGeoPolicy, resolveCountry, clientIp, ipAllowed, isCountryBlocked } = await import("./geo-policy.ts");

test("policy is parsed from env vars", async () => {
  const policy = await getGeoPolicy();
  assert.deepEqual(policy.blockedCountries, ["CN", "RU"]);
  assert.deepEqual(policy.allowIps, ["203.0.113.7", "198.51.100.9"]);
});

test("Mainland China is blocked; HK / MO / TW / VE are not", async () => {
  const policy = await getGeoPolicy();
  assert.equal(isCountryBlocked("CN", policy), true);
  assert.equal(isCountryBlocked("cn", policy), true);
  for (const ok of ["HK", "MO", "TW", "VE", "US", null]) {
    assert.equal(isCountryBlocked(ok, policy), false, `${ok} must not be blocked`);
  }
});

test("allowlisted IPs bypass the block", async () => {
  const policy = await getGeoPolicy();
  assert.equal(ipAllowed("203.0.113.7", policy.allowIps), true);
  assert.equal(ipAllowed("10.0.0.1", policy.allowIps), false);
  assert.equal(ipAllowed(null, policy.allowIps), false);
});

test("country resolution prefers Cloudflare then Vercel headers", () => {
  assert.equal(resolveCountry(new Headers({ "cf-ipcountry": "cn" })), "CN");
  assert.equal(resolveCountry(new Headers({ "x-vercel-ip-country": "ve" })), "VE");
  assert.equal(
    resolveCountry(new Headers({ "cf-ipcountry": "XX", "x-vercel-ip-country": "HK" })),
    "HK",
    "placeholder cf value falls through to Vercel"
  );
  assert.equal(resolveCountry(new Headers()), null);
});

test("client IP is the first x-forwarded-for hop", () => {
  assert.equal(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" })), "1.2.3.4");
  assert.equal(clientIp(new Headers({ "x-real-ip": "9.9.9.9" })), "9.9.9.9");
  assert.equal(clientIp(new Headers()), null);
});
