# Product health analytics

Implemented in the isolated MongoDB admin pilot. The live Studio and generation workers are unchanged. The page is available only to administrators under **Product analytics**. MongoDB Atlas and live team authentication still need deployment configuration.

## Product questions and measures

| Question | Measures | Decision to support |
| --- | --- | --- |
| Are people using it again? | Active creators over 24 hours / 7 / 30 days, first recorded versus returning creators, use on multiple days, requests by creator, attribution coverage | Find adoption gaps once real users submit through login. Historical automation does not count as people. |
| Is it delivering useful output? | Requested and saved image units, complete image sets, complete sets passing automated checks, decisive review coverage, unverified images, recorded rework | Improve complete delivery rather than maximizing image volume. |
| Where is work getting stuck? | Failed / partial / needs-input requests, terminal requests with no images, recurring error patterns, affected formats and brands, stage timing | Prioritize repeat failures with no useful output, then quality and delivery problems. |
| Is it getting faster? | Median and p90 complete-set turnaround, queue-to-first-task time, time to first image, elapsed time by stage | Compare like-sized formats; a fast failure is not a speed improvement. |
| Is quality affordable? | Actual and estimated INR separately, unknown charges, known cost per automated pass including failed work, missing cost coverage | Reduce waste without lowering quality. Never present a lower bound as a final invoice. |

**Human approval is now instrumented in the pilot.** Open a request to approve or request changes for its current selected image. Decisions bind to the saved image bytes, selected generated version and canvas revision/document hash. They record the signed-in actor, server time and reason. Concurrent decisions use a revision check. Historical decisions remain; replacement artwork starts undecided. Approval never changes the automated verdict, learns a brand preference, or publishes an asset. Saved flags must be acknowledged before approving a flagged image. A missing current preview cannot be approved using an older image.

The dashboard reports explicit approval coverage, approval rate, current change reasons and change rounds before approval. Cost per human-approved asset uses all known selected-cohort project costs, including linked revisions and failed work, divided by current approved units. Unknown charges and low approval coverage remain visible. Human approval records are not invented for historical output.

## Filters and investigations

Date range in India time, brand, user, asset type, status, product, authenticated versus legacy activity, output outcome, the explicit Option 1 batch marker and error pattern. Compare by asset, brand, product, user or status. Pattern and group rows open the corresponding slice. Request rows open the existing exact brief, saved images, stage timeline and failure explanation.

Charts group outcomes by the original submission date. The adjacent previous period uses equal elapsed length. These comparisons are descriptive: request-size mix, incomplete observation and small samples can explain apparent changes. Rollups with overlapping asset groups or multiple failure patterns are not additive. Suggestions are deterministic investigation prompts backed by saved evidence, not claimed root causes.

## Metric contracts

- Count each route + placement once, using its current saved result. Synthetic fixtures are excluded.
- A complete image set requires every expected route + slot; surplus images cannot substitute for missing slots. Image completeness does not establish PDF/export or whole-set acceptance.
- Automated pass requires both `ready` and `qualityVerified`. Decisive denominator is passes plus `revise`; uncertain results remain separate.
- Explicitly recorded user-requested stops are separated from system failure rates and no-output failures. The original job status remains intact for audit.
- Completion time uses creation to latest terminal update only for finished, complete sets. Later metadata updates can extend this proxy. A future immutable completion event would improve precision.
- Stage time merges overlapping task intervals within each stage. Open tasks are omitted. Different stages may overlap; their durations must not be summed as wall time.
- Repeat-day use is not longitudinal cohort retention. “New” means no earlier attributed request in the saved history, not account creation.
- Account and login funnel is workspace-wide and uses current account state. It is not a historical or sequential conversion funnel.
- Cost is the selected request cohort's recorded lifetime cost, not expenditure during the calendar range. Deduplicate receipt IDs; actual replaces estimate. Preserve source currency and dated FX. Unmatched records and unknown charges remain visible.
- No universal target is invented from testing. Establish a two-week client baseline, then set separate turnaround and yield targets per family and set size. Track p90 speed and cost alongside quality so optimization does not reward poor output.

## Reports

**Export this view** freezes the displayed snapshot, filters, metric version, source timing and definitions. Printable HTML can be saved to PDF by the browser. CSV includes every request in the slice; spreadsheet formulas are escaped. JSON includes all metrics, request evidence, definitions and original-currency cost records. Exports are admin-only and immutable in MongoDB. A view older than 15 minutes must be refreshed before export. Downloaded files are private internal reports; the user controls their subsequent sharing.

## Isolation and load

The pilot reads saved metadata and the existing cost snapshot. It does not instantiate the generation runtime or call providers. It writes only its separate MongoDB collections. Changed job summaries are indexed with a shared 15-second refresh floor. Detailed timing is cached by source hash and backfilled at most eight jobs per analytics request. The page does not poll automatically. Incomplete timing coverage is shown rather than hidden or treated as zero. Missing source records retain their previous indexed evidence with a warning.

## Later improvements

After the batch, deploy the staged authentication and tracking hooks. Later measurement work: immutable lifecycle milestones; weekly acquisition/retention cohorts once sufficient real team history exists; stage-level cost attribution and explicit lineage when users start a separate new brief as a retry. Existing retry-checks and PDP-resume actions are linked to their original request. None should be fabricated from the historical batch. Atlas configuration, production indexes, retention policy and access review are deployment tasks, not completed by this local pilot.


## Product activity tracking (28 October 2026)

Implemented separately in MongoDB `product_events`, `asset_decisions` and `tracking_metadata`:

- Brief first opened, activity, currently filled milestones, validation/readiness problems and server-confirmed submission. Draft text and keystrokes are not collected. Browser milestones are user-interface signals, not server proof of readiness. Inactive means 24 hours without activity, and is recalculated when a person returns. The funnel follows first tracked opens by date/brand/user; request-only filters do not apply. Already-submitted drafts first seen later are excluded. A draft ID converts at most once.
- A bounded, account-scoped browser outbox keeps the same event IDs when reconnecting. Duplicate uploads do not add extra events. A switched account cannot ingest another person's queued events. The outbox is limited to 200 events; storage or browser loss can leave gaps, so this is not a claim of perfect event coverage. It never blocks editing or generation.
- Server job attribution remains the authoritative submitter. Submission activity can be reconciled from saved job metadata after a recorder outage. No historical submitter is guessed.
- Explicit human approvals are transactional, immutable events with a current decision per image binding. The client retries the same decision ID after an ambiguous response. Unknown outcomes are not shown as saved. Both administrator and member can record decisions on requests they are allowed to view; no new reviewer role is implied.
- Browser download intent and server attachment responses are separate. They may overlap and are not summed as unique downloads. Preview requests are not counted. Neither signal proves device save or publication.
- Existing `retry-checks` and `pdp/resume` requests capture the original request and before-state. The latest accepted retry is compared with the current saved result. Incomplete observations stay pending, and explicit HTTP rejection is separate. Elapsed time and recorded post-retry spend are proxies; intervening work may affect them.
- Recorded costs for nested refinement and canvas-AI jobs are linked to their parent only when saved identity/brand evidence matches. Receipts are never copied. Unmatched lineage and unknown billing remain in coverage warnings.

Observers do not dispatch providers or alter quality statuses, budgets, retries or queue scheduling. Operational observation failures are counted in recorder health rather than propagated into generation. Approval writes, by contrast, require explicit successful acknowledgement. The standalone pilot can record review decisions without touching Studio jobs; brief and server lifecycle capture require the staged signed-in Studio to be deployed after the running batch.

### Verification

Fixtures cover both brands, owner access, idempotent event replay, concurrent review conflict, changed pixels, selected refinements, missing edited previews, new canvas revisions, inactive/resumed briefs, submission reconciliation, unknown-cost denominators, offline replay, switched-account protection and retry instrumentation. Browser tests exercise both decision buttons, the exact-image download route, filtered reports and mobile layout. All providers remain disabled during these tests.

Verified 28 October 2026: 52 automated checks pass. The read-only saved-history browser check covered both brands, desktop/mobile views, current-image display, and frozen CSV/HTML/JSON reports. Studio interface code had changed since the original pilot copy; that pre-existing difference is preserved in `work/admin-evidence/analytics-verification.json`, and hashes were unchanged during verification. The live server was not restarted. Only the standalone admin preview on port 1857 was refreshed. Its initial administrator account still needs setup; Atlas and live Studio activation remain pending.
