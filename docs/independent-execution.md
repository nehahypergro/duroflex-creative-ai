# Continue independent work; hold only affected outputs

Implemented 24 October 2026 in the shared Duroflex/Sleepyhead runtime.

New streaming jobs pin `executionIsolationVersion: 1`. Historical jobs retain their original execution contract, checkpoints, artwork, costs and review verdicts. No live image generation was performed to verify this change.

## Product behaviour

| Failure | What stops | What continues |
| --- | --- | --- |
| Copy, art planning or wording/layout reconciliation for an option | That option at that placement | The other option and other placements |
| Missing evidence in a valid PDP plan | Only the exact concept/slot that needs it | Other supported PDP slots, including the other concept's slot |
| PDP or carousel family planning fails | Children that require that family plan | Independently planned families and standalone formats |
| Image generation or review fails | The affected image/request | Other ready image units; saved outputs remain available |
| PDP review batch disconnects | That batch remains unknown | Later review batches, other packs and export families |
| A carousel, PDP or print pack cannot be packaged | That pack/proof | Other packs/proofs and delivery families |
| Brand library changes during execution | Nothing solely because a new revision exists | The active job uses its pinned document authority; new jobs use refreshed knowledge |

The shared strategy, brand boundary and exact product identity remain genuine prerequisites for work depending on them. Missing shared prerequisites do not become invented facts. Carousel sequence dependencies remain explicit. A missing or flagged image still prevents its collection from being marked fully approved, but does not prevent diagnostics or independent output delivery.

Ambiguous paid requests remain recorded as unknown and are not automatically dispatched again. Budget/deadline exhaustion affects work sharing that exhausted allowance; this change does not enlarge the approved money cap.

## Implementation

- Planning keys bind concept and placement together. Full director evidence is retained, with an explicit active-concept scope for copy/layout and generation packages.
- Initial and corrected copy, reconciliation, editable outputs and corrections resolve each unit's own checkpoints. Legacy placement checkpoints remain readable.
- Family plans settle independently. Failed family dependencies are recorded in `planningFamilyErrors`, with affected unit identities in `unitErrors`.
- PDP review can inspect available images before all twelve pass. Missing coverage and failed/unknown child reviews cannot be promoted by a successful overview.
- Delivery failures are recorded in `deliveryErrors`; carousel and print pack processing also continues after a sibling pack failure.
- Source authority pins draft document IDs alongside the brand snapshot. Current library changes cannot silently promote an in-flight draft to approved guidance.
- Separate option planning has a conservative PDP reservation allowance of 136 reasoning calls plus 24 initial images. The explicit project money ceiling is unchanged; corrections may need additional allowance within that ceiling.

## Verification

Evidence directory: `work/independent-execution-20261024/`.

Failing-before and passing-after checks cover scoped output contracts, family planning, carousel/print packaging and pinned document authority. The execution matrix exercises ten ordering/concurrency variations for each brand namespace. Separate integration checks use real runtime checkpoint resolution and real graphic-package validation. Saved Duroflex and Sleepyhead provider handoffs are replayed through the current implementation.

These are offline regression and saved-response checks, not ten new live artwork scenarios. They prove execution boundaries, not creative quality, provider uptime or publisher acceptance. Existing wording disagreements, image defects and unresolved charges retain their original status.

Saved-response replay reports zero failed stages for both brands. It still records a historical Sleepyhead strategy response rejected under the newer `directionDecision` contract; that response was not rewritten or promoted. Replay adapters explicitly migrate compatible old response shapes, with migrations listed in the report.

The full suite initially exposed a browser-test race: image decoding finished before the masonry layout animation frame. The assertion now waits for `data-masonry-ready` before checking the unchanged column requirement. The standalone regression passed before and after the wait change; the failed full-run evidence is retained in `full-final.log`.

The additional saved-PDP scope replay passed all 34 available saved layouts (Duroflex 14, Sleepyhead 20) through art reconciliation and graphic-package validation using each job's archived placement catalogue. The active-concept scope and its hashes were recomputed only in memory. Production files, reviews and receipts were not changed. See `isolated-layout-replay-final.json`.

Final validation: all **1,266 offline tests passed** in `full-closure.log`; both saved-brand provider replays reported zero failed stages, and all 34 additional saved-PDP layout scopes passed. The 20 scheduling variations (ten per brand namespace) are offline isolation tests, not live artwork scenarios. The local Studio was reloaded only after generation and research queues were confirmed idle.

## Option-specific collection planning

New jobs also pin `optionPlanningVersion: 1`. PDP and carousel planning now use one request and immutable checkpoint per concept and collection, rather than a paired request. A carousel selection with several collections is split by collection as well as by option. Each request is constrained to its own concept IDs and selected slots; its persisted response is revalidated on resume.

A dependency-aware queue waits for each collection plan outside the copy/art worker pool. A ready option starts downstream work without waiting for its sibling, even when the copy/art concurrency is one. Parent collection planning and downstream execution each remain bounded by their configured concurrency. The existing provider capacity, atomic money reservations and unknown-request protections remain authoritative.

The shared brief, brand/SKU truth, strategy and high-level pair of creative directions remain common inputs. The existing director call still establishes the two contrasting premises together. This change isolates detailed collection planning and its downstream execution; it does not claim that the initial paired concept call can partially dispatch a malformed response.

`optionPlanning` records the concept, family, affected placements, checkpoint file and status. Collection-plan activity has an explicit task kind and customer-facing Preparing state. Successful individual plans remain immutable; combined PDP/carousel files are derived views for current collection display and final review. Corrections use their own immutable plan file, so a concurrently evolving aggregate cannot drop their required wording or pull in a sibling plan.

A full PDP pair now reserves for one additional planning request (137 conservative reasoning allowances versus 136 under the preceding isolated workflow). This does not raise the approved project money ceiling or claim actual provider charges. Legacy jobs keep their pinned earlier planning behaviour.

Evidence: `work/option-planning-20261024/`. Regression cases include ten scheduling/order variations for each brand namespace, a delayed sibling, a failed collection, multiple carousel groups, real activity-ledger checkpoint reuse, exact correction-plan selection and unchanged historical flags. These are offline checks, not fresh live image-quality tests.

Saved PDP proof for this extension: both Duroflex and Sleepyhead continuity/exploration plans passed the actual scoped planner request and validator, with 12 ordered slots per option (48 slot plans total). No provider request was sent; `saved-pack-replay.json` records simulated adapter dispatches. The original source facts, variant bindings, plans and review statuses were preserved.

The local default full-PDP budget admission remains insufficient both before and after this extension (`budget-preflight.json`). The change preserves that existing spending ceiling. A live full-pack run still needs a sufficient allocation from the approved testing budget; this implementation/testing turn did not make paid calls or silently increase the per-project cap.

Final extension validation: **1,295 offline tests passed** (`work/option-planning-20261024/full-final.log`), both saved-brand handoff replays reported zero failed stages, and all four saved 12-slot option plans passed the scoped adapter check. The existing historical Sleepyhead response rejection remains visible in the replay report; original evidence was not rewritten. Generation and research queues were empty before the local Studio reload.
