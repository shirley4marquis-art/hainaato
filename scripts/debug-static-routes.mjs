import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

const root = process.cwd();
const baseUrl = (process.env.AUDIT_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const appDir = path.join(root, "app");
const reportDir = path.join(root, "reports");
const required = ["/", "/vehicles", "/brands", "/compare", "/quote", "/quote/status", "/contact", "/dealer-programme", "/export-services", "/about", "/admin", "/legal/pricing-disclaimer", "/legal/shipping-import-disclaimer", "/robots.txt", "/sitemap.xml"];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes:true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function pageToRoute(file) {
  const relative = path.relative(appDir, path.dirname(file)).replaceAll(path.sep, "/");
  if (!relative) return "/";
  if (relative.split("/").some((segment) => segment.startsWith("[") || (segment.startsWith("(") && segment.endsWith(")")))) return null;
  return `/${relative}`;
}

const discovered = walk(appDir).filter((file) => file.endsWith(`${path.sep}page.tsx`)).map(pageToRoute).filter(Boolean);
const index = JSON.parse(fs.readFileSync(path.join(root, "data", "vehicles-index.json"), "utf8"));
const validSlug = index.find((vehicle) => vehicle.slug)?.slug;
const routes = [...new Set([...required, ...discovered, ...(validSlug ? [`/vehicles/${validSlug}`] : []), "/vehicles/definitely-not-a-real-vehicle"] )];
const resourceCache = new Map();

const text = (value="") => value.replace(/<[^>]+>/g, " ").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();
const matches = (html, regex) => [...html.matchAll(regex)];

async function fetchWithTimeout(url, options={}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try { return await fetch(url, { ...options, signal:controller.signal }); }
  finally { clearTimeout(timer); }
}

async function resourceStatus(resource) {
  const decodedResource = resource.replaceAll("&amp;", "&");
  let url = new URL(decodedResource, baseUrl);
  if (url.pathname === "/_next/image" && url.searchParams.get("url")) url = new URL(url.searchParams.get("url"), baseUrl);
  if (url.origin !== new URL(baseUrl).origin) return null;
  url.hash = "";
  if (!resourceCache.has(url.href)) resourceCache.set(url.href, fetchWithTimeout(url, { method:"HEAD", redirect:"follow" }).then((response)=>response.status).catch(()=>0));
  return resourceCache.get(url.href);
}

async function auditRoute(route) {
  const started = performance.now();
  let response;
  try { response = await fetchWithTimeout(`${baseUrl}${route}`, { redirect:"follow", headers:{ "user-agent":"HainaAutoRouteAudit/1.0" } }); }
  catch (error) { return { route, error:String(error), status:null, durationMs:Math.round(performance.now()-started) }; }
  const body = await response.text();
  const documentHtml = body.replace(/<(script|style|template|noscript)\b[\s\S]*?<\/\1>/gi, "");
  const durationMs = Math.round(performance.now()-started);
  const contentType = response.headers.get("content-type") || "";
  const isHtml = contentType.includes("text/html");
  const ids = isHtml ? matches(documentHtml, /\sid=["']([^"']+)["']/gi).map((match)=>match[1]) : [];
  const duplicateIds = [...new Set(ids.filter((id,index)=>ids.indexOf(id)!==index))];
  const h1s = isHtml ? matches(documentHtml, /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi).map((match)=>text(match[1])) : [];
  const internalLinks = isHtml ? [...new Set(matches(documentHtml, /<a\b[^>]*href=["']([^"']+)["']/gi).map((match)=>match[1]).filter((href)=>href.startsWith("/")&&!href.startsWith("//")))] : [];
  const images = isHtml ? [...new Set(matches(documentHtml, /<img\b[^>]*src=["']([^"']+)["']/gi).map((match)=>match[1]))] : [];
  const title = isHtml ? text(body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]) : null;
  const description = isHtml ? body.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] ?? body.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)?.[1] ?? null : null;
  const canonical = isHtml ? body.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i)?.[1] ?? body.match(/<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i)?.[1] ?? null : null;
  const linkChecks=[];
  for(const link of internalLinks) linkChecks.push([link,await resourceStatus(link)]);
  const imageChecks=[];
  for(const image of images.filter((value)=>value.startsWith("/"))) imageChecks.push([image,await resourceStatus(image)]);
  const brokenInternalLinks = linkChecks.filter(([,status])=>!status||status>=400).map(([link,status])=>({link,status}));
  const missingImages = imageChecks.filter(([,status])=>status===0||status>=400).map(([image,status])=>({image,status}));
  return {
    route, status:response.status, finalUrl:response.url, durationMs, sizeBytes:Buffer.byteLength(body), contentType,
    title, description, canonical, h1Count:h1s.length, h1s, mainCount:isHtml?matches(documentHtml,/<main\b/gi).length:null,
    duplicateIds, internalLinkCount:internalLinks.length, brokenInternalLinks, imageCount:images.length, missingImages,
    placeholderSignals:isHtml?matches(documentHtml,/(?:lorem ipsum|coming soon|href=["']#["']|placeholder image|image unavailable)/gi).length:0,
    htmlError:response.status<400 && isHtml && /(?:application error|internal server error|nextjs.*error|__next_error__)/i.test(body),
    checks:{ consoleErrors:"requires-browser", hydrationErrors:"requires-browser", horizontalOverflow:"requires-browser", accessibilityWarnings:"requires-browser" }
  };
}

const results = [];
for (const route of routes) results.push(await auditRoute(route));
const summary = { generatedAt:new Date().toISOString(), baseUrl, discoveredStaticRoutes:discovered.sort(), validVehicleRoute:validSlug?`/vehicles/${validSlug}`:null, results };
fs.mkdirSync(reportDir, { recursive:true });
fs.writeFileSync(path.join(reportDir, "static-route-audit.json"), `${JSON.stringify(summary,null,2)}\n`);
const markdown = ["# Static route audit", "", `Generated: ${summary.generatedAt}`, `Base URL: ${baseUrl}`, "", "| Route | Status | ms | KB | h1 | main | Duplicate IDs | Title |", "|---|---:|---:|---:|---:|---:|---|---|", ...results.map((r)=>`| ${r.route} | ${r.status??"ERR"} | ${r.durationMs} | ${r.sizeBytes?Math.round(r.sizeBytes/1024):"-"} | ${r.h1Count??"-"} | ${r.mainCount??"-"} | ${r.duplicateIds?.join(", ")||"—"} | ${(r.title||r.error||"").replaceAll("|","\\|")} |`), ""] .join("\n");
fs.writeFileSync(path.join(reportDir, "static-route-audit.md"), markdown);
console.table(results.map(({route,status,durationMs,sizeBytes,h1Count,mainCount,duplicateIds})=>({route,status,ms:durationMs,kb:sizeBytes?Math.round(sizeBytes/1024):null,h1:h1Count,main:mainCount,duplicateIds:duplicateIds?.join(", ")||""})));
if (results.some((result)=>result.status==null||result.status>=500)) process.exitCode=1;
