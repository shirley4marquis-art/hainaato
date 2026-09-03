import fs from "node:fs";
import path from "node:path";
import {
  normalizeBodyType,
  normalizeColor,
  normalizeFuel,
  type VehicleIndexEntry,
} from "./format";

export type { Vehicle, VehicleIndexEntry, VehicleSite } from "./format";
export { formatCNY, formatKm, imagePath } from "./format";

export const CATALOGUE_COLLECTIONS = [
  { id: "heavy-duty-trucks", title: "Heavy-duty trucks", shortTitle: "Heavy duty", copy: "Tractor heads, dump trucks and high-capacity workhorses.", bodyTypes: ["heavy truck", "tractor truck", "dump truck"] },
  { id: "trucks", title: "Trucks", shortTitle: "Trucks", copy: "Commercial trucks for haulage, delivery and daily operations.", bodyTypes: ["truck"] },
  { id: "pickups", title: "Pickup trucks", shortTitle: "Pickups", copy: "Double-cab and utility pickups ready for work or recreation.", bodyTypes: ["pickup", "pickup truck"] },
  { id: "vans-buses", title: "Vans & buses", shortTitle: "Vans & buses", copy: "Passenger transport, crew vans and practical cargo carriers.", bodyTypes: ["van", "minivan", "bus", "commercial vehicles/mpvs"] },
  { id: "suvs", title: "SUVs & off-road", shortTitle: "SUVs", copy: "Versatile family, city and all-terrain vehicles.", bodyTypes: ["suv", "off-road vehicle/suv"] },
  { id: "passenger-cars", title: "Passenger cars", shortTitle: "Cars", copy: "Sedans, hatchbacks, wagons and coupes for everyday driving.", bodyTypes: ["car", "passenger car", "sedan", "hatchback", "station wagon", "coupe", "convertible", "sports car"] },
] as const;

const dataDir = path.join(process.cwd(), "data");

// Bump when manually curated inventory is added so deployment build caches
// cannot reuse a server bundle traced against an older catalogue snapshot.
export const VEHICLE_CATALOG_REVISION = "2026-09-03-escalade-v";

let indexCache: VehicleIndexEntry[] | null = null;

function loadIndex(): VehicleIndexEntry[] {
  if (!indexCache) {
    const raw = fs.readFileSync(path.join(dataDir, "vehicles-index.json"), "utf-8");
    indexCache = JSON.parse(raw);
  }
  return indexCache!;
}

let indexBySlugCache: Map<string, VehicleIndexEntry> | null = null;

// Index-side fields (brand/model/condition/stockCode/transmission) aren't on
// the full Vehicle detail type (lib/format.ts) — callers that need both (e.g.
// building a quote line item from a cart slug) look up here for those and
// getVehicleBySlug (lib/vehicle-details.ts) for images/specs/mileage.
export function getVehicleIndexEntryBySlug(slug: string): VehicleIndexEntry | null {
  if (!indexBySlugCache) {
    indexBySlugCache = new Map(loadIndex().map((v) => [v.slug, v]));
  }
  return indexBySlugCache.get(slug) ?? null;
}

export function getSitemapVehicleEntries(): Pick<VehicleIndexEntry, "slug" | "listedAt" | "availability">[] {
  return loadIndex().map(({ slug, listedAt, availability }) => ({ slug, listedAt, availability }));
}

export function getFilterOptions(scope?: { condition?: "new" | "used" }) {
  const index = scope?.condition ? loadIndex().filter((v) => v.condition === scope.condition) : loadIndex();
  const fuels = new Map<string, string>();
  const bodyTypes = new Map<string, string>();
  const brands = new Set<string>();
  const modelCounts = new Map<string, number>();
  const colorCounts = new Map<string, number>();
  let minPrice = Infinity;
  let maxPrice = 0;

  for (const v of index) {
    if (v.brand && !/^\d+$/.test(v.brand.trim())) brands.add(v.brand);
    if (v.model && !/^\d+$/.test(v.model.trim())) {
      modelCounts.set(v.model, (modelCounts.get(v.model) ?? 0) + 1);
    }
    if (v.fuel) {
      const label = normalizeFuel(v.fuel);
      fuels.set(label.toLowerCase(), label);
    }
    if (v.bodyType) {
      const label = normalizeBodyType(v.bodyType);
      bodyTypes.set(label.toLowerCase(), label);
    }
    if (v.color) {
      const label = normalizeColor(v.color);
      colorCounts.set(label, (colorCounts.get(label) ?? 0) + 1);
    }
    if (v.priceCNY != null) {
      minPrice = Math.min(minPrice, v.priceCNY);
      maxPrice = Math.max(maxPrice, v.priceCNY);
    }
  }

  return {
    fuels: [...fuels.values()].sort(),
    bodyTypes: [...bodyTypes.values()].sort(),
    brands: [...brands].sort((a,b)=>a.localeCompare(b)),
    models: [...modelCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 250)
      .map(([model]) => model),
    colors: [...colorCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,12).map(([color])=>color),
    minPrice: Number.isFinite(minPrice) ? minPrice : 0,
    maxPrice,
  };
}

export type VehicleSearchParams = {
  q?: string;
  collection?: string;
  type?: string;
  fuel?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  model?: string;
  condition?: "new" | "used";
  availability?: "available" | "reserved" | "sold";
  minYear?: number;
  maxYear?: number;
  minMileage?: number;
  maxMileage?: number;
  sort?: "latest" | "price-asc" | "price-desc";
  page?: number;
  pageSize?: number;
};

export function searchVehicles(params: VehicleSearchParams) {
  const index = loadIndex();
  const {
    q,
    collection,
    type,
    fuel,
    color,
    minPrice,
    maxPrice,
    brand,
    model,
    condition,
    availability,
    minYear,
    maxYear,
    minMileage,
    maxMileage,
    sort = "latest",
    page = 1,
    pageSize = 24,
  } = params;

  let results = index;

  if (q) {
    const needle = q.trim().toLowerCase();
    if (needle) results = results.filter((v) => `${v.title} ${v.stockCode}`.toLowerCase().includes(needle));
  }
  if (collection) {
    const selected = CATALOGUE_COLLECTIONS.find((item) => item.id === collection);
    if (selected) {
      const bodyTypes = new Set<string>(selected.bodyTypes);
      results = results.filter((v) => v.bodyType && bodyTypes.has(normalizeBodyType(v.bodyType).toLowerCase()));
    }
  }
  if (brand) results = results.filter((v)=>v.brand.toLowerCase()===brand.toLowerCase());
  if (model) results = results.filter((v)=>v.model.toLowerCase().includes(model.toLowerCase()));
  if (condition) results = results.filter((v)=>v.condition===condition);
  if (availability) results = results.filter((v)=>v.availability===availability);
  if (minYear != null) results = results.filter((v)=>v.year!=null&&v.year>=minYear);
  if (maxYear != null) results = results.filter((v)=>v.year!=null&&v.year<=maxYear);
  if (minMileage != null) results = results.filter((v)=>v.mileageKm!=null&&v.mileageKm>=minMileage);
  if (maxMileage != null) results = results.filter((v)=>v.mileageKm!=null&&v.mileageKm<=maxMileage);
  if (type) {
    const needle = type.toLowerCase();
    results = results.filter((v) => v.bodyType && normalizeBodyType(v.bodyType).toLowerCase() === needle);
  }
  if (fuel) {
    const needle = fuel.toLowerCase();
    results = results.filter((v) => v.fuel && normalizeFuel(v.fuel).toLowerCase() === needle);
  }
  if (color) {
    const needle = color.toLowerCase();
    results = results.filter((v) => v.color && normalizeColor(v.color).toLowerCase() === needle);
  }
  if (minPrice != null) {
    results = results.filter((v) => v.priceCNY != null && v.priceCNY >= minPrice);
  }
  if (maxPrice != null) {
    results = results.filter((v) => v.priceCNY != null && v.priceCNY <= maxPrice);
  }

  results =
    sort === "price-asc"
      ? [...results].sort((a, b) => (a.priceCNY ?? Infinity) - (b.priceCNY ?? Infinity))
      : sort === "price-desc"
        ? [...results].sort((a, b) => (b.priceCNY ?? 0) - (a.priceCNY ?? 0))
        : prioritizeToyotaSources(results);

  const total = results.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    vehicles: results.slice(start, start + pageSize),
    total,
    page: safePage,
    totalPages,
    pageSize,
  };
}

export function getTotalVehicleCount(): number {
  return loadIndex().length;
}

export function getFeaturedVehicles(count: number): VehicleIndexEntry[] {
  const index = loadIndex();
  const withPrice = index.filter((v) => v.priceCNY != null && v.imageCount > 0);
  const step = Math.max(1, Math.floor(withPrice.length / count));
  const picks: VehicleIndexEntry[] = [];
  for (let i = 0; i < withPrice.length && picks.length < count; i += step) {
    picks.push(withPrice[i]);
  }
  return picks;
}

export function getLatestVehicles(count=10):VehicleIndexEntry[]{
  return loadIndex().filter(v=>v.imageCount>0&&v.availability==="available").slice(0,count);
}

function isToyotaTruck(vehicle: VehicleIndexEntry): boolean {
  return /pickup|truck/i.test(vehicle.bodyType ?? "") || /hilux|tundra|tacoma|land cruiser|pickup|truck/i.test(vehicle.title);
}

// Keep the catalogue's overall brand mix and arrival positions stable, but
// reorder the Toyota entries occupying those positions. China/Japan-sourced
// trucks lead, other non-Hendrick Toyotas follow, and Hendrick inventory is
// moved to the end of the Toyota sequence. Explicit price sorts remain exact.
function prioritizeToyotaSources(vehicles: VehicleIndexEntry[]): VehicleIndexEntry[] {
  const toyotaPositions: number[] = [];
  const toyotas: VehicleIndexEntry[] = [];
  vehicles.forEach((vehicle, index) => {
    if (vehicle.brand.trim().toLowerCase() !== "toyota") return;
    toyotaPositions.push(index);
    toyotas.push(vehicle);
  });
  if (toyotas.length < 2) return vehicles;

  const prioritized = [...toyotas].sort((a, b) => {
    const rank = (vehicle: VehicleIndexEntry) => {
      if (vehicle.site === "hendrick") return 2;
      return isToyotaTruck(vehicle) ? 0 : 1;
    };
    return rank(a) - rank(b);
  });
  const result = [...vehicles];
  toyotaPositions.forEach((position, index) => {
    result[position] = prioritized[index];
  });
  return result;
}

// Models pinned to the front of the homepage's "Latest new-car arrivals" list
// (both the desktop grid and the mobile rail, which just shows this list's
// first few) so they show up regardless of scrape order.
const FEATURED_LATEST_MODELS = ["2025 ford ranger", "tesla 2026 model y", "highlander", "rav4", "corolla"];

// Stable, image-checked pickup mix for the homepage. The red JAC T9 is the
// lead arrival, followed by distinct export-ready pickup brands rather than
// multiple near-identical listings of one model.
const HOMEPAGE_PICKUP_FEATURE_SLUGS = [
  "hongyu-jac-t9-hunter",
  "hainaauto-396625194", // 2025 Ford Ranger
  "hainaauto-322521604", // 2025 Great Wall Mountain & Sea Cannon
  "hainaauto-606715558", // 2025 Jiangling Baodian
  "hainaauto-794915700", // 2025 Qiyuan Hunter K50
];

// Keep the final homepage positions varied across the brands customers ask
// about most. Exact slugs make the selection stable when inventory is rebuilt.
const HOMEPAGE_BRAND_BACKFILL_SLUGS = [
  "hainaauto-68109381", // BYD Qin PLUS — wide, consistent exterior preview
  "hainaauto-554119966", // BMW 5 Series — wide, consistent exterior preview
  "hainaauto-618413790", // Mercedes-Benz GLC
];

// Kept out of the homepage spotlight specifically — hainaauto-33511934's photo
// set had 6 of 12 images belonging to unrelated vehicles (two different
// sedans and a black Tang, mixed in with the actual white Song Pro). The
// stray images were removed from its own listing (data/vehicles/), but it's
// still excluded here rather than risk showing more of the same on the
// homepage where it's most visible.
// Listings excluded from homepage previews when their source imagery does not
// meet the presentation standard. The listing remains available in search and
// on its own detail page; only promotional homepage placements are affected.
const HOMEPAGE_PREVIEW_EXCLUDE = new Set([
  "hainaauto-33511934",
  "hainaauto-66605435",
  "hendrick-1394491573",
  "hendrick-192411905",
  "hainaauto-207819861",
]);

export function isHomepagePreviewEligible(vehicle: VehicleIndexEntry): boolean {
  return !HOMEPAGE_PREVIEW_EXCLUDE.has(vehicle.slug);
}

export function getLatestNewVehicles(count=10):VehicleIndexEntry[]{
  const index = loadIndex();
  const pickupFeatureSlugs = new Set(HOMEPAGE_PICKUP_FEATURE_SLUGS);
  const pickupFeatures = HOMEPAGE_PICKUP_FEATURE_SLUGS
    .map((slug) => index.find((vehicle) => vehicle.slug === slug))
    .filter(
      (vehicle): vehicle is VehicleIndexEntry =>
        Boolean(
          vehicle &&
            vehicle.imageCount > 0 &&
            vehicle.availability === "available" &&
            vehicle.condition === "new" &&
            isHomepagePreviewEligible(vehicle)
        )
    );
  const backfillSlugs = new Set(HOMEPAGE_BRAND_BACKFILL_SLUGS);
  const brandBackfills = HOMEPAGE_BRAND_BACKFILL_SLUGS
    .map((slug) => index.find((vehicle) => vehicle.slug === slug))
    .filter(
      (vehicle): vehicle is VehicleIndexEntry =>
        Boolean(
          vehicle &&
            vehicle.imageCount > 0 &&
            vehicle.availability === "available" &&
            vehicle.condition === "new" &&
            isHomepagePreviewEligible(vehicle)
        )
    );
  const pool = index.filter(
    (v) =>
      v.imageCount > 0 &&
      v.availability === "available" &&
      ((v.condition === "new" && v.year === 2026) || titleForHomepage(v).includes("2025 ford ranger")) &&
      isHomepagePreviewEligible(v) &&
      !pickupFeatureSlugs.has(v.slug) &&
      !backfillSlugs.has(v.slug)
  );
  const featured: VehicleIndexEntry[] = [];
  const rest: VehicleIndexEntry[] = [];
  const claimedModels = new Set<string>();
  for (const v of pool) {
    const title = v.title.toLowerCase();
    const model = FEATURED_LATEST_MODELS.find((m) => !claimedModels.has(m) && title.includes(m));
    if (model) {
      claimedModels.add(model);
      featured.push(v);
    } else {
      rest.push(v);
    }
  }
  const featuredOrder = new Map(FEATURED_LATEST_MODELS.map((model, index) => [model, index]));
  featured.sort((a, b) => {
    const aTitle = a.title.toLowerCase();
    const bTitle = b.title.toLowerCase();
    const aOrder = FEATURED_LATEST_MODELS.find((model) => aTitle.includes(model));
    const bOrder = FEATURED_LATEST_MODELS.find((model) => bTitle.includes(model));
    return (featuredOrder.get(aOrder ?? "") ?? Number.MAX_SAFE_INTEGER) - (featuredOrder.get(bOrder ?? "") ?? Number.MAX_SAFE_INTEGER);
  });
  const arrivals = [...featured, ...rest].slice(
    0,
    Math.max(0, count - pickupFeatures.length - brandBackfills.length)
  );
  return [...pickupFeatures, ...arrivals, ...brandBackfills].slice(0, count);
}

function titleForHomepage(vehicle: VehicleIndexEntry): string {
  return vehicle.title.toLowerCase();
}

export function getBrandAggregates(limit=24){
  const counts=new Map<string,number>();
  for(const vehicle of loadIndex()){
    if(!vehicle.brand||/^\d+$/.test(vehicle.brand.trim())) continue;
    counts.set(vehicle.brand,(counts.get(vehicle.brand)??0)+1);
  }
  return [...counts.entries()].map(([brand,count])=>({brand,count})).sort((a,b)=>b.count-a.count).slice(0,limit);
}
