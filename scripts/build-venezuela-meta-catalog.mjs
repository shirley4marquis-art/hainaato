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
  commercial: "Vehiculos comerciales y familiares",
  supercar: "Superautos y deportivos",
  motorcycle: "Motocicletas",
  machinery: "Maquinaria y camiones",
  other: "Otros vehiculos",
};

function bodyType(v) {
  const value = (v.bodyType ?? "").toLowerCase();
  if (/motorcycle|motorbike|scooter/.test(value) || /\bmotorcycle\b|\bmotorbike\b|\bscooter\b/i.test(v.title)) return "motorcycle";
  if (/sports car|coupe|convertible/.test(value) || /supercar|hypercar|\bgt[ -]?r\b|\b911\b|\br8\b|\b718\b/i.test(v.title)) return "supercar";
  if (value.includes("pickup")) return "pickup";
  if (/truck|bus|van/.test(value) || /excavat|loader|crane|dump truck|tractor|semi[- ]?truck|heavy machinery/i.test(v.title)) return "machinery";
  if (value.includes("suv") || value.includes("off-road")) return "suv";
  if (value.includes("passenger") || value === "car") return "passenger";
  if (value.includes("commercial") || value.includes("mpv") || value.includes("van")) return "commercial";
  return "other";
}

function matchingBrand(v) {
  const raw = (v.brand ?? "").trim();
  const rule = brandRules.find(([brand, modelPattern]) => raw.toLowerCase() === brand.toLowerCase() && modelPattern.test(v.title));
  return rule?.[0] ?? null;
}

function catalogBrand(v) {
  return matchingBrand(v) ?? ((bodyType(v) === "supercar" || bodyType(v) === "motorcycle" || bodyType(v) === "machinery") ? (v.brand ?? "") : null);
}

function trimLabel(v) {
  return (v.model || v.title).replace(/\s+/g, " ").trim();
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
  return `${trimLabel(v)} ${v.year ?? ""} - Importacion desde China a Venezuela`;
}

function descriptionFor(v, brand) {
  const details = [
    v.year,
    trimLabel(v),
    v.mileageKm != null ? `${v.mileageKm.toLocaleString("es-VE")} km` : null,
    v.color,
    v.transmission,
    v.location ? `Disponible en ${v.location}` : null,
  ].filter(Boolean);
  return `${brand} ${details.join(" · ")}. Vehiculo disponible para compradores en Venezuela, con inspeccion, documentos de exportacion y apoyo logistico de HainaAuto. Stock ${v.stockCode}.`;
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

const header = ["id", "title", "description", "availability", "condition", "price", "link", "image_link", "brand", "additional_image_link", "product_type", "custom_label_0", "custom_label_1", "custom_label_2"];
const lines = [header.join(",")];
for (const v of selected) {
  const brand = catalogBrand(v);
  const additionalImages = (v.thumbs ?? []).filter((file) => file !== v.thumb).slice(0, 10).map((file) => imagePath(v, file)).join(",");
  const category = categoryNames[bodyType(v)];
  const row = [
    v.slug,
    titleFor(v, brand),
    descriptionFor(v, brand),
    "in stock",
    v.condition,
    `${(v.priceCNY * USD_PER_CNY).toFixed(2)} USD`,
    `${SITE_URL}/vehicles/${v.slug}`,
    imagePath(v, v.thumb),
    brand,
    additionalImages,
    `${category} > ${trimLabel(v)}`,
    trimLabel(v),
    "Venezuela",
    brand,
  ];
  lines.push(row.map(csvField).join(","));
}

fs.writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
console.log(`Wrote ${selected.length} Venezuela listings to ${path.relative(root, outPath)}`);
for (const [trim, count] of trimCounts) console.log(`${trim}: ${count}`);
