// Generates public/meta-catalog-feed.csv — a Meta commerce product feed
// (https://www.facebook.com/business/help/120325381656392) covering every
// available vehicle. Point Commerce Manager's scheduled data feed at
// https://hainaauto.com/meta-catalog-feed.csv to sync it into the catalog
// linked to the WhatsApp Business Account, which drives the WhatsApp
// catalog tab.
//
// This is a static file (not a live API route) on purpose: the full feed
// runs ~8MB and Vercel serverless functions cap response bodies at 4.5MB,
// so it's generated here and served straight from the CDN instead.
//
// Re-run manually with `npm run data:catalog-feed` whenever
// data/vehicles-index.json changes (i.e. after `npm run data:build`).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const indexPath = path.join(root, "data", "vehicles-index.json");
const outPath = path.join(root, "public", "meta-catalog-feed.csv");

// hainaauto.com currently resolves to a different, older site — this app is
// only live at hainaauto.vercel.app for now. Once the domain is cut over,
// either edit this default or set META_CATALOG_SITE_URL when running the
// script, then re-run `npm run data:catalog-feed` and re-upload the feed.
const SITE_URL = process.env.META_CATALOG_SITE_URL ?? "https://hainaauto.vercel.app";
const MAX_ADDITIONAL_IMAGES = 10;

function imagePath(site, id, file) {
  return `${SITE_URL}/api/vehicle-image/${site}/${encodeURIComponent(id)}/${encodeURIComponent(file)}`;
}

function csvField(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildDescription(v) {
  const parts = [
    v.year,
    v.brand,
    v.model,
    v.mileageKm != null ? `${v.mileageKm.toLocaleString("en-US")} km` : null,
    v.color,
    v.transmission,
    v.location ? `Located in ${v.location}` : null,
  ].filter(Boolean);
  return `${parts.join(" · ")}. Stock ${v.stockCode}. Sourced from China with full export support from HainaAuto.`;
}

const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));

// Required fields per Meta's product feed spec are price and image_link, so
// anything missing either can't be listed. All rows in the current index are
// already availability: "available", but the filter stays in case that changes.
const eligible = index.filter((v) => v.availability === "available" && v.priceCNY != null && v.thumb != null);

const header = ["id", "title", "description", "availability", "condition", "price", "link", "image_link", "brand", "additional_image_link"];
const lines = [header.join(",")];

for (const v of eligible) {
  const brand = v.brand && !/^\d+$/.test(v.brand.trim()) ? v.brand : "";
  const additionalImages = (v.thumbs ?? [])
    .filter((t) => t !== v.thumb)
    .slice(0, MAX_ADDITIONAL_IMAGES)
    .map((t) => imagePath(v.site, v.id, t))
    .join(",");

  const row = [
    v.slug,
    v.title,
    buildDescription(v),
    "in stock",
    v.condition,
    `${v.priceCNY.toFixed(2)} CNY`,
    `${SITE_URL}/vehicles/${v.slug}`,
    imagePath(v.site, v.id, v.thumb),
    brand,
    additionalImages,
  ];
  lines.push(row.map(csvField).join(","));
}

fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
console.log(`Wrote ${eligible.length} listings to ${path.relative(root, outPath)} (${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB)`);
