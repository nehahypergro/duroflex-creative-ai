# Format strategy coverage — 29 October 2026

The shared playbook is now version 1.4.0. It contains 73 authored treatments (25 added in this pass), plus the dedicated PDP pack. This is strategy readiness, not a claim that every listed asset has a complete production workflow or passing live artwork.

## What was missing and what changed

| Area | Previous gap | Now |
| --- | --- | --- |
| Technology visual | Generic social-square strategy | Dedicated explanation, original technical artwork, exact labels and supported alternate demonstration guidance |
| Offer creative | Generic social-square strategy | Exact promotion, SKU, dates, terms, hierarchy and supplied destination |
| Proof / claim card | Generic social-square strategy | Source scope, claim/evidence/qualifier hierarchy, no invented proof |
| Store post | Generic social-square alias despite an existing local playbook | Distinct local identity selects the existing local-store playbook |
| Partner / alliance creative | Generic social-square strategy | Co-brand roles, lockups, relationship facts and approval boundaries; existing partner attachment/preflight restriction remains |
| Blog / Open Graph | Generic social-landscape alias despite an editorial playbook | Dedicated editorial identity, article relevance and supplied article destination |
| Paired desktop/mobile website and email images | New slot identities had placement rules but no treatment mapping | Both members select their own website/email treatment |
| Sales one-pager, specification sheet, presentation cover | One generic family | Distinct purpose and composition for each exact format |
| Digital invitations and agendas | Generic sales guidance or placement-only | Event identity, exact logistics and appropriate hierarchy |
| X, Reddit, TikTok static, Meta secondary placements, Snapchat | Placement rules only | Explicit destination-specific editorial strategy; existing eligibility and specification limits remain |
| Sponsorship boards, app screenshots, QR posters, structured menus | Placement rules only | Purpose-specific strategies; no claim of functioning QR, app, print or publisher acceptance |
| Multiple print types in one campaign | First materialized family treatment could be reused for a different format | Separately pinned selected treatments; identical pages still deduplicate |

All 131 native placement-catalogue profiles now select a treatment. This does **not** enable missing delivery routes, expand the client’s scope to every platform, or certify publisher eligibility. Unknown custom destinations still explicitly report a strategy-coverage gap rather than guessing from dimensions or brief keywords.

## Prepared for later production connections

New authored guidance, with no invented selection route:

- Leadership / spokesperson portraits.
- Hiring announcements.
- Employer branding and workplace culture.
- Awards and milestones.
- Employee share cards and Status images.
- Packaging / branding stills.
- Internal portal updates.
- Article illustrations.
- Training decks, cheat sheets, mobile reference cards and FAQ/process visuals.
- Comparison battlecards, still dependent on supplied comparison data.
- Product demonstrations / review visuals.

Existing reference-only press imagery, YouTube Community and adaptation guidance remains available. The old general Premium A+ entry is also reference-only; actual supported Premium image slots already use their dedicated mapped packs. Dealer toolkit assembly, full catalogue production, bulk localisation/personalisation and video remain separate work.

## How the guidance is used

Every treatment defines purpose, copy, composition, action, sequence, consequential inputs, review questions and mistakes to avoid. Only the selected guidance enters a new job. Strategy, creative direction, art and review use the pinned snapshot. Product facts, visual brand rules and research stay scoped to the selected brand.

The editable-text workflow now has shared design guidance: agree message and hierarchy, reserve purposeful space in a real backdrop, generate without added campaign wording, then assemble editable text. Genuine product markings and original technical artwork remain intact. Image-only work can have no overlay; no automatic CTA or emotional-appeal requirement is added.

New guidance is recommendation-tier. It adds no generation blocker or automatic rejection threshold. Existing source requirements and exact-asset restrictions remain in place. Optional missing demonstrations should switch to a supported alternative, not stop unrelated ready work.

A selected recipe now retains a semantic identity in its custom placement profile. Technical explanations and proof cards no longer inherit an automatic product-sales action. Blog and store requests retain their supplied destinations. Historical requests retain their saved identities, snapshots, budgets and artifacts.

## Verification

Evidence is under `work/strategy-coverage-20261029/`:

- `before.txt`: failing reproductions for generic recipe selection, missing responsive mappings, mixed-family treatment leakage and native coverage gaps.
- `coverage-tests.txt`: 38 focused checks pass, including both-brand strategist interception, downstream context, legacy snapshot integrity, recommendation tiers, supported routes and route-pending boundaries.
- `focused.txt`: 73 integration checks pass, including saved-brand readiness for existing image families.
- `final-readiness.txt`: 2 additional saved-brand readiness tests pass after the action/destination correction.
- `saved-replay.txt`: recorded Duroflex and Sleepyhead handoffs pass with zero failed stages; mocked transport, no artwork generated.
- `offline-suite.txt`: full offline suite evidence. Do not infer a clean release from the focused passes; broader UI and historical test failures are recorded separately below.
- `activation-integrity.json`: all 308 saved job files unchanged across activation, no active or queued work at reload.
- `studio-live.png`: authenticated Studio home after the safe reload. Admin and Studio both remain accessible; no project was created or submitted.

Studio was gracefully reloaded on 29 October at 18:15 UTC after confirming there was no active/queued generation. Persistent accounts and saved work were retained. No live artwork, paid provider calls or changes to provider pricing were part of this pass.

### Broader regression result — incomplete, not a release pass

The broad offline run reported **1,546 passing, 35 failing and 2 cancelled** checks before completion of all browser scenarios. After repeated UI failures, the remaining isolated `studio-ui-browser.test.js` worker was stopped; it did not exit on SIGTERM and was terminated with SIGKILL. The live Studio process was not targeted. These are partial-run counts, not complete-suite totals.

- One failure was the old generic profile expectation in `static-six-flow.test.js`. That expectation was updated for this intentional strategy-routing change and passes in the subsequent 38-check focused run.
- Two assertions expect the former “Preparing” and “Waiting” status labels instead of the current “Creating” stage. They remain reported, not hidden by changing the product back.
- Other browser failures include a test attempting to use a product picker button as a native select, absent/hidden older intake selectors, project-board assertions, and navigation or download timeouts. These need a separate current-UI regression pass. This work did not establish that every failure is merely an outdated test or that every client journey is healthy.
- Saved-brand planning replays and all targeted strategy/routing checks pass. Live generated-artwork quality remains untested in this pass.

## Sources and limits

The new purpose/composition guidance is explicitly Studio-authored editorial advice. It is not represented as a platform rule or a claim of proven marketing performance. Existing source access limitations and exact placement contracts remain pinned. WAI guidance on [informative images](https://www.w3.org/WAI/tutorials/images/informative/) and [images of text](https://www.w3.org/WAI/tutorials/images/textual/) was checked on 29 October; native text and an exported raster with editable source layers are not equivalent accessibility guarantees. Google Business Profile and LinkedIn official references were also inspected without changing numeric placement specifications.
