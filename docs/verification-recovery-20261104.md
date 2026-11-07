# Verification request recovery — 4 November 2026

**Current verification:** the latest full offline run passed **2,158 tests with zero failures, cancellations or skips**. A fresh paid Sleepyhead LinkedIn run exposed additional review-contract and repair-layout defects; these were fixed, and a separate corrective candidate passed automated review. Safari verified Correcting, Ready, editable layers and a 1200 × 627 PNG download. Faint background-repair artifacts remain a visual limitation; this is not a claim of flawless output or full client-release readiness.

The original change described below distinguishes retrieving an existing request from making a bounded corrective request. Saved provider responses remain available for recovery and cost accounting. No historical project verdict, artwork, receipt or budget was rewritten, and no paid request was made for this change.

## What changed

- **Resume:** an accepted pending provider response is retrieved by its saved response ID. Retrieval keeps the same request identity, image, package, wording revision and OCR evidence. A waiting response does not consume another corrective attempt, and the manual verification reservation remains open until the check finishes.
- **Correct:** output truncation, invalid JSON or a failed output contract can trigger one deliberate corrective attempt. Its request includes changed instructions, contract feedback and/or output allowance. Receipts and saved responses record the operation, attempt, parent request key and reason. Review calls have a default ceiling of two provider calls total; an HTTP recovery shares that ceiling rather than adding another allowance.
- **Stop:** exhausted corrective attempts, permanent failures and ambiguous dispatched requests cannot be submitted again through the retry button. Unknown outcomes require reconciliation. Existing response files are retained; changing a nonce is not used to bypass them.
- **Stable evidence:** review OCR is saved atomically under an identity derived from the image hash, package hash, exact copy and OCR implementation. Concurrent checks reuse it. Unavailable OCR is also frozen so an ordinary retry cannot silently change the paid request. Changed artwork or package receives a different snapshot.
- **Studio:** the action is now “Resume checks.” Eligibility is recalculated from structured failure details, the recovery journal and remaining processing time. A stale button is rejected by the backend before a new verification allowance is reserved. A terminal response disables the confirmation button and displays “Verification stopped.”
- **Shared engine:** both brands use the same logic. Assembled-image review can read saved responses even when its dispatch allowance is exhausted. It cannot spend past that allowance.

The existing image generation, creative correction and acceptance policies are unchanged by this task. A completed HTTP response is not equivalent to a valid review, and a valid review can still report a real creative defect.

## Verification

Evidence is saved in `work/verification-recovery-20261104/`.

| Check | Result |
| --- | --- |
| Initial failing-before regression | 6 tests: 1 passed, 5 failed before the fix |
| Final focused transport, review, accounting and recovery checks | 88 passed, 0 failed |
| Editable composition and Studio preview recovery flows | 8 passed, 0 failed; includes both-brand format coverage |
| Resume button, duplicate clicks and exhausted state | 1 passed, 0 failed; both brands |
| Saved planning handoff replay, Duroflex and Sleepyhead | 0 unexpected failed stages |
| Source syntax and whitespace checks | Passed |

The new regression coverage includes truncated cached responses, deliberately different corrective requests, process restart, malformed JSON, stable concurrent OCR, exhausted legacy flags, pending-response retrieval without another POST, unknown network outcomes, stale buttons, expired recovery windows and preservation of the original wording revision. Runtime integration coverage verifies that pending retrieval does not prematurely finish the verification reservation.

The full offline suite was also run. Its unrestricted run recorded **2,048 passes, 91 failures and 5 cancellations** across 2,144 cases. Five of those failing cases subsequently passed in the focused reruns: an invalid historical request-key fixture, two transport classification expectations, permanent token-count failure classification, and the retry-button browser test. **At that point, 86 other failing cases and 5 cancellations lacked a passing rerun.** The later follow-up below resolved those suite failures. These include editor/browser flows, intake/default expectations and product-selection/navigation checks. They were not all baseline-compared, so they must not all be described as pre-existing. Full-app release readiness is not established.

The first full run inside the restricted sandbox also recorded localhost permission and browser startup failures. Its log is retained separately from the unrestricted run.

## Local deployment and limits

The idle local backend was gracefully restarted after the final runtime correction. Deployment recorded PID **40795**, start time **2026-11-04T08:55:50.540Z**, and the local `/admin` entry returned HTTP 200. Automatic job resumption remained disabled; no generation batch was resumed.

The focused browser automation used the existing Chrome test harness. Safari was opened for the requested live check, but active user interaction interrupted navigation, so that check was paused. A successful live Safari workflow and live paid-provider recovery were **not established in that initial phase**; see the paid follow-up below.

Historical failed reviews are not automatically approved or rerun by deployment. They retain their evidence and costs; the current eligibility checks determine whether an existing request can safely resume.

## Follow-up: unresolved regression failures

The follow-up work preserves the checkout as found. Its source snapshot, baseline diff and new logs are in `work/regression-cleanup-20261104/`. The changes from this task alone are recorded in `task-changes.patch`; the broader Git diff also contains earlier recovery work.

### Application defects corrected

- **Autofill product suggestions:** selecting a suggested SKU referenced undefined `variant` and `d` variables. The suggested product now opens the existing product-detail popup, where the exact variant is selected before applying the change. The draft retains its previous selection until confirmation. Product features remain bound to the chosen SKU, and manually chosen fields remain protected. The reported Cove selection failed in `browser-before.log` and passes in `product-first-pass.log`.
- **Editor ruler flash:** the removed pixel rulers were created visibly, then hidden by the first redraw. They now start hidden. Guide creation, dragging, grid settings and editor geometry remain available through their current controls. The browser regression failed in `editor-first-pass.log` and passes in `interaction-final.log`.

### Tests brought up to date

Many failing tests were still targeting controls deliberately removed or reorganised in previous UI changes. They now exercise the current workflow: variant selection inside the product popup; direct canvas text editing; arrows in Elements; current review/gallery controls; and six merged sidebar groups. Group coverage explicitly checks that employee, editorial, community, press, training and partnership assets remain reachable.

New-project fixtures now expect one complete continuity set, including every requested carousel slide and print face. Saved two-route fixtures still exercise their historical contracts. Unicode, exact wording, product protection, reservations and duplicate-dispatch assertions remain covered. Unknown image outcomes and reference-capacity failures are checked by their structured error codes.

Browser fixtures now supply usable font/image data, use the current recovery endpoints and return polling responses without racing aborted navigation requests. Image export checks compare dimensions and decoded pixels, since PNG encoding can change without changing the image. Removed download-selection controls are not restored merely to satisfy old tests; stale-revision download rejection and selected-artwork delivery are checked through current controls.

The editor checks continue to cover concurrent edits, failed saves, page-switch protection, undo/redo, SVG export, sharing and pixel-equivalent rendering. Manual editing must not dispatch AI requests. No quality threshold, review policy or generation budget was relaxed to make this suite pass.

### Follow-up verification

- First complete rerun: **2,143 passed, 5 failed, 0 cancelled** across 2,148 cases (`full-suite.log`). The remaining failures concerned the one-option fixture expectations and merged-group ordering.
- Corrected carousel/print rerun: **25 passed** (`sets-final.log`).
- Corrected intake/navigation rerun: **6 passed** (`intake-nav-final.log`).
- Saved Duroflex and Sleepyhead planning replays: **0 failed stages, 0 outbound network calls** (`both-brands.log`). Recorded contract migrations remain explicit; this is not a new-image quality assessment.
- Safari: the local Studio brief page reloaded successfully. Product details opened with the variant selector, and closing the popup left the draft unchanged. This was a limited read-only smoke check, not a complete Safari editing/export run.

The final full offline suite passed **2,148 tests, 0 failed, 0 cancelled, 0 skipped** (`full-final.log`, 627 seconds). It ran with four test workers; this test setting does not change production generation concurrency.

No paid generation, review, batch restart or backend restart was performed during the offline fixes. Only frontend application files changed in that phase, so the running local server can serve them on refresh. A standalone unauthenticated HTTP hash check was redirected to login and is not evidence of a stale deployed file; the authenticated Safari reload succeeded. Historical projects, source artwork, review verdicts and cost ledgers were not reset or reclassified.

### Authorised paid validation

The user subsequently explicitly authorised paid generation to test the fixes. A fresh Sleepyhead Kiki three-seater sofa in Sapling Green LinkedIn post was started through the current scoped runtime: `creative-604957df-f471-4da9-b327-501191eea3a0`. The prepared brief, selected variant/reference, current same-brand research, cost admission, runner and progress snapshots are in `work/regression-cleanup-20261104/live/`. This run uses one continuity set and the existing complete-artwork/editable composition/review pipeline. It does not restart the historical batch or replace its outputs. The original generation and automatic repair produced saved artifacts but stopped on the failures described below. The subsequent corrective candidate reused those artifacts and passed; its original failed attempt remains preserved.


### Defects exposed by the paid run and fixes

- **Review schema:** passing and unknown observations correctly returned empty `requirement` / `visibleImpact` fields, but the local validator implicitly required nonempty strings. The specific schema now permits empty fields for those observations; failed findings still require a named requirement, concrete impact and locations. The old review remains a genuine overlap failure rather than being retroactively approved.
- **Actual product boundary:** typography repair had trusted the planned product region even after generation put the sofa farther left. New product-dependent typography repairs require validated boundaries from the actual source image before reflow/removal. The original wording remains authoritative. Localization allowance is reserved alongside image repair and final review within the campaign's existing limits; insufficient allowance blocks dispatch.
- **Narrow-column reflow:** when normal widths intersect an observed protected region, local reflow can now wrap within a clear side corridor without reducing font size or changing wording. In this saved case, supporting copy narrowed from 576 to 403 px and grew vertically; the CTA moved down. Font sizes remained 90 px for the headline and 60 px for supporting copy/CTA.
- **Active correction UI:** an actively repairing component takes precedence over the parent's saved failed status. Studio shows “Correcting” and “Correcting your design…”, hides stopped/retry controls and continues polling. Ready sibling assets retain their own status. Terminal failure returns recovery controls; the removed component-progress panel stays removed.
- **Candidate projection:** a later explicitly authorised candidate is projected by its start time instead of returning the first historical repair entry. Its predecessor, receipts, results and failure evidence remain intact. Promotion rejects unverified candidates and still checks that the source/user edits have not changed.

Failing-before evidence and passing reruns are in `live/review-evidence-before.log`, `live/correction-status-before.log`, `live/narrow-layout-before.log`, `live/region-budget-before.log` and `live/latest-candidate-before.log`, with their corresponding after logs. The final combined focused run passed **53 tests** (`live/focused-final.log`). The full suite passed **2,158 tests, 0 failures/cancellations/skips** in 655 seconds (`live/full-after-live-fixes.log`). Both-brand saved planning replays passed again without outbound calls (`live/both-brands-after-live-fixes.log`). No quality gate was relaxed to obtain these results.

### Paid candidate and live deployment evidence

The separate candidate `8272923a8d0aeac93bc88f90548e44ece419b67f44e5186735d720a8370d62e7` records parent repair `c31cadf9262cee962744f87ef1371ce131249f3e61a76a50b71e50cbd3946bab`, the diagnosed change and the user's explicit paid-test authorization. It is not a reset of the consumed automatic attempt. It reuses the background byte-for-byte and preserves copy, font family and size. One new paid final-review request was made; no additional image generation was needed for this correction. It passed readability and product/text overlap, with product fidelity **88/100** and brief direction **82/100** under the job's pinned thresholds. The candidate was promoted at **2026-11-04T10:24:09.736Z**. See `live/corrective-result.json` and `live/final-view.json`.

The local backend was restarted while idle. Deployment records PID **70966**, start **2026-11-04T10:20:34.022Z**; `/admin` returned HTTP 200 and automatic job resumption remains disabled. No historical batch restarted.

Safari directly verified the exact affected project showing **Correcting** without the stopped/error panel. After completion, a reload showed **Ready**. Automatic terminal polling is verified by both-brand browser tests; an uninterrupted live Safari transition is not claimed because that tab retained its cached view until reloaded. Screenshots are `live/safari-correcting.png`, `live/safari-ready.png` and `live/safari-editor.png`.

The corrected artwork opened with separate headline, supporting-copy, CTA, logo and background layers, plus the editing chat. The editor PNG download completed and decoded at **1200 × 627** (`live/export-verification.json`). Download advisories remained visible; exporting does not constitute manual design approval. No manual artwork edit or extra AI call was made by this UI check.

**Cost:** the dedicated job has **12 deduplicated provider receipts: 2 image calls and 10 reasoning calls**, estimated **₹22.33** in total. This excludes inherited research receipts already allocated to their original job. The final corrective verification adds approximately **₹0.51** within that total. Actual billing remains unknown. Estimates use the application's saved model rates and dated **₹96.6149/USD** conversion (rate date **9 October 2026**, MSEI/RBI archive); they are not a current settlement-rate or invoice claim. See `live/cost-final.json`.

**Remaining visual limitation:** although the model approved the final composition, direct inspection shows a faint light patch on the left wall and a thin horizontal repair seam near the former text region. Local mask proof records zero changes outside the permitted mask, which does not prove seamless pixels inside it. These marks are retained as evidence and should not be represented as visually flawless or silently removed from the report. The successful test establishes targeted layout recovery, bounded corrective verification, editing/export availability and active-repair status behavior; it does not establish universal generation quality.
