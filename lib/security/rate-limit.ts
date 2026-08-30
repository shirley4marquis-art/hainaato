// In-application rate limiting — spec §4.
//
// Cloudflare's rate-limiting rules (docs/security-hardening.md) are the first
// line of defence for volumetric abuse. This module is the origin-side backstop
// for the sensitive endpoints (admin login, lead/quote submission, quote-status
// lookups) so they stay protected even against a request that reaches the Vercel
// origin directly, and so repeat offenders get an escalating cooldown.
//
// Fixed-window counter in Postgres (same DB / `pg` pool the CRM uses). Chosen
// over an in-memory limiter because serverless instances don't share memory.
import { Pool, types } from "pg";

types.setTypeParser(1082, (value: string) => value);

const CONNECTION_STRING = process.env.IMPORT_DATABASE_URL || process.env.CRM_DATABASE_URL;

let pool: Pool | null = null;
let ready: Promise<void> | null = null;

function hasDatabase(): boolean {
  return Boolean(CONNECTION_STRING);
}

function getPool(): Pool {
  if (!CONNECTION_STRING) throw new Error("No database connection string configured for rate limiting.");
  if (!pool) pool = new Pool({ connectionString: CONNECTION_STRING });
  return pool;
}

async function ensureDb(): Promise<void> {
  if (!hasDatabase()) return;
  if (!ready) {
    ready = getPool()
      .query(`
        CREATE TABLE IF NOT EXISTS rate_limit_hits (
          key text NOT NULL,
          window_start timestamptz NOT NULL,
          count integer NOT NULL DEFAULT 0,
          PRIMARY KEY (key, window_start)
        );
        CREATE INDEX IF NOT EXISTS rate_limit_hits_window_idx ON rate_limit_hits (window_start);
        CREATE TABLE IF NOT EXISTS rate_limit_blocks (
          key text PRIMARY KEY,
          blocked_until timestamptz NOT NULL,
          strikes integer NOT NULL DEFAULT 1,
          updated_at timestamptz NOT NULL DEFAULT now()
        );
      `)
      .then(() => undefined)
      .catch((error) => {
        ready = null;
        throw error;
      });
  }
  await ready;
}

export type RateLimitResult = {
  ok: boolean;
  /** Seconds the caller should wait before retrying (0 when ok). */
  retryAfter: number;
  /** Request count in the current window (best effort). */
  count: number;
  /** True when the key is in an escalating cooldown from repeated abuse. */
  blocked: boolean;
};

// Escalating cooldown ladder applied after a window limit is exceeded.
const COOLDOWN_LADDER_SEC = [60, 5 * 60, 30 * 60, 2 * 60 * 60, 12 * 60 * 60];

export type RateLimitOptions = {
  key: string;
  limit: number;
  windowSec: number;
  /** Apply the escalating cooldown ladder on breach (default true). */
  escalate?: boolean;
};

/**
 * Records one hit against `key` and reports whether it is allowed.
 * Fails OPEN (allows the request) if the database is unreachable — availability
 * of the public site is not sacrificed for the backstop limiter; Cloudflare
 * still covers the volumetric case.
 */
export async function checkRateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const { key, limit, windowSec, escalate = true } = opts;
  if (!hasDatabase()) return { ok: true, retryAfter: 0, count: 0, blocked: false };

  try {
    await ensureDb();
    const client = getPool();

    // 1. Active cooldown?
    const blockRow = await client.query<{ blocked_until: string; strikes: number }>(
      "SELECT blocked_until, strikes FROM rate_limit_blocks WHERE key = $1",
      [key]
    );
    if (blockRow.rows[0]) {
      const until = new Date(blockRow.rows[0].blocked_until).getTime();
      if (until > Date.now()) {
        return { ok: false, retryAfter: Math.ceil((until - Date.now()) / 1000), count: limit + 1, blocked: true };
      }
    }

    // 2. Increment the current fixed window.
    const windowMs = windowSec * 1000;
    const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString();
    const { rows } = await client.query<{ count: number }>(
      `INSERT INTO rate_limit_hits (key, window_start, count)
         VALUES ($1, $2, 1)
       ON CONFLICT (key, window_start)
         DO UPDATE SET count = rate_limit_hits.count + 1
       RETURNING count`,
      [key, windowStart]
    );
    const count = rows[0]?.count ?? 1;

    if (count <= limit) {
      return { ok: true, retryAfter: 0, count, blocked: false };
    }

    // 3. Over the limit — set / escalate the cooldown.
    let retryAfter = windowSec;
    if (escalate) {
      const strikes = (blockRow.rows[0]?.strikes ?? 0) + 1;
      const cooldown = COOLDOWN_LADDER_SEC[Math.min(strikes - 1, COOLDOWN_LADDER_SEC.length - 1)];
      retryAfter = cooldown;
      const blockedUntil = new Date(Date.now() + cooldown * 1000).toISOString();
      await client.query(
        `INSERT INTO rate_limit_blocks (key, blocked_until, strikes, updated_at)
           VALUES ($1, $2, $3, now())
         ON CONFLICT (key)
           DO UPDATE SET blocked_until = EXCLUDED.blocked_until,
                         strikes = rate_limit_blocks.strikes + 1,
                         updated_at = now()`,
        [key, blockedUntil, strikes]
      );
    }
    return { ok: false, retryAfter, count, blocked: escalate };
  } catch (error) {
    console.error("[rate-limit] check failed, allowing request:", error instanceof Error ? error.message : error);
    return { ok: true, retryAfter: 0, count: 0, blocked: false };
  }
}

/** Clears any cooldown / counters for a key (e.g. after a successful admin login). */
export async function resetRateLimit(key: string): Promise<void> {
  if (!hasDatabase()) return;
  try {
    await ensureDb();
    await getPool().query("DELETE FROM rate_limit_blocks WHERE key = $1", [key]);
  } catch (error) {
    console.error("[rate-limit] reset failed:", error instanceof Error ? error.message : error);
  }
}

/** Opportunistic cleanup of stale rows — call from a cron if desired. */
export async function pruneRateLimitData(): Promise<void> {
  if (!hasDatabase()) return;
  await ensureDb();
  await getPool().query("DELETE FROM rate_limit_hits WHERE window_start < now() - interval '1 day'");
  await getPool().query("DELETE FROM rate_limit_blocks WHERE blocked_until < now() - interval '1 day'");
}
