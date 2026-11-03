# Demo image recovery — 29 October 2026

Reported symptom: Home's decorative image stack showed large “Preview unavailable / Retry this image” controls. Reopening Home loaded the same three saved image URLs successfully, so a persistent missing file was not established. The generic image error UI was incorrectly used inside decorative cards.

Changes:
- Retry a failed local image request once, without calling image generation.
- If a decorative Home image remains unavailable, use its same-brand saved product reference. Remove the decorative card if neither source loads; never show interactive errors inside this aria-hidden ornament.
- Keep failure and retry controls for actual artwork. Never substitute a product reference for a creative in review.
- Clear stale failure notices after an image successfully loads.
- Show authenticated account identity and access level instead of the misleading “Local preview / Login not connected” label.
- Bound optional browser-cache restoration; an unresponsive cache cannot hold loading indefinitely.
- Allow Home, library and brief entry after essential library data loads while project history continues. Label pending history explicitly and protect typed work from background refresh.

Verification: the new image recovery browser regression failed before the fix. Eleven checks passed covering both brands' temporary/permanent failures, decorative fallback, real artwork errors, authenticated labels, delayed history, protected typing, Home continuation, autofill and workspace-cache isolation. The cache test fixture was corrected to supply sessionStorage on window, matching production access.

Live diagnosis found repeated Node heap exhaustion while reading saved history. The job list expanded all saved raster references, and read-only project/editor access checks repeatedly hydrated the same image data. Metadata-only reads now cover history lists, authorization checks, project views and edit summaries; generation reads retain full hydration and integrity checks. Existing account and brand guards forward these options while preserving access restrictions.

Additional verification: 13 metadata/access checks, 54 runtime/editor/refinement/brand checks and 3 saved-edit delivery checks passed. Reading all 308 saved job metadata records completed in 108 ms using a 256 MB heap limit (177 MB measured heap), without loading their raster bodies. The main authenticated Studio was gracefully restarted after confirming no active jobs; its persistent database and saved work were preserved.

No image generation, provider changes, account changes or historical job edits were performed.

Read-only strategy and review-package summaries also use raw metadata. Ten metadata/stage/guidance checks passed, including a missing-raster regression proving that viewing projects does not require generation reference bytes. Three saved project views completed in 32–78 ms under a 256 MB heap limit.

Live verification on main port 1842: authenticated Home restored saved project history, brand switching worked for Duroflex and Sleepyhead, all three hero images loaded for each brand, and the final Duroflex viewport had zero failed or pending images. The same restarted server remained running after both brand checks, at approximately 858 MiB RSS instead of recurring 4 GB heap exhaustion. Screenshot: `work/demo-readiness-20261029/duroflex-home.png`. This pass did not perform new paid generation; historical generation/review statuses remain visible.
