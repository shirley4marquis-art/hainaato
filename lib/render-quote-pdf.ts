// Official PDF templates are shared by quote downloads and email attachments.
export type RenderQuotePdfAuth = { kind: "cookie"; cookieHeader: string } | { kind: "internal-secret" };

import { generateQuoteTemplatePdf } from "./documents/service";
import { DocumentError } from "./documents/types";

export function requireInternalPdfSecret(): string {
  const secret = process.env.INTERNAL_PDF_SECRET;
  if (!secret) throw new Error("INTERNAL_PDF_SECRET is not set.");
  return secret;
}

export async function renderQuotePdf(ref: string, _baseUrl: string, _auth: RenderQuotePdfAuth): Promise<Buffer> {
  void _baseUrl; void _auth;
  return generateQuoteTemplatePdf(ref);
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
      if (error instanceof DocumentError) throw error;
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
      }
    }
  }
  throw lastError;
}
