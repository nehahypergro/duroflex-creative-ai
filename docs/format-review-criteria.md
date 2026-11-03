# Review criteria by format

Updated 24 October 2026. **PDP is implemented. The other rows are proposals for product review, not new mandatory checks.** Both brands use the same format logic and their own saved brand/product evidence.

The review should ask whether an asset does its assigned job. It should not require every asset to behave like an advertisement.

## PDP: implemented

**Emotional audience appeal is excluded completely:** no score, advisory assessment, finding, confidence requirement or correction request. Neutral and functional presentation is valid.

| Review area | What matters for PDP |
| --- | --- |
| Buying clarity | Does this image answer its assigned buyer question? A product photo may answer visually without a headline. |
| Product and brand recognition | Is the selected SKU recognisable and correctly represented? Are its real markings and any applicable brand requirements preserved? No added campaign logo is demanded where the format omits it. |
| Gallery fit | Is the framing useful? Is essential information readable at the intended viewing size? Does the image serve the assigned slot? |
| Visual craft | Is the product clear, believable and free from distracting rendering defects? Is the hierarchy clean? |
| Whole-set checks | Are the requested slots present, distinct and consistent? These are pack checks, separate from the review of each image. |

Required checks still include correct SKU/variant, supported claims, exact required wording, relevant dimensions and applicable output requirements. Text checks apply when the image has required text; clean photography does not need marketing copy. Technology artwork follows the selected source-reuse policy. Missing or uncertain evidence affects the dependent image or pack status, not independent work.

## Other formats: proposed matrix

Common requirements across all rows: correct brand/product, truthful supplied facts, preserved mandatory wording and conditions, and applicable delivery requirements. A criterion is conditional when the brief or selected destination actually requires it. A subjective score alone does not establish a defect or authorise regeneration.

| Format | Main quality questions | Apply only when relevant | Do not require by default |
| --- | --- | --- | --- |
| Instagram feed | Is the main idea clear at feed size? Is the hierarchy effective? Does the execution suit the chosen concept? | Emotional resonance for an emotional brief; offer prominence for an offer; CTA for an action-led brief | Every post being emotional, an offer, or a full product explainer |
| Instagram Story | Is the message understood quickly? Is the vertical composition useful and the essential content clear? | Supplied interface-safe areas, link/sticker space and action hierarchy | Feed-style copy density; a CTA or sticker when none is requested |
| Social carousel | Does the opening establish a reason to continue? Does each slide add something? Does the sequence make sense? | A concluding CTA, when the purpose calls for one | Each slide telling the entire story; identical layouts on every slide |
| LinkedIn image | Is the professional relevance clear? Is the takeaway credible, specific and legible? | Evidence/attribution for the claims used; accompanying post copy | Corporate clichés, emotional appeal or dense explanatory text on every image |
| Marketplace main/listing image | Is the exact product unmistakable, well framed and consistent with the selected listing requirements? | Background, crop, accessory and text rules of the actual destination | Promotional storytelling, invented badges, emotional scenes or generic platform assumptions |
| Supplemental product gallery | Does each image answer a useful buying question? Are product details, facts and labels clear? | Comparison, dimension or feature checks for those particular slots | Emotional appeal or campaign CTAs |
| A+ / Premium A+ | Do modules explain useful benefits and evidence in a coherent order? Is text readable at the intended module display size? | Selected template, device behaviour and module inventory; comparison only with supplied data | Social hooks, emotional appeal, or a checkout CTA in every module |
| Website hero/banner | Is the page message clear? Does the artwork work with the actual component and its text? | Requested CTA, desktop/mobile crops, breakpoints and accessibility handoff | Treating a standalone image as proof of website integration; an emotional scene for every banner |
| Paid static / PMax / YouTube Community | Is the message clear in the selected placement and ratio? Does it support the brief's intended action or communication? | Native text inventory, offer terms, logo and crop requirements for the selected destination | One identical treatment across placements; treating a community post like an ad |
| Print / retail | Can the intended audience understand it at the intended distance? Are product, offer or location details clear? | Physical size, vendor template, bleed, colour profile, price/date/location, proof and finishing evidence | Emotional appeal; treating digital artwork approval as printer acceptance |
| Email | Are message hierarchy, content and next action clear? Does the supplied content have a usable responsive handoff? | Image-off behaviour, links, alt text and client checks for actual HTML delivery | All copy baked into a hero image; emotional appeal in transactional content |
| WhatsApp / RCS / push | Is the message concise and useful in its actual card/message context? Is the action clear when required? | Native fields, character/asset rules, personalisation and supplied offer terms | A full poster in a small notification; a campaign narrative in every message |
| PR / documents / training | Is the information accurate, complete, understandable and structured for its audience and purpose? | Attribution, source references, page/slide flow, accessible tables and document delivery | Image-style emotional scores or advertising CTAs |
| Catalogues | Is coverage complete? Can the reader identify, compare and find the right products and variants? | Regional/language editions, page navigation, pricing supplied in the brief and print specifications | Evaluating every page as an independent advertisement |
| Resizes / localisation / personalisation | Does the version preserve the intended meaning and correct product while adapting to its new context? | Script/glyph coverage, local terms, supplied store/person details and changed crop/layout | Identical line breaks or positioning across every size; invented translations or personal facts |

## How this is implemented

The format is selected from the saved destination ID, not guessed from a brief keyword, brand or aspect ratio. `creative-reviewer/profiles.js` provides the shared profile used by treatment planning and review.

The implemented PDP profile covers full twelve-image PDP slots, Product Images recipe slots and the standalone product-gallery preset. Its four quality weights retain their previous proportions and are normalised over 90. This change does not claim empirically calibrated conversion scoring. Other destinations retain their existing review policy until their proposed profiles are agreed.

New PDP treatment snapshots carry the profile's purpose and exclusions to planning. The actual review request excludes emotional appeal from its response schema and permitted findings. Saved reviews record the exact policy; earlier policy versions remain readable. Historical artwork, reports and costs are not rewritten.

Evidence: `work/pdp-review-profile-20261024/`. Tests cover the real model-request contract with a mocked provider, deterministic format selection, retained required-copy checks, profile delivery to planning, historical policy compatibility, and both brands' saved evidence. Offline checks are not new artwork generation or proof of live visual quality.
