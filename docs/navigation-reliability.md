# Studio navigation reliability — 23 October 2026

Shared fixes apply to Duroflex and Sleepyhead. No brand assets, historical artwork,
review verdicts or costs were changed by these fixes.

| Observed failure | Cause | Shared repair | Verification |
| --- | --- | --- | --- |
| Previous brand's projects remained clickable immediately after a switch | Brand state changed before asynchronous workspace-cache restoration, leaving the old DOM visible | Replace old controls with the selected brand's loading state before awaiting cache reads; retain existing epoch guards against late responses | Original navigation test failed with Duroflex text after selecting Sleepyhead. It now passes. Deliberately delayed cache reads tested in both directions. |
| Reload lost the list scroll position | A background refresh saved temporary scroll zero before the scheduled restoration frame | Track pending restoration by render epoch; ignore those temporary positions until the frame restores scroll | Original reload test timed out. Back, breadcrumb return, reload, filters and the highlighted card now pass for both brands. |
| Progress redirected to outputs despite a newer running/failed job | Cached completion was treated as authority before a fresh job read, including same-document hash navigation | Require a fresh status confirmation for each Progress visit; clear confirmation on brand/route changes. Show a status check while a cached completion is unconfirmed; retain offline/reconnect recovery | Original live-progress test timed out. Running-stage progression, pause/reconnect, failed status and direct completed-output navigation now pass for both brands. |
| Selected artwork disappeared on narrow screens | Two-column review grid retained a minimum-width rationale column, squeezing the artwork column to zero | Stack the review columns at 800px and below; wrap the artwork toolbar | Added stress test failed at a 390px viewport before the CSS fix. Visible artwork width and no horizontal overflow are now asserted at five viewport sizes. |

## Coverage

`tests/creative-ai/studio-ui-browser.test.js` now follows the current product UI:
automatic project naming, incomplete drafts excluded from Continue working, removed
home/help controls, brand-owned guideline book routes, and the curated format picker.
All 15 legacy static recipes remain exercised through the supported static-journey
catalogue where they no longer appear in the curated picker. Recovery assertions
remain in place for failed saves, stale tabs, failed assets and interrupted downloads.

- 60 recipe journeys: 15 static recipes × 2 brands × Quick Create/Campaign.
- 30 saved-art journeys: 15 static features × 2 brands, including exact option,
  editor dispatch and downloaded bytes.
- 20 repeated navigation cycles: 10 per brand, across 390, 850, 1280, 1440 and 1920px;
  project filters, reload, breadcrumb return, browser Back, library filters,
  tools/search/create/creative screens, selected review option and foreign-job rejection.
- Full offline suite (`npm test`): **971 passed, 0 failed, 0 cancelled**.
- Saved Duroflex and Sleepyhead handoff replays: zero failed stages, zero paid calls.
- Supplemental tests verify scroll restoration in both brands and fresh progress
  status before automatic navigation.

Logs: `work/navigation-fix-20261023/`. Before-fix evidence is in `before.log` and
`scroll-before.log`. Passing targeted checks are in `focused4.log`,
`layout-and-progress.log` and `both-brand-scroll.log`. Full-suite and replay logs are
`full-suite.log` and `both-brand-replay.log`.

Current synthetic browser matrices and mobile screenshots are written to
`work/studio-ui-regression/`, separate from earlier dated run evidence. The images
in those screenshots are fixture placeholders, not newly generated artwork.

These are browser and recorded-response checks. They do not establish PDP/A+/LinkedIn
artwork quality, ten live generation scenarios, publisher acceptance or completion
of missing delivery families. Regression coverage reduces recurrence risk; it is
not a guarantee against every future navigation change.
