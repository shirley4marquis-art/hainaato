import fs from "node:fs";
import path from "node:path";
import type { Vehicle } from "./format";

const detailShardCache = new Map<number, Record<string, Vehicle>>();
const DETAIL_SHARD_COUNT = 64;

function detailShardForSlug(slug: string): number {
  let hash = 2166136261;
  for (let index = 0; index < slug.length; index += 1) {
    hash ^= slug.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % DETAIL_SHARD_COUNT;
}

export function getVehicleBySlug(slug: string): Vehicle | null {
  if (!/^[a-z]+-[0-9]+$/.test(slug)) return null;
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
