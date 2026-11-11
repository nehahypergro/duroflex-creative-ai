# Channel craft v1 (11 Nov 2026)

## Why

The grade-by-grade marketing review of the Sleepyhead Sofa Drip Pro batch (`work/marketing-review-sofa-drip-pro-20261111.md`) found channel-specific problems:
- A+ panels repeating one front shot.
- PMax pictures from one angle.
- A web address printed on the WhatsApp image.
- Carousels with no story.
- Stories with three-line headlines in small type.
- Website heroes with five text blocks in one corner.

The user asked for every "Better" item in the A+, Display/PMax, Email/WhatsApp/RCS/push, Social, Carousel, Story and Website hero rows.

New lean jobs pin `channelCraftVersion: 1` (`lib/creative-ai/lean/channel-craft.js`). Earlier jobs keep their saved contracts.

## What changes

| Channel | Rule | Checked by |
|---|---|---|
| Amazon A+ | `aplus-picture-jobs`: every module its own picture, never the hero's view again. Hero: the product in a lived-in room. Technology: the official picture. Benefits: their feature shown working or close (cushion in use, arm close-up, legs from a low angle). Lifestyle: one or two people. Details: close-ups. | Image brief and image check (layout) |
| Google PMax | `pmax-picture-jobs`: landscape is a lifestyle scene with people, square is the whole product on a plain light background, portrait is a feature close-up. | Image brief and image check (layout) |
| Display banners | `display-banner-look`: a real room or the campaign's colours (named from this product's recent assets), not an unrelated flat pastel block. The headline names one specific benefit. | Image brief and image check (layout) |
| Carousels | `carousel-picture-jobs`, in order: hook lifestyle with people → one feature per slide → hero with the call to action. One backdrop (same wall, floor, light, and a band or floor line running off each slide's right edge into the next). This is a design link, not a pixel-perfect panorama. | Image brief and image check (layout) |
| RCS cards | Same rule: look → feature in use → close-up detail. Cards are planned one at a time, so each card's place comes from the job's whole card set. | Image brief and image check (layout) |
| Web push | `push-crop`: the product fills about 70–85% of the width on a simple background, so it reads at 192 px. | Image brief and image check (layout) |
| Stories | `story-layout`: a one-line headline of six words or fewer, the product large in the middle band. Story text minimum rises to 12 CSS px (34 px on 1080). | Plan check (headline), measured text size, image check |
| Website heroes | `web-hero-layout`: at most three text blocks (headline, one line, button). On wide images, one text column about 40% wide. Wide desktop images of any class (a landing hero is classed as a feed post) use the 14 CSS px minimum. | Plan check (block count), measured text size, image check |
| Every image | No web address: a full link fails the plan check everywhere. A bare domain is allowed only on print. | Plan check |
| Campaign look (planning only) | `campaign-look-v1`: this product's recent palettes ("keep the same colour family; vary room, angle and moment"). When fewer than a third of recent assets showed people, show one or two people in this asset (formats with a scene only). The history file from marketing rules v1 also records each unit's first palette and whether its plan shows people. | Planning only |
| Read-back page | A Purchase brief with no price, offer or exact wording shows "Have a price or offer?". The button opens the existing offer fields. Nothing is filled in or invented. | `StudioModel.offerSuggested` |

All channel rules are layout: a finding is shown as "check before using" and never auto-corrected.

## Not done

- A truly continuous carousel panorama: each slide is still drawn separately.
- Older jobs were not back-filled into the look and people history.
- Not yet run live: the OpenAI account had no credit on 11 Nov 2026.

Tests: `tests/creative-ai/channel-craft.test.js` and the shared fixture `tests/creative-ai/lean-marketing-fixture.js` (both brands).
