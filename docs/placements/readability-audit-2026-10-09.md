# Placement rules and readability audit

**9 October 2026 · Duroflex Group Creative AI · Duroflex and Sleepyhead**

The existing guides have the right direction: preserve exact copy, inspect the final crop, keep one proposition, and check viewing distance. Their weakness is operational: “readable” does not specify how small the image will appear, how much copy belongs there, or how a physical piece will be read. A correct upload size, successful OCR result or high-resolution export can still contain unreadable text.

This audit covers **all 93 Studio presets (43 print/offline), all 131 researched profiles, and all 186 existing researched rules**. The two catalogues overlap; this is 224 records, not 224 distinct channels. I checked 34 primary-source pages, with 31 readable, two partially accessible and one unavailable, and visually inspected nine published examples. The accompanying matrices enumerate every record and rule, retaining authority and uncertainties. These are reviews of rules and design methods, not a claim that every possible artwork has passed a human reading test.

[Open the interactive audit](http://localhost:1842/creative-ai/placement-guide) · [Every placement](research-2026-10-09/placement-matrix.md) · [Every existing rule](research-2026-10-09/rule-matrix.md) · [Full audit data](research-2026-10-09/audit.json) · [Source register](research-2026-10-09/sources.json) · [Inspected examples](research-2026-10-09/examples.json)

## The findings that change how we design

### 1. Judge text at the delivered size

A 24-pixel text size on a 1080-pixel-wide image becomes **8 CSS pixels** when displayed 360 pixels wide. Uploading more pixels does not make those letters easier to read. For a 16 CSS-pixel support-text starting target, a 1080-wide canvas needs approximately 48 asset pixels at a 360-wide display, or 54 at 320. A 24 CSS-pixel headline needs 72 or 81 asset pixels respectively. These are typography planning calculations, not measured font sizes in generated artwork; glyph height, weight, line spacing and script still matter.

Use 320 and 360 CSS-pixel widths as conservative Studio phone stress tests, and 160 for small thumbnails. They are assumptions, not universal platform viewports. Test the actual client slot and its crop too. Device pixel ratio controls image detail, while CSS layout controls apparent size. [web.dev responsive images](https://web.dev/learn/images/responsive-images), [Mailchimp mobile design](https://templates.mailchimp.com/design/mobile-friendliness/).

### 2. Give different placements different copy capacity

The following are **authored English drafting targets**, not official word limits or hard rejection thresholds. They include promotional action copy. Product names, mandatory disclosures, long words and other scripts can require less discretionary text. Always preserve required wording; simplify the optional claim or choose another format instead of shrinking its qualification.

| Reading situation | Starting headline / support / total words | Design decision |
|---|---:|---|
| 50–60px-high display banner | 5 / 0 / about 10 | One line, recognizable identity and short action; no paragraph |
| Narrow or compact display | 6 / 8 / about 18 | At most one brief support line; short line lengths |
| Larger fixed display card | 7 / 14 / about 26 | One proposition; do not fill the available area with brochure copy |
| Social feed / carousel card | 8 / 18 / about 32 | One idea per card; longer explanation in native caption |
| Story / status | 7 / 12 / about 25 | Short hierarchy; app controls and product/face clearance |
| Small thumbnail | 5 / 0 / about 7 | Recognizable subject and short hook; no explanation paragraph |
| Web hero / app banner | 8 / 12 / about 25 | Responsive crop; substantive text and controls preferably live |
| Email hero | 7 / 0 / about 12 | Supporting copy and button in HTML, not inside the raster |
| Product feature tile | 7 / 16 / about 30 | One sourced feature with its nearby qualifier |
| A4/A5 handheld face | 10 / 100 / about 125 | Group essential details; use reverse/pages before shrinking |
| Small/narrow handout | 8 / 45 / about 65 | One column; reduce optional detail |
| Folded brochure panel | 8 / 40 / about 60 **per panel** | A spread's capacity is not each panel's capacity |
| Contact card / tag / label | 5 / 15 / about 25 | Identity and essential supplied information |
| Dangler / shelf / counter POS | 6 / 6 / about 16 | Short message from shelf/hanging distance |
| Poster / standee / retail screen | 7 / 8 / about 20 | Large dominant message; distance and dwell determine detail |
| Moving outdoor media | 7 / 0 / about 12 | One visual and very few words; often fewer than this starting total |
| Presentation cover | 8 / 8 / about 22 | Title, short subtitle and identity; projection check |

Tables, menus, price lists, documents and infographics need **structure rather than a blanket word cap**: short cells, a few steps, repeated labels and pagination. Primary product photography generally needs no added marketing overlays. Native responsive ads and notifications use their own text fields and template previews. Unspecified QR posters remain conditional until the physical/display context is supplied. All individual presets and profiles are mapped in the placement matrix.

### 3. A leaflet and a dangler are not interchangeable

A leaflet is held close and may carry organised detail. A dangler is seen from farther away, sometimes moving, with a hanging hole and an obstructed upper area. Its job is recognition, not a miniature sales sheet. Larger print dimensions do not necessarily permit more copy: a standee and hoarding can require less text than A5 because their viewing distance is greater.

For close-reading print, start around **12–14pt body type**, with larger headings. Government accessibility guidance supports 12pt and considering 14pt for people with sight loss. MOO's 8pt floor is a vendor printability threshold, not evidence of comfortable reading. This is design guidance for this studio, not a universal legal font mandate. [GOV.UK communication formats](https://www.gov.uk/government/publications/inclusive-communication/accessible-communication-formats), [MOO flyer preparation](https://www.moo.com/us/flyers/design-guidelines-dyo).

At 150ppi, 12pt occupies about 25 raster pixels in its typographic em; 14pt about 29.2. This is not the visible letter height. Print at **100% trim size**, check both faces, folds, holder/cassette obstructions, stock and glare. Increasing export PPI cannot restore missing source detail. Studio PDFs remain RGB raster design proofs; dense small print may require typeset vector text and printer preflight.

Outdoor legibility depends on distance, movement and time to read. OAAA's seven-word benchmark is a useful starting point, not a law; captive transit audiences differ from fast-moving roadside traffic. Its distance table uses inches, not typographic points. Obtain the operator's actual specification before setting letter dimensions. QR-dependent messages do not suit moving traffic. [OAAA best practices](https://oaaa.org/wp-content/uploads/2022/09/OAAA-Best-Practices-oct20-2021-spreads_2_.pdf).

### 4. Platform character allowances are not image-copy allowances

LinkedIn's native introduction and headline appear outside the image. Reddit's headline maximum similarly does not justify baking that much text into a small image. Google responsive image guidance discourages added text, logos and buttons on the image asset; a complete fixed uploaded display ad is a different contract. Keeping these scopes separate prevents the same slogan/caption being repeated in every surface. [LinkedIn single-image guide](https://business.linkedin.com/advertise/ads/ads-guide/single-image-ads), [Reddit specifications](https://www.business.reddit.com/learning-hub/articles/reddit-image-ad-specs), [Google responsive creative guidance](https://support.google.com/google-ads/answer/9823397?hl=en).

Email must preserve useful live text and actions when images are blocked. Product primary-image rules can prohibit text overlays even where a promotional detail-page gallery allows them. OS notification images should support the native title/body, including collapsed state, rather than simulate a notification inside a poster. [Mailchimp image guidance](https://templates.mailchimp.com/design/images/), [Merchant primary images](https://support.google.com/merchants/answer/6324350?hl=en), [Android notifications](https://developer.android.com/design/ui/mobile/guides/home-screen/notifications).

### 5. Contrast must work in the actual scene

Where WCAG AA applies, normal text needs 4.5:1 contrast and large text 3:1, with the standard's exceptions. “Large” refers to delivered type size, not font size on an uploaded canvas. A photographic background needs local contrast behind all relevant letters; averaging the whole image is inadequate. These thresholds alone do not certify a raster ad's accessibility. [W3C contrast guidance](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum).

For both brands, resolve conflict by composing a genuine wall, curtain, sky or uncluttered interior region and placing appropriately sized text there. Do not add a white patch, haze, blur or gradient to rescue a crowded image. Product materials and furniture colour should complement that environment; product/person shadows must share the scene's light source and physical support. Published examples supply hierarchy principles, not permission to import another brand's style.

## What the inspected examples show

| Actual inspected reference | Useful comparison | Weakness or scope limit |
|---|---|---|
| Dunkin billboard and Chiquita billboard, via [OAAA](https://oaaa.org/blog-posts/billboardsthatsparkjoy/) | Very short message, one dominant product silhouette, clear identity. Strong comparison for hoardings and distant POS. | Historical campaign examples; no measured performance claim. A shelf or transit placement still needs its own distance check. |
| [LinkedIn FixDex/Flexis illustrations](https://business.linkedin.com/advertise/ads/ads-guide/single-image-ads) | Longer copy and action sit in the native interface around the image. | One illustration has an old event date; do not infer current pixel-safe zones. |
| [Pinterest furniture example](https://business.pinterest.com/en-gb/creative-best-practices/) | Chair remains the star within a coherent room; native information carries detail. Relevant to the Meadow loveseat. | Do not adopt its palette or logo treatment as Duroflex/Sleepyhead guidance. |
| [Mailchimp product crops](https://templates.mailchimp.com/design/images/) | Large product details; separate names/prices below the images. | Small screenshot prices are not a readability certificate; actual email type should be live and tested. |
| [Vista event and Panelfox flyers](https://www.vistaprint.com/hub/how-to-design-a-flyer) | Clear headline/date hierarchy and grouped feature blocks. | Event address/sponsors are tiny; thin script is vulnerable. Angled mockups hide actual point size. Publication in a guide does not make every detail good practice. |
| [Google responsive image diagrams](https://support.google.com/google-ads/answer/9823397?hl=en) | Clean asset versus image crowded with added text/menu; native assembly handles copy. | These are teaching diagrams, not campaign results; rule applies to responsive assets. |
| [Android big-picture example](https://developer.android.com/design/ui/mobile/guides/home-screen/notifications) | Collapsed thumbnail and expanded image have different capacities. | Essential meaning belongs in the native fields, not tiny text inside the picture. |

Nine individual visuals were inspected, counting each billboard and each flyer separately. Their direct image links, observations and cautions are in the example register. Analogies are labelled: no actual dangler, every-format brand campaign or measured user-readability study is claimed.

## Technical and scope corrections

- **YouTube:** current guidance recommends 3840×2160 for video thumbnails; the Studio default now follows it, retaining a conservative under-2MB cap usable for mobile upload. Desktop allows more. A valid smaller image is not automatically rejected. Check the surface-specific replacement crop for vertical video. [YouTube guidance](https://support.google.com/youtube/answer/72431?hl=en).
- **Google fixed display:** 150KB applies to uploaded image ads. The Studio's 20 listed sizes include region-specific units; they are not all globally available. HTML5's separate allowance must not be applied to PNG/JPEG. [Google upload specifications](https://support.google.com/google-ads/answer/1722096?hl=en).
- **Demand Gen:** a 40-character native headline maximum is not the entire instruction; include at least one ≤30-character variation for Display serving/ad strength. The legacy planning profile needs this nuance in campaign assembly. [Demand Gen specifications](https://support.google.com/google-ads/answer/17091672).
- **Performance Max:** the existing `pmax-short-headline` rule already requires a ≤15-character variation. Keep it alongside the maximum/cardinality rule; do not report it as absent. Platform weighted character measurement and actual native assembly remain distinct. [Performance Max specifications](https://support.google.com/google-ads/answer/17091269).
- **LinkedIn:** portrait is mobile-only; an image export does not certify a fully assembled ad. The Studio's 2–6 carousel range is an operational limit, whereas LinkedIn supports 2–10 cards. Document upload ceilings are not design budgets. [LinkedIn carousel specifications](https://business.linkedin.com/advertise/ads/sponsored-content/carousel-ads/specs), [document specifications](https://www.linkedin.com/help/lms/answer/a494940).
- **TikTok:** Pangle/network static dimensions are not a universal TikTok feed contract. Keep takeover, feed carousel and network placements separate. [Network asset specifications](https://ads.tiktok.com/resources/help/article/specifications-for-pangle-ad-assets).
- **Source differences:** creative advice and technical limits can differ. Google's responsive creative guide advises shorter descriptions while the technical maximum is 90 characters. Do not replace a technical maximum with a shorter editorial recommendation. [Responsive technical specifications](https://support.google.com/google-ads/answer/17090561).

Meta's detailed source redirected to login; Snapchat's detailed page and Apple's HIG were only partly readable. No guessed current safe-zone coordinates or unverified new technical limits have been adopted. Merchant's announced 2027 minimum retains its effective-date uncertainty. Exact operator templates, native previews and printer conditions remain open dependencies, not assumed passes.

## Implemented from this audit

New selections pin a separate **editorial readability rule** with the viewing context, soft drafting targets and mandatory-qualification safeguards. It is advisory and never promoted to an official font or word limit. Copywriting and design instructions receive the pinned guidance; the picker displays it. Review now includes a smaller viewing-context preview alongside the actual final raster and original references, using the existing review call and correction cycle. Historical pins, packages and saved reviews retain their original behaviour.

The preview is an additional stress check, not a measured font detector, device usability test, distance proof or automatic accessibility certification. Vision providers can rescale input. Print and outdoor still require a physical/operator proof. Editable physical overrides can reduce capacity beyond the preset's starting budget; inspect the actual chosen dimensions, not just its name. Source-specific conditional profiles retain their export/assembly limitations. No paid generation was used to research or test these changes.

## Follow-up fixes implemented on 9 October

Reading policy `2026-10-09.2` is frozen into new placement pins, including the chosen print geometry and optional viewing assumptions. Existing catalogue files, saved packages, historical pins and past reviews are unchanged.

- **Brief controls:** each selected format has a reading setup. Digital formats accept displayed CSS width; print/signage accept distance, reading time and movement. Crop/installation notes stay user-supplied assumptions. A local, unpaid preview recalculates guidance after print/viewing edits. Empty fields mean unspecified context, never operator approval.
- **Usable physical area:** smaller sizes, larger safe margins, narrower folded panels and top/bottom hardware keep-outs reduce the editorial starting capacity. Half-fold and three-panel pieces use their distinct panel geometry. Larger pieces do not automatically increase the copy allowance. Structured documents still use pagination and row/section checks rather than a blanket word cap.
- **Copy preparation:** optional embedded body paragraphs are omitted where the support target is zero (tiny banners, thumbnails, email heroes and moving signage). This is a Studio policy, not an official publisher word limit. Mandatory supplied wording and qualifiers remain protected. Other English word targets are advisory; non-Latin scripts require glyph/layout review, and folded spreads require explicit panel allocation. Native copy stays outside embedded artwork counts.
- **Planning evidence:** the existing copy/reconciliation stages save per-unit density risks in `copy-fit.json` and surface them beside outputs. Within drafting targets is not a readability pass. Reconciliation must protect required copy and flag a blocked layout when it cannot fit, rather than shrinking terms. Final-export pixel targets account for displayed width; physical close-reading targets account for the artboard including bleed. These are typographic planning conversions, not measured generated font sizes.
- **Digital review:** the existing review call must return an observation for every required embedded field at the pinned reduced preview width. Confident unreadability fails required-text-legibility even if the large image is recognized; uncertainty remains unresolved. Matching OCR cannot promote it to a pass. Observations are saved and shown in image reasoning. Physical print/distance review remains explicitly unverified by a screen preview.
- **Native headlines:** future Demand Gen pins add the ≤30-character short-headline variation check described in current official guidance. Future Performance Max pins add a native set check alongside the already existing `pmax-short-headline` rule. Exact publisher counting stays unknown where its algorithm is unimplemented; responsive campaign assembly remains a separate workflow. Neither change makes these fields artwork overlays or promotes a planning-only profile to supported static export. [Demand Gen](https://support.google.com/google-ads/answer/17091672) · [Performance Max](https://support.google.com/google-ads/answer/17091269).

These checks use the existing agents and one correction cycle. No extra reviewer or paid test generation has been introduced. The full 93-preset/131-profile research matrix remains searchable; historical rule rows describe the original catalogue and annotate changes to future runtime pins.

## Acceptance method for future artwork

1. Lock the destination: actual slot/crop or trim size, reading distance, dwell time, app controls and printer/operator template.
2. Draft the minimum message for that reading situation; protect exact SKU, sourced claims and required adjacent qualifiers.
3. Compose the hero and natural negative space together. Check scene/material harmony, light, contact shadows and human anatomy.
4. Inspect final exported pixels at the assumed small width **and** actual destination; inspect physical pieces at 100% and their intended installation distance.
5. If essential content is unreadable, remove optional detail, split the content or change the format. Do not shrink terms or rescue contrast with a white patch/gradient.
6. Check technical encoding/file limits separately, then native campaign assembly or printer preflight. Record unknowns rather than treating an enlarged preview as proof.

## Verification

The initial audit implementation passed **317 automated tests** (no failures), including all preset pinning, advisory authority, historical catalogue preservation, smaller physical overrides, image-preview dimensions, thumbnail/region changes, export and recovery regressions, and brand isolation. Browser checks confirmed the embedded dangler guidance, source/example/rule search and the typography conversion from 8 to 16 displayed CSS pixels. [Test log](../../work/readability-audit-tests.log) · [Browser preview](../../work/readability-audit-browser.jpg).

These checks validate implementation and audit coverage. They do not establish a readability pass for ungenerated future artwork. No paid provider image or reasoning call was made for this audit's tests.

### Follow-up verification

The follow-up implementation passed **325 automated tests** with no failures. A final targeted rerun passed all 16 reading-policy tests after separating close-reading point sizes from distance-sign policy. Tests cover frozen viewing context, margin/keep-out capacity, half-/three-panel handling, required-qualifier protection, script/panel limitations, small-preview failure/uncertainty, native short-headline unknowns, result warning rendering and the existing export/recovery/brand-isolation workflows. [Full test log](../../work/readability-fixes-tests.log) · [Targeted log](../../work/readability-fixes-targeted.log).

Live browser verification confirmed reading controls, persistence after reload, zero optional support for moving danglers, reduced capacity after increasing print safe margins, and the unchanged separation between proof export and production approval. The local preview API returned 200 for valid chosen geometry/context and 400 for settings attached to an unselected placement. No Generate action or paid provider call was used. [Browser verification](../../work/readability-fixes-browser.jpg).
