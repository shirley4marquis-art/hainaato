// Pure, server-safe helpers for rendering a quote as the printed document
// (see app/admin/quotes/[ref]/print/page.tsx). Kept separate from lib/crm.ts
// so the print template's formatting logic isn't tangled with the database
// access layer.
import type { AdminQuoteItemInput } from "./crm";

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
    preparedFor: "Prepared for",
    preparedBy: "Prepared by",
    commercialSummary: "Commercial Summary",
    quoteScope: "Formal vehicle export quotation",
    paymentSchedule: "Payment Schedule",
    depositDue: (pct: number) => `${pct}% deposit`,
    balanceDue: (pct: number) => `${100 - pct}% balance`,
    depositTiming: "To confirm the vehicle and start export processing",
    balanceTiming: "After shipment, before release at the destination port",
    totalCif: "TOTAL CIF",
    cifPriceHeading: "CIF PRICE",
    cifIncludesHeading: "CIF price includes:",
    cifVehicleIncluded: "Vehicle",
    includedInCif: "Included in CIF",
    destinationChargesExcluded:
      "The CIF price includes the vehicle, marine insurance and international freight to the stated destination port. Import duties, nationalization, port handling, registration, license plates and other local destination-country charges are not included unless expressly stated in this quotation.",
    destinationEstimate: "Estimated Destination Costs (customs, import duties, registration)",
    destinationEstimateNote: "Estimate only — not an amount payable to HAINA AUTO EXPORT. Confirm exact figures with your local customs broker.",
    customsPreview: "Estimated SENIAT nationalization preview",
    customsPreviewNote: "Preview based on the quoted CIF value. Duty = 20% for engines up to 2.0L or 40% for 2.1L+, plus 1% customs service fee, 16% VAT, and 15% luxury surcharge only when CIF exceeds the threshold.",
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
    depositTerm: (pct: number) => `${pct}% deposit to confirm the order; remaining ${100 - pct}% after shipment, before release at the destination port.`,
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
    preparedFor: "Preparado para",
    preparedBy: "Preparado por",
    commercialSummary: "Resumen Comercial",
    quoteScope: "Cotización formal de exportación de vehículo",
    paymentSchedule: "Calendario de Pago",
    depositDue: (pct: number) => `${pct}% inicial`,
    balanceDue: (pct: number) => `${100 - pct}% restante`,
    depositTiming: "Para confirmar la unidad e iniciar el proceso de exportación",
    balanceTiming: "Después del embarque, antes de la liberación en el puerto de destino",
    totalCif: "TOTAL CIF",
    cifPriceHeading: "PRECIO CIF",
    cifIncludesHeading: "El precio CIF incluye:",
    cifVehicleIncluded: "Vehículo",
    includedInCif: "Incluido en CIF",
    destinationChargesExcluded:
      "El precio CIF incluye el vehículo, seguro marítimo y flete internacional hasta el puerto de destino indicado. Los impuestos, nacionalización, gastos portuarios, registro, placas y demás cargos locales en el país de destino no están incluidos, salvo que se indique expresamente lo contrario en esta cotización.",
    destinationEstimate: "Costos Estimados en Destino (aduana, aranceles, matrícula)",
    destinationEstimateNote: "Solo un estimado — no es un monto pagadero a HAINA AUTO EXPORT. Confirme las cifras exactas con su agente aduanal local.",
    customsPreview: "Vista previa estimada de nacionalización SENIAT",
    customsPreviewNote: "Vista previa basada en el valor CIF cotizado. Arancel = 20% para motores hasta 2.0L o 40% para 2.1L+, más 1% de servicio aduanero, 16% IVA y 15% de tasa de lujo solo si el CIF supera el umbral.",
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
    depositTerm: (pct: number) => `Anticipo del ${pct}% para confirmar el pedido; ${100 - pct}% restante después del embarque, antes de la liberación en el puerto de destino.`,
    availabilityTerm: "Vehículos sujetos a disponibilidad y venta previa.",
    shippingTerm: "Los tiempos de envío son estimados y pueden variar según la disponibilidad del transportista.",
    dutyTerm: "Los aranceles, impuestos y matrícula en destino son responsabilidad del comprador.",
  },
} as const;

export function labelsFor(language: QuoteLanguage) {
  return LABELS[language];
}

export type QuotePriceType = "CIF" | "FOB";

type QuotePricingShape = {
  incoterm?: string | null;
  inlandTransportCost?: number | null;
  exportDocumentationCost?: number | null;
  freightCost?: number | null;
  insuranceCost?: number | null;
  items: { fobFinal: number; qty: number }[];
};

export function quotePriceType(incoterm?: string | null): QuotePriceType {
  return incoterm?.trim().toUpperCase() === "FOB" ? "FOB" : "CIF";
}

export function isCifQuote(quote: { incoterm?: string | null }): boolean {
  return quotePriceType(quote.incoterm) === "CIF";
}

export function quoteItemsSubtotal(quote: Pick<QuotePricingShape, "items">): number {
  return roundMoney(quote.items.reduce((sum, item) => sum + (item.fobFinal ?? 0) * (item.qty ?? 1), 0));
}

export function quoteCifTotal(quote: QuotePricingShape): number {
  const itemsSubtotal = quoteItemsSubtotal(quote);
  if (isCifQuote(quote)) return itemsSubtotal;
  return roundMoney(
    itemsSubtotal +
      (quote.inlandTransportCost ?? 0) +
      (quote.exportDocumentationCost ?? 0) +
      (quote.freightCost ?? 0) +
      (quote.insuranceCost ?? 0)
  );
}

export function quoteNationalizationCifValue(quote: QuotePricingShape): number {
  const itemsSubtotal = quoteItemsSubtotal(quote);
  if (isCifQuote(quote)) return itemsSubtotal;
  return roundMoney(itemsSubtotal + (quote.freightCost ?? 0) + (quote.insuranceCost ?? 0));
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

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export type VenezuelaNationalizationEstimate = {
  cifValue: number;
  importDutyRate: number;
  importDuty: number;
  customsServiceFee: number;
  vat: number;
  luxuryThreshold: number;
  luxuryRate: number;
  luxuryFee: number;
  total: number;
};

export function estimateVenezuelaNationalization({
  cifValue: explicitCifValue,
  fobValue,
  freightCost = 0,
  insuranceCost = 0,
  engineDisplacementLiters,
  luxuryThreshold = 50000,
}: {
  cifValue?: number;
  fobValue?: number;
  freightCost?: number;
  insuranceCost?: number;
  engineDisplacementLiters?: number | null;
  luxuryThreshold?: number;
}): VenezuelaNationalizationEstimate {
  const cifValue = Math.max(0, explicitCifValue ?? (fobValue ?? 0) + freightCost + insuranceCost);
  const importDutyRate = (engineDisplacementLiters ?? 2.0) >= 2.1 ? 0.4 : 0.2;
  const importDuty = roundMoney(cifValue * importDutyRate);
  const customsServiceFee = roundMoney(cifValue * 0.01);
  const vat = roundMoney((cifValue + importDuty + customsServiceFee) * 0.16);
  const luxuryRate = cifValue > luxuryThreshold ? 0.15 : 0;
  const luxuryFee = luxuryRate > 0 ? roundMoney(cifValue * luxuryRate) : 0;
  const total = roundMoney(importDuty + customsServiceFee + vat + luxuryFee);

  return {
    cifValue: roundMoney(cifValue),
    importDutyRate,
    importDuty,
    customsServiceFee,
    vat,
    luxuryThreshold,
    luxuryRate,
    luxuryFee,
    total,
  };
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

export type PrintLineItem = {
  label: string;
  sub?: string;
  rate?: number;
  rateText?: string;
  qty?: number;
  total?: number;
  totalText?: string;
};

type PrintQuoteShape = {
  language: QuoteLanguage;
  incoterm?: string | null;
  inlandTransportCost?: number | null;
  exportDocumentationCost?: number | null;
  freightCost?: number | null;
  insuranceCost?: number | null;
  items: AdminQuoteItemInput[];
};

// Vehicle line items first. CIF quotations show freight/insurance as included
// instead of adding charge rows; explicit FOB quotes keep the additive rows.
export function buildLineItems(quote: PrintQuoteShape): PrintLineItem[] {
  const t = labelsFor(quote.language);
  const vehicleRows: PrintLineItem[] = quote.items.map((item) => ({
    label: itemTitle(item),
    sub: item.specSummary ?? undefined,
    rate: item.fobFinal,
    qty: item.qty,
    total: item.fobFinal * item.qty,
  }));
  if (isCifQuote(quote)) {
    return [
      ...vehicleRows,
      { label: t.freight, rateText: t.includedInCif, qty: 1, totalText: t.includedInCif },
      { label: t.insurance, rateText: t.includedInCif, qty: 1, totalText: t.includedInCif },
    ];
  }
  const feeRows: PrintLineItem[] = [
    { label: t.inlandTransport, rate: quote.inlandTransportCost ?? 0, qty: 1, total: quote.inlandTransportCost ?? 0 },
    { label: t.exportDocs, rate: quote.exportDocumentationCost ?? 0, qty: 1, total: quote.exportDocumentationCost ?? 0 },
    { label: t.freight, rate: quote.freightCost ?? 0, qty: 1, total: quote.freightCost ?? 0 },
    { label: t.insurance, rate: quote.insuranceCost ?? 0, qty: 1, total: quote.insuranceCost ?? 0 },
  ];
  return [...vehicleRows, ...feeRows];
}
