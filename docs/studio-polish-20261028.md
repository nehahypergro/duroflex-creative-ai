# Studio polish — 28 October 2026

Both brands share these interface changes. No provider calls, job resets, worker restarts or historical edits were made for this pass.

## Added

- Category expansion animates gently in place, preserving the scroll position where page height permits. Reduced-motion preference skips animation.
- Product picker focuses search, supports arrow navigation and Escape, and dismisses only on a completed outside click. Selected products and asset presets have visible selection feedback; existing full-card actions are reused.
- Submission immediately shows “Starting…” while retaining the existing duplicate-request guard and request identity.
- Canvas zoom buttons keep the selected object in view. Ctrl/Command + wheel zooms around the pointer. Oversized canvases remain scrollable to every edge; Fit restores the full canvas.
- Alt/Option during dragging bypasses snapping temporarily, without turning off guides permanently.
- Project headings support click-to-rename, Enter/Save, and Escape/Cancel. Explicit draft names survive subsequent autosaves. Existing browser-scoped saved-project organisation is reused; this does not introduce team-wide rename syncing.
- Reference images can be dropped or pasted into Your brief. Existing file validation, per-file errors and device storage are reused. Text paste is unchanged. PDF/Word use Brief documents. Reference uploads retain their existing library-processing requirement.
- Brief disclosure state and scroll position are remembered. Restored briefs announce restoration. Existing autosave, unload saving, manual-input priority and account document sync remain.
- Left/right arrows browse review images without intercepting typing, dialogs or modified shortcuts.
- Image purpose displays recorded slot purpose or saved concept takeaway. Missing intent is not invented.
- Interrupted image reviews expose the existing scoped retry-checks endpoint, with explicit charge notice and duplicate protection. Originals, other images and historical checks are retained; whole-set checks may be refreshed by the existing recovery engine.

## Existing behaviour retained

Search by product/campaign/channel, contextual Back navigation, current selected/edit previews, download preparation messages, human-readable filenames, ordered image-set delivery, partial-download recovery, saved drafts, original/edit comparison, and project workspaces.

## Recovery boundary

Preview reload, failed reference upload, failed export, interrupted review checks and missing PDP images have their existing scoped recovery paths. Generic regeneration of an arbitrary missing image in every non-PDP format is not implemented by this UI pass; the existing new-paid-attempt flow remains explicit. No global retry button silently reruns a whole project.

## Verification

- Targeted browser and model checks cover both brands, real saved product libraries, editor snapping/zoom, selections, rename persistence, reference paste/drop and independent failure, draft restoration, image keyboard browsing, download revisions, reduced motion and navigation.
- Layout checks at 390, 1024, 1280 and 1366 pixel widths; saved screenshots visually inspected.
- Tests use isolated browsers and simulated review/upload responses; no paid recovery or generation performed.
- Evidence: `work/polish-20261028/`.
- All 308 previously saved job files match the prior hash baseline. No queued or running jobs were present.
