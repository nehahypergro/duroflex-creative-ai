# Editable elements library

The Elements panel now adds circles, ellipses, triangles, rounded rectangles, lines, arrows, reusable text badges and six generic feature icons (delivery, location, phone, sun, leaf and care).

All new graphics remain document objects. The shared Fabric renderer handles their fill, optional two-colour linear/radial gradient, opacity, border, dimensions and rotation. Layer ordering, grouping and arrangement use the existing editor controls. Badges retain editable labels, registered fonts and solid/outline/pill/circle treatments. Icon geometry is authored as bounded vector paths rather than external SVG uploads or generated bitmap assets. No paid generation is required for this library.

## Brand-scoped presets

`config/editor-element-presets.json` stores three reusable badge recipes per configured brand. Colour values are frozen into the saved object when inserted:

- Duroflex primary colour comes from that workspace's approved logo metadata. Its visual-world guide remains draft and is not promoted to approved badge guidance.
- Sleepyhead orange `#F15A22` and charcoal `#414042` come from its own supplied guideline reading, `doc-7e4d8861-d4c9-4d88-adc4-618e5bde1b10`. White is interpreted from the supplied RGB; the recorded printed-hex discrepancy remains disclosed in the palette source note.
- Badge layouts and generic icon designs are proposed editor templates, not approved brandbook assets or evidence for product claims. Default labels avoid warranty/certification/efficacy promises.
- Absent, superseded or draft palette sources do not authorize a borrowed brand palette. An applicable approved same-brand logo colour can be used; otherwise the editor offers neutral custom templates.

These presets do not alter brand manifests, research pointers, training memory, old artwork, provider costs or generation budgets.

## Compatibility and validation

New document fields are `shape`, `iconId`, `opacity`, `gradient`, `badgeShape`, `presetId` and `lineWidth`. Validation restricts primitive/icon IDs and gradients to bounded numeric values and six-digit colours. Arbitrary paths, external URLs and unknown gradient fields are rejected. Existing documents keep their old renderer path when no new shape/style fields are present.

The resources response advertises the new element-library version. Expanded insertion/style controls remain hidden until the server supports the new document fields. This avoids presenting unsupported edits during the interval before the next safe server restart. No live server was restarted for implementation or testing.

Tests use isolated Duroflex and Sleepyhead fixtures. They cover all primitive/icon/badge insertion, brand-source isolation, bad inputs, gradient and opacity persistence, size/rotation/borders, exact editor-to-PNG export equality, JPEG export and mobile bounds. Existing grouping, spacing, toolbar and chat tests provide shared-control regression coverage.
