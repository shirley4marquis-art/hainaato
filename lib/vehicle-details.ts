import fs from "node:fs";
import path from "node:path";
import type { Vehicle } from "./format";

const detailShardCache = new Map<number, Record<string, Vehicle>>();
const DETAIL_SHARD_COUNT = 64;
const VEHICLE_SLUG_PATTERN = /^[a-z]+-[a-z0-9]+(?:-[a-z0-9]+)*$/;

function detailShardForSlug(slug: string): number {
  let hash = 2166136261;
  for (let index = 0; index < slug.length; index += 1) {
    hash ^= slug.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % DETAIL_SHARD_COUNT;
}

export function getVehicleBySlug(slug: string): Vehicle | null {
  // Imported stock IDs are usually numeric, but some trusted sources use
  // descriptive, hyphenated IDs (for example hongyu-jac-t9-hunter).
  if (slug.length > 160 || !VEHICLE_SLUG_PATTERN.test(slug)) return null;
  const shardNumber = detailShardForSlug(slug);
  let shard = detailShardCache.get(shardNumber);
  if (!shard) {
    const shardPath = path.join(
      process.cwd(),
      "data",
      "vehicle-detail-shards",
      `${shardNumber}.json`,
    );
    shard = JSON.parse(fs.readFileSync(shardPath, "utf8"));
    detailShardCache.set(shardNumber, shard!);
  }
  return shard![slug] ?? null;
}
