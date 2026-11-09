# Planner model comparison (8 November 2026)

A small, user-approved paid test: should **gemini-4-argon** (Google Vertex) or **gpt-6-luna** be the backup for the main Studio lean planner (**gpt-6.1-sol**, high)? The production engine does not import this folder.

## What it does

- Replays 8 saved lean planning packets (`output/creative-ai/jobs/<id>/lean-input-<key>.json`) from finished main-Studio jobs, 4 Duroflex and 4 Sleepyhead. The list is `PACKETS` in `run.js`.
- Sends the same request as `lib/creative-ai/runtime/lean-workflow.js`: planner instructions plus the format principle, the saved packet input, the exact SKU photos saved in the job's planning record, `planning.schemaFor`, `planning.validatePlan` and a strict schema. It uses the real provider classes: `OpenAIProvider` and `VertexPlanningProvider` (global endpoint). Only the `lean-planning` model changes.
- Allows at most two provider requests per run: the first try plus one repair. No fallback model. Requests go directly to the provider, with the photos sent inline, so both providers are timed the same way.
- **gpt-6.1-sol baseline:** the original job's saved receipts and first response are reused when they were made with the current planner code (on or after 2026-11-08 09:09 UTC). Older packets are re-run fresh, the same way as the other models.
- **Cost:** every paid call reserves and writes receipts through a `JobStore` record in `output/creative-ai/planner-experiments` (`intake.costPurpose: 'Testing'`, the packet's own brand). The shared ledger (`lib/cost-tracker.js`) scans this folder. Existing jobs are only read.
- Records are keyed by request key. Running the script again reuses finished or failed records and never pays twice.

## Run

```sh
node lib/creative-ai/experiments/planner-comparison/run.js --dry-run   # list the planned calls, no spend
node lib/creative-ai/experiments/planner-comparison/run.js --smoke     # one tiny paid Argon call
node lib/creative-ai/experiments/planner-comparison/run.js --only=S4   # one packet
node lib/creative-ai/experiments/planner-comparison/run.js             # all packets
node lib/creative-ai/experiments/planner-comparison/report.js          # write comparison.md
```

Vertex reads `GOOGLE_APPLICATION_CREDENTIALS` and `GOOGLE_CLOUD_PROJECT` from `.env`. The script stops if a single run costs more than ₹60 or the total passes ₹400.

Results are saved in `work/planner-comparison-20261108/`:

- `results.json`
- `comparison.md`
- `plans/<packet>-<model>.json`. A rejected final output is saved as `-rejected` for reading only.

Costs are USD list-price estimates at the receipt date. INR uses the dated rate in `output/cost-tracking/currency.json`. These are estimates, not invoices. Argon's list price doubles after 30 Nov 2026.
