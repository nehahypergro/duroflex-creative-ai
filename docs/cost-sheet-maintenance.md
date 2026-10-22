# Cost tracking and Sheet maintenance

The private cost tracker covers Duroflex, Sleepyhead and shared system costs.
Its observed spreadsheet and managed tab IDs are in
`output/cost-tracking/sheet-sync.json`. Do not create a replacement Sheet.

## Sources and coverage

- Saved job budgets capture provider usage. Manual expenses are in
  `output/cost-tracking/manual.json`.
- `history.json` preserves previously observed entries, including 874 records
  recovered from the existing Sheet on 20 October 2026. Their estimates and
  provenance are retained; they are not provider invoices.
- Current receipts override archived entries with the same identity. Resolved
  requests are removed from historical unknowns. Archived costs survive missing
  job folders. History is refreshed when preparing each Sheet sync.
- Primary display is INR. Preserve original USD amounts in the audit columns,
  exact original INR expenses, and the dated conversion in `currency.json`.
- Estimates exclude unmetered Codex/developer compute, subscriptions, hosting,
  taxes, credits and external expenses unless separately recorded.
- Unknown charges remain unknown. Do not add an invoice on top of estimates for
  the same calls; invoice reconciliation is not automated.

## Hourly refresh

The app heartbeat `maintain-creative-ai-cost-sheet` refreshes this Sheet hourly
while Codex, this computer and the Drive connection are available. Successful or
unchanged runs stay quiet.

1. Read native Sheet metadata and confirm all four observed tab IDs/titles.
2. Run `node scripts/costs/sheet-sync.js` from the project root.
   It saves history, a local snapshot, structured requests and expected totals.
3. If `changed` is false, no remote write is required.
4. Check the existing Sheet's row count/history before writing. If its ledger
   contains identities missing from the local merged history, stop and reconcile.
5. Apply `work/sheet-sync-request.json` with the Google Drive batch update tool.
   Never interpolate JSON into shell commands without proper shell quoting.
   The request file may exceed tool-output limits: read request chunks of at
   most ten ledger rows, assemble them in memory, then send one structured batch.
   Preserve the order: resize, clear managed values, write, format.
6. Read effective values from `Summary!F12`, `Summary!B33:B34`:
   these are the INR total, actual ledger row count and actual unknown count.
   Also inspect the last ledger row and relevant currency headers/formatting.
7. Compare those observed values to `work/sheet-sync-pending.json`. Save
   `work/sheet-sync-verified.json` containing the pending `fingerprint` and
   **observed** `knownInr`, `entries`, `unknown`.
8. Only after success run `node scripts/costs/sheet-sync.js mark`.
   Mismatches refuse the completion marker. Preserve failure evidence and alert.

Only Summary, Ledger, Rates and Coverage are managed. Keep existing permissions.
This maintenance performs no creative generation or production model calls.

## Regression verification

`node --test tests/creative-ai/cost-history.test.js tests/creative-ai/cost-tracker.test.js`

The suite checks both brand identities, archive retention, duplicate receipts,
resolved requests, exact original INR amounts, unknowns, rectangular API requests,
and verified completion. On 20 October 2026: 14 checks passed; the Sheet readback
matched 1,293 entries, 13 unknown amounts and ₹7,991.088630109154 in estimates.
