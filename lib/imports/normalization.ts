import type { ImportedListing } from "./types";

const BRAND_ALIASES: Array<[RegExp, string]> = [
  [/\b(SINOTRUK|CNHTC|HOWO|HOWO\s+TRUCK)\b/i, "SINOTRUK / HOWO"],
  [/\b(SHACMAN|SHAANXI|SHAANXI\s+AUTO)\b/i, "SHACMAN"],
  [/\bFAW|JIEFANG\b/i, "FAW Jiefang"],
  [/\bFOTON|AUMAN\b/i, "FOTON / Auman"],
  [/\bDONGFENG\b/i, "DONGFENG"],
  [/\bBEIBEN\b/i, "BEIBEN"],
  [/\bCAMC\b/i, "CAMC"],
  [/\bHONGYAN\b/i, "Hongyan"],
  [/\bYUTONG\b/i, "Yutong"],
  [/\bKING\s*LONG\b/i, "King Long"],
  [/\bHIGER\b/i, "Higer"],
  [/\bZHONGTONG\b/i, "Zhongtong"],
  [/\bANKAI\b/i, "Ankai"],
  [/\bXCMG\b/i, "XCMG"],
  [/\bSANY\b/i, "SANY"],
  [/\bLIU\s*GONG|LIUGONG\b/i, "LiuGong"],
  [/\bZOOMLION\b/i, "ZOOMLION"],
  [/\bSHANTUI\b/i, "SHANTUI"],
  [/\bSDLG\b/i, "SDLG"],
  [/\bLONKING\b/i, "LONKING"],
  [/\bSEM\b/i, "SEM"],
];

const CATEGORY_PATTERNS: Array<[RegExp, string, string]> = [
  [/tractor\s+truck/i, "Trucks", "Tractor Truck"],
  [/dump\s+truck/i, "Trucks", "Dump Truck"],
  [/cargo\s+truck/i, "Trucks", "Cargo Truck"],
  [/mixer\s+truck|concrete\s+mixer/i, "Trucks", "Mixer Truck"],
  [/tanker\s+truck/i, "Trucks", "Tanker Truck"],
  [/mining\s+truck/i, "Trucks", "Mining Truck"],
  [/special.*truck/i, "Trucks", "Special Purpose Truck"],
  [/\btruck\b|heavy\s+truck/i, "Trucks", "Heavy Truck"],
  [/city\s+bus/i, "Buses", "City Bus"],
  [/coach\s+bus|tourist\s+bus/i, "Buses", "Coach Bus"],
  [/school\s+bus/i, "Buses", "School Bus"],
  [/mini\s*bus|minibus/i, "Buses", "Minibus"],
  [/electric\s+bus/i, "Buses", "Electric Bus"],
  [/\bbus\b/i, "Buses", "Coach Bus"],
  [/excavator/i, "Heavy Machinery", "Excavator"],
  [/wheel\s+loader|loader/i, "Heavy Machinery", "Wheel Loader"],
  [/bulldozer/i, "Heavy Machinery", "Bulldozer"],
  [/motor\s+grader|grader/i, "Heavy Machinery", "Motor Grader"],
  [/road\s+roller|roller/i, "Heavy Machinery", "Road Roller"],
  [/crane/i, "Heavy Machinery", "Crane"],
  [/concrete\s+pump/i, "Heavy Machinery", "Concrete Pump"],
  [/forklift/i, "Heavy Machinery", "Forklift"],
  [/mining/i, "Heavy Machinery", "Mining Equipment"],
  [/asphalt/i, "Heavy Machinery", "Asphalt Equipment"],
  [/construction|machinery|equipment/i, "Heavy Machinery", "Other Construction Equipment"],
];

export function normalizeBrand(input: string): { brand: string; originalBrand: string } {
  const originalBrand = input.trim();
  for (const [pattern, brand] of BRAND_ALIASES) {
    if (pattern.test(originalBrand)) return { brand, originalBrand };
  }
  return { brand: originalBrand || "Unknown", originalBrand };
}

export function inferBrand(text: string): { brand: string; originalBrand: string } {
  for (const [pattern, brand] of BRAND_ALIASES) {
    const match = text.match(pattern);
    if (match?.[0]) return { brand, originalBrand: match[0] };
  }
  return { brand: "Unknown", originalBrand: "" };
}

export function mapCategory(text: string): { category: string; subcategory: string } {
  for (const [pattern, category, subcategory] of CATEGORY_PATTERNS) {
    if (pattern.test(text)) return { category, subcategory };
  }
  return { category: "Heavy Machinery", subcategory: "Other Construction Equipment" };
}

export function inferYear(text: string): number | null {
  const match = text.match(/\b(20[1-3]\d|19[8-9]\d)\b/);
  return match ? Number(match[1]) : null;
}

export function inferCondition(text: string): string {
  if (/\bused|second[-\s]?hand|pre[-\s]?owned\b/i.test(text)) return "used";
  if (/\bnew\b/i.test(text)) return "new";
  return "";
}

export function extractModel(text: string, brand: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const tokens = cleaned.match(/\b[A-Z]{1,5}[-\s]?\d{2,5}[A-Z0-9-]*\b/) ?? cleaned.match(/\b[A-Z0-9]{2,8}\b/);
  if (tokens?.[0] && !brand.toLowerCase().includes(tokens[0].toLowerCase())) return tokens[0];
  return "";
}

export function parsePrice(text: string): Pick<ImportedListing, "price" | "currency" | "price_type"> {
  if (/contact\s+supplier|negotiable|get\s+latest\s+price/i.test(text)) {
    return { price: null, currency: "", price_type: "contact_supplier" };
  }
  const match = text.match(/\b(US\$|USD|\$|CNY|RMB)\s*([0-9][0-9,]*(?:\.\d+)?(?:\s*[-–]\s*[0-9][0-9,]*(?:\.\d+)?)?)(?:\s*\/\s*(Unit|Piece|Set))?/i);
  if (!match) return { price: null, currency: "", price_type: "" };
  const currency = match[1].toUpperCase().replace("US$", "USD").replace("$", "USD").replace("RMB", "CNY");
  const unit = match[3] ? ` / ${match[3]}` : "";
  return { price: `${currency} ${match[2].replace(/\s+/g, "")}${unit}`, currency, price_type: "supplier_listed" };
}

export function duplicateKey(parts: { source: string; sourceProductId: string; sourceUrl: string; brand: string; model: string; supplier: string; title: string }): string {
  const primary = parts.sourceProductId || parts.sourceUrl;
  if (primary) return `${parts.source}:${primary}`.toLowerCase();
  return [parts.source, parts.brand, parts.model, parts.supplier, parts.title].join("|").toLowerCase().replace(/\s+/g, " ").trim();
}

export function isQualifiedListing(listing: ImportedListing): string | null {
  if (!listing.title || listing.title.length < 8) return "Missing useful product name";
  if (!listing.source_url) return "Missing source URL";
  if (!listing.images.length) return "Missing main image";
  if (!listing.description || listing.description.length < 20) return "Missing useful description";
  if (!listing.supplier_name && !listing.manufacturer) return "Missing supplier/manufacturer";
  if (listing.brand === "Unknown" && !listing.model) return "Cannot identify brand or model";
  return null;
}

