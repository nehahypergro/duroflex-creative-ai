# Saved copy and visual verification — 4 November 2026

Implemented in the shared runtime for Duroflex and Sleepyhead. No paid calls or backend restart were performed for this change. Existing saved projects, reviews, images, costs and checkpoints were not rewritten.

## Responsibilities

- Saved exact copy remains authoritative. Editable review calls `wording-agreement.verifyCanvas` before cache lookup or provider dispatch. This checks all embedded fields, separate-line ordering, missing/extra fields and hidden layers. Only text/CTA objects can satisfy a copy field.
- Final composition checks record saved-copy comparison status and copy hash alongside document/image hashes. The main editable delivery and component repair/reverification paths supply the saved record.
- The existing assembled-image visual reviewer inspects visible readability, clipping, missing glyphs and accidental background lettering. No extra model call or reasoning-effort change was added.
- Raster final review no longer runs Apple Vision, focused OCR or the OCR snapshot reader. Model-observed text is compared with saved copy by code. OCR disagreement cannot turn correct observed wording into unknown. Genuine visual uncertainty remains unknown.
- OCR helpers remain available for finding baked lettering, preparing masks, reconstruction and checking residual lettering after background repair. These paths still depend on macOS/Swift; this change does not make the complete-artwork conversion pipeline platform independent.

## Comparison policy

Only comparison strings are normalized; neither saved copy nor transcriptions are rewritten. Permitted display variants include ellipsis/three dots, spaced prose dashes, Rs./₹ before the same amount, existing quotes/spaced dot separators and x/× in dimensions. Bare dimension expressions are supported; no missing unit is inferred. Numeric signs/ranges, changed numbers, currencies, missing units, spelling, case and qualifiers remain protected. Disclaimers and explicit literal requirements retain punctuation. Editable layer content itself remains exact apart from whitespace/line wrapping.

## Verification

- New regression tests failed before implementation: both-brand typography equivalences, OCR disagreement and missing direct copy validation before provider dispatch.
- 88 focused tests passed: copy authority, retry behavior, removed checks, review output budgets, verification caching, editor binding, typography recomposition, component repair and wording agreement.
- Seven independent punctuation/dimension regressions passed.
- Existing Sleepyhead LinkedIn project `creative-7b5ecab6-869c-4e6e-af62-9820d9da5d6e` passes direct saved-copy comparison for all three text layers, read-only.
- Historical both-brand square replay is unavailable: deleted job `creative-e9f8c2ce-6138-4120-9043-68d4de847c6f` is missing. Not recreated or counted as passing. Both brands are covered by isolated regression cases.
- Final-review integration test installs a failing OCR snapshot hook and captures the review request successfully without invoking it. No external provider call is made.

Log: `work/copy-authority-20261104/tests.log`. Live image generation and backend reload are not verified in this change.
