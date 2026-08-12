import { NextRequest, NextResponse } from "next/server";
import { getVehicleBySlug } from "../../../../../../lib/vehicle-details";
import type { VehicleSite } from "../../../../../../lib/format";

const UPSTREAM: Record<VehicleSite, (file: string) => string> = {
  hainaauto: (file) => `https://img.hainaauto.com/vehicle/${encodeURIComponent(file)}`,
  cntransit: (file) => `https://cntransit.cn/uploads/${encodeURIComponent(file)}`,
};

function isVehicleSite(value: string): value is VehicleSite {
  return value === "hainaauto" || value === "cntransit";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ site: string; id: string; file: string }> }
) {
  const { site, id, file } = await params;

  if (!isVehicleSite(site)) {
    return NextResponse.json({ error: "Unknown site." }, { status: 404 });
  }

  // Route params come pre-decoded by Next.js; matched against the vehicle's own
  // image list exactly as stored, so a filename that belongs to a different
  // vehicle (or doesn't exist at all) is rejected before it ever reaches the CDN.
  const vehicle = getVehicleBySlug(`${site}-${id}`);
  if (!vehicle || !vehicle.images.includes(file)) {
    return NextResponse.json({ error: "Image not found for this vehicle." }, { status: 404 });
  }

  // Proxied rather than redirected: Next's built-in Image Optimizer fetches
  // "local" (relative) src URLs itself and rejects a redirect response as an
  // invalid internal response, so this has to return the image bytes directly.
  let upstream: Response;
  try {
    upstream = await fetch(UPSTREAM[site](file));
  } catch {
    return NextResponse.json({ error: "Could not reach the image source." }, { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Image source returned an error." }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
