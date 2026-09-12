-- Required by quote creation/editing and document generation.
-- Additive and safe to rerun on existing CRM databases.
BEGIN;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS payment_terms TEXT;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS vin TEXT;
COMMIT;