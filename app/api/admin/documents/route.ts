import { guardAdminRequest } from "../../../../lib/security/admin";
import { readJsonObject } from "../../../../lib/security/request-body";
import { listDocuments } from "../../../../lib/documents/store";
import { createDocument } from "../../../../lib/documents/service";
import { documentFailure } from "../../../../lib/documents/http";
import { DOCUMENT_TYPES, DOCUMENT_LANGUAGES, DocumentError, type DocumentType, type DocumentLanguage, type DocumentValues } from "../../../../lib/documents/types";
export const runtime = "nodejs";
export const maxDuration = 120;
export async function GET(request: Request) {
  const denied = await guardAdminRequest(request); if (denied) return denied;
  try { return Response.json({ ok: true, documents: await listDocuments(new URL(request.url).searchParams.get("ref") ?? undefined) }, { headers: { "Cache-Control": "private, no-store" } }); } catch (error) { return documentFailure(error); }
}
export async function POST(request: Request) {
  const denied = await guardAdminRequest(request); if (denied) return denied;
  try {
    const b = await readJsonObject(request, 128 * 1024);
    if (typeof b.quoteRef !== "string" || !/^[A-Z0-9-]{1,32}$/.test(b.quoteRef) || typeof b.type !== "string" || !Object.hasOwn(DOCUMENT_TYPES, b.type) || typeof b.language !== "string" || !Object.hasOwn(DOCUMENT_LANGUAGES, b.language) || typeof b.idempotencyKey !== "string" || (b.templateId != null && typeof b.templateId !== "string")) throw new DocumentError("Select an order, document type, language and template.", 400);
    for (const obj of [b.overrides, b.vins]) if (obj != null && (typeof obj !== "object" || Array.isArray(obj) || Object.values(obj).some(v => typeof v !== "string" || v.length > 30000))) throw new DocumentError("Invalid document values.", 400);
    const document = await createDocument({ quoteRef: b.quoteRef, templateId: b.templateId as string | undefined, type: b.type as DocumentType, language: b.language as DocumentLanguage, idempotencyKey: b.idempotencyKey, overrides: b.overrides as DocumentValues | undefined, vins: b.vins as Record<string, string> | undefined });
    return Response.json({ ok: true, document }, { status: 201 });
  } catch (error) { return documentFailure(error); }
}
