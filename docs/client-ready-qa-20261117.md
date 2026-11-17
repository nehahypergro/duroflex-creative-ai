# Client-ready QA, v1 (17 Nov 2026)

Neha asked for an extensive test for code bugs, navigation, URLs, refresh, projects and editing before calling the Studio client-ready. Tested on a disposable copy of the local workspace running the latest `main` code (no login, real data copied, one paid AI edit ≈ ₹9), plus the automated suites.

## What was exercised

| Area | Checked | Result |
|---|---|---|
| Navigation | ~25 page types for both brands; unknown, mistyped and missing-project links; Back/Forward across brands | Works; unknown addresses fixed (2) |
| URLs and refresh | Reload on project, design, editor (also mid-edit and after "Use this version"), filtered/searched project lists, drafts; wrong-brand links | Works; wrong-brand links offer "Open in <brand>" |
| Projects | Search, filters, sort, rename, trash, restore (persist after reload), project menu keyboard | Works |
| Briefs | Format picker, empty-brief warnings, draft save/reload, product picker with mattress Queen default, estimate before paying | Works; "2 sets" wording fixed (4) |
| Editing | Real AI edit, refresh during the edit, version switch, download of the version in use | Works; download label fixed (1) |
| Downloads | 155 saved designs' files exist; downloads of CDN-hosted files | CDN cache issue fixed (3) |
| Brand isolation | Other brand's project/draft links, brand switch inside a project | Never shows the other brand's work |
| Phone width (375 px), keyboard (Escape), labels | Main pages | Fine (one minor issue below) |
| Failed-project recovery panel | "Continue anyway" wording and estimate | Fixed (5) |

## Bugs fixed (tests fail before, pass after)

1. **AI-edited download named "Original".** The edited picture was downloaded, but the file was `…_Original.png` and the message said "original generated image". Now `…_Edited.png` / "AI-edited version in use" (single download and selected-images ZIP). `canvas-model.js` `downloadName({edited})`, `studio.js`.
2. **Unknown address said "This project is not available in this brand".** Now "Page not found" with Home and Projects (`studio.js` `PROJECT_VIEWS`).
3. **Downloads could be blocked by the CDN's cache.** Some cached CDN copies lacked the cross-origin header, so a script download of a redirected file failed ("This image could not load"). Downloads try the normal link first and, only if it fails, request `?direct=1`; the server returns the local copy when it matches its hash, else reads the CDN copy itself and checks it (`cdn-media.redirect`). Page images still load from the CDN. Test: `cdn-media.test.js`.
4. **"2 sets" / "Two complete options" on the brief page** after the 8 Nov one-image-model decision (`studio-model.js` `creativeCount` back to 1). Display only; no extra images or charges. Fixed 8 previously failing tests.
5. **"Continue anyway" panel contradicted itself** ("no replacement will be submitted" above the button that submits one) and showed the reservation allowance as a typical cost. Now a clear message, and the estimate is the median of this project's earlier calls, or "up to" the allowance when there are none (`resume-work.js`).
6. **Browser test broken by the Coming soon change** (af591a8): it clicked a Coming soon card. Updated to check the card is disabled and to cover planning briefs with the Catalogue card.

7. **Teammate view-only blocked the Brand library "Retry"** (5f548db): the view-only check now applies only on project pages (project, review, download, versions, progress, editor).

## Browser tests

All 71 browser test files (183 tests, both brands, no paid calls) were run on the final code: 183 pass, 0 fail. Before today's fixes 34 failed (mostly the "2 sets" wording, the Coming soon picker change and a download that waited forever when the server could not reach the CDN; that last one was caused by the first version of fix 3 and is fixed by trying the normal link first).

## Automated tests cleaned up

The 38 engine tests that already failed were triaged: 8 were bug 4; 10 were out of date after documented decisions (fixed in the tests, each with a dated comment); 20 replay saved historical jobs that are not in this checkout (now skipped with the missing job named, and run unchanged where the data exists; helper `tests/creative-ai/helpers/saved-jobs.cjs`). Non-browser engine suite: 2,830 pass, 23 skipped, 1 timing-sensitive test that passes alone.

## Known, not fixed

- On a phone, Brand library → Products appears slightly zoomed out when a product with long size names is expanded (the size drop-down widens the table row). Nothing becomes unusable.
- The lean server-side brief text still mentions "two model-rendered options" (`studio-generation.js`, `conceptRoutes` for lean intakes). The planner uses the pinned single option; not changed without a planner test.
- The live site needs the redeploy for all of today's fixes.

## Big sets not getting Ready (18 Nov 2026)

Neha: "amazon marketplace or anything that is huge is not getting ready". Saved local big sets since 10 Nov all finished, but few pictures were fully checked (product page images: 0 of 24). The planning failures with no pictures date from 9–11 Nov and were fixed then; the live 17 Nov failures (product photo size, restarts, damaged staging copy, skipped brand-rule note) are fixed too. Paid local runs on the current code then found three more causes, all fixed in the shared engine with failing-before tests for both brands:

| # | Cause | Fix | Test |
|---|---|---|---|
| 1 | Product page images: three gallery-wide rules (`pdp-distinct-purpose`, `pdp-review-boundary`, `pdp-test-source-authority`) were judged on each picture and always came back "can't tell"; A+/PMax/carousel picture-job rules did the same for their whole-set parts | New jobs pin `setRuleCheckVersion: 1`: the gallery rules stay in planning only; picture-job rules ask only about this page's own job | `set-rules-20261118.test.js` |
| 2 | Amazon A+ failed in planning for any product whose official name is over 8 words (the wide-panel limit), and the repair then failed on a 227-character shared rule (limit 200) | The exact product name is exempt from the 8-word block limit and counts as at most 8 of the 24 words; shared rules may be 300 characters | `aplus-pages.test.js` |
| 3 | A misspelt label on the product ("PEEFCT") was never corrected: the diagnosis protected the product as "Visible mattress", only "product" was accepted, and a repair could not sit inside the product | New jobs pin `labelRepairVersion: 1`: product-type names count as product protection; a label-only repair may repaint a patch of 5% or less inside the product, with the official label close-up; the re-check still decides | `label-repair-20261118.test.js` (uses the model's real saved answers) |

Replay of saved product page images: fully checked 0 → 11 of 24 with fix 1, 18 of 24 with yesterday's font note too. Saved diagnoses from the run: 4 of 5 label repairs would now go ahead (the fifth mixed the label with other problems and still needs a whole new picture).

Paid local runs (current code before fixes 2 and 3 unless noted):

| Set | Pictures | Ready | Fully checked |
|---|---|---|---|
| Duroflex Marketplace images (Spine Contour Pillow) | 6 | 6 | 6 |
| Duroflex Product Page Images (Posture Perfect) | 12 | 7 | 7 (the 5 others: misspelt label, fix 3) |
| Sleepyhead Amazon A+ Premium (Original BodyIQ) | failed in planning (fix 2) | | |
| Same A+ page, with fix 2 | 14 | 13 | 11 (2 only "can't tell" on picture jobs, fix 1) |
| Same product page set, with fixes 1–3 | 12 | 7 | 7 |

The second product page run shows fix 3 working as a mechanism: 4 repairs ran (3 label patches, 1 whole-page redraw) where none ran before. None was accepted: each repaired picture damaged the label another way (doubled "DUROPEDIC", cut-off letters, a stray piping strip, the label still on the wrong side), and the re-check kept the original every time. Small printed product labels are a limit of the picture model; those pictures stay "check before using" with the reason. The attempts cost about ₹77 for the set (about ₹19 each).

Cost of these paid runs ≈ ₹954 ($9.88 at ₹96.6149/USD, estimates from recorded usage); 1 request has no usage receipt yet and stays unknown, not zero.
