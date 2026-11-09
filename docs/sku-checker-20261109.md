# Stricter SKU product check (9 November 2026)

User request: make the product-accuracy checker stricter — give it three photos of the exact
product from different angles, run the same check on AI edits (≈ ₹2–3 extra per edit accepted),
and fix the oversized review requests seen in today's live run.

## Original symptoms

- Live job `creative-9a98148d-0e47-41f6-8533-ae9038b7d0bc`, stage `lean-review`: one review wrote
  11,296,431 bytes and the socket dropped after ~314 s (`UND_ERR_SOCKET`, charge unknown); another
  failed with `ETIMEDOUT` after 343 s; another stopped with "Reasoning reference transfer failed
  before paid dispatch (23)". The staged CDN URL was rejected at preflight, so the request fell back
  to inline base64 pictures: finished artwork (~3.0–3.1 MB PNG) + three SKU photos + the original
  artwork for the correction check, all full size.
- The main Studio reviewer already received up to three product photos, but they were labelled only
  "product reference" and the product requirement was the plain appearance text.
- AI edit versions were never checked.

## What changed (new jobs only, pinned `skuCheckVersion: 1`)

`lib/creative-ai/lean/sku-check.js`, wired in `runtime/lean-workflow.js`, `lean/visual-review.js`,
`runtime/lean-edits.js`, `runtime/lean-policy.js`, `runtime/provider-config.js` and
`public/creative-ai/editor-image-only.js`.

1. **Three angles.** At planning, each record stores `skuCheck`: up to three distinct exact-SKU
   photos (identical bytes count once; resized twins were already removed by `leanReferenceVersion 1`),
   the logo when the page needs it, and any technology picture, each bound by SHA-256. Fewer than three
   photos: the check uses what exists and records a note. The reviewer is told the photos are angles of
   one product, and the product requirement now asks for shape/silhouette, colour, fabric/pattern,
   quilting/stitching/border, proportions, visible construction, real printed markings, and flags extra,
   duplicated, swapped or wrong products. Unchanged: no dimension/firmness/hidden-layer inference;
   uncertainty is `unable_to_verify`, not a defect.
2. **Smaller pictures.** Before a review or correction diagnosis, each picture's original bytes are
   hash-checked, then a smaller copy is made deterministically (artwork ≤1536 px, references ≤1024 px;
   JPEG quality 90 with full colour detail for opaque pictures, PNG when transparency is used). The review
   saves `reviewImages` with source and sent hashes, sizes and pixel sizes. If the pictures still exceed
   6 MB, the unit stops with `REVIEW_PAYLOAD_TOO_LARGE` before any paid request. Correction regions are
   0–1000 normalised, so shrinking does not move them.
   Measured on today's live files: a normal review drops from 7.3 MB to 1.1 MB of pictures, and the
   correction check from 11.3 MB to 1.5 MB.
3. **AI edit check.** After a new edit version is saved, one `gpt-6-luna` (medium) request compares it
   (image 1) with the version it came from (image 2), the product angles and the logo: product identity,
   no extra/wrong products, logo intact, no invented wording, and wording outside the request unchanged.
   The user's note and pin comments are passed as the intended change. Result on the version:
   `passed`, `unsure` (some details could not be confirmed), `flagged` (plain evidence) or `unable`.
   It never makes the version Ready or `qualityVerified` and never corrects it. The receipt goes on the
   child budget (cost ledger), `maxProviderRequests: 1`, and the same Send never buys a second check.
   A failed check, a brand mismatch or a Studio restart during the check leaves the version intact and
   records `unable`; nothing is re-sent. Designs planned before this change use their saved references
   (same bytes once, at most three).

## Historical records

Records without the pin keep their saved contract, wording and full-size pictures, so in-flight and
earlier requests keep the same request identity. Edits created before this change stay "Not checked".
The experiment-only check in `visual-review.prepare` (exactly one product photo, or two with the logo)
is unchanged; it serves saved experiment runs, not the Studio.

## Other calls

- Planning (`lean-planning`) sends the same three SKU photos inline: about 3.2 MB in the live job. It was
  not shrunk in this change, to keep planning request identities unchanged.
- Image calls (`gpt-image-2`) send pictures by verified CDN URL or multipart, with request bodies of
  about 6.5 KB in the live job, so the inline base64 size problem did not apply to them.

Tests: `tests/creative-ai/sku-check.test.js` (both brands) plus updated AI edit tests and browser test.

## Label close-up in generation (redo run, 9 Nov 2026)

The checker flagged the Posture Perfect label on every image. The real label is a larger angled navy badge; gpt-image-2 kept drawing a small rectangular tag because it only saw whole-product photos.

New lean jobs pin `labelGenerationVersion: 1`:
- When planning found the label, the same deterministic close-up the reviewer gets is sent as the last image of the generation request.
- The prompt names it ("enlarged close-up of the genuine product label…") and asks for the same shape, angle, proportion, colours, position and wording.
- Brand isolation re-crops it from the exact product photo in the same request and accepts only identical bytes.
- No label found, or an older job: nothing changes.
- Tests: `lean-label-layout-checks.test.js`, `technology-isolation.test.js`.

## Technology picture "bytes changed" (same run)

The A+ technology panel was refused as "the technology picture bytes changed", although the re-made picture was byte-identical. The engine gave the brand-scoped provider a cut-down brand object without the product library, so the check could not re-make the picture at all. The provider now reaches `brands.products`, and a missing library is reported as "cannot be checked". The regression test drives the engine's own provider for both brands.
