import { NextRequest, NextResponse } from "next/server";
import { getVehicleBySlug } from "../../../lib/vehicle-details";
import { generateVehicleSpecificationPdf } from "../../../lib/documents/service";
import { DOCUMENT_LANGUAGES, type DocumentLanguage } from "../../../lib/documents/types";
import { documentFailure, pdfResponse } from "../../../lib/documents/http";
import { guardRequest } from "../../../lib/security/http";

export const maxDuration = 300;

function safeFilename(value: string): string {
  return value.replace(/[^a-z0-9-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 90) || "vehicle";
}

export async function GET(request: NextRequest) {
  const limited = await guardRequest(request, { name: "vehicle-specification-pdf", limit: 6, windowSec: 10 * 60, failClosed: true });
  if (limited) return limited;
  const slug = (request.nextUrl.searchParams.get("slug") || "").trim();
  if (!slug) return NextResponse.json({ ok: false, error: "Missing vehicle slug." }, { status: 400 });

  const vehicle = getVehicleBySlug(slug);
  if (!vehicle) return NextResponse.json({ ok: false, error: "Vehicle not found." }, { status: 404 });

  try {
    const lang = request.nextUrl.searchParams.get("language") ?? "es";
    const language: DocumentLanguage = Object.hasOwn(DOCUMENT_LANGUAGES, lang) ? lang as DocumentLanguage : "es";
    const pdf = await generateVehicleSpecificationPdf(vehicle, language);
    return pdfResponse(pdf, `Nindge Automobile-Vehicle-Specification-${safeFilename(slug)}-${language.toUpperCase()}.pdf`, true);
  } catch (error) {
    return documentFailure(error);
  }
}
