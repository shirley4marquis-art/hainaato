import { NextRequest, NextResponse } from "next/server";
import { getVehicleBySlug } from "../../../lib/vehicle-details";
import { rankVehicleImages } from "../../../lib/image-ranking";
import { imagePath } from "../../../lib/format";
import { COMPARE_MAX } from "../../../lib/compare-constants";

export async function GET(request: NextRequest) {
  const slugsParam = request.nextUrl.searchParams.get("slugs") || "";
  const slugs = [...new Set(slugsParam.split(",").map((s) => s.trim()).filter(Boolean))].slice(0, COMPARE_MAX);

  const vehicles = slugs
    .map((slug) => getVehicleBySlug(slug))
    .filter((v): v is NonNullable<typeof v> => v !== null)
    .map((v) => ({
      slug: v.slug,
      title: v.title,
      year: v.year,
      priceCNY: v.priceCNY,
      mileageKm: v.mileageKm,
      fuel: v.fuel,
      bodyType: v.bodyType,
      gearbox: v.gearbox,
      driveType: v.driveType,
      color: v.color,
      location: v.location,
      image: rankVehicleImages(v.images).slice(0, 1).map((file) => imagePath(v.site, v.id, file))[0] ?? null,
    }));

  return NextResponse.json({ vehicles });
}
