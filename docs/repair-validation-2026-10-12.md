# UI restoration and runtime repair — 12 October 2026

The dashboard, navigation, family strip, clinical summary panel and compact mint styling were restored from the original design at `1cd0417`. Current authentication, ownership checks, bounded queries, pagination, explicit failure states and draft cancellation were retained.

## Failures corrected

- Medicine search referenced a nonexistent `notes` column. Search now uses existing fields and an explicit submit action, avoiding the previous navigation loop.
- Summary requests now send the member ID expected by the server and display the actual response fields. Chat is available before summary generation and survives tab changes.
- Obsolete/unavailable Gemini models caused 404/503 responses. Model discovery excludes incompatible endpoints; configured primary/fallback models use bounded attempts. A stalled first attempt leaves time for the fallback. Thinking text is excluded from JSON extraction.
- PDF request validation now accommodates the advertised 10 MB PDF limit after base64 encoding. Medicine forms accept existing oral-solution/suspension records, zero stock, and unknown expiry; fractional quantities are rejected before reaching the integer database column.
- Server-rendered Base UI buttons produced hydration mismatches. The shared button is now a client component.
- Safety history incorrectly filtered a nonexistent `safety_audit_logs.user_id`. It now uses an inner medicine relationship and the medicine owner's ID.
- The safety RPC inserted text into a Postgres enum column. The migration now uses the table's typed record conversion. Provider failures explicitly report unavailable and persist UNKNOWN without clearing warning flags.
- Legacy report-bucket policies allowed broader reads/uploads than the owner policies. The new migration removes those legacy policies and keeps the bucket private.
- ADK database tools check authentication and ownership and return UNAVAILABLE on failed reads, rather than claiming success. Regulatory agent instructions no longer turn missing evidence into clearance.
- Mobile navigation and report-action overflow were repaired. Dashboard descriptions wrap instead of hiding their unassessed status.

## Verification

- `npm test`: 61 passing tests. Includes authorization, failed reads, stale requests, model fallback, PDF size, medicine validation, and owner-filtered safety history.
- `npm run lint`, `npm run typecheck`, and `npm run build` passed. The final production build also ran TypeScript and generated all routes successfully.
- Logged-in Edge: dashboard, member filters, medicine search, family hub, summary generation and chat checked during this repair session.
- Synthetic report extraction returned the expected `14.0 g/dL`. The report was not saved.
- Synthetic packaging-photo extraction returned the expected brand, 500 mg strength, batch, manufacture date and 2027-12-31 expiry. The medicine was not saved.
- Safety history loaded; the real unavailable-provider path recorded ten UNKNOWN attempts while preserving existing medicine warnings.
- Dashboard viewport checks at 320, 375 and 768 pixels; corrected horizontal overflow at 320 and 768. Returned the browser to its normal viewport. Final browser console contained no captured errors or warnings.
- Live `record_safety_screen` transaction exercised the enum/RLS path successfully and was rolled back.
- Deployed Supabase functions: report analysis v4, enrichment v12, regulatory scanner v3. All three returned HTTP 401 to anonymous POST requests. Enrichment/scanner retain explicit in-function authentication.

## Deployment and remaining limits

The safety/owner-guard migration and legacy report-policy cleanup were applied to the connected Supabase project. Do not rerun all SQL files indiscriminately; use the migrations appropriate to the deployment.

The supplied API key is stored only in ignored local environment files. The Next.js hosting environment must separately receive the server-only variables in `.env.example`; pushing this repository does not upload local credentials.

During the final regulatory-provider diagnostic, Google returned HTTP 429 for a synthetic search request. Regulatory scanning therefore remains limited by provider quota/rate availability. The app reports this accurately and issues no clearance. No automatic scheduler was present; scheduled background scans have not been configured or verified.

The sibling local `../my-agent` package is an experimental ADK runtime, separate from this Git repository and from the web request handlers. Its model configuration was updated, ignored local credentials configured, misleading database-success stubs corrected, and build/connectivity tested successfully (`TEST_OK`). It still has no authenticated production database adapter or durable patient-memory service. These sibling changes are local and are not part of this web-repository commit.

This pass does not claim exhaustive device, screen-reader, two-account isolation, print/QR, or production performance testing. Earlier audit documentation describes the prior review and is superseded by this note for the checks performed here.
