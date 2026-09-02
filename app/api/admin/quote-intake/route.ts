import { NextResponse } from "next/server";
import { getVehicleBySlug } from "../../../../lib/vehicle-details";
import { imagePath, normalizeFuel } from "../../../../lib/format";
import { rankVehicleImages } from "../../../../lib/image-ranking";
import { getVehicleIndexEntryBySlug } from "../../../../lib/vehicles";
import { convertFromCNY } from "../../../../lib/currency";

type IntakeRequest = { urls?: string[] };

function slugFromVehicleUrl(value: string): string | null {
  try {
    const url = new URL(value, "https://www.nindgeauto.com");
    if (!new Set(["nindgeauto.com", "www.nindgeauto.com", "hainautocn.com", "www.hainautocn.com", "localhost"]).has(url.hostname)) return null;
    const match = url.pathname.match(/^\/vehicles\/([^/?#]+)\/?$/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch { return null; }
}

function usdFromCNY(cny: number | null | undefined): number {
  if (cny == null) return 0;
  return Number(convertFromCNY(cny, "USD").toFixed(2));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as IntakeRequest | null;
  const urls = [...new Set((body?.urls ?? []).filter((url): url is string => typeof url === "string"))].slice(0, 10);
  const vehicles = urls.map((sourceUrl) => {
    const slug = slugFromVehicleUrl(sourceUrl);
    if (!slug) return { sourceUrl, error: "Not a valid HainaAuto vehicle link." };
    const vehicle = getVehicleBySlug(slug);
    if (!vehicle) return { sourceUrl, error: "Vehicle was not found in the current catalogue." };
    const indexEntry = getVehicleIndexEntryBySlug(slug);
    const titleParts = vehicle.title.trim().split(/\s+/);
    const make = indexEntry?.brand || titleParts.shift() || "Vehicle";
    const fuelType = (indexEntry?.fuel || vehicle.fuel) ? normalizeFuel(indexEntry?.fuel || vehicle.fuel || "") : null;
    const usdPrice = usdFromCNY(vehicle.priceCNY);
    const photos = rankVehicleImages(vehicle.images).slice(0, 4).map((file, index) => ({
      url: imagePath(vehicle.site, vehicle.id, file), caption: index === 0 ? "Main vehicle view" : `Vehicle view ${index + 1}`,
    }));
    return {
      sourceUrl: `https://www.nindgeauto.com/vehicles/${encodeURIComponent(vehicle.slug)}`,
      item: {
        make, model: indexEntry?.model || titleParts.join(" ") || vehicle.title, year: vehicle.year,
        condition: indexEntry?.condition ?? (vehicle.mileageKm === 0 ? "new" : "used"), mileageKm: vehicle.mileageKm,
        fuelType: fuelType ?? undefined, transmission: vehicle.gearbox, drivetrain: vehicle.driveType,
        exteriorColor: vehicle.color, qty: 1, fobOriginal: usdPrice,
        discount: 0, fobFinal: usdPrice, historyNotes: `Vehicle link: https://www.nindgeauto.com/vehicles/${vehicle.slug}`,
        specSummary: [vehicle.bodyType, fuelType, vehicle.gearbox, vehicle.driveType].filter(Boolean).join(" · ") || vehicle.overview,
        photos,
      },
    };
  });
  return NextResponse.json({ ok: true, currency: "USD", vehicles });
}
