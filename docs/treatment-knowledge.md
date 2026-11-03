# Shared treatment knowledge

New Studio jobs load their selected formats from the existing versioned
placement catalogue through `lib/creative-ai/treatment-knowledge/index.js`.
The source for the owned-website PDP gallery is `owned-pdp.json` in that
directory. `format-playbooks.json` adds 73 authored treatments for the other
image families and shared source/quality rules. The PDP pack owns the current twelve slot descriptions, execution guidance,
strategist principles and their references. The PDP executor uses this same
source, rather than maintaining another copy of the guidance.

## Selection and use

The selected placement identifies the destination. The brief's objective,
audience, product and buying context inform the strategist's application of
those rules. A word such as “story” in a brief cannot silently change an owned
website gallery into an Instagram Story. There is no nearest-ratio fallback.
When format selection is missing or ambiguous, the existing selection contract
must resolve it before paid production.

Every format receives its exact catalogue rules, check definitions, source
references/access limitations, source conflicts and missing job inputs. Only
explicit full-PDP selections receive the owned-PDP treatment pack. Marketplace
MAIN and A+ receive their own playbooks alongside catalogue context. The format
loader uses exact catalogue/preset identities, including the base identity of
expanded carousel slides and print pages. Only explicitly enumerated custom
recipe identity patterns are accepted; overlapping matches fail closed.
Unmapped destinations receive common guidance and an explicit coverage gap.
This integration does not fill missing product research or enable a missing renderer.
The current twelve-slot PDP plan includes mattress-oriented roles; a future
category-specific plan must be deliberately authored and versioned, not inferred
from another product's evidence.

The strategist receives this context before concepts. Its existing required
`channelFormatImplications` entries must cover every selected format. Instructions
now ask for the buyer question/purpose, message priority, supported proof or gap,
and treatment implication. These are decision summaries; passing the schema does
not prove the reasoning is strong or the generated image works.

The creative director inherits the same strategist input. Copy and art planning
receive the stored treatment snapshot. The PDP planner receives it alongside the
strategy and selected SKU evidence. Per-image review gets the selected slot's
rules; complete PDP review gets the full snapshot. No additional model call or
separate review agent was introduced. Rules add context to existing calls.

## Authority and continuity

- Placement requirements, Studio contract decisions and recommendations retain
  separate labels. Recommendations do not become mandatory publisher rules.
- Treatment research is not product proof, customer research or brand guidance.
  Duroflex and Sleepyhead use common format rules and their own scoped evidence.
- New jobs atomically save `treatmentKnowledgeVersion` and `treatmentKnowledge`
  with a content hash, exact placement pins and full applicable source records.
- Resume validates and reuses the stored snapshot. A missing required snapshot,
  hash mismatch or selection mismatch fails closed. Historical jobs without the
  marker keep their previous context and verdicts.
- Long constraint records are split within the strategist schema bounds without
  truncating information. Context that exceeds the supported count fails before
  the strategist call. Existing provider token preflight remains in force.
- Planning/review requests deduplicate common rules and sources and remove
  unselected profile scopes. They retain a link to the complete saved snapshot;
  the full archival context remains intact. The twelve-slot fixture falls from
  456,642 bytes archived to 100,391 bytes of planning context. This is a payload
  measurement, not a claim about token billing or live latency.
- Future edits require a pack version change, tests and source review. They apply
  to newly captured jobs; old jobs keep their saved execution instructions.

## Verification

`work/treatment-knowledge-20261023/` retains the initial failing reproduction,
focused regression results, full offline suite and both-brand saved replay.
Tests cover selected destination isolation, ten catalogue profiles, PDP rules in
the actual strategist adapter request, brand isolation, stored context integrity,
legacy compatibility and shared planning/review instructions. Saved replay uses
recorded responses with mocked transport. These checks do not establish live
creative quality, ten live generation scenarios or a passing PDP gallery.

`current-context-both-brands.json` additionally checks the new lookup against
each brand's actual saved strategy input and intercepts the strategist request
before dispatch. Its product facts and research remain byte-equivalent after
enrichment. No provider request or new artwork is involved in that check.

Final verification on 23 October 2026: **47 focused tests** and **1,019 full
offline tests** passed; both-brand saved replay reported **zero failed stages**.
The initial sandbox run could not open local test servers (EPERM); the complete
suite was rerun with local loopback/browser permission and external model calls
still blocked by the offline harness. Final evidence is `focused.txt`,
`full-suite-verified.txt` and `both-brands-final.txt` in that work directory.

## Format playbooks added on 24 October 2026

Each treatment defines purpose, copy, scene/composition, native action, sequence,
required inputs, rendered-output checks and pitfalls. The authored source is
`lib/creative-ai/treatment-knowledge/format-playbooks.json`; the loader validates
sources, selectors and treatment completeness. `format-common` carries client
source constraints and shared recommendations. Family-specific advice remains
labelled as recommendations, rather than silently becoming publisher limits.

Primary-source access is preferred. The user permits secondary articles and
videos when official pages are blocked; sources retain their access status and
limits. Meta's official guide was login-blocked. Secondary Story guidance informs
treatment, but its numeric safe-area reports do not modify the placement
catalogue or establish hard rejection rules. Source access is not independent
verification of every claim. Website product evidence remains separately scoped.

The readable [format treatment playbook](format-treatment-playbook.md) is
generated from the same JSON by:

```sh
node scripts/creative-ai/build-format-playbook-doc.js
```

The command also creates `work/format-treatment-20261024/index.html`, a searchable
review copy with browser-local comments and JSON export. Comments never update
production rules automatically. Rebuild the copies after changing the library;
bump pack/library versions and retest before new jobs use revised guidance.

### Coverage and activation limits

- All current Studio presets resolve to authored guidance; their delivery and
  rendered quality still require their existing checks.
- Amazon Standard/Premium image slots, RCS, push and paired website/email
  desktop/mobile images have explicit mappings. The older general Premium
  definition remains reference-only; actual modules use their dedicated packs.
- Technology, offer, proof, local-store, partner and blog recipes now preserve
  a distinct saved destination identity instead of inheriting generic feed rules.
- Every native placement catalogue destination has an authored treatment. This
  includes placements whose eligibility or production support remains conditional;
  a mapping never overrides their existing placement limitations.
- Leadership, hiring, employer brand, awards, employee sharing, packaging,
  internal portal, article illustration, training references, battlecards and
  product demonstrations now have prepared guidance. Like YouTube Community,
  press sets and adaptation, unmapped catalogue concepts remain route-pending.
- When multiple formats share a family, each selected treatment is pinned
  separately; a standee cannot inherit a wall graphic's composition. Identical
  page treatments still deduplicate. Previously saved snapshots are unchanged.
- Catalogue and training rules do not establish complete assortment planning,
  native editable documents or commercial print readiness.
- Existing Pinterest and thumbnail formats are covered without enlarging the
  client's agreed scope. Removed standalone master KV remains removed.
- The shared implementation is wired for new job capture. A running Node process
  that cached the old module needs its normal safe reload to activate this code;
  reload only after confirming no active or queued work; do not restart workers in the middle of a run.

Verification evidence is in `work/format-treatment-20261024/`: 22 focused tests,
1,191 passing full offline tests (no failures),
browser filtering/comment/export/layout checks, both-brand recorded handoff
replay, and saved-context checks across ten placements per brand with the
provider dispatch intercepted. Saved files, brand research and product facts
remain unchanged. These are offline integration checks, not ten live generation
scenarios or evidence of improved artwork quality. No new artwork, budget
changes or historical cost adjustments are part of this change.

2026-10-29 coverage update: see `docs/strategy-coverage-20261029.md` and
`work/strategy-coverage-20261029/` for current audit and regression evidence.
