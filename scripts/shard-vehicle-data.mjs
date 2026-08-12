import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const shardCount = 64;
const input = path.join(root, "data", "vehicle-details.json");
const output = path.join(root, "data", "vehicle-detail-shards");

function shardForSlug(slug) {
  let hash = 2166136261;
  for (let index = 0; index < slug.length; index += 1) {
    hash ^= slug.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % shardCount;
}

const details = JSON.parse(fs.readFileSync(input, "utf8"));
const shards = Array.from({ length: shardCount }, () => ({}));
for (const [slug, vehicle] of Object.entries(details)) {
  shards[shardForSlug(slug)][slug] = vehicle;
}

fs.mkdirSync(output, { recursive: true });
for (let index = 0; index < shardCount; index += 1) {
  fs.writeFileSync(path.join(output, `${index}.json`), JSON.stringify(shards[index]));
}
console.log(`Wrote ${Object.keys(details).length.toLocaleString()} vehicle details across ${shardCount} shards.`);
