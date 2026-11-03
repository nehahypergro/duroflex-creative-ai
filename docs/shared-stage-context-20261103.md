# Shared stage context: opt-in foundation, 3 November 2026

Status: implemented and offline-tested; rollout disabled. No server restart, UI changes, paid requests, historical artifact edits or running-batch input changes.

## Observed issue

Planning artifacts can hydrate a complete image library repeatedly before the provider removes image bytes from text. Existing focused-context and role-packets already perform role projection and reusable brand grouping; replacing these with another summarizer would risk losing qualifiers. Large logical artifact size does not equal provider text size.

## Implemented

- `stage-context.js`: lossless repeated-object compaction after existing role projection. Complete repeated objects are represented once, with SHA-256 references and explicit resolution instructions. Small payloads remain unchanged. No mandatory text, qualifiers, draft status or uncertainty is truncated.
- Job creation can explicitly pin `config.stageContextVersion = 1`. Existing and reused jobs remain unpinned. Default configuration is unchanged.
- The shared reasoning provider applies the new packing only for pinned jobs. The full input remains local validation authority. Existing role projection, brand packets, preflight, usage and cost receipt handling remain.
- Diagnostics before dispatch include stage, brand, selected-image IDs/hashes, payload bytes and repeated-object savings. Receipts link these with existing token usage and timing. Optional stageContextTargets are observational byte targets, not token estimates or hard content-removal gates. No invented cost savings.
- `readSelected(file, selector, {brandId})` offers metadata-first selection followed by hydration of only selected raster references. Existing hash/owner validation is retained. This API is tested but not yet wired through the planning graph.

## Evidence

35 distinct tests passed across stage-context, reusable-context, context-preflight and job-creation-memory suites (34 initially, then the added provider integration case). Legacy and unpinned provider request keys match; opted-in request keys differ. Both-brand round-trip tests retain exact source content. Unselected missing raster blobs do not hydrate.

`work/shared-context-20261103/saved-comparison.json` records five saved art-input metadata comparisons: Duroflex card, sales sheet and image set; Sleepyhead card and image set. Exact round-trip comparisons passed. Payload reductions were approximately 35–40%. This is whole-art-input metadata evidence, not a measured reduction for every production stage, provider token count, latency, billing, or visual quality. No saved Sleepyhead sales-sheet art input was found by the replay.

Reproduce from repository root: `node work/shared-context-20261103/replay.cjs`. The script reads historical artifacts without hydration or mutation and writes only the comparison report.

## Remaining before rollout

1. Integrate metadata-first selected hydration through the planning consumers, preserving full inputs where local validators need them. The new reader alone does not fix all 130–260 MB logical expansions.
2. Audit specialized stages/corrections currently classified as general, giving each explicit role contracts. Retain required source authority and provenance; avoid broad pruning by key name.
3. Separate mandatory and advisory context explicitly across those contracts; existing field authority remains unchanged in this foundation.
4. Establish stage targets using actual request baselines, including schema and stable-prefix overhead. Byte savings are not token savings.
5. Complete the missing dense Sleepyhead comparison, then run bounded new-version quality trials across a card, one-pager and multi-image set. Compare actual generated quality, provider usage, latency and costs before enabling new-job defaults.
6. Do not retrofit the current rolling batch, migrate checkpoints or silently re-dispatch an ambiguous paid request.

## Reversibility

Leave stageContextVersion unset to retain the current provider behavior. Do not strip pins from jobs that already dispatched optimized requests. Pre-change copies of provider.js and store.js are in work/shared-context-20261103/before as review evidence, not permission to overwrite later work.
