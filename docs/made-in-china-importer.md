# Made-in-China Importer

Haina Auto's Made-in-China importer is a supplier-discovery and staging workflow. It does not publish supplier listings automatically.

## What It Does

- Searches public Made-in-China product pages for configured vehicle and machinery queries.
- Extracts product, supplier, image, pricing, specification, and source-link details where publicly available.
- Normalizes brand/category data into the Haina Auto import schema.
- Detects duplicates by source ID, source URL, and normalized product/supplier keys.
- Stores every qualified product as `pending_review`.
- Keeps source attribution visible: supplier name, Made-in-China source, and original listing URL.

## Admin Review

Open:

```txt
/admin/imports
```

Staff can:

- Filter by category, brand, supplier, status, and search text.
- Preview imported product details.
- Open the original Made-in-China listing.
- Approve/verify, reject, or mark a listing as needing update.
- Edit the discovery query configuration.
- Run discovery manually.
- View recent import logs.

## Scheduled Sync

The production cron runs daily at 03:00 UTC:

```json
{
  "path": "/api/cron/made-in-china-import",
  "schedule": "0 3 * * *"
}
```

Set this environment variable in Vercel:

```txt
CRON_SECRET=<strong random secret>
```

The cron endpoint checks:

```txt
Authorization: Bearer $CRON_SECRET
```

## Storage

Production uses:

```txt
IMPORT_DATABASE_URL
```

If `IMPORT_DATABASE_URL` is not set, it falls back to:

```txt
CRM_DATABASE_URL
```

If neither database URL exists, local development falls back to JSON files in `data/`.

## Compliance Notes

- Do not bypass CAPTCHA, logins, paywalls, or anti-bot controls.
- Do not import or remove watermarks from supplier images unless permitted.
- Do not fabricate prices, specifications, warranties, supplier identities, certifications, or stock levels.
- Treat Made-in-China data as supplier-provided information only; Haina Auto verification must happen before marking any listing verified.

