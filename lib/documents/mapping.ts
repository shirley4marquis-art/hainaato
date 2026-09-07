import { DocumentError, FIELD_NAMES, type DocumentValues, type FieldMapping, type PageInfo, type Rect, type TemplateMapping } from "./types";

export function overlaps(a: Rect, b: Rect): boolean {
  return a.page === b.page && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}
function finite(value: unknown, min: number, max: number): value is number { return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max; }
function rect(value: Rect, pages: PageInfo[]) {
  const page = pages[value?.page - 1];
  if (!Number.isInteger(value?.page) || !page || !finite(value.x, 0, page.width) || !finite(value.y, 0, page.height) || !finite(value.width, 1, page.width) || !finite(value.height, 1, page.height) || value.x + value.width > page.width + 0.01 || value.y + value.height > page.height + 0.01) throw new DocumentError("A field is outside the visible PDF page.");
}
export function validateMapping(input: unknown, pages: PageInfo[]): TemplateMapping {
  if (!input || typeof input !== "object") throw new DocumentError("Template field mapping is missing.");
  const m = input as TemplateMapping;
  if (!Array.isArray(m.fields) || m.fields.length > 500 || !Array.isArray(m.protectedRegions) || m.protectedRegions.length > 200 || !Array.isArray(m.lockedPages) || !Array.isArray(m.requiredFields) || typeof m.reviewed !== "boolean") throw new DocumentError("Invalid template mapping.");
  if (m.lockedPages.some(p => !Number.isInteger(p) || !pages[p - 1])) throw new DocumentError("Invalid protected page.");
  if (m.allowedIncoterms && (!Array.isArray(m.allowedIncoterms) || !m.allowedIncoterms.length || m.allowedIncoterms.some(term => typeof term !== "string" || !/^[A-Z]{3}$/.test(term)))) throw new DocumentError("Invalid template trade terms.");
  for (const p of m.protectedRegions) { rect(p, pages); if (typeof p.label !== "string") throw new DocumentError("Name each protected area."); }
  const validKey = (key: unknown) => typeof key === "string" && (FIELD_NAMES as readonly string[]).includes(key);
  if (m.requiredFields.some(k => !validKey(k))) throw new DocumentError("Unknown required field.");
  const ids = new Set<string>();
  for (const f of m.fields) {
    rect(f, pages);
    if (typeof f.id !== "string" || !f.id || ids.has(f.id) || !validKey(f.field)) throw new DocumentError("Invalid or duplicate template field.");
    ids.add(f.id);
    if (!finite(f.fontSize, 4, 100) || !finite(f.minFontSize, 4, f.fontSize) || !finite(f.lineHeight, 1, 3) || !finite(f.maxLines, 1, 1000) || !finite(f.characterSpacing, -1, 10) || !/^#[0-9a-f]{6}$/i.test(f.color) || !["sans", "serif", "mono"].includes(f.font) || !["normal", "bold"].includes(f.fontWeight) || !["left", "center", "right"].includes(f.align) || ![undefined, "text", "vehicles", "image"].includes(f.kind)) throw new DocumentError(`Invalid text settings for ${f.field}.`);
    if ([f.wrap, f.autoShrink, f.replaceExisting].some(v => typeof v !== "boolean") || (f.replaceImages != null && typeof f.replaceImages !== "boolean") || (f.itemIndex != null && (!Number.isInteger(f.itemIndex) || !finite(f.itemIndex, 0, 99)))) throw new DocumentError("Invalid field options.");
    if (f.text != null && (typeof f.text !== "string" || f.text.length > 30000 || [...f.text.matchAll(/\{\{([^{}]+)\}\}/g)].some(match => !validKey(match[1].trim())))) throw new DocumentError("Unknown placeholder in field text.");
    if (m.lockedPages.includes(f.page) || m.protectedRegions.some(p => overlaps(f, p))) throw new DocumentError(`Field ${f.field} overlaps a protected signature, stamp or page.`);
    if (f.overflow) {
      rect(f.overflow, pages);
      if (!Number.isInteger(f.overflow.insertBefore) || f.overflow.insertBefore < 1 || f.overflow.insertBefore > pages.length + 1 || m.lockedPages.includes(f.overflow.page) || m.protectedRegions.some(p => p.page === f.overflow!.page)) throw new DocumentError("Overflow must use an unsigned continuation page and a valid insertion position.");
    }
  }
  // Intentional overlays belong in one composed field. Separate fields may
  // never silently write over each other.
  for (let i = 0; i < m.fields.length; i++) for (let j = i + 1; j < m.fields.length; j++) if (overlaps(m.fields[i], m.fields[j])) throw new DocumentError(`Fields ${m.fields[i].field} and ${m.fields[j].field} overlap.`);
  return m;
}
export function cleanValue(value: unknown): string {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value !== "string") return "";
  return value.replace(/\{\{[^{}]*\}\}/g, "").replace(/\b(?:undefined|null|NaN)\b|\[object Object\]/g, "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").normalize("NFC");
}
export function bindField(field: FieldMapping, values: DocumentValues): string {
  const value = field.text != null ? field.text.replace(/\{\{([^{}]+)\}\}/g, (_, key: string) => cleanValue(values[key.trim()])) : cleanValue(values[field.field]);
  return cleanValue(value);
}
