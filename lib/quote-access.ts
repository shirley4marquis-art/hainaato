import { createHmac, timingSafeEqual } from "node:crypto";

function accessSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.INTERNAL_PDF_SECRET;
  if (!secret) throw new Error("Quote access signing secret is not configured.");
  return secret;
}

export function createQuoteAccessToken(ref: string): string {
  return createHmac("sha256", accessSecret()).update(ref.trim().toUpperCase()).digest("base64url");
}

export function verifyQuoteAccessToken(ref: string, token: string): boolean {
  if (!token || token.length > 128) return false;
  const expected = createQuoteAccessToken(ref);
  const actualBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
