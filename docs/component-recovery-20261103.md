# Targeted campaign recovery — 3 November 2026

The shared Duroflex/Sleepyhead runtime now tracks placement-specific component progress and creates isolated recovery candidates. New composed jobs pin componentRecoveryVersion 1. Existing jobs can request one targeted repair through Studio without restarting their campaign. Their original contracts and verdicts remain preserved.

## Implemented behavior

- Progress reports saved copy, generated scene, typography, logo, composition, review and export separately, with ready/repairing/attention counts. The project and progress screens preserve available designs while a repair runs.
- Structured diagnoses include the affected component, category, observed evidence, likely cause, reusable work and supported action. Advisory-only notes do not trigger repair. Unknown failures remain diagnostic; the system does not invent a fix.
- Typography recovery checks the saved exact-copy layout and local glyph geometry, then removes the measured original lettering within a bounded mask and reconstructs a separate composition. Frozen source reconstruction is not modified. Required wording, fonts and product evidence remain bound to the saved package. If this layout cannot safely fit, the asset remains flagged rather than automatically rewriting client copy.
- Clean PMax imagery uses observed product boundaries and OCR to mask campaign lettering only. Residual standee logos use the saved clean background, approved logo region and frozen text. Pixels outside the mask are restored from the source and checked for exact equality.
- Review-only recovery reuses the saved editable design. Pending or ambiguous provider requests block resubmission until reconciled. Known invalid image-URL HTTP 400 responses can fall back to the original inline input through the existing bounded transport; code and parameter are recorded without private error messages. Old 400 records without a parameter cannot be retroactively diagnosed.
- Export-only recovery renders locally and reuses a prior successful review only when it covers the exact rendered pixels. Otherwise it retains the candidate for attention.
- Each candidate lives under the parent's component-repairs directory. Original result/editor state, mask, pixel proof, new document, preview and checks are retained. Promotion requires successful final checks, unchanged source revision/document, and the editor's shared save lock. Current edited photograph framing is not silently replaced.
- The durable parent ledger allows one creative correction per placement: at most one image call and one review, using the parent's monetary and call allowances. Preparation failures before any model reservation can resume twice with their original history. Paid or ambiguous attempts cannot reset their counters. Candidate operations and unknown usage appear under the original project in the INR cost ledger and Admin usage.

## Live verification

Campaign creative-54549706-9eb7-48ac-93a4-6a68c2a9e6c8, continuity / custom_studio-pmax-landscape:

- The first local preparation found a missing candidate media-ownership record, before any model reservation. Fixed and recorded in attemptHistory.
- User explicitly approved OpenAI repair/review and Studio's configured media staging.
- One masked image edit and one visual review succeeded. The candidate passed all required automated checks and became current.
- Pixel proof: **0 changed pixels outside the repair mask**.
- Existing other-placement results/errors and original monetary allowance were unchanged. Prior editor versions and added font resources were retained.
- Incremental saved-rate estimate: **INR 5.9720254138575**. Actual provider billing remains unknown. Conservative reservation: INR 483.0745 within the original INR 10,000 allowance.
- Campaign now has **1 ready placement and 6 needing attention**. The other six were not retried and the held batch was not resumed.

## Checks and limits

- Saved Duroflex Story, Instagram square, LinkedIn, two PMax and standee failures reached bounded mask/pre-dispatch preparation offline without model calls.
- Shared unit tests cover both brands, unchanged siblings, candidate promotion, source-change rejection, original budget retention, duplicate starts, bounded masks, privacy-safe HTTP diagnostics and bounded invalid-request correction.
- New recovery UI browser fixture passes for both brands. Existing composed-artwork regression suite: 24 passed. Cost/access/startup regression group: 41 passed.
- Current editor suite passed generation, saving/revisions, browser editing, pixel-identical export, contextual tools and translation checks. Two older full editor UI suites timed out; this is not a full-suite green claim.
- Only clean-PMax recovery has live model validation in this rollout. Typography/logo paths passed saved-file preflight; future live outputs still require their own quality checks. No universal repair success is promised.
- Interrupted work retains requests, candidates and costs. An unresolved provider response is not authority for a replacement request. Unknown HTTP 400 parameters, changed user layouts and unrecoverable subject-overlapping masks remain explicit attention cases.

Evidence: work/component-recovery-20261103/ (replay, test logs, before-live-job, live-result, live-view and repair-cost-evidence).
