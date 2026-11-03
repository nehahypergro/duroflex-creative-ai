# Campaign document asset selection — 29 October 2026

Reported symptom: uploading `Duroflex_Airboost_Sample_Campaign_Brief.pdf` did not select its requested assets.

## Findings and changes

- A fresh live upload of the exact PDF extracted three asset types correctly: six-card Instagram carousel (1080 × 1350), Instagram Story (1080 × 1920), and email hero (1200 × 600), one set in Hindi. The PDF text itself is readable.
- A reproduced entry-flow defect retained a previous Home design choice in the hidden composer. Clicking **Create a campaign** inherited that output and marked it as a manual asset choice, preventing document autofill from replacing it. New Home design/campaign actions and the new-project campaign action now create fresh briefs. Previous drafts and composer recovery data remain intact.
- Reopening a document-only campaign did not schedule autofill when the typed text box was empty. It now checks the saved extracted text too, respecting manual fields and Undo.
- Several asset names in one extracted sentence were treated as an ambiguous single asset and skipped. Campaign import now separates supported asset mentions, retaining the dimensions/count belonging to each asset rather than splitting on every comma.

## Evidence

Failing-before regressions:
- `/tmp/campaign-lock-before.log`: previous design leaked into a new campaign (1 output instead of 0).
- `/tmp/campaign-reopen-before.log`: document-only campaign never filled its requested assets on reopening.
- `/tmp/campaign-assets-before.log`: both brand-neutral sentence fixtures returned no asset types instead of carousel, Story and email hero.

Passing-after:
- `campaign-document-assets.test.js`, `studio-document-autofill.test.js`, `studio-brief-autofill.test.js`, `studio-autofill-recovery.test.js`: 16 tests passed.
- `campaign-document-reopen-browser.test.js`, `studio-home-continue-browser.test.js`: 3 browser tests passed, each exercising both brands. Tests preserve explicit manual choices and verify reload continuity. Duroflex uses the exact PDF extraction; Sleepyhead uses a separate neutral synthetic brief.
- `npm run test:qa:both-brands`: saved five-stage handoffs for both brands passed, zero failed stages; mocked transport, no paid generation.
- Syntax checks passed for both edited JavaScript files.

Live Studio verification: uploaded the actual Duroflex sample, reopened it, checked all three selected checkboxes, and opened Review brief showing one set / eight images / Hindi and the exact SKU. No generation or confirmation was submitted.

Screenshot: `work/demo-readiness-20261029/campaign-assets-import-verified.png`.
Test draft: `draft-26f0f14f-6661-432b-a300-ce9e56110e03` in Duroflex.

The full offline suite was also run, with results in `/tmp/campaign-autofill-suite.log`. Broader UI checks retain pre-existing failures from the preceding Projects date-fix run; do not describe the full suite as passing. Manual asset selections in existing briefs remain protected; this fix does not silently replace a user's selections.
