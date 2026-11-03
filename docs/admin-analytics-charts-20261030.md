# Admin analytics charts — 30 October 2026

Added to the existing authenticated admin analytics surface, using its existing filtered snapshot. No provider, generation, queue, account-permission or runtime configuration changes; no new dependencies or server restart.

## Visuals

- Group performance: request count, needs-attention rate, median complete-set time, and known INR per automated pass. Uses the selected asset/brand/product/user/status grouping. Top five shown first; every group is available via expansion. Clicking a group filters the entire snapshot.
- Saved-image outcome composition: automated passes, revision findings and unverified image units. The denominator is all saved image units, distinct from the automated pass-rate denominator and from human approval.
- Failure patterns: ranked by affected-request count, with no-output counts and selected-cohort share. Click to filter. Overlapping patterns are explicitly non-additive.
- Stage timing: paired median/p90 bars on one zero-based scale with per-stage sample counts and journal coverage. Stages can overlap, so durations cannot be summed.
- Attributed creator request volumes: historical/system work is excluded, with an honest empty state when no creator activity exists.
- Inactive brief first-missing-detail bars alongside the existing milestone tables and their separate cohort definition.
- Existing daily trend, detailed evidence tables, saved views and snapshot exports retained.

All chart data is computed by existing analytics/tracking aggregation. No new metrics or source-history rewrites. Cost ratios remain lower bounds and show unknown-charge and unmatched-project counts. Missing ratios are not charted as zero. Tables and JSON/CSV exports retain the exact evidence; the existing printable report remains its existing presentation, not a screenshot of the chart grid.

## Interaction correction

Adding status-group drilldown exposed a pre-existing path writing to `filters.elements.status`, which no longer exists after the four-stage filter redesign. Both chart and table drilldowns now use the analytics API's supported exact-status filter. The active status is shown in the chart, and Reset slice clears it. The new browser check exercises this path.

## Validation

- `node --check public/admin/analytics.js`
- `node --test tests/admin/analytics.test.js`: 13 passed.
- `node --test tests/admin/console.test.js tests/admin/operations.test.js`: 26 passed.
- New browser coverage reconciles outcome counts and stacked widths against the API snapshot, switches all four chart measures, checks unavailable cost ratios, drills down by brand and status and failure, verifies the exported snapshot filter, exercises an empty date range, confirms request source hashes stay unchanged, and checks chart/document overflow at 1440, 1063, 768 and 390 pixels.
- Existing role/access, saved views, reports, issue reports and operations checks pass.
- Live authenticated admin inspected visually, including real stage timing, failure patterns, quality composition, and cost estimates with unknowns.

Evidence: `work/admin-charts-20261030/overview.png` and `failures-and-speed.png`. Test logs: `/tmp/admin-charts-final.log`, `/tmp/admin-charts-metrics.log`.
