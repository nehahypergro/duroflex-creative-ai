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

**Fix 3 turned off (Neha, 18 Nov 2026):** because 0 of 4 repairs worked, new jobs no longer pin `labelRepairVersion`. A misspelt product label is reported as before ("check before using") and costs nothing extra. The rule stays in `correction.js` for the local test jobs that already pinned it.

Cost of these paid runs ≈ ₹954 ($9.88 at ₹96.6149/USD, estimates from recorded usage); 1 request has no usage receipt yet and stays unknown, not zero.

## Live deploy check and the button arrow (18 Nov 2026)

The hosted Studio runs the latest `main`: its page files match `bff8cd9` byte for byte, and a new test project (Duroflex Instagram Post, Posture Perfect, `creative-3ab87877`) pinned `setRuleCheckVersion` and did not pin `labelRepairVersion`. The costs page still says INR conversion is unavailable (`currency.json` not added on the hosted Studio).

The test post finished with every check passed except one: the image model drew "→" after "Explore the mattress", and the composition rule banned every added arrow, so the post was "check before using". Neha decided a small arrow beside the button text is fine. New lean jobs pin `ctaArrowVersion: 1`: one small arrow or chevron right after the call-to-action words is part of the button; other added arrows, counters and marks still fail. Test: `cta-arrow-20261118.test.js` (both brands; 4 failing before, 4 passing after). Cost of the test post: about ₹17 recorded, about ₹33 still without a usage record (unknown).

## Admin dashboard tests (18 Nov 2026)

Six admin tests had been failing since the 3 and 9 Nov redesigns. Two were real dashboard bugs; four were tests still looking for old screens.

| Test | Cause | Fix |
|---|---|---|
| Stage filter (`operations.test.js`) | **Bug.** Since 9 Nov the Studio has a fifth project stage, "Check before using" (`check`). The dashboard knew only four, so those projects were missing from the stage filter and the summary ring | The stage filter, analytics filter, badge, summary ring and legend now include "Check before using" (`lib/admin/requests.js`, `lib/admin/operations.js`, `lib/admin/analytics-metrics.js`, `public/admin/*`). The summary ring also uses the Studio's own stage; before, it guessed from older fields and counted a finished set with flagged pictures as Ready |
| Phone width (`console.test.js`) | **Bug.** A later colour-theme rule set the sidebar to 212 px at every width, so on a phone the pages were squeezed into a narrow right column and scrolled sideways. It had been patched for the Creative feedback page only | The phone rule (≤800 px) now sets the sidebar to 0 for every page (`public/admin/style.css`) |
| Ready label (`client-readiness.test.js`) | The Studio says "Ready", not "Checks passed" (since 3 Nov) | Test updated |
| Overview title and operations panels (`console.test.js`, `operations.test.js`) | The overview title is now a live summary, and the operations panels sit in a collapsed "Operations" section | Tests open that section |
| Brief documents (`brief-documents.test.js`) | The language box is now `#field-language`; the message is built from Get / To / By; the brief saves itself with no Save button | Tests use the current fields and autosave |

All 91 admin tests pass after the fixes, and the 105 Studio tests that use dashboard code. The new stage and phone-width tests fail on the earlier code.

## Product picker empty on the hosted Studio (18 Nov 2026)

Neha: "why are the skus not visible when i click on product selection". On the hosted Studio the product picker said "No products match your search." with nothing listed.

| Cause | Fix | Test |
|---|---|---|
| The hosted copy keeps only the CDN receipt of each saved product photo (photos are not in Git). To mark each product "Ready to use", the product list downloaded one photo per product from the CDN, one product after another. The Duroflex list (27 products, 2.8 MB) took about 37 s; the browser gives up after 20 s, so the list never arrived | A photo with no local copy counts as readable when its CDN receipt has the saved photo's hash and size (the upload already checked those bytes); it is not downloaded just to list products. A local photo is still opened and checked. Products are read six at a time (`product-library.js` `catalog`) | `product-catalog-cdn-20261118.test.js` (both brands) |
| The browser waited 20 s for the product list | The product list may take up to 60 s (`studio-data.js` `products`) | — |
| The picker said "No products match your search." when the list had failed or was still loading, with no way to load it again | It now says "Products could not load. Your brief is saved." with Retry, "Loading products…" while waiting, and "No products saved yet…" for an empty library; a search with no match still says "No products match your search." (`studio.js` `productListMessage`, `retryProducts`) | `studio-product-picker-load-20261118-browser.test.js` (both brands) |

Both tests fail on the earlier code. The live site needs a redeploy to get the fix.

**Products ready after every deploy** (Neha: "can we ensure that skus are already populated? even when new redeployment happend"):

- The server builds each brand's product list when it starts (`http.js` `warmProducts`, `ProductLibrary.warm`) and keeps it in memory. It logs "Product lists ready: …".
- The kept list is rebuilt when a saved product is added, removed or changed (name, time and size of each `profile.json`), when this server saves a product, or after 10 minutes. Two requests at the same moment share one build, and each caller gets its own copy.
- When the picker opens after a failed list, it loads the list again by itself; Retry is offered only if that also fails.
- Tests: `product-catalog-cdn-20261118.test.js` and `studio-product-picker-load-20261118-browser.test.js` (both brands; 5 new tests fail before).

**Product list kept in the browser** (Neha: "cant it be in cache"):

- The browser keeps each brand's product list for 7 days, per signed-in account (`studio-data.js` `products`). A later visit, including the first one after a deploy, shows the kept list at once and asks the server for the fresh list in the background; the fresh list replaces the kept one (and the open picker) only if something changed.
- A kept list is used only if every product in it belongs to that brand. Adding or refreshing a product clears the kept copy, so the new product is never hidden.
- Product photos were already "available as images": the picker's thumbnail address sends the browser straight to the CDN copy, so the server does not download them. Since the fix above, the server no longer downloads photos to build the list either; it reads a saved photo only when a design needs it.
- Test: `studio-product-cache-20261118-browser.test.js` (both brands; the kept-list test fails before, the brand-isolation test guards it).

**Adding a product from its link** (Neha: "fix this smartly"): every photo, video and PDF on the product page was downloaded one after another. A real Duroflex mattress page (51 downloads, 7.3 MB) took 16.8 s on this computer; downloading six at a time takes 2.3 s with the same result (44 files saved, the same 5 unavailable). Same limits (160 files, 2 minutes, 320 MB, space set aside before each download starts) and the page order is kept (`product-library.js` `collect`). Test: `product-capture-parallel-20261118.test.js` (both brands; fails before).

**Why the hosted Studio felt slow** (measured 18 Nov 2026, one request at a time, before this redeploy):

| Request | Hosted | This computer |
|---|---|---|
| Product list (Duroflex, 27 products, 2.7 MB) | 5–8 s alone; about 37 s while the page loads its projects | about 0.4 s |
| Brands, assets, project list | 0.2–0.6 s | similar |

The product list was the slow part: it downloaded product photos from the CDN to check them. Brief reading builds the same list before it asks the model (`brief-reader.js`), so it waited for it too. Adding a product from a URL reads the brand's website, which takes as long as the website does. After the redeploy the list is built once at startup with no photo downloads.

## Opening the Studio and switching brands (18 Nov 2026)

Neha: "even switching between brands is slow". Measured on the hosted Studio (before the redeploy):

| What | Hosted |
|---|---|
| Duroflex projects | 61 projects, 183 requests (project, saved edits, design details), 4 at a time: about 9 s and 5.4 MB |
| Switching Duroflex → Sleepyhead (52 projects) | about 38 s until Home appeared; most of it was the product list fixed above |

Changes (`studio-data.js` `projects`, `studio.js` `loadBrand`):

- Newest projects load first, eight at a time (was four, in no set order).
- As soon as the newest 12 are ready they are shown; Projects says "Showing your newest 12 of N projects. The rest are loading…". Opening a project that has not loaded yet says "Loading your project", not "not available".
- Design details (rationale and scores) are no longer part of the list: they are fetched in the background after the list, three at a time, and a design's own page still loads them itself if missing. Opening the Studio now needs two requests per project instead of three.
- Home already appears once the product list arrives; with the kept product lists above that is almost at once.

Test: `studio-projects-progressive-20261118-browser.test.js` (both brands; fails before).

## Create opens the brief form (18 Nov 2026)

Neha: Create in the Home brief box "should go to the og form and not the brief appreciation - because they would still want to edit. and that feels like a random step".

- After the brief is read, Create opens the brief form (`#brief/<id>`) filled in from the reading: product and size, format, objective, language, message type, features, audience and offer fields (`studio.js` `readHomeBrief`).
- Each value read from the brief shows the green "From your brief" mark; values the reading chose show the amber "Suggested" mark (`studio-model.js` `draftFromReading` keeps `briefReading.sources`; `fieldProvenance` reads them). A value the marketer changes is labelled as their choice.
- The free local pattern autofill stays off for a read brief, so it cannot overwrite the reading and its Undo link does not appear.
- Nothing paid starts here: Check brief, the estimate and Create still come first. The read-back page still opens from saved links.
- **What the reading assumed** (Neha: "Yes, add them"): the brief form lists, under the brief, what the read-back page used to show: the objective or language the reading chose, the reading's own assumptions, "No phone number, store address or QR code", an offer start date of today, print sizes from the brief, open questions about the brief (each with Done), and a warning if the brief mentions another brand (`studio.js` `readingNotesView`, shared `readingAssumptions`). A value changed in the form is no longer listed as an assumption.
- Test: `studio-home-create-form-20261118-browser.test.js` (both brands; both tests fail before).

## No more "Coming soon" (18 Nov 2026)

Neha: "also remove all coming soon remarks".

- The 23 formats that cannot be made yet (for example YouTube Community Post, Hiring Post, Battlecard, Training Deck) are no longer listed in the format picker, its search or its group tabs. Every group still has at least one ready format; 54 formats are listed (53 ready, plus the planning-only Catalogue).
- A format chosen before this change still shows while it is selected, so it can be removed; it now carries the "Plan" badge, and saved planning briefs say "Plan · Saved as a planning brief" instead of "Coming soon".
- The brief reader already suggests only ready formats.
- Tests: `studio-asset-picker-browser.test.js`, `studio-checks-20261117.test.js` (both fail before). This replaces the 17 Nov "shown but disabled" behaviour.


## Live rerun test (19 Nov 2026)

Neha: "check now and rerun tests on the live site to see any flow errors, bugs, failures".

What was run on the hosted Studio after the 18 Nov redeploy:

- Free: every data endpoint for both brands; Check brief for all 52 ready formats × 2 products × both brands (208 of 208 passed); every saved project and design page (61 Duroflex, 55 Sleepyhead: no page errors, no broken images); the admin dashboard.
- Paid (about ₹177 known at ₹96.6149/USD, estimate; 9 calls with no usage record stay unknown): 7 reruns of formats that failed on 16–17 Nov. All 7 finished (the over-6 MB photo, Hindi headline, refused picture link and Landing Page Modules failures are gone); all came back "Check before using".

Bugs found and fixed:

- **Correction refused** ("Local repair requires product protection") on both Sleepyhead stories and the Sleepyhead homepage hero, plus 4 earlier live jobs: the diagnosis protected the product by its type ("Teal sofa") and only the word "product" was accepted once label repair was turned off. New lean jobs pin `productNameProtectionVersion: 1`. Test: `correction-product-name-20261119.test.js` (both brands; fails before).
- **Design page said "Artwork has not been created"** for a finished job opened by link or reload, because it used the browser's saved project list. It now fetches the latest project once. Test: `studio-design-stale-20261119-browser.test.js` (both brands; fails before).
- **No rupee estimates or costs on the hosted Studio**: `output/cost-tracking/currency.json` was ignored by Git. It is now tracked. Test: `currency-file-tracked-20261119.test.js` (fails before). If the hosted deployment does not build from the repository files, the team must copy this file to the server's `output/cost-tracking/`.

Found, not code in this repository:

- The hosted database (`34.93.180.5:27017`) refused connections for about 3 minutes (20:08–20:11 UTC); every page request failed with `ECONNREFUSED`, jobs kept running. The team should check that machine.
- Slow steps: planning sometimes over 4 minutes (the backup model took over, as designed); each image check took 4–6 minutes; the admin analytics request took about 23 s.
- Not yet confirmed: all three Landing Page Modules also failed `set-rules`; this may need the same whole-set handling as product-page sets.
