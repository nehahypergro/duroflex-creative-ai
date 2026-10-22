# Shared studio UI — implementation and QA

Implementation follows [the reviewed UX blueprint](studio-ux-ui-blueprint.md) and its 42-feature mapping. This is a usable UI preview over saved data, with local drafts for new workflows. Production generation remains in the existing studio.

## Verification performed

| Check | Observed result |
| --- | --- |
| New model and browser tests | 13 tests passed; 9 model tests and 4 browser journey groups. |
| Relevant existing shared tests | 68 passed: frontend flows, production editor, rigorous editor and group workspace. |
| Saved-run replay, Duroflex | Strategy, concepts, copy, art and reconciliation passed with recorded responses. |
| Saved-run replay, Sleepyhead | The same five stages passed with recorded responses. |
| Real saved-data browser smoke | Both brand homes and libraries loaded; 12 Duroflex and 7 Sleepyhead product previews; no broken previews or page errors in these checks. |
| Mobile | 390 × 844 viewport, no horizontal overflow; one-page brief fields and actions remain reachable by scrolling. |
| Export | Mock saved artwork exported as JPEG at its original 1080 × 1080 dimensions. |
| Editor integration | Edit opens the existing editor preparation screen with the correct brand/job. Existing editor tests cover editing, original preservation, save/reopen and export. |
| Paid provider calls | None. Additional generation/API test cost: ₹0. Development compute is not priced from subscription usage. |

The 102-case CSV is the broader planned acceptance inventory. It has **not** been relabelled as 102 executed passes. These tests do not establish the quality of new AI artwork or availability of future video/document/integration services.

## Bugs reproduced and corrected

| Symptom | Cause and fix | Evidence |
| --- | --- | --- |
| Clicking Preview project could do nothing after editing a field | The input/blur handler rebuilt its parent summary and removed the clicked button. Summary updates now keep interactive nodes alive. | `browser-before-fixes.log`, passing browser journey. |
| Unsaved writing could be left without recovery | Manual writing edits did not set the shared dirty state. Writing and storyboard edits now use the draft save/recovery path. | `browser-before-fixes.log`, failed-save navigation test. |
| An individual failed project load disappeared | Failed responses were filtered out. A retained project row now offers recovery and retries. | Unavailable-project browser regression. |
| Product library showed no thumbnails despite saved images | The new adapter expected a different media shape. It now uses the existing `preview` / `product-images` contract and brand-scoped endpoint. | `preview-timeline-before.log`, both-brand browser tests and real-data smoke. |
| Changing scene duration left the timeline showing its previous value | Only the saved value and total changed. Timeline labels and proportions now update together. | `preview-timeline-before.log`, live-duration browser test. |
| Usage could replace Home after navigating away | A delayed response checked brand-load state but not page-navigation state. A separate view epoch now rejects stale results. | `navigation-before.log`, delayed-response browser regression. |
| Skip-to-content could be interpreted as an application route | The link now focuses the main region without changing the route. | Keyboard focus and route-preservation assertion. |

Additional contract checks cover Unicode and literal markup, brand isolation, all 42 feature IDs, deterministic draft/output IDs, invalid sizes/counts/dates, corrupt-storage preservation, stale-tab writes, status semantics and normal-text contrast. Failed model loading/syntax checks were corrected before browser QA.

## Evidence and commands

Evidence folder: `work/studio-ui-preview-20261019/`.

- `ui-tests.log`: executed new UI tests.
- `shared-regression.log`: 68 existing checks.
- `brand-replay.json`: both recorded-run replays, zero failed stages.
- `visual-smoke.json`: real-data browser observations.
- `home-duroflex.png`, `home-sleepyhead.png`, `library-duroflex.png`, `library-sleepyhead.png`, `review.png`, `brief.png`, `home-mobile-fresh.png`, `mobile-viewport.png`, `mobile-scrolled.png`, `usage.png`: reviewed screens. Earlier full-page mobile captures had a headless resize/tiling artefact; fresh viewport captures and actual scroll measurements were used for mobile inspection.

Run from the repository root:

```sh
node --require ./tests/creative-ai/offline-bootstrap.cjs --test tests/creative-ai/studio-ui.test.js tests/creative-ai/studio-ui-browser.test.js
node --require ./tests/creative-ai/offline-bootstrap.cjs --test tests/creative-ai/frontend-flow.test.js tests/creative-ai/editor-production.test.js tests/creative-ai/editor-rigorous.test.js tests/group-workspace.test.js
node scripts/creative-ai/qa-both-brands.js
```

Browser tests use local isolated fixture servers and the installed Chrome; no generation credentials are needed. Preview browser-storage data is scoped by brand. Read-only real-data smoke sessions use isolated browser contexts, so their test drafts do not appear in the user's browser.

## Data and rollback boundaries

New files: `public/creative-ai/studio.html`, `studio.css`, `studio-model.js`, `studio-data.js`, `studio.js`; two UI test files and these design/QA documents. The sole existing runtime integration is the added static-asset allowlist entries and `/creative-ai/studio` alias in `lib/creative-ai/runtime/http.js`. Other pre-existing changes in that file were preserved.

Open `/creative-ai` for the previous interface at any time. To remove the preview later, remove only the five new filenames from the allowlist and the `'/creative-ai/studio':'studio.html'` route alias; remove its five public files only if no longer needed. Do not reset the entire HTTP file or repository, which contains unrelated prior work. Compare against `work/studio-ui-preview-20261019/before/lib/creative-ai/runtime/http.js` if needed.

Local preview storage keys begin `studio-ui-v1:` (drafts) or `studio-ui-notes:` (notes/selections); attachment blobs are in IndexedDB `studio-ui-reference-files`. Keep or export drafts before clearing browser storage. Preview selections do not change saved production selection or review states. Existing Edit actions still use the production editor's revision store.

## 20 October 2026 — approved homepage and Creative AI navigation

The homepage now follows the supplied reference composition: creation banner and composer, five quick tools, six format shortcuts, then recent projects. Cool lavender/blue surfaces and indigo actions replace the previous purple/pink editorial treatment. The product name is **Creative AI**. A fixed left menu collapses to an icon rail, preserves the user's desktop preference, and exposes Home, Projects, Brand library, Usage and six feature groups. All 42 tools remain accessible through the groups and search.

Desktop web is the current optimisation scope (user direction). Both brands were checked at 1280, 1512 and 1920 pixels: no horizontal overflow, broken hero images or browser exceptions. Existing narrow-screen regression coverage was retained, but further mobile design work is deferred.

The homepage composer preserves prompt, selected product, audience, visual direction and format when opening the one-page brief. Exact variant selection remains explicit when multiple variants exist. Header search is scoped to the active brand's projects/products plus shared tools. Quick Edit and Create versions choose a saved project; the existing production editor and version-plan workflow are reused. Failed/unready artwork is not used as decorative hero inspiration; approved-ready results or saved product sources are used. Failed projects remain visible in Recent projects with their actual status.

Verification: **14 UI tests and 68 existing shared/editor tests passed**. Recorded strategy, concepts, copy, art and reconciliation checks passed for both brands, with zero failed stages. No paid provider calls were made (additional API generation cost ₹0; development compute unpriced). Evidence: `work/studio-home-20261020/`, including `ui-tests.log`, `shared-tests.log`, `brand-replay.json`, desktop screenshots and `visual-check.json`. A navigation acceptance check caught the mobile menu remaining expanded immediately after a route click; click handling now explicitly closes it and synchronises accessibility state (`navigation-before.log`, final passing test). Screenshot captures after resizing Chrome can show a compositor tiling artefact; use the fresh-viewport `desktop-final.png` for appearance inspection.

Generation has not been connected to the new brief preview by this UI change. The button says **Build brief** and the sidebar identifies local preview drafts; the current production studio remains linked. Existing saved project data, reviews, images and costs were not modified. Previous UI source snapshots are in `work/studio-home-20261020/before/` for reversal without touching the generation engine.
