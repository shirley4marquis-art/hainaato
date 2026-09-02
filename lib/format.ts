// Pure helpers + shared types — safe to import from Client Components.
// Filesystem-backed data access lives in lib/vehicles.ts (server-only).

export type VehicleSite = "hainaauto" | "cntransit" | "hendrick" | "hongyu" | "madeinchina" | "carfromjapan";

export type VehicleIndexEntry = {
  slug: string;
  site: VehicleSite;
  id: string;
  title: string;
  year: number | null;
  priceCNY: number | null;
  mileageKm: number | null;
  fuel: string | null;
  bodyType: string | null;
  location: string | null;
  thumb: string | null;
  thumbs: string[];
  imageCount: number;
  color: string | null;
  brand: string;
  model: string;
  condition: "new" | "used";
  availability: "available" | "reserved" | "sold";
  transmission: string | null;
  stockCode: string;
  listedAt: string | null;
};

export type Vehicle = {
  slug: string;
  site: VehicleSite;
  id: string;
  url: string | null;
  title: string;
  year: number | null;
  priceCNY: number | null;
  msrpCNY: number | null;
  mileageKm: number | null;
  fuel: string | null;
  bodyType: string | null;
  gearbox: string | null;
  color: string | null;
  location: string | null;
  driveType: string | null;
  overview: string | null;
  specs: Record<string, string>;
  images: string[];
  // Photos this vehicle's gallery shared with a same-model sibling recorded
  // in a different color — separated out rather than mixed into `images`,
  // since they show a different physical unit, not this one. See
  // scripts/build-vehicles.mjs.
  otherColorPhotos: OtherColorPhoto[];
};

export type OtherColorPhoto = {
  file: string;
  color: string;
  slug: string;
  site: VehicleSite;
  id: string;
};

export function normalizeFuel(fuel: string): string {
  const f = fuel.trim().toLowerCase();
  if (f.includes("electric") || f === "ev") return "Electric";
  if (f.includes("hybrid")) return "Hybrid";
  if (f.includes("diesel")) return "Diesel";
  if (f.includes("gasoline") || f.includes("petrol")) return "Gasoline";
  return fuel.trim();
}

export function normalizeBodyType(bodyType: string): string {
  const b = bodyType.trim();
  return b.charAt(0).toUpperCase() + b.slice(1);
}

export function normalizeColor(color: string): string {
  const c = color.trim().toLowerCase();
  if (c.includes("white") || c.includes("pearl")) return "White";
  if (c.includes("black")) return "Black";
  if (c.includes("silver")) return "Silver";
  if (c.includes("gray") || c.includes("grey")) return "Gray";
  if (c.includes("blue")) return "Blue";
  if (c.includes("red")) return "Red";
  if (c.includes("green")) return "Green";
  if (c.includes("gold")) return "Gold";
  if (c.includes("brown") || c.includes("champagne")) return "Brown";
  if (c.includes("orange")) return "Orange";
  if (c.includes("yellow")) return "Yellow";
  if (c.includes("purple")) return "Purple";
  return color.trim().charAt(0).toUpperCase() + color.trim().slice(1);
}

// Routed through /api/vehicle-image instead of the upstream CDN directly so the
// URL — and therefore every cache key (browser, CDN, Next Image Optimizer) — is
// scoped to (site, id, file) rather than just file. Filenames get reused across
// vehicles when the source data is re-scraped; without the id in the URL, a
// stale cached response for a reused filename would silently serve the wrong
// vehicle's photo. The route also verifies file actually belongs to that
// vehicle's own image list before redirecting to the upstream CDN.
export function imagePath(site: VehicleSite, id: string, file: string): string {
  if ((site === "hainaauto" && id.startsWith("manual-")) || site === "hendrick" || site === "hongyu" || site === "madeinchina" || site === "carfromjapan") {
    return `/vehicle-images/${site}/${encodeURIComponent(id)}/${encodeURIComponent(file)}`;
  }
  return `/api/vehicle-image/${site}/${encodeURIComponent(id)}/${encodeURIComponent(file)}`;
}

export type SP = Record<string, string | undefined>;

export function buildListUrl(basePath: string, params: SP, overrides: SP = {}): string {
  const merged = { ...params, ...overrides };
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v) qs.set(k, v);
  const s = qs.toString();
  return s ? `${basePath}?${s}` : basePath;
}

export function buildVehiclesUrl(params: SP, overrides: SP = {}): string {
  return buildListUrl("/vehicles", params, overrides);
}

export function formatCNY(n: number | null | undefined): string {
  if (n == null) return "Price on request";
  return `¥${n.toLocaleString("en-US")}`;
}

export const QUOTE_STATUS_LABELS: Record<string, string> = {
  quoted: "Quote received — under review",
  negotiating: "In discussion with our export desk",
  deposit_paid: "Deposit received — preparing order",
  paid_full: "Paid in full — preparing shipment",
  usdt_payment_confirmed: "USDT payment confirmed — order secured",
  bitcoin_payment_confirmed: "Bitcoin payment confirmed — order secured",
  inspection_scheduled: "On-site inspection scheduled",
  inspection_passed: "Inspection completed — report approved",
  export_docs_ready: "Export documents ready",
  booked_for_shipping: "Space booked — awaiting departure",
  shipped: "Shipped — in transit",
  departed_port: "Vessel departed origin port",
  arrived_port: "Just landed at destination port",
  customs_clearance: "Customs clearance in progress",
  out_for_delivery: "Cleared — out for final delivery",
  delivered: "Delivered",
  lost: "Closed",
};

export function formatKm(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n.toLocaleString("en-US")} km`;
}
