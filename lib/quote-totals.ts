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
  /** Total payable to HAINA AUTO EXPORT — the CIF value at the destination port. */
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
