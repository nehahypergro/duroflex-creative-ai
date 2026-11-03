> Update, 28 October 2026: the shared field-bound composition is now integrated for new Studio requests. See [Design-first editable text](editable-text-production.md). The notes below describe the historical isolated experiment; its saved jobs and checkpoints remain unchanged.

# Separate text-layer experiment

Status: isolated implementation, not the default Studio route. Live aesthetic
quality has not yet been tested for this final-layout handoff.

## What stays the same

The scoped brand brief, strategy, concept, Copywriter, product references, pinned
placement rules, image provider/settings, budget ledger and exact wording remain
on the existing engine. New jobs use Option 1. The normal Studio and its existing
queue do not install this adapter. Historical outputs are not migrated.

## What changes in the experiment

1. The existing final art/copy reconciliation call also supplies coordinates for
   every final embedded copy field. This adds no separate planning call. The
   strategist's message priority, format rules and final art decisions remain the
   source of layout intent.
2. The final layout is stored separately, bound to the exact art specification,
   brand, placement and wording. Earlier draft coordinates cannot override it.
   Missing, duplicate, foreign or stale bindings are reported for that unit;
   generic fallback positions are not substituted.
3. The image call creates the clean visual layer with reserved natural space for
   the planned text and logo. Authentic physical product markings remain in the
   image. No OCR removal or white-patch cleanup is used.
4. Fabric renders the final words with the selected brand's actual font files and
   approved logo. Each field has its own position, even when roles repeat. Native
   captions/alt text remain separate. CTA button treatment is explicit, not a
   default added to every field.
5. Measurement happens after the image, as in editable workflow v2. The existing
   single assembled-image review receives placement context, reading guidance,
   strategy and final hierarchy. Its correction and manual-review boundaries
   remain intact. Post-assembly warnings convert actual font size to the pinned
   viewing width and check measured explicit brief bounds, without shrinking text
   or adding a new pre-image gate. Failed/unavailable review is visible; successful assembly does
   not grant artwork approval. Editing and export use the saved document.

The new final-layout builder accepts zero added text and omitted logos. The first
runner is deliberately limited to one supported, dimensioned static placement.
The older editable art-draft stage still has its own headline/product assumptions;
this experiment does not claim full image-only/brand-only or PDP-pack coverage.
Those routes need a separate integration check before expanding the experiment.
The existing photograph prompt remains the scope of this first experiment;
non-photographic art treatments need their own live proof.

## Run separately

Prepare a fresh intake using the selected brand's current saved research and
exact saved SKU/variant. Check without any provider calls:

```sh
node scripts/creative-ai/run-text-layer-experiment.js path/to/intake.json --check
```

Start a new paid experimental job only when deliberately requested:

```sh
node scripts/creative-ai/run-text-layer-experiment.js path/to/intake.json --run
```

The runner refuses concurrent active generation, checks the saved testing
allowance and conservative historical/concurrent exposure, and creates a new job
with new receipts. Unknown historical charges remain unknown. It neither changes
provider rates nor rewrites an old project's spend. The main Studio will not
silently dispatch an experimental job after restart.

Resume a checkpoint inside its existing time/budget window:

```sh
node scripts/creative-ai/run-text-layer-experiment.js creative-JOB-ID --resume
```

The main generation screen has no new switch. The side runner installs the
adapter in its own process. Removal means not invoking that runner; ordinary
projects retain their existing route.

## Verification and limits

Evidence: `work/text-layer-experiment-20261027/`.

- A regression reproduces the old role-only layout mapping giving two supporting
  fields the same position, then verifies separate field-bound final positions.
- Both-brand checks cover exact wording, native fields, stale final art, duplicate
  fields, foreign fonts/logos, and ordinary-route pass-through.
- A mocked end-to-end run for each fixture brand exercises clean image dispatch,
  final layout overriding an invalid old draft, real Fabric assembly, visible
  review failure, editing, and PNG export without additional provider dispatch.
- Current saved font/logo files and research ownership passed preparation checks
  for Duroflex and Sleepyhead. Saved planning replays passed for both brands.
- Existing editor regression checks passed with local browser access. The first
  full-suite attempt was blocked by browser/server permissions; its failures are
  preserved in `offline-tests.log`. See `offline-verified.log` for the rerun.

These checks use mocked providers and synthetic artwork. They do not establish
that the live model will obey reserved space, produce good composition or deliver
readable artwork. A new live comparison is still needed before promotion.

Final verification: the full offline suite passed 1,519 checks after local browser
and server access was enabled. The final focused experiment suite passed 21
checks, including both-brand mocked rendering/edit/export, restart isolation and
actual viewing-size warnings. New paid generation calls: 0.
