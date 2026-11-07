# Ready status and outstanding corrections — 4 November 2026

Confirmed in the legacy score-gated review path: a confident creative-severity
finding could route to targeted correction while a score above 75 allowed Ready.
Delivery then included that same finding in `unresolved`. A missing required
comparison could also create a diagnostic route without preventing Ready.

## Fix

- Compute routing and verification dependencies before deciding readiness.
- A targeted correction in the legacy policy requires revision even with a high
  score. Missing comparison evidence requires verification and does not spend an
  artwork correction cycle on its own.
- Preserve the current explicit-blocker policy: subjective improvements remain
  advisory. Policy-designated advisory criteria are also normalized to advisory
  in legacy evaluations. Ready may have optional suggestions, but no required
  corrections or verification dependencies.
- Lifecycle verification rejects any Ready report with non-advisory findings,
  correction/diagnostic routes or verification dependencies, even if rehashed.
  Delivery already calls that verifier, so the guard protects both consumption
  and export without merely hiding unresolved items.
- Full output validation also exposed unsupported nullable type arrays in the
  classified-finding schema. Equivalent `anyOf` string/null branches now work
  with the existing scoped validator, for both suggestion and blocker reports.

Existing saved artwork, reports, policies and ledgers were not rewritten. An old
internally contradictory report cannot be newly consumed/delivered as Ready;
it needs a separate consistent review. No automatic paid repair was launched.

## Evidence and limitations

The saved pre-change modules fail six of nine initial regression cases; the
fixed implementation passes those cases and the expanded advisory-policy test.
Logs and source snapshots: `work/review-ready-consistency-20261104/`.

The shared regression run covers review decisions, correction lifecycle,
delivery, current relaxed policy, format profiles, finding classification,
verification recovery, component repair and QA boundaries.

Full saved-provider replays were attempted for Duroflex
`creative-8e57a041-f219-4be2-afce-15a7a97f4b3a` and Sleepyhead
`creative-0c9b259c-56af-4380-a33b-5f9e398d417f`. They did not pass: three old
packages exceed the current distinct-reference allowance, and one old response
lacks current locked-rule/placement observations while returning an obsolete
aggregate field. These are historical replay incompatibilities, not passing
visual validation. Original evidence was preserved.

No paid calls or backend restart. The source fix needs a controlled backend
reload before the running local app uses it.
