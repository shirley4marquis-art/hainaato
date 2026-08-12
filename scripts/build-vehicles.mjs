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

function normalize(raw, site) {
  const specs = raw.specs ?? {};
  return {
    slug: `${site}-${raw.id}`,
    site,
    id: String(raw.id),
    url: raw.url ?? null,
    title: raw.title ?? "Untitled vehicle",
    year: raw.year ?? null,
    priceCNY: toNumber(raw.price?.salePriceCNY),
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

fs.writeFileSync(path.join(outDir, "vehicles-index.json"), JSON.stringify(index));
fs.writeFileSync(path.join(outDir, "vehicle-details.json"), JSON.stringify(details));
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
