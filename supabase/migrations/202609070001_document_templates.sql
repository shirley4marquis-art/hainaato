BEGIN;

CREATE TABLE IF NOT EXISTS document_templates (
  id uuid PRIMARY KEY,
  family_id uuid NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  name text NOT NULL,
  document_type text NOT NULL,
  language text NOT NULL CHECK (language IN ('en','es','zh','es-zh')),
  original_name text NOT NULL,
  original_pdf bytea NOT NULL,
  prepared_pdf bytea NOT NULL,
  sha256 text NOT NULL,
  mapping jsonb NOT NULL,
  pages jsonb NOT NULL,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, version)
);
CREATE TABLE IF NOT EXISTS document_template_defaults (
  document_type text NOT NULL,
  language text NOT NULL,
  template_id uuid NOT NULL REFERENCES document_templates(id),
  PRIMARY KEY (document_type, language)
);
CREATE TABLE IF NOT EXISTS document_number_counters (
  document_type text NOT NULL,
  year integer NOT NULL,
  last_number bigint NOT NULL CHECK (last_number > 0),
  PRIMARY KEY (document_type, year)
);
CREATE TABLE IF NOT EXISTS generated_documents (
  id uuid PRIMARY KEY,
  idempotency_key uuid NOT NULL UNIQUE,
  document_number text NOT NULL UNIQUE,
  document_type text NOT NULL,
  language text NOT NULL,
  quote_ref text NOT NULL,
  template_id uuid NOT NULL REFERENCES document_templates(id),
  filename text NOT NULL,
  pdf bytea NOT NULL,
  input_snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS generated_documents_quote_idx ON generated_documents(quote_ref, created_at DESC);

-- Published version content is immutable; edits insert another version.
CREATE OR REPLACE FUNCTION protect_document_template_version() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF (to_jsonb(NEW) - 'active' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'active' - 'updated_at') THEN
    RAISE EXCEPTION 'Template versions are immutable; create a new version';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS document_template_immutable ON document_templates;
CREATE TRIGGER document_template_immutable BEFORE UPDATE ON document_templates
FOR EACH ROW EXECUTE FUNCTION protect_document_template_version();

-- These files contain privileged company artwork and customer information.
-- Only the server's database connection may read/write; no public PostgREST policies.
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_template_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_number_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON document_templates, document_template_defaults, document_number_counters, generated_documents FROM anon, authenticated;
COMMIT;
