-- Security hardening tables (spec §4, §10).
--
-- These are also created lazily at runtime by lib/security/log.ts and
-- lib/security/rate-limit.ts (CREATE TABLE IF NOT EXISTS), matching the pattern
-- in lib/imports/store.ts. This migration is committed for schema parity and so
-- a fresh database has them up front with the right indexes.

-- Append-only log of notable security events. IPs are stored ONLY as a salted
-- hash (see lib/security/log.ts) — never raw. No credentials or tokens.
CREATE TABLE IF NOT EXISTS security_events (
  id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ts       timestamptz NOT NULL DEFAULT now(),
  type     text NOT NULL,
  ip_hash  text,
  country  text,
  path     text,
  detail   jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS security_events_ts_idx ON security_events (ts DESC);
CREATE INDEX IF NOT EXISTS security_events_type_ts_idx ON security_events (type, ts DESC);

-- Fixed-window request counters for the in-app rate limiter.
CREATE TABLE IF NOT EXISTS rate_limit_hits (
  key          text NOT NULL,
  window_start timestamptz NOT NULL,
  count        integer NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);
CREATE INDEX IF NOT EXISTS rate_limit_hits_window_idx ON rate_limit_hits (window_start);

-- Escalating cooldown state for repeat offenders.
CREATE TABLE IF NOT EXISTS rate_limit_blocks (
  key           text PRIMARY KEY,
  blocked_until timestamptz NOT NULL,
  strikes       integer NOT NULL DEFAULT 1,
  updated_at    timestamptz NOT NULL DEFAULT now()
);
