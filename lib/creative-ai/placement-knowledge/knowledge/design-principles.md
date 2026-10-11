# Placement design reference — editorial heuristics, version 1.0.0

Reviewed as authored guidance on 2026-10-04. These principles do not establish measured campaign performance or publisher approval. Machine-readable rules live in `catalog.json`; this document explains their application. Every attached rule has explicit scope, severity, rationale, limits and provenance. `local:knowledge/design-principles.md` identifies this authored source, not external evidence about a brand.

## Hierarchy and information flow

Choose a primary proposition, supporting evidence and an action. Give them distinct emphasis so a viewer can identify the message without reading every element. Scale, contrast, position and grouping can create hierarchy; no fixed font-size ratio is assumed. A product primary image often prioritizes product fidelity over promotional messaging. A notification prioritizes useful native content over decorative language.

Use the reading direction of the chosen language and a coherent card/page sequence. Keep essential qualification beside its claim. A later carousel card cannot reliably qualify an earlier offer if it is never seen or if the platform reorders cards. Brochure panel order follows the printer's folds, not the flat PDF's convenient reading sequence.

## Legibility and spacing

Read the final artwork in its intended display container, crop and viewing context. A 1440-pixel artboard can still display as a narrow feed image or small banner. Large production type can appear small after scaling. Script, stroke width, contrast, background detail and viewing distance affect reading ease. Deliberate separation between text, logo and subject prevents visual collisions and makes grouping clear.

Do not turn heuristic spacing into a fabricated safe-area number. A publisher safe zone needs its placement, objective, overlay configuration, reference canvas and unit. A printer's bleed describes artwork outside trim; safe content is a separate interior region. Neither is a generic ten-percent margin.

W3C's [contrast explanation](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) provides scoped accessibility guidance. Applying its threshold to an intended web-conformance obligation requires checking exceptions and displayed text size. It is not a universal ad-upload rule. Raster type and complex backgrounds still require rendered judgment. [Text equivalents](https://www.w3.org/WAI/tutorials/images/) belong to delivery metadata and can preserve meaningful information when images are inaccessible.

## Message focus and copy-image relation

Choose depth from attention context, recipient intent and the brief. One clear proposition often fits a short feed scan, banner or roadside view better than several competing claims. A deliberate brochure, sales sheet or product gallery can carry more detail. There is no universal word budget. If mandatory offer/legal wording cannot remain readable, change the message, placement or execution; do not silently remove it.

Copy and imagery should support the same truthful proposition. Preserve exact product variant, packaging, quantities and qualifications. Do not manufacture product evidence, expected uplift or social proof. Character allowance is a technical property of a native field; a sensible copy budget is an editorial target; a truncation risk depends on rendering. Those are three different judgments.

## Context-specific applications

| Family | Apply | Limits |
| --- | --- | --- |
| Social feed | Recognizable subject and proposition; inspect preview crops and accompanying native text. | A feed, story and carousel share neither all rules nor all native fields. |
| Uploaded banner | One proposition and action; adapt density to small height. | A proportional large master cannot satisfy exact upload pixels. |
| Responsive ad assets | Each image and native field should work independently; review assembled combinations. | RDA guidance discourages added text/logo; whole uploaded-banner copy is not automatically appropriate. |
| Owned web/app | Align image with page content, crop and real surrounding action. | Host application determines breakpoints, overlays and accessibility obligations. |
| Email | Provide native essential offer/action and image alternatives; check blocked images and dark mode. | No universal email width or file ceiling; provider/template/client matrix required. |
| Notification | State event and useful next action in native text; optional picture supplements meaning. | OS, provider, expanded state, locale and font change visible content; no universal character cap. |
| Print/document | Plan reading and panel order; keep evidence and qualifications close. | Trim, stock, folds, marks, effective resolution, output profile and PDF preset require the printer. |
| Out of home | Dominant subject and concise message readable at supplied distance and dwell. | No seven-word rule, billboard ratio, DPI default or QR scan guarantee. |
| Commerce | Faithful exact variant and packaging; distinguish primary product from gallery or promotion. | A primary image may forbid added campaign text; marketplace-specific contracts still needed. |
| Related static | Derive message depth from recipient task and actual delivery surface. | A custom size does not certify app-store screenshots, invitations or publisher covers. |

## Exact text and actual output

The graphic designer requests a complete artwork with exact permitted embedded wording. Generation may still omit, distort or misspell words, symbols, prices or accents. Inspect the final output, preferably including OCR candidates plus rendered comparison against the copywriter's exact text. JSON shape, prompt wording and image dimensions cannot prove exact lettering, readability, brand execution or semantic claims. Native fields must be checked independently.

All examples in the adjacent examples directory are fictional contract demonstrations. A favorable review of their metadata does not demonstrate real campaign results or real image quality.
