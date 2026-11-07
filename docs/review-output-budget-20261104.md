# Review output capacity — 4 November 2026

The runtime artwork review used a fixed 10,000-token total output allowance.
Reasoning and visible JSON share that allowance. Product-reference policy v2
requests medium reasoning, while the fixed-key evidence contract expands with
rules, copy, readability, layout, placement, product and logo observations.
This is a capacity risk confirmed in code, not a claim that it explains every
historical R1 failure.

## Implemented

- `review.js` opts into `review-evidence-v1`; 10,000 is now a floor.
- After the provider resolves configured/trial reasoning effort, it calculates
  capacity from the complete wire contract's evidence groups and locked embedded
  copy length. No criteria or evidence entries are dropped.
- Concise evidence estimates receive 20% margin plus reasoning headroom: 2,500
  tokens at low, 8,000 at medium, 16,000 at high, 24,000 at xhigh. These are
  explicit heuristics, not measured token counts or a completion guarantee.
- Existing configured recovery ceilings remain binding (normally 50,000).
  Receipts record the calculation, group counts, ceiling and any capacity
  shortfall alongside actual provider usage and each attempt's output limit.
- The existing one corrective attempt remains. Truncation increases capacity
  within that ceiling and retains the chosen review reasoning effort. HTTP
  recovery, monetary admission, pending-response reconciliation and exhausted
  retry protections remain in place. Other stages keep their current limits.

## Verification

Regression reproducer failed before the fix for fixed-budget sizing, routed
effort, correction effort and ceiling accounting. Focused provider, recovery,
schema, reviewer, context-preflight and token-efficiency tests pass. Logs are in
`work/review-output-budget-20261104/`.

Four saved-contract construction replays (both routes for each brand) retained
all required entries:

| Brand | Required entries | Calculated initial allowance |
| --- | ---: | ---: |
| Duroflex | 27 | 16,000 tokens |
| Sleepyhead | 36 | 17,000 tokens |

These replays use synthetic pixels and stubbed OCR/reference processing to
inspect request construction only. They do not establish visual quality or
actual completion at those allowances. An initial replay mistakenly read the
overview index instead of complete per-unit packages; the replay loader was
corrected, without modifying historical artifacts.

No paid requests, backend restart, historical verdict edits or batch retries
were performed. The running backend still needs a controlled reload to use the
change; in-flight requests retain their original implementation. Saved requests
must be reconciled before any deliberate new verification attempt.

A larger allowance can permit higher actual token usage and latency. Provider
usage determines spend; allowance is not a charge. Extremely large evidence or
reasoning can still exhaust the ceiling. Such a result remains unverified and
does not trigger an unbounded retry loop.
