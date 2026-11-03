# Context selection v2 — 3 November 2026

Implemented as a shared, opt-in provider path. Demo UI, running services, historical artifacts, checkpoints and existing job pins are unchanged. No paid calls were made.

## Five requested reductions

1. Exact SKU image selection: when requiredSkuAssetIds or productReference.referenceAssetIds establish scope, omit unrelated catalogued product images from wire inventory and attachments. Explicitly referenced assets remain. Without explicit identity scope, retain references instead of guessing. This does not add a new SKU identity audit.
2. Approved handoff: downstream stages retain the selected strategy alternative when selection.directionId resolves. Unresolved selections keep alternatives. Other authority, qualifiers, locked copy, uncertainty and original inputs remain intact. No arbitrary planning-history fields are deleted.
3. Asset scope: placement-bound copy/decks/drafts/specifications are filtered to the explicit requested placements. Existing batch grouping is retained. Collection plans remain intact to avoid losing sequence dependencies; a more compact collection overview is not implemented yet.
4. Corrections: affectedUnit additionally scopes concept, placement and existing deck/draft/specification records. Correction diagnostics remain intact. Local validators still receive originals, so unaffected records can be checked by existing patch machinery.
5. Brand references: omit only explicitly optional/advisory references with applicability metadata excluding this stage or placement. Mandatory, locked, user-selected, cited and unknown-applicability references remain. Existing untagged libraries therefore receive limited savings until applicability is reliably available; no keyword-based relevance guesses are used.

Selected reference loading now reads raw research metadata, selects explicitly chosen IDs, then hydrates only those records through the hash/brand-checked reader. This eliminates unnecessary hydration on that path. Other engine consumers still hydrate full artifacts; this is not a complete solution to large logical planning files.

## Activation and rollback

`CREATIVE_AI_STAGE_CONTEXT_VERSION=2` or explicit runtime config `stageContextVersion: 2` pins NEW jobs. The environment flag has not been set and no service has been restarted. Unset it to stop opting new jobs in. Existing pinned jobs retain their version for reproducible request identity. Historical/unpinned jobs retain legacy behavior; never erase a pin to retry an ambiguous paid call.

## Verification

51 distinct regression tests passed across context-selection, stage-context, brand-isolation, reusable-context, parallel-planning, context-preflight and job-creation-memory. Includes mocked v2 provider dispatch, original validator authority, no network generation, same-brand boundaries, required evidence, historical request keys and a failing-before/passing-after lazy-load case with an irrelevant missing raster.

Five historical planning inputs across both brands were read without image hydration or mutation. See `work/context-selection-20261103/saved-comparison.json`. A multi-unit Duroflex correction removed about 14 KB of unrelated metadata. Already-single-unit cases were effectively unchanged (selectedAlternative key adds ten bytes). These are correction-scope metadata comparisons, not model quality, token savings or measured cost reductions. The earlier lossless compaction layer remains separate.

Before enabling defaults: bounded new-job creative-quality comparisons, actual provider token/latency/cost measurements, applicability coverage for optional brand references, and broader metadata-first integration. No smaller-context quality guarantee is claimed.
