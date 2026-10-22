# Editable creative canvas

Implemented as an opt-in shared engine for Duroflex and Sleepyhead. The existing flattened output remains the default. Existing flattened images stay available and do not acquire editable lettering.

## Use

1. In the brief, open **Brand canvas assets** for the selected brand. Upload its original logo and actual approved font files, including the weights/languages needed. Brand guideline screenshots do not supply font files. Duroflex has user-authorized Poppins files from its official website registered; Sleepyhead still requires its own approved files.
2. Select **Editable canvas** when generating a new digital image. The existing art-planning call returns the overlay layout. Actual loaded fonts are measured before requesting the photograph; code fits boxes and enforces readable minimums, or blocks impossible layouts before image spend. The unchanged image model makes only the photograph; the system adds separate editable copy and original-logo objects, then performs one assembled-image review.
3. Open **Edit canvas** on an editable result. Select text on the photograph to edit, or select a layer. Only relevant controls appear. The photo starts locked; unlock it for crop/position controls. CTA text and background move together. Multi-select supports grouping.
4. Changes autosave with a visible status, conflict detection and local recovery. Versions retain the original and revisions separately. Export waits for all referenced images and fonts. Missing files/glyphs block export; layout warnings can be acknowledged for a review export.
5. Rewrite, translate and regenerate are explicit paid actions. Manual editing/export never call a model. Child jobs retain usage receipts and INR estimates in the existing cost ledger; unknown usage remains unknown, and estimates are not confirmed billing.

## Design / persistence

- Fabric 6.9.0 is vendored with its MIT licence. `canvas-model.js` is shared by the editor and server export.
- New job files: `photo-*.png`, immutable `editable-*-original.json`, `editable-*-revision-N.json`, and `editable-*.json` state.
- Brand assets are hash-bound in each brand's `canvas-assets` folder. No cross-brand font/logo substitution.
- Structured art layouts use normalized coordinates. No extra layout-planning call. Photo prompts include overlay boxes and the existing crop contract; no added contrast fades.
- Raster validation checks overflow, overlap, margins and sampled contrast. It does not establish semantic product correctness or publication approval; editable results remain visibly awaiting review.
- Single digital images only in v1. No print/carousel, PSD or multiplayer workflow. Requires Chrome for export (`CREATIVE_AI_CHROME` can override the executable path).
- Fontkit 2.0.4 and playwright-core 1.58.2 are pinned in package.json. Existing local node_modules used mixed package-manager metadata; new dependencies were installed in isolation and copied into place without replacing existing dependencies.

## Rollback

Immediate: leave Editable canvas unchecked to use the existing flattened flow. `CREATIVE_AI_EDITABLE_DISABLED=1` prevents new editable generation while retaining access to saved editable documents.

The complete pre-feature source snapshot, including prior uncommitted work, is at `../rollback-snapshots/duroflex-before-editable-2026-10-15/`. It excludes secrets, dependencies and generated outputs.

For source rollback, stop the server and run:

```sh
python3 scripts/creative-ai/rollback-editable.py
python3 scripts/creative-ai/rollback-editable.py --apply
```

The first command is a dry run. Apply refuses to overwrite subsequent source edits, archives the current feature files, restores changed files from the snapshot, and removes only recorded feature-added files. Generated originals, client revisions, brand assets and costs remain intact. Restart the server after rollback; editable documents require restoring the feature to edit again.

## Verification

Mocked browser tests cover two brands × six digital dimensions (1:1, 4:5, 9:16, 16:9, 3:1, 2:3), saved revisions, original preservation, edit/undo/recovery, contextual controls, grouping, crop, text effects, preview, PNG pixel equality and JPEG dimensions. Missing fonts/assets and glyph coverage are exercised. Synthetic Arial/logo fixtures are test-only and have not been registered as real brand assets.

Additional checks cover opt-in art schema, separate product-name role, brand isolation, unknown-field rejection, UTF-8 script delivery, explicit mocked AI revision receipts, and unknown-cost reporting. Routine tests made no paid API calls (₹0 external API spend). Live generated-photo quality remains untested for this new mode.

Failures found and reproduced during implementation: photo endpoint allowlist omitted photo-* (preview lost its background); adding editableLayout to the global schema broke flattened/reconciliation tests; JS without an explicit UTF-8 response charset produced garbled symbols in a browser context; strict layer-field validation initially omitted translation language metadata. Each has a regression check. Existing saved-provider handoffs passed for both brands without modifying historical artifacts.

## First live Cocoon run — 15 October 2026

The live integration run exposed two boundaries missing from isolated canvas mocks:

- The provider's existing brand scope did not recognize pinned canvas assets. It now adds only approved same-brand asset IDs after verifying their immutable files against SHA-256. Foreign scope, invalid filenames and modified/missing bytes still fail before paid dispatch. The regression fails on the old implementation and passes for both fixture brands.
- Nine embedded downstream copy-role schemas still rejected product-name/supporting-copy. Those enums now match Copywriter. A recursive contract test plus actual Art director input validation prevents future drift.

All 551 offline tests and both-brand saved-provider replays passed after these fixes. Evidence is saved in `output/creative-ai/qa-editable-canvas/cocoon-live/`. The same live job resumes with saved planning and existing budgets/receipts; failed attempts are recorded, not overwritten. Fonts were registered only for Duroflex from the official site's Poppins webfont URLs, under the user's explicit instruction. They establish current website typography, not final approval of draft brandbook typography.

## Saved logo variants

Approved logo uploads retain earlier variants in the brand canvas registry. `colour` binds an approved six-digit logo colour; `makeDefault: false` adds a variant without replacing the default. Art planning chooses a matching saved colour for its logo box. Unknown colours use the default unchanged, without synthesizing or searching for a new mark. Existing jobs keep their pinned assets. Downloads are linked in Brand canvas assets.

## Workflow v1: measured layout and bounded review

Historical editable runs (before workflow v2 below) use `runtime/editable-quality.js` in the shared engine:

- Preflight loads the exact pinned fonts and outlined/raster logo into the same Fabric renderer used for export. It checks glyph coverage, measured line wrapping, safe bounds, text collisions and visible logo size (ignoring transparent padding). Readable text/logo floors are explicitly studio heuristics, not claimed brand/platform rules.
- Up to four deterministic fitting passes constrain copy width to the available safe area, raise undersized text/logo, grow measured text boxes and move overlays to the nearest noncolliding space. Exact wording and the photograph are never rewritten. If a layout cannot fit, generation stops with a saved preflight diagnostic before the image call.
- The final photo prompt uses the fitted overlay coordinates and measured logo colours. `gpt-image-2` and its configured quality are unchanged.
- One assembled-image review uses the existing configured reasoning model with a compact layer/measurement packet, the actual assembled PNG, and up to two selected official product references. It checks readability, copy fit, logo, subject occlusion and photographic issues. It does not inherit the full research dossier.
- The request has at most one reasoning reservation; schema failures, unavailable evidence or interruption do not trigger another paid review. Review checkpoints prevent repeated calls on resume. Usage receipts remain on the same creative job and flow to the existing INR ledger. No image generation is permitted in this review budget.
- One typed correction batch may change existing unlocked overlay positions, box sizes, text size/alignment/colour. Photograph, crop, copy, font IDs, assets, logo artwork, visibility and layer identities cannot change. Proposed corrections are re-rendered and rejected if geometry fails or sampled contrast worsens. There is no second vision call.
- Original document/PNG and automatic revision 1 remain separate. Initial review observations and unverified corrected-pixel status stay visible in Design checks. Neither a heuristic pass nor a proposed correction grants publish-ready status. Manual edits, exports and local validation make no AI calls.
- Historical finished jobs are not rewritten. Saved Cocoon layouts were replayed into separate QA artifacts; both now pass local geometry preflight without touching their originals. A new live vision review is not implied by these offline checks.

## Protected composition and role models — 15 October 2026

New editable art plans require normalized product/person protection rectangles. The engine converts them to canvas pixels, keeps them immutable in that document, and supplies them alongside the final measured copy boxes to photograph generation. Actual font measurements enforce subordinate supporting/product text and a compact CTA. Placement fitting avoids protected regions; impossible layouts stop before photograph spend. These are planned areas, not detections or guarantees that generated pixels obey them.

The single assembled-image review now returns observed product/person/face rectangles and an ID for every flagged overlay overlap. Each ID must be assigned to its own layer's correction or explicitly marked unresolved. Geometry checks reject colour-only fixes, hiding/rewriting text, omitted collisions, foreign IDs and newly introduced collisions. Corrected layers are rendered and measured again locally; there is still no second vision call or photograph regeneration. Unresolved findings stay visible, and no result is automatically approved. Manual edits are also checked against saved observed rectangles; changing the photograph/crop requires renewed visual inspection.

The shared production provider routes Marketing Strategist (`strategy`), Creative Director (`concepts`), Art Director (`art`) and art/copy reconciliation (`reconciliation`) to `gpt-6-astra` with medium reasoning, including output-limit recovery. Copywriter, audits and assembled review retain the configured base model. `gpt-image-2` and image quality remain unchanged. Public configuration, new-job runtime configuration, cache identity and actual usage receipts retain the role model choice. Account access checks surface unavailable models rather than silently falling back. INR accounting uses actual receipt models and keeps estimates distinct from billing.

The rejected Cocoon job `creative-c538f1cf-5a65-49a3-8d0f-31fca63f6550` stays historical failed test evidence. Read-only regressions bind its saved original/revised documents, review and image hashes, and reproduce the remaining CTA/product overlap using manually annotated pixel rectangles. These images are not positive creative references. Offline regression checks do not establish the aesthetic quality or latency of a future Astra-led live run.

A new regression also exposed fractional CTA widths repeatedly rounding to the same integer while being reported as changes. The fitting loop now compares the integer target before applying a change. Both fixture brands pass measured protected-layout preflight across six digital dimensions. Test fixtures use synthetic assets; they do not supply approved brand artwork.

## Workflow v2: photograph before canvas measurement — 15 October 2026

The user removed the separate pre-photograph font/layout preflight. Newly created editable jobs pin `editableWorkflowVersion: 2` in server code; a caller cannot select an older version. Approved font/logo files are still validated and pinned at intake, and placement resolution supplies dimensions. These existing technical boundaries are not a new creative stage.

For v2, the Art Director's planned overlay coordinates go directly into the photograph prompt. There is no pre-photo Fabric render, font-fitting loop, minimum-size adjustment or repositioning pass, and no preflight failure blocks photography. After photography, the original layout is assembled with the actual font/logo assets, measured, and reviewed once using the existing assembled-image review. Post-assembly warnings, correction validation, manual-review status and export asset/font checks remain. No extra AI call is introduced. Preflight metadata explicitly says `not-run`; it does not claim a pass.

Historical jobs without the v2 pin retain their earlier preflight behaviour and saved diagnostics, avoiding layout/source-hash changes on resume. Existing originals, review flags, budgets and receipts are not migrated. The retained preflight helper/tests exercise that historical compatibility path; they are not invoked for a new v2 job.

The regression uses mocked image generation for both fixture brands: the old implementation calls the forbidden pre-photo gate and fails; v2 generates one photograph, preserves the original planned layer coordinates, records post-assembly warnings and keeps the result unapproved. Routine verification makes no paid API calls.

## Default planning models — 16 October 2026

At the user’s request, new default runs route strategy, concepts, art direction and copy/art reconciliation to GPT-6 Luna Medium. Other roles retain their existing configuration; photograph generation remains gpt-image-2. Earlier experiments and saved job configurations remain historical.

## Direct Edit entry (21 October 2026)

For both brands, **Edit** opens an existing saved document immediately. If an image has no editable document yet, the editor prepares it locally without a text-selection or extraction screen. It selects all uniquely matched embedded campaign-copy fields from the exact saved image package, including product-name copy when safely matched. Unmatched, ambiguous and incidental lettering stays in the photograph; the original image and prior review verdict are preserved. Logos remain in the photograph unless the historical document already contains a separate logo.

A brief preparation state can be closed. Closing it prevents a late response from reopening the editor. An unavailable local recognizer opens the unchanged photograph with the normal add-text/image tools. Other preparation failures show a retry action instead of silently discarding the error. Partial preparation is identified in the editor footer. Reopening reuses the saved document and client revisions rather than repeating extraction. Preparation, manual edits and ordinary exports make no paid AI calls.

Regression evidence: `work/direct-edit-20261021/`. The browser regression fails before this change at the extraction-choice screen, then checks automatic preparation, saved edits and immutable originals for both brands. Additional cases cover unavailable recognition, no matched copy, stale-proposal retry and cancellation during preparation.

## Story acceptance path (21 October 2026)

The new studio now uses `StudioModel.generationProfile` for the same supported-profile decision in the browser and server. In addition to a single 1080×1080 benefit-led post, it accepts one Instagram Story recipe (feature 8, `story`, 1080×1920, one slide) with a saved product. Other recipes and dimensions remain outside this submission gate. Story-specific inputs, scoped references and exact variant are preserved in the generation request; square and Story readiness tokens cannot be interchanged. The existing whole-image model/logo flow and automatic Edit entry remain in use.

Live and offline acceptance evidence is saved under `work/static-story-acceptance-20261021/`. Technical tests do not grant artwork approval; consult each output’s saved review and the final acceptance report.
