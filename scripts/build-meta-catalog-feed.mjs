// Generates public/meta-catalog-feed.csv — a Meta commerce product feed
// (https://www.facebook.com/business/help/120325381656392) covering a
// curated selection of the catalogue, capped at TOTAL_CAP vehicles and
// weighted toward 4x4 trucks (see below). Point Commerce Manager's
// scheduled data feed at https://hainaauto.com/meta-catalog-feed.csv to
// sync it into the catalog linked to the WhatsApp Business Account, which
// drives the WhatsApp catalog tab.
//
// This is a static file (not a live API route) on purpose: an uncapped feed
// runs ~8MB and Vercel serverless functions cap response bodies at 4.5MB,
// so it's generated here and served straight from the CDN instead.
//
// Re-run manually with `npm run data:catalog-feed` whenever
// data/vehicles-index.json changes (i.e. after `npm run data:build`).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const indexPath = path.join(root, "data", "vehicles-index.json");
const shardsDir = path.join(root, "data", "vehicle-detail-shards");
const outPath = path.join(root, "public", "meta-catalog-feed.csv");

// Must be the exact host that returns 200 directly — no redirect. The bare
// domain (hainautocn.com, no "www") 308-redirects to the www subdomain,
// and Meta's catalog crawler doesn't follow redirects on image_link/
// additional_image_link, so every image URL built from the bare domain
// silently fails ingestion. Confirmed by curl: bare domain -> 308, www -> 200.
const SITE_URL = process.env.META_CATALOG_SITE_URL ?? "https://www.nindgeauto.com";
// Meta's product feed spec caps additional_image_link at 10 URLs (11 photos
// total per listing including image_link) — this is that ceiling, not an
// arbitrary trim.
const MAX_ADDITIONAL_IMAGES = 10;

// vehicles-index.json only carries each vehicle's first 4 images (thumb +
// thumbs, used for card grids across the site — see scripts/build-vehicles.mjs).
// The feed used to source additional_image_link from that same capped list,
// which meant most listings showed at most 2-3 extra photos regardless of how
// many were actually available. Now that the feed is a curated 2000 rather
// than the full ~15k catalogue, the size budget easily allows pulling each
// vehicle's *full* gallery from its detail shard instead — same
// slug -> shard hash lib/vehicle-details.ts uses at request time, cached here
// per shard so we only read each of the 64 shard files once.
const DETAIL_SHARD_COUNT = 64;
const shardCache = new Map();

function detailShardForSlug(slug) {
  let hash = 2166136261;
  for (let i = 0; i < slug.length; i += 1) {
    hash ^= slug.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % DETAIL_SHARD_COUNT;
}

function fullImagesFor(v) {
  const shardNumber = detailShardForSlug(v.slug);
  let shard = shardCache.get(shardNumber);
  if (!shard) {
    shard = JSON.parse(fs.readFileSync(path.join(shardsDir, `${shardNumber}.json`), "utf8"));
    shardCache.set(shardNumber, shard);
  }
  return shard[v.slug]?.images ?? v.thumbs ?? [];
}

// Same snapshot CNY->USD rate as lib/currency.ts (RATE_PER_CNY.USD) — keep in
// sync with that file. Meta's product feed spec wants a single currency per
// feed, and USD matches DEFAULT_CURRENCY there.
const USD_PER_CNY = 0.139;

// Feed is capped and curated rather than dumping the full catalogue. The
// commercial priority is heavy-duty trucks, trucks, then pickups. Remaining
// capacity is shared across vans/buses, SUVs and passenger cars.
// Whatever budget is left after those priority groups is split across the
// remaining body-type buckets
// in proportion to how much inventory each one has, so a single rare bucket
// can't crowd out common ones and vice versa. Each bucket is then evenly
// sampled across its own listings (not just the first N) so the result
// isn't biased toward one dealer/site's scrape order.
const TOTAL_CAP = 2000;
const FOUR_WHEEL_TITLE_RE = /4wd|4x4|awd|all-wheel|four-wheel/i;
const PINNED_LISTING_SLUGS = new Set([
  "hainaauto-manual-cadillac-escalade-v-2026",
]);

const isPickup = (v) => /^(pickup|pickup truck)$/.test((v.bodyType ?? "").trim().toLowerCase());
const isSuv = (v) => /^(suv|off-road vehicle\/suv)$/.test((v.bodyType ?? "").trim().toLowerCase());
const isPassenger = (v) => /^(car|passenger car|sedan|hatchback|station wagon|coupe|convertible|sports car)$/.test((v.bodyType ?? "").trim().toLowerCase());
const isVanBus = (v) => /^(van|minivan|bus|commercial vehicles\/mpvs)$/.test((v.bodyType ?? "").trim().toLowerCase());
const HEAVY_TRUCK_BODY_RE = /dump truck|tipper|tractor truck|mixer truck|heavy truck|machinery|equipment/i;
const HEAVY_TRUCK_TITLE_RE = /dump truck|tipper|tractor truck|truck head|mixer truck|cement mixer|heavy truck|semi[- ]?truck|howo|sinotruk|shacman/i;
const isHeavyTruck = (v) => !isPickup(v) && (HEAVY_TRUCK_BODY_RE.test(v.bodyType ?? "") || HEAVY_TRUCK_TITLE_RE.test(v.title));
const isTruck = (v) => !isHeavyTruck(v) && !isPickup(v) && /truck|lorry/i.test(`${v.bodyType ?? ""} ${v.title}`);

// Same buckets curateSelection() sorts into, exposed as the
// broad-to-narrow category label Meta's product_type field expects
// (https://www.facebook.com/business/help/120325381656392) — e.g.
// "4x4 Trucks > Toyota > Hilux". Category comes first so a rule-based
// Collection in Commerce Manager can filter on "starts with 4x4 Trucks".
function categoryLabel(v) {
  if (isHeavyTruck(v)) return "Heavy-Duty Trucks";
  if (isTruck(v)) return "Trucks";
  if (isPickup(v)) return "Pickup Trucks";
  if (isVanBus(v)) return "Vans & Buses";
  if (isSuv(v)) return "SUVs & Off-Road";
  if (isPassenger(v)) return "Passenger Cars";
  return "Specialty Vehicles";
}

const categoryPriority = {
  "Heavy-Duty Trucks": "priority_01_heavy_duty_trucks",
  Trucks: "priority_02_trucks",
  "Pickup Trucks": "priority_03_pickups",
  "Vans & Buses": "priority_04_vans_buses",
  "SUVs & Off-Road": "priority_05_suvs",
  "Passenger Cars": "priority_06_passenger_cars",
  "Specialty Vehicles": "priority_07_specialty",
};

function productType(v, brand) {
  const parts = [categoryLabel(v), brand, v.model].filter(Boolean);
  return parts.join(" > ");
}

// Commerce Manager's product-set Value field is a type-ahead dropdown over
// values already present in the catalog, not free text — so filtering on
// product_type (a unique "Category > Brand > Model" string per listing) never
// offers a "4x4 Trucks" option to pick, only ~800 individual full strings.
// custom_label_0 carries just the bare category, so
// it shows up as a short, pickable list: Attribute "Custom label 0",
// Condition "is any of these", Value "4x4 Trucks".
function customLabel0(v) {
  return categoryLabel(v);
}

// Deterministic even-stride sample of `count` items spread across `list`,
// rather than just the first `count` (which would skew toward whichever
// site/dealer happens to sort first).
function evenSample(list, count) {
  if (count >= list.length) return list;
  if (count <= 0) return [];
  const pinned = list.filter((vehicle) => PINNED_LISTING_SLUGS.has(vehicle.slug)).slice(0, count);
  const pool = list.filter((vehicle) => !PINNED_LISTING_SLUGS.has(vehicle.slug));
  const remaining = count - pinned.length;
  if (remaining <= 0) return pinned;
  const step = pool.length / remaining;
  return [...pinned, ...Array.from({ length: remaining }, (_, i) => pool[Math.floor(i * step)])];
}

// Within the 4x4 priority group, Toyota (Hilux, Land Cruiser, etc. — the
// brand this business's export buyers ask for most) leads the whole feed;
// every other brand's 4x4 truck/SUV follows after, in original order.
function sortTrucksToyotaFirst(priorityTrucks) {
  const toyota = priorityTrucks.filter((v) => v.brand === "Toyota");
  const rest = priorityTrucks.filter((v) => v.brand !== "Toyota");
  return [...toyota, ...rest];
}

function curateSelection(eligible) {
  const heavyTrucks = eligible.filter((v) => categoryLabel(v) === "Heavy-Duty Trucks");
  const trucks = eligible.filter((v) => categoryLabel(v) === "Trucks");
  const pickups = sortTrucksToyotaFirst(eligible.filter((v) => categoryLabel(v) === "Pickup Trucks"));
  const suvs = eligible.filter((v) => categoryLabel(v) === "SUVs & Off-Road");
  const fourByFourSuvs = suvs.filter((v) => FOUR_WHEEL_TITLE_RE.test(v.title));
  const suvRemainder = suvs.filter((v) => !FOUR_WHEEL_TITLE_RE.test(v.title));
  const passengerCars = eligible.filter((v) => categoryLabel(v) === "Passenger Cars");
  const vansAndBuses = eligible.filter((v) => categoryLabel(v) === "Vans & Buses");
  const other = eligible.filter((v) => categoryLabel(v) === "Specialty Vehicles");

  const remainderBuckets = [
    ["4x4 SUVs", fourByFourSuvs],
    ["Vans & buses", vansAndBuses],
    ["SUVs & off-road (non-4x4)", suvRemainder],
    ["Passenger cars", passengerCars],
    ["Specialty vehicles", other],
  ];
  const remainingBudget = Math.max(0, TOTAL_CAP - heavyTrucks.length - trucks.length - pickups.length);
  const remainderPoolSize = remainderBuckets.reduce((sum, [, list]) => sum + list.length, 0);
  const quotas = remainderBuckets.map(([, list]) =>
    remainderPoolSize > 0 ? Math.round((remainingBudget * list.length) / remainderPoolSize) : 0
  );
  // Rounding can drift the sum a couple of units off remainingBudget — true
  // it up against the largest bucket rather than leaving/exceeding budget.
  const drift = remainingBudget - quotas.reduce((a, b) => a + b, 0);
  const largest = quotas.indexOf(Math.max(...quotas));
  if (largest >= 0) quotas[largest] += drift;

  console.log(`Heavy-duty trucks (priority 1, all included): ${heavyTrucks.length}`);
  console.log(`Trucks (priority 2, all included): ${trucks.length}`);
  console.log(`Pickups (priority 3, all included): ${pickups.length}`);
  remainderBuckets.forEach(([label, list], i) => console.log(`${label}: ${quotas[i]} of ${list.length}`));

  return [
    ...heavyTrucks,
    ...trucks,
    ...pickups,
    ...remainderBuckets.flatMap(([, list], i) => evenSample(list, quotas[i])),
  ];
}

function imagePath(site, id, file) {
  if (site === "hendrick" || site === "hongyu" || site === "madeinchina" || site === "carfromjapan") return `${SITE_URL}/vehicle-images/${site}/${encodeURIComponent(id)}/${encodeURIComponent(file)}`;
  return `${SITE_URL}/api/vehicle-image/${site}/${encodeURIComponent(id)}/${encodeURIComponent(file)}`;
}

function csvField(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildDescription(v) {
  const parts = [
    v.year,
    v.brand,
    v.model,
    v.mileageKm != null ? `${v.mileageKm.toLocaleString("en-US")} km` : null,
    v.color,
    v.transmission,
    v.location ? `Located in ${v.location}` : null,
  ].filter(Boolean);
  return `${parts.join(" · ")}. Stock ${v.stockCode}. Sourced from China with full export support from HainaAuto.`;
}

const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));

// Required fields per Meta's product feed spec are price and image_link, so
// anything missing either can't be listed. All rows in the current index are
// already availability: "available", but the filter stays in case that changes.
const eligible = [...new Map(
  index
    .filter((v) => v.availability === "available" && v.priceCNY != null && v.thumb != null)
    .map((v) => [v.slug, v])
).values()];
const selected = curateSelection(eligible);

const header = ["id", "title", "description", "availability", "condition", "price", "image_link", "brand", "additional_image_link", "product_type", "custom_label_0", "custom_label_1"];
const lines = [header.join(",")];

let totalAdditionalImages = 0;
for (const v of selected) {
  const brand = v.brand && !/^\d+$/.test(v.brand.trim()) ? v.brand : "";
  const fullImages = fullImagesFor(v);
  const additionalImageFiles = fullImages.filter((t) => t !== v.thumb).slice(0, MAX_ADDITIONAL_IMAGES);
  totalAdditionalImages += additionalImageFiles.length;
  const additionalImages = additionalImageFiles.map((t) => imagePath(v.site, v.id, t)).join(",");

  const row = [
    v.slug,
    v.title,
    buildDescription(v),
    "in stock",
    v.condition,
    `${(v.priceCNY * USD_PER_CNY).toFixed(2)} USD`,
    imagePath(v.site, v.id, v.thumb),
    brand,
    additionalImages,
    productType(v, brand),
    customLabel0(v),
    categoryPriority[categoryLabel(v)],
  ];
  lines.push(row.map(csvField).join(","));
}
console.log(`Average additional images per listing: ${(totalAdditionalImages / selected.length).toFixed(1)}`);

fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
console.log(`Wrote ${selected.length} listings to ${path.relative(root, outPath)} (${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB)`);
