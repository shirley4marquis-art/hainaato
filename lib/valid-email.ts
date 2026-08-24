const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Domains/local-parts that show up when someone fills a form with a
// placeholder instead of a real inbox — not exhaustive, just the common
// ones seen in test/junk quote submissions.
const DISPOSABLE_DOMAINS = new Set([
  "example.com", "test.com", "sample.com", "domain.com", "email.com",
  "mailinator.com", "guerrillamail.com", "yopmail.com", "tempmail.com",
  "trashmail.com", "10minutemail.com", "fakeinbox.com", "fake.com",
  "noemail.com", "none.com", "asdf.com", "xxx.com", "notreal.com",
]);
const PLACEHOLDER_LOCAL_PARTS = new Set(["test", "asdf", "xxx", "none", "n a", "na", "abc", "foo", "admin"]);

// Format-and-heuristic check only — there's no way to confirm an inbox is
// truly reachable without sending mail. Used to (a) reject obvious junk on
// the public quote-request form and (b) flag suspicious existing records in
// the admin quotes list for staff review.
export function isLikelyRealEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const trimmed = email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(trimmed)) return false;
  const [localPart, domain] = trimmed.split("@");
  if (DISPOSABLE_DOMAINS.has(domain)) return false;
  if (PLACEHOLDER_LOCAL_PARTS.has(localPart.replace(/[^a-z]/g, ""))) return false;
  return true;
}
