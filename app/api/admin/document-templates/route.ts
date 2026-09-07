import { guardAdminRequest } from "../../../../lib/security/admin";
import { listTemplates, saveTemplate } from "../../../../lib/documents/store";
import { DOCUMENT_TYPES, DOCUMENT_LANGUAGES, EMPTY_MAPPING, DocumentError, type DocumentType, type DocumentLanguage } from "../../../../lib/documents/types";
import { documentFailure } from "../../../../lib/documents/http";
import { readRequestBytes } from "../../../../lib/security/request-body";

export const runtime = "nodejs";
export const maxDuration = 120;
export async function GET(request: Request) {
  const denied = await guardAdminRequest(request); if (denied) return denied;
  try { return Response.json({ ok: true, templates: await listTemplates() }, { headers: { "Cache-Control": "private, no-store" } }); } catch (error) { return documentFailure(error); }
}
export async function POST(request: Request) {
  const denied = await guardAdminRequest(request); if (denied) return denied;
  try {
    // Stay below the hosting platform's request-body limit.
    if (Number(request.headers.get("content-length")) > 4 * 1024 * 1024) throw new DocumentError("Upload a PDF smaller than 4 MB.", 413);
    let bytes: Buffer;
    try { bytes = await readRequestBytes(request, 4 * 1024 * 1024); } catch { throw new DocumentError("Upload a PDF smaller than 4 MB.", 413); }
    const form = await new Response(new Uint8Array(bytes), { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData(); const file = form.get("file"), name = String(form.get("name") ?? "").trim(), type = String(form.get("type")) as DocumentType, language = String(form.get("language")) as DocumentLanguage;
    if (!(file instanceof File) || file.type !== "application/pdf" || !/\.pdf$/i.test(file.name) || file.size > 4 * 1024 * 1024 || !name || !Object.hasOwn(DOCUMENT_TYPES, type) || !Object.hasOwn(DOCUMENT_LANGUAGES, language)) throw new DocumentError("Choose a PDF under 4 MB, template name, document type and language.", 400);
    const template = await saveTemplate({ name, type, language, originalName: file.name.replace(/[^\p{L}\p{N}._ -]/gu, "-"), original: Buffer.from(await file.arrayBuffer()), mapping: structuredClone(EMPTY_MAPPING) });
    return Response.json({ ok: true, template }, { status: 201 });
  } catch (error) { return documentFailure(error); }
}
