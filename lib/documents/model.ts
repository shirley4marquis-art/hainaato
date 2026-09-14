import type { AdminQuoteDetail } from "../crm";
import { computeQuoteTotals } from "../quote-totals";

export const DOCUMENT_TYPES = {
 quote: ["Quotation", "Cotización", "QT"], proforma: ["Proforma Invoice", "Factura proforma", "PI"],
 invoice: ["Commercial Invoice", "Factura comercial", "INV"], contract: ["Sales Contract", "Contrato de compraventa", "CT"],
 specification: ["Vehicle Specification Sheet", "Ficha técnica del vehículo", "SP"], inspection: ["Vehicle Inspection Report", "Informe de inspección del vehículo", "IR"],
 shipping: ["Shipping Information", "Información de embarque", "SH"], receipt: ["Payment Receipt", "Recibo de pago", "RC"],
 confirmation: ["Payment Confirmation", "Confirmación de pago", "PC"], supply: ["Vehicle Supply Statement", "Declaración de suministro de vehículos", "VS"],
 traceability: ["Vehicle Acquisition / Supply Chain Traceability Statement", "Declaración de adquisición y trazabilidad de vehículos", "TR"],
 export: ["Export Documentation Summary", "Resumen de documentación de exportación", "EX"], purchase: ["Customer Purchase Summary", "Resumen de compra del cliente", "PS"],
} as const;
export type DocumentType = keyof typeof DOCUMENT_TYPES;
export type Language = "en" | "es";
export const DOCUMENT_STATUSES = ["draft", "generated", "sent", "signed", "paid", "completed"] as const;
export type DocumentStatus = typeof DOCUMENT_STATUSES[number];
export const COMPANY = { name: "HAINA AUTO EXPORT", website: "nindgeauto.com", email: "sales@nindgeauto.com", phone: "+86 150 3217 8759", address: "11, Yuefeng Road, Economic Development Zone, Zhangjiagang, Jiangsu, China", logo: "/hainaauto-logo.webp" };
export type Operation = { id: string; kind: "payment" | "shipment" | "customs" | "vehicle"; quote_ref: string | null; title: string; status: string; data: Record<string, string>; actor: string; version: number; created_at: string; updated_at: string };
export type DocumentSnapshot = { version: 1; type: DocumentType; language: Language; quote: AdminQuoteDetail; company: typeof COMPANY; totals: ReturnType<typeof computeQuoteTotals>; operations: Operation[]; notes: string; paymentTerms: string; issueDate: string };
export type BusinessDocument = { id: string; number: string; type: DocumentType; language: Language; status: DocumentStatus; quote_ref: string; customer_id: number; snapshot: DocumentSnapshot; created_at: string; updated_at: string };
export function makeSnapshot(quote: AdminQuoteDetail, type: DocumentType, language: Language, operations: Operation[], notes = "", paymentTerms = ""): DocumentSnapshot {
 // Exclude internal CRM notes from customer documents. User-authored document copy is language-specific.
 const safeQuote = { ...quote, notes: null, customer: { ...quote.customer, notes: null }, items: quote.items.map((item, index) => ({ ...item, id: (item as {id?:number}).id ?? index, historyNotes: null, specSummary: null, photos: [] })) };
 return { version: 1, type, language, quote: safeQuote, company: COMPANY, totals: computeQuoteTotals(quote), operations, notes, paymentTerms, issueDate: new Date().toISOString().slice(0,10) };
}
export function documentTitle(type: DocumentType, language: Language) { return DOCUMENT_TYPES[type][language === "es" ? 1 : 0]; }
