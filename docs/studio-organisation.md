# Image studio: saved items and organisation

Implemented 20 October 2026 for the shared Duroflex/Sleepyhead image interface.

## User-facing actions

- Bookmark icon on project cards and the selected creative: add/remove a favourite.
- File menu: Save, Rename, Duplicate, Campaign & tags, Shortlist, Move to Trash.
- Favourites sidebar: Favourites, Shortlist and Saved items tabs, with search.
- Trash sidebar: inspect removed projects/creatives and restore them. Moving to Trash also offers Undo.
- Workspace search: current brand, campaign/project name, SKU/product data, creative filename, asset filename/name, tags and status.
- Project search/filter: campaign, SKU, tags, status and recorded project information.

## Persistence and source boundaries

This front-end phase uses browser-local organisation storage (`studio-organise-v1:<brandId>`), consistent with local studio drafts. It persists through reloads in the same browser/origin, but is not server-backed, team-shared or cross-device synced. Clearing site data removes these local labels/bookmarks/copies/trash records. Original server jobs, files, reports and ledgers are not modified.

Trashing is reversible visibility metadata; it never deletes source files. A trashed project hides its children from active collections. Restoring it does not restore a creative that was separately trashed. No automatic expiry or permanent-delete action is introduced. Existing direct file URLs/current studio remain available because originals are retained.

Generated-project and creative duplicates are linked artwork copies: independent names, tags, saved/favourite/shortlist/trash metadata; shared original image bytes and historical review evidence. They carry `sourceJobId`; opening the existing editor/report uses that original source. The copy is not a newly generated job and does not copy billing into the ledger. The existing editor preserves originals through its separate revisions; this pass does not add an independent duplicate editing-document engine. Draft duplication makes a separate local draft and retains source-project references for local attachments.

Project/campaign naming is organisational metadata over the saved job. For a local draft, rename updates the draft itself. A favourite or shortlist never means artwork approval or training preference.

## Recovery and safety

- Separate brand namespaces; copy rejects a different-brand source.
- Exact creative key includes project, placement, route, version and image hash/URL.
- Original option indices remain stable when a creative is hidden.
- Quota/write failures leave the old stored state and open form intact.
- Revision checks reject stale writes from another tab; Reload organisation is offered.
- Corrupt organisation data remains untouched, with an explicit recovery message.
- Missing source items remain represented in saved collections rather than silently deleting metadata.
- Bookmarking while composing a review note preserves the unsaved note.
- Names/tags are escaped as text; search handles Unicode and treats punctuation literally.

## QA

Tests: `studio-ui.test.js`, `studio-ui-browser.test.js`; plus existing shared editor/campaign checks and recorded brand replays. Evidence and scoped before snapshots: `work/studio-organise-20261020/`.

No paid generation is used. Video, copy-writing and adaptation view implementations are not changed by this pass.

### Executed results

- Final focused organisation/home/search suite: 10 tests passed.
- Existing shared editor/campaign suite: 68 tests passed.
- Both-brand recorded handoff replay: zero failed stages, zero outbound or paid calls.
- Broad UI run passed 28/29 before correcting an ambiguous locator in the new parent-Trash test. That test and all organisation cases passed in the final focused rerun. The initial home search assertion was also updated to choose the project result now that search includes creatives.
- Screenshots of Projects, Favourites, file actions and Trash inspected at 1512 px in a disposable browser context. Production job files were not changed.
- `versionsView`, `writingView` and `videoView` match the pre-pass snapshot.
