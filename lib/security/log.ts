// Security event log — spec §10.
//
// Writes to a `security_events` Postgres table (same DB the CRM / importer use,
// via the `pg` pool). IP addresses are stored ONLY as a salted SHA-256 hash so
// the log is useful for rate-of-abuse analysis without retaining raw PII.
// Passwords, API secrets and full auth tokens are never passed in here.
//
// All writes are best-effort: a logging failure must never break the request
// being logged. When no database is configured the functions are no-ops.
import { createHash } from "node:crypto";
import { Pool } from "pg";

export type SecurityEventType =
  | "geo_blocked"
  | "edge_auth_failed"
  | "rate_limited"
  | "admin_login_failed"
  | "admin_login_blocked"
  | "admin_login_success"
  | "security_policy_changed"
  | "suspicious_request";

export type SecurityEventInput = {
  type: SecurityEventType;
  ip?: string | null;
  country?: string | null;
  path?: string | null;
  detail?: Record<string, unknown> | null;
};

const CONNECTION_STRING = process.env.IMPORT_DATABASE_URL || process.env.CRM_DATABASE_URL;

let pool: Pool | null = null;
let ready: Promise<void> | null = null;

function hasDatabase(): boolean {
  return Boolean(CONNECTION_STRING);
}

function getPool(): Pool {
  if (!CONNECTION_STRING) throw new Error("No database connection string configured for security logging.");
  if (!pool) pool = new Pool({ connectionString: CONNECTION_STRING });
  return pool;
}

async function ensureDb(): Promise<void> {
  if (!hasDatabase()) return;
  if (!ready) {
    ready = getPool()
      .query(`
        CREATE TABLE IF NOT EXISTS security_events (
          id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          ts timestamptz NOT NULL DEFAULT now(),
          type text NOT NULL,
          ip_hash text,
          country text,
          path text,
          detail jsonb NOT NULL DEFAULT '{}'
        );
        CREATE INDEX IF NOT EXISTS security_events_ts_idx ON security_events (ts DESC);
        CREATE INDEX IF NOT EXISTS security_events_type_ts_idx ON security_events (type, ts DESC);
      `)
      .then(() => undefined)
      .catch((error) => {
        ready = null;
        throw error;
      });
  }
  await ready;
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const salt = process.env.IP_HASH_SALT || "haina-auto-default-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export async function logSecurityEvent(input: SecurityEventInput): Promise<void> {
  if (!hasDatabase()) return;
  try {
    await ensureDb();
    await getPool().query(
      `INSERT INTO security_events (type, ip_hash, country, path, detail)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        input.type,
        hashIp(input.ip ?? null),
        input.country ?? null,
        input.path ? input.path.slice(0, 512) : null,
        JSON.stringify(input.detail ?? {}),
      ]
    );
  } catch (error) {
    console.error("[security-log] failed to record event:", error instanceof Error ? error.message : error);
  }
}

export type SecurityEventRow = {
  id: string;
  ts: string;
  type: string;
  ip_hash: string | null;
  country: string | null;
  path: string | null;
  detail: Record<string, unknown>;
};

export async function recentSecurityEvents(limit = 100, offset = 0): Promise<SecurityEventRow[]> {
  if (!hasDatabase()) return [];
  await ensureDb();
  const safeLimit = Math.min(500, Math.max(1, Math.round(limit)));
  const safeOffset = Math.max(0, Math.round(offset));
  const { rows } = await getPool().query<SecurityEventRow>(
    `SELECT id::text, ts, type, ip_hash, country, path, detail
       FROM security_events
      ORDER BY ts DESC
      LIMIT $1 OFFSET $2`,
    [safeLimit, safeOffset]
  );
  return rows;
}
