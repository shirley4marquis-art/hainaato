BEGIN;

-- news_articles/news_refresh_runs (lib/news/store.ts) and
-- supplier_import_products/supplier_import_runs/supplier_import_config
-- (lib/imports/store.ts) are created lazily (CREATE TABLE IF NOT EXISTS) over
-- the same server-only CRM_DATABASE_URL connection as the CRM tables in
-- 202609070002 — never through the Supabase Data API. Found with full
-- SELECT/INSERT/UPDATE/DELETE/TRUNCATE grants open to anon and authenticated
-- (the Supabase default for new public tables), i.e. writable by anyone
-- holding the public anon key. Same server-only-table fix: RLS on, no
-- policies, Data API grants revoked.
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_refresh_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_import_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_import_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_import_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON news_articles, news_refresh_runs, supplier_import_products, supplier_import_runs, supplier_import_config
  FROM anon, authenticated;

COMMIT;
