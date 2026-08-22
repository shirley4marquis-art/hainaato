import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import sharp from "sharp";
import { Pool } from "pg";

const root = process.cwd();
const site = "madeinchina";
const USD_PER_CNY = 0.139;
const indexPath = path.join(root, "data", "vehicles-index.json");
const detailsPath = path.join(root, "data", "vehicle-details.json");
const localImportsPath = path.join(root, "data", "imported-listings.json");
const imageRoot = path.join(root, "public", "vehicle-images", site);
const connectionString = process.env.IMPORT_DATABASE_URL || process.env.CRM_DATABASE_URL;

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function priceToCny(price, currency) {
  if (!price) return null;
  const match = String(price).match(/[0-9][0-9,]*(?:\.\d+)?/);
  if (!match) return null;
  const amount = Number(match[0].replace(/,/g, ""));
  if (!Number.isFinite(amount)) return null;
  if ((currency || "").toUpperCase() === "USD") return amount / USD_PER_CNY;
  if ((currency || "").toUpperCase() === "CNY") return amount;
  return null;
}

function bodyTypeFor(listing) {
  const text = `${listing.category} ${listing.subcategory} ${listing.title}`.toLowerCase();
  if (text.includes("bus")) return "Bus";
  if (text.includes("truck")) return text.includes("tractor") ? "Tractor Truck" : text.includes("dump") ? "Dump Truck" : "Heavy Truck";
  if (text.includes("excavator")) return "Excavator";
  if (text.includes("loader")) return "Wheel Loader";
  if (text.includes("bulldozer")) return "Bulldozer";
  if (text.includes("crane")) return "Crane";
  if (text.includes("forklift")) return "Forklift";
  return "Heavy Machinery";
}

function stockCodeFor(listing) {
  const brand = slugify(listing.brand || "MIC").replace(/-/g, "").slice(0, 8).toUpperCase() || "MIC";
  const id = slugify(listing.source_product_id || listing.id).replace(/-/g, "").slice(-8).toUpperCase();
  return `HA-CN-MIC-${brand}-${id}`;
}

async function readApprovedImports() {
  if (connectionString) {
    const pool = new Pool({ connectionString });
    try {
      const { rows } = await pool.query(
        "SELECT * FROM supplier_import_products WHERE source = 'made-in-china' AND listing_status = 'verified' ORDER BY updated_at DESC LIMIT 250"
      );
      return rows.map((row) => ({
        ...row,
        images: row.images ?? [],
        specifications: row.specifications ?? {},
      }));
    } finally {
      await pool.end();
    }
  }
  if (!fs.existsSync(localImportsPath)) return [];
  return JSON.parse(fs.readFileSync(localImportsPath, "utf8")).filter((listing) => listing.source === "made-in-china" && listing.listing_status === "verified");
}

async function downloadImages(listing, id) {
  const imageDir = path.join(imageRoot, id);
  fs.mkdirSync(imageDir, { recursive: true });
  const files = [];
  for (let index = 0; index < Math.min(listing.images?.length ?? 0, 10); index += 1) {
    const image = listing.images[index];
    const url = image.original_url || image;
    if (!url || !/^https:\/\//i.test(url)) continue;
    const file = `${String(index + 1).padStart(2, "0")}.webp`;
    const output = path.join(imageDir, file);
    if (!fs.existsSync(output)) {
      const response = await fetch(url, { headers: { "user-agent": "HainaAutoImporter/1.0 (+https://www.hainaautochina.com)" } });
      if (!response.ok) continue;
      const buffer = Buffer.from(await response.arrayBuffer());
      await sharp(buffer).rotate().resize({ width: 1400, height: 1050, fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toFile(output);
    }
    files.push(file);
  }
  return files;
}

function specsFor(listing, stockCode) {
  const specs = listing.specifications ?? {};
  return {
    "Código de inventario": stockCode,
    "Fuente": "Made-in-China.com",
    "Proveedor": listing.supplier_name || "Supplier listed on Made-in-China.com",
    "Enlace original": listing.source_url,
    "Marca": listing.brand || "Consultar",
    "Modelo": listing.model || "Consultar",
    "Categoría": listing.category || "Heavy Machinery",
    "Subcategoría": listing.subcategory || "Other Construction Equipment",
    "Año": listing.year ? String(listing.year) : "Consultar",
    "Condición": listing.condition === "used" ? "Usado" : "Nuevo / consultar",
    "Precio publicado": listing.price || "Contact Supplier",
    "MOQ": listing.moq || specs.moq || "Consultar",
    "Ubicación del proveedor": listing.supplier_location || "China",
    "Motor": specs.engine || "Consultar",
    "Potencia": specs.horsepower || "Consultar",
    "Transmisión": specs.transmission || "Consultar",
    "Combustible": specs.fuel_type || "Consultar",
    "Peso bruto": specs.gross_vehicle_weight || "Consultar",
    "Carga útil": specs.payload || "Consultar",
    "Dimensiones": specs.dimensions || "Consultar",
    "Certificación": specs.certification || "Consultar",
    "Garantía": listing.warranty || specs.warranty || "Consultar",
    "Nota": "Listado de proveedor externo. Haina Auto verifica disponibilidad, especificación final, precio CIF y documentos antes de confirmar la venta.",
  };
}

function overviewFor(listing) {
  return [
    listing.description,
    "Producto publicado por un proveedor en Made-in-China.com e incorporado al catálogo de Haina Auto para revisión, cotización CIF, inspección y soporte de exportación.",
    "La disponibilidad, configuración final, documentación, precio CIF y condiciones comerciales se confirman antes de emitir la cotización formal.",
  ].filter(Boolean).join(" ");
}

const listings = await readApprovedImports();
if (listings.length === 0) {
  console.log("No verified Made-in-China imports found to publish.");
  process.exit(0);
}

let index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
const details = JSON.parse(fs.readFileSync(detailsPath, "utf8"));
const publishedSlugs = new Set(listings.map((listing) => `${site}-${slugify(listing.source_product_id || listing.id)}`));
index = index.filter((vehicle) => !publishedSlugs.has(vehicle.slug));
const imported = [];

for (const listing of listings) {
  const id = slugify(listing.source_product_id || listing.id);
  const slug = `${site}-${id}`;
  const images = await downloadImages(listing, id);
  if (images.length === 0) {
    console.warn(`Skipping ${slug}: no usable images downloaded.`);
    continue;
  }
  const stockCode = stockCodeFor(listing);
  const priceCNY = priceToCny(listing.price, listing.currency);
  const bodyType = bodyTypeFor(listing);
  const transmission = listing.specifications?.transmission || null;
  const fuel = listing.specifications?.fuel_type || null;
  const now = new Date().toISOString();
  imported.push({
    slug,
    site,
    id,
    title: listing.title,
    year: listing.year ?? null,
    priceCNY,
    mileageKm: listing.specifications?.hours ? null : 0,
    fuel,
    bodyType,
    location: listing.supplier_location || "China",
    thumb: images[0],
    thumbs: images.slice(0, 4),
    imageCount: images.length,
    color: null,
    brand: listing.brand || "Unknown",
    model: listing.model || listing.subcategory || "Commercial Equipment",
    condition: listing.condition === "used" ? "used" : "new",
    availability: listing.source_status === "unavailable" ? "reserved" : "available",
    transmission,
    stockCode,
    listedAt: now,
  });
  details[slug] = {
    slug,
    site,
    id,
    url: listing.source_url,
    title: listing.title,
    year: listing.year ?? null,
    priceCNY,
    msrpCNY: null,
    mileageKm: listing.specifications?.hours ? null : 0,
    fuel,
    bodyType,
    gearbox: transmission,
    color: null,
    location: listing.supplier_location || "China",
    driveType: null,
    overview: overviewFor(listing),
    specs: specsFor(listing, stockCode),
    images,
    otherColorPhotos: [],
  };
}

fs.writeFileSync(indexPath, JSON.stringify([...imported, ...index]));
fs.writeFileSync(detailsPath, JSON.stringify(details));

for (const command of [
  ["node", ["scripts/shard-vehicle-data.mjs"]],
  ["node", ["scripts/build-meta-catalog-feed.mjs"]],
  ["node", ["scripts/build-venezuela-meta-catalog.mjs"]],
]) {
  const result = spawnSync(command[0], command[1], { cwd: root, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`Published ${imported.length} Made-in-China listings to Haina Auto inventory.`);
