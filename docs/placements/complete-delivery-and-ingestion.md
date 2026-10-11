# Delivery, commercial handoff and source ingestion

Implemented in the dedicated Duroflex/Sleepyhead studio on 9 October 2026. Every action names the saved brand and retains original files, hashes and historical creative reviews. These workflows do not call paid generation or reasoning, publish campaigns, send email or place print orders.

## Where to find the tools

| Task | Studio location | Result |
|---|---|---|
| Static delivery | Saved project → Delivery & production → Build email / native / static package | ZIP with selected original images, available saved copy/review companions, hash manifest and check report |
| HTML emailer | Same builder → Responsive HTML emailer | Responsive table HTML, live copy, alt text, CTA, adjacent qualifier, sender address, unsubscribe link and plain-text fallback |
| Publisher asset set | Same builder → Native publisher asset package | Selected source images/logos, separate fields in JSON/CSV, frozen placement contract, actual file/dimension/count checks |
| Print/outdoor | Saved project → Print & outdoor handoff | Frozen vendor contract, design master, available calibrated proof/preflight, vendor files, release checklist and optional actual ICC-converted CMYK PDF |
| Process brand originals | Brands → Asset library → Process originals / link exports | Local metadata, bounded actual previews, or explicitly linked same-brand export/transcript |
| Turn a saved note into a preference | Brands → Training & preferences → Review feedback & save explicit preferences | Separate, scoped preference with exact feedback/image provenance; original thumbs and notes remain stored-only |

Choose Duroflex or Sleepyhead before opening its library. The dialog confirms the destination. A stale brand, file hash or preference revision is rejected. Processing or annotating a source invalidates that brand's current research pointer; refresh its research before the next brief. Historical jobs keep their previous knowledge, review status and budgets.

## Delivery packages

Static packages preserve the actual selected bytes. Packaging does not crop, resize, recolour, re-review or upgrade a flagged image. Uploaded images need explicit content approval and drafts remain pending. Missing saved companions remain visible as pending checks. Each build gets a new filename and manifest.

Email copy is supplied separately from the hero. The template uses a 600 px maximum-width table, inline text styles and a mobile width rule. Essential copy remains live HTML. Local preview HTML uses the bundled hero; send HTML exists only when an absolute HTTPS hero URL is supplied. That URL is operator-supplied: the app does not upload the file or independently verify that the hosted bytes match. Confirm hosting, links, clean hero, image-off reading, copy/claims and real target-client rendering before sending. Sender and unsubscribe fields are inputs, not fabricated brand contact details. This is a handoff template, not an ESP campaign or a certified Outlook/Gmail rendering result.

Native contracts include Google RDA, Demand Gen and Performance Max plus the catalog's LinkedIn, Pinterest, X and Reddit copy profiles. The builder shows field lengths and variation counts from the selected contract. Google asset-set checks cover actual required image quantities, aspect ratios, minimum dimensions, conservative PNG/JPEG file limits and a recorded clean-image check. Publisher previews, combinations and counting must be checked at the destination. Unicode counting is pending when the platform's algorithm is not established. Hard limits are ceilings, not suggested copy length. Use the placement guide's reading hierarchy and actual-size review as well.

The image picker packages saved raster/SVG sources from the selected brand; it does not author native documents, video or editable source files. A document-only contract cannot be satisfied by an empty image set or a PNG substituted for PDF. Unsupported mandatory measurements remain pending. CSV is a formula-safe field handoff, not a universal Ads Editor import file. JSON retains exact supplied strings. Contract unknowns are included in the frozen contract. A prepared package does not claim publisher acceptance.

## Commercial print and outdoor in India

India is the main market; there is no universal India printer profile, stock, bleed or outdoor PPI. Obtain the actual operator specification. The vendor form records operator name, specification reference, substrate/GSM, finishing, final dimensions, bleed, safe margin, hardware keep-outs, required finished PPI and accepted file type. Upload the actual vendor template and CMYK output ICC into this brand's library. Saved vendor records freeze those files' hashes; changed requirements need a new record and new handoff.

The handoff checks the complete saved print set against that contract: trim, bleed, actual effective source PPI, creative readiness and pinned planning margins. These checks cannot establish actual fold, die-cut, mounting, seam or eyelet clearance. Record a real full-template comparison. Artwork failing the operator's PPI is blocked; conversion or resampling does not create detail.

For a vendor accepting CMYK raster PDF, upload its unchanged CMYK printer-output ICC. The app converts actual raster pixels with Pillow/LittleCMS using the recorded rendering intent and black-point compensation. It embeds the selected profile as output intent, retains physical PDF boxes/UserUnit, and records input-profile assumptions. Sources without an embedded profile use explicitly labelled assumed sRGB. The RGB master remains intact. Merely attaching an output intent would not perform conversion; this workflow performs both operations. See [Adobe's output-intent explanation](https://helpx.adobe.com/ca/acrobat/using/output-intents-pdfs-acrobat-pro.html).

The converted file is raster CMYK, not certified PDF/X, editable vector typography, imposed signatures or a certified dieline. A vendor requiring those outputs blocks this handoff and needs a prepress-authored production file. CMYK pixels use JPEG encoding; conversion does not increase source PPI or guarantee printed colours. Do not substitute a generic system ICC for a commercial vendor profile.

Physical findings are a separate immutable record bound to the exact final PDF hash and frozen vendor contract. Check actual-size/installed coverage, a measured 50 mm calibration line, readability at observed distance and dwell time, substrate/colour/finishing, template match and large-page RIP support. The calibrated packet bundled from the original print workflow proves geometry of the RGB design; colour acceptance must cover the final converted CMYK bytes. RGB colour approval does not transfer to CMYK. Even complete recorded findings leave manufacturing release with the operator. No physical proof or printer approval has been performed by this implementation.

## Asset processing and feedback

| Original | Implemented extraction | Explicit limits |
|---|---|---|
| TTF, OTF, WOFF, WOFF2 | Family/name/licence strings, glyph/Unicode coverage, embedding bits, variable axes and actual glyph specimen | Not installed or automatically applied; licence strings/bits do not constitute usage clearance |
| PSD | Actual flattened composite and up to 1,000 layer names | No editable layer delivery, smart-object execution or font-fidelity certification |
| PDF-compatible AI | Actual first four artboards and available native text | Non-PDF AI is unsupported; Illustrator editing/layer semantics are not parsed |
| MP4, MOV, WebM | Metadata and at most six actual sampled frames from the first 60 seconds | No complete video, motion or speech inspection |
| MP3, WAV, M4A, audio in video | Metadata and first-30-second peak waveform | No automatic speech recognition; waveform is excluded from model visual-style references |
| FIG, INDD, EPS, other proprietary sources | Retained original plus explicit same-brand PDF/PNG/SVG export link | Original remains unparsed; upload an export separately |
| Supplied transcript | Versioned source-bound text annotation | Labelled user-supplied, not automatically recognized or verified |
| ICC/ICM | Signature/size validation; CMYK printer-class check when selected for a vendor | Production profile, not a creative-style reference |

Processing runs locally, serially through the API, with time and pixel bounds. Failure retains the original and reports the missing/unsupported decoder; it does not label the asset processed. Successfully processed previews and metadata can inform this brand's next research refresh under the source's existing draft/advisory authority. They do not substantiate product claims, train model weights or automatically approve a creative.

Feedback review requires a deliberate action: select a saved note, write the reusable preference, choose brand/product/placement/product-and-placement scope, and save it to the named brand. The note and image are unchanged. The new preference records the image hash, prior review status and source feedback ID, with quality approval explicitly false. Flagged images can illustrate a requested correction without becoming approved learning examples. Preferences cannot override brand rules, evidence or critical checks.

## Local setup and verification

Node dependencies remain in the dedicated studio. Python decoders are isolated in `work/asset-ingestion-deps`; the bundled Python provides the baseline PDF/Pillow tools. To reproduce the pinned decoder setup from the standard registry:

```sh
cd /Users/neha/Desktop/Duroflex-Creative-AI
/Users/neha/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/creative-ai/setup-asset-ingestion.js
```

Set `CREATIVE_AI_PDF_PYTHON` if using a different Python runtime. Installation uses binary wheels and fails explicitly if unavailable for that platform. The requirements file pins the tested versions. Extraction is enabled only by the explicit action; saving originals alone is not processing.

All 348 regression tests passed (13 handoff tests). Verification uses synthetic isolated fixtures and actual file decoding: preservation of image/review/budget state; email HTML escaping and live/plain-text copy; native counts/ratios/lengths; brand and stale-hash rejection; explicit feedback provenance; real font/media decoding; export links; vendor geometry/PPI; and actual CMYK pixels/output intent/physical PDF boxes. Fixture attestations test validation only and are not physical observations. No paid model calls occur in these tests.

The live studio also built a new static package from both existing Meadow story outputs. They remain unchanged. See `work/complete-handoff-browser.png` and the saved project's Delivery & production panel.

Publisher sources: [Google RDA](https://support.google.com/google-ads/answer/17090561), [Demand Gen](https://support.google.com/google-ads/answer/17091672), [Performance Max](https://support.google.com/google-ads/answer/17091269), [Mailchimp image guidance](https://templates.mailchimp.com/design/images/). Existing placement research and the static guidebook retain the broader source inventory.
