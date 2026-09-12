BEGIN;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS request_id uuid UNIQUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS payment_terms text;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS request_id uuid UNIQUE;
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS vin text;
CREATE TABLE IF NOT EXISTS admin_document_counters (scope text PRIMARY KEY, value bigint NOT NULL CHECK(value>0));
CREATE TABLE IF NOT EXISTS admin_operations (
 id uuid PRIMARY KEY, kind text NOT NULL CHECK(kind IN ('payment','shipment','customs','vehicle')),
 quote_ref text REFERENCES quotes(ref) ON DELETE RESTRICT, title text NOT NULL, status text NOT NULL,
 data jsonb NOT NULL DEFAULT '{}', actor text NOT NULL, version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_operations_kind ON admin_operations(kind,created_at DESC);
CREATE INDEX IF NOT EXISTS admin_operations_quote ON admin_operations(quote_ref);
CREATE TABLE IF NOT EXISTS admin_documents (
 id uuid PRIMARY KEY, number text NOT NULL UNIQUE, quote_ref text NOT NULL REFERENCES quotes(ref) ON DELETE RESTRICT,
 customer_id bigint NOT NULL REFERENCES customers(id) ON DELETE RESTRICT, type text NOT NULL,
 language text NOT NULL CHECK(language IN ('en','es')),
 status text NOT NULL DEFAULT 'generated' CHECK(status IN ('draft','generated','sent','signed','paid','completed')),
 snapshot jsonb NOT NULL, actor text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_documents_quote ON admin_documents(quote_ref,created_at DESC);
CREATE INDEX IF NOT EXISTS admin_documents_customer ON admin_documents(customer_id,created_at DESC);
CREATE TABLE IF NOT EXISTS admin_drafts (
 owner text NOT NULL, key text NOT NULL, data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(owner,key)
);
CREATE TABLE IF NOT EXISTS admin_activity (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor text NOT NULL, action text NOT NULL,
 reference text NOT NULL, quote_ref text REFERENCES quotes(ref) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_activity_quote ON admin_activity(quote_ref,created_at DESC);
ALTER TABLE admin_document_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON admin_document_counters,admin_operations,admin_documents,admin_drafts,admin_activity FROM anon,authenticated;
COMMIT;
