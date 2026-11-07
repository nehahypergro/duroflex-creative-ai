# Reviewer confidence policy alignment — 5 November 2026

Confirmed the reported defect: `routing.js` imported v1 `policy.json`, while scoring selected the general v2 or PDP policy through `profiles.js`. Both currently use 0.7, so the mismatch was latent until tuning. A related hard-coded 0.7 in finding classification would also diverge for explicit-blocker reviews.

## Change

- Evaluation passes the same resolved policy to scoring, finding classification and correction routing, including explicit-blocker variants of general and PDP profiles.
- Routing requires a valid explicit confidence policy. It cannot silently choose v1 when the caller forgets it.
- Correction prerequisite checks use the saved report policy, rather than current defaults. Diagnostic classification of reports also uses that snapshot.
- No confidence threshold, quality threshold, severity policy, artwork or historical review was changed. Generic findings without a review retain the current general-profile default; saved legacy policy support remains for historical report validation.

## Verification

- **59 focused/shared tests passed:** 54 routing, reviewer, lifecycle, blocker, product and recovery checks, plus five format-profile checks.
- New tests vary thresholds to 0.6 and 0.9 for general and PDP profiles, with and without explicit-blocker policy; check below, equal to and above the threshold; reject missing/invalid policies; and preserve saved-report prerequisite thresholds.
- An isolated in-memory reintroduction of the old v1 routing threshold fails seven tests, confirming the regression detects the original divergence. It does not modify production files. Initial test drafting accidentally modified the pre-clone fixture instead of the assembled context; corrected before the authoritative regression and passing runs.
- Two additional historical layout replay tests cannot run because their saved Story artifacts were previously deleted (`creative-c5f646b0...` and `creative-3d7db977...`). They were not recreated or silently skipped. Their available local layout tests passed in the exploratory run. Historical replay across both brands remains unavailable for those records.
- Tests use synthetic evidence and no paid model calls. They establish policy consistency, not visual quality.
- Activated through an idle Studio restart: PID 24058, start timestamp 2026-11-04T18:31:51.683Z. Admin returned 200, protected jobs returned 401, both saved job hashes remained unchanged, and automatic job resumption remained disabled.

Evidence is in `work/reviewer-policy-routing-20261104/`: `thresholds.log`, `shared.log`, `profiles.log`, `legacy-regression.log`, `reproduce-legacy.cjs`, and activation snapshots. The directory retains the date the audit began.
