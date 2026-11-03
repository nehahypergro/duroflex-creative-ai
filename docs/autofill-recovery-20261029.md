# Brief autofill recovery — 29 October 2026

The open Duroflex draft said “A festive instagram story for sku sofa cove” but retained Technology visual and the manually selected Octave. The previous parser did not understand the shorthand product or expose the requested format change.

## Changes

- Recognise supported everyday format requests and short saved product names within the chosen brand.
- Show both saved Cove variants for an explicit choice; retain manual product selections until the user chooses a replacement.
- Offer the recognised format with one click, preserving the previous format's answers in the draft.
- Fill explicit occasion, language and supported counts, including sentences containing “without added text”.
- Recheck restored briefs without requiring the user to type again. Preserve manual corrections and autofill undo.
- Show an honest unmatched state when the local parser finds no additional supported details. This remains bounded local extraction, not general AI interpretation.

## Verification

The two new model regressions failed before the fix and passed afterward. The final combined browser and model run passed all 10 tests across both brands. Eight existing autofill/document tests also passed, covering manual blanks, removed evidence, negation, undo and document priorities. Browser checks covered format changes, product ambiguity, language overrides, saving and reloading. No page errors were observed.

Evidence: `work/autofill-recovery-20261029/duroflex.png`, `sleepyhead.png`, and `repaired-open-brief.png`. The user's actual preview was saved and refreshed; product and format replacement were left for their explicit choice. No paid generation, provider changes or service restart occurred.
