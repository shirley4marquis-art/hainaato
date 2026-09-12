import { guardAdminRequest } from "../../../../../../lib/security/admin";
import { getDocument } from "../../../../../../lib/documents/store";
import { documentFailure, pdfResponse } from "../../../../../../lib/documents/http";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdminRequest(request);
  if (denied) return denied;
  try {
    const doc = await getDocument((await params).id);
    return pdfResponse(doc.pdf, doc.filename, true);
  } catch (error) {
    return documentFailure(error);
  }
}
