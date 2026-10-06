import { convertToCNY } from "./currency";

// Manually agreed public FOB prices for individually curated JAC export stock.
// Keep the red / white colour-specific T9 units independent: they have separate
// stock records and negotiated offers.
export const FOB_USD_OVERRIDES: Readonly<Record<string, number>> = {
  "hongyu-jac-t9-hunter": 9700,
  "hongyu-jac-t9-hunter-white": 9500,
  "hongyu-jac-hunter-safety-4x4": 11500,
  "hainaauto-799121499": 11500,
  "hainaauto-821427468": 11500,
};

export function applyCatalogueFobOverride<T extends { slug: string; priceCNY: number | null }>(vehicle: T): T {
  const usd = FOB_USD_OVERRIDES[vehicle.slug];
  return usd == null ? vehicle : { ...vehicle, priceCNY: convertToCNY(usd, "USD") };
}
