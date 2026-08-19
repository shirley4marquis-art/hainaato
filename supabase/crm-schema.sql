-- HainaAuto's own quotes/customers CRM database (Supabase project "hainaauto-crm",
-- ref xvpoaecztmrtqapmqxio) — ported from the sibling TransPacífico Motors
-- project's SQLite schema (carexportch/crm/schema.sql) to Postgres, but no
-- longer shared with that project. See lib/crm.ts for the client that talks
-- to this schema.

CREATE TABLE IF NOT EXISTS customers (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT,
  email      TEXT,
  address    TEXT,
  city       TEXT,
  country    TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per issued estimate (ref like EST0005). Totals (cif_total,
-- deposit_amount, balance_amount, duty_estimate, grand_total_reference) are
-- always derived from quote_items + freight/insurance/duty_pct by recalc() —
-- never hand-edited directly, so they can't drift out of sync with the line items.
CREATE TABLE IF NOT EXISTS quotes (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ref                        TEXT UNIQUE NOT NULL,
  -- Customer-facing document number (HA-QT-{year}-{seq}), separate from ref
  -- (EST####, used internally and by the public /quote/status lookup) —
  -- the printed quote PDF shows this, not ref.
  document_number            TEXT UNIQUE,
  customer_id                BIGINT NOT NULL REFERENCES customers(id),
  quote_date                 DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until                DATE,
  destination_port           TEXT NOT NULL,
  destination_country        TEXT NOT NULL,
  incoterm                   TEXT,
  delivery_estimate          TEXT,
  shipping_mode               TEXT CHECK (shipping_mode IN ('roro', 'enclosed', 'consolidated_container')),
  container_note              TEXT,
  inland_transport_cost       DOUBLE PRECISION NOT NULL DEFAULT 0,
  export_documentation_cost   DOUBLE PRECISION NOT NULL DEFAULT 0,
  freight_cost                DOUBLE PRECISION NOT NULL DEFAULT 0,
  insurance_cost               DOUBLE PRECISION NOT NULL DEFAULT 0,
  deposit_pct                  DOUBLE PRECISION NOT NULL DEFAULT 40,
  duty_pct                     DOUBLE PRECISION,
  duty_estimate_override        DOUBLE PRECISION,
  currency                      TEXT NOT NULL DEFAULT 'USD',
  -- language the printed PDF is generated in — buyers/staff span several
  -- countries, so this isn't assumed from the customer's country alone.
  language                      TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'es')),
  -- derived by recalc() from quote_items + the fields above:
  cif_total                     DOUBLE PRECISION NOT NULL DEFAULT 0,
  deposit_amount                 DOUBLE PRECISION NOT NULL DEFAULT 0,
  balance_amount                  DOUBLE PRECISION NOT NULL DEFAULT 0,
  duty_estimate                   DOUBLE PRECISION,
  grand_total_reference           DOUBLE PRECISION,
  status                          TEXT NOT NULL DEFAULT 'quoted'
                                   CHECK (status IN ('quoted', 'negotiating', 'deposit_paid', 'paid_full', 'usdt_payment_confirmed', 'bitcoin_payment_confirmed', 'inspection_scheduled', 'inspection_passed', 'export_docs_ready', 'booked_for_shipping', 'shipped', 'departed_port', 'arrived_port', 'customs_clearance', 'out_for_delivery', 'delivered', 'lost')),
  notes                           TEXT,
  public_consent                  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per vehicle/unit within a quote — the printed PDF's line-item
-- table row plus the spec paragraph under the vehicle's title, and the
-- source for its photo pages (quote_item_photos below). Not written by the
-- public website today (web leads are a single follow_ups note, not
-- itemized units) — populated from the admin panel when a quote is drafted.
CREATE TABLE IF NOT EXISTS quote_items (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  quote_id        BIGINT NOT NULL REFERENCES quotes(id),
  unit_label      TEXT,
  make            TEXT NOT NULL,
  model           TEXT NOT NULL,
  year            INTEGER,
  condition       TEXT NOT NULL CHECK (condition IN ('new', 'used')),
  mileage_km      INTEGER,
  mileage_mi      INTEGER,
  fuel_type       TEXT,
  engine          TEXT,
  power_hp        INTEGER,
  transmission    TEXT,
  drivetrain      TEXT,
  exterior_color  TEXT,
  interior_color  TEXT,
  capacity        INTEGER,
  history_notes   TEXT,
  -- Free-text spec blurb rendered under the vehicle title (e.g. "SUV grande
  -- de chasis independiente · V6 híbrido biturbo 3.4L i-FORCE MAX...") —
  -- natural marketing copy doesn't decompose cleanly into the structured
  -- columns above, so this is what actually prints; the structured columns
  -- remain for filtering/reporting and as an editing aid.
  spec_summary    TEXT,
  qty             INTEGER NOT NULL DEFAULT 1,
  fob_original    DOUBLE PRECISION NOT NULL,
  discount        DOUBLE PRECISION NOT NULL DEFAULT 0,
  fob_final       DOUBLE PRECISION NOT NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Captioned photos for a quote_item's pages in the printed PDF (e.g.
-- "Exterior — tres cuartos frontal"). For a catalogue vehicle these are
-- picked from its existing image set (lib/image-ranking.ts); for a one-off
-- sourcing request not in the scraped catalogue (like a custom order),
-- staff upload/link photos directly.
CREATE TABLE IF NOT EXISTS quote_item_photos (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  quote_item_id  BIGINT NOT NULL REFERENCES quote_items(id),
  url            TEXT NOT NULL,
  caption        TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS follow_ups (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  quote_id         BIGINT NOT NULL REFERENCES quotes(id),
  note             TEXT NOT NULL,
  next_action      TEXT,
  next_action_date DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Where a quote came from ('cart-checkout' for the automated customer-facing
-- flow in app/api/quote-requests/route.ts; null for quotes staff draft
-- directly in the admin panel) — lets the admin list show provenance without
-- parsing free-text notes.
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS source TEXT;

-- One row per outbound quotation email attempt (the automated send on
-- request, and any staff resend afterward) — lets admin show delivery status
-- and the exact email content sent, per quote (see lib/crm.ts's
-- recordQuoteEmail / listQuoteEmails).
CREATE TABLE IF NOT EXISTS quote_emails (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  quote_id          BIGINT NOT NULL REFERENCES quotes(id),
  to_email          TEXT NOT NULL,
  subject           TEXT NOT NULL,
  html              TEXT NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error             TEXT,
  provider_message_id TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_items_quote ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_item_photos_item ON quote_item_photos(quote_item_id);
CREATE INDEX IF NOT EXISTS idx_followups_quote ON follow_ups(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_emails_quote ON quote_emails(quote_id);
