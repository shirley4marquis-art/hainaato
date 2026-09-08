// Single source of truth for every monetary total on a quote.
//
// Before this existed the numbers were computed in three places with subtly
// different rounding: recalc() in lib/crm.ts (writes cif_total / deposit_amount
// / balance_amount / duty_estimate / grand_total_reference), the printed
// document (app/admin/quotes/[ref]/print), and the live editor panel. Any
// drift between them showed up as a quote whose stored total disagreed with
// its own PDF. All three now call computeQuoteTotals().
import {
  quoteCifTotal,
  quoteItemsSubtotal,
  quoteNationalizationCifValue,
} from "./quote-document";

export const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export type QuoteTotalsInput = {
  incoterm?: string | null;
  items: { fobFinal: number; qty: number }[];
  inlandTransportCost?: number | null;
  exportDocumentationCost?: number | null;
  freightCost?: number | null;
  insuranceCost?: number | null;
  depositPct?: number | null;
  dutyPct?: number | null;
  dutyEstimateOverride?: number | null;
};

export type QuoteTotals = {
  /** Sum of every line item (unit price × quantity). */
  itemsSubtotal: number;
  /** Freight charged as a separate line (0 on CIF quotes — already in the unit price). */
  freight: number;
  /** Marine insurance charged as a separate line (0 on CIF quotes). */
  insurance: number;
  /** Total payable to NINDGE AUTOMOBILE — the CIF value at the destination port. */
  cifTotal: number;
  /** CIF value customs duty is assessed against (vehicle + freight + insurance). */
  customsBaseCifValue: number;
  /** Estimated destination customs / nationalization cost, or null when not quoted. */
  customsEstimate: number | null;
  /** cifTotal + customsEstimate — the buyer's estimated all-in cost. */
  grandTotal: number;
  depositPct: number;
  depositAmount: number;
  balanceAmount: number;
};

const DEFAULT_DEPOSIT_PCT = 40;

export function computeQuoteTotals(input: QuoteTotalsInput): QuoteTotals {
  const pricing = {
    incoterm: input.incoterm ?? null,
    items: input.items.map((it) => ({ fobFinal: Number(it.fobFinal) || 0, qty: Number(it.qty) || 0 })),
    inlandTransportCost: Number(input.inlandTransportCost) || 0,
    exportDocumentationCost: Number(input.exportDocumentationCost) || 0,
    freightCost: Number(input.freightCost) || 0,
    insuranceCost: Number(input.insuranceCost) || 0,
  };

  const itemsSubtotal = roundMoney(quoteItemsSubtotal(pricing));
  const cifTotal = roundMoney(quoteCifTotal(pricing));
  const customsBaseCifValue = roundMoney(quoteNationalizationCifValue(pricing));

  const isCif = (input.incoterm ?? "").trim().toUpperCase() !== "FOB";
  const freight = isCif ? 0 : pricing.freightCost;
  const insurance = isCif ? 0 : pricing.insuranceCost;

  const dutyPct = input.dutyPct == null ? null : Number(input.dutyPct);
  const override = input.dutyEstimateOverride == null ? null : Number(input.dutyEstimateOverride);
  const customsEstimate =
    override != null
      ? roundMoney(override)
      : dutyPct != null && Number.isFinite(dutyPct)
        ? roundMoney(customsBaseCifValue * (dutyPct / 100))
        : null;

  const depositPct =
    input.depositPct == null || !Number.isFinite(Number(input.depositPct))
      ? DEFAULT_DEPOSIT_PCT
      : Number(input.depositPct);
  const depositAmount = roundMoney(cifTotal * (depositPct / 100));
  const balanceAmount = roundMoney(cifTotal - depositAmount);

  return {
    itemsSubtotal,
    freight,
    insurance,
    cifTotal,
    customsBaseCifValue,
    customsEstimate,
    grandTotal: roundMoney(cifTotal + (customsEstimate ?? 0)),
    depositPct,
    depositAmount,
    balanceAmount,
  };
}

// ---------------------------------------------------------------------------
// CIF price breakdown for the client-facing quotation.
//
// The client is quoted one fixed CIF price. Customs brokers (and the client)
// still need to see how it splits into the goods (FOB) value and each
// shipping cost. This reconstructs a plausible split whose parts sum EXACTLY
// to the quoted CIF total:
//
//   FOB goods value
//   + Export customs clearance (China)
//   + Origin port / terminal handling
//   + Ocean freight to the destination port
//   + Marine cargo insurance (min. 110% CIF cover)
//   + Export documentation & handling fees
//   + Bill of Lading issuance
//   = CIF total
//
// For an explicit FOB quote the shipping figures the desk actually entered
// are used. For a CIF quote (the common case) the shipping figures are
// near-market approximations for China → Latin America RoRo/consolidated
// ocean export, and the goods value is the remainder — so the sum is always
// the exact quoted CIF price.
// ---------------------------------------------------------------------------

// Per-unit and per-shipment approximations, USD. Tuned to China → Venezuela
// (Puerto Cabello / La Guaira) RoRo / consolidated-container export, matching
// the reference quotation HA-COT-2026-097. Deliberately mid/low range.
const MARKET = {
  oceanFreightPerUnit: 1720, // one pickup's share, RoRo or shared container
  exportClearancePerUnit: 95, // China export customs declaration (~RMB 350-900)
  originHandlingPerUnit: 185, // origin port / terminal handling (THC)
  documentationBase: 80, // export documentation & shipping fees, per shipment
  documentationPerUnit: 0,
  billOfLading: 65, // B/L issuance (~CNY 300-450)
  insuranceRate: 0.0042, // of 110% of CIF value — ICC(C) minimum required cover
  minInsurance: 25,
  // The shipping side of a CIF price never realistically exceeds this share
  // of the total; beyond it the approximations are scaled down so the implied
  // goods value stays sane for a low-value unit.
  maxShippingShare: 0.62,
};

export type CifBreakdown = {
  goodsValue: number;
  exportClearance: number;
  originHandling: number;
  oceanFreight: number;
  marineInsurance: number;
  documentation: number;
  billOfLading: number;
  /** goodsValue + exportClearance + originHandling + documentation + billOfLading. */
  fobSubtotal: number;
  /** oceanFreight + marineInsurance. */
  freightAndInsurance: number;
  cifTotal: number;
  /** true when the shipping figures are market approximations (CIF quote). */
  estimated: boolean;
};

export function decomposeCif(
  cifTotal: number,
  opts: {
    units: number;
    incoterm?: string | null;
    freightCost?: number | null;
    insuranceCost?: number | null;
    inlandTransportCost?: number | null;
    exportDocumentationCost?: number | null;
  },
): CifBreakdown {
  const cif = roundMoney(Math.max(0, Number(cifTotal) || 0));
  const units = Math.max(1, Math.round(Number(opts.units) || 1));
  const isFob = (opts.incoterm ?? "").trim().toUpperCase() === "FOB";

  let exportClearance: number;
  let originHandling: number;
  let oceanFreight: number;
  let marineInsurance: number;
  let documentation: number;
  let billOfLading: number;

  if (isFob) {
    // Use what the desk entered; fold any inland cost into origin handling.
    oceanFreight = roundMoney(Math.max(0, Number(opts.freightCost) || 0));
    marineInsurance = roundMoney(Math.max(0, Number(opts.insuranceCost) || 0));
    originHandling = roundMoney(Math.max(0, Number(opts.inlandTransportCost) || 0));
    exportClearance = roundMoney(Math.max(0, Number(opts.exportDocumentationCost) || 0));
    documentation = 0;
    billOfLading = 0;
  } else {
    oceanFreight = MARKET.oceanFreightPerUnit * units;
    exportClearance = MARKET.exportClearancePerUnit * units;
    originHandling = MARKET.originHandlingPerUnit * units;
    documentation = MARKET.documentationBase + MARKET.documentationPerUnit * units;
    billOfLading = MARKET.billOfLading;
    marineInsurance = Math.max(MARKET.minInsurance, cif * 1.1 * MARKET.insuranceRate);
  }

  let shipping = [exportClearance, originHandling, oceanFreight, marineInsurance, documentation, billOfLading];

  // Keep the implied goods value realistic for low-value units.
  const shippingSum = shipping.reduce((a, b) => a + b, 0);
  const cap = cif * MARKET.maxShippingShare;
  const capped = shippingSum > cap && shippingSum > 0;
  if (capped) {
    const k = cap / shippingSum;
    shipping = shipping.map((v) => v * k);
  }

  // Estimated legs read as clean whole-dollar figures on the quotation; a
  // desk-entered FOB quote or a capped estimate keeps its cents.
  const round = !isFob && !capped ? Math.round : roundMoney;
  const parts = shipping.map(round);
  const [ec, oh, of, mi, doc, bl] = parts;
  const partsSum = parts.reduce((a, b) => a + b, 0);
  // The goods value is the exact remainder, so the column always foots to CIF.
  const goodsValue = roundMoney(cif - partsSum);

  return {
    goodsValue,
    exportClearance: ec,
    originHandling: oh,
    oceanFreight: of,
    marineInsurance: mi,
    documentation: doc,
    billOfLading: bl,
    fobSubtotal: roundMoney(goodsValue + ec + oh + doc + bl),
    freightAndInsurance: roundMoney(of + mi),
    cifTotal: cif,
    estimated: !isFob,
  };
}
