# Shared-engine regression policy

A newly observed engine failure is not fixed until it has a reproducible regression test and the applicable shared and both-brand saved-run checks pass.

For each fix:

1. Record the failing job/stage or a minimal synthetic reproduction. Remove credentials; retain exact relevant Unicode, types, source relationships and error messages. Keep real brand fixtures in their own workspace.
2. Add a test that fails for the original defect before changing production logic. Save the failing output where practical. Assert the required behavior and side effects, including no paid dispatch for invalid input; do not merely mirror implementation.
3. Fix the shared implementation and run the focused tests plus the full offline suite.
4. Run `npm run test:qa:both-brands`. This checks five planning handoffs for a saved Duroflex Tatva campaign and a saved Sleepyhead Original campaign using recorded provider envelopes. Add affected SKU/format/review fixtures when these two do not exercise the changed path.
5. Record passing output and unresolved limitations. An absent fixture is an incomplete check, not a pass. Legacy-contract rejections stay explicit. Do not alter old files, costs or approval status to make replay pass.

`npm test` blocks unmocked external requests. Saved replay transport is mocked. Neither checks new image quality nor proves live provider latency. New visual-quality failures require a bound saved-artwork review case as well as any relevant engine test.

## Input-context guard

The production Responses provider counts the complete request using OpenAI's `POST /v1/responses/input_tokens` before reserving a generation call. It includes instructions, text, image inputs and response schema; it does not equate bytes with tokens. It checks counted input + the actual requested output allowance + 4,096 safety tokens against the selected exact model's documented window. Reasoning tokens are included in the output allowance, not added twice.

Limits for `gpt-6-luna`, `gpt-6-sol` and `gpt-6-astra` are pinned from their official model pages, checked 2026-10-13: 1,050,000 context tokens and 128,000 maximum output tokens. Unknown model IDs require a documented registry entry; no family-prefix guesses. Review these entries when switching models or when provider limits change.

An over-budget, invalid, timed-out or unavailable count blocks generation with a specific context error. Nothing is truncated. Counting has a 30-second ceiling capped by remaining job time; the generation timeout is recalculated afterward. Each repair attempt counts its actual changed payload and enlarged output allowance. Saved-response replay makes no counting request. Offline replay/test providers explicitly disable counting; production configuration enables it.

Diagnostics are saved as `context-preflight-<requestKey>.json` and attached to successful reasoning receipts. They contain counts, hash, model, stage, margins, elapsed time and result, without source content or credentials. Counting is a separate network operation and can add latency; this change does not claim a generation speedup. Provider usage receipts remain billing authority; preflight counts are not spend or generated usage.

## Creative freedom regression boundary

Tests challenge empty-room references, warm-daylight preferences, fixed interiors, explicit people/no-people briefs, night/exterior settings and alternate treatments. Brief requirements remain required; observed style preferences and hypotheses stay proposed. Both routes preserve product evidence and brand scope.

Literal duplicate premises and visual directions reject even when titles differ. The director instructions require a changed storytelling premise plus two meaningful visual dimensions, allowing other dimensions when the brief constrains one. These tests verify contracts, provenance and handoffs. They do not prove semantic originality of paraphrased concepts or guarantee the resulting artwork; that remains part of creative review.

Official references:
- https://developers.openai.com/api/docs/guides/token-counting
- https://developers.openai.com/api/reference/python/resources/responses/subresources/input_tokens/methods/count
- https://developers.openai.com/api/docs/models/gpt-6-luna
- https://developers.openai.com/api/docs/models/gpt-6-sol
- https://developers.openai.com/api/docs/models/gpt-6-astra
