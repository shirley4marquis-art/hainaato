# PDF, quotation and email security review

Implemented September 7, 2026. Scope: source review, automated regression tests,
live document-template installation and read-only CRM generation verification.
No live emails, customer/quote edits, deployment or penetration testing occurred.

## Fixes

- Public submissions no longer match existing customers using unverified phone/email claims. A new customer row prevents an attacker from receiving another customer's saved billing details in a generated PDF. Staff customer matching remains available.
- Duplicate cart listings no longer count multiple times toward the three-listing promotion.
- Quote status requires the existing signed access token before reading the CRM. The status form accepts the complete secure quotation link. Older reference-only tracking requires assistance from staff.
- Document generation now loads private PDF templates directly. Chromium and the HTML print renderer were removed, eliminating browser navigation and credential-forwarding from PDF generation. Optional catalogue images use a trusted origin and bounded downloads.
- Public specification PDFs now have rate limits. Public quote generation and PDFs fail closed if the database limiter cannot operate. Quote emails also have a recipient-based limit to reduce abuse across IPs.
- Admin quote, PDF, email and attachment routes verify staff authorization inside each handler. Cross-origin admin mutations are rejected; dotted admin paths are explicitly included in the proxy matcher. A caller-supplied cron header no longer bypasses the edge check.
- Email recipients must be single bare mailboxes; customer email sends limit recipient count, subject length/control characters, and HTML size. Template links permit only HTTP/HTTPS, and stored email previews enforce a sandbox CSP with no scripts or forms. Public quote JSON and custom email JSON are size bounded and must be objects.
- Ten existing invoice/business-verification PDFs were moved from the local `public` directory to ignored `private-documents`, retaining the files outside the static web root.

## Verification

Run `node --test lib/generation-security.test.mjs lib/documents/documents.test.mjs proxy.test.mjs`. The security, PDF and proxy checks pass. PDF samples and a mobile browser workflow were verified locally with fictitious CRM data. The live template migration and 41 defaults were subsequently installed and verified, and an existing CRM quotation rendered without changing its record. TypeScript, focused ESLint and a production build passed. Dependency audit reported zero known vulnerabilities. See document-generator-audit.md for the complete architecture and test scope.

## Deployment and historical limits

These fixes are local until deployed. Previously deployed static documents and CDN caches are not removed by a local move. Historical public quotes that already reference shared customer records need a separate authenticated data review; this patch does not rewrite existing records or rotate access secrets. Existing signed links remain valid. The configured image origin must serve the intended catalogue, and the database rate limiter must be available for public generation.
