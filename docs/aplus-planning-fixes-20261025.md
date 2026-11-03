# A+ image-only planning fixes — 25 October 2026

Two shared engine fixes apply to Duroflex and Sleepyhead.

1. **An image can have no added wording.** The copy response schema and its shared checker now use one policy. A+ image-only, email image, RCS image and push image placements can have an empty text deck; clean PDP/PMax photography keeps the same permission. A maximum word allowance no longer becomes a requirement to invent a headline or CTA. Native publisher fields, source checks, locked wording and rendered review still retain their existing checks.
2. **A preferred feature does not have to stop the job.** If concept planning identifies missing product demonstration evidence, one upstream strategy revision can choose another supported feature. The strategist must explicitly decide that the feature is optional and that the dependency is visual. It receives the original brief, blocked proposition, questions and existing product reference inventory. Replacement facts and assets are checked against the selected product snapshot. The director then validates both revised options before copy or rendering proceeds. An explicitly required feature or an unavailable replacement stays unresolved.

The recovery preserves original strategy and concepts. Revised strategy, concepts, decision and input references have separate saved filenames. Subsequent planning uses the revised strategy consistently, and Studio displays the revised concepts. A restart reuses saved stages rather than buying the same planning calls again. This is one planning revision, separate from the existing artwork correction cycle.

## Evidence

Artifacts are in `work/aplus-planning-fixes-20261025/`:

- `before.txt`: original reproduction — 12 failures, 3 controls passed.
- `focused.txt` and `director-handoff.txt`: image-only contracts, required native fields, scope guards, bounded recovery, resume reuse, real strategist wire and director handoff checks.
- `saved-aplus-replay.json`: all six saved missing-copy failures now pass the complete copy validator. The original Duroflex Feature failure qualifies for upstream recovery; its original blocked concepts still cannot dispatch. Historical files remain unchanged.
- `both-brands.txt`: saved Duroflex and Sleepyhead strategy, concepts, copy, art and reconciliation handoffs pass (10 stages).
- `offline-suite.txt`: initial sandbox run could not open local test services.
- `offline-suite-local-services.txt`: full offline suite with localhost servers, Chromium and temporary PostgreSQL permitted. External model calls remain disabled by the test bootstrap.

No paid calls or new images are part of this fix validation. The replay proves the checker and recovery contracts, not that a live model has selected a successful alternative or generated passing A+ artwork. Those need the next live A+ run.

## Final results

- Focused shared checks: **40 passed**. This includes both new director linkage cases added after the full suite started.
- Full offline suite with local services: **1,408 passed, 2 failed** (1,410 total).
- The two failures are in the pre-existing retail browser matrix, which uses a mock server and does not invoke the changed planning engine: its generic recipe-10 selector now matches four retail choices, and its legacy field inventory still expects `localCTA` after the guided retail brief replaced it. `unrelated-browser-checks.txt` reproduces both in isolation. These tests were not changed or counted as passing.
- Saved brand replay: **all 10 stages passed**.
- Saved affected A+ cases: **7 checks passed**, covering the six empty-copy option failures and the Duroflex missing-demonstration recovery eligibility.
- Live model selection and generated-image review remain untested in this fix pass. No production generation, receipts or historical verdicts were changed.
