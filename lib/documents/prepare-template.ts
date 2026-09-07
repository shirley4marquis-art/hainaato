import { readFile } from "node:fs/promises";
import path from "node:path";
import { init, type WrappedPdfiumModule } from "@embedpdf/pdfium";
import { DocumentError, type PageInfo, type Rect, type TemplateMapping } from "./types";
import { inspectPdf } from "./pdf";
import { validateMapping } from "./mapping";

let engine: Promise<WrappedPdfiumModule> | undefined;
async function pdfium() {
  return engine ??= (async () => {
    const binary = await readFile(path.join(process.cwd(), "node_modules/@embedpdf/pdfium/dist/pdfium.wasm"));
    const p = await init({ wasmBinary: binary }); p.PDFiumExt_Init(); return p;
  })().catch(error => { engine = undefined; throw error; });
}
function physical(rect: Rect, page: PageInfo) {
  const b = page.cropBox;
  const point = (x: number, y: number) => page.rotation === 90 ? [b.x + y, b.y + x] : page.rotation === 180 ? [b.x + b.width - x, b.y + y] : page.rotation === 270 ? [b.x + b.width - y, b.y + b.height - x] : [b.x + x, b.y + b.height - y];
  const a = point(rect.x, rect.y), c = point(rect.x + rect.width, rect.y + rect.height);
  return { left: Math.min(a[0], c[0]), bottom: Math.min(a[1], c[1]), right: Math.max(a[0], c[0]), top: Math.max(a[1], c[1]) };
}
export async function prepareTemplate(original: Uint8Array, mapping: TemplateMapping): Promise<Buffer> {
  const pages = await inspectPdf(original);
  validateMapping(mapping, pages);
  if (!mapping.fields.some(f => f.replaceExisting)) return Buffer.from(original);
  const p = await pdfium();
  // All calls after initialization are synchronous. No two requests can
  // interleave handles or heap pointers in the shared WASM instance.
  const memory = p.pdfium.wasmExports;
  const heap = () => (p.pdfium as unknown as { HEAPU8: Uint8Array }).HEAPU8;
  const input = memory.malloc(original.length), bounds = memory.malloc(16);
  heap().set(original, input);
  const doc = p.FPDF_LoadMemDocument(input, original.length, "");
  if (!doc) { memory.free(input); memory.free(bounds); throw new DocumentError("Unable to load PDF template."); }
  try {
    for (let index = 0; index < pages.length; index++) {
      const fields = mapping.fields.filter(f => f.page === index + 1 && f.replaceExisting);
      if (!fields.length) continue;
      const page = p.FPDF_LoadPage(doc, index);
      try {
        for (let i = p.FPDFPage_CountObjects(page) - 1; i >= 0; i--) {
          const object = p.FPDFPage_GetObject(page, i), type = p.FPDFPageObj_GetType(object);
          if (![1, 3, 5].includes(type)) continue; // Keep paths, borders and fills intact.
          if (!p.FPDFPageObj_GetBounds(object, bounds, bounds + 4, bounds + 8, bounds + 12)) throw new DocumentError("Unable to inspect template artwork.");
          const values = new Float32Array(heap().buffer, bounds, 4);
          const [left, bottom, right, top] = Array.from(values);
          for (const f of fields) {
            const area = physical(f, pages[index]);
            const touches = left < area.right && right > area.left && bottom < area.top && top > area.bottom;
            if (!touches || (type === 3 && f.kind !== "image" && !f.replaceImages)) continue;
            // Nested form artwork may mix signatures and text. Fail safely;
            // don't flatten or delete the whole form to clear one value.
            if (type === 5) throw new DocumentError(`Field ${f.field} intersects grouped PDF artwork. Use a blank master or move the field.`);
            if (left < area.left - 1 || right > area.right + 1 || bottom < area.bottom - 1 || top > area.top + 1) throw new DocumentError(`The replacement area ${f.id} on page ${f.page} cuts through existing content. Enlarge it to contain the entire text or image.`);
            if (!p.FPDFPage_RemoveObject(page, object)) throw new DocumentError("Unable to clear existing template text.");
            p.FPDFPageObj_Destroy(object);
            break;
          }
        }
        if (!p.FPDFPage_GenerateContent(page)) throw new DocumentError("Unable to prepare template page.");
      } finally { p.FPDF_ClosePage(page); }
    }
    const writer = p.PDFiumExt_OpenFileWriter();
    try {
      if (!p.PDFiumExt_SaveAsCopy(doc, writer)) throw new DocumentError("Unable to save prepared template.");
      const size = p.PDFiumExt_GetFileWriterSize(writer), output = memory.malloc(size);
      try { p.PDFiumExt_GetFileWriterData(writer, output, size); return Buffer.from(heap().slice(output, output + size)); }
      finally { memory.free(output); }
    } finally { p.PDFiumExt_CloseFileWriter(writer); }
  } finally { p.FPDF_CloseDocument(doc); memory.free(input); memory.free(bounds); }
}
