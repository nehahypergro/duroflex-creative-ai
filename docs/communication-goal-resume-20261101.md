# Communication goal autofill — 1 November 2026

## Implemented

The interrupted Get / To / By request is implemented in the shared Studio model and UI for Duroflex and Sleepyhead.

- **Get** follows the selected audience. Clearing that audience does not reinsert an older audience from the brief.
- **To** follows an explicitly selected or extracted objective when the brief has not supplied a more specific response. The untouched Awareness default does not invent a goal.
- **By** uses only selected same-brand saved features and explicitly supplied features, preserving their wording and qualifiers. Unselected library facts are not inserted.
- Explicit communication text from the typed/uploaded brief keeps priority over generic objective/feature fallbacks. Manual changes in each goal input, including blanks, are protected independently.
- Changes to the audience, objective and selected features update unedited goal parts. Undo survives reload and resumes when those sources change. Existing whole-message manual edits remain protected; old autofill-owned messages migrate to individual parts.
- The extra “Autofilled” label and its separator were removed. Undo, product/format choices and conflict information remain available.

No model request or paid generation is used for this feature. Existing live drafts and historical production artifacts were not directly edited during testing.

## Evidence

Evidence lives in `work/communication-goal-resume-20261101/`.

- Six new regression cases failed before the fix (`before.txt`). A further manual-audience-clearing case also reproduced before its correction (`manual-audience-before.txt`).
- **44 focused model checks passed** (`focused.txt`).
- **6 related browser checks passed**, covering both brands, selection changes, explicit brief text, per-field manual protection, undo, reload, review, desktop/mobile layout, product matching and campaign-document recovery (`browser-regression.txt`).
- Both-brand saved handoff replay passed with zero failed stages (`saved-replay.json`).
- JavaScript syntax and Git whitespace checks passed.

The required full offline suite completed in an isolated source copy using the original network/output-protection bootstrap: **1,588 passed, 55 failed, 3 cancelled and 1 skipped** out of 1,647 reported checks (exit 1; about 6 minutes 26 seconds). See `full-suite.txt` and `full-suite-summary.json`. Three stalled test subprocesses exceeded their timeout and cleanup allowance; two exited after SIGTERM and the remaining Studio UI test required SIGKILL. These are incomplete checks, not passes; details are in `timeout-cleanup.jsonl`.

Every current reported failure name also appeared in the earlier recovery run. This is not a controlled before/after comparison: the current snapshot includes the completed fixes and saved Cocoon review fixture, and uses different concurrency. Remaining failures include obsolete UI selectors/expectations, missing Python packages (`fontTools`, `av`, `psd_tools`) and timeout/product behavior that still needs diagnosis. The focused autofill checks pass, but the whole project is not certified release-ready. Historical evidence was preserved.

## Requests found in the original chat

The original interrupted autofill turn is `01a195d9-fd67-7310-8a3d-77b695fb0889`. The original chat was reread from its newest turn back to that exact anchor. **No later design/development requests were found in that interval.** The later human message was “its gettign stuck”; the other later user-role messages were automated cost-sheet heartbeats. No automation was changed or triggered by this audit.

The previously recovered unfinished requests precede that anchor and remain in the backlog:

1. Editor usability and layout inspired by the supplied Canva references, including a compact download menu.
2. Font audit across pages, with differences shown **before** any font changes.
3. “Why this design”: a clear top summary followed by plain-language details.
4. Favourites/search/category cleanup and small tiles for multi-creative sets.
5. End-to-end LinkedIn SKU test of editable text placement.
6. Diagnose and fix outstanding failures.

These requests were fetched and recorded; they were not all implemented in this autofill pass. See `docs/project-continuation-20261101.md` and the private `later-requests-audit.json` for continuity and exact turn provenance.
