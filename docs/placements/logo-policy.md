# Studio placement logo rulebook

Version: 1.0.0. Effective policy date: 15 October 2026.
Authority: explicit client instruction in the placement-logo conversation.
Scope: Duroflex and Sleepyhead, using each brand's own approved assets. This is
client production policy, not an Instagram, YouTube or other publisher mandate.

## Placements without an added logo

Do not add a separate campaign logo in these placements. This replaces the
previous proposed "optional" classification with "omit".

| Placement | Logo treatment | Context needed |
| --- | --- | --- |
| Instagram / Facebook organic Story | Omit | Organic Story, not a paid Story advertisement |
| YouTube thumbnail | Omit | Thumbnail artwork |
| Carousel middle slides | Omit | Slide index greater than 1 and less than the total slide count |
| Website desktop / mobile hero with a branded header | Omit | The hosting page supplies a visible branded header |
| Website product / category banner with a branded header | Omit | The hosting page supplies a visible branded header |
| App banner inside a clearly branded app | Omit | The host app supplies visible brand identity |
| Product showcase / gallery image | Omit | Product showcase or gallery artwork |
| Collection cover | Omit | Collection cover artwork |
| Product feature tile / comparison chart | Omit | Feature tile or comparison chart artwork |

The rule concerns an added graphic logo. Preserve authentic logos, labels and
markings already on the exact product; do not erase or alter product branding.
It also does not remove a website/app header or platform account identity.
Paid Stories are not included in the organic-Story omission rule. Opening and
closing carousel slides are not included in the middle-slide omission rule.
Do not infer organic/paid identity or the existence of a branded header from
aspect ratio alone. An unknown context must remain explicit in the brief.

## Position whenever a logo is included

1. An added logo may appear only at the **top-left or top-right of the usable
   artwork area**. No top-centre, centre, middle-edge or bottom placement.
2. The art director chooses the clearer of the two corners based on the actual
   composition and records a short reason. Neither left nor right is the
   universal default.
3. The usable area excludes applicable interface controls, crop losses, print
   keep-outs and supplied safe margins. A top corner means a corner inside
   that area, not the raw canvas edge. Do not invent universal pixel offsets.
4. Keep the complete visible symbol/wordmark, trademark where supplied, and
   required brand clear space inside the usable area. Measure visible artwork,
   not just a padded image bounding box.
5. Use only the selected brand's approved logo variant. Preserve proportions,
   authentic lettering and approved colours; do not redraw the identity.
6. Choose a corner with sufficient contrast and no overlap with product,
   people/faces, headline or other required content. If neither corner works,
   revise the composition or report the conflict; do not move the logo into
   the centre to obtain a pass.
7. Follow supplied brand minimum size and clear space. Label any additional
   studio readability heuristic as a heuristic, not a platform or brand rule.

This position rule governs logos composed into studio artwork. A publisher's
separately supplied native logo asset is positioned by that publisher and
cannot be claimed to comply with studio-controlled corner coordinates.

## Requirements and conflicts

This update does not make every other placement logo-mandatory. Retain its
existing brief/brand/publisher inclusion requirement; when a logo is included,
the two-corner rule applies. The earlier recommendation matrix is not blanket
client approval of every "Yes" entry.

If a future explicit brief or authoritative brand/publisher requirement
conflicts with an omission or position rule, surface the exact conflict.
Do not silently insert a logo, drop a required asset or claim approval.

## Runtime adoption boundary

New submissions now pin `placementLogoPolicyVersion: 1` and a resolved decision
in each selection's `jobInputs.logoPolicy`. Studio Stories require an explicit
Organic/Paid choice. Website/app presets require an explicit branded-host value.
Carousel indices resolve after expansion. Unknown context and conflicting typed
overrides stop before a paid call. Historical jobs without this version retain
their original contract.

The decision travels through strategy constraints, art planning, reconciliation,
image prompts and a mandatory rendered placement check in the existing review.
Omission removes campaign-logo references and editable logo boxes while keeping
product-role references and authentic physical product markings. Included logos
are reviewed for the complete mark in a usable top corner, contrast and overlap.
Actual pixel compliance is a visual attestation, not guaranteed by a prompt;
missing or low-confidence observations remain unverified. Explicit numeric brief
bounds also retain the existing measured-layout check. No universal margin is
invented and no additional paid review agent is introduced.

The dedicated Studio now supports square posts, Stories and 1200 × 627 LinkedIn
posts on its tested generation path. Other formats retain their existing entry
points; this update does not enable untested workspace features.

Preserve saved job contracts, artwork, reviews and costs, including runs that
were already in progress when this policy was recorded. Adopt the new policy
in newly pinned jobs; do not retroactively change historical outputs.
