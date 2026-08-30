import fs from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import type { NewsArticle, NewsRefreshLog } from "./types";

// A bounded history is kept (not one row per article forever) so the table/file
// doesn't grow unbounded from a daily cron — see pruneToLimit below.
const KEEP_LIMIT = 150;

const dataDir = path.join(process.cwd(), "data");
const articlesPath = path.join(dataDir, "news-articles.json");
const logsPath = path.join(dataDir, "news-refresh-logs.json");

// Same Postgres connection already used by the made-in-china import pipeline
// (lib/imports/store.ts) — no new secret to configure.
const CONNECTION_STRING = process.env.IMPORT_DATABASE_URL || process.env.CRM_DATABASE_URL;

let pool: Pool | null = null;
let ready: Promise<void> | null = null;

function hasDatabase(): boolean {
  return Boolean(CONNECTION_STRING);
}

function getPool(): Pool {
  if (!CONNECTION_STRING) throw new Error("No news database connection string configured.");
  if (!pool) pool = new Pool({ connectionString: CONNECTION_STRING });
  return pool;
}

async function ensureDb() {
  if (!hasDatabase()) return;
  if (!ready) {
    ready = getPool()
      .query(`
        CREATE TABLE IF NOT EXISTS news_articles (
          id text PRIMARY KEY,
          source text NOT NULL,
          title text NOT NULL,
          link text NOT NULL UNIQUE,
          image text,
          published_at timestamptz NOT NULL,
          fetched_at timestamptz NOT NULL
        );
        CREATE TABLE IF NOT EXISTS news_refresh_runs (
          run_id text PRIMARY KEY,
          started_at timestamptz NOT NULL,
          completed_at timestamptz,
          sources jsonb NOT NULL DEFAULT '[]',
          articles_found integer NOT NULL DEFAULT 0,
          articles_imported integer NOT NULL DEFAULT 0,
          duplicates integer NOT NULL DEFAULT 0,
          errors jsonb NOT NULL DEFAULT '[]'
        );
      `)
      .then(() => undefined);
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

export async function listLatestNews(limit = 40): Promise<NewsArticle[]> {
  if (hasDatabase()) {
    try {
      await ensureDb();
      const { rows } = await getPool().query(
        "SELECT id, source, title, link, image, published_at, fetched_at FROM news_articles ORDER BY published_at DESC LIMIT $1",
        [limit]
      );
      return rows.map((row) => ({
        id: row.id,
        source: row.source,
        title: row.title,
        link: row.link,
        image: row.image,
        published_at: new Date(row.published_at).toISOString(),
        fetched_at: new Date(row.fetched_at).toISOString(),
      }));
    } catch (error) {
      // Public news should remain available during local credential issues or
      // a temporary database outage. Mutation paths intentionally still fail
      // loudly so refresh jobs cannot appear successful when persistence fails.
      console.warn(
        "News database read failed; using the local news fallback.",
        error instanceof Error ? error.message : String(error),
      );
    }
  }
  const current = await readJson<NewsArticle[]>(articlesPath, []);
  return [...current].sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at)).slice(0, limit);
}

export async function upsertNewsArticles(incoming: NewsArticle[]): Promise<{ imported: number; duplicates: number }> {
  await ensureDb();
  let imported = 0;
  let duplicates = 0;

  if (hasDatabase()) {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      for (const article of incoming) {
        const result = await client.query(
          `INSERT INTO news_articles (id, source, title, link, image, published_at, fetched_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (link) DO UPDATE SET title = EXCLUDED.title, image = EXCLUDED.image, fetched_at = EXCLUDED.fetched_at
           RETURNING (xmax = 0) AS inserted`,
          [article.id, article.source, article.title, article.link, article.image, article.published_at, article.fetched_at]
        );
        if (result.rows[0]?.inserted) imported += 1;
        else duplicates += 1;
      }
      await client.query(
        `DELETE FROM news_articles WHERE id NOT IN (SELECT id FROM news_articles ORDER BY published_at DESC LIMIT $1)`,
        [KEEP_LIMIT]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return { imported, duplicates };
  }

  const current = await readJson<NewsArticle[]>(articlesPath, []);
  const byLink = new Map(current.map((row) => [row.link, row]));
  for (const article of incoming) {
    if (byLink.has(article.link)) duplicates += 1;
    else imported += 1;
    byLink.set(article.link, article);
  }
  const merged = [...byLink.values()]
    .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at))
    .slice(0, KEEP_LIMIT);
  await writeJson(articlesPath, merged);
  return { imported, duplicates };
}

export async function saveNewsRefreshLog(log: NewsRefreshLog): Promise<void> {
  await ensureDb();
  if (hasDatabase()) {
    await getPool().query(
      `INSERT INTO news_refresh_runs (run_id, started_at, completed_at, sources, articles_found, articles_imported, duplicates, errors)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (run_id) DO UPDATE SET completed_at = EXCLUDED.completed_at, articles_found = EXCLUDED.articles_found,
         articles_imported = EXCLUDED.articles_imported, duplicates = EXCLUDED.duplicates, errors = EXCLUDED.errors`,
      [log.run_id, log.started_at, log.completed_at, JSON.stringify(log.sources), log.articles_found, log.articles_imported, log.duplicates, JSON.stringify(log.errors)]
    );
    return;
  }
  const current = await readJson<NewsRefreshLog[]>(logsPath, []);
  current.unshift(log);
  await writeJson(logsPath, current.slice(0, 50));
}
