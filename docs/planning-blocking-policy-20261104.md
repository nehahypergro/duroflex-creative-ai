# Explicit blockers and scoped planning recovery

Implemented 4 November 2026 in the shared Duroflex/Sleepyhead engine.

The observed LiveIn job `creative-b4457871-9a9f-4202-82d3-3f8d112a64a8` completed its strategy request but stopped because the strategist requested exact-SKU substantiation for “Luxe feel”. The engine previously threw for every non-ready strategy, regardless of the type or scope of its concern.

## Behaviour

- Strategy and concept adapters now receive a shared blocking policy. A model concern is routed to an explicit category with a rule, evidence, related IDs, component, placement scope and permitted next action. Objective product/identity, commercial terms, necessary qualifiers and missing required assets remain evidence dependencies. Unclassified concerns are internal planning triage, not invented factual requirements.
- Descriptive creative wording, soft word targets and style suggestions are advisory. Mixed measurable/material/health claims remain checked. Exact supplied product names are distinguished from claims being challenged; the actual saved “Luxe feel” request now classifies as advisory.
- Supplied canvas dimensions and supplied asset inventory are internal binding work. Printer templates and production settings do not block a labelled design proof; existing production/export checks remain mandatory.
- A blocked advisory/internal handoff receives one bounded corrective planning stage, with a distinct saved checkpoint. The original strategy/concept is not relabelled ready or overwritten. The correction must pass the existing validators and produce real dispatch handoffs. Provider requests use the same budget, reservation and recovery machinery. A repeated unusable handoff becomes an internal technical issue, not another subjective evidence demand.
- Reliably identified placement dependencies hold those placements. The remaining formats receive a scoped plan and continue through existing independent unit execution. Unknown/shared dependency scope is not guessed. Original selection remains saved; held units appear in the final result accounting.
- Missing planning input is recorded as `needs-input`, or `partial` if images already exist. The queue worker and Studio preserve the same structured findings. Studio's existing missing-input message now shows the actual recorded reason. The pre-existing removal of the component-panel UI was preserved.
- New campaigns pin `blockingPolicyVersion: 1`. For their standard final review, quality scores and noncritical stylistic findings are advisory. General/PDP policies 4/5 preserve critical checks and bind the policy to the lifecycle state, including final download. Historical policies/verdicts remain unchanged. Existing editable product-fidelity, wording and readability checks remain in force.
- The reviewer now accepts and validates runtime-generated `printProduction` metadata, retaining its package hash. Geometry is recomputed, unknown metadata rejects, and `printerAccepted` cannot be fabricated. This resolves the observed schema mismatch without dropping print constraints.

## Verification

Evidence: `work/planning-policy-20261104/`.

- Initial policy and print/quality tests failed before implementation; logs retained.
- Final relevant offline/local integration suite: **166 passed, 0 failed**.
- Final classification tests after additional mixed-claim/dimension coverage: **19 passed** (overlaps the integration suite).
- Saved planning handoffs for both brands: **0 failed stages**, mocked transport.
- Actual saved LiveIn finding: advisory/internal recovery; original job untouched.
- **54 saved print packages** validated without modifying their files.
- Low-score delivery was exercised through the real reviewer, lifecycle and download builder. Critical defects still reject; a new-policy report cannot be substituted into a legacy lifecycle.

The broad suite attempted during development was **1,779 passed / 280 failed**. At least 207 failures reported sandbox `listen EPERM`; others include browser/setup and existing expectations and were not all triaged. A focused carousel test expecting 16 image reservations still fails with 8 against the pre-change HEAD engine, reflecting the prior single-option behaviour. That baseline comparison ran from a temporary module loader, without changing the checkout. These results are not a claim that the entire repository is release-clean.

No paid generation, uploads, campaign retries or historical budget/deadline changes were performed. This proves contracts, saved-data compatibility and mocked recovery, not a successful fresh model-generated campaign. A fresh real campaign remains the live acceptance check. Restarting Studio does not restart the held queue or resume historical failed jobs.
