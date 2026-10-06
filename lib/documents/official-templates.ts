import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb } from "pdf-lib";
import { defaultField, EMPTY_MAPPING, type DocumentData, type FieldMapping, type TemplateMapping } from "./types";
import { generatePdf, inspectPdf } from "./pdf";

type OfficialType = "quotation" | "specification";
type Config = { field: string; text?: string; fontSize?: number; minFontSize?: number; align?: "left" | "right"; wrap?: boolean; maxLines?: number };
const FILES: Record<OfficialType, string> = {
  quotation: "HAINA_AUTO_Export_Quotation_Template (1).pdf",
  specification: "HAINA_AUTO_Vehicle_Specification_Template (1).pdf",
};
const PHOTO_X = [45.35, 216.5, 387.65];

function quotationConfig(data: DocumentData): Record<string, Config> {
  const values = data.values, vehicle = data.vehicles[0] ?? values;
  const v = (key: string, fallback = "—") => { const result = values[key]; return result == null || String(result).trim() === "" ? fallback : String(result).trim(); };
  const vv = (key: string, fallback = "—") => { const result = vehicle[key]; return result == null || String(result).trim() === "" ? fallback : String(result).trim(); };
  const currency = v("currency", "USD"), money = (key: string) => {
    const amount = v(key);
    return amount === "—" || /^[A-Z]{3}\s/.test(amount) ? amount : `${currency} ${amount}`;
  };
  const quantity = String(values.quantity ?? vehicle.quantity ?? 1);
  const destination = [values.destination_port, values.destination_country].map(x => String(x ?? "").trim()).filter(Boolean).join(", ");
  const detail = [vehicle.vehicle_color, vehicle.fuel, vehicle.engine, vehicle.transmission, vehicle.drivetrain, vehicle.mileage ? `${vehicle.mileage} km` : ""].map(x => String(x ?? "").trim()).filter(Boolean).join(" · ");
  const total = v("total_amount", v("cif_price"));
  return {
    "qt.date": { field: "issue_date" }, "qt.valid_until": { field: "expiry_date" }, "qt.currency": { field: "currency" }, "qt.incoterm": { field: "incoterm" },
    "buyer.name": { field: "buyer_name" }, "buyer.city_country": { field: "buyer_address", text: "{{buyer_address}}, {{buyer_country}}", fontSize: 7.2, minFontSize: 5.2 },
    "buyer.contact": { field: "buyer_email", text: "{{buyer_email}} · {{buyer_phone}}", fontSize: 7.2, minFontSize: 5.2 }, "buyer.consignee": { field: "buyer_name" },
    "ship.goods": { field: "quantity", text: `${quantity} export-ready vehicle${quantity === "1" ? "" : "s"}` }, "ship.pol": { field: "loading_port" }, "ship.pod": { field: "destination_port", text: destination || "—", fontSize: 7.2, minFontSize: 5.2 },
    "ship.payment": { field: "payment_terms", text: "{{initial_payment_percentage}}% deposit; {{remaining_percentage}}% before bill of lading release", fontSize: 7, minFontSize: 5.2 },
    "vehicle.description": { field: "vehicle_summary", text: "{{vehicle_year}} {{vehicle_brand}} {{vehicle_model}}", fontSize: 8, minFontSize: 5.2, wrap: true, maxLines: 3 },
    "vehicle.spec": { field: "vehicle_details", text: detail || vv("notes", "See vehicle specification"), fontSize: 7.5, minFontSize: 5.2, wrap: true, maxLines: 3 },
    "vehicle.stock": { field: "stock_id" }, "vehicle.qty": { field: "quantity" }, "vehicle.amount": { field: "subtotal" },
    "quote.total_caption": { field: "incoterm", text: `TOTAL — ${v("incoterm", "CIF")} ${destination}`, fontSize: 8, minFontSize: 5.4 }, "quote.total": { field: "total_amount" },
    "price.vehicle": { field: "subtotal" }, "price.inland": { field: "inland_cost" }, "price.export": { field: "notes", text: "Included", fontSize: 7.2, minFontSize: 5.2 },
    "price.documents": { field: "documentation_cost" }, "price.freight": { field: "shipping_cost" }, "price.insurance": { field: "insurance_cost" }, "price.total": { field: "total_amount" },
    "pay.deposit": { field: "initial_payment", text: "{{initial_payment_percentage}}% — {{initial_payment}}", fontSize: 7.5, minFontSize: 5.2 }, "pay.balance": { field: "remaining_balance", text: "{{remaining_percentage}}% — {{remaining_balance}}", fontSize: 7.5, minFontSize: 5.2 },
    "bank.beneficiary": { field: "company_name", text: "Ningde Haina Baichuan Automobile Sales Co., Ltd.", fontSize: 7.5 }, "bank.name": { field: "notes", text: "Provided with the signed contract", fontSize: 7.5 }, "bank.account": { field: "notes", text: "Provided securely with the signed contract", fontSize: 7.5 }, "bank.swift": { field: "notes", text: "Provided with the signed contract", fontSize: 7.5 }, "bank.reference": { field: "document_number" },
    "terms.etd": { field: "notes", text: "Confirmed by carrier after booking", fontSize: 7.5 }, "terms.eta": { field: "notes", text: "Confirmed by carrier after booking", fontSize: 7.5 },
    "qt.doc_no": { field: "document_number" }, "sign.seller_date": { field: "issue_date" }, "sign.buyer_name": { field: "buyer_name" }, "sign.buyer_date": { field: "issue_date" },
  };
}

const SPEC_FIELDS: Record<string, string> = {
  "sp.issued": "issue_date", "sp.attached_to": "attached_to", "sp.units": "units", "sp.status": "vehicle_condition",
  "id.make": "vehicle_brand", "id.model_trim": "vehicle_model", "id.year": "vehicle_year", "id.stock": "stock_id", "id.exterior": "vehicle_color", "id.body": "body_type", "id.doors_seats": "doors_seats", "id.steering": "steering",
  "pt.energy": "fuel", "pt.displacement": "engine", "pt.power": "power", "pt.transmission": "transmission", "pt.drive": "drivetrain", "pt.emission": "emissions", "pt.battery": "battery_range", "pt.fuel_title": "fuel",
  "cond.odometer": "mileage", "cond.registration": "first_registration", "cond.use": "ownership_history", "cond.keys": "keys_books", "cond.note": "condition_note", "cond.inspection": "inspection_status",
  "dim.lwh": "length_width_height", "dim.wheelbase": "wheelbase", "dim.weight": "curb_weight", "dim.cbm": "packed_volume", "dim.lifting": "preferred_lifting", "dim.port": "loading_port",
  "ex.pdi": "export_photo_status", "ex.licence": "export_licence_status", "ex.dereg": "deregistration_status", "ex.destination": "destination_rules", "sp.doc_no": "document_number",
};

function photoFields(type: OfficialType): FieldMapping[] {
  const page = type === "quotation" ? 3 : 2, bottom = type === "quotation" ? 488 : 432, height = type === "quotation" ? 181 : 126;
  return PHOTO_X.map((x, itemIndex) => ({ ...defaultField(page), id: `vehicle-photo-${itemIndex + 1}`, field: "vehicle_image", kind: "image", itemIndex, x: x + 3, y: 841.8898 - bottom - height, width: 155, height, fontSize: 9, minFontSize: 7 }));
}

async function loadTemplate(type: OfficialType): Promise<Buffer> {
  const source = await readFile(path.join(process.cwd(), "docs", FILES[type]));
  const pdf = await PDFDocument.load(source);
  // Bake the source's named blank fields into the page artwork. The site PDF
  // renderer then writes each value with its own tested Unicode font handling.
  pdf.getForm().flatten();
  pdf.getPages()[0].drawRectangle({ x: 502, y: 779, width: 52, height: 14, color: rgb(12 / 255, 35 / 255, 64 / 255) });
  return Buffer.from(await pdf.save({ useObjectStreams: false }));
}

async function mappingFor(type: OfficialType, data: DocumentData): Promise<TemplateMapping> {
  const source = await readFile(path.join(process.cwd(), "docs", FILES[type]));
  const pdf = await PDFDocument.load(source), config = type === "quotation" ? quotationConfig(data) : null, fields: FieldMapping[] = [];
  const pages = pdf.getPages(), pageIndexes = new Map(pages.map((page, index) => [String(page.ref), index]));
  for (const pdfField of pdf.getForm().getFields()) {
    if (pdfField.constructor.name !== "PDFTextField") continue;
    const fieldName = pdfField.getName(), specKey = SPEC_FIELDS[fieldName], entry = config?.[fieldName];
    const fieldKey = entry?.field ?? specKey;
    if (!fieldKey) continue;
    for (const widget of pdfField.acroField.getWidgets()) {
      const pageIndex = pageIndexes.get(String(widget.P()));
      if (pageIndex == null) continue;
      const pageNo = pageIndex + 1, pageHeight = pages[pageIndex].getHeight(), rect = widget.getRectangle();
      const left = rect.x, bottom = rect.y, right = left + rect.width, top = bottom + rect.height;
      const resolved = entry ?? { field: fieldKey };
      fields.push({
        ...defaultField(pageNo), id: `official-${type}-${fieldName}`, field: resolved.field, text: resolved.text ?? `{{${resolved.field}}}`,
        x: left + 2.4, y: pageHeight - top + 2, width: Math.max(2, right - left - 4.8), height: Math.max(2, top - bottom - 4),
        font: "sans", fontSize: resolved.fontSize ?? 8, minFontSize: resolved.minFontSize ?? 5.2, fontWeight: "normal", color: "#6b3e11",
        maxLines: resolved.maxLines ?? 1, wrap: resolved.wrap ?? false, autoShrink: true, lineHeight: 1.05,
        align: resolved.align ?? "left", replaceExisting: false,
      });
    }
  }
  fields.push(...photoFields(type));
  return { ...structuredClone(EMPTY_MAPPING), reviewed: true, fields };
}

export async function generateOfficialDocument(type: OfficialType, data: DocumentData): Promise<Buffer> {
  let stage = "load template";
  try {
    const template = await loadTemplate(type);
    stage = "map fillable fields";
    const mapping = await mappingFor(type, data);
    stage = "inspect flattened template";
    await inspectPdf(template);
    stage = "render document fields and photos";
    return await generatePdf(template, mapping, data);
  } catch (error) {
    const detail = error as { code?: string; name?: string };
    console.error("[official-document] generation stage failed", { type, stage, name: detail?.name ?? "Unknown", code: detail?.code });
    throw error;
  }
}
