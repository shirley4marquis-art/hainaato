import type { AdminQuoteDetail } from "../crm";
import { DocumentError, type DocumentData, type DocumentLanguage, type DocumentType, type DocumentValues } from "./types";
import { cleanValue } from "./mapping";

export function moneyNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1e12) throw new DocumentError(`Invalid numeric value for ${label}.`);
  return Math.round(value * 100);
}
export function documentData(quote: AdminQuoteDetail, type: DocumentType, language: DocumentLanguage, number: string, overrides: DocumentValues = {}, vins: Record<string, string> = {}): DocumentData {
  if (!quote.customer.name?.trim()) throw new DocumentError("Customer full legal name is required.");
  if (!quote.destinationCountry || !quote.destinationPort) throw new DocumentError("Destination country and port are required.");
  if (!quote.items.length) throw new DocumentError("Select at least one vehicle.");
  const currency = /^[A-Z]{3}$/.test(quote.currency) ? quote.currency : "USD";
  const locale = language === "en" ? "en-US" : language === "zh" ? "zh-CN" : "es-ES";
  const amount = (cents: number) => `${currency} ${new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }).format(cents / 100)}`;
  const date = (value: string | null | undefined) => {
    if (!value) return "";
    const parsed = new Date(value.slice(0, 10) + "T12:00:00Z");
    return Number.isNaN(parsed.getTime()) ? "" : new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(parsed);
  };
  const vehicles: DocumentValues[] = quote.items.map(item => {
    if (!Number.isSafeInteger(item.qty) || item.qty < 1 || item.qty > 10000) throw new DocumentError("Vehicle quantity must be a positive whole number.");
    const unit = moneyNumber(item.fobFinal, "unit price"), vin = cleanValue(vins[String(item.id)] ?? "").trim().toUpperCase();
    if (vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) throw new DocumentError("Vehicle VIN must contain 17 valid letters and digits.");
    return { vehicle_brand: item.make, vehicle_model: item.model, vehicle_year: item.year ?? "", vehicle_condition: item.condition === "new" ? (language === "en" ? "New" : language === "zh" ? "新车" : "Nuevo") : (language === "en" ? "Used" : language === "zh" ? "二手车" : "Usado"), vehicle_color: item.exteriorColor ?? "", vin, engine: item.engine ?? "", fuel: item.fuelType ?? "", transmission: item.transmission ?? "", mileage: item.mileageKm ?? "", quantity: item.qty, unit_price: amount(unit), vehicle_total: amount(unit * item.qty), notes: item.specSummary ?? "" };
  });
  const subtotal = quote.items.reduce((total, item) => total + moneyNumber(item.fobFinal, "unit price") * item.qty, 0);
  const shipping = moneyNumber(quote.freightCost, "shipping"), insurance = moneyNumber(quote.insuranceCost, "insurance");
  const cif = quote.incoterm === "FOB" ? subtotal + shipping + insurance + moneyNumber(quote.inlandTransportCost, "inland transport") + moneyNumber(quote.exportDocumentationCost, "export documentation") : subtotal;
  if (!Number.isSafeInteger(cif)) throw new DocumentError("Document value is too large.");
  const percent = quote.depositPct;
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) throw new DocumentError("Initial payment percentage must be between 0 and 100.");
  const initial = Math.round(cif * percent / 100);
  const included = language === "en" ? "Included" : language === "zh" ? "已包含" : language === "es-zh" ? "Incluido / 已包含" : "Incluido";
  const costDisplay = (cents: number) => quote.incoterm !== "FOB" && cents === 0 ? included : amount(cents);
  const values: DocumentValues = {
    ...vehicles[0], document_number: number, quotation_number: quote.documentNumber ?? quote.ref,
    contract_number: type === "contract" ? number : "", invoice_number: type === "invoice" || type === "proforma" ? number : "",
    issue_date: date(quote.quoteDate), expiry_date: date(quote.validUntil), buyer_name: quote.customer.name,
    buyer_company: "", buyer_email: quote.customer.email ?? "", buyer_phone: quote.customer.phone ?? "",
    buyer_address: [quote.customer.address, quote.customer.city].filter(Boolean).join(", "), buyer_country: quote.customer.country ?? "",
    destination_country: quote.destinationCountry, destination_port: quote.destinationPort, incoterm: quote.incoterm ?? "CIF", currency,
    quantity: quote.items.reduce((sum, item) => sum + item.qty, 0), subtotal: amount(subtotal), shipping_cost: costDisplay(shipping), insurance_cost: costDisplay(insurance),
    cif_price: amount(cif), customs_estimate: quote.dutyEstimate == null ? "" : amount(moneyNumber(quote.dutyEstimate, "customs estimate")), total_amount: amount(cif),
    estimated_grand_total: quote.dutyEstimate == null ? "" : amount(cif + moneyNumber(quote.dutyEstimate, "customs estimate")),
    shipping_insurance: costDisplay(shipping + insurance),
    initial_payment: amount(initial), initial_payment_percentage: percent, remaining_balance: amount(cif - initial), remaining_percentage: 100 - percent,
    payment_method: "", payment_terms: "", seller_name: "HAINA AUTO EXPORT", sales_manager: "", company_name: "HAINA AUTO EXPORT",
    company_address: "11, Yuefeng Road, Economic Development Zone, Zhangjiagang, Jiangsu, China", company_phone: "+86 150 3217 8759", company_email: "sales@nindgeauto.com", company_website: "nindgeauto.com",
    notes: quote.notes ?? "", vehicle_summary: vehicles.map(v => [v.quantity, "×", v.vehicle_year, v.vehicle_brand, v.vehicle_model, v.vin].filter(Boolean).join(" ")).join("\n"),
  };
  // Only auxiliary fields can be edited here. Prices, quantities and identity
  // are sourced from the order; change the order to change those values.
  const editable = new Set(["buyer_company", "payment_method", "payment_terms", "sales_manager", "contract_terms", "inspection_notes", "export_documents", "notes"]);
  for (const [key, value] of Object.entries(overrides)) if (editable.has(key)) values[key] = cleanValue(value).slice(0, 30000);
  if (type === "contract" && !values.payment_terms) throw new DocumentError("Payment terms are required for a contract.");
  return { values, vehicles, images: [], language };
}
