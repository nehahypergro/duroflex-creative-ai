# Recorded progress and automatic updates — 22 October 2026

Applies to the shared Static Studio for Duroflex and Sleepyhead. Frontend changes only; no generation endpoint, retry policy, provider configuration, cost ledger or historical job was changed.

## Experience

Progress shows Preparing → Creating → Reviewing → Ready. The current stage is derived from saved active stages and the existing activity projection. Research/strategy/design preparation maps to Preparing; generation maps to Creating; review maps to Reviewing. Concurrent generation and review stays on Creating and explains that some options are already being reviewed. Unknown active stages remain unconfirmed rather than guessed. Completed step markers require recorded stage completion.

Finished jobs with saved artwork say **Ready to review**. This does not approve the artwork or remove its flags. Failed, partial, missing-output and needs-input records are never upgraded to Ready.

## Polling safeguards

- Checks the open progress/project job every five seconds, with one request in flight.
- Uses existing GET endpoints only. It never starts, retries or reserves generation.
- Stops periodic requests after completion; refreshes immediately on returning to the tab or window.
- Pauses while hidden/offline or after navigation. In-flight reads are aborted where possible; late responses are rejected by job, brand, route and navigation epoch.
- Failures keep the last confirmed stage and show a concise reconnecting message. Retries back off to 10, 20, then at most 30 seconds. A read has a 20-second timeout. Retry loading performs only another status read.
- Active polling does not reload all projects or edit histories. Terminal refresh also reads that job's saved edits so a project cover can reflect the latest saved version.
- Refresh guards preserve unsaved inputs, editor state and review notes. Routine successful checks do not redraw unchanged progress.
- No percentage, elapsed-time completion inference or ETA is displayed.

## Verification

Evidence: `work/studio-progress-20261022/`.

Initial tests reproduced missing stage/poller functionality before implementation. Deterministic tests cover stage truth, parallel activity, missing history, partial/failed outputs, one in-flight request, cancellation, stale-brand responses, bounded retry and terminal stopping. Browser checks exercise both brands through Preparing, Creating, Reviewing and Ready, visibility pause/resume, offline reconnect, failure recovery and GET-only traffic. Existing tests cover unsaved input preservation, persistent navigation, draft-to-progress handoff and client-facing wording. Saved Duroflex and Sleepyhead replays completed with zero failed stages and zero paid calls.
