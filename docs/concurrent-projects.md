# Concurrent Studio projects

The shared Studio scheduler now defaults to two simultaneous projects, with further work queued. Both brands use this same scheduler. Configure `CREATIVE_AI_MAX_CONCURRENT_JOBS` in the local environment or `.env` to a whole number from 1 to 16; restart the service to apply changes. The maximum is an operational bound, not a throughput guarantee. Existing per-project time, spend, image/correction, unit-concurrency and request-deduplication controls are unchanged.

Regression: `tests/creative-ai/concurrent-projects.test.js` reproduces the former one-project limit and verifies parallel mixed-brand scheduling, queue admission, duplicate scheduling, slot release and invalid configuration rejection. The before/after evidence is in `work/static-format-launch-20261022/`. Both-brand recorded handoff checks pass; the broad offline suite also reports other contract/browser failures that have not been attributed to this change, retained in that directory rather than represented as a full pass.

The Airboost format comparison is an isolated experiment. It changes scheduling concurrency only; it does not add format-treatment guidance. Its separately recorded inputs, provider requests, saved stage artifacts, outputs and costs remain under normal job storage. Superseded batches were stopped after the user changed scope; reserved requests without usage remain unknown.

The live all-at-once experiment exceeded the default Node heap before producing images. Its worker was replaced by a two-project recovery queue. Raising the configurable limit is not production capacity certification; real media-heavy load must be measured. The conservative default was reduced to two after this observation.

## Five-project profile — 2 November 2026

The user authorized five concurrent Duroflex asset tests. The dedicated local setting is now `CREATIVE_AI_MAX_CONCURRENT_JOBS=5`; the generic fallback remains two. Shared provider admission stays at four reasoning calls and two image calls. Local Fabric/Chrome rendering now shares two cross-worker slots before loading image bytes. Five active projects do not imply five simultaneous image API calls.

The five-project real-render regression produced and reopened five distinct 2160×3840 artifacts (ten renders), with five jobs active and a peak of two renders. Observed Node peak RSS was 268 MB and heap 98 MB; these figures exclude browser child processes and do not certify every production workload. Rendering failure releases slots, and shared-capacity tests cover queueing/cancellation. Evidence: `work/five-project-load-20261102/`. Live new-SKU testing is tracked separately.
