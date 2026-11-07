# Reusable verbal brand style — 4 November 2026

New named-brand campaigns use saved words for brand inspiration instead of repeatedly attaching the reference library's images. The change preserves the existing model and reasoning configuration, including medium effort for strategy/concepts.

## Behavior

- Compile a source-bound profile from existing brand-guide interpretation and creative research observations. No extra model summarization call is introduced. Duroflex and Sleepyhead have separate profiles.
- Persist profiles under the brand's `knowledge-cache/style-<hash>.json`. Bind them to the brand revision, source text/image hashes and interpreted guidance. Repeated unchanged requests reuse them; a new SKU does not by itself invalidate the brand profile.
- Retain actual written observations, preferences, requirements and source authority. Draft-only rules remain advisory; campaign-specific offers/product claims are not promoted into reusable brand guidance.
- Project campaign research before strategy/concepts: remove inspiration/reference/screenshot assets from the downstream attachment catalog, retain the written findings, SKU facts, exact product photographs and logos. Save a separate `research-verbal-style.json`; original research remains unchanged.
- Prevent selected-reference hydration from putting those images back. A dispatch guard rejects excluded asset IDs or their pixels even if renamed. Server-bound exact-product/identity pixels remain allowed when the same photo also occurred in the reference library.
- Image generation uses the style selected in its art direction. It adds only a 332-character verbal-only policy notice, not the full brand style profile again. General planning packets retain the relevant actual wording, not only IDs.
- Follow-up creative versions inherit the parent's policy/profile. Existing unpinned jobs retain their original contracts; no job/checkpoint is reset. Initial brand research or a source refresh can still inspect source images once. Generated set-continuity/edit anchors and repair masks are not library inspiration.

## Validation

Evidence directory: `work/verbal-brand-style-20261104/`.

- Initial failing regression captured in `before.tap`; the shared-reference/SKU collision regression failed before its fix in `collision-before.tap`.
- Final focused run: **54 passed**, including both-brand profile isolation/reuse/invalidation, selected-reference suppression, renamed-pixel rejection, exact SKU preservation, persisted job policy, child inheritance and preservation of verbal concept guidance and qualifiers.
- Saved source replays: Duroflex excludes 66 inspiration assets; Sleepyhead excludes 67. Each reuses its text profile on the second read. This counts library assets excluded from future selection, not images formerly sent in every call.
- Saved Duroflex Octave Honey campaign: the generic attachment selection changes from 8 images to 7, all remaining images are product/identity evidence. All four selected product reference assets retain their exact bytes. The historical job is read-only and is not migrated or resumed.
- Required full offline suite: **2,194 passed, 21 failed, 2 cancelled, 3 skipped**. The 21 failures reference historical generated fixtures removed during the authorized cleanup. Two editor/browser tests timed out. The final focused checks above cover changes finished during/after that broad run.
- Required `test:qa:both-brands` remains incomplete because its saved Tatva campaign fixture is absent. The additional brand-source replays above passed but do not substitute for the missing whole-pipeline recorded fixtures.
- `git diff --check` passed. No paid calls, live image generation, quality approval or measured provider-speed claim were made for this change.

Local activation evidence is recorded separately in `work/verbal-brand-style-20261104/activation.json` after a supervised restart. Automatic job resumption remains disabled.
