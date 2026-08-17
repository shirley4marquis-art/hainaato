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
  id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ref                    TEXT UNIQUE NOT NULL,
  customer_id            BIGINT NOT NULL REFERENCES customers(id),
  quote_date             DATE NOT NULL DEFAULT CURRENT_DATE,
  destination_port       TEXT NOT NULL,
  destination_country    TEXT NOT NULL,
  shipping_mode          TEXT CHECK (shipping_mode IN ('roro', 'enclosed', 'consolidated_container')),
  container_note         TEXT,
  freight_cost           DOUBLE PRECISION NOT NULL DEFAULT 0,
  insurance_cost         DOUBLE PRECISION NOT NULL DEFAULT 0,
  deposit_pct            DOUBLE PRECISION NOT NULL DEFAULT 40,
  duty_pct               DOUBLE PRECISION,
  duty_estimate_override DOUBLE PRECISION,
  currency               TEXT NOT NULL DEFAULT 'USD',
  -- derived by recalc() from quote_items + the fields above:
  cif_total              DOUBLE PRECISION NOT NULL DEFAULT 0,
  deposit_amount         DOUBLE PRECISION NOT NULL DEFAULT 0,
  balance_amount         DOUBLE PRECISION NOT NULL DEFAULT 0,
  duty_estimate          DOUBLE PRECISION,
  grand_total_reference  DOUBLE PRECISION,
  status                 TEXT NOT NULL DEFAULT 'quoted'
                          CHECK (status IN ('quoted', 'negotiating', 'deposit_paid', 'paid_full', 'shipped', 'delivered', 'lost')),
  notes                  TEXT,
  public_consent         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per vehicle/unit within a quote. Not written by the website today
-- (web leads are a single follow_ups note, not itemized units) but kept for
-- schema parity / future use.
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
  qty             INTEGER NOT NULL DEFAULT 1,
  fob_original    DOUBLE PRECISION NOT NULL,
  discount        DOUBLE PRECISION NOT NULL DEFAULT 0,
  fob_final       DOUBLE PRECISION NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS follow_ups (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  quote_id         BIGINT NOT NULL REFERENCES quotes(id),
  note             TEXT NOT NULL,
  next_action      TEXT,
  next_action_date DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_items_quote ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_followups_quote ON follow_ups(quote_id);
