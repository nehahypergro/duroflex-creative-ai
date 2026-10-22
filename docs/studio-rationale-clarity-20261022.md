# Review clarity — 22 October 2026

Shared Static Studio change for Duroflex and Sleepyhead; presentation only. No historical reviews, artwork, scores, costs or generation instructions were rewritten.

## Behaviour

- **What the review found** appears first. Failed checks precede unverified checks, with specific observations and actions to edit, compare brand/product sources, or inspect the saved report.
- High scores never clear a failed check. Missing review data is not presented as a pass. An edited preview explicitly labels the saved review as belonging to the original artwork.
- Duplicate verification requests for an already-listed criterion are suppressed in the summary. Repeated “no evaluator evidence” entries are grouped into one incomplete-review task with every affected category visible. Actual distinct defects remain visible; the full saved report remains accessible.
- **Why this design / Design intent** contains four short, static icon-led notes: Message, Layout, Logo and Scene. They come only from saved intended choices. Missing intent remains missing. Clauses and bounded excerpts keep the notes concise; the full intent and references are in a separate expandable section.
- Numbered decision buttons and their highlight handlers were removed. Icons do not imply an artwork hotspot.
- Scores remain saved-review ratings, below concerns and intent; their evidence requirements and values are unchanged. Full design intent and full saved review have separate disclosure controls.
- Unknown checks prompt inspection rather than claiming a defect requires correction. Saved reviewer corrections remain proposals, not proof of a completed change.

## QA evidence

`work/rationale-clarity-20261022/` contains:

- `before.txt`: failing-before checks for hidden concerns and old decision presentation.
- `targeted-final.txt`: 7 focused passing tests, including both-brand browser coverage, high-score/critical-failure combinations, original/edit labels, missing ratings, duplicate concerns and logo excerpts.
- `model-final.txt`: all 25 model tests pass after the final wording adjustment.
- `full-tests.txt`: 838 tests; 833 passed, the same 5 pre-existing readability-policy failures remain. Follow-up grouping changes are covered by the final targeted/model/UI runs.
- `ui-final.txt`: final complete Studio model/browser suite.
- `saved-replays.txt`: both brands, zero failed stages, zero paid calls.
- `live-check.json`, `duroflex.png`, `sleepyhead.png`: live read-only verification on saved creatives, four intent notes, no decision buttons, concerns before ratings and no horizontal overflow. No write requests or paid calls.
- `live-before-grouping.json` and `duroflex-before-grouping.png`: evidence for the redundant verification rows found during visual QA. The final summary preserves the categories without repeating the same verification task.

Known unrelated failures remain in `tests/creative-ai/readability-fixes.test.js`: policy-version assumptions, tiny-format text, folded/non-Latin counting, display-size verdicts and print-preview geometry. This change does not claim the whole engine is regression-clean.
