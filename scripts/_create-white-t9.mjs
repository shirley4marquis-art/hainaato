import fs from "node:fs";
import path from "node:path";

const root = "D:/Haina Auto";
const idxPath = path.join(root, "data", "vehicles-index.json");
const detPath = path.join(root, "data", "vehicle-details.json");

const index = JSON.parse(fs.readFileSync(idxPath, "utf8"));
const details = JSON.parse(fs.readFileSync(detPath, "utf8"));

const baseSlug = "hongyu-jac-t9-hunter";
const newSlug = "hongyu-jac-t9-hunter-white";
const newId = "jac-t9-hunter-white";
const images = ["01.webp", "02.webp", "03.webp", "04.webp", "05.webp", "06.webp", "07.webp"];

const baseIndex = index.find((v) => v.slug === baseSlug);
const baseDetail = details[baseSlug];
if (!baseIndex || !baseDetail) throw new Error("base not found");
if (index.some((v) => v.slug === newSlug)) throw new Error("already in index");
if (details[newSlug]) throw new Error("already in details");

const newStockCode = `${baseIndex.stockCode}-WHITE`;

const newIndexEntry = {
  ...baseIndex,
  slug: newSlug,
  id: newId,
  title: baseIndex.title,
  thumb: images[0],
  thumbs: images.slice(0, 4),
  imageCount: images.length,
  color: "White",
  stockCode: newStockCode,
  listedAt: new Date().toISOString(),
};
delete newIndexEntry.otherColorPhotos;

const newProductDetail = {
  ...baseDetail,
  slug: newSlug,
  id: newId,
  color: "White",
  images,
  specs: { ...baseDetail.specs, "Código de inventario": newStockCode },
  otherColorPhotos: [
    { file: baseDetail.images[0], color: "Red", slug: baseSlug, site: "hongyu", id: "jac-t9-hunter" },
  ],
};

// cross-link the two siblings
baseDetail.otherColorPhotos = [
  ...(baseDetail.otherColorPhotos || []).filter((oc) => oc.slug !== newSlug),
  { file: images[0], color: "White", slug: newSlug, site: "hongyu", id: newId },
];

// insert new index entry near its sibling (right after base)
const bi = index.findIndex((v) => v.slug === baseSlug);
index.splice(bi + 1, 0, newIndexEntry);

details[newSlug] = newProductDetail;

fs.writeFileSync(idxPath, JSON.stringify(index));
fs.writeFileSync(detPath, JSON.stringify(details));
console.log(`Created ${newSlug}: ${images.length} images, stock ${newStockCode}`);
