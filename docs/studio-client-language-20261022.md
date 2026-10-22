# Static Studio client language — 22 October 2026

Applies to the shared Duroflex / Sleepyhead Studio and editor. No generation-model, prompt, billing, product-source or historical review changes.

## Client experience

- Editing preparation says “Preparing your design for editing”. Preparation failures offer retry and preserve the original.
- Creative names and Option 1 / Option 2 replace internal route labels in titles, accessibility labels and download filenames. URLs and storage bindings retain their internal identifiers.
- Save status says “All changes saved”. Version details remain in history, recovery comparison and exported filenames.
- Generation, download, upload and recovery failures use contextual messages. Specific local constraints (file limits, locked selections, unavailable products, newer saves and unavailable latest-edit metadata) remain actionable. Unknown charges remain explicitly unknown.
- Technical workspace access is under Settings → Admin diagnostics. This is a navigation separation, not access control; account permissions are not implemented here.
- Review details open in the current interface. Four icon-led intent explanations remain separate from observed findings. Repeated disclaimers and correction-cycle completion messages are removed. Scores never clear unresolved concerns.
- Unavailable image previews say “We couldn’t load this image. Your work is safe.” with Retry loading.
- Edited option thumbnails say “Edited · review needed”, matching the main review badge. Historical approval is not inherited by client edits.

## Validation

Evidence: `work/client-language-20261022/`.

- Shared UI/editor regression: 132 tests passed; zero failures. Includes both brands, preparation, conflict handling, recovery, uploads, all static recipe journeys, exact latest-edit download, undo/reopen and mocked production flows.
- Focused wording tests: 4 passed; model tests: 28 passed. Added cases for internal error suppression, known actionable constraints, unknown billing, option names and filenames.
- Edited-thumbnail regression reproduced before the fix (`edited-badge-before.txt`) and passed afterward (`wording-final.txt`). The original output and review were not modified.
- Both-brand saved-run replay: zero failed stages, zero paid calls (`saved-replays.txt`). These are recorded/mocked checks, not a new quality assessment.
- Read-only inspection of actual Duroflex and Sleepyhead saved projects: four intent explanations, concerns before scores, no old-studio links in the review, no internal option labels, no horizontal overflow, no writes. Screenshots and job references are in `live-check.json` and the two PNG files.
- Final focused smoke checks are in `final-smoke.txt`.

The entire repository suite was not rerun for this presentation-only pass. This report does not claim the application is free of unrelated pre-existing failures or that historical artwork is approved.
