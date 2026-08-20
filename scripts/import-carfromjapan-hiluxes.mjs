import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dataDir = path.join(root, "data");
const indexPath = path.join(dataDir, "vehicles-index.json");
const detailsPath = path.join(dataDir, "vehicle-details.json");
const imageRoot = path.join(root, "public", "vehicle-images", "carfromjapan");
const listedAt = "2026-08-20T13:00:00.000Z";

const listings = [
  {
    id: "2885409",
    title: "2020 Toyota Hilux Pick Up 4WD",
    year: 2020,
    color: "Black",
    sourceUrl: "https://carfromjapan.com/cheap-used-toyota-hilux-pick-up-for-sale",
    stockCode: "HA-JP-HLX-2020",
    overview: "Used 2020 Toyota Hilux double-cab pickup with a lifted suspension, right-hand drive and four-wheel drive.",
  },
  {
    id: "454232022",
    title: "2022 Toyota Hilux GR Sport 4WD",
    year: 2022,
    color: "Black",
    sourceUrl: "https://carfromjapan.com/cheap-used-toyota-hilux-pick-up-for-sale",
    stockCode: "HA-JP-HLX-2022",
    overview: "Used 2022 Toyota Hilux GR Sport double-cab pickup with right-hand drive and four-wheel drive.",
  },
  {
    id: "3122594",
    title: "2023 Toyota Hilux GR Sport 4WD",
    year: 2023,
    color: "Black",
    sourceUrl: "https://carfromjapan.com/cheap-used-toyota-hilux-pick-up-for-sale",
    stockCode: "HA-JP-HLX-2023-GR",
    overview: "Used 2023 Toyota Hilux GR Sport double-cab pickup with right-hand drive and four-wheel drive.",
  },
  {
    id: "454232023",
    title: "2023 Toyota Hilux Pick Up 4WD",
    year: 2023,
    color: "White",
    sourceUrl: "https://carfromjapan.com/cheap-used-toyota-hilux-pick-up-for-sale",
    stockCode: "HA-JP-HLX-2023-WHT",
    overview: "Used 2023 Toyota Hilux double-cab pickup with right-hand drive and four-wheel drive.",
  },
];

function shardForSlug(slug) {
  let hash = 2166136261;
  for (let index = 0; index < slug.length; index += 1) {
    hash ^= slug.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 64;
}

const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
const details = JSON.parse(fs.readFileSync(detailsPath, "utf8"));

for (const listing of listings) {
  const slug = `carfromjapan-${listing.id}`;
  const imageDir = path.join(imageRoot, listing.id);
  if (!fs.existsSync(imageDir)) throw new Error(`Missing image directory: ${imageDir}`);
  const images = fs.readdirSync(imageDir).filter((file) => /\.(jpe?g|png|webp)$/i.test(file)).sort();
  if (images.length === 0) throw new Error(`No images found for ${slug}`);

  const detail = {
    slug,
    site: "carfromjapan",
    id: listing.id,
    url: listing.sourceUrl,
    title: listing.title,
    year: listing.year,
    priceCNY: null,
    msrpCNY: null,
    mileageKm: null,
    fuel: "Diesel",
    bodyType: "Pickup",
    gearbox: "Automatic",
    color: listing.color,
    location: "Japan",
    driveType: "4WD",
    overview: listing.overview,
    specs: {
      "Body Type": "Pickup",
      "Body Color": listing.color,
      "Fuel Type": "Diesel",
      Gearbox: "Automatic",
      "Drive Type": "4WD",
      Steering: "Right",
      Doors: "4",
      Seats: "5",
      Location: "Japan",
    },
    images,
    otherColorPhotos: [],
  };
  const entry = {
    slug,
    site: "carfromjapan",
    id: listing.id,
    title: listing.title,
    year: listing.year,
    priceCNY: null,
    mileageKm: null,
    fuel: "Diesel",
    bodyType: "Pickup",
    location: "Japan",
    thumb: images[0],
    thumbs: images.slice(0, 4),
    imageCount: images.length,
    color: listing.color,
    brand: "Toyota",
    model: "Hilux",
    condition: "used",
    availability: "available",
    transmission: "Automatic",
    stockCode: listing.stockCode,
    listedAt,
  };

  details[slug] = detail;
  const existingIndex = index.findIndex((vehicle) => vehicle.slug === slug);
  if (existingIndex === -1) index.unshift(entry);
  else index[existingIndex] = entry;

  const shardNumber = shardForSlug(slug);
  const shardPath = path.join(dataDir, "vehicle-detail-shards", `${shardNumber}.json`);
  const shard = JSON.parse(fs.readFileSync(shardPath, "utf8"));
  shard[slug] = detail;
  fs.writeFileSync(shardPath, JSON.stringify(shard));
}

fs.writeFileSync(indexPath, JSON.stringify(index));
fs.writeFileSync(detailsPath, JSON.stringify(details));
console.log(`Imported ${listings.length} Toyota Hilux listings.`);
