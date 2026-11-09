# Correction scope and Re-run check (9 November 2026)

## What went wrong

- Job `creative-a97696b5…` (Facebook feed square): the only concrete mismatch was "logo spans one-third width vs one-fifth" (`spatial-layout`). The single correction repainted a masked box around the logo; its check found "a pale rectangular patch behind the reduced logo" (`correction-integrity`). The candidate was **not** promoted: the delivered result is the original (`sha256 b866fb14…`), `correction.selected: false`.
- Job `creative-4edd4f2f…` (Story): "mattress cut off at the right edge". The planner chose a whole-page regenerate; the new picture kept the crop and was not promoted. The original was delivered.
- Job `creative-9a98148d…` (PMax): designs were saved, then their check failed after a paid call (a call-limit cancellation followed by a 400, and "fetch failed"). The legacy "Resume checks" button (`verificationRetryAvailable`) is only computed for legacy jobs (`engine.view` skips lean results), so the only way on was "Start another paid attempt", which makes every picture again.

## Correction scope (`correctionScopeVersion: 1`, new lean jobs)

`lib/creative-ai/lean/correction.js` decides from requirement IDs, before any paid call:

| Kind | Requirement IDs | What happens |
| --- | --- | --- |
| Layout | `spatial-layout`, `layout`, `structure`, `placement-placement-logo-*`, `placement-*-layout` | Not auto-corrected. Note: "Layout differs from plan; not auto-corrected." |
| Fixable | `copy-N`, `campaign-copy`, `logo`, `logo-omitted`, `product`, and anything else (brand rules, other placement rules) | Sent to the single correction |

- Only layout findings: no diagnosis, no image. The original stays "check before using"; the result's `correction` is `{action:null, selected:false, skipped:'layout-only', notCorrected:[…], note}`.
- Mixed findings: only the fixable ones go to the planner. The candidate may still show the untouched layout mismatches, but any other mismatch is new and blocks it (`acceptCandidate(…, targeted)`).
- The planner's own action: a whole-page `regenerate` is only sent when it addresses a known wording, logo or product defect. Otherwise it is recorded as `skipped:'needs-new-layout'` ("Needs a new layout; not auto-corrected.") and no picture is made.
- A candidate with `correction-integrity` or any new `clear_mismatch` is never promoted or shown; the original stays the result (this was already true; now covered by tests).
- Jobs saved before the pin keep their earlier behaviour.

## Re-run check (user decision, 9 Nov 2026)

A narrow exception to "ambiguous requests are reconciled, never duplicated":

- Only for the **review step** of a saved lean design whose check is missing, interrupted or failed (`lib/creative-ai/runtime/lean-recheck.js`).
- Only after an **explicit click** ("Re-run check" on the design page or in the project recovery panel, then "Re-run check" again in the confirm dialog).
- Exactly **one** new review request per click: a new request identity (`contract.recheck.number`), `maxProviderRequests: 1`, the same saved picture (SHA-256 checked against the file and the page the user saw), and a verification budget that permits reasoning only, under the job's money allowance. The same click identity never sends twice.
- The text says: "The earlier check may also have been charged (about ₹X); that cost stays marked unknown." ₹X is the median of this project's earlier checks at list prices (else the reservation allowance), with the dated exchange rate.
- The earlier ambiguous receipt and reservation stay as they are (charge unknown). Nothing is overwritten.
- It never makes or changes a picture and never runs the automatic correction afterwards. The normal readiness rules apply: no concrete mismatch is deliverable; remaining differences stay visible with a plain note.
- Endpoint: `POST /creative-ai/api/jobs/:id/lean-recheck` with `{route, placementId, sha256, brandId, requestId}`.

## Tests

- `tests/creative-ai/lean-correction-scope.test.js` (both brands): spatial-only → no correction call and an honest state; wording → correction runs; mixed; planner regenerate not sent; a candidate with a new defect is not promoted; unpinned jobs unchanged.
- `tests/creative-ai/lean-recheck.test.js` (both brands, real provider transport with stubbed HTTP): one review call, same image hash, new request identity, earlier reservation kept, cost note, no image call, hidden when the check passed, same click never resends.
- `tests/creative-ai/lean-recheck-browser.test.js` (both brands): the button, cost note, one POST with the exact hash, hidden after a passed check, recovery panel offer.
