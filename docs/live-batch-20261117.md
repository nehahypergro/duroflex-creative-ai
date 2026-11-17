# Live test batch: every asset card on the hosted Studio (17 Nov 2026)

Neha asked for every asset card to be made on the hosted Studio, with a new SKU each time, to find bugs and failures while creating assets. The hosted Studio had not yet been redeployed from `main` (it served `b58122b`), so:

- **Duroflex** ran: 52 ready cards, plus one re-run of Display banners with another sofa, 3 projects at a time.
- **Sleepyhead** waits for the redeploy, because its current research picture is missing on the hosted Studio and every Sleepyhead readiness check fails with CA-404.

The design engine on the hosted Studio is the same code as `main` (only brand data, the brief page and the admin dashboard changed after `b58122b`), so engine findings apply to `main`.

## Duroflex results

| Outcome | Projects |
|---|---|
| Asked (52 cards + 1 re-run) | 53 |
| Designs made | 45 projects, 83 images |
| Every image Ready | 15 projects |
| Some images Ready | 8 projects |
| Made, none Ready ("check before using") | 22 projects |
| Failed | 6 |
| Stopped for a question | 1 (Cresendo colour, see below) |
| Refused before starting | 1 (12-image PDP pack, $100 allowance) |

39 of 83 images were Ready. Estimated cost ≈ ₹1,973 ($20.42 at ₹96.6149/USD, estimates from recorded usage); 8 requests have no usage receipt yet and stay unknown, not zero.

## Bugs found and fixed (shared engine, both brands, each with a failing-before test)

| # | Symptom on the hosted Studio | Fix | Test |
|---|---|---|---|
| 1 | "10-year warranty" flagged for missing "conditional" (Prana post, WhatsApp image, brochure); the false flag also stopped the correction of a real label typo ("naturallying") | New jobs pin `warrantyCheckVersion: 1`: the check gets the 11 Nov warranty decision and the plain warranty fact | `warranty-check-20261117.test.js` |
| 2 | Hindi Facebook story ad failed planning: a 5-word headline counted as 9 words | Word splitting keeps Indian-script vowel signs and nukta (`\p{M}`) in channel craft, marketing rules and the checklist | `indic-word-count-20261117.test.js` |
| 3 | Memory Foam Topper failed twice: "Images must be embedded PNG/JPEG data URLs under 6MB" | A product photo whose 1600 px PNG evidence is over the dossier limit is drawn at 1280/1024/800 px; photos that fitted keep their bytes | `sku-evidence-size-20261117.test.js` |
| 4 | Every Airboost 6.8 design flagged "DUROFLEX is red, not white": the hosted Studio's saved product reading is wrong | New jobs pin `featureEvidenceVersion: 1`: when the official photos contradict the saved reading, the check follows the photos | `live-batch-fixes-20261117.test.js` |
| 5 | Tatva homepage hero failed after every repair: "Product identity citation does not support copy" | The error now names the unsupported words, so the planner's repair can fix them; the rule is unchanged | same |
| 6 | Prana landing page modules: `REFERENCE_SOURCE_CHANGED` (never seen locally) | A damaged hash-named staging copy is replaced with the correct bytes and re-read | same |
| 7 | Admin dashboard: every finished one-design job "Needs attention", 1 of 2 images | Count each lean job's pinned image options (committed earlier, `909a1c8`) | `tests/admin/analytics.test.js` |
| 8 | Display banners (Cocoon) failed planning: "Missing brand requirement/preference decision: strategy-as-intent" (the planner skipped its note for one Duroflex brand-guide requirement) | User decision (17 Nov 2026): new jobs pin `brandRuleNoteVersion: 1`; a skipped brand-rule note is filled as "apply" with a reason saying so, and the rule still reaches the image brief and the check. A mandatory rule written as "not-applicable" still fails. The 4 older local jobs with this error had skipped Studio process or format rules, which are filled since 10 Nov | `brand-rule-note-20261117.test.js` |

Related engine tests: 674 run, 667 pass; the 7 failures are the same tests that fail on the unchanged code. For fix 8 the whole `tests/creative-ai` folder (2,795 tests, browser tests excluded) fails the same 38 tests with and without the change; one more failed once under parallel load and passes 3 of 3 alone, with and without the change.

## Worked as designed

- An Instagram carousel slide stopped at "Reference upload could not finish"; **Continue this project** made it (recovery path tested).
- Queued OpenAI calls were cancelled and re-sent directly after about 90 s.
- Layout problems (product cut at the edge, story words in the covered bands, logo outside the square preview) were caught and, by design, not auto-corrected.

## Still open (needs the team or a later decision)

- **Label often unreadable**: label-wording `unable_to_verify` kept about 10 otherwise clean designs out of Ready.
- **Story formats**: 3 of 4 stories put words or the logo in the covered top 14% / bottom 20%.
- **Cresendo 3 Seater (Golden Orange)**: the Duroflex website page names Golden Orange in the title and "Black forest" in the specification; the Studio asks which is right. The website page needs correcting.

## For the team (hosted Studio)

1. Redeploy from `main`, then run `npm run media:restore -- --apply --destination .`.
2. Set `CREATIVE_AI_MAX_ESTIMATED_USD=1035.037038` (the 12-image PDP pack is refused at $100).
3. Copy `output/cost-tracking/currency.json` to the server (no INR anywhere without it).
4. Delete the hosted Studio's saved Airboost 6.8 product reading in `output/creative-ai/brands/<Duroflex id>/product-fingerprints/` (fix 4 only applies to new jobs; a fresh reading is better still).
5. Check the storage behind `output/` supports hard links and consistent reads (fix 6 repairs the symptom).

Then the Sleepyhead half of this batch can run.

## Sleepyhead run (started 17 Nov 2026, after the redeploy)

The hosted Studio was redeployed from `main` (page files, admin dashboard, $1,035.04 allowance and Sleepyhead readiness confirmed; `currency.json` still missing). New jobs pin `brandRuleNoteVersion`, `warrantyCheckVersion` and `featureEvidenceVersion`; models are `gpt-6.1-sol` (planning, checks) and `gpt-image-2` (images).

Bugs found in the first projects and fixed (shared engine, both brands; `tests/creative-ai/live-batch-sleepyhead-20261117.test.js`, failing before):

| # | Symptom | Fix |
|---|---|---|
| 9 | Memory Foam Topper Facebook story: "Images must be embedded PNG/JPEG data URLs under 6MB" again. The protected SKU picture (`product-identity.js`) is the full website photo as PNG; a 3000 x 3000 photo is over the research limit. Fix 3 covered only the product-page copies. | A new protected picture that would exceed the limit is drawn at 2048/1600/1280/1024 px (pictures that fit keep their bytes); an oversized saved website identity is not reused, and a fitted one is saved beside it (the old one is kept). |
| 10 | Sofa Bubbles Instagram story: "Get ultra-plush seating with Sofa Bubbles" (six words) counted as seven. | A hyphenated or apostrophe word counts once in the story headline count. |
| 11 | Napster Mini Mattress Instagram carousel: "Meet the Napster Mini Mattress" failed on "meet" and "the" after every repair. | Product-name lines may use grammar words (the, a, with, your, …) and a leading Meet / Introducing / Presenting; claim words still need a cited fact. |

**Typeface notes (user decision, 17 Nov 2026).** Every Sleepyhead design came back `brand-req-typeface: unable_to_verify`: Sleepyhead's guide names Migrena Grotesque / Source Sans Pro and a checker cannot name a font from a picture. New lean jobs pin `typefaceNoteVersion: 1`: that answer on a brand typeface rule becomes a listed "Font note" (`visualReview.typefaceNotes`) and no longer withholds full checking; a visibly wrong font (`clear_mismatch`) still blocks. Replay of saved local designs (read only): Sleepyhead fully checked 18 → 87 of 158; Duroflex unchanged (13 of 32; it has no typeface rule). Test: `tests/creative-ai/typeface-note-20261117.test.js` (failing before).

**Team projects, view only (user decision, 17 Nov 2026).** Members now see every project on the home page, with "By <name>" on a teammate's card, and can open and download it; a teammate's project page says "Made by <name> · view only". Any change to someone else's project returns 403 ("Only the person who started this project can change it. You can still view and download it."). Admins keep full access; internal test work stays hidden from members. The change buttons are still shown on a teammate's project and are refused when clicked.

**Stuck projects after a server instance is replaced (17 Nov 2026).** At about 11:40 three projects stopped mid-step and stayed "running" (Continue: "already active") until the hosted Studio restarted at about 12:45; two projects running at that restart then stuck the same way. Their lock owner was on another server instance ("foreign"), which was never presumed dead, and clean-up ran only at start-up. Fix: lock holders refresh a heartbeat every 30 s; a foreign owner silent for 10 minutes has ended; a reconciliation pass every 2 minutes interrupts such jobs on runner-lock evidence only (no provider call, nothing resubmitted). Test: `tests/creative-ai/silent-owner-20261117.test.js` (failing before). The same run caught that view-only access let members list a teammate's share links; share-link management is owner-only again.

## Studio checks Neha asked for (17 Nov 2026, hosted Studio)

| Check | Result |
|---|---|
| Add a product from its official URL | Works for both brands through the product library's "Add a product": Sleepyhead Luna 3-Zone Pocket Spring (19 s; 12 variants with SKUs, 14 pictures, 3 features) and Duroflex Balance Orthopedic Memory Foam (37 variants, 38 of 43 pictures, 5 features). Both default to Queen 72 x 60 and pass all 7 readiness checks. |
| Home brief box autofill | 5 briefs read correctly: product, formats, Hindi, offer wording and terms word for word, A4 poster preset, Queen default, and an unclear brief left the product empty and asked. Undated "1 Nov to 10 Nov" leaves the reader's dates empty and asks the year; the read-back page then assumes the offer starts today, labelled as an assumption (existing design, not changed). |
| RTBs when a product is chosen | 44 of 46 products show RTBs. Both Duroflex Airboost mattresses showed none: their pages have no Features list, only a "Why airboost?" section of short headings. **Fixed:** `product-feature-list.js` v2 reads those headings word for word when no Features list exists, and a product saved with no features is re-read from its hash-checked saved page (`product-library.js`). Replay: only Airboost 6.8 changes (3 features); every other saved product keeps its list. |
| Shown vs downloaded image size | 58 of 58 saved designs match their format's pixels, and 12 of 12 card downloads (social, blog, infographic, print: A3 poster, A4 brochure, price board, wall graphic, counter card, shelf wobbler) matched exactly. **Google Display banners:** Download gave the original PNG, and 3 of 6 were over Google's 150 KB limit (199, 256, 354 KB); the upload-ready files existed only in the campaign pack. **Fixed:** a banner's Download now returns the same upload-ready file (`GET /jobs/:id/display-banner/:placementId`, PNG if it fits, else JPEG at the same pixels, from the hash-checked saved image). |
| Coming soon cards not clickable | They could be clicked and chosen (saved as planning briefs). **Fixed:** shown but disabled in the picker; one chosen earlier can still be removed. |

Tests (failing before): `tests/creative-ai/product-feature-list.test.js` (new cases), `tests/creative-ai/studio-checks-20261117.test.js`.

**Local reproduction (17 Nov 2026, about ₹64):** both failing Sleepyhead projects worked on this computer (homepage hero made a design; LinkedIn post Ready and fully checked).

- **Homepage hero, OpenAI 400 "url" (fixed):** the hosted Studio sends reasoning pictures as CDN links. When OpenAI refused one, the inline resend was skipped if the call had already used its one extra try (for example a call-limit replacement), and on Continue the replayed failure was judged "already inline" before any link was prepared, so the project failed again within seconds without a new request. Now a refused picture link is resent inline once per call whatever else happened (`reasoning-transport.js` `corrected`, `provider.js` `inlineResent`), keeping a backup model; a correction after another recovery uses its own request key (`inlineRetry`). A refused request records a fixed reason category (`url-download-timeout`, `url-download-failed`, `invalid-image`), never the provider message. Test: `tests/creative-ai/picture-link-correction-20261117.test.js` (failing before).
- **LinkedIn post, answer cut off at the output limit (not changed):** a one-off on the hosted Studio (first answer and its shorter retry both too long). Continue replayed the saved cut-off answers by design, so it could not recover. **User decision (17 Nov 2026):** new lean jobs pin `outputLimitRetryVersion: 1`; after an explicit Continue, a planning step whose saved answers were cut off is asked once more with the largest answer length (`provider.js`, fixed request key per planning step, so a later Continue replays it). Other failures and stages are unchanged. Test: `tests/creative-ai/output-limit-continue-20261117.test.js` (failing before).
