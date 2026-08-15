// Normalizes the raw scrapes in Auto-Shop/ into data/vehicles-index.json (listing) and
// data/vehicles/<slug>.json (detail). Re-run manually with `npm run data:build` whenever
// the scraped data under Auto-Shop/ changes — this is not run on every dev/build.
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const autoShop = path.join(root, "Auto-Shop");
const outDir = path.join(root, "data");
const outVehiclesDir = path.join(outDir, "vehicles");

fs.rmSync(outVehiclesDir, { recursive: true, force: true });
fs.mkdirSync(outVehiclesDir, { recursive: true });

function toNumber(v) {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

// Our real sale price is 60% of the scraped upstream price — applied here so
// it survives every future data:build rather than being a one-off patch.
// MSRP is left untouched: it's a separate real reference figure (factory
// suggested price), not "our" price.
const SALE_PRICE_MULTIPLIER = 0.6;

function normalize(raw, site) {
  const specs = raw.specs ?? {};
  const scrapedPriceCNY = toNumber(raw.price?.salePriceCNY);
  return {
    slug: `${site}-${raw.id}`,
    site,
    id: String(raw.id),
    url: raw.url ?? null,
    title: raw.title ?? "Untitled vehicle",
    year: raw.year ?? null,
    priceCNY: scrapedPriceCNY == null ? null : Math.round(scrapedPriceCNY * SALE_PRICE_MULTIPLIER),
    msrpCNY: toNumber(raw.price?.msrpCNY ?? specs["MSRP"]),
    mileageKm: toNumber(raw.mileage ?? specs["Mileage"]),
    fuel: raw.fuel ?? specs["Energy type"] ?? null,
    bodyType: specs["Body Type"] ?? null,
    gearbox: specs["Gearbox"] ?? null,
    color: specs["Body Color"] ?? null,
    location: specs["Location"] ?? null,
    driveType: specs["Drive Type"] ?? null,
    overview: raw.overview ?? null,
    specs,
    images: Array.isArray(raw.images) ? raw.images : [],
    // Populated below (after all vehicles are loaded) for photos this
    // vehicle's own gallery shares with a same-model sibling recorded in a
    // different color — pulled out of `images` rather than left mixed in,
    // since they depict a different physical unit's color, not this one's.
    otherColorPhotos: [],
  };
}

function writeVehicle(v) {
  fs.writeFileSync(
    path.join(outVehiclesDir, `${v.slug}.json`),
    JSON.stringify(v)
  );
}

function indexEntry(v) {
  // Titles are often "<year> <make> <model>...", so a leading year would otherwise
  // get picked up as the "brand" for a large fraction of listings.
  const titleWords = v.title.trim().replace(/^(19|20)\d{2}\s+/, "").split(/\s+/);
  const brand = titleWords[0]?.replace(/[^\p{L}\p{N}-]/gu, "") || "Other";
  return {
    slug: v.slug,
    site: v.site,
    id: v.id,
    title: v.title,
    year: v.year,
    priceCNY: v.priceCNY,
    mileageKm: v.mileageKm,
    fuel: v.fuel,
    bodyType: v.bodyType,
    location: v.location,
    thumb: v.images[0] ?? null,
    thumbs: v.images.slice(0, 4),
    imageCount: v.images.length,
    color: v.color,
    brand,
    model: titleWords.slice(1, 4).join(" ") || v.title,
    condition: v.mileageKm != null && v.mileageKm <= 100 ? "new" : "used",
    availability: "available",
    transmission: v.gearbox,
    stockCode: `${v.site === "hainaauto" ? "HA" : "CN"}-${v.id}`,
    listedAt: null,
  };
}

const index = [];
const details = {};

// --- hainaauto: manifest.jsonl already has one full record per line ---
async function loadHainaauto() {
  const manifestPath = path.join(autoShop, "hainaauto", "manifest.jsonl");
  if (!fs.existsSync(manifestPath)) return;
  const rl = readline.createInterface({
    input: fs.createReadStream(manifestPath, "utf-8"),
    crlfDelay: Infinity,
  });
  let count = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    const raw = JSON.parse(line);
    if (!raw.images?.length) continue;
    const v = normalize(raw, "hainaauto");
    writeVehicle(v);
    details[v.slug] = v;
    index.push(indexEntry(v));
    count++;
  }
  console.log(`hainaauto: ${count} vehicles`);
}

// --- cntransit: full record lives in images/<id>/.meta.json ---
function loadCntransit() {
  const imagesDir = path.join(autoShop, "cntransit", "images");
  if (!fs.existsSync(imagesDir)) return;
  let count = 0;
  for (const id of fs.readdirSync(imagesDir)) {
    const metaPath = path.join(imagesDir, id, ".meta.json");
    if (!fs.existsSync(metaPath)) continue;
    const raw = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    if (!raw.images?.length) continue;
    const v = normalize(raw, "cntransit");
    writeVehicle(v);
    details[v.slug] = v;
    index.push(indexEntry(v));
    count++;
  }
  console.log(`cntransit: ${count} vehicles`);
}

await loadHainaauto();
loadCntransit();

// Images are addressed by filename only (see lib/format.ts imagePath); the
// /api/vehicle-image route scopes the cache key by vehicle id and validates
// the file against that vehicle's own image list, but a filename collision
// (same filename, same site, two different vehicle ids) still means one
// upstream photo is being claimed by more than one listing. In this dataset
// that's common (tens of thousands of pairs, mostly cntransit) and mostly
// reflects the same listing being re-scraped under a new id — not something
// a build script can safely reject — so this warns with a bounded sample
// rather than failing the build. Investigate if the count jumps unexpectedly.
const fileOwners = new Map();
const collisions = [];
for (const v of Object.values(details)) {
  for (const file of v.images) {
    const key = `${v.site}:${file}`;
    const owner = fileOwners.get(key);
    if (owner === undefined) {
      fileOwners.set(key, v.id);
    } else if (owner !== v.id) {
      collisions.push({ site: v.site, file, ids: [owner, v.id] });
    }
  }
}
if (collisions.length > 0) {
  const bySite = collisions.reduce((acc, c) => ((acc[c.site] = (acc[c.site] ?? 0) + 1), acc), {});
  console.warn(`\n⚠ ${collisions.length} image filename collision(s) — same filename under the same site maps to different vehicle ids (${JSON.stringify(bySite)}).`);
  console.warn("  Each vehicle's own image list is still validated per-request by /api/vehicle-image, so this does not by itself serve the wrong photo — but it means the same upstream file is claimed by more than one listing. Sample:");
  for (const c of collisions.slice(0, 15)) console.warn(`  [${c.site}] ${c.file} -> ids ${c.ids.join(", ")}`);
  if (collisions.length > 15) console.warn(`  ...and ${collisions.length - 15} more.`);
  console.warn("");
}

// A shared filename is usually harmless re-listing (see above), but some are
// genuinely the wrong photo: a vehicle whose own title has nothing in common
// with any other listing using that same image almost certainly isn't
// pictured in it (e.g. a sedan's title sharing a photo pool with a dozen
// unrelated SUV/EV listings under the same brand). Strip those specific
// images from that vehicle's own gallery — falls back to "Image unavailable"
// if nothing else remains, which is more honest than a wrong photo.
const CONTAMINATION_STOPWORDS = new Set([
  "automatic", "transmission", "edition", "manual", "standard", "deluxe", "luxury", "premium",
  "sport", "sports", "comfort", "elite", "flagship", "pro", "plus", "max", "ultra", "model", "year",
  "drive", "awd", "fwd", "rwd", "wheel", "seat", "seater", "smart", "enjoy", "style", "dynamic",
  "exclusive", "limited", "special", "new", "generation", "gen", "package", "trim", "version",
  "type", "series", "line", "imported", "cvt", "dct", "amt", "hybrid", "phev", "ev", "gasoline",
  "diesel", "electric", "turbo", "intelligent", "driving", "national", "china", "chinese", "glory",
  "freedom", "vitality", "flying", "the", "and", "for", "with", "of", "master", "top", "grace",
  "advance", "value", "pioneer", "shadow", "play", "champion", "explore", "knight", "core", "air",
  "world", "classic", "joy", "chic", "fun", "road", "urban", "city", "long", "range", "short",
  "wheelbase", "mid", "roof", "high", "low", "front", "rear",
]);
function significantWords(title) {
  return new Set(
    (title || "")
      .toLowerCase()
      .replace(/[()"',.]/g, " ")
      .split(/[\s/-]+/)
      .filter((w) => w.length >= 3 && /^[a-z]+$/.test(w) && !CONTAMINATION_STOPWORDS.has(w))
  );
}

const galleryOwners = new Map(); // "site:file" -> [{id, slug, words, color}]
for (const v of Object.values(details)) {
  const words = significantWords(v.title);
  const color = (v.color || "").trim().toLowerCase();
  for (const file of v.images) {
    const key = `${v.site}:${file}`;
    if (!galleryOwners.has(key)) galleryOwners.set(key, []);
    galleryOwners.get(key).push({ id: v.id, slug: v.slug, words, color });
  }
}

// Caps how many distinct other-color examples a single listing shows —
// some model families (BYD Seagull, Geely Boyue) have 80+ siblings.
const MAX_OTHER_COLORS = 8;

const indexBySlug = new Map(index.map((entry) => [entry.slug, entry]));
let strippedInstances = 0;
let movedInstances = 0;
const strippedVehicleSlugs = new Set();
const otherColorVehicleSlugs = new Set();

for (const v of Object.values(details)) {
  const words = significantWords(v.title);
  const myColor = (v.color || "").trim().toLowerCase();
  const primary = [];
  const otherColorsByColor = new Map(); // color -> {file, color, slug, site, id}

  for (const file of v.images) {
    const owners = galleryOwners.get(`${v.site}:${file}`);
    if (owners.length <= 1) {
      primary.push(file);
      continue;
    }
    const corroborating = owners.filter((o) => o.id !== v.id && [...words].some((w) => o.words.has(w)));
    if (corroborating.length === 0) continue; // no title corroboration at all — pure contamination, drop
    const differentColorSibling = myColor ? corroborating.find((o) => o.color && o.color !== myColor) : undefined;
    const isFreshOtherColor = differentColorSibling && !otherColorsByColor.has(differentColorSibling.color) && otherColorsByColor.size < MAX_OTHER_COLORS;
    if (isFreshOtherColor) {
      otherColorsByColor.set(differentColorSibling.color, {
        file,
        color: differentColorSibling.color,
        slug: differentColorSibling.slug,
        site: v.site,
        id: differentColorSibling.id,
      });
    } else {
      // Corroborated but not pulled into otherColorPhotos this time (same
      // color as this vehicle, or a repeat/over-the-cap color) — keep it as
      // this vehicle's own photo rather than dropping it; we have no signal
      // suggesting it doesn't belong here.
      primary.push(file);
    }
  }

  const otherColors = [...otherColorsByColor.values()];
  const droppedCount = v.images.length - primary.length - otherColors.length;
  if (droppedCount <= 0 && otherColors.length === 0) continue;

  if (droppedCount > 0) {
    strippedInstances += droppedCount;
    strippedVehicleSlugs.add(v.slug);
  }
  if (otherColors.length > 0) {
    movedInstances += otherColors.length;
    otherColorVehicleSlugs.add(v.slug);
  }
  v.images = primary;
  v.otherColorPhotos = otherColors;
  writeVehicle(v);
  const entry = indexBySlug.get(v.slug);
  if (entry) {
    entry.thumb = primary[0] ?? null;
    entry.thumbs = primary.slice(0, 4);
    entry.imageCount = primary.length;
  }
}
if (strippedInstances > 0) {
  console.warn(`\n⚠ Stripped ${strippedInstances} contaminated image(s) from ${strippedVehicleSlugs.size} vehicle(s) — shared photo with no title corroboration from this listing.`);
}
if (movedInstances > 0) {
  console.warn(`⚠ Moved ${movedInstances} shared photo(s) on ${otherColorVehicleSlugs.size} vehicle(s) into otherColorPhotos — same model, a differently-colored sibling listing.`);
}

fs.writeFileSync(path.join(outDir, "vehicles-index.json"), JSON.stringify(index));
fs.writeFileSync(path.join(outDir, "vehicle-details.json"), JSON.stringify(details));

// Small rotating sample of real current inventory for the header ticker
// (app/inventory-ticker.tsx). No invented people, no invented payments —
// just real vehicles with real prices and real stock codes, evenly sampled
// so a fixed-size ticker still spans the whole catalogue. This intentionally
// does not claim recency ("just listed", "Xm ago") since nothing in this
// pipeline tracks a real listing timestamp.
const tickerEligible = index.filter((v) => v.availability === "available" && v.priceCNY != null && v.thumb);
const tickerCount = Math.min(40, tickerEligible.length);
const tickerStep = Math.max(1, Math.floor(tickerEligible.length / tickerCount));
const inventoryTicker = [];
for (let i = 0; i < tickerEligible.length && inventoryTicker.length < tickerCount; i += tickerStep) {
  const v = tickerEligible[i];
  inventoryTicker.push({
    slug: v.slug,
    site: v.site,
    id: v.id,
    title: v.title,
    priceCNY: v.priceCNY,
    stockCode: v.stockCode,
    thumb: v.thumb,
  });
}
fs.writeFileSync(path.join(outDir, "inventory-ticker.json"), JSON.stringify(inventoryTicker));
console.log(`inventory-ticker: ${inventoryTicker.length} real vehicles sampled`);
const shardCount = 64;
const detailShards = Array.from({ length: shardCount }, () => ({}));
for (const [slug, vehicle] of Object.entries(details)) {
  let hash = 2166136261;
  for (let character = 0; character < slug.length; character += 1) {
    hash ^= slug.charCodeAt(character);
    hash = Math.imul(hash, 16777619);
  }
  detailShards[(hash >>> 0) % shardCount][slug] = vehicle;
}
const shardDir = path.join(outDir, "vehicle-detail-shards");
fs.mkdirSync(shardDir, { recursive: true });
detailShards.forEach((shard, shardNumber) => {
  fs.writeFileSync(path.join(shardDir, `${shardNumber}.json`), JSON.stringify(shard));
});
console.log(`Total: ${index.length} vehicles indexed`);
