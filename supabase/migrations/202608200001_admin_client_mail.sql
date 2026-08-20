CREATE TABLE IF NOT EXISTS client_emails (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id         BIGINT REFERENCES customers(id),
  to_email            TEXT NOT NULL,
  subject             TEXT NOT NULL,
  html                TEXT NOT NULL,
  status              TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error               TEXT,
  provider_message_id TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_emails_customer ON client_emails(customer_id);
