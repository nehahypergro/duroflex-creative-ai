# Creative AI: two paths, one project

## Scope and user journeys

Desktop frontend and browser-local drafts. The current implementation boundary remains Static Studio. The other three workspace types are planning destinations; their editors and engines are unchanged. The working image-generation flow remains separate until explicitly connected. No AI calls or fresh SKU fetches are required by these screens.

- Campaign: one-page brief → generation review → generated outputs → Edit / Download. Concepts and the asset plan are internal data, not client approval screens. Output formats are selected within the brief. Legacy campaign strategy/concepts/plan links open generation review; overview links open the outputs workspace. Saved planning metadata is retained without migration.
- Quick Create: static recipe → one-page inputs → generation review → existing editor after artwork is available. Only one recipe at a time; changing it replaces the recipe rather than adding another deliverable. Optional creative preferences are collapsed. Exact variant selection remains required for multi-variant products.
- Existing projects, historical verdicts, costs and drafts retain their original workflow and evidence.

## Data ownership

A brand owns projects. A project owns its brief, strategy, concepts and asset plan. Each deliverable has its own stable ID and a concept reference; its recipe determines the target workspace. A studio is an editing destination, not another project.

New local drafts add `creationMode` and `planning` to the existing versioned draft record. `planning` contains manually entered strategy, concepts, team and deadline. Outputs retain their existing IDs, dimensions, language and settings; optional `name` and `conceptId` bind them to the plan. Older drafts are not migrated or rewritten.

One carousel is one deliverable; slides are its contents. The seven-deliverable example (3 ads + 1 carousel + 2 reels + 1 banner) has seven stable output records. Five-slide carousel yields eleven individual items, not eleven deliverables. Multiple ad/reel rows can be named separately and routed to different concepts.

Removing a concept keeps its deliverables and clears their assignments. Removing a deliverable offers undo. Local saving retains existing optimistic revisions and quota/conflict protection. Brand switching and direct links cannot read another brand's drafts.

## Production boundaries and next backend phase

No generated strategy, audience research, proof, assets, review approvals or cost estimates are fabricated. New drafts still explain the missing backend connection; they never send a paid request. No client strategy proposition, concept selection or asset assignment is required. Existing generated artwork goes directly to output review and editing. Internal engine stages are not displayed as client workflow steps.

Next engine phase: campaign aggregate server persistence; internal scoped strategy/concept calls; explicit generate-selected/all submission with idempotency keys; per-deliverable jobs, versions, failure state, cost receipts and studio deep links. Reuse the same exact SKU evidence and brief across children. Server-side authority must preserve original review flags and approvals. Do not translate a plan's completeness into artwork approval.

Video, Copy and Adaptation studio implementation, automatic natural-language deliverable extraction, automatic AI proposals and seven-item batch generation are not implemented in this frontend pass. Existing original-studio links do not automatically transfer a draft.

## Acceptance / QA

- Both-brand campaign fixture: five static deliverables proceed straight to generation review without a proposition or concepts; legacy links remain usable, output counts persist, and saved generated options still open directly. Zero mutation/API-generation requests.
- Quick fixture: GMB/store recipe, ambiguous SKU variant error, recipe replacement, collapsed preferences, skips strategy/concepts, honest generation-unavailable state.
- Model tests: counts vs carousel slides, unknown route handling, workspace mapping, single quick output, persistence and legacy compatibility.
- Existing suite checks all prior saved-draft, organisation, image review and recovery paths.

Checkpoint: `work/studio-campaign-20261020/before/`. Evidence and fixture screenshots: `work/studio-campaign-20261020/`.

### Verified 20 October 2026

- 35/35 UI model and browser test groups passed (`final-ui-tests.log`). Includes both-brand mixed campaign journey, global + chooser, Quick Create, exact variants, stale writes, storage-full recovery, deliverable removal/undo and preserved legacy drafts.
- 68/68 shared frontend/editor/workspace regression checks passed (`shared-tests.log`).
- Saved Duroflex and Sleepyhead provider handoffs: zero failed stages, mocked transport, zero paid calls (`replay.log`). Historical production artifacts were not rewritten.
- Desktop fixture screenshots reviewed: `screens/overview.png`, `screens/asset-plan.png`. Existing video, writing and adaptation view functions are unchanged from the checkpoint.
- The existing local studio returned HTTP 200. Browser panel opening was queued by the desktop app; the direct local link remains available.
- Initial new browser assertions counted nodes before hash navigation rendered; corrected tests wait for the destination screen. No production engine or paid-generation changes were required.

### Simplified client journey — 20 October 2026

Client-facing concepts and asset-plan approval screens removed at user request. The creation stepper is Brief → Generate → Outputs → Edit → Download. Quick Create retains recipe selection. All 60 static recipe × brand × creation-path checks pass with the shorter route. Prior planning records and production engine logic are unchanged.

Simplified-flow verification: 49/49 UI model/browser groups passed, including the
60 static planning journeys and 30 saved-artwork journeys. Both saved Duroflex
and Sleepyhead handoff replays passed without modifying historical artifacts.
Evidence: `work/studio-direct-outputs-qa.log` and
`work/studio-direct-outputs-replay.log`. No paid provider calls were made.

## Adopted interface · 21 October 2026

The user selected this Creative AI design as the final interface direction. The global “Current studio” link is now “Advanced tools”, retains the selected brand, and the global “Design preview” caption is removed. This is design acceptance, not completion of the engine integration. Contextual notices still identify unconnected generation and local-only persistence.

Before retiring the previous interface or changing the default production entry route, connect new brief submission and estimates, server-backed campaign/draft/organisation persistence, live progress and input/recovery actions, brand/product source management and research/preferences, and the remaining production handoffs. Existing image editing and saved-image downloads already reuse working paths. Video, Copy and Adaptation remain outside this Static Studio pass. Existing deep links and saved evidence must remain usable.

## Brand library profile · 21 October 2026

Account UI: a persistent bottom-left profile trigger opens an anchored native popover, including when the sidebar is collapsed. Settings routes provide My profile, Workspace settings, Team & access and Login & security; Usage links to the existing ledger page. A display name can be saved in browser storage with explicit local-only scope, validation and failure recovery. Neha is a preview identity, not an authenticated user. Invitation, role assignment, login and sign-out remain disabled or explanatory; no access control or user isolation is implied. The backend must supply authenticated identity, membership, permissions and server-enforced data scoping before enabling these controls. No credentials are collected. Profile changes do not modify either brand or its creative records.

Context help: small independent information buttons explain the two creation paths, saved-product selection, editing, brand sources, brief/reference sections, saved reviews/ratings, downloads and selected editor concepts. Familiar format tiles have no extra hints. Hover, focus and click open a viewport-clamped tooltip; Escape, navigation and scrolling dismiss it. Help does not submit an action or make a provider call. This is UI guidance only; existing warnings and backend-availability notices remain visible. Trash is now nested under Settings, with the original `#trash` route retained as a compatible entry to that settings screen.

Library now opens on Brand assets: a source-linked brand profile with saved approved logos, typography, colour palette, voice, documented hashtag examples, visual source pages and original resources. `studio-library.js` contains curated extracts from each brand's saved manifest; it resolves sources only within that manifest. Duroflex draft guidance, Sleepyhead excerpt limitations and the printed white HEX/RGB conflict remain explicit. Font names from guidelines are distinguished from registered font files. This presentation does not update research or generation policy, and new documents do not automatically rewrite the curated extracts.

Products use a compact SKU table with contained square thumbnails, text/category/image filters, sorting and named views. Views persist in browser storage separately for each brand; save failures retain the current inputs. Inspiration is unchanged. Existing advanced source management remains linked.

Verification: 27 model/unit checks and 28 browser groups passed, including both-brand source isolation, unavailable-source handling, combined filters, saved-view reload and brand switching. Browser suites also cover the existing static recipe and saved-artwork matrices. Evidence: `work/library-profile-unit-qa.log`, `work/library-profile-browser-qa-final.log`, and `work/library-*-20261021.jpg`. No paid generation calls or historical artifact changes.

## In-page forms and workspace screens (21 October 2026)

The shared studio no longer uses its blocking general-purpose dialog. Short forms
(audience, style, dimensions, product selection, rename, campaign/tags and saved
product views) expand inline. Recoverable Trash confirmations and save recovery
also stay in the page. Tool browsing, search, deliverable/reference pickers,
product/resource inspection, draft comparison and artwork inspection use a full
workspace screen with Back navigation. Profile/file menus and contextual tooltips
remain lightweight controls; the existing full-screen canvas editor is reused.

The parent DOM is retained while a workspace task screen is open, preserving its
fields, filters, focus and scroll position on Back. Transient task URLs return to
the parent on refresh rather than attempting to restore a stale form. Switching
brands closes the task and loads the selected brand. The UI changes make no AI
calls and do not alter generation, editor persistence or original assets.

QA: `work/task-panels-qa.log` contains 31 passing browser tests, including the
60-case static recipe/brand/entry matrix and saved-art journeys for both brands.
`work/task-panels-final-qa.log` contains 10 passing targeted checks after final
inline-layout/navigation adjustments. The new non-modal regression checks inline
placement, parent visibility, browser Back, refresh recovery, brand isolation,
validation feedback and updating filters while a form is open. Testing exposed
an early-return issue that could dismiss an inline form without applying the new
filter view; route restoration now preserves DOM only for browser Back from a
full task screen, and the filter regression passes.
