BEGIN;

-- The CRM tables (customers, quotes and everything hanging off a quote) are
-- only ever read/written through lib/crm.ts's direct Postgres connection
-- (CRM_DATABASE_URL, the postgres role — bypasses RLS). Nothing in the app
-- queries them through the Supabase Data API: the NEXT_PUBLIC_SUPABASE_ANON_KEY
-- shipped to the browser is used solely for staff /admin auth (see
-- lib/supabase/*), never for supabase.from(...) reads/writes against these
-- tables. There's also no auth.uid()-based ownership column here (customers
-- are CRM contacts, not authenticated app users), so an ownership policy
-- doesn't apply — this is the "server-only table" model: enable RLS with no
-- policies and revoke the Data API grants outright, matching
-- document_templates in 202609070001.
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_item_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_emails ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON customers, quotes, quote_items, quote_item_photos, follow_ups, quote_emails, client_emails
  FROM anon, authenticated;

-- Same reasoning for the security-hardening tables (spec §4, §10): these are
-- written only by lib/security/log.ts and lib/security/rate-limit.ts over
-- the same server-only connection, never exposed to the client.
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_hits ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_blocks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON security_events, rate_limit_hits, rate_limit_blocks FROM anon, authenticated;

COMMIT;
