# Static-run reliability — 22 October 2026

These are shared-engine changes. Brand material, product variants, historical reviews,
provider reservations and original image budgets remain separate and unchanged.

## Reproduced failures and changes

- A policy-version bump disabled copy-fit assessment, final-export type guidance
  and field-level reading observations. Supported versions are explicit and tested;
  new pins use `2026-10-22.3`. Earlier pins retain their own saved assumptions.
- `supporting-copy` was not included in body-capacity counts. Both supported roles
  now contribute. These are drafting signals, not official publisher word caps.
- A desktop website banner was evaluated as a phone-wide image. New desktop web
  hero/banner pins declare an assumed 1024 CSS-pixel component; mobile remains a
  separate 320-pixel test. Actual site acceptance still requires the site contract.
- Short landscape feed/features used tall-tile copy capacity. New pins reduce
  starting capacity using displayed height. Exact user wording and disclaimers
  remain protected. A single upstream copy review may simplify generated copy
  before image generation; it does not reset any budget or bypass actual review.
  A revision that increases embedded word count now fails validation and receives the existing bounded schema repair, rather than silently making a fit problem worse.
- PDP measurement/material/feature cards were classified as overlay-free product
  photography. Their actual purpose now selects the feature reading policy.
- Long measurement strings may wrap. Source facts do not authorise extra repeated
  diagram captions or tiny labels outside the exact copy allowlist.
- Short `UND_ERR_SOCKET`/`EPIPE` upload failures persist despite closing connections.
  Closing connections alone is therefore a mitigation, not a proven complete fix.
  A later compressed-upload proof also recorded a 112 ms lost socket with 230,413 bytes written and no response bytes. Compression and concurrency limits do not establish that the transport issue is resolved; no ambiguous request was resent.
  Image calls now share a per-provider limit of two. Projects may plan concurrently.
- PNG references can be sent as lossless WebP only when smaller and identical in
  decoded sRGB RGBA pixels. All references remain present. Higher-bit-depth and
  multi-page inputs retain original bytes. Source hashes bind response identity;
  wire hashes/bytes are separate receipt provenance. Historical saved response
  replay must not reserve another call or claim new wire measurements.
- Socket diagnostics retain only bounded byte counts and error codes, never
  private addresses, request bodies, credentials or raw error messages.
- The banner preview label now matches the connected 1920 × 640 route.

- A complete structured HTTP 429/500/502/503/504 reasoning error now permits one separately reserved recovery attempt. Both failed responses and unknown charges remain recorded. Restart replays the recovered response; two errors stop. Socket loss, unreadable responses and input errors do not trigger this recovery.

## Boundaries

No ambiguous paid POST is automatically resent. A disconnected request may still
have been billed. A fresh attempt needs user authorisation; old unknown charges
remain unknown until reconciled. External service availability and generative
visual fidelity are not guaranteed by passing software tests.

A complete client scope is still larger than these implemented routes. A successful
image is not proof of publisher eligibility, print approval, responsive web delivery,
a complete twelve-image PDP pack, or an implemented document/catalogue workflow.

## Evidence

Private local evidence is in `work/reliability-fix-20261022/`: failing-before tests,
focused/full suite logs, both-brand recorded handoffs, original artifact hashes,
lossless-upload proof, fresh job IDs and before/after results. Actual new image
quality is assessed separately from replay and synthetic fixtures.

## Final bounded retry outcome

Nine fresh attempts preserved separately. Both website-banner options and one
WhatsApp option pass in the latest route results. Two earlier PDP images also
passed individual checks, but the fresh three-image PDP pack is incomplete and
must not be described as passed. A+ retains genuine small-preview legibility
failures; LinkedIn's copy-fit conflict remains unresolved. The final PDP proof
recorded another lost upload socket, so transport reliability is still open.
No failed or uncertain result has been upgraded to ready.

The final targeted shared tests pass 34/34. Both brands' recorded handoffs pass.
The latest broad offline run reports 889 passed and 13 failed out of 902 tests;
these UI failures remain documented in the local logs. This is not a green
release claim. All 105 fingerprinted original evidence files remain unchanged.
The idle live Studio was restarted after the tests ended and its health checked.

## Upload transport replacement — 23 October 2026

Production image edits now use JSON with verified CDN image URLs, supported by
[the official Images edit API](https://developers.openai.com/api/reference/resources/images/methods/edit).
The image model, prompt, source-bound replay identity and reference pixels stay the
same. The earlier multipart socket losses occurred before any response, as early
as 112–395 ms. Those logs do not identify which network hop closed the connection.
This change removes bulk reference transfer from the paid generation request;
it does not claim to repair an external network or guarantee zero disconnections.

Before reserving image generation, the shared provider:

1. Saves immutable, hash-named reference rasters within the owning project.
2. Uses the existing brand-scoped CDN cache; concurrent identical transfers share
   an upload, and another brand cannot borrow its receipt.
3. Allows at most three transfer attempts for transient connection/body failures
   and explicit 408/429/500/502/503/504 responses, with backoff and Retry-After.
   Total staging time is capped at 120 seconds and the remaining job deadline;
   at most two staging operations run concurrently, with a bounded waiting queue.
4. Checks the CDN's actual bytes, including on cache reuse. Corruption, unavailable
   objects, invalid receipts, permanent HTTP errors and missing scope block paid
   dispatch. Prompts, metadata and API credentials are never sent to the CDN.
5. Reserves one image call and submits only the prompt/settings and verified URLs.
   Saves the full response durably before receipt processing. A lost generation
   response stays unknown and is never automatically resent, including on restart.

A transfer with a lost CDN acknowledgement can leave a duplicate/orphan storage
object after its bounded retry; it cannot start image generation. Storage charges,
if any, are not independently measured. The staging gate/cache coordination is
process-local; a distributed worker deployment still needs shared coordination.

Evidence: `work/upload-reliability-20261023/` (private local logs and manifests).
Four initial regressions failed before the implementation; the expanded focused
suite passes 44 tests and compatibility checks pass 24. A separate real-socket
integration test passes ten interrupted upload/body transfers at varied sizes.
Ten raster/source/order
variants cover both brands offline. Both-brand recorded handoff checks pass with
zero paid dispatches. The full offline run completed: 965 tests, 941 passed,
23 failed and one cancelled. Two failures were invalid-timeout fixtures, corrected
and rechecked in the 24 passing compatibility tests; the remaining failures and
cancellation are UI/navigation coverage. This is not a clean full-suite pass.

Ten real CDN staging/verification passes completed using the saved Duroflex
Airboost references (single/multiple/reversed order). One separately recorded
live image proof succeeded: `creative-8f88cbbb-4c37-4894-9957-4301efa664da`.
The paid JSON body was 28,776 bytes; response completion took 34,436 ms. The saved
image is a transport proof, **unreviewed**, not a passed creative or complete pair.
Usage estimate: INR 4.83 using the saved USD/INR 96.6149 basis dated 9 October 2026;
no unknown entry for this proof, and actual provider billing is not reconciled.
Old unknown charges remain unchanged. The idle local server was restarted and
its health endpoint verified after the previous batch completed.

These checks do **not** replace ten live generations per affected route or the
pending PDP/A+/LinkedIn visual and complete-set acceptance work.

## Navigation follow-up — 23 October 2026

The remaining navigation failures have been fixed/rebaselined against the current
requested UI. Fresh progress status now governs redirects, brand switches clear
old controls before cache restoration, pending scroll restoration cannot be
overwritten by a refresh, and narrow-screen review artwork remains visible.
`npm test`: 971 passed, 0 failed/cancelled. Both-brand saved handoff replay: zero
failed stages. Twenty repeated navigation cycles passed (ten per brand); these
are isolated browser checks, not live generation or image-quality acceptance.
See `docs/navigation-reliability.md` for causes, evidence and coverage. The older
failed run above remains historical evidence.
