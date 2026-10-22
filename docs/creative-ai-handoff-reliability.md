# Handoff reliability

Implemented 13 October 2026 for plan items 1, 2, 3 and 5.

| Owner | Data |
| --- | --- |
| Code | Saved SKU/variant and dimensions, unit IDs, hashes, field bindings, assigned destination URL, exact-copy verdict |
| Brief | Explicit audience, buying situation, desired action and campaign constraints |
| Sources | Product facts and guidance with their original provenance, qualifiers and approval status |
| Creative director / Art director | Proposed people, setting, lighting, treatment and layout within explicit constraints |
| Copywriter | Exact wording, locked at handoff; native fields remain outside the artwork |

Strategy no longer authors an explicitly supplied desired action or destination URL. Code restores them verbatim, including variant query parameters. Desired action carries `brief` provenance rather than being labeled an assumption. Native destination copy is also assembled from the selected destination by code. Layout binds copy by stable field ID; altered wording/bindings, duplicates and unknown IDs fail validation.

Reconciliation v2 uses typed changes, for example `{field: "crop", value: {…}}`, instead of a JSON string inside `valueJson`. Each field has its own schema branch. Omit unchanged fields; null does not mean “keep” in this contract. Native fields cannot receive an embedded layout. Unexpected provider fields cause a visible contract-drift error instead of being deleted.

HTML entities are decoded in a single pass at intake, including numeric Unicode entities. Invalid code points remain literal. Saved copy is never HTML-decoded again. Exact-copy comparison permits canonical Unicode composition (NFC) and whitespace differences; it does not collapse compatibility glyphs, punctuation, case, or `LiveIn`/`Liveln`. Ambiguous observations remain unknown. Physical dimensions retain the existing typed number/unit/source contract; pixels never establish physical measurements.

Each reasoning handoff receives code-derived authority labels: required, sourced, proposed or unknown. These supplement existing provenance validators; they do not certify a claim's truth. Explicit brief targeting/action stays separate from product evidence. Creative preferences and assumptions stay proposed. People, setting and lighting remain creative choices unless explicit requirements constrain them. Historical briefs and packages remain unchanged.

## Offline checks

Run `npm test` for synthetic regression tests. The test-only bootstrap provides fixture DNS and blocks unmocked remote fetches; local HTTP tests require permission to bind loopback sockets. It is never loaded by the studio.

Run `npm run test:replay` to validate the saved Cove and Tatva handoffs. It reads local artifacts, validates strategy/concepts/copy, restores code constants and passes saved reconciliation responses through the current decoder and full art validation. There is no provider or credential loading. It leaves historical artifacts, budgets and review readiness untouched. Saved v1 `valueJson` changes have an explicit replay-only migration; the live wire rejects that format. Old invalid responses are reported as rejected, not repaired or hidden. At least one saved reconciliation response per job must pass.

Default replay job IDs are local fixtures; another checkout needs those archives or explicit saved job IDs: `node scripts/creative-ai/replay-handoffs.js <jobId>`. New synthetic regressions cover Unicode/Hindi/long names, URL variants, native/embedded separation, locked copy, unexpected fields, brief ownership and authority labels. Existing tests cover measurements and mixed claims, asset isolation, interrupted recovery, receipt deduplication, status transitions and draft guidance.

These checks prevent known contract failures before paid generation. They do not guarantee future model semantics, rendered logo fidelity, typography or composition; existing artwork review and the correction limit still apply. Image generation model/settings and paid-call scheduling are unchanged.

## Recorded integration QA — 13 October 2026

`npm run test:qa:recorded` feeds saved Cove and Tatva raw responses through the current provider adapter and the real strategy, concepts, copy, art and reconciliation wrappers. Transport is mocked; it neither reserves real spend nor writes provider receipts. The replay uses each job's saved current research snapshot, including its historical product policy. Explicit migrations move only matching old fields to their current code bindings. Invalid archived responses remain rejected and appear individually in the report. This is an adapter replay, not a new model run.

`npm run test:qa:digital` covers every non-print Studio preset, every supported static catalog profile, both carousel presets at four slides, and three custom boundary canvases. Its 76 cases expand to 82 placements, 164 route/placement units and 32 distinct aspect ratios. It tests typed layout transport, reordered/duplicate bindings, stringified replacements, locked-copy tampering, canvas/crop geometry and real raster exports with synthetic calibration pixels. Publisher limits are checked where present in the pinned catalog. Unknown rendered checks stay pending. This does not re-plan the saved creative for each format or certify the readability of actual artwork.

The QA added these live guards:

- Duplicate JSON keys (including escaped-equivalent names) fail instead of letting JSON parsing overwrite the first value.
- Conflicting supplied code constants fail instead of being silently replaced. Missing constants still come from code.
- The provider validates the final schema even when a caller has no custom validator. Validation follows code-owned assembly, preventing unnecessary repairs for fields assembled locally.
- Unexpected prototype-named fields are rejected. Required properties must belong to the actual object.
- Review decoding validates its complete wire object before conversion, preserving unknown-field failures.
- Unit and review bindings are copied at construction; duplicates fail before dispatch.
- More than eight reasoning reference images fail before reservation instead of silently dropping the excess.

Evidence is saved in `work/recorded-digital-qa-2026-10-13/`: full regression log, boundary log, original-handoff replay, raw-provider replay and per-format matrix. The full suite passed 466 tests. All ten stage/job combinations have an accepted archived response; five historical invalid responses remain rejected. Test API spend is ₹0. Development subscription costs are not inferred. Run these checks after changing schemas, codecs, bindings or placement/export contracts; use a real artwork review for visual fidelity and publishing readiness.

## Payload, limits and latency QA — 13 October 2026

The follow-up audit deduplicates saved provider identities across ten jobs: 105 unique reasoning receipts, with no recorded output-limit truncation. Historical task timing includes local work, storage and retries; parallel task intervals must not be summed as job duration. Run `npm run test:qa:performance` for receipt/event statistics and lossless compaction scale checks. Run `npm run test:qa:recorded -- --scoped` to capture current envelopes through the real brand boundary and provider adapter, using mocked transport. `node scripts/creative-ai/qa-review-envelope.js` captures review request sizes after local preview/OCR preparation, stops before dispatch and removes temporary raster files. It does not make a new artwork assessment.

New reasoning receipts contain `handoff`: full UTF-8 request bytes, separate instruction/schema/text/image-data sizes, image count, local preparation milliseconds, fetch-and-body-reading milliseconds, source (`provider` or `saved`), effective timeout and attempt. Bytes/characters are not token estimates. Saved-response timing remains null; original receipts are not retroactively rewritten. HTTP failures without a successful provider response still have no usage receipt and must not be reported as zero incurred cost.

The provider now rejects invalid output-token/timer settings before reservation, enforces the configured recovery ceiling, classifies response-body timeouts consistently, rejects unfinished response statuses, and caps reasoning dispatch timeout against remaining job/verification/recovery time. The budget gate remains authoritative; ambiguous dispatches are not automatically repeated. Initial/recovery caps remain 25,000/50,000 by default, with role-specific overrides such as the review's 10,000. One bounded retry remains. No total input-token/model-context-window preflight has been added; this remains an explicit gap requiring a reliable model-aware count rather than a byte approximation.

CPU profiling identified repeated large-image string validation and strategy hashing. The bounded image validator now checks size first and avoids the slow greedy regex; malformed trailing whitespace is rejected. Director functions reuse their locally computed strategy hash during the same synchronous operation, preserving exact hashes and revalidating later mutable inputs. No global mutable-object cache is introduced. The same scoped replay decreased from 47.700 to 36.381 seconds in one before/after comparison, with identical acceptance/rejection outcomes. This is local offline performance, not a prediction of live model latency. The follow-up suite passed 477 tests.

Evidence and a readable report are under `work/handoff-performance-qa-2026-10-13/`. Large review schemas, role-specific reference selection and inconsistent observed prompt-cache hits remain optimization candidates. Models, image quality settings, source guidance and paid-call concurrency are unchanged. Test API spend is ₹0.
