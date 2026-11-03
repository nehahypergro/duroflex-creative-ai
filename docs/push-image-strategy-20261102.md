# Push-image strategy correction — 2 November 2026

The Quboid Android push image (`creative-d1e1c35b-9f41-403a-81e0-446eb18c88aa`) combined a mattress view with a labelled exploded diagram. Its saved copy deck was empty, but the concept explicitly preserved the diagram's source wording. The final reviewer reported unreadable small white layer labels. Official source approval had been conflated with suitability for a small notification image.

Push treatment version 3 now asks for immediate recognition and one visual idea. Product briefs prioritise an exterior view or a simple supported detail. Exploded diagrams, annotated cutaways, feature grids and technical callouts inform understanding, rather than being reproduced in the image. Native notification text and the destination carry the explanation and action. Authentic markings physically on the product remain protected; diagram captions are not product markings. No fixed room, lighting or people rule is added.

New jobs pin this treatment through the existing format snapshot. It reaches strategy as selected-format constraints, concepts through the strategy input, and copy/art through the treatment context. The composed-image request and assembled-image reviewer now also receive the job's pinned push guidance. The reviewer considers baked-in annotations even when there are zero editable fields, using existing checks and tolerances. No new density threshold or copy-fit check is introduced. Review guidance alone is not proof of model compliance.

Historical version-2 snapshots, images, reviews and receipts remain unchanged. Other formats do not receive the new push generation/review instructions. A replacement for the failed image has not been generated.

Verification evidence is in `work/push-strategy-20261102/`:

- `before.log`: regression fails against the previous strategy and missing generation/review handoff.
- `focused.log`: 27 checks pass, including both brands and Android/iOS/Web, source isolation, historical treatment preservation, generation guidance and zero-field review.
- `browser-validation.log`: 30 offline checks pass with local Chrome, including both-brand composition versions and the push regression. Initial sandbox browser launch failures are retained in `composed.log`.
- `both-brands.log`: saved Duroflex and Sleepyhead planning handoffs pass, zero failed stages.
- `saved-case.json`: hashes the actual failed push asset and binds its original readability observation to the new guidance; no new visual verdict or paid call.
- `offline-suite.log`: broader offline suite attempted in the sandbox; browser and local-server permission failures prevent claiming a full-suite pass.

Studio was reloaded after confirming no queued/running/preparing generation jobs; `/admin` returned HTTP 200. No paid generation or review was dispatched.
