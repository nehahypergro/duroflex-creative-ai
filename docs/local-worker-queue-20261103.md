# Local isolated-worker queue — 3 November 2026

## Scope and operation

The saved static-brief test batch now has a SQLite queue and up to five separate Node worker processes. This replaces the failed single-process `work/parallel-static-20261103/run.cjs` batch runner. The October briefs, original matrix, artifacts, provider request identities and cost records remain intact. This is the batch execution service; unrelated Studio creation endpoints have not been migrated into this queue.

Queue and reports: `work/local-workers-20261103/`. `queue.sqlite` is authoritative; `status.json` and `SUMMARY.md` are current projections. Events, prior errors, worker attempts and recovery audits are retained. The old batch's summary is historical and must not be used as live status.

macOS LaunchAgent: `com.neha.creative-ai.local-queue`. Its definition is saved alongside the evidence and installed in the user's LaunchAgents directory. It waits for the bounded verification supervisor to finish, then takes over the remaining queue. It restarts after a nonzero supervisor exit and runs at login. A clean completed or budget-held batch does not restart endlessly. SQLite preserves pending work across a restart. The Mac must remain powered on; caffeinate prevents idle sleep while the supervisor is active, not shutdown or closed-lid sleep.

## Changes

- Five rolling project slots; each child processes one job and exits. Failed/held projects release their slots. Admission is serialized until each child confirms its saved job identity, retaining the aggregate cost check, ₹10,000 new-job allowance and ₹100,000 unresolved-history buffer.
- Existing filesystem-wide gates remain four reasoning calls, two image calls and two renders, shared across processes.
- Worker heartbeat, exit, missing-heartbeat recovery and bounded retries. Live previous owners are never replaced based solely on age. Worker loss disconnects its IPC channel and stops orphan submission. macOS supervises the parent process.
- Each worker has a 1,536 MB JavaScript heap limit. RSS includes native image buffers: sustained RSS above 3.5 GiB for 30 seconds stops the worker; admission pauses above 12 GiB total reported worker RSS. Peak memory is recorded. These are local safeguards, not a guarantee against OS memory pressure.
- New-job duplicate detection scans raw metadata one job at a time rather than hydrating every historical project's images.
- Direct JSON hydration avoids reserializing expanded raster data and parsing it again. Brand/hash validation and raw artifact hashes are unchanged.
- Studio startup uses metadata-only enumeration and does not claim queue-owned jobs. Recovering jobs override abandoned generation activity and show Recovering. A supervisor-recorded interrupted job is queued for recovery or marked Needs attention when held.
- No unresolved paid request is automatically resubmitted. Existing saved reasoning response IDs are retrieved; image reservations without saved results are held. No monetary or call ceilings are reset. Expired safe jobs receive an explicitly recorded 45-minute processing continuation.

## Verification and limitations

Evidence is in `work/local-workers-20261103/`:

- `memory-before.log` / `memory-after.log`: failing-before/passing-after duplicate-creation regression for both brands.
- `json-memory-before.log` / `memory-and-queue-tests.log`: direct JSON hydration, pixel preservation and cross-brand rejection.
- `json-memory-old.json` / `json-memory-new.json`: the same saved 261 MB logical planning artifact peaked at 2,414 MB with stringify/parse versus 285 MB with direct decoding. This is a single-file measurement, not total generation memory.
- `final-regressions.log`: 53 checks passed, including provider response reuse, ambiguous-request protection, shared capacity, job status and both-brand fixtures.
- `concurrency-final.log`: five process-level checks passed. Five concurrent workers, immediate rolling refill, intentional child crash, parent SIGKILL/restart, heartbeat expiry, two-image capacity across separate processes, and no repeated fixture dispatch.
- `saved-replays-final.json`: read-only saved Duroflex and Sleepyhead planning replay; no provider calls.
- `interrupted-audit.json`: three recoverable jobs, two with ambiguous requests (WhatsApp status and carousel portrait). Those two remain held with prior reservations intact.

The first live verification exposed that an immediate 2 GiB RSS cutoff was too aggressive for image/planning buffers. Two workers were stopped; the supervisor survived and preserved checkpoints. The threshold now requires sustained pressure, and direct JSON hydration reduces intermediate allocations. All these attempts remain recorded; no failure history was erased.

Live recovery generated a Story source image but failed its text-region measurement. WhatsApp card recovery generated an image but failed editable spacing calibration. These are existing creative pipeline failures, not successful ready outputs. The carousel-square verification is tracked in the live queue; do not infer completion from this document. Queue reliability does not imply creative quality has passed.

## Commands

Read status (also checks whether the supervisor PID actually exists):

    node scripts/creative-ai/local-queue.cjs --status

Read the current summary in `work/local-workers-20261103/SUMMARY.md`.

Prepare service definition: `node scripts/creative-ai/local-queue-service.cjs`
Install/register service: `node scripts/creative-ai/local-queue-service.cjs --install`

To pause only new admissions, write `{"pauseAdmissions":true}` to the queue directory's `control.json`. Active work completes. Remove that flag to resume. Do not alter request reservations or reset attempts to conceal errors. A budget/provider halt requires inspecting the recorded cause before resuming.
