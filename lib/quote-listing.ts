import { convertFromCNY } from "./currency";
import { imagePath } from "./format";
import { rankVehicleImages } from "./image-ranking";
import { getVehicleIndexEntryBySlug } from "./vehicles";
import { getVehicleBySlug } from "./vehicle-details";
import { CATALOGUE_PROMOTION, isCataloguePromotionEligible, qualifiesForCataloguePromotion } from "./quote-pricing";
import { CUSTOM_COLOR_SURCHARGE_USD, supportsCustomColor } from "./vehicle-customization";
import { buildVehicleConfigurationRows, buildVehicleFactRows, formatRowsForHistory } from "./vehicle-document-details";
import { normalizeFuelPreference } from "./fuel-options";
import type { AdminQuoteItemInput } from "./crm";

export type RequestedQuoteVehicle = { slug: string; qty: number; customColor: boolean; customColorName: string | null };
export type BuiltQuoteListingItem = { item: AdminQuoteItemInput; cataloguePriceUsd: number; bodyType: string; condition: string };

function buildItemFromListing({ slug, qty, customColor, customColorName }: RequestedQuoteVehicle): BuiltQuoteListingItem | null {
  const indexEntry = getVehicleIndexEntryBySlug(slug);
  const detail = getVehicleBySlug(slug);
  if (!indexEntry || !detail || detail.priceCNY == null) return null;
  const selectedFuel = normalizeFuelPreference(detail.fuel ?? indexEntry.fuel);
  const includeCustomColor = customColor && supportsCustomColor(detail.bodyType);
  const images = rankVehicleImages(detail.images).slice(0, 5).map((file) => imagePath(detail.site, detail.id, file));
  const colorLabel = includeCustomColor ? `Custom color requested${customColorName ? `: ${customColorName}` : ""} (+$${CUSTOM_COLOR_SURCHARGE_USD} USD)` : null;
  const specParts = [detail.year, indexEntry.brand, indexEntry.model, detail.mileageKm != null ? `${detail.mileageKm.toLocaleString("en-US")} km` : null, detail.color, colorLabel, `Fuel requested: ${selectedFuel}`, indexEntry.transmission, detail.driveType, detail.bodyType, detail.specs.Displacement ? `Displacement: ${detail.specs.Displacement}` : null, detail.location ? `Located in ${detail.location}` : null].filter(Boolean);
  const configurationRows = buildVehicleConfigurationRows(detail, indexEntry);
  const factRows = buildVehicleFactRows(detail, indexEntry);
  const baseFobUsd = Math.round(convertFromCNY(detail.priceCNY, "USD") * 100) / 100;
  const fobUsd = includeCustomColor ? Math.round((baseFobUsd + CUSTOM_COLOR_SURCHARGE_USD) * 100) / 100 : baseFobUsd;
  return {
    item: {
      make: indexEntry.brand, model: indexEntry.model, year: detail.year, condition: indexEntry.condition,
      mileageKm: detail.mileageKm, fuelType: selectedFuel, engine: detail.specs.Displacement ?? detail.specs.Engine ?? null,
      transmission: indexEntry.transmission, drivetrain: detail.driveType,
      exteriorColor: includeCustomColor ? `Custom color${customColorName ? `: ${customColorName}` : ""}` : detail.color,
      interiorColor: detail.specs["Interior Color"] ?? null,
      capacity: Number.parseInt(detail.specs.Capacity ?? detail.specs["Capacity (people/seats)"] ?? "", 10) || null,
      historyNotes: formatRowsForHistory([...factRows, ...configurationRows]), specSummary: specParts.join(" · "), qty,
      fobOriginal: fobUsd, discount: 0, fobFinal: fobUsd, photos: images.map((url) => ({ url, caption: null })),
    },
    cataloguePriceUsd: baseFobUsd,
    bodyType: detail.bodyType ?? "car",
    condition: indexEntry.condition,
  };
}

export function buildQuoteListingItems(requested: RequestedQuoteVehicle[]) {
  const built = requested.map(buildItemFromListing).filter((item): item is BuiltQuoteListingItem => item !== null);
  const promotionApplies = qualifiesForCataloguePromotion(built.map(({ cataloguePriceUsd }) => cataloguePriceUsd));
  const items = built.map(({ item, cataloguePriceUsd, ...vehicle }) => {
    if (!promotionApplies || !isCataloguePromotionEligible(cataloguePriceUsd)) return { ...vehicle, item };
    const promotionalPrice = Math.min(item.fobFinal, CATALOGUE_PROMOTION.promotionalUnitPriceUsd);
    return { ...vehicle, item: { ...item, discount: Math.max(0, Math.round((item.fobOriginal - promotionalPrice) * 100) / 100), fobFinal: promotionalPrice, specSummary: `${item.specSummary ?? ""} · Catalogue promotion: USD ${promotionalPrice.toLocaleString("en-US")} per vehicle`.replace(/^ · /, "") } };
  });
  return { items, promotionApplies };
}
