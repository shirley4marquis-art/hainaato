# Document design standard

All company-generated document covers use the supplied seven-page Haina Auto contract as the design reference. The original logo, company heading, orange rule, navy footer, A4 size, and commercial cover table artwork are retained as PDF vectors. Dynamic text uses Liberation Sans, matching the reference font family.

The shared layout covers quotations, proformas, commercial invoices, vehicle specifications, contracts, importation terms, inspection reports, acquisition statements, export documents, customs documents, and company verification. Spanish, English, Chinese, and bilingual variants use the same geometry. Existing signed contract/annex pages and verification evidence remain attached without redrawing signatures or changing their substantive terms.

## Rebuild and verify

Run `npm run documents:build`. This builds in an isolated ignored folder, renders every sample, checks all 42 covers against the source stationery, verifies all protected signature pixels, and checks the full approved payment block in 16 commercial/contract variants. Only the verified result is copied to `private-documents/design-library`; previews are in `private-documents/design-qa`.

Install reviewed defaults with `node --env-file=.env.local scripts/install-document-library.mjs --activate`. The installer uses the verified design library and appends new versions. Previously saved document PDFs remain immutable; newly generated documents use the updated defaults.

## Layout rules

- Keep the reference header and footer as original artwork, including their colors and contact information.
- Use the measured cover coordinates in `scripts/unify-document-design.mjs`. Keep gray metadata captions, white labels inside navy bands, bold buyer/seller names, pale totals panel, navy total band, and dashed customs panel.
- Technical documents use the same layout with technical values instead of commercial amounts.
- Keep a compact payment summary on the cover and the complete approved payment details inside.
- Preserve all vehicle records. Additional vehicles and long notes use unsigned continuation pages.
- Do not automatically rewrite old issued documents or alter signed evidence.

## Typography

Liberation Sans 2.1.5 regular and bold come from the [upstream font release](https://github.com/liberationfonts/liberation-fonts/releases/tag/2.1.5), under the accompanying SIL Open Font License. Noto Sans SC supplies Chinese glyphs. Custom-font ascent and descent are scaled from font units to prevent the PDF library from shrinking reference-sized headings.

The design preview uses fictional customer and vehicle data and is for layout review.
