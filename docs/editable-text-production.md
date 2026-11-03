# Design-first editable text

New Studio requests and new advanced-form requests use `editableTextVersion: 1`, `editableCanvas: true`, and the existing post-image measurement workflow. Historical jobs retain their saved renderer. The isolated experiment remains available under its original version and checkpoint names.

## What the user receives

The generated visual contains no added campaign wording or campaign logo. Physical SKU markings remain part of the referenced product. Fabric renders the final approved wording with the selected brand's saved font files and adds the original logo when the placement calls for it. Text, logo, background and the original assembled version are saved separately. Moving text does not require erasing letters from the background.

Image-only assets have no invented heading, product name, CTA or button. Native publisher text stays outside the artwork. Product, technical, lifestyle, graphic and brand-only treatments retain their own purpose.

## Responsibilities in the existing workflow

- Strategy uses the selected format's pinned treatment: visual priority, communication purpose, reading order, copy density and actual viewing context. PDP prioritizes buying clarity; emotional appeal is not a universal requirement.
- Creative direction develops the subject, negative space, alignment and contrast together with the idea. It does not invent final wording or independently place final text.
- Copy supplies the exact embedded fields and mandatory qualifiers. Instructions and native fields are not painted onto the image.
- Initial art direction plans the scene and hierarchy. It does not produce the old role-only editable layout.
- Final art reconciliation binds every final embedded field ID to one box, font, size, colour, alignment and treatment. Repeated roles have distinct boxes. The same response reconciles subject placement and quiet areas. There is no additional strategy/layout model call.
- The image renderer receives the final reserved boxes, visual direction, placement constraints and scoped references. The composition is not forced into an interior photograph when the brief calls for a technical or graphic asset.
- Fabric assembles the result and measures actual glyph bounds, contrast and safe areas. It does not silently impose the old fixed grid or shrink wording to pass.
- One assembled-image review sees the actual output, exact logo, product references, placement, strategy and final art intent. It can propose one overlay adjustment batch, preserving wording, font identities and the background. Corrections are rendered and measured before being accepted. Unresolved background or product defects remain visible.

Shared implementation: `lib/creative-ai/runtime/editable-composition.js`. Brand fonts, logos, research and SKU evidence remain separately scoped. The treatment repository remains the authority for format-specific guidance; this module defines the rendering handoff rather than duplicating a catalogue of placement rules.

## Reliability and evidence

- Reconciliation checkpoints bind the layout to the final art hash and brand. Stale wording/layouts are rejected for the affected unit.
- The background request is pinned before image dispatch. A changed visual plan cannot silently reuse the old background or trigger another paid dispatch under its old identity.
- Available saved backgrounds are reused on resume. Existing provider dispatch/reservation safeguards remain in force; an ambiguous provider response is not automatically resent.
- A missing overlap entry is reconciled against rectangles actually observed by the reviewer. This supplies missing bookkeeping, not invented visual evidence. Remaining overlaps stay unresolved. Raw model responses are retained.
- A returned but invalid correction is processed locally, outside provider retry validation, so its real reason remains visible rather than being hidden behind a retry-limit error.
- Brand-only and empty-text review schemas do not force imaginary products or invalid empty enums.
- Reading-size advice follows the pinned placement, not a universal phone width or short-edge font rule.
- Saved edits, original versions, review flags and ordered collection delivery continue through the existing editor/export paths. Corrected pixels are not falsely described as having received a second vision review.

## Verification boundary

Isolated tests exercise both brands, twelve format variations each, final reconciliation, clean-image dispatch, assembly, review, save, reopening, export and idempotent resume. Additional shared regressions cover the editor, exact wording, placement provenance, collections, PDP/carousel delivery and print proof rebuilding. These use controlled provider responses and test images; they are not ten live generation scenarios per route or evidence of final artwork quality. New live generations still require inspection, and supplier/publisher acceptance remains separate.
