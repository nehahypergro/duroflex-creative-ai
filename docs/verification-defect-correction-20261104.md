# Confirmed defects after verification — 4 November 2026

## Finding

The current evaluator already prioritizes a confirmed failure over an unknown
critical check. That portion of the reported defect was already fixed and was
not changed again. The lifecycle still required the aggregate `revise` decision,
which stranded older mixed-result reports. More importantly,
`consumeVerification` could record a newly confirmed defect but could not
reserve an unused correction. The runtime then attempted terminal delivery
instead of entering its correction path.

## Changes

- Recognize confirmed defects from an available, inspected report's failed
  critical checks or targeted correction routes, independently of its aggregate
  decision. Unknown-only and pending reports do not authorize regeneration.
- Reserve the existing single correction cycle when verification confirms a
  defect and the cycle is unused. Preserve the initial report and intermediate
  verification report, package/image identity and unresolved dependencies.
- Continue through the existing static correction path. Resume saved planning
  and image work, publish a separate corrected delivery, retain original files,
  and leave sibling results untouched. This does not replace the separate
  editable/component-repair pipeline.
- Charge correction work to the original campaign allowance. A scoring-only
  verification allowance cannot admit image generation or reset the campaign
  deadline or spend limit. Budget exhaustion remains an explicit failure, with
  the original artwork preserved.
- Resolve delivery/activity review identity to the final corrected review.
  Verification of a final review still supersedes that final review; verification
  of the initial image must not supersede a later corrected image's review.
- Saved-response-only contract replay records the correction plan without paid
  dispatch. Normal recovery can subsequently execute the authorized cycle.
- Final unknowns remain unapproved. A spent correction cannot be reset by another
  verification or repeated retry request.

## Verification

- Before the fix: two of five lifecycle regression cases failed (historical
  mixed-result report and confirmed defect discovered during verification).
  The current mixed-result evaluator case already passed.
- After the fix: 131 focused tests passed, including 11 new lifecycle/runtime
  cases. Provider generation/review were stubbed; state, files, ledger and budget
  admission ran locally. The runtime cases cover both isolated brand namespaces,
  duplicate retries, interruption after saving corrected pixels, original-budget
  exhaustion, replay-only operation, and unresolved final checks.
- Four unchanged saved report/package/image lifecycle replays passed: two
  Duroflex records retained Ready; two Sleepyhead records retained verification
  pending. These do not establish new visual quality or resolve the separate
  historical provider-response/schema incompatibilities.

Evidence: `work/verification-defect-correction-20261104/` (before log, source
snapshot, regression log, saved lifecycle replay summary).

No historical job was resumed or rewritten. No paid calls or backend restart.
The local source change requires backend reload before the running service uses it.

## Reverification after deployment

Rechecked on 4 November 2026 against the current checkout: 77 targeted tests passed, zero failures, including both-brand isolated runtime recovery. All three relevant implementation files predate the active Studio server startup at 2026-11-04T15:14:04.593Z (PID 13117); these changes were loaded by that restart. No duplicate implementation or new paid request was necessary. This check validates orchestration with controlled providers, not a fresh live-provider reproduction of each failure. Evidence: `work/reviewer-recheck-20261104/verification.json` and `tests.log`.
