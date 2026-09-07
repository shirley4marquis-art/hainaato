import { DocumentError } from "./types";
export function documentFailure(error: unknown): Response {
  if (error instanceof DocumentError) return Response.json({ ok: false, error: error.message }, { status: error.status });
  const code = (error as { code?: string })?.code;
  // Log identifiers/codes only, never PDFs, customer snapshots or SQL values.
  console.error("[documents] operation failed", { code, name: error instanceof Error ? error.name : "Unknown" });
  if (code === "42P01") return Response.json({ ok: false, error: "Document storage needs migration 202609070001_document_templates.sql." }, { status: 503 });
  return Response.json({ ok: false, error: "Unable to generate or save document. Please retry." }, { status: 500 });
}
export function pdfResponse(pdf: Buffer, filename: string, download = false) {
  let offset = 0;
  const stream = new ReadableStream<Uint8Array>({ pull(controller) {
    if (offset >= pdf.length) { controller.close(); return; }
    controller.enqueue(new Uint8Array(pdf.subarray(offset, offset + 65536))); offset += 65536;
  } });
  return new Response(stream, { headers: { "Content-Type": "application/pdf", "Content-Length": String(pdf.length), "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename.replace(/[^a-z0-9._-]/gi, "-")}"`, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" } });
}
