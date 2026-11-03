# PDP follow-up fixes — 24 October 2026

These changes apply to the shared Duroflex and Sleepyhead engine. Brand and product sources remain separate. They address the latest Duroflex Airboost and Sleepyhead Napster Mini tests. They do not certify a complete passing pair or ten fresh live scenarios.

| Issue | Change | Remaining limit |
| --- | --- | --- |
| Planning and review connections failed while sending large image payloads | Reasoning requests now send verified CDN image links instead of embedded image bytes. Original pixels and reference labels are preserved. Staging happens before a paid reservation; a failed media transfer can be retried safely. Only a provable failure to establish a connection gets one automatic retry. | A lost response after dispatch still has an unknown billing outcome. That request remains unresolved; independent work continues. No claim of permanent provider/network reliability. |
| The planner made instructions into required artwork text | PDP plan v3 has separate copy instructions and literal required qualifiers. “Retain ‘with a damp cloth’” is an instruction; “with a damp cloth” is the wording to preserve. Dimensions retain their dedicated source-bound annotations. Source-supported care phrases beginning “Use” or “Do not” remain valid. | The new contract needs fresh live planning and artwork evidence. Existing v1/v2 plans and their history are not rewritten. |
| A failed correction hid an already generated image | When correction planning produced no image, review no longer asks for a wording agreement for that nonexistent correction. The existing lifecycle retains the original image with its flags. Real pixels still require their exact wording agreement. | A retained original is available for inspection, not automatically approved. |
| Review held artwork for subjective or unrelated reasons | Review policy v2 makes emotional audience fit advisory and excludes it from the delivery score/confidence gate. The four observable quality criteria retain their weights, normalised over 90. Review instructions restrict each image check to its own option and placement. Missing siblings belong to set review; unrequested calibrated colour or exact font measurements are not invented requirements. | Wrong product, altered required copy, unreadable required marketing copy, unsupported claims and actual mandatory-rule violations remain actionable. A complete set still needs its set checks. |

## Product-label uncertainty: issue 5

A physical label on the mattress is part of product identity. It is different from marketing copy added to the card.

- **Clearly wrong product name or marking:** correct the affected image.
- **Label too small to judge:** retain the image and ask for focused verification using the saved source and a suitable detail view. Do not claim that uncertainty proves a defect or that the image has passed.
- **Required marketing text too small at the intended viewing size:** this is a readability defect. Enlarging it for OCR does not establish real viewing-size readability.

This check does not stop unrelated images, the other option or another project. Truly shared missing prerequisites—such as the selected SKU identity—can still affect all work that depends on them. No automatic approval bypass or extra paid reviewer was added.

## Evidence and limits

Evidence is in `work/pdp-reliability-fixes-20261024/`:

- `before.log` and `qualifier-before.log`: failing reproductions captured before implementation.
- `focused-expanded.log`: targeted transport, wording, qualifier, review and socket regressions.
- `full-final.log`: all 1,320 offline tests passed, including browser and local database tests.
- `both-brands.log`: saved planning/provider handoff replay, zero failed stages for both brands. The historical Sleepyhead strategy response rejected by the newer `directionDecision` contract remains explicitly recorded.
- `saved-replay.json`: exact interrupted Sleepyhead slot-08 final-review state replayed in a temporary tree. The original image remains accessible and flagged, with zero paid calls. Production job, review ledger and original pixels were unchanged by replay.
- The same replay includes 12 complete Duroflex and 14 complete Sleepyhead saved review inputs. Five Sleepyhead outcomes held solely by emotional-fit confidence meet the new policy in this offline evaluation. These are not newly inspected pixels or retroactive production approvals. One additional Sleepyhead review has no complete saved input and cannot be replayed.

The first full-suite attempt hit sandbox restrictions on local servers. The authorised run exposed a compatibility issue in direct transport calls without dispatch metadata; that was repaired and tested. No paid model calls were made to implement or validate these changes. Live network repeatability and new rendered artwork still require a fresh end-to-end run.
