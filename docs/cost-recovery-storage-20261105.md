# Budget, background recovery and media-write audit — 5 November 2026

The current checkout was inspected before changes. Existing edits, generated work, provider responses and receipts were preserved. No paid generation was used for this audit.

## Findings and changes

| Report | Finding | Change |
| --- | --- | --- |
| T1: flat reservations | Confirmed. Completed usage did not settle reservations. Research adoption copied calls, receipts and holds into another job. | New jobs pin a usage-accounting policy and rate table. Reasoning admission prices the counted input and full output allowance, including reasoning, without assuming a cache hit. Successful usage receipts settle each hold exactly once; incomplete/missing usage keeps its hold. Research adoption records provenance without copying spending. The same usage settlement applies to the distributed PostgreSQL coordinator. |
| T2: background retention/cancellation | Confirmed for the local background path. Requests explicitly used `store:false`, and expiry did not cancel them. | New background jobs pin `reasoningStore:true`. Existing jobs retain their saved storage policy. Deadline cancellation saves the terminal response and its usage. A local Studio maintenance loop reconciles expired/stopped requests after restart using their saved IDs; it never submits a new generation. Network/cancellation uncertainty remains reserved and is logged. Active scoped verification/repair deadlines are respected. |
| T5: small evidence caps | Confirmed: set reviews, product-image classification and publishing-copy review requested 1,000–3,500 tokens at medium effort. | These calls now use the existing evidence output-budget planner on their first call. The small contracts currently receive 11,000 tokens with medium effort and the normal 50,000 recovery ceiling. The configured ceiling remains authoritative. Effort, checks, facts and image quality are unchanged. A larger ceiling is capacity, not a request to fill it. |
| T7: batch double counting | Partly already fixed. Known matching receipts already excluded their reservations. The cited October filename was stale, but a November filename was still hard-coded. | Preserve the deduplication; add explicit `config/testing-approval.json` pointing to the existing approval. Validate the pointer, amounts and FX; missing/invalid approval blocks admission. Unknown-charge allowance uses the approved per-project amount. |
| Synchronous CDN writes | Confirmed. Artifact writes waited for upload plus byte verification, potentially inside application locks. | Save locally and persist an outbox marker, then upload outside application locks with at most two concurrent uploads. Failed markers survive restart and are retried by maintenance. Explicit remote-reference publication still waits for byte verification. A source-change check prevents an older upload from becoming the current receipt. Background uploads retain local media bytes. |

The configured project allowance remains USD 1,035.037038, corresponding to ₹100,000 using the existing dated FX. Overall testing authorization remains ₹1,500,000. Neither cap was raised. Large sets still obey call limits, time limits and the actual approved budget; they no longer accumulate the full flat hold for every completed call.

`estimatedSpend.reservedUsd` is retained for compatibility as total estimated exposure: settled usage estimates plus unresolved holds. `estimatedUsageUsd` separates settled usage. Original reservation amounts and settlement records remain available. Cost reporting uses pinned rates where present and deduplicates provider identities. The editor displays outstanding holds separately from estimated usage.

## Provider retention and limits

OpenAI's [background-mode documentation](https://developers.openai.com/api/docs/guides/background) describes roughly ten-minute temporary retention with `store:false`; explicit `store:true` enables retention beyond polling, subject to the project's data controls. This change therefore retains new background responses at the provider under its storage policy. It is not unlimited retention and does not override Zero Data Retention settings. See [data controls](https://developers.openai.com/api/docs/guides/your-data).

Cancellation does not refund completed work. If a response ID was never received/saved, or cancellation cannot be confirmed, exposure remains unknown. No automatic replacement is sent. Offline Studio cannot cancel a remote request until connectivity returns; maintenance reconciles when running again. The distributed worker still uses synchronous requests and its existing private response archive and draining shutdown.

Usage-priced estimates are not invoices. Image calls retain the configured conservative pre-call allowance because the Images API has no exact equivalent of the reasoning input-token preflight. Detailed image usage settles that hold when available. Taxes, regional charges, provider pricing changes and usage beyond an image allowance can cause an overrun; a recorded overrun blocks further admission. This is not a guaranteed provider billing ceiling. Overall testing admission remains the batch preflight/operator control, not a newly implemented global cap across all interactive Studio users.

Background media sync preserves local copies, including videos. Explicit archival publish/verified eviction remains available, but automatic outbox uploads do not delete files that may be edited concurrently. A remote URL is still required before providers can consume CDN-only references, so that necessary upload cannot be made free of network latency.

## Verification

Evidence: `work/cost-recovery-storage-20261105/`.

- 163 focused tests passed, zero skipped or cancelled in `final-tests.txt`.
- Includes both-brand usage settlement and restart recovery; six-slide simulated workload; concurrent budget admission; expensive-model rejection; unknown usage; fixed model pins; immutable saved-response reuse; retained reasoning effort; research reuse; output review capacity; caption/carousel behavior; isolated PostgreSQL settlement and lease fencing; distributed response recovery; browser cost display; batch approval validation; CDN byte verification, restart outbox recovery and concurrent-edit races.
- `before-budget-reproduced.txt` and `before-cdn-reproduced.txt` reproduce the old behavior using a test-only module hook without rewriting the checkout. `before-background.txt` and `before-small-caps.txt` record failures before their changes. The first budget fixture attempt used an invalid temporary namespace; `before-budget.txt` is a fixture setup failure, not evidence of the production defect.
- Initial sandbox-only attempts could not bind PostgreSQL localhost or launch Chrome. The same isolated tests passed when rerun with the required local access. No app defect was concealed by those environment failures.
- No full historical-artifact suite or paid provider reliability benchmark was run. No claim of live generation quality or measured live savings is made.

Activation and job-preservation evidence is recorded separately in this work directory.

## Activation

Studio restarted through its existing supervisor (PID 26394). Admin returned HTTP 200; the unauthenticated jobs API returned HTTP 401. Both existing job records remained byte-for-byte unchanged, including request counts and saved state. Automatic job resumption remains disabled. No paid generation was started. See `activation.json` and the before/after job hashes in the evidence directory.
