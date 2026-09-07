# Admin document generator: implementation and verification

September 7, 2026. Implementation and local verification are complete. The live
CRM migration and 41 active official templates are installed and verified.
Publishing the application update is pending explicit production approval.

## Root causes and repairs

The quote print route previously rebuilt documents as HTML/CSS and rendered
them with Chromium. It did not use the supplied PDF artwork. That architecture
could not preserve official pagination, signatures, stamps or typography.
Quotation and specification downloads now use the same PDF overlay engine;
the obsolete Chromium renderer and print stylesheet were removed.

The supplied documents were completed transactions, not blank templates. Merely
drawing new text would leave the old customer, values and VIN QR codes behind.
PDFium now removes only complete text objects, and explicitly mapped variable
images, from a derived copy. It preserves paths, tables, fills, logos and all
objects outside those areas. Partial-object removal and grouped artwork that
cannot be safely edited are rejected. Master files remain untouched.

Fontkit subsetting produced searchable Chinese characters with missing visible
outlines. A static Noto Sans SC TrueType font plus HarfBuzz subsetting fixes the
visual output while keeping files small. Latin uses the configured Helvetica,
Times or Courier font; fallback is applied only to unsupported characters.

Quote totals use integer minor units, quantities and numeric costs. CIF prices
are not charged freight and insurance twice; unspecified included costs display
as included. Customs estimates remain separate from the amount payable to the
seller. The old reference's hardcoded customs assumptions are not used in the
derived commercial layouts. The supplied contract variants require CIF because
their legal clauses explicitly describe CIF risk and insurance obligations.

The security audit also repaired unverified public customer matching, promotion
duplication, reference-only quote-status access, weak generation limits, missing
route-level staff checks, unsafe email link schemes and recipient validation.
Email previews are sandboxed. See generation-security-review.md.

## Architecture and changed files

| Area | Files |
| --- | --- |
| PDF inspection, layout, overlays, continuation pages | `lib/documents/pdf.ts`, `prepare-template.ts`, `mapping.ts`, `types.ts` |
| Fonts and numeric binding | `lib/documents/fonts.ts`, `data.ts`, `assets/fonts/*` |
| Template versions, saved PDFs, atomic numbering | `lib/documents/store.ts`, `numbering.ts`, `service.ts`, `http.ts` |
| Template and generation APIs | `app/api/admin/document-templates/**`, `app/api/admin/documents/**` |
| Mobile document center, preview and visual editor | `app/admin/documents/**`, admin navigation and quote/contract links |
| Existing quote/email/specification integration | `lib/render-quote-pdf.ts`, `lib/crm.ts`, quote PDF/resend/request routes, specification PDF route |
| Safe schema migration | `supabase/migrations/202609070001_document_templates.sql` |
| Reference preparation and derived languages | `scripts/prepare-official-templates.mjs`, `derive-document-templates.mjs`, `derive-contract-templates.mjs`, `derive-importation-templates.mjs` |
| Append-only installation | `scripts/install-document-library.mjs` |
| Regression and visual QA | `lib/documents/documents.test.mjs`, `lib/generation-security.test.mjs`, `scripts/test-document-output.mjs`, `test-document-browser.mjs`, `verify-signature-preservation.mjs` |
| Production dependency tracing | `next.config.ts`, `package.json`, `package-lock.json` |

Templates have an ID, family/version, document type, language, original file,
SHA-256, active status, timestamps, page geometry and field configuration. The
existing PostgreSQL connection stores the private original/prepared PDF bytes;
no public bucket or public template URL is introduced. RLS and privilege revokes
deny anonymous/authenticated PostgREST access. The server's staff checks govern
the APIs. An immutable-version trigger permits activation changes but requires
a new row for changes to template content or mappings.

Generation reserves a database-backed number in a transaction. Legacy quote
creation uses the same quotation counter after migration and retains its safe
fallback before migration. Idempotency keys prevent replaying a generation
request from creating a second saved document. Saved documents contain their
template version and input snapshot. Preview and download return the same PDF.

## Mapping and preservation

Coordinates are PDF points measured from the top-left of each visible CropBox.
The renderer transforms overlays for page rotation, preserving MediaBox,
CropBox, orientation and page size. The editor's drag/resize positions are
normalized to the PDF page dimensions, so browser size and zoom do not change
the saved coordinates. Numeric controls are also available on mobile.

Fields support font, size/weight, alignment, wrapping, tracking, line height,
minimum size, maximum lines, indexed vehicles/images and continuation regions.
Text wraps, then shrinks to its configured minimum. Content that still exceeds
the field continues only into an approved unsigned area/page; otherwise a useful
error is returned instead of clipping. Long vehicle rows remain intact.

Protected rectangles cover the original seller signatures/stamps on contract
pages 2 and 6. Neither preparation nor generation may touch those rectangles.
Entire pages can also be locked. Continuations cannot copy a protected/signed
page and can be inserted before a fixed signed final page. No signature is
extracted, redrawn or regenerated.

The private template library contains 40 language/type variants plus the fixed
business-verification document. A separate mapped original quotation remains
as a reference. English, Spanish, Chinese and bilingual variants derive from
the supplied artwork. The business-verification document remains unchanged.
The unrelated Transpacífico commercial invoices found locally were not used.

## Verification completed

- Production Next.js build, TypeScript and focused ESLint checks passed.
- Security, PDF and proxy regressions passed, including private-table grants,
  repeatable migration, immutable versions, concurrent numbering and rollback.
- Generated and rendered 42 reference/derived samples, including five vehicles,
  Spanish accents, Chinese buyer names, bilingual terms and missing optional
  values. Extraction checks reject old customer identifiers and broken bindings.
- Visual inspection verified Chinese outlines; extraction alone was insufficient.
- Pixel comparisons of both signature regions across four contract languages
  passed: fewer than 0.06% of pixels differed by more than 5/255, consistent with
  small anti-aliasing differences. Placement and resolution are preserved.
- Long bilingual continuation tests confirm the signed final page's content
  streams remain unchanged.
- Playwright verified a 390-pixel mobile document screen, generation, bilingual
  preview, page navigation, byte-identical download, no horizontal overflow,
  zoom-aware field dragging and saving a new mapping version. This used a
  fictitious local CRM fixture; temporary test routes were removed afterward.
- Production traces include the Noto font, PDFium WASM and HarfBuzz WASM.
- Dependency installation/audit reported zero known vulnerabilities.

Samples and screenshots are in `private-documents/qa/`, outside the public root.
No real emails were sent and no production customer records were modified.

## Installation and remaining limits

With a working `CRM_DATABASE_URL` in `.env.local`, run:

```powershell
node scripts/prepare-official-templates.mjs
node scripts/derive-document-templates.mjs
node scripts/derive-contract-templates.mjs
node scripts/derive-importation-templates.mjs
node scripts/test-document-output.mjs
node scripts/verify-signature-preservation.mjs
node --env-file=.env.local scripts/install-document-library.mjs --activate
```

The installer applies the additive migration and creates reviewed defaults. It
does not delete or rewrite customers, vehicles, orders or existing quotations.
Omit `--activate` to import drafts. Review samples in the admin preview before
issuing real documents. Deploy the code only together with the configured
template library; generation intentionally does not fall back to a generic PDF.

The saved CRM credentials initially failed authentication. After the password
was corrected, the direct host was unavailable from this machine. The project's
Supabase dashboard supplied its IPv4-compatible session pooler endpoint; the
local connection now works. The additive migration and all 41 reviewed defaults
are installed. Read-only verification checked every stored master checksum,
RLS and revoked public reads on all four new tables, then generated a four-page
PDF from an existing CRM quotation. All 86 existing quotations remain intact.
Run `node --env-file=.env.local scripts/verify-document-library.mjs` to repeat it.

The deployment setting is Sensitive. Automatic approval review rejected replacing
the production CRM connection without explicit permission to send its password
to Vercel. That operation did not execute. Production application deployment and
authenticated hosted generation remain pending approval and verification.
The local production build passed, using the existing news fallback when its
database access was unavailable inside the build sandbox.

Upload accepts PDF up to 4 MB to respect the existing hosting request limit.
DOCX must be exported to PDF first. Encrypted PDFs, interactive forms, executable
actions and cryptographically signed PDFs are rejected; visual signatures/stamps
are supported and preserved. Grouped artwork that cannot be cleared safely needs
a blank master or revised mapping. Unmapped languages for a custom uploaded
document require a corresponding template. Fixed business-verification artwork
is not translated or altered automatically.
