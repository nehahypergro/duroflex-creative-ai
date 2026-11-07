# H1–H3 audit and provider configuration pinning — 4 November 2026

## Audit result

- **H1 was already fixed.** The obsolete concept phrase replacements are gone. Selected concept routes generate matching instructions and schemas; tests inspect the actual assembled requests for continuity, exploration and both routes. No second prompt rewrite was added.
- **H2 was already fixed.** Output-limit recovery and JSON/schema repair have separate bounded allowances within three total provider sends, including HTTP retries. Targeted field repair preserves unaffected fields; full-object repair receives bounded output headroom. Exhaustion reports the actual cause and recovery history. Explicit smaller operation allowances remain effective. See `prompt-recovery-phases-20261104.md`.
- **H3 was still present.** Jobs saved model names, but dispatch read the provider's current configuration. New regression tests failed before the fix for both brands, concurrent jobs, and incomplete historical settings.

## Implemented change

New jobs save a versioned, deep-copied allowlist of provider settings: reasoning/image models, per-stage model and effort, initial/recovery output limits, request timeouts, background mode, input transports, preflight settings and context targets. Reasoning, image dispatch and model-access checks resolve that job snapshot. An in-flight operation keeps its resolved settings through recovery. No shared provider mutation is used, so concurrent jobs can use different snapshots safely.

Credentials, deployment backend and shared concurrency admission stay deployment-owned and are not persisted in this snapshot. Existing job deadlines, call limits and spend allowances remain in their existing saved budget records. Explicit operation-specific request limits and saved reasoning trials still apply.

Changing deployment defaults affects new jobs. Resuming the same operation keeps its request identity and replays saved responses and receipts instead of paying again because a live model or limit changed. A genuinely changed request remains a distinct operation.

## Historical boundary

An older job with no provider history can bind its missing settings once, retaining its saved model choices. An older job with reservations, calls, responses referenced by request state, receipts or pending provider requests cannot safely infer its original missing limits. It stops before dispatch with `JOB_PROVIDER_CONFIG_UNVERIFIED`; its original settings and paid requests must be reconciled first. There is no automatic reconstruction of missing historical settings in this change. Historical projects, costs and responses were not rewritten or deleted.

## Verification and activation

- **158 unique focused/shared tests passed:** 78 original focused checks, 79 wider runtime checks and one additional mid-call settings-change regression. The complete eight-test pinning suite also passed separately.
- Coverage includes both brands, concurrent job isolation, original and corrective response replay, image-model pinning, output/recovery limits, live credential rotation, model-access checks, unknown-outcome protection and historical migration boundaries.
- Updated test setup to pin fixture settings at job creation. The offline provider helper now explicitly bypasses preflight in mocked suites; production preflight remains enabled and has separate tests.
- Initial wider-suite DNS failures were sandbox restrictions. The same tests passed with DNS/localhost access. No paid provider calls were made.
- Available saved Sleepyhead concept input passed offline request construction. The previously deleted Duroflex historical fixture remains unavailable; synthetic both-brand coverage does not replace that historical replay.
- Gracefully restarted idle local Studio. New PID **23520**, started **2026-11-04T18:26:27.593Z**. `/admin` returned 200, protected jobs returned 401 and malformed URL returned 400. Both existing job metadata hashes remained unchanged; automatic job resumption stayed disabled.
- This verifies code behavior and local activation, not fresh paid image generation or final visual quality.

Evidence: `work/provider-pinning-20261104/{before.log,after.log,job-config.log,shared.log,shared-after.log,saved-concept-replay.json,activation-before.json,activation-after.json}`.
