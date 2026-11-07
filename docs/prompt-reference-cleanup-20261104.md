# Active prompts, reference capacity and generated-project cleanup

Completed 4 November 2026. Scope: clean active prompts, reconcile reference selection with attachment limits, and delete generated projects only. The user's clarification explicitly preserves saved test runs and briefs in `work`, source code, brand/product libraries and cost records.

## Code changes

- Reviewer instructions now describe the connected image/OCR/evidence runtime, respect selected concept routes and the supplied review policy, and no longer impose a separate universal 75-point threshold. Quality scoring remains advisory when the supplied policy disables its gate.
- Reviewer instructions distinguish confirmed actionable defects, missing prerequisites, unknown checks, request resumption and bounded corrective verification. Removed stale claims that Copywriter is unimplemented and a duplicated logo instruction insertion.
- Review input includes the applicable policy and reference-selection diagnostics.
- Reasoning preflight validates reference identities before selection, then applies the existing eight-image limit to selected attachments. Irrelevant optional references no longer cause premature capacity failures; conflicting identities still fail validation.
- Review image assembly reserves two slots for the final artwork and viewing preview, preserves selected original references, and adds optional detail views only within remaining capacity. Too many essential originals cause a specific `REFERENCE_CAPACITY` error before paid dispatch; they are not silently dropped. Native-render proof validation remains in place even when its optional diagnostic image is omitted.

## Verification

- Four new regression cases failed before the fix and passed afterward.
- 114 focused tests passed with the repository's offline bootstrap. An initial run without that bootstrap encountered example.com DNS failures; the corrected offline run passed without failures or cancellations.
- Four read-only saved lifecycle/reference-assembly checks passed before cleanup: two Duroflex Tatva banner routes and two Sleepyhead social-story routes. All retained original references, respected the eight-attachment limit, and preserved their saved lifecycle decisions.
- These checks were not new paid generations or fresh visual reviews.
- Backend restarted from this checkout at `2026-11-04T11:42:30.730Z`, PID 77080, with automatic job resumption disabled. Safari successfully loaded Studio afterward. Sleepyhead's All view contained three preserved draft briefs; Ready showed no work in that status.

## Deletion and preservation

Removed 465 local generated projects (379 Duroflex, 86 Sleepyhead), including their generated images, edits, reviews, request caches and recovery checkpoints. Removed matching activity and review-ledger records: 1,374 paths total. Inventory and a final status check found no active generation jobs before deletion.

After deletion, there were zero generated project directories; review and activity directories were empty. The provider-capacity directory is retained. All 5,233 cost entries and cost totals were compared before/after and were unchanged, including unresolved charge records. Cost history was persisted independently before deleting job artifacts.

Preserved source code and existing uncommitted work, brand/product libraries, research, shared source-reference blobs, draft briefs, saved test runs and the entire `work` folder. The saved test-brief directory still contained 291 entries. The local worker queue remains stopped; no batch or paid request was started.

Remote CDN media was **not** deleted: the configured integration exposes uploads but no deletion operation. Its 8,472 saved media receipts were inventoried for a separate provider-side purge. Local project deletion does not revoke those remote URLs.

## Evidence

Evidence is in `work/prompt-reference-cleanup-20261104/`: before/after logs, `regression-offline.log`, `saved-replay.json`, `deletion-plan.json`, `deleted-paths.json`, cost snapshots, `cleanup-result.json` and `remote-media-removal-inventory.json`. The last file contains remote media identifiers, not archived image bytes.
