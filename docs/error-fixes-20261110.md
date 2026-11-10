# Error fixes, new cards, references and names (10 Nov 2026)

These changes follow the user's list from 10 Nov 2026: "fix 4, 5, 6 (evaluate if text is most needed), 7, 8, 9, 10 (refer to Amazon guidelines), 11–20, 21 (build it), 22, 23", plus "make the Coming soon cards with a written strategy usable".

Every fix has a regression test that failed before the fix, for both brands. Earlier jobs keep their saved packets, verdicts and costs. New behaviour that changes planning, generation or review is pinned on new jobs.

## Coming soon cards made usable

Nine cards are now Ready. Each one reaches an existing Studio preset and its own format playbook.

| Card | Engine route | Size |
|---|---|---|
| Collection Card | `custom:studio-commerce-collection` | 1600×900 |
| Landing Page Modules | 3 coordinated images `custom:client-landing-module-01..03` (benefit, feature, call to action) | 1600×900 |
| Marketplace Product Images | 6 coordinated images: main image on pure white with no words (`custom:recipe-marketplace-main-01`, text policy none), alternate angle on white, lifestyle, surface detail, key benefit, technology | 1600×1600 |
| Listing Feature Cards | 3 coordinated cards `custom:recipe-listing-feature-01..03` | 1600×1600 |
| Email Product Block | `custom:client-email-image-1200x800` | 1200×800 |
| Blog / Link Preview | `custom:recipe-editorial-cover-1200x630` | 1200×630 |
| Infographic | `custom:studio-marketing-infographic` | 1080×1920 |
| Sales One-pager | `custom:studio-sales-one-pager` | 1240×1754 |
| Web Push Icon | Opens the existing push-icon tool | — |

Notes:
- **Co-branded Post** went back to Coming soon after a live run. The server requires a verified, attached partner logo, and the Studio has no way to upload one yet. The planner's guard against drawing a partner logo stays.
- **Multi-category Module and Catalogue** stay unavailable, because they need several products in one design.
- **Format playbook library** 1.5.0 adds the matching selectors.

## Fixes

**4. Picture IDs as citations.** A picture ID cited as a fact (`sku-product-image-2`) is dropped and recorded on the copy block (`droppedCitations`), instead of failing the plan. The planner is told to cite only fact, product or variant IDs.

**5. Repairs follow the backup model.** Once the pinned backup model has written a response, its repair goes directly to the same backup. The receipt says `fallback.reason: repair-follows-backup`. This is the user's decision and extends the one-call backup rule.

**6. PDP photo slots.** Product photo slots need no on-image words: product hero, alternate angle, surface detail and product in context. Information slots still need their copy. Measurement labels such as "Length" and "Width" are allowed beside the official size.

**7. Print brief ceiling.** Print formats get a 16,000-character image-brief ceiling. Digital formats keep 12,000.

**8 and 20. Physical realism.** New jobs pin `realismCheckVersion: 1`, which adds a `physical-realism` check to the existing review call, at no extra cost. It looks for:
- floating or sinking people and objects, and missing contact
- impossible anatomy
- duplicated or melted objects
- broken edges and seams
- wrong scale

The AI-edit check (contract version 2) also asks two new questions: `request-done` (was the request carried out on the named object, completely?) and `edit-damage` (did the edit break anything, including the realism items).

**9, 11, 14 and 15. Plan rules.** New jobs pin `planRulesVersion: 1` (`lean/plan-rules.js`), which adds one layout rule, `composition-layout`. It reaches the plan, the image brief and the review, and it is not sent to automatic correction. It covers:
- a margin around the whole product, logo, words and button (a deliberate close-up may crop)
- no added counters such as "01 / 05"
- on portrait carousels, the key content inside the centred square
- naming the product's visible construction (fix 13)

A planning check also rejects a headline that is repeated on two pages of a set. An A+ desktop/mobile pair counts as one page; banner sizes and PMax ratios are exempt.

**10. A+ technology labels.** Amazon asks for image text that is readable on a phone. On new jobs, technology images use at most three large labels and redraw the construction without its small printed labels. Every layer name goes into the module's Amazon text body.

**12. Label close-up.** The label finder ignores number-only text and refuses a "label" box larger than half the photo. A stray "134770" had stretched the Napster Mini close-up over the whole picture. New jobs also tell the image AI where the label sits on the reference photo.

**16–19. Editor areas.** Each pin's area is worked out at Send and saved as `areaBox` / `areaBasis`, with `areaVersion: 1`:
- **Wording comments** cover the whole text block found by the local text reader.
- **Add, replace or remove** uses at least the Large square.
- **Otherwise** the area is the chosen square.
- If the adapted areas are too large together, the editor falls back to the squares.

`POST /api/jobs/:id/ai-edits/areas` previews the areas for free, and the editor draws them before Send.

A request that changes the product itself returns `PRODUCT_CHANGE_CONFIRM`. The editor then shows **Send anyway**, and the edit records `productChangeConfirmed`. Brand names and logo requests are not treated as product changes.

**21. Attach a reference (creative reference v1).** In the brief, a reference picture can be marked:
- Copy its layout
- Match its look
- Use its idea
- Layout and look
- Layout, look and idea

How the picture is handled:
- The picture stays on the device.
- At readiness and creation it is added to the brief, shrunk to a JPEG of at most 1536 px.
- The server re-encodes it and stores it once at `brands/<brandId>/creative-references/<sha256>.jpg`.
- The job pins `creativeReferenceVersion: 1` and `{name, use, sha256}`.

One luna-medium call (`lean-reference`) describes the picture's layout, look and idea in words. It lists any brand names, logos, products, people or words in it under "avoid". The picture is sent inline, never through the CDN.

Planning gets only the chosen aspects, as the `creative-reference` rule. The image model never receives the picture, and the review flags anything from the "avoid" list.

Brand isolation accepts the picture only for the reference step and only when its hash matches the job.

**22. Project names.** Automatic names read **Product · Format · Goal · date**, for example "Posture Perfect · Amazon A+ Content · Purchase · 10 Nov". A repeat reads "· try 2". The brief focus is no longer guessed into names. Typed and renamed names still win, and saved names are unchanged.

**23. Brief panel.** The panel beside the design shows:
- the one-line ask from the brief reading
- tags (goal, language, size, offer)
- "This image" (format and size)
- "Did it deliver?" ticks from this image's own review: words, product, label, logo, looks real, layout
- the full brief behind "Show full brief"

New results save a compact per-check list (`visualReview.checks`) to support the ticks.

**Restart.** `kill -TERM` hung while a Studio tab was open, because a keep-alive connection blocked `server.close()`. Shutdown now closes idle connections at once and all remaining connections after 3 seconds.

## Not done here

- Live paid runs of the new cards and fixes are run one at a time after this change and reported separately.
- The PDP planner can still skip some placement-rule decisions on 12-page plans. The bounded repair reports these.

## Fixes found by the live tests (10 Nov 2026, run one at a time)

Each fix has a regression test, mostly replays of the saved failing run.

**Coordinated sets.** Sets now send their per-image inputs with the request (`studio-generation.assetSetRequest`), so a set is planned once. The first Marketplace run had planned all six images separately and lost the white-background rule. Lifestyle and detail pages use text policy `optional` and may carry no words.

**Process and format rule notes.** If the planner skips the written decision for a Studio process rule or a format/placement rule, the note is filled in as "Applied automatically…", using schema fields only. This caused failures on the blog, PDP and Marketplace runs. Brand requirements, preferences and the objective playbook still need the planner's own decision. `pdp-original-website-technology` may be "adapt", because the rule states its own alternative.

**Image-brief ceilings.**

| Format | Ceiling |
|---|---|
| Single formats | 14,000 characters |
| Print, close-reading documents (one-pagers, infographics) and multi-page sets | 16,000 characters |

The review checklist ceiling is now 30,000. Its "sizes are approximate" note goes only on rules that state sizes or positions; on a 12-image PDP it had been added to every rule.

**Review wording.**
- On a page that deliberately has no logo, brand logo rules judge only a logo that appears.
- Label size is judged only against the part of the product that is shown, since close-ups are not defects.

**Technology picture text.** On plan-rules jobs, the words printed on the official technology picture become a citable fact, `technology-picture-text`. This is wired but **not yet seen in a live run**.

**Creative reference.** The job's own brand name is never on the "avoid" list.

**Editor.**
- A wording pin's block starts from the line under the pin. It joins only nearby lines of a similar size, so a logo or body text is no longer pulled in.
- The main request handler now returns `PRODUCT_CHANGE_CONFIRM`, so the editor can show "Send anyway".

**Co-branded Post** went back to Coming soon (see above).

## Live results (10 Nov 2026)

| Test | Result |
|---|---|
| Collection Card (Duroflex Prana) | Ready |
| Marketplace Product Images (Sleepyhead Sense Ortho Ultra) | 4 of 6 Ready; 2 flagged for the product cut off at the edge |
| Landing Page Modules (Duroflex Back Magic Pro Plus) | 2 of 3 Ready |
| Listing Feature Cards (Sleepyhead Original) | 2 of 3 Ready; label now near the corner |
| Email Product Block (Duroflex Spine Contour) | Ready |
| Blog / Link Preview (Sleepyhead Napster Mini) | Planned and drawn with folding panels and strap; flagged for an added colon |
| Infographic (Duroflex Quboid) | Ready |
| Sales One-pager (Sleepyhead Sofa Drip Pro) | Ready |
| Product Page Images (Duroflex Wave Kinect) | 10 of 12 Ready; photo slots carry no words |
| Standee (Sleepyhead Sofa Drip Pro) | Ready |
| Reference picture (Sleepyhead post, layout and look) | Ready; followed the reference layout and look with new words |
| Editor: headline pin | Exact new headline; 0 pixels changed outside the area |
| Editor: replace plant with lamp | Lamp added |
| Editor: add a dog | Dog added; faint seam on the rug edge |
| Editor: product change | Confirmation asked before anything is paid |

**Cost.** This round cost about ₹771 (estimate at ₹96.61/USD, 9 Oct 2026), with 16 calls of unknown cost. About ₹164 of that went on planning attempts that failed before any image was drawn.

## A+ rerun fixes (10 Nov 2026, afternoon)

**Hero name check.** A fresh Posture Perfect A+ plan put the exact product name on the hero but cited the fact that states it (`sku-fact-1`), not the product ID, and the whole page failed planning. The hero check now also accepts the exact product name in the hero's words. The saved failed plan passes on replay.

**Longer planning for bigger jobs.** The user asked for a longer limit for bigger jobs after two 14-image plans hit the fixed 4-minute planning limit. In saved runs, plans for 10 or more images finished in up to 235 s, and half of their calls were cancelled at 240 s. One-image plans take about 100 s.

New lean jobs pin `planningCallScaleVersion: 1`:

| Images in the job | Planning limit |
|---|---|
| 1 | 4 min (unchanged) |
| 6 | 5 min 40 s |
| 14 or more | 8 min (the most) |

- The limit is 4 minutes plus 20 s per extra image.
- The backup model gets the same limit.
- Reviews are per image and keep their own limit.
- The 90-second queue rule is unchanged.
- Earlier jobs keep the fixed limit.

**Direct image checks.** The user chose this (10 Nov 2026) after the A+ rerun showed 10 of 13 image checks stalling in OpenAI's background queue past 4 minutes. Sent directly, the same checks took about 23 s each. Today's data: about 3 in 28 queued calls stalled early in the morning, and 10 in 13 in the afternoon.

New lean jobs pin `directCheckVersion: 1`. Image checks (`lean-review`) are then sent directly, with the 4-minute review limit as their timeout, and the receipt records `handoff.directCheck: true`. This covers the main check, the AI-edit product check and Re-run check.
- A direct request cannot be confirmed as cancelled, so a timed-out check is never sent again automatically. The design keeps "check before using" and Re-run check.
- Planning still uses the queue, because a stalled plan can then be confirmed cancelled before the backup model is used.
- Earlier jobs keep the queue.

**Re-run check is always direct.** A Re-run check on the partial A+ job sat in the queue for 4 minutes and was cancelled; Re-run check allows one request per click, so nothing was sent again. The user chose (10 Nov 2026) that Re-run check is always sent directly, on older jobs too. Only the way the request reaches OpenAI changes; the check's content and the job's other settings stay as they were.
