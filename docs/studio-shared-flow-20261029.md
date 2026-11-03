# Shared Studio flow — 29 October 2026

The brief, brief review, project workspace, progress and individual image screens share the existing light Studio language. Keep the brand logos and navigation shell. Do not introduce a separate visual theme for each new feature.

## Screen contract

- Brief: Back, Draft status, title, brand/SKU and a compact Brief → Review brief → Create indicator. The approved one-page intake remains intact. Confirmation advances the indicator; it does not dispatch generation.
- Review brief: same context, typography and surfaces, with the review step highlighted. Existing validation, edit links and confirmation snapshot remain authoritative.
- Saved project: stable project name, brand/SKU and recorded stage. Artwork and Progress are sibling views; Submitted brief opens a read-only summary in the same workspace.
- Image: keep project context and Back to project. Image-specific title, Edit and Download actions sit above the existing artwork and review findings. Selected versions and download handling are unchanged.
- Editor: same white/light-purple surfaces, purple actions and muted text. Keep the existing editing controls, save protection and contextual return route.

The only project status names remain Draft, Creating, Ready and Needs attention. Planning, Generating images and Checking images are secondary descriptions. Per-image findings remain separate from project availability.

## Implementation boundaries

`unifiedFlow` in `public/creative-ai/studio.js` applies shared presentation and retains the existing action nodes/listeners. It does not change raw job status, requirement snapshots, provider calls, budgets or dispatch. Submitted briefs are read-only; no historical request is rewritten. Stage indicators are not permission to skip validation or start generation.

Shared presentation lives at the end of `public/creative-ai/studio.css`, scoped to `.studio-flow`, `.flow-*` and `#editableDialog`. Add future screen elements using these conventions instead of separate header/spacing/action styles. Main headings use 22–30 px, section headings 18 px, supporting text 12–13 px, 14 px surface radii and restrained borders.

## Validation

- `studio-unified-flow-browser.test.js`: both brands, brief/review context, project navigation, read-only submitted brief, image return route, 1366/1063/768/390 px overflow checks, and no job writes.
- Existing campaign review, compact intake and four-stage browser checks.
- Existing editor interaction checks now load the same Studio stylesheet, covering both fixture brands, text editing, nudge, undo, guides, zoom and snapping override.
- Model checks cover confirmation invalidation, navigation, four stages and polling.

Visual inspection uses isolated fixtures and saved brand libraries. The live browser currently requires sign-in; authenticated production-session verification remains separate. No server restart, artwork generation or production job mutation was performed for this UI pass.
