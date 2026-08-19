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

const dataDir = path.join(process.cwd(), "data");

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

export function getFilterOptions(scope?: { condition?: "new" | "used" }) {
  const index = scope?.condition ? loadIndex().filter((v) => v.condition === scope.condition) : loadIndex();
  const fuels = new Map<string, string>();
  const bodyTypes = new Map<string, string>();
  const brands = new Set<string>();
  const colorCounts = new Map<string, number>();
  let minPrice = Infinity;
  let maxPrice = 0;

  for (const v of index) {
    if (v.brand && !/^\d+$/.test(v.brand.trim())) brands.add(v.brand);
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
    colors: [...colorCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,12).map(([color])=>color),
    minPrice: Number.isFinite(minPrice) ? minPrice : 0,
    maxPrice,
  };
}

export type VehicleSearchParams = {
  q?: string;
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
        : results;

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

// Models pinned to the front of the homepage's "Latest new-car arrivals" list
// (both the desktop grid and the mobile rail, which just shows this list's
// first few) so they show up regardless of scrape order.
const FEATURED_LATEST_MODELS = ["2025 ford ranger", "tesla 2026 model y", "highlander", "rav4", "corolla"];

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
  const pool = loadIndex().filter(
    (v) =>
      v.imageCount > 0 &&
      v.availability === "available" &&
      ((v.condition === "new" && v.year === 2026) || titleForHomepage(v).includes("2025 ford ranger")) &&
      isHomepagePreviewEligible(v)
  );
  const jacT8 = loadIndex().find(
    (v) => v.title.toLowerCase().includes("jac t8") && v.imageCount > 0 && v.availability === "available" && isHomepagePreviewEligible(v)
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
  const arrivals = [...featured, ...rest].slice(0, jacT8 ? Math.max(0, count - 1) : count);
  return jacT8 ? [...arrivals, jacT8] : arrivals;
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
