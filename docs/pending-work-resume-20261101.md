# Pending-work continuation — 1 November 2026

The subsequent end-to-end layout repair is documented in [layout repair report](../work/layout-planning-fix-20261101/REPORT.md). Read its live result before treating the older composition defect below as current.

This pass continues the recovered requests in `project-continuation-20261101.md`. The existing dirty checkout and historical outputs remain intact. The additional source safety copy is `work/pending-work-20261101/before-source.tar.gz`.

## Implemented in the shared interface

- Editor: compact contextual toolbar and download menu, separate Arrange/Layers tabs, selected-object actions, mobile layout. Reopening Layers after Arrange now resets the pane correctly.
- Favourites: no About Favourites icon, readable search field, All items / Projects / Design sets / Individual designs categories.
- Review: saved-plan summary, saved ratings and review status, plain-language details with original saved notes accessible. Multi-page sets use wrapping tiles. Narrow screens stack notes below artwork; a visual inspection found the old high-specificity two-column rule defeating the mobile rule, reproduced by a failing geometry check before repair.
- Restored alternative-selection and cloud-document recovery controls whose handlers existed without visible buttons.
- Review Edit audience focuses the visible choice, not the hidden stored value.
- Arrow keys navigate saved review alternatives after the previous navigation links were removed.
- Local briefs can open while remote project history is loading, preserving newly typed work.
- Explicit Refresh preview discards the old inspection snapshot, so downloading a newer saved edit can recover without silently exporting an unseen revision.
- A completed background brand refresh also clears that snapshot before repainting, preventing reloads from retaining a stale saved edit. Same-screen refresh still preserves the user's active work.
- Project placeholders reserve their artwork geometry while loading, preventing late images from shifting restored scroll positions. Mobile Home creation controls retain a 44px minimum touch height without changing fonts.
- Local static previews retain their supplied asset names. Collections with missing pages disable selection instead of presenting an action that cannot succeed.

## Font audit (no font-family changes applied)

Computed styles and actual browser font evidence are in `work/pending-work-20261101/font-audit.json`.

| Area | Declared font | Size | Observed rendered font on this Mac |
| --- | --- | --- | --- |
| Studio body | Inter / system / Arial fallback | 15px | SF NS, Helvetica |
| Admin body | Same stack | 13px | SF NS |
| Editor toolbar / inputs | Same stack | 11px / 12px | SF NS |
| Editor panel titles | Same stack | 16px | SF NS |
| Project gallery titles | Arial / Helvetica | 14px | Arial |
| Dropdown menu | Arial / Helvetica | 13px | Arial |
| Information icon | Georgia | 11px | Georgia |

The declared Inter stack does not establish that Inter is loaded. Artwork fonts are a separate saved, brand-scoped resource. The user has been shown the differences and asked whether to standardize the UI exceptions; the user chose to keep fonts unchanged. Do not apply font standardization or font-size changes.

## Final regression checkpoint

The requested interface/autofill cleanup is implemented and verified. Fonts remain unchanged. The live test completed but exposed a separate unresolved composition-quality defect, documented below; this is not a claim that new generated artwork is release-ready.

- Full offline suite excluding the large UI file: **1,654 passed, zero failed/cancelled, one fixture-dependent skip** out of 1,655 (`regression-final-rest.txt`, exit 0). No test subprocess required termination.
- The skipped original Cocoon saved-artwork test passed separately against the existing local evidence: **1 passed, no skip** (`saved-text-fitting-local.txt`). This asserts the historical quality failure remains visible; it does not approve that artwork.
- Complete 89-case UI file: **87 passed, 2 failed**, no skips/cancellations (`ui-regression-final.txt`). Both failures were outdated navigation expectations, not product regressions: completed activity intentionally stays open with a View designs link; tool category screens use Home navigation rather than the old task Back button.
- After updating only those test expectations, both cases and the existing completed-activity contract passed: **3 passed, zero failed/skipped/cancelled** (`ui-final-verification.txt`, exit 0). Navigation covers ten cycles per brand. Reconnection still verifies polling scope, offline pause, recovery, stopping at completion and no paid requests.
- Therefore **all 1,744 unique offline cases are covered by passing runs** across the full suite and targeted follow-ups. This is a combined coverage statement, not a claim that one monolithic run reported 1,744 passes. No production source changed after the final full-suite snapshots.
- Saved provider replay passed all applicable stages for both Duroflex and Sleepyhead with **zero failed stages and zero paid calls** (`saved-replay-final.json`). Recorded-envelope compatibility does not evaluate new image quality.
- JavaScript syntax and Git whitespace checks passed. Source hashes are in `final-source-checks.json`.

Tests ran in isolated source snapshots with the original offline network/output protection. The one saved-artwork check ran read-only against its existing fixture. Evidence is in `work/pending-work-20261101/`. Earlier failing logs remain as history; test selectors were migrated to current visible controls without restoring removed UI or suppressing meaningful assertions. Original failures and focused before/after evidence include `ui-complete-audit.txt`, `ui-cache-fix.txt` and `ui-layout-fix.txt`.

The source remains an uncommitted working checkout: 139 modified tracked entries and 283 untracked entries at this checkpoint, with nothing staged. These include earlier sessions' work. No reset, revert, clean, commit, service restart or restoration of older source snapshots was performed.

## Live LinkedIn test — explicitly approved 1 November 2026

Prepared one Duroflex Cocoon Cool Grey 3 Seater Sofa LinkedIn post at 1200×627 with editable text, using only Duroflex's saved product evidence and current matching research. The seven readiness checks pass; the prepared request is `work/pending-work-20261101/linkedin/draft.json`.

The new run's reservation cap is ₹10,000 within the standing per-project maximum; conservative combined testing exposure is approximately ₹711,252.55 against ₹1,000,000. This includes unresolved historical reservations, not just confirmed spend. The historical ₹15–₹16 estimate is based on one comparable run and is not a quote. Missing usage remains unknown.

Automatic approval review rejected the live launch because it sends private Duroflex brand/product source material to OpenAI and incurs charges. The user has now explicitly approved that exact payload, OpenAI destination, live test and its charges under the ₹10,000 cap. Approval is recorded in `work/pending-work-20261101/linkedin/user-approval.json`. The seven preparation checks and aggregate exposure were rechecked before dispatch. That approval was used for this one completed run. No additional paid retry was launched.

### Completed run and remaining quality defect

Job `creative-557033af-96a2-47cd-825a-46eeccb1c261` finished. Its artwork is **editable-needs-review**, not approved: text overlaps, clips and fails contrast checks. The automated review passed the logo and photograph checks. The planner saved 90px headline / 60px supporting and CTA sizes as both preferred and minimum values, in boxes that cannot fit the exact copy. The fitter correctly refused to go below those immutable limits. No corrective paid retry or typography change was made.

Seven recorded new provider receipts estimate **₹8.26**, using ₹96.6149/USD dated 9 October 2026; invoice totals are unknown. The ₹10,000 allocation is a reservation, not actual spend. Local receipts are saved; the Google Sheet was not manually synced in this pass.

See `work/pending-work-20261101/linkedin/REPORT.md`, `saved-result-audit.json` and the read-only `audit-saved-result.cjs` for the exact failure, measurements and reproduction. A shared upstream planning/geometry repair, its regression and a successful visual result remain outstanding. Passing offline checks alone must not be described as resolving this live composition failure. Preserve the failed image, layout, original editable document, review and costs.

## Upstream layout planning follow-up — 1 November, completed verification

The shared planner now uses pinned font metrics to reject impossible exact-text boxes before photography. The image handoff now projects reservations into model coordinates, labels reference roles and supplies a job-bound spatial guide. Interface fonts and approved artwork font families remain unchanged. Final offline run: 1,764 passed, zero failed, one saved fixture passed separately; both-brand recorded replay passed.

Fresh live verification generated four images across five new projects. A usable 1200×627 Cocoon composition is saved in project `creative-2f875aa6-8328-4842-99df-eff004774043`, **editor revision 1**, after an explicit local overlay adjustment. Exact words, font sizes and photo are preserved; fit, sampled contrast, subject clearance and pixel-identical reopened export pass. The original automated review remains failed and unchanged. This is a verified corrected composition, not proof of reliable first-pass autonomous image placement.

The managed local Studio was reloaded with the tested source, preserving all 335 job records and starting no generation calls. Scoped new test costs are estimated at ₹42.04. Full evidence and limitations: [layout repair report](../work/layout-planning-fix-20261101/REPORT.md). Final image: [verified revision 1](../work/layout-planning-fix-20261101/run-5/verified-export-revision-1.png).

## 2 November — composed artwork promoted to the main generation flow

New editable jobs now use the complete-artwork → mask-guided removal → frozen text reconstruction flow. Only the final image with text is user-visible; intermediates remain internal. The local managed Studio was reloaded with no active jobs and all 329 historical main job records preserved. Targeted suite: 42 passed; both-brand recorded handoffs: zero failed stages; saved-image main-flow replay visually inspected; no new paid calls. The broad suite is not fully green (1,757 passed, 8 failed, 7 cancelled), with legacy editor-control/navigation fixture failures retained for follow-up. See `docs/composed-text-flow-20261102.md` and `work/main-composed-flow-20261102/REPORT.md`.
