import { PDFDocument, PDFDict, PDFName, PDFArray, PDFPage, PDFFont, rgb, pushGraphicsState, popGraphicsState, concatTransformationMatrix, setCharacterSpacing, beginText, endText } from "pdf-lib";
import { DocumentError, type DocumentData, type FieldMapping, type PageInfo, type TemplateMapping } from "./types";
import { bindField, cleanValue, validateMapping } from "./mapping";
import { DocumentFonts, fontVerticalMetrics } from "./fonts";

export const MAX_TEMPLATE_BYTES = 20 * 1024 * 1024;
export async function inspectPdf(bytes: Uint8Array): Promise<PageInfo[]> {
  if (bytes.length > MAX_TEMPLATE_BYTES || bytes.length < 8 || Buffer.from(bytes.subarray(0, 5)).toString() !== "%PDF-") throw new DocumentError("Upload a valid PDF of 20 MB or less.");
  let pdf: PDFDocument;
  try { pdf = await PDFDocument.load(bytes, { updateMetadata: false, throwOnInvalidObject: true }); pdf.getPages(); }
  catch { throw new DocumentError("Unable to load PDF template. Encrypted or damaged PDFs are not supported."); }
  if (pdf.getPageCount() < 1 || pdf.getPageCount() > 60) throw new DocumentError("Templates must contain 1–60 pages.");
  // Inspect parsed objects, including compressed object streams, instead of
  // relying on a raw-file keyword scan.
  const visited = new Set<unknown>();
  const inspect = (object: unknown) => {
    if (visited.has(object)) return;
    visited.add(object);
    if (object instanceof PDFDict) for (const [key, value] of object.entries()) {
      if (["JavaScript", "JS", "AA", "EmbeddedFiles", "EF", "AF", "XFA", "RichMediaContent"].includes(key.decodeText()) || (key.decodeText() === "OpenAction" && !(pdf.context.lookup(value) instanceof PDFArray))) throw new DocumentError("Templates cannot contain scripts, automatic actions, embedded files or XFA forms.");
      if (key.decodeText() === "FT" && String(value) === "/Sig") throw new DocumentError("This PDF has a digital signature. Upload an unsigned master with the authorized visual signature artwork.");
      if (key.decodeText() === "S" && ["/JavaScript", "/Launch", "/SubmitForm", "/ImportData", "/GoToR", "/GoToE", "/Rendition", "/Movie", "/Sound"].includes(String(value))) throw new DocumentError("Unsafe PDF action in template.");
      if (key.decodeText() === "URI") {
        const uri = pdf.context.lookup(value) as { decodeText?: () => string };
        if (!uri?.decodeText || !/^(?:https?:\/\/|mailto:)/i.test(uri.decodeText())) throw new DocumentError("Unsafe link in PDF template.");
      }
      inspect(value);
    }
    if (object instanceof PDFArray) for (const item of object.asArray()) inspect(item);
  };
  for (const [, object] of pdf.context.enumerateIndirectObjects()) inspect(object instanceof PDFDict ? object : (object as { dict?: PDFDict }).dict);
  if (pdf.getForm().getFields().length) throw new DocumentError("Export form fields to a static master PDF before uploading.");
  return pdf.getPages().map(page => {
    const mediaBox = page.getMediaBox(), cropBox = page.getCropBox(), rotation = ((page.getRotation().angle % 360) + 360) % 360;
    if (![0, 90, 180, 270].includes(rotation) || cropBox.width < 50 || cropBox.height < 50 || cropBox.width > 3000 || cropBox.height > 3000) throw new DocumentError("Unsupported PDF page dimensions or rotation.");
    return { width: rotation % 180 ? cropBox.height : cropBox.width, height: rotation % 180 ? cropBox.width : cropBox.height, rotation, mediaBox, cropBox };
  });
}

type FontFor = (character: string) => PDFFont;
const widths = new WeakMap<PDFFont, Map<string, number>>();
function textWidth(text: string, size: number, fontFor: FontFor, spacing: number) {
  return [...text].reduce((sum, c, i) => {
    const font = fontFor(c); let cache = widths.get(font);
    if (!cache) { cache = new Map(); widths.set(font, cache); }
    let width = cache.get(c); if (width == null) { width = font.widthOfTextAtSize(c, 1); cache.set(c, width); }
    return sum + width * size + (i ? spacing : 0);
  }, 0);
}
function wrap(text: string, size: number, field: FieldMapping, fontFor: FontFor): string[] {
  const output: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (!field.wrap) { output.push(paragraph); continue; }
    let line = "";
    // Keep Latin words intact where possible; CJK and oversized words are
    // broken by Unicode code point, never UTF-16 surrogate halves.
    for (const token of paragraph.match(/[^\s\u2e80-\u9fff]+|[\u2e80-\u9fff]|[ \t]+/gu) ?? [""]) {
      if (line && textWidth(line + token, size, fontFor, field.characterSpacing) > field.width) { output.push(line.trimEnd()); line = ""; }
      for (const c of token) {
        if (!line && /\s/.test(c)) continue;
        if (textWidth(line + c, size, fontFor, field.characterSpacing) > field.width && line) { output.push(line); line = ""; }
        line += c;
      }
    }
    output.push(line.trimEnd());
  }
  return output;
}
export function fitText(text: string, field: FieldMapping, fontFor: FontFor) {
  for (let size = field.fontSize; size >= (field.autoShrink ? field.minFontSize : field.fontSize); size = Math.round((size - 0.25) * 100) / 100) {
    const lines = wrap(text, size, field, fontFor);
    const metrics = lineMetrics(text, size, field, fontFor);
    const capacity = Math.min(field.maxLines, Math.floor((field.height - metrics.height) / metrics.advance) + 1);
    const widthFits = lines.every(line => textWidth(line, size, fontFor, field.characterSpacing) <= field.width + 0.01);
    if (widthFits && lines.length <= capacity) return { lines, size, capacity, remaining: [] as string[] };
    if (size <= (field.autoShrink ? field.minFontSize : field.fontSize)) {
      if (!field.overflow || !widthFits || capacity < 1) throw new DocumentError(`“${field.field}” is too long for its mapped area. Enlarge the area or configure a continuation page.`);
      const breakAt = field.kind === "vehicles" ? lines.slice(0, capacity + 1).lastIndexOf("") : capacity;
      if (breakAt < 1) throw new DocumentError("A vehicle row cannot fit without splitting. Enlarge its mapped area.");
      return { lines: lines.slice(0, breakAt), remaining: lines.slice(breakAt).filter((line, index) => index > 0 || line !== ""), size, capacity: breakAt };
    }
  }
  throw new DocumentError(`Unable to fit ${field.field}.`);
}
function lineMetrics(text: string, size: number, field: FieldMapping, fontFor: FontFor) {
  const fonts = new Set([...text].filter(c => c !== "\n").map(fontFor));
  let ascent = size, descent = 0;
  for (const font of fonts) {
    const metrics = fontVerticalMetrics(font, size);
    ascent = Math.max(ascent, metrics.ascent);
    descent = Math.max(descent, metrics.descent);
  }
  return { ascent, height: ascent + descent, advance: Math.max(size * field.lineHeight, ascent + descent) };
}
function beginOverlay(page: PDFPage, info: PageInfo) {
  const { x, y, width: w, height: h } = info.cropBox;
  const matrix = info.rotation === 90 ? [0, 1, -1, 0, x + w, y] : info.rotation === 180 ? [-1, 0, 0, -1, x + w, y + h] : info.rotation === 270 ? [0, -1, 1, 0, x, y + h] : [1, 0, 0, 1, x, y];
  page.pushOperators(pushGraphicsState(), concatTransformationMatrix(...matrix as [number, number, number, number, number, number]));
}
function drawLines(page: PDFPage, info: PageInfo, field: FieldMapping, lines: string[], size: number, fontFor: FontFor) {
  beginOverlay(page, info);
  const metrics = lineMetrics(lines.join("\n"), size, field, fontFor);
  const color = rgb(parseInt(field.color.slice(1, 3), 16) / 255, parseInt(field.color.slice(3, 5), 16) / 255, parseInt(field.color.slice(5, 7), 16) / 255);
  for (let row = 0; row < lines.length; row++) {
    const line = lines[row];
    const width = textWidth(line, size, fontFor, field.characterSpacing);
    let x = field.x + (field.align === "right" ? field.width - width : field.align === "center" ? (field.width - width) / 2 : 0);
    const y = info.height - field.y - metrics.ascent - row * metrics.advance;
    let run = "", current: PDFFont | undefined;
    const flush = () => {
      if (!run || !current) return;
      page.pushOperators(beginText(), setCharacterSpacing(field.characterSpacing), endText());
      page.drawText(run, { x, y, size, font: current, color, lineHeight: size * field.lineHeight });
      x += textWidth(run, size, fontFor, field.characterSpacing) + field.characterSpacing;
      run = "";
    };
    for (const c of line) { const font = fontFor(c); if (font !== current) { flush(); current = font; } run += c; }
    flush();
  }
  page.pushOperators(popGraphicsState());
}
function vehicleText(data: DocumentData, field: FieldMapping): string {
  return data.vehicles.map((item, index) => {
    if (field.text) return bindField(field, { ...data.values, ...item });
    const title = [item.vehicle_year, item.vehicle_brand, item.vehicle_model].map(cleanValue).filter(Boolean).join(" ");
    const details = [item.vin ? `VIN: ${cleanValue(item.vin)}` : "", item.vehicle_color, item.vehicle_condition].map(cleanValue).filter(Boolean).join(" | ");
    const price = item.unit_price && item.vehicle_total ? `${cleanValue(item.quantity)} × ${cleanValue(item.unit_price)} = ${cleanValue(item.vehicle_total)}` : "";
    return [`${index + 1}. ${title}`, details, price].filter(Boolean).join("\n");
  }).join("\n\n");
}
export async function generatePdf(prepared: Uint8Array, mapping: TemplateMapping, data: DocumentData): Promise<Buffer> {
  const pages = await inspectPdf(prepared);
  validateMapping(mapping, pages);
  if (!mapping.reviewed) throw new DocumentError("Review the template field mapping and protected signatures before generating.");
  if (mapping.allowedIncoterms && !mapping.allowedIncoterms.includes(String(data.values.incoterm))) throw new DocumentError(`This template requires ${mapping.allowedIncoterms.join(" or ")} trade terms. Select a matching order or template.`);
  const required = new Set([...mapping.requiredFields, ...mapping.fields.filter(f => f.required).map(f => f.field)]);
  for (const key of required) {
    if (key === "vehicles" ? !data.vehicles.length : key === "vin" ? data.vehicles.some(v => !cleanValue(v.vin)) : !cleanValue(data.values[key])) throw new DocumentError(`${key === "vin" ? "Vehicle VIN" : key.replaceAll("_", " ")} is required for this template.`);
  }
  const pdf = await PDFDocument.load(prepared, { updateMetadata: false });
  const originals = pdf.getPages();
  const bound = (field: FieldMapping) => field.itemIndex != null && !data.vehicles[field.itemIndex] ? "" : field.kind === "vehicles" ? vehicleText(data, field) : bindField(field, { ...data.values, ...(field.itemIndex != null ? data.vehicles[field.itemIndex] : {}) });
  const appendixLabel = data.language === "en" ? "Transmission details" : data.language === "zh" ? "变速箱详情" : data.language === "es-zh" ? "Transmisión / 变速箱详情" : "Detalle de transmisión";
  const appendixRef = data.language === "en" ? "Appendix" : data.language === "zh" ? "附页" : "Anexo";
  const vehicleContext = (field: FieldMapping) => {
    const item = data.vehicles[field.itemIndex ?? 0] ?? data.values;
    return [item.vehicle_year, item.vehicle_brand, item.vehicle_model, item.vin].map(cleanValue).filter(Boolean).join(" · ");
  };
  const fonts = new DocumentFonts(pdf, [mapping.fields.filter(f => f.kind !== "image").map(bound).join("\n"), appendixLabel, appendixRef, "T0123456789 ·", cleanValue(data.values.document_number), ...mapping.fields.map(vehicleContext)].join("\n"));
  const transmissionAppendices = new Map<string, string>();
  const continuations: { before: number; page: PDFPage }[] = [];
  for (const field of mapping.fields) {
    const page = originals[field.page - 1], info = pages[field.page - 1];
    if (field.kind === "image") {
      const bytes = data.images[field.itemIndex ?? 0];
      if (!bytes) { if (field.required) throw new DocumentError("A vehicle image is required for this template."); continue; }
      const image = bytes[0] === 0x89 ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
      const scale = Math.min(field.width / image.width, field.height / image.height);
      beginOverlay(page, info);
      page.drawImage(image, { x: field.x + (field.width - image.width * scale) / 2, y: info.height - field.y - (field.height + image.height * scale) / 2, width: image.width * scale, height: image.height * scale });
      page.pushOperators(popGraphicsState());
      continue;
    }
    if (field.itemIndex != null && !data.vehicles[field.itemIndex]) continue;
    const text = field.kind === "vehicles" ? vehicleText(data, field) : bindField(field, { ...data.values, ...(field.itemIndex != null ? data.vehicles[field.itemIndex] : {}) });
    if (!text) continue;
    const fontFor = await fonts.prepare(text, field);
    let layout: ReturnType<typeof fitText>;
    try {
      layout = fitText(text, field, fontFor);
    } catch (error) {
      // Legacy templates often reserve one short line for a gearbox name.
      // Preserve the full specification on a new unsigned page when that line
      // cannot fit, rather than clipping it or expanding over adjacent artwork.
      if (field.field !== "transmission" || field.overflow || !(error instanceof DocumentError) || !error.message.includes("too long")) throw error;
      const appendixKey = vehicleContext(field) + "\n" + text;
      const existingReference = transmissionAppendices.get(appendixKey);
      const reference = existingReference ?? appendixRef + " T" + (transmissionAppendices.size + 1);
      const referenceFont = await fonts.prepare(reference, field);
      const referenceLayout = fitText(reference, field, referenceFont);
      drawLines(page, info, field, referenceLayout.lines, referenceLayout.size, referenceFont);
      if (existingReference) continue;
      transmissionAppendices.set(appendixKey, reference);
      const appendixInfo: PageInfo = { width: 595, height: 842, rotation: 0, mediaBox: { x: 0, y: 0, width: 595, height: 842 }, cropBox: { x: 0, y: 0, width: 595, height: 842 } };
      const area = { page: 1, x: 40, y: 100, width: 515, height: 682, insertBefore: 1 };
      const body: FieldMapping = { ...field, ...area, fontSize: 11, minFontSize: 11, fontWeight: "normal", color: "#241611", align: "left", wrap: true, lineHeight: 1.4, maxLines: 1000, autoShrink: false, characterSpacing: 0, overflow: area };
      const heading: FieldMapping = { ...body, y: 36, height: 54, fontSize: 14, fontWeight: "bold", maxLines: 3, overflow: undefined };
      const headingText = reference + " · " + appendixLabel;
      const headingFont = await fonts.prepare(headingText, heading);
      const headingLayout = fitText(headingText, heading, headingFont);
      let remaining = [cleanValue(data.values.document_number), vehicleContext(field), text].filter(Boolean).join("\n\n");
      const bodyFont = await fonts.prepare(remaining, body);
      // Keep signed final pages final. Do not copy or draw over their artwork.
      const before = Math.min(originals.length + 1, ...mapping.lockedPages, ...(mapping.protectedRegions.some(r => r.page === originals.length) ? [originals.length] : []));
      while (remaining) {
        if (continuations.length >= 50) throw new DocumentError("Document exceeds the 50-page continuation limit.");
        const continuation = pdf.addPage([595, 842]);
        pdf.removePage(pdf.getPageCount() - 1);
        drawLines(continuation, appendixInfo, heading, headingLayout.lines, headingLayout.size, headingFont);
        const segment = fitText(remaining, body, bodyFont);
        drawLines(continuation, appendixInfo, body, segment.lines, segment.size, bodyFont);
        continuations.push({ before, page: continuation });
        remaining = segment.remaining.join("\n");
      }
      continue;
    }
    drawLines(page, info, field, layout.lines, layout.size, fontFor);
    if (layout.remaining.length && field.overflow) {
      const area = field.overflow;
      const continuationField = { ...field, ...area, maxLines: 1000, fontSize: layout.size, autoShrink: false, overflow: area };
      let remaining = layout.remaining.join("\n");
      // Copy the clean, unsigned original page, not a previously populated page.
      const source = await PDFDocument.load(prepared, { updateMetadata: false });
      while (remaining) {
        if (continuations.length >= 50) throw new DocumentError("Document exceeds the 50-page continuation limit.");
        const [continuation] = await pdf.copyPages(source, [area.page - 1]);
        // Re-bind the continuation page's own fields, so repeated stationery
        // never contains empty customer/totals slots from the clean master.
        for (const other of mapping.fields.filter(f => f.page === area.page && !(f.x < area.x + area.width && f.x + f.width > area.x && f.y < area.y + area.height && f.y + f.height > area.y))) {
          if (other.kind === "image" || other.id === field.id || (other.itemIndex != null && !data.vehicles[other.itemIndex])) continue;
          const value = other.kind === "vehicles" ? vehicleText(data, other) : bindField(other, { ...data.values, ...(other.itemIndex != null ? data.vehicles[other.itemIndex] ?? {} : {}) });
          if (!value) continue;
          const otherFont = await fonts.prepare(value, other);
          const fit = fitText(value, other, otherFont);
          drawLines(continuation, pages[area.page - 1], other, fit.lines, fit.size, otherFont);
        }
        const segment = fitText(remaining, continuationField, fontFor);
        drawLines(continuation, pages[area.page - 1], continuationField, segment.lines, segment.size, fontFor);
        continuations.push({ before: area.insertBefore, page: continuation });
        remaining = segment.remaining.join("\n");
      }
    }
  }
  // Insertion happens after binding, preserving original page references.
  for (const item of continuations) {
    const anchor = originals[item.before - 1];
    pdf.insertPage(anchor ? pdf.getPages().indexOf(anchor) : pdf.getPageCount(), item.page);
  }
  pdf.catalog.delete(PDFName.of("AcroForm"));
  pdf.catalog.delete(PDFName.of("Metadata"));
  pdf.setTitle(""); pdf.setAuthor(""); pdf.setSubject(""); pdf.setKeywords([]);
  return Buffer.from(await pdf.save({ useObjectStreams: true, addDefaultPage: false }));
}
