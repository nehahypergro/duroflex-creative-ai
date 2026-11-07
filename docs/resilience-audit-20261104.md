# Error, lock, job-store and distributed-worker audit

## Findings and changes

### S4 — error handlers

Confirmed: the runner's detached promise rejected when its error-state write failed. The HTTP handlers assumed `.message` and `.code` existed on every thrown value. Some Studio, shared-editor and Admin asset handlers committed HTTP 200 before reading files.

- The runner contains failure-recording errors, reports failed persistence to stderr, and releases its active slot so other queued jobs can proceed. Saved results produce partial status when failure metadata can be written. A full disk can still prevent persistence; the application does not claim that record was saved.
- Shared error handling normalizes null, string and object throws. An already-started response is terminated rather than receiving another set of headers or JSON appended to an asset.
- Buffered static-asset reads finish before success headers are sent. Existing streaming routes terminate on a stream error; once bytes have been sent, they cannot change the HTTP status retroactively.

### S5 — orphan locks

Partly confirmed: empty, malformed and foreign-host locks deliberately remain blocked because their owner cannot be proven dead. PID-only identity also cannot detect PID reuse. There was no supported maintenance tool.

- New locks include a boot UUID and process start identity on macOS/Linux. Same-boot hostname changes and a demonstrably different process behind a reused PID can now be handled without stealing a genuine live owner.
- Existing lock formats remain supported. Unverified locks are not removed based on age. Unsupported/unavailable process identity falls back to conservative handling.
- `scripts/ops/inspect-lock.cjs` inspects a lock and returns a fingerprint. Offline maintenance requires the fingerprint and an explicit stopped-writers assertion. It refuses proven live owners, quarantines rather than deletes the marker, and saves an audit record. This applies to supervisor locks too, since the local supervisor uses the shared lock implementation.

Example, after stopping **all** processes that use the specific lock:

```sh
node scripts/ops/inspect-lock.cjs /absolute/path/to/.supervisor.lock
node scripts/ops/inspect-lock.cjs /absolute/path/to/.supervisor.lock --quarantine --writers-stopped --fingerprint=HASH_FROM_INSPECTION
```

Do not use maintenance against active writers. Lock quarantine does not authorize resubmission of an uncertain paid request. No existing Studio or queue locks were quarantined during this audit.

### S6 — orphan project directory

Confirmed: `findRequest` stopped on ENOENT from any project folder, blocking unrelated keyed creation. It now skips missing metadata, preserves the folder, and continues checking valid records. Other read errors, including corrupt JSON and permissions failures, remain explicit rather than silently disabling duplicate detection. Both brands retain concurrent/keyed duplicate protection.

### Distributed execution

Confirmed: an uncaught claim failure rejected `Promise.all`, closed the pool while the other loop was working, and heartbeat failures aborted the provider response.

- Each claim loop catches database failures with bounded backoff. Shutdown waits for both loops and in-flight work before closing PostgreSQL.
- Heartbeat failures do not abort or resend an already-dispatched paid call. Only one heartbeat is outstanding at a time. Provider deadlines remain bounded, and database completion remains fenced by the request's lease token.
- A completion receipt is stored in private object storage before the database completion update. It binds brand/job, request key, input hash and lease token to the saved response. Completion metadata receives bounded retries. A later worker can verify the receipt and repair the database row without a provider call. Reconciliation pages through outstanding rows and isolates individual errors.
- Requests proven cancelled before dispatch release their **shared internal reservation** transactionally, once. This is not a refund of provider charges. Unknown/completed requests retain their cost reservation; an unknown request continues occupying capacity through its deadline unless its saved completion is reconciled. Removing that safeguard without evidence could overbook capacity or conceal spend.
- An outage that also prevents durable object storage can still leave a response unavailable. These changes do not make unknown outcomes safe to redispatch.

## Verification

70 focused tests passed: 47 shared runtime/server/startup/lock tests and 23 distributed tests, including a real isolated PostgreSQL instance and mocked provider/storage operations. Coverage includes both brand namespaces, error-recorder disk failure, null throws, missing assets, orphan folders, live-owner exclusion, reused PID and hostname evidence, heartbeat failure during a single provider call, completion-receipt recovery, independent loop draining, and reservation release only before dispatch.

Before/after evidence is under `work/resilience-audit-20261104/`. Original error-handler and orphan-folder tests all failed before the patch. Prior lock code reproduced the reused-PID blockage. Original cloud tests reproduced heartbeat-triggered abort and absence of durable completion recovery. No paid calls or creative regeneration were required.

Cloud execution is not configured in this local deployment. The cloud changes are verified by isolated tests, not a production cloud rollout. Local activation and saved-work hashes are recorded in `activation-before.json` and `activation-after.json` in the evidence directory.
