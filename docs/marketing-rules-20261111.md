# Marketing rules v1 (11 Nov 2026)

## Why

The marketing-manager review of the 52-card Sleepyhead Sofa Drip Pro batch (`work/marketing-review-sofa-drip-pro-20261111.md`) scored the set 6/10: accurate and polished, but "one ad repeated 52 times". The user chose fixes 2, 3, 5, 6, 7 and 8, and decided to leave the word "conditional" out of warranty wording.

New lean jobs pin `marketingRulesVersion: 1` (`lib/creative-ai/lean/marketing-rules.js`). Earlier jobs keep their saved contracts.

## What changes

| # | Fix | How it works | Where it is checked |
|---|---|---|---|
| 2 | Fresh headlines across a product's campaign | Each planning unit reads this brand's recent headlines for the same product (last 30 days, at most 40, newest first) from `brands/<brandId>/campaign-headlines.json`. It saves the list once per unit (`lean-campaign-headlines-<key>.json`) so a resumed plan sees the same list. Opening words used twice or more (at most 6) are listed as overused. Headlines are appended after a plan is saved. The file is brand-scoped and never read for another brand. | Plan check: an exact repeat or an overused opening word fails; the planner's bounded repair rewrites it |
| 3 | Short product name in ad copy | "Sofa Drip Pro - 3 Seater Sofa (Fabric, Coco Brown)" becomes "Sofa Drip Pro" (text before " - ", "\|" or ":", without brackets). A one-word remainder ("Original - …") keeps the full name. The full catalogue name stays allowed on marketplace, product-page, A+ and close-reading pages. | Plan check: the full name, or the name without its bracket, on an ad page fails |
| 5 | Features shown working | `feature-demonstration` rule: when a page's message is a physical feature, the picture shows it at work or in close-up (cushion lifted or used as an arm pillow, hand pressing the seat). Inner layers only through the official technology picture, never an invented cutaway. | Image brief and the image check (`placement-feature-demonstration`, layout: not auto-corrected) |
| 6a | Story safe zones | `story-safe-zone` rule on story pages: keep words, logo and button out of the top 14% and bottom 20%. | Image brief; measured by the local text reader (`story-safe-zone`, layout: not auto-corrected). Not judged by eye. |
| 6b | Bigger text for wide web images and distance print | Wide desktop website images: 14 CSS px (fine print 11) at a 1280 px view. Distance and at-shelf print: read from about trim height ÷ 700 mm metres (0.6–4 m); 10 mm per metre (fine print 4 mm per metre). A 2 m standee: about 2.9 m, 37 px on its 1093 × 2560 canvas. | Planner and image brief get the minimum; the existing measured `text-size` check uses it |
| 7 | Free spelling check | The local text reader's lines are matched to the planned lines. A word one edit away from its planned word is reported when it is a clear typo: an extra or missing letter inside the word ("cusshion"), two swapped neighbours, or on text 24 px or taller an unmistakable wrong letter. Letter shapes the reader confuses (f/t, I/l, G/O, C/O and others) and different endings ("zone"/"zoned") are not reported. | Measured `copy-spelling` check; blocks Ready and goes to the single correction |
| 8 | Warranty wording | "3-year conditional warranty" is written "3-year warranty". The copy rule says so, the source-acceptance rule carries the decision, and the plan check removes "conditional" before "warranty" deterministically. | Plan check (rewrite) |

The copy rule (`campaign-copy-v1`) is planning-only: it shapes the plan and does not reach the image brief or the image check.

## Replay on saved images (no paid calls)

The spelling and story checks ran over 263 saved images from both brands (153 Sleepyhead, 110 Duroflex, jobs since 6 Nov 2026).

- **Spelling:** a first draft flagged 11 lines, 10 of them the reader's misreadings ("Sota" for "Sofa", "BodylQ", "MAOIC" on a small physical label) or a different ending. After the confusable-letter and ending rules, it flags exactly 1: "Removable back cusshion" on the Instagram Feed Ad (job 2b7c10ca), which had been marked Ready.
- **Story zone:** most saved stories place the logo or headline in the top 14% (both brands), as the review found.

## Not done

- People in scenes and a campaign-level creative mix (review idea 1) and the price/offer prompt (idea 4) were not chosen.
- Headline history starts empty: older jobs were not back-filled.
- The OCR-based checks need macOS (Apple Vision); elsewhere they report nothing rather than passing.

Tests: `tests/creative-ai/marketing-rules.test.js` (both brands).
