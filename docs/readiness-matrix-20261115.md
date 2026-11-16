# Readiness matrix and brief-option fixes (15 Nov 2026)

Neha asked for every asset card of both brands to be tested "in all permutations and combinations" up to the point before paid planning, so the team testing the hosted Studio stops finding errors. No images or planning calls were made.

## The test

`scripts/creative-ai/qa-card-readiness-matrix.js --root <workspace copy>` builds drafts the way the brief page does (`StudioModel.startAssetDraft`, `selectBriefProduct`, the page's own select handler `applyStaticChange`, `confirmRequirements`, `validateBrief`) and sends them to the real `/creative-ai/api/studio/preflight` route of an in-process server. Its provider throws on any reasoning or image call.

| Mode | What it covers |
|---|---|
| default | every ready card × every saved product of both brands, rotating objective, message type and language |
| `--mode options` | every select the brief page shows for each card, each option once (and the options that appear after it), with one mattress and one other product per brand |
| `--mode campaign --count N` | N random 2–4 card campaigns per brand |

It was run on a clean checkout of `brand-data-20261113` (what the hosted Studio deploys) with the CDN media restored.

## Results

Before the fixes: 1,887 of 1,961 card × product combinations passed; 1,432 of 7,772 option combinations failed. After: 1,924 / 1,924, 6,748 / 6,760 (the 12 left correctly ask the person to attach a reference first) and 160 / 160 campaigns. Web Push Icon opens its own tool and is not a readiness card.

## Fixes (shared engine, both brands)

All in `public/creative-ai/studio-model.js`; the page's `staticChange` now calls `StudioModel.applyStaticChange`, so the matrix and tests run the page's own logic. Regression test: `tests/creative-ai/brief-option-changes-20261115.test.js`.

1. **Changing a retail Format kept the old format's size.** The page recorded the new value before applying it, so `applyRetailPreset` treated it as unchanged. Window → screen failed readiness; Window → Standee silently kept the 500 × 700 mm window poster size.
2. **Changing the unit did not convert the size.** 850 × 2000 mm became 850 × 2000 cm (a 20 m standee) and failed readiness. Width and height are now converted, and the page redraws them.
3. **Card-fixed choices were offered.** Google Display banners no longer show Platform (Instagram etc. broke the banner sizes); Category tile and Collection card no longer show Website asset (Banner broke them).
4. **WhatsApp image → RCS** had no RCS image shape until one was picked by hand; it now starts from "Single card · medium image".
5. **Landing page hero** now defaults "branded header" to Yes like Website Banner and Mobile Banner; "Current image only" failed readiness without it.
6. **Ready print and store cards no longer offer planning-only formats** (Dealer / Partner Toolkit, Store / City / Language Versions, GT / COCO Catalogue) in their Format list. The planning-only Catalogue card still lists them.

## Hosted Studio settings found during the run (not code)

- `CREATIVE_AI_MAX_ESTIMATED_USD` is not set on the hosted Studio, so each project's allowance is the $100 default instead of the approved ₹1,00,000 ($1,035.04). The 12-image PDP pack is refused at readiness for every product, and other large sets may stop partway.
- The hosted config reports `provider: google-vertex` with Gemini models. Nothing on GitHub selects Vertex for the Studio, so the hosted server runs changes that are not in this repository.

## Adding a product by URL failed for teammates (fixed)

Importing an official product URL works on the hosted Studio for an administrator: Duroflex and Sleepyhead imports took 1–37 s, including collection-style URLs and URLs with `?variant=`. The other three accounts are members, and `lib/admin/studio-access.js` lets members POST only to jobs, preflight, generate, validate-reference and placements/preview. So a member's product import, home brief box reading (`brief-read`) and web push icon tool (`notification-icons`) are refused with 403, which the product panel shows as "We couldn't save this product". Neha approved allowing those three brand-scoped routes for members (`MEMBER_BRAND_WRITES` in `lib/admin/studio-access.js`); each route keeps its own brand-name and official-URL checks. Brand settings, research, assets, training, costs and trackers stay administrator-only. Test: `tests/admin/studio-access.test.js` (fails on the old rule).

## SKUs added (15 Nov 2026)

At least five SKUs per category per brand where the website has them, imported with the product library's own capture from each brand's official site, pictures published to the CDN:

| Brand | Category | Added |
|---|---|---|
| Duroflex | Accessories (now 5) | Memory Foam Topper; All Weather Comforter – White & Grey; Flexi Lightweight Travel Friendly Slim Mattress (the site lists it under Accessories) |
| Sleepyhead | Mattresses (now 5) | Flip Dual Sided Foam Mattress; Prime Premium BodyIQ Orthopedic Memory Foam Mattress |
| Sleepyhead | Home Furnishings (now 5) | Memory Foam Topper; Reversible Microfiber Comforter; Headboard Cushion |

Duroflex already had 10 mattresses and 7 sofas; Sleepyhead 9 sofas. The matrix then passed 2,340 / 2,340 (52 cards × 45 products).

## Known, not changed

- After choosing RCS on a WhatsApp card the channel select is no longer shown, so the card cannot be switched back (existing behaviour).

## Live re-check (17 Nov 2026)

Neha reported the hosted Studio redeployed. Checked on the hosted Studio as an administrator:

- **The fixes are not deployed.** The hosted `studio-model.js` and `studio.js` are byte-identical to `b58122b`; GitHub `main` is still `b58122b` and `brand-data-20261113` still `122786d` (without the reference pictures). The brief-option fixes, member access and the 8 new SKUs are not live.
- **Sleepyhead cannot create anything.** Its current research (`creative-c7afc38d…`) is missing reference picture `dd62a382…bin`, so all 156 Sleepyhead card × product readiness checks fail with CA-404. Duroflex passed 153 of 156; the 3 left are the 12-image PDP pack, refused because the project allowance is still the $100 default.
- **No ₹ on the hosted Studio.** `output/cost-tracking/currency.json` is absent there, so the Spend page has no INR values, readiness shows "INR estimate unavailable" and AI edits show "Cost: not known yet".
- The hosted Studio now uses OpenAI (`gpt-6.1-sol` planning and checks, `gpt-image-2`), matching this repository.
- End to end on the hosted Studio worked: an Instagram post (via the API; flagged "check before using": the topper turn was not shown, and the product fingerprint wrongly expected white "DUROFLEX" lettering), a Website Banner through the home brief box (Ready, all checks passed, about 6 minutes) and one pinned AI edit (lamp removed, product check passed). Estimated cost ≈ ₹59 (₹96.6149/USD).
- **Admin dashboard fixed here:** every finished one-design lean job showed "Needs attention", 1 of 2 images and an incomplete set, because the dashboard read the intake's old two-route default instead of the job's pinned image options. `lib/admin/analytics-metrics.js` `jobRoutes`; test in `tests/admin/analytics.test.js` (fails before). Replaying saved jobs: 90 of 90 one-design lean jobs (20 Duroflex, 70 Sleepyhead) went from "attention" to their real check status; no other job changed.
