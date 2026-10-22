# Production visual editor and local OCR

The shared editor is available from **Edit design** below each image (also available in image details) in Duroflex and Sleepyhead. No separate lab server is needed.

## Editing

- Select text on the artwork, or double-click to type. Contextual font, actual weight/style variant, size, colour and alignment controls appear above the canvas. Spacing and effects live under Text.
- Text side handles reflow the box. Corner resizing changes type size proportionally; it does not leave stretched text transforms.
- Text adds headings, supporting copy or an empty text box. Uploads adds PNG/JPEG/WebP files. Elements adds rectangles and CTA buttons. Position contains alignment, stacking, distribution, grouping, visibility and locks.
- Brand kit uses only the current brand's saved logos. Logo proportions remain protected.
- The font picker combines saved brand fonts with installed general fonts. On this Mac the library includes Arial, Georgia, Verdana, Trebuchet MS and Courier New with available regular/bold/italic variants. Fonts may also be uploaded. They are job-scoped editor resources, not new approved brand guidance. There is no unapproved-font warning. Real missing files or unsupported characters still produce actionable export feedback.
- General fonts are copied from `CREATIVE_AI_EDITOR_FONT_DIR` (default macOS supplemental fonts directory), so reopening does not depend on a system font remaining installed. Existing licensed local fonts are used locally; no new font subscription or download is required.
- Photographs support crop/reposition/zoom and replacement. Added images can be moved, resized and replaced. Photos stay a single layer; there is no automatic product/background object separation.
- Undo/redo, keyboard nudging, duplication, deletion, snapping, guides, Preview and original comparison are local actions.

## OCR conversion

Flattened creatives show a conversion screen. **Find campaign text** runs Apple Vision locally. It matches only embedded copy from that artwork's saved generation package; accompanying captions and incidental lettering are excluded. Duplicate, uncertain or mismatched strings remain unchanged. Matches and an optional operator-drawn logo region are previewed before conversion. Product names are not selected by default.

Conversion is hash-bound to the job, brand, exact source image and saved copy. Only selected match regions and the explicitly selected logo area are cleaned. Other OCR lettering is protected from cleanup expansion. Local harmonic interpolation fills removed regions and retains all unmasked decoded RGB pixels. No external AI service is used.

The replacement logo comes from the current brand's original saved asset. Type is reconstructed with real font files; it is not recovered original design metadata. Typography and repaired background detail can differ. Compare original and edited output before sharing. OCR requires macOS Apple Vision; if unavailable, adding overlays to the unchanged original remains available.

## Persistence and costs

Version 1 Fabric documents remain readable. Original documents and source artwork are immutable. Client revisions are separate files with optimistic revision checks; autosave and local recovery remain visible. Registered asset/font history retains all old references, including alternative photographs, so old revisions can reopen. Added objects are bounded and validated; arbitrary file references and cross-brand assets are rejected.

PNG/JPEG exports render the same document with the same fonts and images at its saved pixel dimensions. Manual edits, OCR conversion and ordinary exports invoke no paid API. Optional translation, copy rewrite and photograph regeneration require explicit actions and retain existing INR usage tracking. An OCR design must separate all copy and its logo before a paid photograph replacement, to avoid losing lettering still baked into the photograph. Historical creative review status is not upgraded by editing or export.

## Verification and rollback

`tests/creative-ai/editor-production.test.js` covers both-brand OCR and resource boundaries, incidental lettering, ambiguity, pixel preservation, general fonts, new images/text, immutable originals, history, UI undo/reflow/reopening and export parity. Existing editable-canvas tests cover effects, grouping, crop, missing assets/fonts, recovery, translation/INR and six digital ratios for both brands. Wider tests and saved-brand replay remain mandatory.

Pre-change source copies are in `work/editor-production-20261019/before/`. Those files are a recovery checkpoint, not a second editor implementation. The production feature lives in the shared runtime and `/creative-ai` UI. Retain created editable documents/assets and original artwork during any rollback; do not revert the entire dirty repository or delete historical job data.
