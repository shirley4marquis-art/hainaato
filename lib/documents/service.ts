import { randomUUID } from "node:crypto";
import { imagePath, type Vehicle } from "../format";
import { adminGetQuote, type AdminQuoteDetail } from "../crm";
import { getVehicleIndexEntryBySlug } from "../vehicles";
import { pdfOrigin } from "../security/generation";
import { documentData } from "./data";
import { generateQuotationLayout, publicSpecificationNotes } from "./quotation-layout";
import { getVehicleBySlug } from "../vehicle-details";
import { generatePdf } from "./pdf";
import { cleanValue } from "./mapping";
import { optimizeDocumentPhoto } from "./photo";
import { loadQuotationPhotos } from "./quotation-gallery";
import { defaultTemplate, documentFilename, documentPool, generatedMetadata, getTemplate, nextDocumentNumber } from "./store";
import { DocumentError, FIELD_NAMES, type DocumentLanguage, type DocumentType, type DocumentValues, type TemplateFile } from "./types";

async function catalogueImage(source?: string): Promise<Buffer | null> {
  if (!source || !/^\/(?:api\/vehicle-image|vehicle-images)\/[^?\\]+$/.test(source) || source.includes("..")) return null;
  try {
    const internalSecret = process.env.INTERNAL_PDF_SECRET;
    const response = await fetch(new URL(source, pdfOrigin("http://localhost:3000")), {
      redirect: "error",
      headers: internalSecret ? { "x-internal-pdf-secret": internalSecret } : undefined,
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok || Number(response.headers.get("content-length")) > 10 * 1024 * 1024) return null;
    const reader = response.body!.getReader(), chunks: Uint8Array[] = []; let size = 0;
    try { while (true) { const next = await reader.read(); if (next.done) break; size += next.value.length; if (size > 10 * 1024 * 1024) return null; chunks.push(next.value); } } finally { await reader.cancel(); }
    return await optimizeDocumentPhoto(Buffer.concat(chunks));
  } catch { return null; }
}

async function build(quoteRef: string, template: TemplateFile, number: string, overrides: DocumentValues, vins: Record<string, string>, existingQuote?: AdminQuoteDetail) {
  const quote = existingQuote ?? await adminGetQuote(quoteRef);
  if (!quote) throw new DocumentError("Quotation not found.", 404);
  const data = documentData(quote, template.type, template.language, number, overrides, vins);
  const galleries = template.type === "quotation" ? await loadQuotationPhotos(quote.items, catalogueImage) : null;
  if (galleries) {
    data.images = galleries.map(photos => photos[0]);
  } else if (template.mapping.fields.some(f => f.kind === "image")) {
    const indexes = new Set(template.mapping.fields.filter(f => f.kind === "image").map(f => f.itemIndex ?? 0));
    const cache = new Map<string, Buffer | null>();
    for (let i = 0; i < quote.items.length; i++) {
      const source = quote.items[i].photos?.[0]?.url;
      if (!indexes.has(i) || !source) { data.images.push(null); continue; }
      if (!cache.has(source)) cache.set(source, await catalogueImage(source));
      data.images.push(cache.get(source) ?? null);
    }
  }
  if (galleries) {
    if (template.mapping.allowedIncoterms && !template.mapping.allowedIncoterms.includes(String(data.values.incoterm))) throw new DocumentError("Select a quotation template matching the order trade terms.");
    for (const key of new Set([...template.mapping.requiredFields, ...template.mapping.fields.filter(field => field.required).map(field => field.field)])) {
      if (key === "vehicles" || key === "vehicle_image") continue;
      if (key === "vin" ? data.vehicles.some(vehicle => !cleanValue(vehicle.vin)) : !cleanValue(data.values[key])) throw new DocumentError(key.replaceAll("_", " ") + " is required for this template.");
    }
    data.vehicles.forEach((vehicle, index) => {
      const item = quote.items[index];
      const slug = item.historyNotes?.match(/https:\/\/(?:www\.)?(?:nindgeauto\.com|hainautocn\.com)\/vehicles\/([a-z0-9-]+)/i)?.[1];
      const catalogue = slug ? getVehicleBySlug(slug) : null;
      Object.assign(vehicle, { interior_color: item.interiorColor ?? "", drivetrain: item.drivetrain ?? "", power: item.powerHp ?? "", capacity: item.capacity ?? "", body_type: catalogue?.bodyType ?? "", stock_id: catalogue?.id ?? "" });
      vehicle.notes = [vehicle.notes, catalogue ? publicSpecificationNotes(catalogue.specs) : ""].filter(Boolean).join("\n");
    });
    return { pdf: await generateQuotationLayout(data, galleries), data };
  }
  return { pdf: await generatePdf(template.prepared, template.mapping, data), data };
}
export async function generateQuoteTemplatePdf(ref: string): Promise<Buffer> {
  const quote = await adminGetQuote(ref);
  if (!quote) throw new DocumentError("Quotation not found.", 404);
  const template = await defaultTemplate("quotation", quote.language);
  return (await build(ref, template, quote.documentNumber ?? ref, {}, {}, quote)).pdf;
}
export async function generateVehicleSpecificationPdf(vehicle: Vehicle, language: DocumentLanguage) {
  const values: DocumentValues = Object.fromEntries(FIELD_NAMES.map(key => [key, ""]));
  const index = getVehicleIndexEntryBySlug(vehicle.slug);
  Object.assign(values, { document_number: `HA-SP-${vehicle.id}`, vehicle_brand: index?.brand ?? "", vehicle_model: index?.model ?? vehicle.title, vehicle_year: vehicle.year ?? "", vehicle_color: vehicle.color ?? "", fuel: vehicle.fuel ?? "", transmission: vehicle.gearbox ?? "", mileage: vehicle.mileageKm ?? "", engine: vehicle.specs.Displacement ?? vehicle.specs.Engine ?? "", quantity: 1, company_name: "NINDGE AUTOMOBILE", company_email: "info@nindgeauto.com", vehicle_summary: vehicle.title, notes: Object.entries(vehicle.specs).filter(([key,value]) => value && !/price|precio|seller|selling|margin|profit|adjustment|cost|价格|成本|利润/i.test(key)).map(([key, value]) => `${key}: ${value}`).join("\n") });
  const photoSources = vehicle.images.slice(0, 3).map(file => imagePath(vehicle.site, vehicle.id, file));
  const photos = (await Promise.all(photoSources.map(catalogueImage))).filter((photo): photo is Buffer => photo !== null);
  values.notes = publicSpecificationNotes(vehicle.specs);
  values.drivetrain = vehicle.driveType ?? "";
  values.body_type = vehicle.bodyType ?? "";
  values.stock_id = index?.stockCode ?? vehicle.id;
  values.vehicle_condition = index?.condition === "new" ? (language === "en" ? "New" : language === "zh" ? "新车" : "Nuevo") : index?.condition === "used" ? (language === "en" ? "Used" : language === "zh" ? "二手车" : "Usado") : "";
  return generateQuotationLayout({ values, vehicles: [values], images: [], language }, [photos], true);
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
