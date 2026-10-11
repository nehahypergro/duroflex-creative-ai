# Saved creative workflows

Available in both named workspaces, beneath each saved creative and in image review. Campaign packs are available under Campaign handover.

| Action | Behaviour |
| --- | --- |
| Preview in placement | Shows the complete saved artwork in an illustrative story, feed, email, website, display, print or outdoor context. Matching saved channel copy appears beside the selected version. Actual publisher crops and physical proofs remain separate. |
| Write accompanying copy | Writes channel fields for Instagram, Meta ads, email, website or LinkedIn. The selected brand's current research and exact product facts supply the evidence. Writing and independent copy checking use text models. No artwork regeneration. |
| Edit copy | Edits the saved artwork's exact fields. Creates a separate immutable revision of only that creative, with the same SKU policy and pinned client scene preferences. Uses text and image models, with at most one correction. |
| Translate & localise | Creates a separate language version. Faithful translation or market phrasing must preserve identity, product facts, qualifiers and numbers. The rendered script still needs inspection. |
| Compare versions | Shows complete images, wording and saved reviews side by side. Explicit selection changes the current creative; restoring the original preserves all later history. Concurrent stale selections are rejected. |
| Export campaign pack | Builds a saved ZIP with selected current artwork versions, UTF-8 artwork copy, matching checked channel copy and optional PDF / PowerPoint presentation. Original, PNG, JPEG and WebP image exports are supported. No model calls. |

Team edits to accompanying copy are saved as unchecked. Checked-only packs exclude these edits and copy needing attention. Flagged artwork is excluded by default; an explicit include-flagged option includes it with its existing review notes. Packing never upgrades a review.

Revised carousel slides invalidate the original full-set review. Revised print faces invalidate the original production proof in the current view. Historical originals and proofs remain saved. Use the Print & outdoor handoff for calibrated proofs and production files; campaign-pack artwork is a raster delivery.

Editing and copy writing require a finished campaign, matching current brand guidance and current research from that same brand. Older creatives without saved copy packages remain available for viewing and artwork export; start a current campaign to edit them. Requests retain their IDs for safe retries. Copy edits use optimistic revisions; interrupted copy requests do not automatically trigger another paid request.

## Endpoints

All are under `/creative-ai/api/jobs/:parentId` and validate the saved named brand:

- `GET/POST /versions`, `GET /versions/:id`, `GET /versions/:id/files/:name`
- `POST /selected-version` with route, placementId, versionId and expectedVersionId
- `GET/POST /publishing-copy`, `GET/POST /publishing-copy/:id`, `GET /publishing-copy/:id/download`
- `POST /campaign-pack` with delivery=link, then `GET /campaign-pack/:exportId/:format`

Feedback, static/email/native delivery and campaign packs resolve the exact current version. Usage receipts from revision jobs and accompanying-copy jobs enter the existing cost tracker and are deduplicated with other provider receipts. Reserved allowances remain separate from spend.
