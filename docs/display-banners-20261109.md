# Google Display banners (9 November 2026)

User request (9 Nov 2026): "Google Display Banners" was in the Studio catalogue as `soon` (a 1200 × 628
planning brief), so neither the picker nor the home brief reader could make banners. This builds it as a
real, ready format. No paid generation was run to build or test it.

## Research (checked 9 Nov 2026)

| Fact | Source |
|---|---|
| Uploaded image ad sizes: square/rectangle 200×200, 240×400, 250×250, 250×360, 300×250 (inline rectangle), 336×280, 580×400; skyscraper 120×600, 160×600, 300×600 (half-page), 300×1050; leaderboard 468×60, 728×90, 930×180, 970×90, 970×250 (billboard), 980×120; mobile 300×50, 320×50, 320×100. Some are regional (Poland, Sweden, Denmark, Norway). | Google Ads Help, *Uploaded display ads specifications*, https://support.google.com/google-ads/answer/1722096 |
| GIF, JPG or PNG, maximum 150 KB; animation 30 s or shorter and slower than 5 fps (we make still images only). | same page; https://support.google.com/adspolicy/answer/176108 |
| Images must take up the entire space of the chosen size; nothing sideways or upside down; not blurry or illegible; no strobing/flashing. | Google Ads policy, *Image quality*, https://support.google.com/adspolicy/answer/14848199 |
| Misleading design is not allowed: system/site warning look-alikes, features that don't work (e.g. close buttons), download or install buttons/icons in image ads, transparent backgrounds, images that look like more than one ad, moving/clicking arrows, standalone buttons without clear context or with disproportionate prominence. | Google Ads policy, *Misleading ad design*, https://support.google.com/adspolicy/answer/15937463 |
| A "visible border of a contrasting color" for partly white/black/transparent backgrounds is stated only for third-party-served ads; we found no such rule for uploaded image ads. Studio therefore requires an opaque, edge-to-edge design (no frame) and does not add borders. | https://support.google.com/adspolicy/answer/94230 (not verified as applying to uploaded ads) |
| A call-to-action button graphic: Google does not name "Shop now" buttons. Our reading of the misleading-design policy is that one clearly labelled, proportionate CTA is acceptable; download/install/close/play are not. This is an interpretation, not Google wording. | as above |
| AdSense "top performing" sizes: 300×250, 336×280, 728×90, 300×600, 320×100. 320×50 and 160×600 are common but not on that list. | AdSense Help, *Guide to ad sizes*, https://support.google.com/adsense/answer/6002621 (AdSense, not Google Ads) |
| Responsive Display ads are different: the advertiser uploads assets (1.91:1 1200×628 and 1:1 1200×1200, up to 5120 KB) and Google assembles the ads. That is what the **PMax set** card covers (clean images, no on-image copy); uploaded image ads are complete, fixed-size ads with their own words and CTA. | https://support.google.com/google-ads/answer/7005917 |

## What the user does

1. Choose **Google Display Banners** (Ads tab in the picker, or write "display ads", "banner ads",
   "Google display banners" or "GDN" in the home brief box).
2. The brief shows **Banner sizes** (Standard set, 6 sizes — default; or Standard set + strip sizes,
   8 sizes, strips untested), an optional **Call to action wording** (e.g. "Shop now"; used word for word
   when given) and optional visual notes. QR codes and contact details are never asked.
3. The brief lists every size, its family and whether it is a key size, what is left out and why, and
   the 150 KB file rule.
4. Pick the product, write the brief, press review: the INR estimate with the image count is shown before
   anything is paid for. Press create: ONE job makes the whole set.
5. Download the image set: besides the images, a `google-display/` folder holds Google-ready files.

## What gets made

| Size | Name | Family | Key size | How it is drawn (gpt-image-2 canvas → kept band) |
|---|---|---|---|---|
| 300 × 250 | Inline rectangle | Rectangles | yes | native (1104×928, ~99% kept) |
| 336 × 280 | Large rectangle | Rectangles | yes | native (1104×928) |
| 300 × 600 | Half-page ad | Skyscrapers | yes | native (720×1424) |
| 160 × 600 | Wide skyscraper | Skyscrapers | yes | band (592×1744, 79% kept) |
| 970 × 250 | Billboard | Leaderboards | | band (1744×592, 76% kept) |
| 320 × 100 | Large mobile banner | Mobile | yes | band (1744×592, 92% kept) |
| 728 × 90 | Leaderboard | Leaderboards | yes | **strip, opt-in** (1744×592, 36% kept) |
| 320 × 50 | Mobile banner | Mobile | yes | **strip, opt-in** (1744×592, 46% kept) |

Standard set: 6 images. With strips: 8 images. Estimate on 9 Nov saved runs (studio-estimate, scaled per
image from this brand's other formats, FX 9 Oct 2026; not a quote): Duroflex ₹83–₹168 (6) / ₹108–₹219 (8);
Sleepyhead ₹52–₹126 (6) / ₹64–₹157 (8).

## Extreme shapes: the choice and why

gpt-image-2 draws at most 3:1 (`placements.generationSize`). Before this change a 728×90 page would have been
drawn at 3:1, shrunk to 270×90 and mirror-extended by 458 px (exact-canvas v1), which is unusable.

Options considered:
- **Compose in code** (generated background + product crop + real text): needs brand font files rendered
  by the server, which the lean flow deliberately does not use; it would look templated and adds a second
  rendering path. Not chosen.
- **Draw at the nearest supported shape and keep a band (chosen).** The planner is told each page's shape
  class and to plan a one-row (or one-column) layout; the image prompt gets the existing *FINAL EXPORT CROP
  CONTRACT* with the exact band in model pixels and "keep the logo and CTA fully inside with a small margin".
  `display-banners.fitOptions` makes `exact-canvas.fit` keep the band with even scaling and a centred trim for
  every banner page (originals, corrections and AI edits). No mirror-extend, no stretch or squash.
- **Strip sizes** keep under 75% of what the model draws (728×90 keeps 36%), so the model must leave most of
  its canvas as plain background. That is unproven, so 728×90 and 320×50 are **left out of the default set**
  with a note and offered as an untested option. Other strips (468×60, 970×90, 300×50, 120×600) are not
  offered.

## How it works (new jobs only)

- `public/creative-ai/studio-model.js`: `displayBannerSizes`, `displayBannerSets`, `displayBanners(o)`,
  `displayBannerSlots`, `displayBannerRows`; the card preset is feature 1 with `platform: 'Google Display'`.
  `generationProfile` uses the existing `custom:studio-display-<size>` Studio presets (150 KB ceiling, the
  `fixed-display` treatment and the display readability classes) with per-size `jobInputs` sharing one
  `familyId` (one plan), `textPolicy: 'display-banner'` and the logo on every size.
- `studio-generation.displayBannersRequest` pins `displayBannersVersion: 1`, the inputs, the logo map, the
  user's own wording (brief, plus offer/terms only when the asset says it has an offer) and the CTA wording.
  `lean-policy.configure` / `provider-config.snapshot` keep the pin.
- `lib/creative-ai/runtime/display-banners.js`:
  - planning packet: the set rule (planning only, in `format.structure`), the Google policy requirement
    `display-banner-policy-v1` (in image prompts and checked by the existing reviewer), and a per-size
    execution line with the band contract;
  - plan validation: the same headline and CTA on every size, exactly one CTA of 1–3 words (never
    download/install/play/close), the supplied CTA word for word, text budgets per size class (card: 4 blocks
    / 20 words; compact: 3 / 14; micro: 3 / 10);
  - wording clean-up (recorded, the saved planner output is never rewritten): links, QR, contact details,
    ratings/reviews, best-seller wording and competitor names are removed; offers/prices/EMI only word for
    word from the brief; warranty facts from the official product page stay;
  - files: `bannerFile` keeps an opaque PNG when it is 150,000 bytes or less, otherwise JPEG with quality
    stepped 92 → 60 at the same pixels; if it still does not fit it is flagged `overLimit`, never resized.
    `packageEntries` writes `google-display/<family>/<W>x<H>-<name>.png|jpg`, `sizes.csv` and a README;
    the image-set download (`delivery-packages.js`) adds a pass/fail check per file and the campaign pack
    zip carries the same folder.
- Notes on the job (`job.displayBanners.notes`, shown through `M.resultNotes`): strip sizes used or left out,
  removed wording.
- The brief reader instruction names the card; `finish()` deterministically maps "display ads", "banner
  ads", "Google display" and "GDN" to it (replacing a `website-banner` pick unless the brief names a
  website/homepage/site banner). The free local fallback reads the same words.
- Shared fix: `objective-playbook.formatClass` treated the 970×250 display "billboard" as an outdoor
  billboard (distance class); Studio display presets are now always the banner class. Checked against 58
  saved lean jobs (40 Duroflex, 18 Sleepyhead): no saved selection changes class and no saved record gets
  the banner fit.

## Tests

`tests/creative-ai/display-banners.test.js` (both brands: card and sizes, strip geometry, one plan, pins,
real readiness path, band fit with a red/blue band image, headline/CTA/budget/offer rules, 150 KB files,
history, brief reader) and `tests/creative-ai/display-banners-picker-browser.test.js` (screenshots in
`work/display-banners-20261109/` at 1366 and 390).

## Limits and what needs a paid run

- Not verified with a paid run: whether gpt-image-2 keeps the logo, product and CTA inside the band
  (especially the strip sizes), text readability at 320×100 and 160×600, real cost and time.
- The reviewer checks the final banner, so a cut-off logo or CTA is reported; the single correction cannot
  recover content that was drawn outside the band.
- Google acceptance, upload and campaign setup are not checked. Animated GIF and HTML5 ads are not made.

## Banner fit v1 (redo run, 9 Nov 2026)

The paid redo (job `creative-e396b7c7…`) flagged 5 of 6 sizes:

| Size | Cause |
|---|---|
| 160×600, 970×250 | The image model ignored the "keep inside the band" contract, so cutting the band chopped the logo and mattress |
| 336×280, 300×600 | The model itself ran the mattress off the edge (our trim was 2–3 px) |

New banner jobs pin `displayBannerFitVersion: 1`:
- Every size's prompt asks for the whole product, logo, words and button inside the banner with a clear margin.
- Band sizes keep the whole drawing (even scaling) and fill the two ends with the drawing's own edge colour (`exact-canvas.fit(..., {extendFlat:true})`, method `extend-flat`). The prompt tells the model to keep those ends plain. How even the edge strip was is recorded (`originalFit.edge.flat`), never hidden; the visual review still judges any visible seam.
- Strip sizes (728×90, 320×50; opt-in, untested) keep the band crop.
- Earlier banner jobs keep the band crop. Tests: `tests/creative-ai/display-banners.test.js`.
