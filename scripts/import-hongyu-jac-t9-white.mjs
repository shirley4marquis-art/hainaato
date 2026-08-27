import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

// Clones the existing red JAC Hunter T9 listing (hongyu-jac-t9-hunter) with a
// different color and its own real photos — same vehicle, same specs, same
// price, only the color and images differ. Source photos supplied locally in
// Auto-Shop/FB/WHITE JAC T9 (Facebook marketplace photos of the actual unit).

const root = process.cwd();
const site = "hongyu";
const baseId = "jac-t9-hunter";
const newId = "jac-t9-hunter-white";
const sourceDir = path.join(root, "Auto-Shop", "FB", "WHITE JAC T9");

const indexPath = path.join(root, "data", "vehicles-index.json");
const detailsPath = path.join(root, "data", "vehicle-details.json");
const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
const details = JSON.parse(fs.readFileSync(detailsPath, "utf8"));

const baseSlug = `${site}-${baseId}`;
const baseIndexEntry = index.find((vehicle) => vehicle.slug === baseSlug);
const baseDetail = details[baseSlug];
if (!baseIndexEntry || !baseDetail) throw new Error(`Base listing ${baseSlug} not found — cannot clone.`);

const newSlug = `${site}-${newId}`;
if (details[newSlug]) throw new Error(`${newSlug} already exists — aborting to avoid duplicating.`);

// De-dupe by content hash — the source folder has one exact duplicate file.
const files = fs.readdirSync(sourceDir).filter((file) => file.toLowerCase().endsWith(".jpg")).sort();
const seenHashes = new Set();
const uniqueFiles = [];
for (const file of files) {
  const buffer = fs.readFileSync(path.join(sourceDir, file));
  const hash = await crypto.subtle.digest("SHA-256", buffer).then((digest) => Buffer.from(digest).toString("hex"));
  if (seenHashes.has(hash)) continue;
  seenHashes.add(hash);
  uniqueFiles.push(file);
}

const imageDir = path.join(root, "public", "vehicle-images", site, newId);
fs.mkdirSync(imageDir, { recursive: true });
const images = [];
for (let i = 0; i < uniqueFiles.length; i += 1) {
  const outFile = `${String(i + 1).padStart(2, "0")}.webp`;
  await sharp(fs.readFileSync(path.join(sourceDir, uniqueFiles[i])))
    .rotate()
    .resize({ width: 1400, height: 1050, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 84 })
    .toFile(path.join(imageDir, outFile));
  images.push(outFile);
}

const newStockCode = `${baseIndexEntry.stockCode}-WHITE`;

index.unshift({
  ...baseIndexEntry,
  slug: newSlug,
  id: newId,
  thumb: images[0],
  thumbs: images.slice(0, 4),
  imageCount: images.length,
  color: "White",
  stockCode: newStockCode,
  listedAt: new Date().toISOString(),
});

details[newSlug] = {
  ...baseDetail,
  slug: newSlug,
  id: newId,
  color: "White",
  images,
  specs: { ...baseDetail.specs, "Código de inventario": newStockCode },
  otherColorPhotos: [
    { file: baseDetail.images[0], color: "Red", slug: baseSlug, site, id: baseId },
  ],
};

// Cross-link the two sibling listings so each one's "Also Available In Other
// Colors" section points at the other.
baseDetail.otherColorPhotos = [
  ...baseDetail.otherColorPhotos.filter((oc) => oc.slug !== newSlug),
  { file: images[0], color: "White", slug: newSlug, site, id: newId },
];

fs.writeFileSync(indexPath, JSON.stringify(index));
fs.writeFileSync(detailsPath, JSON.stringify(details));
console.log(`Cloned ${baseSlug} -> ${newSlug} (White) with ${images.length} local photos.`);
