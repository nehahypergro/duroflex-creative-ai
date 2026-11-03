# Pipeline handoff repairs — 3 November 2026

## Scope and preserved evidence

No live worker, queue, batch, provider reservation or old job was restarted/reset by this repair. The authoritative batch is the newer SQLite local-worker queue, not the historical parallel-static summary. An earlier side-chat status report incorrectly used that historical summary; it is not current batch status.

The original Duroflex LinkedIn-square and Story OCR/geometry errors were reproduced from saved artifacts. Minimal source-labelled regression fixtures are under `tests/creative-ai/fixtures/pipeline-recovery/`. They contain no image/font payloads or credentials. A separate Sleepyhead synthetic geometry fixture uses its own generic wording and does not claim to be a saved brand replay.

## Confirmed matching defect and repair

The LinkedIn square matcher allocated the first body line to the headline and physical product lettering to supporting copy, while reporting no issues. The Story OCR detected its CTA but planned-region matching rejected it after its position changed. Both cases initially failed the new regression tests.

`copy-region-assignment.js` now uses bounded similarity to saved wording as evidence for ownership of OCR regions, together with spatial bounds, line grouping and protected-product exclusion. It does not use recognized characters as campaign copy: match text and subsequent reconstruction still come from the saved exact-copy field. A region cannot be claimed by two fields. Competing non-overlapping matches remain ambiguous. Multiple fields with no confident ownership stop rather than falling back to unrestricted geometric block splitting. The single-field legacy geometric fallback remains for heavily misspelled OCR.

The actual saved LinkedIn and Story images were reconstructed offline with their own pinned fonts copied into an isolated temporary workspace. Both succeeded with six separate editable lines, including the Story CTA. No model call or old-job write was needed. This verifies reconstruction, not final repair quality or creative approval. Replay command:

    node --require ./tests/creative-ai/offline-bootstrap.cjs scripts/creative-ai/replay-saved-reconstruction.cjs

Assignment-v2 OCR and geometry reports use separate filenames. Separate-line frozen documents also use an assignment-v2 checkpoint filename, preserving previous reports/checkpoints. Existing ±5% font approximation and spacing bounds remain unchanged.

## Planning size conflict

The initial-size path multiplied pinned viewing-size minima by 1.3 and enforced the result as a mandatory preferred size. Earlier guidance also added a separate 15% / 18.4 CSS-pixel floor. This explains the 0.0975 headline and 0.065 body fractions in the saved 1200-pixel-wide plans.

New jobs pin composed quality version 14 and initial typography policy v2. They enforce the actual pinned placement reading targets without imposing the extra percentage as a minimum. Font-metric fit, supplied exact copy, qualifiers, subject/logo space and final review remain required. Existing jobs retain old pinned versions. New planning instructions route optional generated-copy conflicts through the existing single bounded upstream revision; this does not authorize rewriting exact supplied copy or shrinking frozen reconstructed type. The same policy is carried into source typography and type-guide generation.

## Invalid image URL preflight

The two saved counting failures were HTTP 400 `invalid_value` with parameter `url`, not evidence of a counting-service outage. Invalid requests now receive `INPUT_CONTEXT_REQUEST_INVALID` and actionable messaging.

Before paid dispatch, when staged image URLs specifically fail counting with a URL-related HTTP 400, the provider may count and send the original inline-image body instead. Counting and dispatch use the same final body. The first failure diagnostic is retained with fallback metadata. Non-URL errors, transport errors and already-dispatched/ambiguous requests do not trigger this fallback. There is no extra paid model request.

## Prompt budget and processing checkpoints

Existing lossless projection/dictionary compaction remains. Repeated identical instruction lines can be removed after those transformations, excluding exact-copy allowlist lines. A remaining oversize error records original/wire lengths and largest sections before image reservation. No source rules or exact copy are arbitrarily truncated. Metadata-only reconstruction of the saved portrait prompt with product-detail-reference descriptors and typography instructions currently compiles to 30,813 characters from 39,061. This is not an exact archived HTTP-body replay and does not prove that every past/future prompt fits; irreducible over-limit requests remain blocked.

`composed-processing-<unit>.json` records source-artwork preservation, matching, reconstruction, background repair and prepared composition, or the failed stage. Phase history and source hashes remain available. The source is reused through the existing request-bound cache. A failure is not creative approval; prepared composition still requires final review. No source intermediate is promoted into final delivery merely because conversion failed.

## Verification and remaining live validation

- Saved Duroflex LinkedIn/Story matcher regressions: failing before, passing after; isolated real-font reconstruction succeeds for both saved artworks.
- Synthetic Sleepyhead assignment/ambiguity/protected-label regression passes.
- Existing composition/mask/source-freezing/resume tests pass for both brands through versions 5–13, and new version 14 tests pass. Mocked reopen/resume does not add image dispatches.
- Context counting, URL-fallback, prompt-budget, copy-lock and exact-copy tests pass. Chrome checks use isolated temporary roots and mock providers.
- No live paid regeneration/repair/review was dispatched by this task. End-to-end model fidelity and readiness of newly generated version-14 creatives remain to be verified by a controlled live run in the main workflow. Old ambiguous requests require reconciliation; these changes never blindly resubmit them.
- Queue memory/crash recovery belongs to the newer local-worker service already implemented by the main work. This repair does not claim to have fixed every SIGABRT or exhausted every possible OCR/font/layout edge case.
