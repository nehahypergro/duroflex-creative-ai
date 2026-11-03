# Studio journey audit — 29 October 2026

## Scope and confidence

Read the current shared Studio implementation and replayed Home, Projects, brief review/confirmation, ongoing creation, completed/partial projects, image selection, image viewing and download selection using isolated browser fixtures for **Duroflex and Sleepyhead**. These fixtures serve the actual frontend and saved brand libraries, with simulated job responses and labelled artwork. Inspected editor, download, recovery and version routes in source. No real jobs, generation calls, historical results or application source were changed during this audit.

The authenticated local browser remains at sign-in. This audit does not claim an authenticated production-session replay or new artwork quality validation. Eight behavioural findings below were reproduced; additional UX findings are explicitly source/design observations. No JavaScript page errors or job writes occurred during the main replay. A lack of JavaScript errors does not mean the journey is sound.

Evidence: `work/journey-audit-20261029/evidence.json`, `intake-evidence.json`, browser scripts and screenshots in the same directory.

## Findings

### 1. Artwork on Home opens Progress instead of the artwork — high priority, reproduced both brands

`continueCard` chooses the destination from whole-job status before considering an available image. A running job displayed a real saved-image preview but linked to `#progress/...`. Clicking reproduced the progress page. In Projects, the same job's image instead links directly to `#review/...`.

Impact: a visible creative looks clickable but the user is sent backwards into waiting. The result feels unreliable even though the image exists.

Required behaviour: clicking an image opens that exact image. Creation state belongs beside it. A separate, explicit control opens activity details. No unrequested route switch should occur while inspecting an image.

### 2. Different parts of one project card mean different things — medium priority, reproduced

In Projects the image opens image review, while the project title opens the project workspace. Home changes its destination again according to status. The same visual card convention has several navigation contracts.

Required behaviour: choose one consistent project-card destination. Inside the project, image tiles open images. If direct image shortcuts remain, label them distinctly and keep the project action separate.

### 3. The Progress tab cannot remain open on a completed job — high priority, reproduced

Opening Progress for a completed job performs a fresh status read, then `renderRoute` replaces the URL with the project route. The new shared navigation makes Progress appear to be a stable tab, but its existing automatic redirect contradicts that promise.

Required behaviour: completed activity remains inspectable. Update status in place and provide an explicit Open images action. Do not automatically replace the user's chosen view.

### 4. Opening an asset ignores the selected option — high priority, reproduced

Selected the second option. The project preview correctly showed the exploration image. The asset's Open/Review options action then opened option index 0. `chosenResult` resolves the selected option for the thumbnail, while `open-output` independently resolves the first non-trashed result.

Required behaviour: preview, open, edit and download must resolve the same selected image identity and revision. Preserve this through Back, reload and result updates. Avoid using an array position alone as the long-term identity.

### 5. A completed project says Ready while every asset says Needs attention — high priority, reproduced

Fixture: two placements, both routes present for both placements, every image available. Project header: Ready. Both asset rows: Needs attention.

Cause: workspace passes one asset's filtered results into `M.status` while retaining all project placements. Every individual row consequently appears to be missing the other placements.

Required behaviour: calculate project availability across the project; calculate asset availability only across that asset's expected slots. Image review findings must remain attached to the relevant version. Do not hide actual findings to make the status green.

### 6. The image view stops receiving normal live job updates — high priority, reproduced

While on image review, changed the simulated job from running/checking to finished. Over the next 5.5 seconds there were zero fresh job reads and the header remained Creating. `progressTarget` watches only Project and Progress; the periodic image-view path is absent. Focus refresh can update stored project data but does not repaint image review.

Required behaviour: continue lightweight status updates while viewing an image, without remounting the image, moving focus, changing selection or replacing unsaved notes. Expose newly available images without navigating the user away.

### 7. Missing artwork is incorrectly reported as being in Trash — high priority, reproduced

Opened an ungenerated placement in a partial project. Toast: “All creatives in this deliverable are in Trash. Restore one to continue.” Nothing had been deleted. The no-result and all-results-trashed conditions share the same branch.

Required behaviour: distinguish waiting, not generated, generation failed, unavailable preview and explicitly trashed. Offer an action appropriate to the actual condition. Preserve unaffected artwork.

### 8. Confirm brief returns to the questionnaire without a clear next action — high priority, reproduced

After confirmation, the dialog closes, the brief remains open, and the main footer button says Review confirmed brief. Generate is inside Completion & next step. That disclosure opens, but the button was at approximately y=1986 in a 900px-high viewport, outside view in both brands.

Required behaviour: confirmation should expose a clear creation handoff with the estimate and explicit Create action in the visible primary-action area. Keep Back/Edit brief available. Confirmation must not silently initiate a paid request.

### 9. Needs attention is drawn as a step after Ready — design observation

The status model has four useful labels, but the progress UI draws Draft → Creating → Ready → Needs attention as a linear sequence. An exception state looks like the expected next milestone after success.

Required behaviour: keep all four status labels, but show Needs attention as an exception with explanation and action, not the final step of a success path.

### 10. Create versions promises more than the connected feature delivers — source/UX observation

The image screen offers Create versions. The next view offers Resize, Translate and Store versions, then explains that it only saves a local plan and does not resize artwork or call AI.

Required behaviour: call this Plan versions and explain the limitation before entry, or withhold it from the primary finished-artwork journey until execution is available. Do not imply a generated derivative exists.

### 11. Selection and delivery are presented as separate decisions — source/UX observation

Use this option changes the chosen creative/project cover, while the project download picker independently begins with no images selected. Single-image download, complete-set download and a separately checked selection are different paths.

Required behaviour: keep the distinction explicit: Download this image, Download selected set, or Choose files. Show exactly what the download includes. Use current saved versions while retaining warnings; do not conflate download with approval.

### 12. Image inspection has too much competing context — visual/source observation

Project header, workspace tabs, image title, download options, review badge, rationale, scorecard, option selection and adaptation actions all compete around the image. The screen looks organised but still asks the user to understand too many different systems.

Required behaviour: artwork and immediate actions first. Short image-specific findings next. Why this design, ratings and detailed evidence can be optional panels. Keep the project title, selected image and return action stable.

## What did not fail in this replay

- Download checkboxes and their expanded panel survived the background update. Existing `data-refresh-preserve` protection is working in this scenario; do not report a selection-reset bug here.
- Direct image view did not automatically throw the user into Progress in this replay. The confirmed bad transition was clicking Home's displayed artwork. The Progress-to-project redirect is separately confirmed.
- No page-level JavaScript errors occurred. The main failures are incorrect routing and state presentation.

Existing editor save/close protections, paid-action confirmation and version-aware downloads should be preserved. The preceding implementation pass tested text editing, undo, guides and zoom; this audit did not repeat paid generation or claim every export variant was exercised.

## Proposed coherent journey

1. Create design/campaign → brief intake.
2. Review the captured assignment → visible estimate and explicit Create action.
3. Open a persistent project workspace with all requested asset slots.
4. Each slot independently changes from waiting/creating to an available image, or displays an actionable issue. Available images stay visible while siblings continue.
5. Click an image → inspect/edit within that project; retain image identity, selection, saved revision and Back context.
6. Download the image or chosen set with a concise contents/version summary.

Progress is activity within the project, not a competing destination the app unexpectedly forces onto the user. Completion updates the current screen. Error recovery affects only the relevant work where supported.

## Implementation sequence and acceptance checks

First fix route/state correctness: 1, 3, 4, 5, 6, 7. Add regressions that reproduce each before editing, including multiple placements/routes and partial completion for both brands.

Then fix the confirmation handoff and card entry contract: 8 and 2. Assert that the explicit paid action is visible after confirmation and that no automatic dispatch occurs.

Then simplify activity, inspection and delivery: 9–12. Test real transitions, not only screen rendering: queued → first image available → checking → finished; partial failure; selected option reopened; refresh/Back; editor dirty close; edited-version download; tab return; offline/reconnect. Verify laptop widths and zoom.

The last shared-style pass improved visual consistency. It did not complete this behavioural integration. Do not describe the overall experience as resolved until these transition checks pass.


## Implemented continuity pass — 29 October 2026

The accepted recommendation is now implemented in the shared Studio frontend for both brands.

- Explicit Create submits the unchanged guarded request and lands in the persistent project workspace. Recovery returns to that workspace too.
- Home artwork opens the saved image; the project name opens its workspace. Finished Progress stays open rather than automatically redirecting.
- A compact activity strip keeps current status beside artwork. Success is Draft → Creating → Ready; Needs attention remains an exception status, not a compulsory fourth step.
- Asset rows calculate availability against their own requested slots. Available work remains usable in partial projects; absent output is no longer described as deleted.
- Preferred artwork is saved by placement, route and source image identity, with legacy numeric selections supported. Server result reordering no longer changes the selected creative.
- Inspection retains the displayed result snapshot across status updates. Notes and download choices are kept in place. New project results are offered explicitly; saved local editor events invalidate the snapshot so the newly saved revision appears.
- Confirmed brief exposes the existing cost estimate and guarded Create control outside collapsed details, brings it into view, and does not submit until explicitly clicked. Duplicate-submit protection remains intact.
- Design intent is expandable, review information remains accessible, and the planning-only versions action is labelled Plan versions.
- Light styling, brand logos, current navigation shell, original outputs, edited-file delivery checks and production workers are retained.

### Verification and limits

The three original continuity browser regressions failed before the changes. The new suite now covers five scenarios for each brand: image entry and stable progress route; selected option and missing output; completion while inspecting and typing (including reordered results and saved editor revision); guarded confirm-to-create with duplicate clicks; and completion while download rows are selected.

21 distinct targeted checks passed across the final and interaction runs, including ordered edited-file delivery, stale-revision rejection, polling isolation/backoff, responsive layouts at 1366/1063/768/390 widths, summary controls and editor interaction tests. Evidence is in `work/journey-audit-20261029/final-regression-validation.log` (14 checks) and `interaction-validation.log` (7 checks); screenshots use controlled, labelled fixture projects. No real generation or paid provider request was made. The Create handoff used a mocked response.

The older `studio-flow-v2.test.js` suite is not clean: two tests still operate the replaced product select control, a project-board square-ratio assertion fails, and a warning-consent test times out. The latter two were rerun against the untouched starting JavaScript and reproduced (`baseline-downloads.log`). These older checks are not included in the passing count and remain separate follow-up work.

Authenticated live verification also completed in the existing Studio browser tab on port 1842: the saved Duroflex project loaded the new activity strip; completed Progress remained on its route; returning to Artwork and opening its saved image retained the shared frame, brand logos, review findings and Edit/Download controls. Screenshot: `work/journey-audit-20261029/live-creative.png`. No live image was changed or generated. No server restart, authentication change, job resubmission or worker modification was performed.
