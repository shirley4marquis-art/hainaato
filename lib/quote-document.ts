// Pure, server-safe helpers for rendering a quote as the printed document
// (see app/admin/quotes/[ref]/print/page.tsx). Kept separate from lib/crm.ts
// so the print template's formatting logic isn't tangled with the database
// access layer.
import type { AdminQuoteDetail, AdminQuoteItemInput } from "./crm";

export type QuoteLanguage = "en" | "es";

const LABELS = {
  en: {
    docTitle: "QUOTATION",
    tag: "CHINA AUTO EXPORT",
    docNumber: "No.",
    date: "DATE",
    validUntil: "VALID UNTIL",
    total: "TOTAL",
    payable: "TOTAL PAYABLE TO HAINA AUTO EXPORT",
    destinationEstimate: "Estimated Destination Costs (customs, import duties, registration)",
    destinationEstimateNote: "Estimate only — not an amount payable to HAINA AUTO EXPORT. Confirm exact figures with your local customs broker.",
    costToOwn: "Estimated Total Cost to Own",
    client: "CLIENT",
    incoterms: "Incoterms",
    destinationPort: "Destination port",
    estimatedDelivery: "Estimated delivery",
    article: "ITEM",
    rate: "RATE",
    qty: "QTY.",
    itemTotal: "TOTAL",
    subtotal: "Subtotal",
    inlandTransport: "Inland Transport",
    exportDocs: "Export Documentation & Customs Clearance",
    freight: "International Ocean Freight (RoRo / Container)",
    insurance: "Marine Insurance (All Risk)",
    termsHeading: "PAYMENT TERMS & CONDITIONS",
    signCompany: "For and on behalf of HAINA AUTO EXPORT",
    signCompanySub: "Name / Title · Date · Company seal",
    signBuyer: "Accepted by (Buyer)",
    signBuyerSub: "Name · Signature · Date",
    inspected: "Inspected and export-ready with complete documentation.",
    daysValid: (n: number) => `Quote valid for ${n} days; prices may change afterward.`,
    depositTerm: (pct: number) => `${pct}% deposit to confirm the order; remaining ${100 - pct}% before shipment.`,
    availabilityTerm: "Vehicles subject to availability and prior sale.",
    shippingTerm: "Shipping times are estimated and may vary with carrier availability.",
    dutyTerm: "Destination duties, taxes and registration are the buyer's responsibility.",
  },
  es: {
    docTitle: "COTIZACIÓN",
    tag: "CHINA AUTO EXPORT",
    docNumber: "N.º",
    date: "FECHA",
    validUntil: "VÁLIDA HASTA",
    total: "TOTAL",
    payable: "TOTAL PAGADERO A HAINA AUTO EXPORT",
    destinationEstimate: "Costos Estimados en Destino (aduana, aranceles, matrícula)",
    destinationEstimateNote: "Solo un estimado — no es un monto pagadero a HAINA AUTO EXPORT. Confirme las cifras exactas con su agente aduanal local.",
    costToOwn: "Costo Total Estimado de Propiedad",
    client: "CLIENTE",
    incoterms: "Incoterms",
    destinationPort: "Puerto de destino",
    estimatedDelivery: "Entrega estimada",
    article: "ARTÍCULO",
    rate: "TARIFA",
    qty: "CANT.",
    itemTotal: "TOTAL",
    subtotal: "Subtotal",
    inlandTransport: "Transporte Interno",
    exportDocs: "Documentación de Exportación y Despacho Aduanero",
    freight: "Flete Marítimo Internacional (RoRo / Contenedor)",
    insurance: "Seguro Marítimo (Todo Riesgo)",
    termsHeading: "CONDICIONES DE PAGO Y TÉRMINOS",
    signCompany: "Por y en nombre de HAINA AUTO EXPORT",
    signCompanySub: "Nombre / Cargo · Fecha · Sello de la empresa",
    signBuyer: "Aceptado por (Comprador)",
    signBuyerSub: "Nombre · Firma · Fecha",
    inspected: "Inspeccionado y listo para exportación con documentación completa.",
    daysValid: (n: number) => `Cotización válida por ${n} días; los precios pueden variar después.`,
    depositTerm: (pct: number) => `Anticipo del ${pct}% para confirmar el pedido; ${100 - pct}% restante antes del embarque.`,
    availabilityTerm: "Vehículos sujetos a disponibilidad y venta previa.",
    shippingTerm: "Los tiempos de envío son estimados y pueden variar según la disponibilidad del transportista.",
    dutyTerm: "Los aranceles, impuestos y matrícula en destino son responsabilidad del comprador.",
  },
} as const;

export function labelsFor(language: QuoteLanguage) {
  return LABELS[language];
}

export function itemTitle(item: AdminQuoteItemInput): string {
  // "2027 — Toyota Sequoia Trailhunter | 4x4 | Automático": year separated by
  // an em dash, then make/model, then drivetrain/transmission as pipe-joined
  // tags — matches the sample's exact heading format.
  const year = item.year != null ? String(item.year) : null;
  const nameSegments = [item.make, item.model].filter(Boolean).join(" ");
  const tags = [item.drivetrain, item.transmission].filter(Boolean).join(" | ");
  const head = year ? `${year} — ${nameSegments}` : nameSegments;
  return tags ? `${head} | ${tags}` : head;
}

export function formatMoney(amount: number, currency: string): string {
  return `${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.replace(
    /^/,
    currency === "USD" ? "$" : `${currency} `
  );
}

export function formatDate(dateStr: string | null | undefined, language: QuoteLanguage): string {
  if (!dateStr) return "—";
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export type PrintLineItem = { label: string; sub?: string; rate: number; qty: number; total: number };

// The four standard fee rows plus one row per vehicle line item, in the
// sample's exact order: vehicle(s) first, then transport/docs/freight/insurance.
export function buildLineItems(quote: AdminQuoteDetail): PrintLineItem[] {
  const t = labelsFor(quote.language);
  const vehicleRows: PrintLineItem[] = quote.items.map((item) => ({
    label: itemTitle(item),
    sub: item.specSummary ?? undefined,
    rate: item.fobFinal,
    qty: item.qty,
    total: item.fobFinal * item.qty,
  }));
  const feeRows: PrintLineItem[] = [
    { label: t.inlandTransport, rate: quote.inlandTransportCost ?? 0, qty: 1, total: quote.inlandTransportCost ?? 0 },
    { label: t.exportDocs, rate: quote.exportDocumentationCost ?? 0, qty: 1, total: quote.exportDocumentationCost ?? 0 },
    { label: t.freight, rate: quote.freightCost ?? 0, qty: 1, total: quote.freightCost ?? 0 },
    { label: t.insurance, rate: quote.insuranceCost ?? 0, qty: 1, total: quote.insuranceCost ?? 0 },
  ];
  return [...vehicleRows, ...feeRows];
}
