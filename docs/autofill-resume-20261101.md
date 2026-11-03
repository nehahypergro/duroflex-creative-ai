# Autofill session recovery — 1 November 2026

## Inspected before editing

The existing checkout had 133 modified tracked files, 274 untracked entries and no staged changes. HEAD was `46f80d1`. This includes extensive engine, editor, admin and Studio work beyond autofill; the Git diff cannot identify which edits belonged to the interrupted chat. No reset, revert, checkout replacement or commit was performed.

Existing autofill implemented typed/document extraction, same-brand product matching, ambiguous-product choices, format suggestions, campaign asset import, language/card counts, communication fields, manual-edit protection, undo and restored-draft processing. Earlier notes and QA logs already documented these changes. The initial 23 focused model checks passed; `git diff --check` was clean.

## Changes in this recovery

- Fixed shared product matching in `public/creative-ai/studio-model.js`: sentence splitting and normalization retain decimal model numbers; explicitly supplied model phrases distinguish products sharing a first-word alias. For example, an explicit “Airboost 6.8” no longer becomes ambiguous solely because another Airboost model exists.
- Added synthetic regressions for typed and uploaded briefs in both brand scopes, persistence, manual overrides, undo, ambiguity, negatives and foreign-brand exclusion. Four test cases failed before the production fix. A final literal-alias check also reproduced and fixed `6.8` incorrectly matching `6x8` when a decimal alias was interpolated into a regular expression. All seven new tests pass.
- Updated the two existing autofill browser tests for the current shared language dropdown, audience chips and compact “Autofilled” status. Their behavioral coverage remains: typing/caret, manual changes, undo, format selection, persistence and no generation.
- Added a browser test using each brand's own saved product library: “Duroflex Airboost 6.8” and “Sleepyhead Napster Mini”, Hindi, six carousel cards and reload. It blocks non-local/non-GET requests and checks for page errors.
- Updated the campaign-document browser test for the current footer; it now checks saved set/image counts, dimensions and all asset languages directly in addition to the visible asset summary.
- New screenshots/logs live under `work/autofill-resume-20261101/`; earlier evidence is preserved. Before-edit copies of the model and the three updated tests are retained there.

## Verification

- Final focused model/campaign/document checks: **36 passed** (`focused-final.txt`).
- Updated autofill browser checks: **2 passed**, each covering both brands (`browser-focused.txt`).
- Saved-product browser check: **1 passed**, covering both brands (`browser-saved-products.txt`).
- Campaign-document reopening and fresh-campaign isolation: **2 passed**, each covering both brands (`browser-campaign-documents.txt`).
- Final combined browser run after literal-alias protection: **all 5 passed** (`browser-final.txt`).
- Required saved handoff replay: **both brands passed, zero failed stages** (`saved-replay.json`). Recorded provider transport only; no paid generation.
- JavaScript syntax and Git whitespace checks passed.

The original browser tests first hit sandbox restrictions on local server binding. After local browser access was granted, their obsolete selectors/status expectations timed out; their two stalled subprocesses were stopped. The corrected tests then completed successfully. These are recorded separately from the current passing browser checks.

The full offline suite ran with four test files at a time and a 180-second test limit in an isolated source copy. It used read-only access to saved output and the original offline bootstrap to block remote requests and production-output writes. Old screenshots and original test evidence were not overwritten. Its snapshot contains the initial model-number fix and predates the browser-test updates and final literal-alias protection above; those final changes have the focused results above.

**Full-suite result: 1,639 tests reported; 1,574 passed, 58 failed, 6 cancelled and 1 skipped; exit 1.** This is not a clean whole-project result. Two test subprocesses (`studio-generation.test.js` and `studio-ui-browser.test.js`) exceeded 180 seconds plus cleanup allowance and were terminated; the monitor has stopped. Evidence: `full-suite.txt`, `full-suite-summary.json` and `timeout-cleanup.jsonl`.

The failures include outdated UI locators/summary expectations, editor selector collisions, navigation/layout assertions, extraction dependencies and a missing historical `work/text-layer-live-20261027/returned-review.json` fixture in the isolated copy. The three autofill/campaign test files updated in this task pass in the final focused run. Other failures have not been repaired or proven independent by a clean baseline comparison. Earlier full-suite logs also reported many failures in this checkout.

## Remaining scope

Autofill is bounded local extraction, not general language understanding. Unsupported or ambiguous briefs still require review. No live user draft, historical job, source document, provider setting or cost ledger was changed. The running Studio server was not restarted. Reload the Studio page to load the updated client script when this checkout serves the app.

Remaining work is to reconcile the other stale browser tests with the current UI, supply missing test dependencies/fixtures, and investigate the remaining genuine failures/timeouts before attempting whole-project acceptance. No broad UI or engine changes were made to force those tests to pass. The new model-name case, targeted autofill behavior and both-brand saved replay are verified as described above.
