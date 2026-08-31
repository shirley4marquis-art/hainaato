// Builds a Spanish-language Meta catalog for Venezuelan buyers.
// The global feed remains unchanged; this feed is intentionally capped and
// restricted to Venezuelan-relevant trims/models with real stock.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const indexPath = path.join(root, "data", "vehicles-index.json");
const outputName = process.argv[2] ?? process.env.META_CATALOG_OUTPUT ?? "meta-catalog-venezuela.csv";
const campaignName = process.argv[3] ?? process.env.META_CATALOG_CAMPAIGN ?? "venezuela";
const outPath = path.join(root, "public", outputName);
const SITE_URL = process.env.META_CATALOG_SITE_URL ?? "https://hainautocn.com";
const USD_PER_CNY = 0.139;
const PER_TRIM_CAP = 24;
const YEAR_MIN = 2024;
const YEAR_MAX = 2026;
const CATEGORY_TARGETS = {pickup:180,suv:130,passenger:100,commercial:75,truck:60,heavy_duty:50,supercar:25,motorcycle:5,other:10};

const brandAliases = new Map([
  ["great", "Great Wall"],
  ["jietu", "Jetour"], ["remote", "Farizon"], ["nezha", "Neta"], ["nata", "Neta"],
  ["jike", "Zeekr"], ["jikrypton", "Zeekr"], ["extreme", "Zeekr"],
  ["panamera", "Porsche"], ["continental", "Bentley"], ["transit", "Ford"],
  ["sinotruk / howo", "Sinotruk HOWO"], ["sinotruk", "Sinotruk"], ["howo", "Sinotruk HOWO"],
]);
const approvedFallbackBrands = new Set([
  "Aston Martin", "Audi", "Bentley", "BMW", "Changan", "Dongfeng", "Farizon", "Foton",
  "Haval", "Isuzu", "Iveco", "JAC", "Jaguar", "Jinbei", "JMC", "Kairui", "Lamborghini",
  "Maxus", "Mazda", "McLaren", "Mercedes-Benz", "MG", "MINI", "Mitsubishi", "Neta",
  "Porsche", "SAIC", "Sinotruk", "Sinotruk HOWO", "Subaru", "Wuling", "Yutong", "Zeekr",
]);

const brandRules = [
  ["Toyota", /hilux|tundra|tacoma|fortuner|land cruiser|landcruiser|prado|corolla|yaris|rav4|highlander/i],
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
  heavy_duty: "Camiones pesados",
  truck: "Camiones",
  pickup: "Camionetas y pickups",
  commercial: "Vans y autobuses",
  suv: "SUVs y todoterrenos",
  passenger: "Sedanes y hatchbacks",
  supercar: "Supercarros y deportivos",
  motorcycle: "Motocicletas",
  other: "Otros vehículos",
};

function bodyType(v) {
  const value = (v.bodyType ?? "").toLowerCase();
  const title = v.title ?? "";
  if (/dump truck|heavy truck|tractor truck|mixer truck|machinery|equipment/.test(value) || /excavat|loader|crane|dump truck|tipper|tractor truck|semi[- ]?truck|heavy machinery|mixer truck|cement mixer|\bhowo\b|sinotruk|shacman/i.test(title)) return "heavy_duty";
  if (/motorcycle|motorbike|scooter/.test(value) || /\bmotorcycle\b|\bmotorbike\b|\bscooter\b/i.test(title)) return "motorcycle";
  if (/sports car|coupe|convertible/.test(value) || /supercar|hypercar|\bgt[ -]?r\b|\b911\b|\br8\b|\b718\b/i.test(title)) return "supercar";
  if (value.includes("pickup") || /\bhilux\b|\branger\b|\bfrontier\b|\bnavara\b|\bsilverado\b|\bf-?150\b|\bmaverick\b|\bd-max\b|\bpickup\b/i.test(title)) return "pickup";
  if (/commercial|mpv|van|bus/.test(value) || /\bminivan\b|\bpassenger van\b|\bpeople carrier\b/i.test(title)) return "commercial";
  if (/truck/.test(value) || /\btruck\b|\blorry\b/i.test(title)) return "truck";
  if (value.includes("suv") || value.includes("off-road")) return "suv";
  if (/passenger|sedan|hatchback/.test(value) || value === "car") return "passenger";
  return "other";
}

function priceBand(priceUsd) {
  if (priceUsd < 6_000) return "Precio USD: menos de 6.000";
  if (priceUsd < 9_000) return "Precio USD: 6.000 a 8.999";
  if (priceUsd < 15_000) return "Precio USD: 9.000 a 14.999";
  if (priceUsd < 25_000) return "Precio USD: 15.000 a 24.999";
  if (priceUsd < 40_000) return "Precio USD: 25.000 a 39.999";
  return "Precio USD: 40.000 o más";
}

function fuelClass(v) {
  const value = `${v.fuel ?? ""} ${v.title ?? ""}`.toLowerCase();
  if (/plug-in|phev/.test(value)) return "Híbrido enchufable";
  if (/hybrid|hibrid|range[- ]extended|range extender/.test(value)) return "Híbrido";
  if (/electric|\bev\b/.test(value)) return "Eléctrico";
  if (/diesel/.test(value)) return "Diésel";
  if (/gasoline|petrol|gasolina/.test(value)) return "Gasolina";
  if (/natural gas|\blng\b|\bcng\b/.test(value)) return "Gas natural";
  return "Combustible por confirmar";
}

function transmissionClass(v) {
  const value = `${v.transmission ?? ""} ${v.title ?? ""}`.toLowerCase();
  if (/manual/.test(value) && !/automatic/.test(value)) return "Transmisión manual";
  if (/automatic|automatica|cvt|dct|dual-clutch|single-speed/.test(value)) return "Transmisión automática";
  return "Transmisión por confirmar";
}

function driveClass(v) {
  const value = `${v.title ?? ""} ${v.model ?? ""}`.toLowerCase();
  if (/4\s*[x×]\s*4|\b4wd\b/.test(value)) return "Tracción 4x4";
  if (/\bawd\b/.test(value)) return "Tracción integral AWD";
  if (/4\s*[x×]\s*2|\b2wd\b/.test(value)) return "Tracción 4x2";
  return "Tracción por confirmar";
}

function specificSegment(v, type) {
  const value = `${v.bodyType ?? ""} ${v.title ?? ""}`.toLowerCase();
  if (type === "pickup") return /hilux|ranger|frontier|navara|t8|t9|hunter|d-max/.test(value) ? "Pickup mediana" : /f-?150|silverado|ram 1500/.test(value) ? "Pickup grande" : "Pickup utilitaria";
  if (type === "suv") return /land cruiser|prado|fortuner|patrol|tahoe|palisade/.test(value) ? "SUV 4x4 grande" : /rav4|cr-v|tucson|sportage|tiggo 7|coolray|x70/.test(value) ? "SUV familiar" : "SUV compacta o mediana";
  if (type === "passenger") return /hatchback/.test(value) ? "Hatchback económico" : /sedan|corolla|civic|sentra|sylphy|elantra|emgrand/.test(value) ? "Sedán familiar" : "Automóvil económico";
  if (type === "commercial") return /bus|minibus|passenger|people carrier/.test(value) ? "Van o autobús de pasajeros" : /cargo|panel/.test(value) ? "Van de carga" : "Vehículo comercial";
  if (type === "heavy_duty") return /dump|tipper|volteo/.test(value) ? "Camión de volteo" : /tractor|prime mover/.test(value) ? "Tractocamión" : "Camión pesado";
  if (type === "truck") return "Camión liviano o mediano";
  if (type === "supercar") return "Deportivo o vehículo de lujo";
  if (type === "motorcycle") return "Motocicleta";
  return "Vehículo especial";
}

function demandTier(v) {
  const rank = demandRank(v);
  if (rank <= 6) return "Demanda alta en Venezuela";
  if (rank <= 8) return "Demanda media en Venezuela";
  return "Demanda selectiva en Venezuela";
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
  const type = bodyType(v);
  // Pickups are deliberately broad for Venezuela: the catalogue includes
  // legitimate Chinese work-truck marques beyond the passenger-car allowlist.
  if (type === "pickup" && raw) return brandAliases.get(raw.toLowerCase()) ?? raw;
  // A primary brand with a non-matching model is outside this Venezuela-focused feed.
  if (brandRules.some(([brand]) => raw.toLowerCase() === brand.toLowerCase())) return null;
  const normalized = brandAliases.get(raw.toLowerCase()) ?? raw;
  const eligibleType = ["supercar","motorcycle","heavy_duty","truck","pickup","commercial","suv","passenger"].includes(type);
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

function demandRank(v) {
  const t = `${v.title ?? ""} ${v.model ?? ""}`.toLowerCase();
  const brand = (v.brand ?? "").toLowerCase();

  // Explicit top-demand vehicle ordering for the WhatsApp/Venezuela catalogue.
  if (/hilux/i.test(t) || /toyota.*hilux/i.test(t)) return 0;
  if (/ranger/i.test(t) || /ford.*ranger/i.test(t)) return 1;
  if (/frontier|navara/i.test(t) || /nissan.*(frontier|navara)/i.test(t)) return 2;
  if (/silverado|tahoe|trailblazer/i.test(t) || /chevrolet.*(silverado|tahoe|trailblazer)/i.test(t)) return 3;
  if (/f-?150|maverick/i.test(t) || /ford.*(f-?150|maverick)/i.test(t)) return 4;
  if (/(t8|t9|hunter|pickup)/i.test(t) && /jac/i.test(brand)) return 5;
  if (/fortuner|land cruiser|prado|rav4|corolla|cr-v|sportage|tiggo|x70|x90|song|seal|dolphin|coolray/i.test(t)) return 6;
  if (/jmc|maxus|isuzu|mitsubishi|mazda|d-max|foton|dongfeng|howo|sinotruk|shacman/i.test(t)) return 7;
  if (/pickup|truck|heavy/i.test(t)) return 8;
  return 99;
}

function brandDemandRank(v) {
  const brand = (v.brand ?? "").toLowerCase();
  const text = `${v.title ?? ""} ${v.model ?? ""}`.toLowerCase();
  const brandOrder = [
    "toyota",
    "ford",
    "nissan",
    "chevrolet",
    "jac",
    "isuzu",
    "mitsubishi",
    "mazda",
    "sinotruk",
    "howo",
    "foton",
    "dongfeng",
    "jmc",
    "maxus",
    "haval",
    "chery",
    "jetour",
    "geely",
    "byd",
    "hyundai",
    "kia",
  ];

  if (/hilux/.test(text)) return 0;
  if (/ranger/.test(text)) return 1;
  if (/frontier|navara/.test(text)) return 2;
  if (/silverado|tahoe|trailblazer/.test(text)) return 3;
  if (/t8|t9|hunter/.test(text) && /jac/.test(brand)) return 4;
  if (/f-?150|maverick/.test(text)) return 5;
  const index = brandOrder.indexOf(brand);
  return index >= 0 ? index + 10 : 1000;
}

function priority(v) {
  const rank = trimRank(v);
  const type = bodyType(v);
  const typeOrder = ["heavy_duty", "truck", "pickup", "commercial", "suv", "passenger", "supercar", "motorcycle", "other"];
  const typeRank = typeOrder.includes(type) ? typeOrder.indexOf(type) : typeOrder.length;
  const conditionRank = v.condition === "new" ? 0 : 1;
  const requestedOrder = type === "pickup" || type === "truck" || type === "machinery" ? [brandDemandRank(v), demandRank(v), rank] : [rank, brandDemandRank(v), demandRank(v)];
  return [typeRank, ...requestedOrder, conditionRank, -(v.year ?? 0), v.priceCNY ?? Number.MAX_SAFE_INTEGER, v.slug];
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
  if (v.site === "hendrick" || v.site === "hongyu" || v.site === "madeinchina") return `${SITE_URL}/vehicle-images/${v.site}/${encodeURIComponent(v.id)}/${encodeURIComponent(file)}`;
  return `${SITE_URL}/api/vehicle-image/${v.site}/${encodeURIComponent(v.id)}/${encodeURIComponent(file)}`;
}

function titleFor(v, brand) {
  const trim = cleanTrimLabel(v, brand);
  const configuration = [fuelClass(v), driveClass(v) === "Tracción por confirmar" ? null : driveClass(v), transmissionClass(v) === "Transmisión por confirmar" ? null : transmissionClass(v)].filter(Boolean).join(" · ");
  return `${brand} ${trim} ${v.year} - ${configuration} - Importación a Venezuela`;
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

function productTypeFor(v, brand, category) {
  const type = bodyType(v);
  return `Vehículos > ${category} > ${specificSegment(v, type)} > ${brand} > ${cleanTrimLabel(v, brand)} > ${fuelClass(v)} > ${driveClass(v)} > ${transmissionClass(v)}`.toLocaleUpperCase("es-VE");
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
  .filter((v) => v.availability === "available" && v.priceCNY != null && v.thumb != null && v.year >= YEAR_MIN && v.year <= YEAR_MAX && catalogBrand(v))
  .sort(comparePriority);

const selected = [];
const selectedIds = new Set();
function takeBalanced(type, limit) {
  const buckets = new Map();
  for (const vehicle of eligible.filter((candidate) => bodyType(candidate) === type)) {
    const key = trimKey(vehicle);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(vehicle);
  }
  const ordered = [...buckets.values()].sort((left, right) => comparePriority(left[0], right[0]));
  let added = 0;
  for (let pass = 0; added < limit && pass < PER_TRIM_CAP; pass += 1) {
    let changed = false;
    for (const bucket of ordered) {
      const vehicle = bucket[pass];
      if (!vehicle || selectedIds.has(vehicle.slug) || added >= limit) continue;
      selected.push(vehicle);
      selectedIds.add(vehicle.slug);
      added += 1;
      changed = true;
    }
    if (!changed) break;
  }
}
for (const [type, limit] of Object.entries(CATEGORY_TARGETS)) takeBalanced(type, limit);

const header = ["id", "title", "description", "availability", "condition", "price", "link", "image_link", "brand", "additional_image_link", "product_type", "custom_label_0", "custom_label_1", "custom_label_2", "custom_label_3", "custom_label_4"];
validateSelection(selected);
const lines = [header.join(",")];
for (const v of [...selected].sort(comparePriority)) {
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
    `${SITE_URL}/vehicles/${v.slug}?lang=es-VE&utm_source=meta&utm_medium=catalog&utm_campaign=${campaignName}`,
    imagePath(v, v.thumb),
    brand,
    additionalImages,
    productTypeFor(v, brand, category),
    category.toLocaleUpperCase("es-VE"),
    specificSegment(v, type).toLocaleUpperCase("es-VE"),
    demandTier(v).toLocaleUpperCase("es-VE"),
    `${v.condition === "new" ? "NUEVO" : "USADO"} · AÑO ${v.year}`,
    priceBand(priceUsd).toLocaleUpperCase("es-VE"),
  ];
  validateRow(row);
  lines.push(row.map(csvField).join(","));
}

fs.writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
console.log(`Wrote ${selected.length} Venezuela listings to ${path.relative(root, outPath)}`);
console.log(`Validated ${new Set(selected.map((vehicle) => vehicle.slug)).size} unique IDs across ${new Set(selected.map(catalogBrand)).size} approved brands.`);
