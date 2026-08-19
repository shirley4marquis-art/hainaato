import fs from "node:fs";
import path from "node:path";

const API_URL = "https://websites-search.api.carscommerce.inc/api/v1/listings/9749/search";
// Public search-only key published by Hendrick's inventory page.
const API_KEY = "OQa8l7SzMctJyr5bhSG9jYvlGnZUQfgl";
const TARGET_COUNT = 400;
const USD_PER_CNY = 0.139;
const root = process.cwd();

function numericId(vin) {
  let hash = 2166136261;
  for (const char of vin) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return String(hash >>> 0);
}

function bodyType(model) {
  const value = model.toLowerCase();
  if (/tacoma|tundra/.test(value)) return "Pickup";
  if (/camry|corolla|crown|prius|supra|gr86/.test(value)) return value.includes("hatchback") ? "Hatchback" : "Sedan";
  if (value.includes("sienna")) return "Minivan";
  return "SUV";
}

function fuelType(model, trim) {
  const value = `${model} ${trim}`.toLowerCase();
  if (/\bbz\b/.test(value)) return "Electric";
  if (/hybrid|i-force max|prime|plug-in/.test(value)) return "Hybrid";
  return "Gasoline";
}

const encodeImage = (url) => Buffer.from(url, "utf8").toString("base64url");
const advertisedPrice = (listing) => listing.pricing?.our_price || listing.pricing?.internet_price || listing.pricing?.msrp || null;

const listings = [];
let page = 1;
let totalPages = 1;
do {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": API_KEY },
    body: JSON.stringify({
      page,
      perPage: 100,
      filters: { status: ["publish", "modified", "pend-sale"] },
      facetFilters: { type_slug: ["New"] },
    }),
  });
  if (!response.ok) throw new Error(`Hendrick inventory request failed on page ${page}: ${response.status}`);
  const payload = await response.json();
  listings.push(...(payload?.data?.listings || []));
  totalPages = payload?.meta?.pagination?.total_pages || 1;
  page += 1;
} while (page <= totalPages);
if (!Array.isArray(listings) || listings.length < TARGET_COUNT) {
  throw new Error(`Expected at least ${TARGET_COUNT} current listings; received ${listings?.length ?? 0}.`);
}

const deduped = [...new Map(listings.filter((v) => v.vin && v.make === "Toyota").map((v) => [v.vin, v])).values()];
const priority = deduped.filter((v) => /4runner|tundra/i.test(v.model));
const remainder = deduped.filter((v) => !/4runner|tundra/i.test(v.model));
const selected = [...priority, ...remainder].slice(0, TARGET_COUNT);
const importedAt = new Date().toISOString();

const indexPath = path.join(root, "data", "vehicles-index.json");
const detailsPath = path.join(root, "data", "vehicle-details.json");
const currentIndex = JSON.parse(fs.readFileSync(indexPath, "utf8")).filter((v) => v.site !== "hendrick");
const currentDetails = JSON.parse(fs.readFileSync(detailsPath, "utf8"));
for (const slug of Object.keys(currentDetails)) if (slug.startsWith("hendrick-")) delete currentDetails[slug];

const ids = new Set();
const importedIndex = [];
for (const listing of selected) {
  const id = numericId(listing.vin);
  if (ids.has(id)) throw new Error(`Numeric ID collision for VIN ${listing.vin}.`);
  ids.add(id);
  const slug = `hendrick-${id}`;
  const usd = advertisedPrice(listing);
  const msrpUsd = listing.pricing?.msrp || null;
  // The site's default USD formatter converts these source values back to the
  // exact advertised whole-dollar figures supplied by the dealer.
  const priceCNY = usd == null ? null : usd / USD_PER_CNY;
  const msrpCNY = msrpUsd == null ? null : msrpUsd / USD_PER_CNY;
  const title = `${listing.year} ${listing.make} ${listing.model} ${listing.trim}`.replace(/\s+/g, " ").trim();
  const images = (listing.media?.images || [])
    // HomeNet carries the dealer's promotional title cards and watermark/
    // lower-third photography. Keep only Toyota-controlled clean imagery so
    // no Hendrick branding is republished in the HainaAuto catalogue.
    .filter((url) => /^https:\/\/(portphotos\.setoyota\.com|delivery\.via\.assetscs\.toyota\.com|delivery\.vcr\.assetscs\.toyota\.com|media\.rti\.toyota\.com)\//.test(url))
    .slice(0, 12)
    .map(encodeImage);
  const mileageKm = Number.isFinite(listing.mileage) ? Math.round(listing.mileage * 1.609344) : null;
  const body = bodyType(listing.model);
  const fuel = fuelType(listing.model, listing.trim);
  const color = listing.styles?.exterior_color || null;
  const stockCode = `HA-US-${listing.stock || listing.vin.slice(-6)}`;

  importedIndex.push({
    slug, site: "hendrick", id, title, year: listing.year || null, priceCNY,
    mileageKm, fuel, bodyType: body, location: "Concord, North Carolina, USA",
    thumb: images[0] || null, thumbs: images.slice(0, 3), imageCount: images.length,
    color, brand: "Toyota", model: listing.model, condition: "new",
    availability: "available", transmission: "Automatic", stockCode, listedAt: importedAt,
  });
  currentDetails[slug] = {
    slug, site: "hendrick", id, url: null, title, year: listing.year || null,
    priceCNY, msrpCNY, mileageKm, fuel, bodyType: body, gearbox: "Automatic",
    color, location: "Concord, North Carolina, USA", driveType: null,
    overview: "Vehículo Toyota nuevo disponible a través de HainaAuto. Precio publicado conservado en USD; inspección, documentación de exportación y logística internacional disponibles bajo solicitud.",
    specs: {
      VIN: listing.vin,
      "Código de inventario": stockCode,
      Marca: "Toyota",
      Modelo: listing.model,
      Versión: listing.trim,
      Año: String(listing.year),
      Condición: "Nuevo",
      Kilometraje: `${mileageKm ?? 0} km`,
      Combustible: fuel,
      Color: color || "Consultar",
      Ubicación: "Concord, Carolina del Norte, EE. UU.",
      "Precio publicado": usd == null ? "Consultar" : `$${usd.toLocaleString("en-US")} USD`,
    },
    images,
    otherColorPhotos: [],
  };
}

fs.writeFileSync(indexPath, JSON.stringify([...importedIndex, ...currentIndex]));
fs.writeFileSync(detailsPath, JSON.stringify(currentDetails));
const selectedPriorityCount = selected.filter((v) => /4runner|tundra/i.test(v.model)).length;
console.log(`Imported ${importedIndex.length} current Toyotas: ${selectedPriorityCount} prioritized 4Runner/Tundra listings and ${importedIndex.length - selectedPriorityCount} other models.`);
