import { randomUUID } from "node:crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { imagePath, type Vehicle } from "../format";
import { adminGetQuote, type AdminQuoteDetail } from "../crm";
import { getVehicleIndexEntryBySlug } from "../vehicles";
import { pdfOrigin } from "../security/generation";
import { documentData } from "./data";
import { generatePdf } from "./pdf";
import { optimizeDocumentPhoto } from "./photo";
import { appendQuotationGallery, loadQuotationPhotos } from "./quotation-gallery";
import { defaultTemplate, documentFilename, documentPool, generatedMetadata, getTemplate, nextDocumentNumber } from "./store";
import { DocumentError, FIELD_NAMES, type DocumentLanguage, type DocumentType, type DocumentValues, type TemplateFile } from "./types";

async function catalogueImage(source?: string): Promise<Buffer | null> {
  if (!source || !/^\/(?:api\/vehicle-image|vehicle-images)\/[^?\\]+$/.test(source) || source.includes("..")) return null;
  try {
    const internalSecret = process.env.INTERNAL_PDF_SECRET;
    const response = await fetch(new URL(source, pdfOrigin("http://localhost:3000")), {
      redirect: "error",
      headers: internalSecret ? { "x-internal-pdf-secret": internalSecret } : undefined,
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok || Number(response.headers.get("content-length")) > 10 * 1024 * 1024) return null;
    const reader = response.body!.getReader(), chunks: Uint8Array[] = []; let size = 0;
    try { while (true) { const next = await reader.read(); if (next.done) break; size += next.value.length; if (size > 10 * 1024 * 1024) return null; chunks.push(next.value); } } finally { await reader.cancel(); }
    return await optimizeDocumentPhoto(Buffer.concat(chunks));
  } catch { return null; }
}

async function appendSpecificationPhotoPage(pdf: Uint8Array, photos: Buffer[], title: string): Promise<Buffer> {
  const document = await PDFDocument.load(pdf);
  const page = document.addPage([595.28, 841.89]);
  const headingFont = await document.embedFont(StandardFonts.HelveticaBold);
  const labelFont = await document.embedFont(StandardFonts.Helvetica);
  const { width, height } = page.getSize();
  const margin = 42;
  const availableHeight = height - 144;
  const slotHeight = availableHeight / photos.length;

  page.drawRectangle({ x: 0, y: height - 76, width, height: 76, color: rgb(0.04, 0.12, 0.22) });
  page.drawText(title, { x: margin, y: height - 48, size: 18, font: headingFont, color: rgb(1, 1, 1) });

  for (const [index, bytes] of photos.entries()) {
    const image = bytes[0] === 0x89 ? await document.embedPng(bytes) : await document.embedJpg(bytes);
    const maxWidth = width - margin * 2;
    const maxHeight = slotHeight - 28;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
    const imageWidth = image.width * scale;
    const imageHeight = image.height * scale;
    const top = height - 96 - index * slotHeight;
    const y = top - imageHeight;

    page.drawRectangle({
      x: margin,
      y: top - maxHeight,
      width: maxWidth,
      height: maxHeight,
      borderColor: rgb(0.85, 0.87, 0.9),
      borderWidth: 0.5,
    });
    page.drawImage(image, { x: (width - imageWidth) / 2, y: y - (maxHeight - imageHeight) / 2, width: imageWidth, height: imageHeight });
    page.drawText(`${index + 1}`, { x: margin, y: top - maxHeight - 14, size: 8, font: labelFont, color: rgb(0.4, 0.45, 0.52) });
  }

  return Buffer.from(await document.save());
}

async function build(quoteRef: string, template: TemplateFile, number: string, overrides: DocumentValues, vins: Record<string, string>, existingQuote?: AdminQuoteDetail) {
  const quote = existingQuote ?? await adminGetQuote(quoteRef);
  if (!quote) throw new DocumentError("Quotation not found.", 404);
  const data = documentData(quote, template.type, template.language, number, overrides, vins);
  if (template.mapping.fields.some(f => f.kind === "image")) {
    const indexes = new Set(template.mapping.fields.filter(f => f.kind === "image").map(f => f.itemIndex ?? 0));
    const cache = new Map<string, Buffer | null>();
    for (let i = 0; i < quote.items.length; i++) {
      const source = quote.items[i].photos?.[0]?.url;
      if (!indexes.has(i) || !source) { data.images.push(null); continue; }
      if (!cache.has(source)) cache.set(source, await catalogueImage(source));
      data.images.push(cache.get(source) ?? null);
    }
  }
  const galleries = template.type === "quotation" ? await loadQuotationPhotos(quote.items, catalogueImage) : null;
  const base = await generatePdf(template.prepared, template.mapping, data);
  return { pdf: galleries ? await appendQuotationGallery(base, data, galleries) : base, data };
}
export async function generateQuoteTemplatePdf(ref: string): Promise<Buffer> {
  const quote = await adminGetQuote(ref);
  if (!quote) throw new DocumentError("Quotation not found.", 404);
  const template = await defaultTemplate("quotation", quote.language);
  return (await build(ref, template, quote.documentNumber ?? ref, {}, {}, quote)).pdf;
}
export async function generateVehicleSpecificationPdf(vehicle: Vehicle, language: DocumentLanguage) {
  const template = await defaultTemplate("specification", language);
  const values: DocumentValues = Object.fromEntries(FIELD_NAMES.map(key => [key, ""]));
  const index = getVehicleIndexEntryBySlug(vehicle.slug);
  Object.assign(values, { document_number: `HA-SP-${vehicle.id}`, vehicle_brand: index?.brand ?? "", vehicle_model: index?.model ?? vehicle.title, vehicle_year: vehicle.year ?? "", vehicle_color: vehicle.color ?? "", fuel: vehicle.fuel ?? "", transmission: vehicle.gearbox ?? "", mileage: vehicle.mileageKm ?? "", engine: vehicle.specs.Displacement ?? vehicle.specs.Engine ?? "", quantity: 1, company_name: "NINDGE AUTOMOBILE", company_email: "info@nindgeauto.com", vehicle_summary: vehicle.title, notes: Object.entries(vehicle.specs).filter(([key,value]) => value && !/price|precio|seller|selling|margin|profit|adjustment|cost|价格|成本|利润/i.test(key)).map(([key, value]) => `${key}: ${value}`).join("\n") });
  const photoSources = vehicle.images.slice(0, 3).map(file => imagePath(vehicle.site, vehicle.id, file));
  const photos = (await Promise.all(photoSources.map(catalogueImage))).filter((photo): photo is Buffer => photo !== null);
  const hasMappedImage = template.mapping.fields.some(field => field.kind === "image");
  const pdf = await generatePdf(template.prepared, template.mapping, {
    values,
    vehicles: [values],
    images: hasMappedImage ? [photos[0] ?? null] : [],
    language,
  });

  if (photos.length === 0) return pdf;
  return appendSpecificationPhotoPage(pdf, photos, language === "en" ? "VEHICLE PHOTOS" : "FOTOGRAFIAS DEL VEHICULO");
}
export async function createDocument(input: { quoteRef: string; templateId?: string; type: DocumentType; language: DocumentLanguage; idempotencyKey: string; overrides?: DocumentValues; vins?: Record<string, string> }) {
  if (!/^[a-f0-9-]{36}$/i.test(input.idempotencyKey)) throw new DocumentError("Invalid generation request ID.", 400);
  const template = input.templateId ? await getTemplate(input.templateId) : await defaultTemplate(input.type, input.language);
  if (!template.active || !template.mapping.reviewed || template.type !== input.type || template.language !== input.language) throw new DocumentError("Select an active, reviewed template matching the document type and language.");
  const client = await documentPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`document:${input.idempotencyKey}`]);
    const existing = (await client.query("SELECT * FROM generated_documents WHERE idempotency_key=$1", [input.idempotencyKey])).rows[0];
    if (existing) {
      if (existing.quote_ref !== input.quoteRef || existing.template_id !== template.id) throw new DocumentError("Generation request ID was already used for a different document.", 409);
      await client.query("COMMIT"); return generatedMetadata(existing);
    }
    const number = await nextDocumentNumber(client, input.type);
    const { pdf, data } = await build(input.quoteRef, template, number, input.overrides ?? {}, input.vins ?? {});
    const id = randomUUID(), filename = documentFilename(input.type, number, input.language);
    const { rows } = await client.query(`INSERT INTO generated_documents(id,idempotency_key,document_number,document_type,language,quote_ref,template_id,filename,pdf,input_snapshot)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, [id, input.idempotencyKey, number, input.type, input.language, input.quoteRef, template.id, filename, pdf, JSON.stringify({ values: data.values, vehicles: data.vehicles })]);
    await client.query("COMMIT"); return generatedMetadata(rows[0]);
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}
