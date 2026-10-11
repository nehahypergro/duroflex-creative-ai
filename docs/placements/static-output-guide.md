# Static placement implementation — 9 October 2026

The embedded picker contains 93 Studio formats: existing social and carousels, additional social/web/commerce/marketing/retail images, 20 listed fixed Google display sizes (including regional inventory), and 43 print/offline formats. The researched catalogue retains its historical pins and coverage limits. Generic planning-only print/OOH rows are replaced in the picker by the concrete editable print presets. Neither a preset nor an automated design score guarantees publisher or printer acceptance.

The [reading-context audit](readability-audit-2026-10-09.md) reviews all presets, researched profiles and existing rules. New selections pin editorial copy targets and viewing instructions separately from official technical constraints. A small banner, dangler and leaflet have different capacities. Review includes a display-size stress preview; physical proofs still require actual-size and installation checks. YouTube's default is now the current recommended 3840×2160, with a conservative mobile-compatible file cap; exporting those pixels does not establish native source detail.

## Rule authority

Each new job pins its own catalogue. Its selected canvas, file cap and placement-specific layout instructions become job requirements for planning, generation and review. Existing jobs retain their original catalogues, packages and reviews. Brand rules remain separate and scoped to Duroflex or Sleepyhead.

- Google’s fixed display canvas list and 150 KB limit were checked against [Google’s specifications](https://support.google.com/google-ads/answer/1722096?hl=en). Regional campaign eligibility and destination/publisher approval remain separate.
- LinkedIn square and portrait recommendations were checked against [LinkedIn’s guide](https://business.linkedin.com/advertise/ads/ads-guide/single-image-ads). These image presets do not deliver native campaign fields or certify complete ads.
- [Pinterest’s guidance](https://business.pinterest.com/en-gb/creative-best-practices/) supports vertical, product-readable composition. Owned website, app, email and retail screen sizes are explicit Studio defaults, not universal technical standards.
- [Adobe’s bleed guidance](https://helpx.adobe.com/indesign/desktop/print/page-set-up-and-printer-marks/print-bleed-and-slug-areas.html) and [PDF box guidance](https://helpx.adobe.com/acrobat/using/printer-marks-hairlines-acrobat-pro.html) distinguish trim, bleed and output boxes.
- [MOO’s flyer requirements](https://www.moo.com/us/flyers/design-guidelines) provide a vendor-specific example of safe areas and 300dpi photographs. Their numerical margins are not imposed on other printers.
- [Hopkins’ folding templates](https://www.hopkinsprinting.com/folding/) explain narrower inner fold panels. [VistaPrint India’s material library](https://www.vistaprint.in/marketing-materials) supports the material categories and use of individual templates.

## Print families and rules

| Family | Embedded formats | Placement rules |
|---|---|---|
| Handouts | A4/A5 flyers, A5/A6/DL two-sided leaflets, bookmarks, inserts, vouchers, contact cards | Short-distance legibility; front/back content order; exact prices, contacts and terms only when supplied |
| Brochures/documents | A4 bi-fold, letter fold and Z-fold flat faces; four-page A5 booklet; sales/spec sheet; price list | Flat artwork; clear panels and fold safety; narrower letter-fold inner panel; distinct reader-order pages; no imposed signatures |
| Posters/signage | A4–A1 posters, standee, X-banner, board and window poster | Message density decreases with viewing distance; cassette, mounting and eyelet obstructions remain explicit |
| Retail/POS | Rectangular/round danglers, shelf talkers/strips/wobblers, tent/counter cards, hang tags, stickers and door hangers | Hanging holes, hook cutouts, adhesives, folding/base tabs and die cutting require the printer’s template; no invented dieline certification |
| Outdoor | Banner, hoarding, transit poster, event backdrop, airport/stadium panels and a vehicle-panel concept | Very brief message at distance; operator size, scale, seams, hems and mounting must be confirmed |
| Press/mail | Newspaper and magazine ads, two-sided postcard | Publication-specific columns, gutters, stock, output intent and postal panel are separate job inputs |

Print setup exposes flat trim width/height, bleed, internal safe margin, requested proof PPI, required printer PPI, panel widths for letter folds, top/bottom keep-outs and production notes. Defaults (3 mm bleed, 5 mm margin, common sizes) are editable starting specifications selected by the user, not vendor approval. No unparsed note or checkbox can establish printer acceptance.

Each page/face generates separately with placement-specific content instructions and receives the existing bounded image review. The PDF contains every available page in reader order, with actual MediaBox/BleedBox/TrimBox geometry. Missing pages block a complete PDF. The report records final image hashes, geometry and source PPI, exported raster PPI and the lower effective artwork PPI. Design checks and production readiness are separate.

PDFs are RGB raster **design proofs**, not vector-text layouts, CMYK/PDF-X press files, imposed signatures or certified dielines. Actual source pixels determine effective resolution; upsampling does not restore detail. New selections now receive calibrated A4 actual-size tiles or explicitly partial outdoor samples, automatic preflight, and file-bound operator evidence recording. See the [India production proof workflow](india-production-proof-workflow.md). Physical printing, measurements and operator acceptance must be observed and recorded; generating a PDF does not perform those checks. No QR code is claimed to be scannable without a separate measured/decoded implementation.

## Reading setup and copy fit

Each selected placement exposes reading assumptions and starting copy targets. Set digital display width or physical viewing distance/dwell/movement, and record the actual client crop or installation constraints. Print edits recalculate capacity from usable area, folds and hardware keep-outs. These values are frozen for new jobs; they do not revise earlier saved work.

Zero-support formats omit optional embedded paragraphs before locking. Mandatory wording and qualifiers remain intact. Other copy targets are advisory, with per-panel allocation for folds and actual glyph review for different scripts. Saved copy-planning warnings appear beside the result; they are not a readability score or publisher approval. Digital review records essential field readability at the smaller preview in the existing review call. Physical letter size and press readiness still require actual-size/operator proofs. See the [full audit and follow-up fixes](readability-audit-2026-10-09.md).

## Extreme aspect ratios

Narrow display banners and shelf strips use a native-model canvas within 3:1 and an explicit centered retained rectangle. The generation instruction keeps all essential copy/logo/product inside that rectangle. Whole-image export crops and resamples; the reviewer sees the actual final narrow image. This does not guarantee composition compliance and never exempts final legibility or identity checks.

## Operational limits

Select up to three formats and six generated pages/images per direction. A two-sided piece counts as two units; a four-page booklet counts as four. Both directions run automatically with the existing single correction cycle. There are no paid image calls in the implementation tests. Publisher-native responsive campaigns, video/audio, animation, printer imposition, arbitrary uploaded die paths and certified CMYK/PDF-X production are distinct workflows, not silently represented as completed static exports.
