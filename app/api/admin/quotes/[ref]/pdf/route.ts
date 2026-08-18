import { NextRequest, NextResponse } from "next/server";
import { renderQuotePdf } from "../../../../../../lib/render-quote-pdf";

// Launching a browser and rendering a multi-page document can take longer
// than Vercel's default function timeout.
export const maxDuration = 60;

export async function GET(request: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  try {
    const pdf = await renderQuotePdf(ref, request.url, {
      kind: "cookie",
      cookieHeader: request.headers.get("cookie") ?? "",
    });
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="HainaAuto-Quote-${ref}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[admin/quotes/pdf] render failed:", error);
    return NextResponse.json({ ok: false, error: "PDF generation failed." }, { status: 500 });
  }
}
