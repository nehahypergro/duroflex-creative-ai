# Fold panels (21 Nov 2026)

## What went wrong

Folded brochures missed the fold, and it happened again on every run.

- **The hosted Prana bi-fold** (outside face, 1790 × 1276 px) split its two panels at about 40% of the width instead of the fold at 50%. The check flagged it as "Layout · Check".
- **Saved local bi-fold jobs:** 2 of 4 faces drew a fold line even though the brief said not to:
  - `9abf4683`: "a thin vertical line … along the halfway fold".
  - `9e977aab`: "a faint dashed vertical fold guide".

## Why

- **The fold was only described.** The image model was told about it in millimetres and words ("central half-fold creating two 148.5 mm panels"). It never got a pixel position or a guide, so it guessed.
- **The plan pushed it off-centre.** One saved plan even asked for "intentionally unequal visual density".
- **Nothing fixed it afterwards.** Layout findings are deliberately not auto-corrected (correction scope, 9 Nov 2026), so the original stayed "check before using".

## Decision

Neha chose "Draw panels separately" on 21 Nov 2026. New lean jobs pin `foldPanelVersion: 1`.

## How it works

`lib/creative-ai/runtime/fold-panels.js` and `lean-workflow.js` `drawPanels`:

1. **Panel layout.** The face's print geometry gives each panel's pixels:
   - The first panel carries the left bleed and the last panel the right bleed.
   - Each fold sits at bleed + the panels before it, scaled from the artboard to the canvas.
   - A4 bi-fold folds at exactly x = 895 of 1790.
   - A letter fold uses the supplied panel widths, and a Z-fold uses thirds.
2. **One request per panel.** Each panel is drawn as its own gpt-image-2 request at the panel's own shape.
   - The prompt is the face's brief plus a FOLD PANEL DRAWING line. It names the panel's role (back left, cover right, inside left …) and asks for only that panel's content.
   - It also asks for no fold line, crease, shadow or divider, and for the background to run to the fold edge.
3. **Continuity reference.** Panels after the first get the unit's saved first panel (`fold-panel-anchor`) as a reference, to match the palette, lighting and type. It is not product evidence. `brand-isolation.verifyFoldAnchor` accepts it only when:
   - the brand matches the job,
   - the binding key matches the unit,
   - the bytes and hash match `lean-state` `panels[0]`.
4. **Fit and join.** Each panel is fitted to its exact pixels (`exact-canvas`) and saved, as `static-lean-panel-raw-<key>-<i>.png` and `static-lean-panel-<key>-<i>.png`. The panels are then joined into the face.
5. **Checks and corrections.** The joined face goes through the usual check and single correction.
   - Edge fit is skipped for folded faces, because scaling the face would move the fold.
   - A resumed unit keeps its saved panels and draws only the missing ones.
6. **Planning.** The planner gets `input.foldPanels`: each panel is a self-contained layout, nothing crosses a fold, and there is no fold line or off-centre split.
7. **Picture limit and estimate.**
   - `maxImageCalls` adds one image per extra panel per folded face (`fold-panels.extraImages`).
   - The brief estimate adds the same images at the sample run's average image price.

## Cost

One extra gpt-image-2 picture per extra panel. That is one per bi-fold face and two per tri-fold or Z-fold face. The 385 saved gpt-image-2 receipts average about ₹9.4 (median ₹9.5, 10th–90th percentile ₹6–₹12; RBI reference rate of 9 Oct 2026). There is no extra check, because the joined face is checked once.

## Tests

`tests/creative-ai/fold-panels-20261121.test.js` uses Duroflex and Sleepyhead fixtures and makes no paid calls. It failed before the fix and passes after. It covers:

- two requests per bi-fold face,
- the seam exactly at x = 895,
- the anchor on the second panel only,
- resume without redrawing,
- unpinned jobs unchanged,
- the anchor refused when it comes from another brand or unit, or its bytes changed.

## Saved runs

All 8 saved folded faces on this computer are Sleepyhead bi-folds (`6cfc75af`, `9abf4683`, `9e977aab`, `ed731707`). They are unpinned and keep their single drawing. Their saved geometry gives the fold at 895 of 1790 px.

## Known limits

- The panels are separate pictures. A scene or photograph cannot run across a fold; brochures already forbid a photo across the crease.
- Colour matching between panels comes from the reference and the brief, not from pixels.
- The hosted Studio needs a redeploy before new jobs use this.
