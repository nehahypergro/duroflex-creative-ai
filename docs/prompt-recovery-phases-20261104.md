# Prompt scope and response recovery — 4 November 2026

Implemented locally. No backend restart, paid provider call or historical artifact modification was performed in this change.

## Confirmed defects and changes

- `token-efficiency.instructions()` relied on exact strings that no longer existed in the art instructions. The concept wire additionally said “Produce the two creative premises” before an override. Removed the runtime rewrite function. Concept instructions and keyed schema now derive from the same selected route list. Corrected the static director workflow and art inventory error at their sources. Single continuity, single exploration and paired requests have actual assembled-prompt/schema regression checks, replacing synthetic phrase-replacement assertions.
- Provider response recovery previously shared two logical attempts. A truncation then schema error, or schema repair then truncation, could not recover. Seven new offline regression cases failed before implementation; all now pass.
- Recovery now allows one output-limit retry and one JSON/schema repair, within **three provider POST requests total**, including recorded HTTP retries. Explicit smaller request limits and existing project/component call, spending and deadline limits still apply. Repeated failure of the same class stops without using the other class as an excuse for another request.
- Output-limit recovery preserves a pending field-repair contract. A single identifiable invalid schema field can be returned as a patch, merged locally and fully validated. Existing strategy-specific semantic repairs remain supported. Unknown or cross-field errors keep the complete contract. Repairs cannot modify fields outside their patch schema.
- Full-contract and malformed-JSON recovery near the output allowance receive bounded headroom (at 80% usage, up to 1.5×, capped by the configured recovery ceiling). This does not raise that ceiling or change configured model selection/reasoning policy.
- Recovery metadata records the actual failure sequence, provider request count and exhausted limit. Existing human-readable errors had already been corrected; these changes add accurate structured history.
- Request/response persistence remains in place. Replaying identical operations reconstructs the recovery counters from saved responses. Unknown request outcomes still require reconciliation; they do not authorize a replacement call. No historical jobs or reviews were reset.
- Assembled-image review and its remaining-allowance calculation permit the same maximum of three requests, subject to the original campaign/component limits. Explicit two-request callers retain their smaller cap.

## Verification

- **157 focused tests passed**, including both-brand mocked recovery, both retry orders, saved-response replay, HTTP retry accounting, field preservation, exhaustion, output ceilings, planning and review contracts.
- One existing test still expected OCR disagreement to veto copy. Updated it to the previously approved saved-copy policy, retaining a check that genuinely changed words fail. No production copy-policy change was made in this task.
- The available saved Sleepyhead director input (`creative-7b5ecab6-869c-4e6e-af62-9820d9da5d6e`) passes offline request construction: exactly one continuity slot and matching instructions. This is not a fresh model or visual-quality test.
- Required historical both-brand QA remains incomplete: the saved Duroflex `creative-8e57a041-f219-4be2-afce-15a7a97f4b3a/art-input.json` fixture has been deleted. Synthetic tests do not substitute for that missing recorded run.

Evidence: `work/prompt-recovery-phases-20261104/tests.log`, `replay-current-concepts.cjs`, `saved-concept-replay.json`, `historical-qa.log`.
