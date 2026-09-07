import { guardAdminRequest } from "../../../../../lib/security/admin";
import { getTemplate, saveTemplate, setTemplateActive } from "../../../../../lib/documents/store";
import { documentFailure, pdfResponse } from "../../../../../lib/documents/http";
import { readJsonObject } from "../../../../../lib/security/request-body";
import { validateMapping } from "../../../../../lib/documents/mapping";
export const runtime = "nodejs";
export const maxDuration = 120;
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdminRequest(request); if (denied) return denied;
  try {
    const t = await getTemplate((await params).id), mode = new URL(request.url).searchParams.get("file");
    if (mode) return pdfResponse(mode === "original" ? t.original : t.prepared, `HainaAuto-Template-${t.id}.pdf`);
    const { original: _original, prepared: _prepared, ...template } = t;
    void _original; void _prepared;
    return Response.json({ ok: true, template }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return documentFailure(error); }
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdminRequest(request); if (denied) return denied;
  try {
    const t = await getTemplate((await params).id), body = await readJsonObject(request, 512 * 1024);
    if (body.action === "deactivate") { await setTemplateActive(t.id, false); return Response.json({ ok: true }); }
    const mapping = validateMapping(body.mapping, t.pages);
    const template = await saveTemplate({ name: t.name, type: t.type, language: t.language, originalName: t.originalName, original: t.original, mapping, previousId: t.id, activate: body.activate === true });
    return Response.json({ ok: true, template });
  } catch (error) { return documentFailure(error); }
}
