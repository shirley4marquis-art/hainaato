import { guardAdminRequest } from "../../../../../../lib/security/admin";
import { NextRequest } from "next/server";
import { renderQuotePdfWithRetry } from "../../../../../../lib/render-quote-pdf";
import { documentFailure, pdfResponse } from "../../../../../../lib/documents/http";

// Launching a browser and rendering a multi-page document can take longer
// than Vercel's default function timeout.
export const maxDuration = 300;

export async function GET(request: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  const denied = await guardAdminRequest(request);
  if (denied) return denied;
  const { ref } = await params;
  try {
    const pdf = await renderQuotePdfWithRetry(ref, request.url, {
      kind: "cookie",
      cookieHeader: request.headers.get("cookie") ?? "",
    });
    return pdfResponse(pdf, `Nindge Automobile-Quotation-${ref}.pdf`, request.nextUrl.searchParams.get("preview") !== "1");
  } catch (error) {
    return documentFailure(error);
  }
}
