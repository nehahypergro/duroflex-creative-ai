# PDP instruction, planning and review fixes — 26 October 2026

These changes apply to the shared engine used by Duroflex and Sleepyhead. They do not replace historical artwork, reviews or billing records.

## What changed

| Issue | Change | Practical limit |
| --- | --- | --- |
| Instructions grew too long | Compact before reaching the provider ceiling. Repeated execution clauses use a reversible dictionary; literal artwork copy stays expanded. Image corrections receive the required changes and preservation instructions, while routing, authorization and audit details stay in the saved correction plan. | Unique requirements are never cut to force a fit. A genuinely oversized brief still stops before an image request or reservation. |
| Planning responses were unresolved | Local OpenAI reasoning now requests background responses with `store: false`, saves the response ID immediately and retrieves that same response until completion. Read failures can retry safely without another generation submission. Same-host duplicate requests share a durable request lock. | A submission lost before a response ID arrives is still ambiguous. Expired/unavailable responses are not replaced automatically. Existing unresolved historical requests are not charged again. Distributed worker dispatch has not been changed to background mode in this pass. |
| Original diagnostics disappeared | Keep the first transport diagnostic immutable and save subsequent failures separately. Known pending response IDs are included in sanitized diagnostics. | Historical diagnostics already overwritten cannot be reconstructed from the remaining evidence. |
| Reviewer disagreed about close-up branding | Individual and gallery reviews use one purpose-and-visibility policy. A mark outside an intentional crop can be not applicable when the source surface, actual visible region and brief support that finding. Visible incorrect marks still fail; relevant unreadable marks stay unknown. Contradictory component and aggregate verdicts go through the existing bounded response repair. | No automatic approval from a slot name or prompt. This reduces a specific false flag; it does not establish perfect reviewer accuracy. |

The gallery batch instruction also makes clear that a four-image inspection does not fail merely because the other eight images belong to other batches.

## Evidence

- Six original failing regression cases were recorded before changing production behavior, plus the correction-payload failure. Additional cases cover retrieval retries, expired IDs, wrong response IDs, terminal provider failure, timeouts and retention of genuine visible-label failures.
- 67 saved generation/correction packages from the recent Airboost and Napster Mini runs were replayed through the current prompt preparation. All fit within 32,000 characters; the largest final request is 30,577 characters. Historical package files were hash-checked and left unchanged. Existing compaction already handled some historical failures; the new pass adds headroom and avoids sending the full correction audit to the image model.
- The final full offline suite passed: **1,452 tests, zero failures**. Local server and browser tests required local-access permissions; the initial restricted run was not counted as a pass.
- Both standard saved-brand planning replays passed, with mocked transport and no paid generation.
- Two fresh live reviews inspected the original continuity detail image (slot 03) from each brand. Both returned **Ready**, with physical branding **not applicable** based on the intentional visible crop. Duroflex used one submission and 24 retrievals; Sleepyhead used one submission and 17 retrievals. No new images were generated, no second reviewer was added, and the original project verdicts were not rewritten.
- Live verification cost: approximately **₹2.64**, estimated from provider usage at the saved **₹96.6149/USD dated 9 October 2026**. This is not an invoice. No additional unknown charge was created. The private Sheet was reconciled to 3,044 entries, 153 historical unknowns and ₹11,409.13 in known estimates/recorded costs.

Machine-readable evidence and test logs are in `work/pdp-shared-fixes-20261026/`:

- `failing-before.txt`, `correction-failing-before.txt`, `focused-final.txt`
- `saved-prompt-replay.json`, `both-brands-final.txt`, `full-suite-final.txt`
- `live-review-results.json`, `live-allocation.json`

Original artwork sources:

- Duroflex: `creative-dfb4baa4-acc8-4fba-9c2f-e272bfc24165`
- Sleepyhead: `creative-08e5d794-600e-48ba-a93e-b35a8b87678e`

New review-only verification jobs:

- Duroflex: `creative-2bd55b44-acd4-45b6-9ea4-ac6c8453934d`
- Sleepyhead: `creative-30fb3dd8-4d4d-47c3-bff3-b142d3eb5a45`

## Still to prove

A new complete PDP generation and whole-pack review are still needed. Two passing close-up reviews are not a passing 12-image pack, ten varied live generation scenarios, a guarantee against provider outages, or a full human calibration of the reviewer. Previously unknown charges remain unresolved pending provider billing reconciliation.

## Provider reference

[OpenAI background responses](https://developers.openai.com/api/docs/guides/background), checked 26 October 2026: queued/in-progress responses are retrieved by response ID. `store: false` background responses have temporary persistence for roughly ten minutes, so recovery is time-limited. A missing or expired response ID cannot be made safe by assuming the original request was free.
