import fs from "node:fs/promises";
import path from "node:path";
import { Pool, types } from "pg";
import type { ImportedListing, ImportConfig, ImportLog, ListingSearchFilters } from "./types";

types.setTypeParser(1082, (value: string) => value);

const dataDir = path.join(process.cwd(), "data");
const listingsPath = path.join(dataDir, "imported-listings.json");
const logsPath = path.join(dataDir, "import-logs.json");
const configPath = path.join(dataDir, "import-config.json");
const CONNECTION_STRING = process.env.IMPORT_DATABASE_URL || process.env.CRM_DATABASE_URL;

let pool: Pool | null = null;
let ready: Promise<void> | null = null;

export const DEFAULT_IMPORT_CONFIG: ImportConfig = {
  source: "made-in-china",
  enabled: true,
  categories: ["trucks", "buses", "heavy-machinery"],
  brands: ["HOWO", "SHACMAN", "FAW", "FOTON", "YUTONG", "KING LONG", "HIGER", "XCMG", "SANY", "LIUGONG", "ZOOMLION", "SHANTUI"],
  auto_publish: false,
  queries: [
    "HOWO truck",
    "SINOTRUK HOWO dump truck",
    "SHACMAN dump truck",
    "SHACMAN tractor truck",
    "FAW tractor truck",
    "Foton Auman truck",
    "Yutong bus",
    "King Long bus",
    "Higer bus",
    "XCMG excavator",
    "XCMG wheel loader",
    "SANY excavator",
    "LiuGong wheel loader",
    "Shantui bulldozer",
    "Zoomlion crane",
    "construction machinery",
    "mining truck",
    "road roller",
    "motor grader",
  ],
  max_pages_per_query: 1,
  max_products_per_run: 30,
  request_delay_ms: 1200,
};

function hasDatabase(): boolean {
  return Boolean(CONNECTION_STRING);
}

function getPool(): Pool {
  if (!CONNECTION_STRING) throw new Error("No import database connection string configured.");
  if (!pool) pool = new Pool({ connectionString: CONNECTION_STRING });
  return pool;
}

async function ensureDb() {
  if (!hasDatabase()) return;
  if (!ready) {
    ready = getPool().query(`
      CREATE TABLE IF NOT EXISTS supplier_import_products (
        id text PRIMARY KEY,
        source text NOT NULL,
        source_url text NOT NULL,
        source_product_id text NOT NULL,
        category text NOT NULL,
        subcategory text NOT NULL,
        brand text NOT NULL,
        original_brand text,
        model text NOT NULL,
        title text NOT NULL,
        description text NOT NULL,
        condition text NOT NULL,
        year integer,
        price text,
        currency text NOT NULL,
        price_type text NOT NULL,
        moq text,
        country text NOT NULL DEFAULT 'China',
        supplier_name text NOT NULL,
        supplier_type text NOT NULL,
        supplier_location text NOT NULL,
        manufacturer text NOT NULL,
        images jsonb NOT NULL DEFAULT '[]',
        specifications jsonb NOT NULL DEFAULT '{}',
        availability text NOT NULL,
        source_status text NOT NULL DEFAULT 'unknown',
        shipping_information text NOT NULL,
        warranty text NOT NULL,
        source_verified boolean NOT NULL DEFAULT false,
        listing_status text NOT NULL DEFAULT 'pending_review',
        imported_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL,
        duplicate_key text NOT NULL,
        duplicate_of text,
        review_notes text,
        UNIQUE (source, source_product_id),
        UNIQUE (source_url)
      );
      CREATE TABLE IF NOT EXISTS supplier_import_runs (
        run_id text PRIMARY KEY,
        source text NOT NULL,
        started_at timestamptz NOT NULL,
        completed_at timestamptz,
        queries jsonb NOT NULL DEFAULT '[]',
        pages_scanned integer NOT NULL DEFAULT 0,
        listings_found integer NOT NULL DEFAULT 0,
        listings_imported integer NOT NULL DEFAULT 0,
        duplicates integer NOT NULL DEFAULT 0,
        rejected integer NOT NULL DEFAULT 0,
        errors jsonb NOT NULL DEFAULT '[]'
      );
      CREATE TABLE IF NOT EXISTS supplier_import_config (
        source text PRIMARY KEY,
        config jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `).then(() => undefined);
  }
  await ready;
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2) + "\n");
}

function rowToListing(row: Record<string, unknown>): ImportedListing {
  return {
    id: row.id as string,
    source: row.source as ImportedListing["source"],
    source_url: row.source_url as string,
    source_product_id: row.source_product_id as string,
    category: row.category as string,
    subcategory: row.subcategory as string,
    brand: row.brand as string,
    original_brand: row.original_brand as string | null,
    model: row.model as string,
    title: row.title as string,
    description: row.description as string,
    condition: row.condition as string,
    year: row.year as number | null,
    price: row.price as string | null,
    currency: row.currency as string,
    price_type: row.price_type as string,
    moq: row.moq as string | null,
    country: "China",
    supplier_name: row.supplier_name as string,
    supplier_type: row.supplier_type as string,
    supplier_location: row.supplier_location as string,
    manufacturer: row.manufacturer as string,
    images: (row.images ?? []) as ImportedListing["images"],
    specifications: (row.specifications ?? {}) as ImportedListing["specifications"],
    availability: row.availability as string,
    source_status: row.source_status as ImportedListing["source_status"],
    shipping_information: row.shipping_information as string,
    warranty: row.warranty as string,
    source_verified: row.source_verified as boolean,
    listing_status: row.listing_status as ImportedListing["listing_status"],
    imported_at: new Date(row.imported_at as string | number | Date).toISOString(),
    updated_at: new Date(row.updated_at as string | number | Date).toISOString(),
    duplicate_key: row.duplicate_key as string,
    duplicate_of: row.duplicate_of as string | null,
    review_notes: row.review_notes as string | null,
  };
}

export async function getImportConfig(): Promise<ImportConfig> {
  await ensureDb();
  if (hasDatabase()) {
    const { rows } = await getPool().query("SELECT config FROM supplier_import_config WHERE source = $1", ["made-in-china"]);
    return { ...DEFAULT_IMPORT_CONFIG, ...(rows[0]?.config ?? {}) };
  }
  return { ...DEFAULT_IMPORT_CONFIG, ...(await readJson<Partial<ImportConfig>>(configPath, {})) };
}

export async function saveImportConfig(config: ImportConfig): Promise<ImportConfig> {
  const clean: ImportConfig = { ...DEFAULT_IMPORT_CONFIG, ...config, source: "made-in-china", auto_publish: config.auto_publish === true };
  await ensureDb();
  if (hasDatabase()) {
    await getPool().query(
      `INSERT INTO supplier_import_config (source, config, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (source) DO UPDATE SET config = EXCLUDED.config, updated_at = now()`,
      ["made-in-china", clean]
    );
  } else {
    await writeJson(configPath, clean);
  }
  return clean;
}

export async function listImportedListings(filters: ListingSearchFilters = {}): Promise<ImportedListing[]> {
  await ensureDb();
  if (hasDatabase()) {
    const { rows } = await getPool().query("SELECT * FROM supplier_import_products ORDER BY updated_at DESC LIMIT 500");
    return applyFilters(rows.map(rowToListing), filters);
  }
  return applyFilters(await readJson<ImportedListing[]>(listingsPath, []), filters);
}

export async function upsertImportedListings(incoming: ImportedListing[]): Promise<{ imported: number; duplicates: number }> {
  await ensureDb();
  let imported = 0;
  let duplicates = 0;

  if (hasDatabase()) {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      for (const item of incoming) {
        const existing = await client.query<{ id: string }>(
          "SELECT id FROM supplier_import_products WHERE source = $1 AND (source_product_id = $2 OR source_url = $3 OR duplicate_key = $4) LIMIT 1",
          [item.source, item.source_product_id, item.source_url, item.duplicate_key]
        );
        if (existing.rows[0]) {
          duplicates += 1;
          await client.query(
            `UPDATE supplier_import_products SET price=$2, currency=$3, price_type=$4, availability=$5, source_status=$6,
             images=$7, specifications=$8, updated_at=$9, duplicate_of=COALESCE(duplicate_of, $10)
             WHERE id=$1`,
            [existing.rows[0].id, item.price, item.currency, item.price_type, item.availability, item.source_status, JSON.stringify(item.images), JSON.stringify(item.specifications), item.updated_at, existing.rows[0].id]
          );
          continue;
        }
        imported += 1;
        await client.query(
          `INSERT INTO supplier_import_products
          (id, source, source_url, source_product_id, category, subcategory, brand, original_brand, model, title, description,
           condition, year, price, currency, price_type, moq, country, supplier_name, supplier_type, supplier_location,
           manufacturer, images, specifications, availability, source_status, shipping_information, warranty, source_verified,
           listing_status, imported_at, updated_at, duplicate_key, duplicate_of, review_notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35)`,
          [item.id, item.source, item.source_url, item.source_product_id, item.category, item.subcategory, item.brand, item.original_brand, item.model, item.title, item.description, item.condition, item.year, item.price, item.currency, item.price_type, item.moq, item.country, item.supplier_name, item.supplier_type, item.supplier_location, item.manufacturer, JSON.stringify(item.images), JSON.stringify(item.specifications), item.availability, item.source_status, item.shipping_information, item.warranty, item.source_verified, item.listing_status, item.imported_at, item.updated_at, item.duplicate_key, item.duplicate_of ?? null, item.review_notes ?? null]
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return { imported, duplicates };
  }

  const current = await readJson<ImportedListing[]>(listingsPath, []);
  for (const item of incoming) {
    const index = current.findIndex((row) => row.source === item.source && (row.source_product_id === item.source_product_id || row.source_url === item.source_url || row.duplicate_key === item.duplicate_key));
    if (index >= 0) {
      duplicates += 1;
      current[index] = { ...current[index], price: item.price, currency: item.currency, price_type: item.price_type, images: item.images, specifications: item.specifications, updated_at: item.updated_at, duplicate_of: current[index].duplicate_of ?? current[index].id };
    } else {
      imported += 1;
      current.unshift(item);
    }
  }
  await writeJson(listingsPath, current);
  return { imported, duplicates };
}

export async function updateImportedListing(id: string, patch: Partial<Pick<ImportedListing, "listing_status" | "source_verified" | "review_notes" | "category" | "subcategory" | "brand" | "model" | "title" | "description">>): Promise<ImportedListing | null> {
  await ensureDb();
  const updatedAt = new Date().toISOString();
  if (hasDatabase()) {
    const { rows } = await getPool().query(
      `UPDATE supplier_import_products SET listing_status=COALESCE($2, listing_status), source_verified=COALESCE($3, source_verified),
       review_notes=COALESCE($4, review_notes), category=COALESCE($5, category), subcategory=COALESCE($6, subcategory),
       brand=COALESCE($7, brand), model=COALESCE($8, model), title=COALESCE($9, title), description=COALESCE($10, description),
       updated_at=$11 WHERE id=$1 RETURNING *`,
      [id, patch.listing_status ?? null, patch.source_verified ?? null, patch.review_notes ?? null, patch.category ?? null, patch.subcategory ?? null, patch.brand ?? null, patch.model ?? null, patch.title ?? null, patch.description ?? null, updatedAt]
    );
    return rows[0] ? rowToListing(rows[0]) : null;
  }
  const current = await readJson<ImportedListing[]>(listingsPath, []);
  const index = current.findIndex((row) => row.id === id);
  if (index < 0) return null;
  current[index] = { ...current[index], ...patch, updated_at: updatedAt };
  await writeJson(listingsPath, current);
  return current[index];
}

export async function listImportLogs(): Promise<ImportLog[]> {
  await ensureDb();
  if (hasDatabase()) {
    const { rows } = await getPool().query("SELECT * FROM supplier_import_runs ORDER BY started_at DESC LIMIT 50");
    return rows.map((row) => ({
      run_id: row.run_id,
      source: row.source,
      started_at: new Date(row.started_at).toISOString(),
      completed_at: row.completed_at ? new Date(row.completed_at).toISOString() : null,
      queries: row.queries ?? [],
      pages_scanned: row.pages_scanned,
      listings_found: row.listings_found,
      listings_imported: row.listings_imported,
      duplicates: row.duplicates,
      rejected: row.rejected,
      errors: row.errors ?? [],
    }));
  }
  return readJson<ImportLog[]>(logsPath, []);
}

export async function saveImportLog(log: ImportLog): Promise<void> {
  await ensureDb();
  if (hasDatabase()) {
    await getPool().query(
      `INSERT INTO supplier_import_runs (run_id, source, started_at, completed_at, queries, pages_scanned, listings_found, listings_imported, duplicates, rejected, errors)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (run_id) DO UPDATE SET completed_at=EXCLUDED.completed_at, queries=EXCLUDED.queries, pages_scanned=EXCLUDED.pages_scanned,
       listings_found=EXCLUDED.listings_found, listings_imported=EXCLUDED.listings_imported, duplicates=EXCLUDED.duplicates,
       rejected=EXCLUDED.rejected, errors=EXCLUDED.errors`,
      [log.run_id, log.source, log.started_at, log.completed_at, JSON.stringify(log.queries), log.pages_scanned, log.listings_found, log.listings_imported, log.duplicates, log.rejected, JSON.stringify(log.errors)]
    );
    return;
  }
  const logs = await readJson<ImportLog[]>(logsPath, []);
  const index = logs.findIndex((row) => row.run_id === log.run_id);
  if (index >= 0) logs[index] = log;
  else logs.unshift(log);
  await writeJson(logsPath, logs.slice(0, 50));
}

function numericPrice(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/[0-9][0-9,]*(?:\.\d+)?/);
  return match ? Number(match[0].replace(/,/g, "")) : null;
}

function applyFilters(list: ImportedListing[], filters: ListingSearchFilters): ImportedListing[] {
  return list.filter((item) => {
    const q = filters.q?.trim().toLowerCase();
    if (q && !`${item.title} ${item.model} ${item.supplier_name}`.toLowerCase().includes(q)) return false;
    if (filters.category && item.category !== filters.category) return false;
    if (filters.brand && item.brand !== filters.brand) return false;
    if (filters.supplier && item.supplier_name !== filters.supplier) return false;
    if (filters.source && item.source !== filters.source) return false;
    if (filters.status && item.listing_status !== filters.status) return false;
    const price = numericPrice(item.price);
    if (filters.minPrice && (price == null || price < Number(filters.minPrice))) return false;
    if (filters.maxPrice && (price == null || price > Number(filters.maxPrice))) return false;
    return true;
  });
}
