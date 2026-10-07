import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { imagePath, type Vehicle } from "../format";
import { adminGetQuote, type AdminQuoteDetail } from "../crm";
import { getVehicleIndexEntryBySlug } from "../vehicles";
import { convertFromCNY } from "../currency";
import { documentData } from "./data";
import { generateQuotationLayout, publicSpecificationNotes } from "./quotation-layout";
import { getVehicleBySlug } from "../vehicle-details";
import { generatePdf } from "./pdf";
import { cleanValue } from "./mapping";
import { optimizeDocumentPhoto } from "./photo";
import { loadQuotationPhotos } from "./quotation-gallery";
import { defaultTemplate, documentFilename, documentPool, generatedMetadata, getTemplate, nextDocumentNumber } from "./store";
import { DocumentError, FIELD_NAMES, type DocumentLanguage, type DocumentType, type DocumentValues, type SpecificationLanguage, type TemplateFile } from "./types";
import { translateSpecificationText, translateVehicleTerm } from "./vehicle-translation";
import { generateOfficialDocument } from "./official-templates";

async function catalogueImage(source?: string): Promise<Buffer | null> {
  if (!source || source.length > 2048) return null;
  try {
    const url = new URL(source, "https://internal.invalid");
    if (url.search || url.hash || (url.origin !== "https://internal.invalid" && !["nindgeauto.com", "www.nindgeauto.com", "hainaauto.vercel.app"].includes(url.hostname))) return null;
    const match = url.pathname.match(/^\/(?:api\/vehicle-image|vehicle-images)\/([^/]+)\/([^/]+)\/([^/]+)$/);
    if (!match) return null;
    const [, rawSite, rawId, rawFile] = match;
    const site = decodeURIComponent(rawSite), id = decodeURIComponent(rawId), file = decodeURIComponent(rawFile);
    if ([site, id, file].some(part => !part || part === "." || part === ".." || /[\\/\0]/.test(part))) return null;
    const vehicle = getVehicleBySlug(`${site}-${id}`);
    if (!vehicle || !vehicle.images.includes(file)) return null;

    let original: Buffer;
    const staticDirectory = path.resolve(process.cwd(), "public", "vehicle-images");
    if (url.pathname.startsWith("/vehicle-images/") || (site === "hainaauto" && id.startsWith("manual-"))) {
      const localPath = path.resolve(staticDirectory, site, id, file);
      if (!localPath.startsWith(staticDirectory + path.sep)) return null;
      original = await readFile(localPath);
    } else {
      let upstream: string;
      if (site === "hainaauto") upstream = `https://img.hainaauto.com/vehicle/${encodeURIComponent(file)}`;
      else if (site === "cntransit") upstream = `https://cntransit.cn/uploads/${encodeURIComponent(file)}`;
      else return null;
      const response = await fetch(upstream, { redirect: "error", signal: AbortSignal.timeout(30000), headers: { "user-agent": "NindgeAutomobile-PDF/1.0", accept: "image/*" } });
      if (!response.ok || !response.headers.get("content-type")?.toLowerCase().startsWith("image/")) return null;
      const declaredSize = Number(response.headers.get("content-length"));
      if (Number.isFinite(declaredSize) && declaredSize > 10 * 1024 * 1024) return null;
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length || bytes.length > 10 * 1024 * 1024) return null;
      original = bytes;
    }
    return await optimizeDocumentPhoto(original);
  } catch { return null; }
}

function linkedCatalogueVehicle(item: AdminQuoteDetail["items"][number]) {
  const source = item.photos?.[0]?.url ?? "";
  const match = source.match(/^\/(?:api\/vehicle-image|vehicle-images)\/([^/]+)\/([^/]+)\//);
  let photoSlug = "";
  try { if (match) photoSlug = `${decodeURIComponent(match[1])}-${decodeURIComponent(match[2])}`; } catch { /* Ignore malformed saved image paths. */ }
  const historySlug = item.historyNotes?.match(/https:\/\/(?:www\.)?(?:nindgeauto\.com|hainautocn\.com)\/vehicles\/([a-z0-9-]+)/i)?.[1] ?? "";
  return getVehicleBySlug(photoSlug || historySlug);
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
      const catalogue = linkedCatalogueVehicle(item);
      const indexEntry = catalogue ? getVehicleIndexEntryBySlug(catalogue.slug) : null;
      Object.assign(vehicle, { interior_color: item.interiorColor ?? "", drivetrain: item.drivetrain ?? "", power: item.powerHp ?? "", capacity: item.capacity ?? "", body_type: catalogue?.bodyType ?? "", stock_id: indexEntry?.stockCode ?? catalogue?.id ?? "" });
      vehicle.notes = [vehicle.notes, catalogue ? publicSpecificationNotes(catalogue.specs, template.language) : ""].filter(Boolean).join("\n");
    });
    return { pdf: await generateQuotationLayout(data, galleries), data };
  }
  return { pdf: await generatePdf(template.prepared, template.mapping, data), data };
}
export async function generateQuoteTemplatePdf(ref: string, selectedLanguage?: DocumentLanguage): Promise<Buffer> {
  const quote = await adminGetQuote(ref);
  if (!quote) throw new DocumentError("Quotation not found.", 404);
  const language = selectedLanguage ?? quote.language;
  const data = documentData(quote, "quotation", language, quote.documentNumber ?? ref);
  const galleries = await loadQuotationPhotos(quote.items, catalogueImage);
  data.images = galleries.map(photos => photos[0]);
  for (let index = 0; index < quote.items.length; index++) {
    const item = quote.items[index];
    const vehicle = linkedCatalogueVehicle(item);
    if (!vehicle) {
      data.vehicles[index].notes = translateSpecificationText(String(data.vehicles[index].notes ?? ""), language);
      continue;
    }
    const indexEntry = getVehicleIndexEntryBySlug(vehicle.slug);
    const facts = publicSpecificationNotes(vehicle.specs, language);
    Object.assign(data.vehicles[index], {
      interior_color: translateVehicleTerm(item.interiorColor ?? vehicle.specs["Interior Color"] ?? "", language),
      drivetrain: translateVehicleTerm(item.drivetrain ?? vehicle.driveType ?? "", language),
      power: item.powerHp ?? vehicle.specs["Maximum Power"] ?? vehicle.specs.Horsepower ?? "",
      capacity: item.capacity ?? vehicle.specs.Capacity ?? vehicle.specs["Capacity (people/seats)"] ?? "",
      body_type: vehicle.bodyType ?? "",
      stock_id: indexEntry?.stockCode ?? vehicle.id,
      unit_price: quote.source === "cart-checkout-cif-estimate-v2" && !/\bFOB\b/i.test(String(data.vehicles[index].unit_price ?? "")) ? `${String(data.vehicles[index].unit_price ?? "")} FOB` : data.vehicles[index].unit_price,
      notes: facts,
    });
  }
  if (language === "en" && quote.items.length === 1) {
    const item = data.vehicles[0];
    const source = quote.items[0];
    const indexEntry = linkedCatalogueVehicle(source);
    const stockId = indexEntry ? getVehicleIndexEntryBySlug(indexEntry.slug)?.stockCode : undefined;
    const priceText = String(item.unit_price ?? "").replace(/^[A-Z]{3}\s*/, "").replace(/\s+(?:FOB|CIF|CFR)$/i, "");
    Object.assign(data.values, {
      buyer_address: [quote.customer.address, quote.customer.city, quote.customer.country].filter(Boolean).join(", ") || quote.customer.country || "—",
      buyer_email: quote.customer.email || "—", buyer_phone: quote.customer.phone || "—",
      loading_port: "To be confirmed", stock_id: stockId ?? indexEntry?.id ?? "—",
      vehicle_summary: [item.vehicle_year, item.vehicle_brand, item.vehicle_model].map(cleanValue).filter(Boolean).join(" "),
      vehicle_details: [item.vehicle_color, item.fuel, item.mileage ? `${item.mileage} km` : ""].map(cleanValue).filter(Boolean).join(" · ") || "See confirmed vehicle record",
      stock_summary: stockId ?? indexEntry?.id ?? "—", quantity_summary: item.quantity ?? 1,
      price_summary: priceText || "—", steering: "See vehicle specification",
      transmission: item.transmission || "See vehicle specification",
    });
    data.images = (galleries[0] ?? []).slice(0, 3);
    return generateOfficialDocument("quotation", data);
  }
  return generateQuotationLayout(data, galleries);
}
export async function generateVehicleSpecificationPdf(vehicle: Vehicle, language: SpecificationLanguage) {
  const values: DocumentValues = Object.fromEntries(FIELD_NAMES.map(key => [key, ""]));
  const index = getVehicleIndexEntryBySlug(vehicle.slug);
  const locale = language === "en" ? "en-US" : language === "zh" ? "zh-CN" : language === "ru" ? "ru-RU" : "es-ES";
  const currency = new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const fobLabel = language === "ru" ? " FOB Китай" : " FOB China";
  Object.assign(values, { document_number: `HA-SP-${vehicle.id}`, issue_date: new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date()), units: language === "ru" ? "Метрическая система (СИ)" : language === "zh" ? "公制（SI）" : language === "es" ? "Métrico (SI)" : "Metric (SI)", vehicle_brand: index?.brand ?? "", vehicle_model: index?.model ?? vehicle.title, vehicle_year: vehicle.year ?? "", vehicle_color: translateVehicleTerm(vehicle.color ?? "", language), fuel: translateVehicleTerm(vehicle.fuel ?? "", language), transmission: translateVehicleTerm(vehicle.gearbox ?? "", language), mileage: vehicle.mileageKm ?? "", engine: vehicle.specs.Displacement ?? vehicle.specs.Engine ?? "", quantity: 1, company_name: "NINDGE AUTOMOBILE", company_email: "info@nindgeauto.com", vehicle_summary: vehicle.title, notes: publicSpecificationNotes(vehicle.specs, language), unit_price: vehicle.priceCNY == null ? "" : `${currency.format(convertFromCNY(vehicle.priceCNY, "USD"))}${fobLabel}`, interior_color: translateVehicleTerm(vehicle.specs["Interior Color"] ?? "", language), drivetrain: translateVehicleTerm(vehicle.driveType ?? "", language), power: vehicle.specs["Maximum Power"] ?? vehicle.specs.Horsepower ?? "", capacity: vehicle.specs.Capacity ?? vehicle.specs["Capacity (people/seats)"] ?? "", body_type: translateVehicleTerm(vehicle.bodyType ?? "", language), stock_id: index?.stockCode ?? vehicle.id });
  const photoSources = vehicle.images.slice(0, 3).map(file => imagePath(vehicle.site, vehicle.id, file));
  const photos = (await Promise.all(photoSources.map(catalogueImage))).filter((photo): photo is Buffer => photo !== null);
  if (!photos.length) throw new DocumentError(`Vehicle photos for ${vehicle.title} are temporarily unavailable. Please try again shortly.`, 503);
  values.vehicle_condition = index?.condition ? translateVehicleTerm(index.condition, language) : "";
  if (language === "en") {
    const specs = vehicle.specs;
    const spec = (...keys: string[]) => keys.map(key => specs[key]).find(value => value != null && String(value).trim()) ?? "Not stated";
    const date = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(new Date());
    const availability = index?.availability === "sold" ? "Sold" : index?.availability === "reserved" ? "Reserved" : "Available";
    Object.assign(values, {
      issue_date: date, attached_to: "—", units: "Metric (SI)", stock_id: index?.stockCode ?? vehicle.id,
      vehicle_condition: availability, interior_color: translateVehicleTerm(specs["Interior Color"] ?? "Not stated", language),
      body_type: vehicle.bodyType ?? "Not stated", doors_seats: `${spec("Doors", "Door count")} / ${spec("Seats", "Seating capacity", "Capacity (people/seats)", "Capacity")}`,
      steering: spec("Steering", "Steering position", "Direction"), fuel: translateVehicleTerm(vehicle.fuel ?? "Not stated", language),
      engine: spec("Displacement", "Engine", "Motor"), power: spec("Maximum Power", "Power", "Horsepower", "Potencia"),
      transmission: translateVehicleTerm(vehicle.gearbox ?? "Not stated", language), drivetrain: spec("Drive type", "Drivetrain", "Tracción") === "Not stated" ? vehicle.driveType ?? "Not stated" : spec("Drive type", "Drivetrain", "Tracción"),
      emissions: spec("Emission standard", "Emissions", "Emission"), battery_range: spec("Battery / range", "Battery capacity", "Range", "Battery range"),
      mileage: vehicle.mileageKm == null ? "Not recorded" : `${vehicle.mileageKm.toLocaleString("en-US")} km, as displayed and accepted by the buyer`,
      first_registration: spec("First registration", "Registration date"), ownership_history: spec("Use / owners", "Ownership history"),
      keys_books: spec("Keys / books", "Keys", "Service book"), condition_note: spec("Condition note", "Condition"),
      inspection_status: spec("Inspection", "PDI status"), length_width_height: spec("Dimensions", "Length / width / height"),
      wheelbase: spec("Wheelbase", "Wheelbase (mm)"), curb_weight: spec("Curb weight", "Weight"),
      packed_volume: spec("Packed volume", "Volume"), preferred_lifting: "To be confirmed with the shipping agent",
      loading_port: "To be confirmed with buyer", export_photo_status: `${photos.length} listing photo(s) attached; PDI date to confirm`,
      export_licence_status: "Applied for after deposit clearance", deregistration_status: index?.condition === "used" ? "Certificate required before shipment" : "Not applicable to this new vehicle",
      destination_rules: "Buyer to confirm age, steering and emissions requirements",
    });
    return generateOfficialDocument("specification", { values, vehicles: [values], images: photos.slice(0, 3), language });
  }
  return generateQuotationLayout({ values, vehicles: [values], images: photos, language }, [photos], true);
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
