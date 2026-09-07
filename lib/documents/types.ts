export const DOCUMENT_TYPES = {
  quotation: "Quotation", proforma: "Proforma Invoice", invoice: "Commercial Invoice",
  specification: "Vehicle Specification", contract: "Purchase Contract", importation_terms: "Importation Terms",
  inspection: "Vehicle Inspection Report", acquisition: "Vehicle Acquisition / Supply Chain Statement",
  export: "Export Documents", customs: "Customs Documents", other: "Other Company Document",
} as const;
export type DocumentType = keyof typeof DOCUMENT_TYPES;
export const DOCUMENT_LANGUAGES = { es: "Español", zh: "中文", en: "English", "es-zh": "Español + 中文" } as const;
export type DocumentLanguage = keyof typeof DOCUMENT_LANGUAGES;
export const FIELD_NAMES = ["document_number", "quotation_number", "contract_number", "invoice_number", "issue_date", "expiry_date", "buyer_name", "buyer_company", "buyer_email", "buyer_phone", "buyer_address", "buyer_country", "destination_country", "destination_port", "incoterm", "currency", "vehicle_brand", "vehicle_model", "vehicle_year", "vehicle_condition", "vehicle_color", "vin", "engine", "fuel", "transmission", "mileage", "quantity", "unit_price", "vehicle_total", "subtotal", "shipping_cost", "insurance_cost", "cif_price", "customs_estimate", "total_amount", "estimated_grand_total", "shipping_insurance", "initial_payment", "initial_payment_percentage", "remaining_balance", "remaining_percentage", "payment_method", "payment_terms", "seller_name", "sales_manager", "company_name", "company_address", "company_phone", "company_email", "company_website", "notes", "vehicle_summary", "contract_terms", "inspection_notes", "export_documents", "vehicles", "vehicle_image"] as const;
export type Rect = { page: number; x: number; y: number; width: number; height: number };
export type PageInfo = { width: number; height: number; rotation: number; mediaBox: { x: number; y: number; width: number; height: number }; cropBox: { x: number; y: number; width: number; height: number } };
export type FieldMapping = Rect & {
  id: string; field: string; text?: string; required?: boolean;
  kind?: "text" | "vehicles" | "image";
  font: "sans" | "serif" | "mono"; fontSize: number; fontWeight: "normal" | "bold";
  align: "left" | "center" | "right"; lineHeight: number; maxLines: number;
  autoShrink: boolean; minFontSize: number; wrap: boolean; characterSpacing: number;
  color: string; replaceExisting: boolean;
  replaceImages?: boolean;
  // Item-indexed fields and photos; absent means first item / all vehicles.
  itemIndex?: number;
  overflow?: { page: number; x: number; y: number; width: number; height: number; insertBefore: number };
};
export type TemplateMapping = { fields: FieldMapping[]; protectedRegions: (Rect & { label: string })[]; lockedPages: number[]; requiredFields: string[]; reviewed: boolean; allowedIncoterms?: string[] };
export type Template = {
  id: string; familyId: string; name: string; type: DocumentType; language: DocumentLanguage; version: number;
  active: boolean; originalName: string; sha256: string; pages: PageInfo[]; mapping: TemplateMapping;
  createdAt: string; updatedAt: string; isDefault?: boolean;
};
export type TemplateFile = Template & { original: Buffer; prepared: Buffer };
export type DocumentValues = Record<string, string | number | undefined>;
export type DocumentData = { values: DocumentValues; vehicles: DocumentValues[]; images: (Uint8Array | null)[]; language: DocumentLanguage };
export type GeneratedDocument = { id: string; number: string; filename: string; type: DocumentType; language: DocumentLanguage; quoteRef: string; templateId: string; createdAt: string };
export class DocumentError extends Error {
  constructor(message: string, public status = 422) { super(message); this.name = "DocumentError"; }
}
export const EMPTY_MAPPING: TemplateMapping = { fields: [], protectedRegions: [], lockedPages: [], requiredFields: [], reviewed: false };
export function defaultField(page = 1): FieldMapping {
  return { id: crypto.randomUUID(), field: "buyer_name", page, x: 40, y: 180, width: 220, height: 36, font: "sans", fontSize: 10, fontWeight: "normal", align: "left", lineHeight: 1.25, maxLines: 3, autoShrink: true, minFontSize: 8, wrap: true, characterSpacing: 0, color: "#10233f", replaceExisting: false };
}
