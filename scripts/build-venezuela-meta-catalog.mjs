// Builds a Spanish-language Meta catalog for Venezuelan buyers.
// The global feed remains unchanged; this feed is intentionally capped and
// restricted to Venezuelan-relevant trims/models with real stock.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const indexPath = path.join(root, "data", "vehicles-index.json");
const outPath = path.join(root, "public", "meta-catalog-venezuela.csv");
const SITE_URL = process.env.META_CATALOG_SITE_URL ?? "https://www.hainaautochina.com";
const USD_PER_CNY = 0.139;
const TOTAL_CAP = 1000;
const PER_TRIM_CAP = 24;

const brandAliases = new Map([
  ["jietu", "Jetour"], ["remote", "Farizon"], ["nezha", "Neta"], ["nata", "Neta"],
  ["jike", "Zeekr"], ["jikrypton", "Zeekr"], ["extreme", "Zeekr"],
  ["panamera", "Porsche"], ["continental", "Bentley"], ["transit", "Ford"],
]);
const approvedFallbackBrands = new Set([
  "Aston Martin", "Audi", "Bentley", "BMW", "Changan", "Dongfeng", "Farizon", "Foton",
  "Haval", "Isuzu", "Iveco", "JAC", "Jaguar", "Jinbei", "JMC", "Kairui", "Lamborghini",
  "Maxus", "Mazda", "McLaren", "Mercedes-Benz", "MG", "MINI", "Mitsubishi", "Neta",
  "Porsche", "SAIC", "Sinotruk", "Subaru", "Wuling", "Yutong", "Zeekr",
]);

const brandRules = [
  ["Toyota", /hilux|fortuner|land cruiser|landcruiser|prado|corolla|yaris|rav4|highlander/i],
  ["Chevrolet", /silverado|tahoe|trailblazer|equinox|cruze|aveo|captiva/i],
  ["Ford", /ranger|explorer|edge|bronco|territory|f-150|maverick|everest/i],
  ["Hyundai", /tucson|santa fe|elantra|accent|creta|kona|palisade/i],
  ["Kia", /sportage|sorento|seltos|rio|k3|k5|carnival|sonet/i],
  ["Chery", /tiggo|arrizo|qq|omoda|jetour/i],
  ["BYD", /song|yuan|dolphin|seagull|seal|qin|tang|atto/i],
  ["Geely", /coolray|binyue|emgrand|monjaro|xingyue|boyue|okavango|jiaji/i],
  ["Jetour", /x70|x90|traveler|dasheng|freedom|shanhai/i],
  ["Nissan", /frontier|navara|x-trail|qashqai|sentra|sylphy|kicks|pathfinder/i],
  ["Honda", /cr-v|civic|accord|pilot|hr-v|fit|odyssey/i],
  ["JAC", /t8|t9|pickup|shuailing|refine/i],
];

const wantedTrimRules = [
  /hilux/i, /fortuner/i, /land cruiser|landcruiser|prado/i, /corolla/i, /rav4/i,
  /silverado|tahoe|trailblazer|equinox/i, /ranger|explorer|edge|territory/i,
  /tucson|santa fe|elantra|creta/i, /sportage|sorento|seltos|rio/i,
  /tiggo 7|tiggo 8|tiggo 9|arrizo/i, /song|dolphin|seagull|seal|qin|tang/i,
  /coolray|binyue|emgrand|monjaro|xingyue|boyue/i, /x70|x90|traveler/i,
  /frontier|navara|x-trail|qashqai|sentra|kicks/i, /cr-v|civic|accord|pilot/i,
  /t8|t9/i,
];
const categoryNames = {
  pickup: "Camionetas y pickups",
  suv: "SUV y todoterrenos",
  passenger: "Sedanes y hatchbacks",
  commercial: "Vehículos comerciales y familiares",
  supercar: "Superautos y deportivos",
  motorcycle: "Motocicletas",
  machinery: "Maquinaria y camiones",
  other: "Otros vehículos",
};

function bodyType(v) {
  const value = (v.bodyType ?? "").toLowerCase();
  const title = v.title ?? "";
  if (/motorcycle|motorbike|scooter/.test(value) || /\bmotorcycle\b|\bmotorbike\b|\bscooter\b/i.test(title)) return "motorcycle";
  if (/sports car|coupe|convertible/.test(value) || /supercar|hypercar|\bgt[ -]?r\b|\b911\b|\br8\b|\b718\b/i.test(title)) return "supercar";
  if (value.includes("pickup") || /\bhilux\b|\branger\b|\bfrontier\b|\bnavara\b|\bsilverado\b|\bf-?150\b|\bmaverick\b|\bd-max\b|\bpickup\b/i.test(title)) return "pickup";
  if (/commercial|mpv|van|bus/.test(value) || /\bminivan\b|\bpassenger van\b|\bpeople carrier\b/i.test(title)) return "commercial";
  if (/truck|machinery|equipment/.test(value) || /excavat|loader|crane|dump truck|tractor|semi[- ]?truck|heavy machinery/i.test(title)) return "machinery";
  if (value.includes("suv") || value.includes("off-road")) return "suv";
  if (/passenger|sedan|hatchback/.test(value) || value === "car") return "passenger";
  return "other";
}

function yearBand(year) {
  if (!year) return "year_unknown";
  if (year >= 2025) return "year_2025_plus";
  if (year >= 2023) return "year_2023_2024";
  return "year_pre_2023";
}

function priceBand(priceUsd) {
  if (priceUsd < 15_000) return "price_under_15000";
  if (priceUsd < 25_000) return "price_15000_24999";
  if (priceUsd < 40_000) return "price_25000_39999";
  return "price_40000_plus";
}

function matchingBrand(v) {
  const raw = (v.brand ?? "").trim();
  const rule = brandRules.find(([brand, modelPattern]) => raw.toLowerCase() === brand.toLowerCase() && modelPattern.test(v.title));
  return rule?.[0] ?? null;
}

function catalogBrand(v) {
  const matched = matchingBrand(v);
  if (matched) return matched;
  const raw = (v.brand ?? "").trim();
  // A primary brand with a non-matching model is outside this Venezuela-focused feed.
  if (brandRules.some(([brand]) => raw.toLowerCase() === brand.toLowerCase())) return null;
  const normalized = brandAliases.get(raw.toLowerCase()) ?? raw;
  const eligibleType = bodyType(v) === "supercar" || bodyType(v) === "motorcycle" || bodyType(v) === "machinery";
  return eligibleType && approvedFallbackBrands.has(normalized) ? normalized : null;
}

function trimLabel(v) {
  return (v.model || v.title).replace(/\s+/g, " ").trim();
}

function cleanTrimLabel(v, brand) {
  let trim = trimLabel(v)
    .replace(/\(Imported\)/gi, "(importado)")
    .replace(/Crown Land Cruiser/gi, "Land Cruiser")
    .replace(/Crown Land/gi, "Land Cruiser");
  if (v.year) trim = trim.replace(new RegExp(`\\b${v.year}\\b`, "g"), " ");
  trim = trim.replace(/\s+/g, " ").trim();
  const brandPrefix = new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  while (brandPrefix.test(trim)) trim = trim.replace(brandPrefix, " ").trim();
  if (brand === "Toyota" && /^Toyota Land$/i.test(trim)) trim = "Land Cruiser";
  return trim.replace(/\s+/g, " ").replace(/^[-,\s]+|[-,\s]+$/g, "").trim();
}

const spanishValues = new Map([
  ["black", "negro"], ["white", "blanco"], ["grey", "gris"], ["gray", "gris"],
  ["red", "rojo"], ["blue", "azul"], ["green", "verde"], ["yellow", "amarillo"],
  ["silver", "plateado"], ["beige", "beige"], ["purple", "morado"], ["brown", "marrón"],
  ["automatic", "transmisión automática"], ["manual", "transmisión manual"],
]);

function spanishValue(value) {
  if (!value) return null;
  return spanishValues.get(String(value).trim().toLowerCase()) ?? value;
}

function trimKey(v) {
  return `${catalogBrand(v)}:${trimLabel(v).toLowerCase()}`;
}

function trimRank(v) {
  const index = wantedTrimRules.findIndex((rule) => rule.test(v.title));
  return index >= 0 ? index : wantedTrimRules.length;
}

function priority(v) {
  const rank = trimRank(v);
  const typeRank = bodyType(v) === "pickup" ? 0 : bodyType(v) === "suv" ? 1 : 2;
  const conditionRank = v.condition === "new" ? 0 : 1;
  return [rank, typeRank, conditionRank, -(v.year ?? 0), v.priceCNY ?? Number.MAX_SAFE_INTEGER, v.slug];
}

function comparePriority(a, b) {
  const left = priority(a);
  const right = priority(b);
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] < right[i]) return -1;
    if (left[i] > right[i]) return 1;
  }
  return 0;
}

function csvField(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function imagePath(v, file) {
  return `${SITE_URL}/api/vehicle-image/${v.site}/${encodeURIComponent(v.id)}/${encodeURIComponent(file)}`;
}

function titleFor(v, brand) {
  const trim = cleanTrimLabel(v, brand);
  return `${brand} ${trim}${v.year ? ` ${v.year}` : ""} - Importación desde China a Venezuela`;
}

function descriptionFor(v, brand) {
  const details = [
    v.year,
    cleanTrimLabel(v, brand),
    v.mileageKm != null ? `${v.mileageKm.toLocaleString("es-VE")} km` : null,
    spanishValue(v.color),
    spanishValue(v.transmission),
    v.location ? `Disponible en ${v.location}` : null,
  ].filter(Boolean);
  return `${brand} ${details.join(" · ")}. Vehículo disponible para compradores en Venezuela, con inspección, documentos de exportación y apoyo logístico de HainaAuto. Stock ${v.stockCode}.`;
}

function validateSelection(vehicles) {
  const seen = new Set();
  for (const vehicle of vehicles) {
    if (!vehicle.slug || seen.has(vehicle.slug)) throw new Error(`ID de catálogo duplicado o vacío: ${vehicle.slug ?? "(vacío)"}`);
    seen.add(vehicle.slug);
    if (vehicle.availability !== "available") throw new Error(`Stock no disponible incluido: ${vehicle.slug}`);
    if (!vehicle.thumb || !vehicle.priceCNY || vehicle.priceCNY <= 0) throw new Error(`Imagen o precio inválido: ${vehicle.slug}`);
    if (!catalogBrand(vehicle)) throw new Error(`Marca no aprobada: ${vehicle.slug}`);
  }
}

function validateRow(row) {
  const [id, title, description, availability, condition, price, link, imageLink, brand] = row;
  if (![id, title, description, availability, condition, price, link, imageLink, brand].every(Boolean)) throw new Error(`Campo obligatorio vacío: ${id}`);
  if (title.length > 200 || description.length > 9_999) throw new Error(`Texto supera el límite de Meta: ${id}`);
  if (!new Set(["new", "used"]).has(condition)) throw new Error(`Condición inválida: ${id}`);
  if (!/^\d+\.\d{2} USD$/.test(price)) throw new Error(`Precio inválido: ${id}`);
  if (!link.startsWith("https://") || !imageLink.startsWith("https://")) throw new Error(`URL insegura o inválida: ${id}`);
}

const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
const eligible = index
  .filter((v) => v.availability === "available" && v.priceCNY != null && v.thumb != null && catalogBrand(v))
  .sort(comparePriority);

const selected = [];
const brandCounts = new Map();
const trimCounts = new Map();
const trimBuckets = new Map();
for (const vehicle of eligible) {
  const key = trimKey(vehicle);
  if (!trimBuckets.has(key)) trimBuckets.set(key, []);
  trimBuckets.get(key).push(vehicle);
}
const orderedTrimBuckets = [...trimBuckets.entries()].sort(([, left], [, right]) => comparePriority(left[0], right[0]));

// Take one vehicle per trim per pass so common trims do not consume the feed
// before less common Venezuelan trims are represented.
while (selected.length < TOTAL_CAP) {
  let addedThisPass = false;
  for (const [trim, bucket] of orderedTrimBuckets) {
    if (selected.length >= TOTAL_CAP || (trimCounts.get(trim) ?? 0) >= PER_TRIM_CAP) continue;
    const vehicle = bucket[selected.filter((candidate) => trimKey(candidate) === trim).length];
    if (!vehicle) continue;
    selected.push(vehicle);
    trimCounts.set(trim, (trimCounts.get(trim) ?? 0) + 1);
    addedThisPass = true;
  }
  if (!addedThisPass) break;
}

const header = ["id", "title", "description", "availability", "condition", "price", "link", "image_link", "brand", "additional_image_link", "product_type", "custom_label_0", "custom_label_1", "custom_label_2", "custom_label_3", "custom_label_4"];
validateSelection(selected);
const lines = [header.join(",")];
for (const v of selected) {
  const brand = catalogBrand(v);
  const type = bodyType(v);
  const priceUsd = v.priceCNY * USD_PER_CNY;
  const additionalImages = (v.thumbs ?? []).filter((file) => file !== v.thumb).slice(0, 10).map((file) => imagePath(v, file)).join(",");
  const category = categoryNames[type];
  const row = [
    v.slug,
    titleFor(v, brand),
    descriptionFor(v, brand),
    "in stock",
    v.condition,
    `${priceUsd.toFixed(2)} USD`,
    `${SITE_URL}/vehicles/${v.slug}?lang=es-VE&utm_source=meta&utm_medium=catalog&utm_campaign=venezuela`,
    imagePath(v, v.thumb),
    brand,
    additionalImages,
    `${category} > ${trimLabel(v)}`,
    "market_venezuela",
    `category_${type}`,
    `condition_${v.condition}`,
    yearBand(v.year),
    priceBand(priceUsd),
  ];
  validateRow(row);
  lines.push(row.map(csvField).join(","));
}

fs.writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
console.log(`Wrote ${selected.length} Venezuela listings to ${path.relative(root, outPath)}`);
console.log(`Validated ${new Set(selected.map((vehicle) => vehicle.slug)).size} unique IDs across ${new Set(selected.map(catalogBrand)).size} approved brands.`);
