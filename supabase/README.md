SinoVanta Supabase schema and seeds

Files:
- `schema.sql` — PostgreSQL schema for brands, categories, vehicles, images, quotes, sourcing requests, admin users.
- `seed.sql` — initial brand inserts and demo vehicle placeholders (clearly marked `demo=true`).

Applying to Supabase (recommended):
1. Open Supabase project SQL Editor and run `schema.sql`.
2. Run `seed.sql` to populate initial brands and demo vehicles.

Applying locally with psql:

```bash
psql $DATABASE_URL -f supabase/schema.sql
psql $DATABASE_URL -f supabase/seed.sql
```

Notes:
- Demo vehicle records intentionally omit prices and precise specifications. Replace these records in the admin dashboard with verified data before publishing.
- Images are referenced as URLs in `vehicle_images` or `vehicles.images` and should be uploaded to cloud storage (Supabase Storage, S3). Update image URLs after upload.
- Admin authentication should be implemented using Supabase Auth or a secure admin-only route; `admin_users` is provided for optional self-hosted auth approaches.
