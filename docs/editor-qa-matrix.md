# Editor QA — 19 October 2026

Scope: shared production editor for Duroflex and Sleepyhead. Tests use isolated temporary jobs, mocked AI and saved-run replays. Real campaign originals, costs and verdicts are not rewritten.

| Area | Cases | Expected result |
|---|---|---|
| Entry and selection | Saved canvas; flattened/OCR; click text/image/logo; layer selection; hidden/locked layers | Correct creative and contextual controls; no accidental edits |
| Typography | Inline and sidebar text; long text; Unicode; font/weight/size/colour; alignment/spacing/effects; width and corner resizing | Wording survives; side resizing reflows; no silent stretching or substitution |
| Objects | Add/duplicate/delete text, image, rectangle, CTA; replace image/logo | Valid separate objects; photograph retained; logo proportions protected |
| Layout | Drag/nudge; snapping; six alignments; grouping/ungrouping; stacking; distribution at different zooms | Preview and saved document agree |
| History | Undo/redo; branch after undo; restore revision; original comparison | Correct state and immutable original |
| Persistence | Autosave; edits during save; failed save; local recovery; conflicting revision; close/reopen | No silent loss or overwrite; clear saving/error status |
| Assets | Missing image/font; corrupt upload; wrong brand/job reference; historical asset variants | Actionable feedback; references preserved; invalid exports blocked |
| OCR | Exact campaign text; duplicate matches; incidental lettering; product name; masks; stale source; local conversion | Only selected campaign text removed; other pixels protected |
| Export | PNG/JPEG; all six digital ratios; fonts/images loaded; hidden objects; preview parity | Intended dimensions and matching artwork; no guides or handles |
| Responsive/accessibility | Desktop/narrow screen; keyboard; preview; disabled controls | Reachable controls; preview cannot alter design |
| Costs and AI | Manual operations; optional AI cancel; mocked paid revisions; INR receipts | No AI calls for manual editing; explicit AI actions only |
| Brand isolation | Each area against Duroflex and Sleepyhead fixtures and saved replays | Shared behaviour with separate assets and evidence |

Existing coverage lives in `editable-canvas.test.js`, `editor-production.test.js`, `frontend-flow.test.js` and `handoff-frontend.test.js`. New edge-case coverage lives in `editor-rigorous.test.js`. Results and discovered failures are recorded below after execution.

Changes to the creative pipeline, destructive recovery behaviour or major editor interaction design require discussion before implementation. Reproducible ordinary UI bugs can be fixed within this QA task.

## Results

- Full offline studio regression: **637 reported tests; 636 pass; 1 known TODO; 0 unexpected failures**. The TODO reproduces the missing-asset defect and is not a pass.
- Both brand saved-run replays: all five handoff stages pass per brand; historical artifacts untouched.
- New geometry matrix: two brands × six digital sizes × three zoom levels = 36 combinations, exercising six alignments and text round-trip preservation per combination.
- New UI edge cases: width reflow, preview protection, rapid formatting, locked keyboard interaction, undo branching, edits during an in-flight save, stale-tab conflict/local recovery and no manual AI dispatch.
- Existing editor suites additionally cover PNG/JPEG pixel parity, responsive layout, grouping, effects, crop, revisions, OCR masks and brand isolation.
- Additional API/model spend: **₹0**. This does not price Codex development work.

### Fixed

1. Numeric text width scaled lettering instead of reflowing. It now changes the text box width at the same type size, matching side handles. Reproduced before fix, passes afterward.
2. Text without a font size passed document validation. Missing/nonfinite font size now rejects explicitly. Reproduced before fix, passes afterward.
3. An old carousel test expected the intentionally removed verbose gallery labels. Updated assertions retain carousel ordering, flag status, escaping and downloads, and check the direct editing action.

### Awaiting decision — high severity

When an image cannot load, canvas capture can omit its layer from the in-memory document. A missing background causes saving to fail; another image such as a logo may disappear from a saved revision. Proposed fix: retain unavailable layers and their saved geometry/order, keep the visible error and block export until resolved. **Fixed after user approval on 19 October 2026.** Capture now retains document membership/order and missing-layer geometry, asset references and grouping. The layer list labels unavailable images and offers Retry loading images; export stays blocked while loading fails. Regression coverage includes both brands editing, saving, reopening and restoring image availability, plus unavailable-logo and explicit-deletion checks. Original failing evidence and updated results: `work/missing-layer-preservation/`. The earlier suite numbers above describe the original QA run.

Evidence: `work/editor-rigorous-qa/report.json`, `before.log`, `contracts-before.log`, `final-suite.log`, and `brand-replay.json`. Pre-change source copies are in the adjacent `before/` directory.
