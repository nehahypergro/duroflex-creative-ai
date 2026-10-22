# Creative AI — static/image studio journeys

Scope confirmed 20 October 2026: image studio only. Video, copy/document and adaptation workflow implementations remain unchanged. Desktop web is the design target. This pass adds screens and recovery UI; it does not implement new generation engines.

## Journey

Home / format tile → one-page image brief (automatic readiness and INR estimate) → Generate → creation status → image options and rationale → editor → one-click download. Legacy confirmation URLs reopen the brief.

Projects, product/reference library, usage, unavailable links and wrong-brand access are supporting journeys. The **Image studio journeys** sidebar link opens 45 named screen states across 11 surfaces. Each has a user story and expected response in `studio-journey-stories.csv`. The walkthrough uses labelled examples; its actions do not save production projects, download files or start paid requests.

## Working screens and boundaries

| Screen | Available behaviour | Boundary |
|---|---|---|
| Brief | Existing one-page fields, scoped products/variants, local save and recovery | Generation submission remains in the current studio |
| Brief confirmation | Review request, audience, product and selected image deliverables | Cost estimate stays unavailable when not supplied; no auto-submit |
| Creation status | Read current saved status, refresh, open completed work or existing recovery flow | No invented ETA or duplicate generation retry |
| Review | Large selected artwork, option thumbnails, concise saved rationale, expandable evidence, ratings, image-specific notes | No invented historical rationale or approval |
| Editor | Opens the existing production editor for a saved image | The walkthrough contains a labelled layout demonstration, not a replacement engine |
| Download | Existing original/PNG/JPEG export, loading/error/retry feedback | Download does not approve or publish artwork |
| Projects/library | Existing scoped records and entry points; empty, loading and failure examples | No new ingestion or management engine |
| Usage | Existing recorded INR view; unavailable-data example | Missing usage never becomes zero spend |

Image scenarios include incomplete briefs, ambiguous variants, reference failures, conflicting saves, interrupted connection, requested input, generation failure, partial completion, missing rationale, missing image, editor preparation, missing assets/fonts, overflow, revision recovery, download preparation/failure/completion and wrong-brand access.

## Rationale and ratings

The two-column review prioritises one large artwork. Four design decisions cover message, layout, logo placement and scene/lighting. Saved review category scores are shown out of five: original 0–100 score divided by 20. A score needs an eligible saved method, observation and inclusion flag; missing or simulated evidence stays **Not rated**. Ratings are design review evidence, not conversion predictions. Review concerns remain attached when selecting or downloading an option.

The preview explicitly marks sample numbers/explanations as illustrative. Historical artwork does not receive invented annotation coordinates. Original saved reports remain available. New notes are scoped to project, placement, route and image version/source, inside the selected brand's browser storage.

## Verification — 20 October 2026

- 21 UI/model/browser test groups passed.
- All 45 states rendered for both Duroflex and Sleepyhead: 90 brand-state combinations. This is render coverage; it does not mean every future service is connected.
- Main image walkthrough, recovery navigation, desktop widths 1280/1920, saved review hydration, exact-option notes and export retry verified.
- 68 existing shared/editor regression tests passed.
- Recorded handoff checks passed for both brands with zero failed stages, mocked transport and no paid calls.
- Inspected local screenshots at 1512 px, including a real saved review with ratings 4.6/4.3/4.4/4.5 and its original review-needed status.
- Existing `versionsView`, `writingView`, `videoView` and backend `http.js` match the pre-pass checkpoint.

Three new UI regressions were reproduced before fixes: preview brief leaking across a brand toggle; rationale not appearing after an option switch during loading; and a rating appearing without a recorded evidence method. Tests now pass for each. One test synchronization issue was also corrected: the test waits for the new option to mount before entering its note.

Evidence: `work/studio-journeys-20261020/` contains before snapshots, failing-before logs, final test logs, saved-run results and visual captures. API spend for these mocked tests: ₹0. Development subscription compute is not estimated.

The older 42-feature roadmap and 102-case QA inventory remain separate and are not claims of new implementation in this image-only pass.


## Flow refinement — 22 October 2026

Shared implementation for Duroflex and Sleepyhead; no image-model or generation-policy changes.

- Format tiles open Quick Create directly. Readiness runs after a short input debounce, ignores stale responses and cannot dispatch generation. Generate is the explicit paid action. Its estimate uses comparable same-brand, same-size/model completed runs and the saved dated FX basis; unknown usage is excluded, not counted as zero. When no valid comparison exists, the UI says the INR estimate is unavailable.
- Readiness and validation errors stay beside Generate. Retrying an unchanged submitted brief retains the existing idempotency token. Viewing a saved multi-asset plan remains available; this UI work does not add unsupported generation profiles.
- Project covers use the chosen option and its matching latest saved editor revision. Covers have bounded, complete-artwork previews; unavailable previews retain their project and layer references. Sort, format filters, distinct empty states and concise run titles are available. Favourite is the only collection toggle; old shortlist metadata is retained but its action is removed.
- Download defaults to the latest saved editor revision and stays on the artwork screen. The compact options disclosure provides Latest edited version / Original and PNG / JPEG / original-file selection. Failed edit lookup blocks the default rather than silently substituting the original. Warning consent is bound to the precise revision and endpoint. Existing carousel/module ZIPs are explicitly labelled original sets; they do not incorporate editor revisions.
- Editor selection opens relevant text, button or positioning/crop controls. Advanced styling starts collapsed. Save conflicts now preserve HTTP 409 through the API, enabling inline Save a copy / Compare versions / Load latest. Recovery copies are immutable and separately listed in Versions; they never replace the concurrent saved revision or original.
- Export warnings, unsaved-close decisions and optional paid AI approvals use inline panels. Browser-tab close retains the browser's native unsaved-work safeguard. Manual edits, copies, previews and downloads make no paid AI calls.
- Selected options, favourites and draft organisation remain browser-local under the existing brand-scoped storage convention. Saved editor revisions and recovery copies are server-side. This is not a multi-user authentication implementation.

### Evidence

`work/studio-flow-20261022/` contains initial failing reproductions, targeted and full-suite logs, recorded handoff replay and live screenshots. `editor-flow-v2.test.js` reproduces and verifies concurrent-save recovery through the actual HTTP handler for both brands. `studio-flow-v2.test.js` checks direct Story entry, automatic readiness, selected edited covers, exported bytes, original selection, lookup failures and revision-bound warning consent. `studio-edited-delivery.test.js` verifies cache/revision guards, immutable originals/copies and brand isolation. `studio-estimate.test.js` verifies INR estimate provenance and unknown-cost handling.

The live studio was restarted only after verifying no queued/running jobs. Visual checks used an isolated browser, loaded actual saved previews for both brands, and observed no HTTP or JavaScript errors. No production briefs were submitted, no paid model calls were made and no historical reviews or costs were upgraded.

### Final validation result

- Complete offline suite: **804 passed / 809 tests**, with **5 unresolved readability-policy tests** in `tests/creative-ai/readability-fixes.test.js`. These consumers still gate on `2026-10-09.2` while the pinned policy is `2026-10-22.1`; no readability-policy code was changed in this UX pass. Do not describe the complete engine suite as green.
- All 35 Studio browser tests passed in the final suite, including the 60-case brief matrix and 30-case saved-art matrix across both brands. Editor canvas/export checks passed; the final targeted run additionally exercised cancellation of all three optional paid actions without dispatch.
- Recorded handoff replay: zero failed stages for either brand; no outbound provider calls. Live preview verification: both brand galleries loaded actual latest revision images, with zero observed HTTP failures and zero page errors.
- AI generation cost for these mocked/local checks: **₹0**. Development-agent/subscription compute is not metered here.

### Brand Library management — 22 October 2026

Manage library stays within `#library/manage`. Both brands share four scoped forms: replace approved logo, add reference, update source details/file, and register a font. Uploads identify the destination by brand name; saving never invokes paid generation or research. Source replacement retains old originals and records a version link. Future research excludes superseded sources, while historical resource links remain accessible and labelled. Source changes invalidate current research. Logo replacements retain archived files for existing creatives and update the active selection and brand switcher.

Logo cards use checkerboard transparency previews, practical background guidance and exact-file downloads. The white/charcoal two-tone variant has coloured-background guidance rather than claiming universal dark-background suitability. Typography combines each family, source, available weights, intended use and a sample loaded through FontFace from the scoped saved file. Missing files and failed loads never show a substitute as a real specimen.

Verification: 53 focused browser/storage/UI checks passed; both saved-brand replays had zero failed stages and no paid calls. Full offline suite: 809/814 passed; five pre-existing readability-policy tests remain failing. Evidence: `work/library-ux-20261022/`. Production brand manifests were not modified by the tests.

### Home entry points and recovery — 22 October 2026

- Campaign and Quick Create each have one entry in the Home composer; the repeated tool cards are removed. Format tiles immediately open the matching Quick Create brief and carry the prompt, selected saved product, audience and creative direction. Quick Create reuses a format already selected in the composer instead of asking twice.
- Unfinished Home inputs autosave separately for each brand in browser-local storage, independently of project briefs. Versioned envelopes survive refresh; stale-tab and corrupt-data writes are rejected without overwriting the stored draft. Storage failures leave inputs visible with a clear error. This is device-local recovery, not cross-device account syncing.
- Continue working appears before the composer. It prioritises drafts, work in progress and creatives needing review rather than the latest five jobs. One issue card remains visible, with further issues available in All projects, so historical failures cannot crowd out artwork. Cards use the selected option’s latest saved preview and link to the relevant brief, review, progress or issue screen. Historical review states remain unchanged.
- Edit a creative opens a searchable thumbnail grid of the current brand’s actual creatives, including latest saved edit previews. Choosing a thumbnail opens that exact option in the existing editor without an intermediate project-selection step. Unavailable/trashed records are excluded, and action dispatch checks brand and asset availability again.

Evidence: `work/home-ux-20261022/` contains failing reproductions for missing persistence and historical-error crowding, regression logs and live screenshots. Both brands’ live pickers loaded the first eight visible saved images with no page errors; no creative was generated or modified during inspection.

The existing unavailable-project browser test also reproduced a numeric `outputs` count being treated as an array when rendering Home. Format labels now inspect array types before reading deliverables; unavailable projects remain visible and recover through their existing issue screen. The test passes for both brand navigation and recovery. Older Home tests now target Continue working cards and the composer’s single Campaign help control rather than removed duplicate controls.

Final Home validation: **813/818 offline tests passed**, with only the same five pre-existing readability-policy failures. All Home and Studio browser tests passed, including the 60-case brief matrix and 30-case saved-art matrix. Both saved-brand handoff replays reported zero failed stages. Paid production API calls: zero; generation charges for these local/mock checks: ₹0 (development compute not metered here).

### Navigation continuity — 22 October 2026

- Primary navigation is Create, Home, Projects, Favourites and Brand Library. Profile navigation holds settings, usage and trash; advanced tools and journey previews remain secondary links there. The existing brand switcher remains in the persistent header.
- Switching brands preserves shared sections. Projects keeps its status/sort/search/format URL; Library preserves its tab while clearing product-specific filters for the new brand. Project, brief, artwork and other brand-owned detail routes land in the new brand’s Projects. No foreign project identifiers are reused.
- Hash routes carry context: `#projects?status=review&sort=newest`, `#library/products?q=sofa`, and `#library/inspiration`. Project search, sort, status and format, plus product category/search/sort/image filters, survive reload and can be shared with the existing brand query parameter.
- Return positions and opened-card anchors are saved in session storage per brand and route. Project breadcrumbs and Projects navigation restore the remembered list URL; browser Back and refresh restore scroll and focus with a subtle card outline. This is tab/device navigation memory, not account syncing.
- Create, tools, search, creative picking, product/reference details, artwork inspection and saved-brief selection use explicit routes reconstructed from data, never persisted HTML. Old temporary task links retain their safe parent fallback. Small forms and recovery actions remain inline. Missing/foreign detail references show an error instead of guessing another item.
- The existing canvas accepts a return label from its opener: Back to project, Back to creative or Back to creatives. Closing returns to the retained origin; picking a creative no longer discards the picker underneath the editor. Manual navigation does not dispatch paid generation.

Verification evidence: `work/navigation-ux-20261022/`. Tests cover both brand switches, filters and Unicode, native browser Back, remembered scroll/card, refresh from product details and brief deliverable selection, unavailable detail IDs, and the actual canvas return label. Live screenshots verify Projects, Products and Create for both brands without mutating production projects. Saved-brand replays report zero failed stages and zero paid calls.

Final navigation validation: **818/823 offline tests passed**, with only the same five pre-existing readability-policy failures. All navigation, Studio browser and editor-origin checks passed. Both-brand recorded handoffs: zero failed stages. Live page errors: zero for both brands. Production generation calls and charges for these local/mock checks: zero / ₹0; development compute is not metered here.

### Editor recovery and refresh continuity — 22 October 2026

The shared Duroflex / Sleepyhead editor now has a durable `#editor/<projectId>` route. Its query binds the creative route, placement, source image and return destination. Refresh resolves that creative inside the selected brand; unavailable or trashed records show a recovery link instead of opening another option. Closing returns to the originating project, creative or thumbnail chooser. Browser navigation waits for the editor's save/inline leave decision.

Local drafts use the existing creative-specific storage key. Successful local writes are reported as **Unsaved changes · Saved locally**; a failed write reports **Changes only on screen** and offers a JSON recovery download. Closing cannot claim a local backup when the write failed. Safe drafts restore on reopening; older drafts require the inline conflict choices, and malformed or foreign drafts leave the saved design intact.

Failed saves retain their submitted snapshot. Before retrying, a GET checks the remote revision. A matching acknowledged-late snapshot is accepted without another POST; a newer conflicting revision opens **Load latest**, **Compare**, and **Save my version separately**. Edits made while a save is in flight remain dirty and are saved next. Retry is bounded to three delayed attempts (2.5, 7, 15 seconds), with reconnection/focus and explicit retry checking the revision again. These are document saves only: paid AI actions are never resumed automatically.

Library tab changes now create history entries; filter URLs survive refresh and Back. Existing brand-scoped Home composer storage, Projects filter/scroll/card restoration and persistent complex task routes were retained and retested. Returning to the browser fetches fresh project details, with a short duplicate-event throttle. It does not replace an open editor, draft, task form, focused control or unsaved textarea; fresh data remains available on subsequent navigation.

Evidence: `work/editor-recovery-20261022/`. Browser tests use isolated fixtures and cover both brands; live checks are read-only. Historical outputs and billing records remain untouched.

### Sidebar and creative-screen rollback — 22 October 2026

At the user's request, the sidebar again exposes the six Create for category shortcuts beneath Home, Projects, Favourites and Brand Library. The standalone Create link is removed from primary navigation; its existing route and Home creation controls remain available. Settings, Usage and Trash remain in the profile area, and category help/collapse behaviour is retained.

The creative detail screen is titled Your creative and no longer renders What the review found or the expanded Review details disclosure. It retains the artwork, four design-intent explanations, saved ratings, notes and Edit/Download actions. This is a presentation change only: saved verdicts, edited-version status, generation review, export warnings and historical costs are unchanged. Earlier documentation about concerns preceding the scorecard describes the superseded interface.

Evidence: work/sidebar-review-simplification-20261022/. A both-brand browser reproduction failed before the change, then all three focused browser tests passed (navigation, simplified rationale and client language). Saved-run checks for both brands completed separately without paid generation.

The subsequent user request removes the non-clickable numbered journey strips from brief, recipe, output, download and preview screens. Breadcrumbs and functional actions remain; recorded generation progress is unaffected. Campaign, Quick Create and both-brand creative-screen browser checks all passed (three groups; step-strip-removal.log).

### Brand-switch responsiveness — 22 October 2026

Brand switching previously blocked the whole destination until the job list, every job detail/edit lookup, products and assets completed. A read-only live measurement recorded 14,474 ms for the first Duroflex load, 4,857 ms for the first Sleepyhead switch and 823 ms returning to Duroflex.

The shared client now keeps complete, brand-keyed workspace snapshots in memory for 30 seconds. A cached workspace renders immediately; older snapshots refresh in the background. After a successful foreground load, the other supported brand's metadata is warmed after 500 ms. Warm-up performs only existing read endpoints, never generation or image uploads. Concurrent workspace reads share a promise. Failed/partial loads are not recorded as successful snapshots, explicit reload/creative edits/generation clear caches, and product/library writes invalidate that brand's workspace. Focus refresh and job progress update cached project data. Invalidated requests cannot repopulate the cache. Epoch checks prevent a late other-brand response from changing the current workspace, and background renders preserve active forms/editor/navigation.

Live verification after the other brand finished warming: Sleepyhead switch 80 ms; Duroflex return 46 ms. First full Duroflex load remained 16,443 ms; this is not a cold-start improvement or a universal latency guarantee. Evidence: `work/brand-switch-20261022/live-after.json`. Browser regressions cover delayed refresh, rapid switching, brand isolation, newly typed Home input, route continuity and saved product covers; unit checks cover expiry, coalescing, failure retry and invalidation. Saved-run replay remains provider-free and does not change historical creative verdicts.

### Design details ready with artwork — 22 October 2026

Projects containing artwork now load their saved rationale/review details in parallel with saved-edit metadata before returning the project to the UI. Completion polling does the same when generated images become available. The options screen renders these attached details immediately and does not issue another details request on open or option switch. No model call or new review is introduced; absent historical scores remain unrated. A failed details read preserves artwork and exposes Retry details, without an automatic duplicate request. Brand-keyed workspace caching includes the attached details and refreshes them with the project.

Verified both-brand options, score differences, saved rationale, completion polling, missing-evidence behavior and brand-switch regressions. The live Sleepyhead Napster creative displayed all four saved ratings and recorded explanations with zero extra details requests on opening. Evidence: `work/design-details-ready-20261022/`. Both saved-brand replay suites reported zero failed stages and zero paid calls.

### Retry failed projects — 22 October 2026

Failed/partial progress pages now expose Retry. It opens an inline restart explanation and existing historical INR estimate, followed by explicit Restart generation or Cancel. GET `/jobs/:id/restart` only prepares the preview; POST requires the matching source/config fingerprint, original brand and paid-action confirmation. A deterministic child request key and serialized submission deduplicate repeated clicks/lost responses. The original job, outputs, unknown charges and receipts remain untouched. The new runtime job retains the saved intake including product variant, photo, references and placements; normal runtime validation still applies. Existing child attempts reopen rather than creating additional retries. Tests use mocked creation for both brands; the live failed Cocoon preview returned HTTP 200 without generating. No paid run was performed for this UI change.
