import { NextRequest, NextResponse } from "next/server";
import { getVehicleBySlug } from "../../../lib/vehicle-details";
import { renderPagePdf } from "../../../lib/render-page-pdf";

export const maxDuration = 300;

function safeFilename(value: string): string {
  return value.replace(/[^a-z0-9-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 90) || "vehicle";
}

export async function GET(request: NextRequest) {
  const slug = (request.nextUrl.searchParams.get("slug") || "").trim();
  if (!slug) return NextResponse.json({ ok: false, error: "Missing vehicle slug." }, { status: 400 });

  const vehicle = getVehicleBySlug(slug);
  if (!vehicle) return NextResponse.json({ ok: false, error: "Vehicle not found." }, { status: 404 });

  try {
    const pdf = await renderPagePdf(`/vehicles/${encodeURIComponent(slug)}/specification`, request.url);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="HainaAuto-Specification-${safeFilename(slug)}.pdf"`,
        "Content-Length": String(pdf.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(`[vehicle-specification-pdf] render failed for ${slug}:`, error);
    return NextResponse.json({ ok: false, error: "Specification PDF generation failed. Please try again shortly." }, { status: 500 });
  }
}
