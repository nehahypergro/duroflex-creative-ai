# Paid editor changes in costs and Admin — 3 November 2026

Paid editor calls retain their original provider receipts in the existing child job stores. Central cost scanning already included `canvas-ai` and `editor-chat-ai`; the missing pieces were admin attribution of chat children and dashboard freshness/action labels.

## Recorded and displayed

- Operation labels distinguish chat copy/image/mixed edits, copy rewriting, translation, background regeneration and background expansion.
- Records retain provider model, token usage when supplied, source family/child ID, parent project, brand, route/placement, source revision/version and recorded outcome.
- Existing provider identity deduplication remains in use. Polling/retries do not create extra charges for the same receipt. New editor chat children explicitly retain their parent ID; existing children are resolved from their saved, brand-matching parent directory.
- Failed and discarded paid proposals keep their usage costs. Reserved requests without a receipt remain potentially billable and unknown. No actual invoice amount is invented from usage estimates. INR estimates use the existing saved rates and dated FX; this change does not update pricing or exchange rates.
- Local controls, local exact-text proposals, guide/grid edits, icon insertion and local layout suggestions do not dispatch a model and do not create provider-cost records.

The Studio Usage page and full cost ledger display the operation; the full ledger can search by action and parent project. Admin **Usage & costs → Editor AI changes** shows action/project, owner/brand, model/outcome, estimated INR and actual INR when known. Brand/user/project filters include validated child costs under the parent request. Analytics joins the same lineage for project cost metrics. Conflicting brand allocations remain unassigned/shared rather than being charged to a single owner.

Admin now reads current saved provider receipts on refresh, merging preserved historical snapshot entries without overwriting the snapshot. A later matching receipt clears an old unresolved marker. Existing recorded actual amounts are preserved. Concurrent dashboard requests share an in-flight read; no provider or generation worker is invoked. Read/coverage warnings remain visible.

## Regression evidence

`tests/creative-ai/editor-cost-attribution.test.js` initially failed on missing parent attribution and the saved-snapshot-only admin path. It now covers both brands, operation labels, failed/discarded usage, unresolved requests, local edits, repeated scans, owner/brand filtering, new receipts appearing without a snapshot write, preserved historical actuals, resolution of older unknowns, and the actual admin usage renderer (including escaped titles and INR/unknown states).

Existing cost tracker/history, analytics metrics, product tracking and mocked editor AI regressions are also run. All development data lives in temporary fixtures. No paid model call, live restart, production snapshot rewrite or Google Sheet update is performed by this task. The updated backend needs the next safe restart after active generation work finishes.
