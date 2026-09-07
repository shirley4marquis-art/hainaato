import { createHash } from "node:crypto";
import { PDFDocument, rgb } from "pdf-lib";
import type { AdminQuoteDetail } from "../crm";
import { imagePath } from "../format";
import { getVehicleBySlug } from "../vehicle-details";
import { generatePdf } from "./pdf";
import { DocumentError, EMPTY_MAPPING, defaultField, type DocumentData, type FieldMapping } from "./types";

type Item = AdminQuoteDetail["items"][number];
export function quotationPhotoSources(item: Item): string[] {
  const sources = (item.photos ?? []).map(photo => photo.url);
  // Only supplement from an explicitly linked catalogue vehicle; never guess by model.
  const slug = item.historyNotes?.match(/https:\/\/(?:www\.)?(?:nindgeauto\.com|hainautocn\.com)\/vehicles\/([a-z0-9-]+)/i)?.[1];
  const vehicle = slug ? getVehicleBySlug(slug) : null;
  if (vehicle) sources.push(...vehicle.images.map(file => imagePath(vehicle.site, vehicle.id, file)));
  return [...new Set(sources)].filter(source => !/(?:logo|qrcode|certificate|invoice)/i.test(source));
}
export async function loadQuotationPhotos(items: Item[], load: (source: string) => Promise<Buffer | null>) {
  const cache = new Map<string, Promise<Buffer | null>>();
  const galleries: Buffer[][] = [];
  for (const item of items) {
    const photos: Buffer[] = [], hashes = new Set<string>();
    const sources = quotationPhotoSources(item).slice(0, 20);
    for (let start = 0; start < sources.length && photos.length < 3; start += 3) {
      const batch = await Promise.all(sources.slice(start, start + 3).map(source => {
        if (!cache.has(source)) cache.set(source, load(source));
        return cache.get(source)!;
      }));
      for (const bytes of batch) {
        if (!bytes) continue;
        const hash = createHash("sha256").update(bytes).digest("hex");
        if (!hashes.has(hash)) { hashes.add(hash); photos.push(bytes); }
        if (photos.length === 3) break;
      }
    }
    if (photos.length < 3) throw new DocumentError(`Add at least 3 distinct, accessible vehicle photos for ${item.make} ${item.model} before generating the quotation (${photos.length} available).`);
    galleries.push(photos);
  }
  return galleries;
}
export async function appendQuotationGallery(base: Uint8Array, data: DocumentData, galleries: Uint8Array[][]): Promise<Buffer> {
  const source = await PDFDocument.load(base), gallery = await PDFDocument.create();
  const first = source.getPage(0), { width, height } = first.getSize();
  const header = await gallery.embedPage(first, { left: 0, bottom: height - 159, right: width, top: height });
  const footer = await gallery.embedPage(first, { left: 0, bottom: 0, right: width, top: height - 775 });
  const fields: FieldMapping[] = [], images: Uint8Array[] = [];
  const tr = (es: string, en: string, zh: string) => data.language === "en" ? en : data.language === "zh" ? zh : data.language === "es-zh" ? `${es} / ${zh}` : es;
  galleries.forEach((photos, index) => {
    if (photos.length < 3) throw new DocumentError("Quotation galleries require three photos per vehicle.");
    const page = gallery.addPage([width, height]), pageNumber = index + 1;
    page.drawPage(header, { x: 0, y: height - 159, width, height: 159 });
    page.drawPage(footer, { x: 0, y: 0, width, height: height - 775 });
    page.drawRectangle({ x: 34.3, y: height - 192, width: 515.9, height: 22, color: rgb(.04, .12, .22) });
    const label = (text: string, y: number, extra: Partial<FieldMapping> = {}) => fields.push({ ...defaultField(pageNumber), id: `gallery-${fields.length}`, field: "notes", text, x: 39, y, width: 508, height: 18, maxLines: 1, ...extra });
    label(tr("FOTOGRAFÍAS DEL VEHÍCULO", "VEHICLE PHOTOGRAPHS", "车辆实拍图片"), 174, { color: "#ffffff", fontWeight: "bold" });
    const v = data.vehicles[index];
    label([v.vehicle_year, v.vehicle_brand, v.vehicle_model, v.vehicle_color].filter(Boolean).join(" · "), 200, { fontWeight: "bold", fontSize: 11 });
    photos.slice(0, 3).forEach((photo, photoIndex) => {
      const y = 230 + photoIndex * 174;
      page.drawRectangle({ x: 39, y: height - y - 148, width: 508, height: 148, borderColor: rgb(.85, .87, .90), borderWidth: .5 });
      fields.push({ ...defaultField(pageNumber), id: `gallery-${fields.length}`, field: "vehicle_image", kind: "image", itemIndex: images.length, x: 41, y: y + 2, width: 504, height: 144 });
      images.push(photo);
      label(tr(`Foto ${photoIndex + 1}`, `Photo ${photoIndex + 1}`, `图片 ${photoIndex + 1}`), y + 151, { fontSize: 8, color: "#748095" });
    });
  });
  const rendered = await PDFDocument.load(await generatePdf(await gallery.save(), { ...EMPTY_MAPPING, reviewed: true, fields }, { ...data, images }));
  for (const page of await source.copyPages(rendered, rendered.getPageIndices())) source.addPage(page);
  return Buffer.from(await source.save());
}
