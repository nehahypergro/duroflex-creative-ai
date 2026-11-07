# Request isolation and expired-job recovery — 4 November 2026

## Confirmed defects

- The public sharing-route predicate parsed a request URL outside the server's request error boundary. Malformed targets such as `//[` threw `ERR_INVALID_URL`; isolated child-server tests reproduced process exit both before authentication and with authentication disabled.
- Persisted running jobs whose processing deadline had expired were skipped during startup. Recovery inspection continued reporting them as active without a live worker. The previous implementation reproduced `active: true, canResume: false` for this case.

## Changes

- The sharing predicate safely rejects malformed URLs. An outer asynchronous request boundary also catches rejected public-route handlers. Malformed requests return HTTP 400 without taking down the server; authentication and capability-link permissions remain enforced.
- Startup reconciles expired campaign jobs under the runner lock, rechecking state under the update lock. Jobs with saved results become partial; those without results become failed. The previous status, stage, error and deadline are retained in `startupInterruptions`. Live workers and separately managed local-queue jobs retain ownership.
- Recovery inspection also performs this reconciliation. Eligible explicit continuations reuse the same project and checkpoints, recording a fresh bounded processing window in `processingContinuations`. The original deadline, call limits, reservations, receipts and spending ceiling remain unchanged.
- Missing responses for reserved provider requests still prevent redispatch. Completed review failures still require their review-specific recovery workflow. Dedicated recovery jobs are not rerouted into ordinary generation.
- Status reconciliation reads metadata without hydrating image blobs. Missing image blobs therefore do not prevent correcting a stale running status; this does not repair those missing files or guarantee subsequent generation can proceed.
- Startup records a recovery report and isolates individual reconciliation errors so they do not stop other jobs.

## Verification

41 focused tests passed:

- 12 server, workspace/access-boundary and editor-sharing checks, including malformed requests followed by successful requests to the same live test process.
- 29 startup, resume/deduplication, restart, file-lock and timeout/recovery checks. These include both brand namespaces, preserved checkpoints/results/budgets, concurrent continuation clicks, missing provider responses, unavailable raster blobs, unchanged call/spend limits, and actual HTTP-runtime startup wiring.

Before/after evidence: `work/request-restart-recovery-20261104/`. The startup-before log exercises the previous implementation from Git against an isolated expired-job fixture. Tests use temporary stores and mocked dispatch; existing project data and historical verdicts were not rewritten during testing.

## Activation

The user authorized restart, completed at 17:31 UTC on 4 November (23:01 IST), replacing process 13117 with 17433 through the existing supervisor. The login-enabled entry point disables automatic job resumption, so it now explicitly runs status reconciliation with scheduling disabled. This loads the stale-status fix without starting generation. Fifteen focused activation checks passed, including this non-scheduling path.

Live checks: malformed URL returned 400; the following admin request returned 200; an unauthenticated private API request returned 401. The new process remained alive. Expired project `creative-bec2cef8-3077-414c-93db-bd88206029d1` changed from running to failed with `PROCESSING_WINDOW_EXPIRED`; budget, result and intake hashes stayed identical. It had no worker lock and its deadline had expired roughly five hours earlier.

Activation evidence is in `work/request-restart-recovery-20261104/activation-before.json` and `activation-after.json`. No paid requests or batch runs were started. This verification covers the reported server/restart defects, not a fresh generated-artwork quality run.
