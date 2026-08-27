// Shared headless-Chromium rendering of a quote's print page
// (app/admin/quotes/[ref]/print) to PDF — the print page IS the PDF layout,
// so this is also what staff see in the in-browser preview, with no second
// template to keep in sync.
//
// Two callers, two auth modes: the staff-authenticated download route
// (app/api/admin/quotes/[ref]/pdf) forwards the requester's own session
// cookie; the automated customer quote-request flow
// (app/api/quote-requests) has no end-user admin session to forward, so it
// authenticates the internal navigation with a shared secret header instead
// (checked in proxy.ts alongside the normal Supabase session check).
//
// @sparticuz/chromium + playwright-core in production (a Chromium build
// meant for AWS Lambda/Vercel's serverless filesystem); full `playwright`
// (with its own bundled browser) locally, since @sparticuz/chromium's binary
// isn't meant to run outside a Lambda-like environment.
export type RenderQuotePdfAuth = { kind: "cookie"; cookieHeader: string } | { kind: "internal-secret" };

import { renderPagePdf } from "./render-page-pdf";

export function requireInternalPdfSecret(): string {
  const secret = process.env.INTERNAL_PDF_SECRET;
  if (!secret) throw new Error("INTERNAL_PDF_SECRET is not set.");
  return secret;
}

export async function renderQuotePdf(ref: string, baseUrl: string, auth: RenderQuotePdfAuth): Promise<Buffer> {
  const pathname = `/admin/quotes/${encodeURIComponent(ref)}/print`;
  if (auth.kind === "cookie") return renderPagePdf(pathname, baseUrl, auth);
  return renderPagePdf(pathname, baseUrl, { kind: "headers", headers: { "x-internal-pdf-secret": requireInternalPdfSecret() } });
}

export async function renderQuotePdfWithRetry(
  ref: string,
  baseUrl: string,
  auth: RenderQuotePdfAuth,
  attempts = 3,
): Promise<Buffer> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await renderQuotePdf(ref, baseUrl, auth);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
      }
    }
  }
  throw lastError;
}
