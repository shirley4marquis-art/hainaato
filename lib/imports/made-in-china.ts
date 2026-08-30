import crypto from "node:crypto";
import type { ImportedListing, ImportConfig, ImportLog } from "./types";
import { duplicateKey, extractModel, inferBrand, inferCondition, inferYear, isQualifiedListing, mapCategory, parsePrice } from "./normalization";
import { getImportConfig, saveImportLog, upsertImportedListings } from "./store";

const SOURCE_HOST = "www.made-in-china.com";
const SOURCE_ORIGIN = `https://${SOURCE_HOST}`;
const USER_AGENT = "HainaAutoImporter/1.0 (+https://hainautocn.com; supplier-discovery)";

type DiscoveredLink = {
  url: string;
  title: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanText(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanTitle(value: string): string {
  return cleanText(value).replace(/^\[(?:Hot Item|New Product|Featured Product)\]\s*/i, "");
}

function absoluteUrl(value: string): string {
  try {
    return new URL(value, SOURCE_ORIGIN).toString().replace(/^http:\/\//, "https://");
  } catch {
    return "";
  }
}

function isMadeInChinaHost(hostname: string): boolean {
  return hostname === SOURCE_HOST || hostname.endsWith(".made-in-china.com");
}

function isProductUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return isMadeInChinaHost(url.hostname) && /^\/product\//i.test(url.pathname) && /\.html$/i.test(url.pathname);
  } catch {
    return false;
  }
}

function searchUrl(query: string, page: number): string {
  const slug = encodeURIComponent(query.trim().replace(/\s+/g, "-"));
  const url = new URL(`/products-search/hot-china-products/${slug}.html`, SOURCE_ORIGIN);
  if (page > 1) url.searchParams.set("page", String(page));
  return url.toString();
}

async function fetchPublicHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.text();
}

async function robotsAllows(pathname: string): Promise<boolean> {
  try {
    const robots = await fetchPublicHtml(`${SOURCE_ORIGIN}/robots.txt`);
    const groups = robots.split(/\n(?=User-agent:)/i);
    const group = groups.find((block) => /User-agent:\s*\*/i.test(block));
    if (!group) return true;
    const disallows = [...group.matchAll(/Disallow:\s*(\S*)/gi)].map((match) => match[1]).filter(Boolean);
    return !disallows.some((rule) => rule !== "/" && pathname.startsWith(rule));
  } catch {
    return false;
  }
}

function discoverProductLinks(html: string): DiscoveredLink[] {
  const links = new Map<string, string>();
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorPattern)) {
    const href = absoluteUrl(match[1]).split("#")[0].split("?")[0];
    if (!href || !isProductUrl(href)) continue;
    const title = cleanText(match[2]);
    if (title.length < 8) continue;
    if (!/(truck|bus|excavator|loader|bulldozer|grader|roller|crane|machinery|equipment|forklift|mining)/i.test(`${title} ${href}`)) continue;
    links.set(href, title);
  }
  return [...links.entries()].slice(0, 20).map(([url, title]) => ({ url, title }));
}

function metaContent(html: string, name: string): string {
  const pattern = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  return cleanText(html.match(pattern)?.[1] ?? "");
}

function extractImages(html: string): string[] {
  const values = new Set<string>();
  const og = metaContent(html, "og:image");
  if (og) values.add(absoluteUrl(og));
  for (const match of html.matchAll(/<img\b[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi)) {
    const src = absoluteUrl(match[1]);
    if (src && !/logo|icon|sprite|blank|pixel/i.test(src)) values.add(src);
    if (values.size >= 8) break;
  }
  return [...values].filter(Boolean);
}

function extractSourceId(url: string): string {
  const pathname = new URL(url).pathname;
  const productId = pathname.match(/\/product\/([^/]+)\//i)?.[1];
  if (productId) return productId;
  const match = pathname.match(/([A-Za-z0-9_-]{8,})(?:\.html)?$/);
  return match?.[1] ?? crypto.createHash("sha1").update(url).digest("hex").slice(0, 16);
}

function extractSupplier(html: string, description: string): { name: string; location: string; type: string } {
  const text = cleanText(html);
  const descCompany = description.match(/-\s*([A-Z][A-Za-z0-9 .,&()'-]{4,90}(?:Co\.,?\s*Ltd\.?|Company Limited|Group Co\.,?\s*Ltd\.?))\s*$/)?.[1];
  const companyMatches = [...text.matchAll(/([A-Z][A-Za-z0-9 .,&()'-]{4,90}(?:Co\.,?\s*Ltd\.?|Company Limited|Group Co\.,?\s*Ltd\.?))/g)]
    .map((match) => match[1].replace(/^(?:Year|Months|Manual|Automatic|Diesel|Brand New|One Year Warranty|Cargo Box for Ore Muck Transportation)\s+/i, "").trim())
    .filter((name) => /\b(?:Co\.,?\s*Ltd\.?|Company Limited|Group Co\.,?\s*Ltd\.?)$/i.test(name));
  const company = descCompany ?? companyMatches.sort((a, b) => a.length - b.length)[0] ?? "";
  const location = text.match(/\b(Shandong|Shanghai|Jiangsu|Zhejiang|Henan|Hebei|Hubei|Hunan|Guangdong|Guangxi|Fujian|Shaanxi|Sichuan|Chongqing|Beijing|Tianjin|Anhui|Liaoning|Yunnan|Xinjiang),?\s*China\b/i)?.[0] ?? "China";
  const type = /manufacturer/i.test(text) ? "Manufacturer" : /trading/i.test(text) ? "Trading Company" : "";
  return { name: cleanText(company), location: cleanText(location), type };
}

function extractSpecs(html: string): Record<string, string> {
  const text = cleanText(html);
  const specs: Record<string, string> = {};
  const patterns: Array<[string, RegExp]> = [
    ["engine", /\bEngine\s*:?\s*([A-Za-z0-9 .,-]{2,40})/i],
    ["horsepower", /\b(?:Horsepower|Power)\s*:?\s*([0-9]{2,4}\s*(?:HP|hp|kw|kW)?)/i],
    ["transmission", /\bTransmission\s*:?\s*([A-Za-z0-9 .,-]{3,40})/i],
    ["fuel_type", /\bFuel\s*(?:Type)?\s*:?\s*([A-Za-z /-]{3,25})/i],
    ["gross_vehicle_weight", /\b(?:GVW|Gross Vehicle Weight)\s*:?\s*([A-Za-z0-9 .,-]{3,30})/i],
    ["payload", /\bPayload\s*:?\s*([A-Za-z0-9 .,-]{3,30})/i],
    ["dimensions", /\bDimensions?\s*:?\s*([A-Za-z0-9 .*x×,-]{6,45})/i],
    ["certification", /\bCertification\s*:?\s*([A-Za-z0-9 .,/,-]{2,40})/i],
    ["warranty", /\bWarranty\s*:?\s*([A-Za-z0-9 .,/,-]{2,40})/i],
    ["moq", /\b(?:MOQ|Minimum Order Quantity)\s*:?\s*([A-Za-z0-9 .,/,-]{2,40})/i],
  ];
  for (const [key, pattern] of patterns) {
    const value = text.match(pattern)?.[1];
    if (value) specs[key] = cleanText(value);
  }
  return specs;
}

async function extractProduct(url: string, fallbackTitle: string): Promise<ImportedListing> {
  const html = await fetchPublicHtml(url);
  const fullText = cleanText(html);
  const title = cleanTitle(metaContent(html, "og:title") || fallbackTitle);
  const description = metaContent(html, "description") || fullText.slice(0, 700);
  const brandInfo = inferBrand(`${title} ${description}`);
  const category = mapCategory(`${title} ${description}`);
  const price = parsePrice(fullText);
  const supplier = extractSupplier(html, description);
  const specs = extractSpecs(html);
  const images = extractImages(html).map((original_url, index) => ({
    original_url,
    haina_url: null,
    image_type: index === 0 ? "main" as const : "gallery" as const,
    source: "made-in-china" as const,
  }));
  const now = new Date().toISOString();
  const sourceProductId = extractSourceId(url);
  const model = extractModel(`${title} ${description}`, brandInfo.brand);
  const listing: ImportedListing = {
    id: `mic-${crypto.createHash("sha1").update(url).digest("hex").slice(0, 14)}`,
    source: "made-in-china",
    source_url: url,
    source_product_id: sourceProductId,
    category: category.category,
    subcategory: category.subcategory,
    brand: brandInfo.brand,
    original_brand: brandInfo.originalBrand,
    model,
    title,
    description,
    condition: inferCondition(`${title} ${description}`),
    year: inferYear(`${title} ${description}`),
    price: price.price,
    currency: price.currency,
    price_type: price.price_type,
    moq: specs.moq ?? null,
    country: "China",
    supplier_name: supplier.name,
    supplier_type: supplier.type,
    supplier_location: supplier.location,
    manufacturer: supplier.name,
    images,
    specifications: specs,
    availability: /in\s+stock|available/i.test(fullText) ? "available" : "",
    source_status: "unknown",
    shipping_information: /shipping|shipment|FOB|CIF/i.test(fullText) ? "Supplier page includes shipping-related terms; verify manually." : "",
    warranty: specs.warranty ?? "",
    source_verified: false,
    listing_status: "pending_review",
    imported_at: now,
    updated_at: now,
    duplicate_key: "",
    duplicate_of: null,
    review_notes: null,
  };
  listing.duplicate_key = duplicateKey({ source: listing.source, sourceProductId, sourceUrl: url, brand: listing.brand, model: listing.model, supplier: listing.supplier_name, title: listing.title });
  return listing;
}

export async function runMadeInChinaImport(overrides: Partial<ImportConfig> = {}): Promise<ImportLog> {
  const config = { ...(await getImportConfig()), ...overrides };
  const run: ImportLog = {
    run_id: `mic-${Date.now()}`,
    source: "made-in-china",
    started_at: new Date().toISOString(),
    completed_at: null,
    queries: config.queries,
    pages_scanned: 0,
    listings_found: 0,
    listings_imported: 0,
    duplicates: 0,
    rejected: 0,
    errors: [],
  };

  if (!config.enabled) {
    run.completed_at = new Date().toISOString();
    run.errors.push("Made-in-China import source is disabled.");
    await saveImportLog(run);
    return run;
  }

  const allowed = await robotsAllows("/products-search/");
  if (!allowed) {
    run.completed_at = new Date().toISOString();
    run.errors.push("Made-in-China robots.txt does not allow this public search path. Import skipped.");
    await saveImportLog(run);
    return run;
  }

  const staged: ImportedListing[] = [];
  const seen = new Set<string>();

  for (const query of config.queries) {
    for (let page = 1; page <= config.max_pages_per_query; page += 1) {
      if (staged.length >= config.max_products_per_run) break;
      const url = searchUrl(query, page);
      try {
        await sleep(config.request_delay_ms);
        const html = await fetchPublicHtml(url);
        run.pages_scanned += 1;
        const links = discoverProductLinks(html);
        run.listings_found += links.length;
        for (const link of links) {
          if (staged.length >= config.max_products_per_run) break;
          if (seen.has(link.url)) continue;
          seen.add(link.url);
          try {
            await sleep(config.request_delay_ms);
            const listing = await extractProduct(link.url, link.title);
            const rejection = isQualifiedListing(listing);
            if (rejection) {
              run.rejected += 1;
              run.errors.push(`${link.url}: ${rejection}`);
              continue;
            }
            staged.push(listing);
          } catch (error) {
            run.errors.push(`${link.url}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      } catch (error) {
        run.errors.push(`${url}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  const result = await upsertImportedListings(staged);
  run.listings_imported = result.imported;
  run.duplicates = result.duplicates;
  run.completed_at = new Date().toISOString();
  await saveImportLog(run);
  return run;
}
