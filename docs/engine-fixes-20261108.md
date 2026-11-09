# Engine fixes from the 8 November 2026 review

Shared-engine fixes for both brands, made after a full code review and five live test jobs (Duroflex pillow, Quboid, Octave; Sleepyhead Napster Mini, Sofa Kiki). Each fix has a regression test that failed on the earlier code. Dossier storage is covered separately in `docs/dossier-storage-20261108.md`. Item numbers follow the review list.

## Fixes

### #2 Corrections never accepted
- **Symptom:** across 26 saved lean options, 0 originals passed every check, and 0 of 12 paid correction candidates were promoted. Reviews always had `unable_to_verify` items that pixels cannot answer (export canvas size, file, provenance). Lean results therefore never counted as ready, and campaign packs left them out by default.
- **Change:** conformance v1 is pinned per new planning record (`lean-policy.js`, `lean/visual-review.js`, `lean/correction.js`, `lean-workflow.js`, `campaigns.js`, `campaign-pack.js`).
  - Requirements that cannot be judged from pixels are no longer sent to the visual reviewer. They are listed as `notVisuallyVerifiable`.
  - A candidate is promoted when no check is `clear_mismatch`, `correction-integrity` passes, and every original mismatch now passes.
  - A result with no remaining concrete mismatch counts as deliverable. `qualityVerified` stays strict, and unverified items stay visible. Campaign packs label these "No blocking issue found".
- **Effect on saved data (read-only replay):** 13 of 26 originals had no concrete mismatch, and 3 of 12 candidates would have been promoted. Historical records are unchanged.

### #3 A failed correction marked the job "partial"
- **Symptom:** 2 of the 5 live jobs failed with "Correction prompt exceeds compact limit" (14,000 characters). A separate mask-rounding bug could also throw at the canvas edge.
- **Change:**
  - Prompt length and mask are checked before paying for the correction, and inside the decision's repair loop.
  - Findings already stated in the brief are referenced instead of repeated. The limit is 28,000 characters for pinned records.
  - The mask keeps a one-pixel border.
  - Any correction failure keeps the original artwork, records `correctionFailure`, and lets the job finish. Interrupted units now log `task.failed`.

### #4 Planning rejected valid wording
- **Symptom:** job creative-df75eb60 (Sofa Kiki) failed with "Product identity citation does not support copy" for "3 Seater. Sapling Green. High density foam.".
- **Change:** in `lean/planning.js`, a copy block's words may come from the product identity or from a fact cited by the same block. Words supported by neither are still rejected.

### #5 Repair messages were cut off
- **Symptom:** `provider.js` sent only the first 1,500 characters of validation errors on the field-repair path (regression from 3 Nov). A second cause: an unrelated schema error triggered single-field repair for semantic errors.
- **Change:** whole errors are sent, up to 5,000 characters, with a count of any omitted. Single-field repair is used only when every error is a schema error on that field. `art-provenance.test.js` now passes.

### #6 Memory crashes
- **Symptom:** 14 out-of-memory crashes. Saved picture references were expanded into 100+ MB strings on every image call (brand safety check), every preflight and every research view.
- **Change:** `artifact-fs.readJsonRaw`, plus `reference-storage.inspect/verify/resolve/identity`.
  - The brand safety check compares picture fingerprints and fully verifies only the pictures actually sent.
  - Readiness expands only the selected references.
  - The estimate lists jobs without pictures.
- **Measured on creative-3155114b:** extra heap per image call 1,331 MB → 13.6 MB. Two concurrent calls 2,660 MB → 29 MB. Time 1.39 s → 26 ms.

### #7 One slow call could use the whole 45-minute window
- **Data:** from 1,047 saved receipts, the median call takes 32 s and p90 is 61 s. The slowest successful planning call took 456 s and the slowest successful outlier 619 s; stalled calls ran 1,160–1,976 s.
- **Change:** `reasoning-transport.js`, `provider.js`, `store.js`, `resume-work.js`, `config.js`.
  - **Per-call limits:** planning 8 min, reviews and corrections 4 min. Set with `CREATIVE_AI_PLANNING_CALL_LIMIT_MS` and `CREATIVE_AI_REVIEW_CALL_LIMIT_MS`.
  - **At the limit:** the call is cancelled (and the cancel confirmed), then re-sent once under a new request key with its own reservation. A replacement needs 2 min of job time left.
  - **Cost:** the cancelled call's charge is recorded as unknown, never zero.
  - **Polling:** capped at 4 s.
  - **Queue time:** for new jobs, the 45-minute window starts when the job leaves the queue. Later queue waits are added back.

### #8 Stuck jobs and leftover locks
- **Change:** `file-lock.js`, `process-identity.js`, `lock-maintenance.js`, `background-maintenance.js`, `admin-server.js`, `scripts/admin/local-studio.js`.
  - Empty or half-written lock folders are reclaimed after 90 s. The reclaim is race-safe and never touches a live owner.
  - Locks from a previous boot are reclaimed only when the owner is provably gone.
  - At startup a reconciliation pass (`startupPass`) releases stale locks. Jobs left running or queued by a dead process are marked `PROCESSING_INTERRUPTED` with "nothing was resubmitted", and in-flight image requests are flagged for attention. It never dispatches or schedules paid work; automatic resumption stays off.
  - The three empty `.submission-*.lock` folders from 7 Nov are removed on the next start.

### #9 A failed image request blocked resume
- **Change:** `provider.js`, `image-response-recovery.js`.
  - Complete image HTTP failures are saved, with charge unknown.
  - 429/5xx errors get one retry with its own reservation, honouring Retry-After. Other 4xx errors fail with `IMAGE_PROVIDER_HTTP_ERROR` and are never re-sent.
  - High-quality images need 3 min left before dispatch (`IMAGE_TIME_WINDOW`).
  - Older jobs with an unsaved failure can be reconciled without a paid call.
  - New error codes map to friendly client messages (`client-error-codes.js`).

### Duplicate product photo
- **Symptom:** in all five live jobs the protected exact-SKU reference was a resized copy of website photo 1 (`…/1_abc_600x600.jpg` vs `…/1_abc.jpg`), so both image models received the same picture twice.
- **Change:** new jobs pin `leanReferenceVersion: 1` (`lean-policy.js`, `provider-config.js`). `lean-context.js` skips a photo whose website file was already chosen, so new jobs send three distinct views.

### #20 Main code out of `experiments/`
- `planning.js`, `visual-review.js`, `correction.js` and `requirements.js` moved (git history kept) from `lib/creative-ai/experiments/lean-planner/` to `lib/creative-ai/lean/`. Only their import paths changed.
- One-line pointers at the old paths return the same module objects, so experiment scripts and older tests keep working.
- The README was corrected (run steps, sign-in, Studio URL, INR, Sheet sync status, code-style note). No mass reformat was done, to keep history readable.

### #10 Queue and concurrency settings
- Stage queue sizes and provider concurrency are now settings (`config.js`, `engine.js`): `CREATIVE_AI_PLANNING_JOBS`, `CREATIVE_AI_IMAGE_JOBS`, `CREATIVE_AI_MAX_IMAGE_CALLS`, `CREATIVE_AI_MAX_REASONING_CALLS`.
- The code defaults keep the old values (2 / 2 / 2 / 4). The main Mac's `.env` sets 3 / 3 / 4 / 6, now that the memory fix removed the limit.
- **Follow-up bug, found on the first run:** all 10 test jobs failed before dispatch (0 provider requests, no charge) with "Shared capacity configuration differs between workers". The saved `.provider-capacity/<kind>/policy.json` is written once and never updated.
- **Fix:** `shared-capacity.reconfigure` changes the limit only while no slot is held or waiting. At startup, `background-maintenance.alignCapacity` aligns the job and research-session policies with `.env` before serving. Mismatches while running still refuse. Test: `shared-capacity-reconfigure.test.js`.

### Test-suite note
- `sku-research.test.js` compared the whole budget after a resume. Re-queuing now records a transient `processingWindow.queuedAt`. The test now ignores only that field and still checks the deadline and budget exactly.
- Full suite on all combined changes: 2,605 tests, 2,557 pass, 45 fail (originally 46). The remaining failures are the pre-existing missing-fixture, outdated-expectation and broken-setup groups, plus two timing-sensitive tests that pass when run alone.

### Bugs found by the 10-product test (8 Nov 2026, afternoon)
Run: 5 Duroflex and 5 Sleepyhead untested products, brand-manager style briefs, six formats, five languages (English, Hindi, Hinglish, Kannada, Tamil). All 10 finished after the fixes below. Total cost about ₹408, estimated at ₹96.61/USD (RBI, 9 Oct 2026), including failed attempts.

- **Upload window used up by queueing:** "Reasoning reference transfer failed before paid dispatch" hit 4 jobs. The 2-minute staging window started before waiting for the server-wide 2-slot upload gate, so it ran out under higher concurrency.
  - Fix (`image-reference-stage.js`): the window starts once a slot is acquired, and the gate allows 4 transfers.
  - Fix (`reasoning-media.js`): the error now keeps the underlying cause code.
  - Test: `reference-stage-queue.test.js`.
- **Citation check, round 2 (`lean/planning.js`):**
  - Plain CTA verbs ("Learn about", "See", "Try", "Buy", "Know more about"…) are no longer treated as claims.
  - Captions published beside the artwork are not word-checked against the product name.
  - Product and variant names written in another script are rejected with "keep the original spelling", and the planner instructions now say so.
  - Lines in other scripts were previously ignored by the check, not verified.
  - Tests are in `lean-identity-citations.test.js`.
- **Recorded, not yet fixed:**
  - An explicit brief "logo" mandatory loses silently to the website-banner and organic-story no-logo policy. Seen on the Prana and Original banners.
  - One Airboost Duo Topper option shows the logo with a glow effect, which the reviewer did not flag.
  - Portrait posts and stories are all flagged for layout (central-crop logo/text and planned spatial arrangement), and no correction was kept.
  - The WhatsApp format defaults to requiring a phone number.
  - A token-count timeout is marked retryable but not retried.
  - Output sizes still differ from the requested canvas (#1).

### Resume could never recover from a provider slowdown (8 Nov 2026, evening)
- **Symptom:** two Duroflex jobs from the new home brief box (creative-7eadcda7 and creative-8ecc28b4) failed with "exceeded its 8-minute per-call time limit twice".
  - OpenAI showed the cancelled gpt-6.1-sol responses had produced only 350–800 tokens in about 9 minutes. That is about 1.6 tokens/s; planning earlier that day took 30–270 s. So the provider was slow, and the input was not the cause.
  - "Resume interrupted work" then failed again in 18 ms and sent nothing. The transport replayed the same two deterministic request keys, found both saved as call-limit cancelled, and re-raised the error. Resume could never get past a provider slowdown.
- **Change:** `reasoning-transport.js` (new `continuation` input), `provider.js` (passes `budget.continuations()`), and `store.js` (budget exposes the count of explicit operator continuations).
  - Each request plus its one call-limit replacement forms a "generation".
  - An explicit continuation may move to a new generation, with fresh keys and fresh reservations. This happens only when every earlier generation ended in two **confirmed** call-limit cancellations.
  - A pending, unconfirmed, failed or ambiguous request is still reconciled and never duplicated.
  - Automatic replay and startup reconciliation are unchanged. Cancelled calls keep unknown charge.
- **Tests:** two new tests in `provider-time-limits.test.js`. The fresh-request test failed before the change; the unconfirmed-cancellation guard holds.
- **Live check:** after a restart, resuming creative-7eadcda7 dispatched one new planning call (reasoning calls 3 → 4) and the job ran again.

### Provider fallbacks instead of long waits (8 Nov 2026, user decision)
- **Why:** on 8 Nov, OpenAI had unannounced slow patches (around 11:03–11:36 and 12:14 UTC). Background requests sat queued or produced almost nothing, and jobs waited 8 + 8 minutes before failing. There was no rate limiting: under 1% of our limits were in use, and the status page showed no incident.
- **Transport (`reasoning-transport.js`):**
  - A background request still `queued` after `queuedLimitMs` is cancelled. Once the cancellation is confirmed it is saved as `cancellation.reason: 'queued-too-long'` and replaced through the existing single-replacement path.
  - A new `prepareReplacement({reason})` hook runs before the replacement is sent.
  - Both reasons count as deliberate confirmed cancellations for the continuation logic.
- **Provider (`provider.js`):**
  - The replacement is sent directly (no `background`, no `store`) with its own call-limit timeout.
  - If the job pinned `fallbackModels[contextKind]`, the replacement uses that model and effort.
  - The success receipt records the model that actually answered, its effort and `fallback: {reason, model, primaryModel, direct}`. Cancelled attempts keep unknown charge under the primary model.
- **Limits:** planning call limit 4 min (was 8), queued limit 90 s, brief reads 60 s and 30 s queued; reviews keep 4 min. Settings: `CREATIVE_AI_PLANNING_CALL_LIMIT_MS` and `CREATIVE_AI_QUEUED_LIMIT_MS`.
- **Backup model:** new lean jobs pin `fallbackModels: {'lean-planning': {model: 'gpt-6-luna', reasoningEffort: 'high'}}` (`lean-policy.js`, snapshot default `{}` in `provider-config.js`). Older jobs keep their contract: a direct replacement, but no backup model.
- **Brief box:** if the AI read fails or the service is unavailable, the home page fills the full brief form from the marketer's words using the free local autofill. Mattresses get the Queen default. A note asks them to check it. Nothing is confirmed or generated automatically.
- **Tests (`provider-time-limits.test.js`):** a request stuck in the queue is replaced through the hook; running work keeps its full call limit; lean planning's replacement goes directly to the backup model and the receipt says so. Also covered: the updated defaults, and the local fallback in `brief-reading-draft.test.js`.
- **Not done yet:** a "Backup model used" label in the Studio UI. Gemini 4 Argon as a backup from another provider is proposed, pending a comparison test and the user's approval to send data to Google.

### Local-language copy beside the product name (8 Nov 2026, found by the planner comparison)
- **Symptom:** the round-2 citation rule rejected every non-Latin character in a line that cited the product. So "Cove सोफ़ा देखें" and "Duro Safe - Waterproof Mattress Protector ಖರೀದಿಸಿ" failed for every model on the saved Hindi and Kannada packets. No live job failed on it; the rule had existed only since that afternoon.
- **Change (`lean/planning.js validateCitations`):**
  - A product-cited line may add up to three local-language words when the product name is kept in its supplied spelling.
  - Longer local-language text is accepted when the line also cites the product facts it describes. A long local claim that cites only the name is rejected.
  - A name written only in another script is still rejected.
  - Lines sent beside the artwork ("accompanying … message only, not embedded") are treated like captions.
- **Tests:** two new tests in `lean-identity-citations.test.js` use the real rejected lines.
- **Replay:** with the fix, every saved gpt-6.1-sol plan from the comparison passes (8/8). The remaining Luna and Argon rejections are real omissions, such as missing brand-rule decisions or unsupported copy.

### Planner comparison (8 Nov 2026, user-approved paid test)
- **Setup:** 8 saved lean planning packets (4 Duroflex, 4 Sleepyhead; English, Hindi, Kannada, Tamil, Hinglish). Each model got the same request, schema and validator, and at most one repair. Scripts are in `lib/creative-ai/experiments/planner-comparison/` and results in `work/planner-comparison-20261108/`. Spend is in the ledger under `output/creative-ai/planner-experiments` (Testing): about ₹195, at ₹96.61/USD (RBI, 9 Oct 2026).
- **Results:**

| Model | Valid first try | Valid after 1 repair | Median s | Median ₹ per plan |
|---|---|---|---|---|
| gpt-6.1-sol high | 2/8 | 6/8 (8/8 with the fix above) | 133 | ₹14.25 |
| gpt-6-luna high | 3/8 | 5/8 | 119 | ₹0.83 |
| gemini-4-argon high | 2/8 | 4/8 | 217 | ₹19.31 (about ₹38 from 1 Dec 2026) |

- **Decision:** gemini-4-argon is **not** the backup. It was the slowest, the least often valid and the most expensive, and it sends data to Google. gpt-6-luna stays the backup planner: about 1/17 of Sol's cost, fastest, and good copy. It sometimes misses brand-rule decisions, so expect repairs.

### #1 Exact output size without cropping content or stretching (8 Nov 2026, user decision)
- **Symptom:** images came back at the requested shape but about 1 megapixel in size, for example 896×1120 for 1080×1350 and 752×1344 for 1080×1920. The second model (`gpt-image-2.6-sunburst`) used `size: 'auto'` and was sometimes about 5% off in shape (916×1717, 1092×1440). Downloads were blocked by "The image dimensions do not match the selected format".
- **User choice:** keep today's generation size (cheaper), enlarge evenly, and never stretch. They reviewed demos on saved images (`work/resize-demo-20261108/`). Trimming the 5% cases pushed the logo against the edge, so those extend instead.
- **Change:**
  - New lean jobs pin `exactCanvasVersion: 1` (`lean-policy.js`, `provider-config.js`).
  - Both models are sent the exact-shape `generationSize`. A direct probe confirmed sunburst returns the exact 896×1120 requested; it cost about ₹1.92 and is in the ledger as a manual Testing entry.
  - `exact-canvas.js fit(bytes, W, H)`:
    - **Shape off by 1% or less:** enlarge evenly with Lanczos to cover the canvas, then trim the few extra pixels equally from both edges.
    - **Off by more:** enlarge evenly to fit, then extend the edges by mirroring.
    - **Already exact:** returned unchanged.
  - `lean-workflow.js` keeps the raw output as `static-lean-raw-<key>.png`, saves the fitted image as the original (so review, downloads and corrections use the exact canvas) and records `state.originalFit`.
  - Corrections fit the corrected output to the same grid before protected pixels are restored (`state.candidateFit`). Older jobs keep their saved contract.
- **Tests:** `exact-canvas.test.js` (same shape, small trim, larger difference extends, already exact) and assertions in `lean-main-flow.test.js` (original fitted, candidate on the same grid, no `auto` size).
- **Not done:** print sizes larger than the model can produce still need a separate upscaling step. The visual review does not yet have an explicit "logo/text too close to the edge" check.

### Second image model retired; estimate fixes (8 Nov 2026, user decision)
- **Model:** new lean jobs pin a single option, `{route:'continuity', model:'gpt-image-2', quality:'high'}`. Earlier jobs keep two options via their snapshot or `jobOptions`. Tests pin that two-option contract explicitly where they cover older jobs. New tests cover one design per page with no sunburst request (`lean-main-flow.test.js`) and check that `configure` pins only `gpt-image-2` (`provider-job-config.test.js`).
- **Estimate bug (`studio-estimate.js`):** runs planned by gpt-6.1-sol were rejected because the allowed reasoning models were hard-coded (astra/luna). It now accepts each job's pinned role, backup and reasoning models.
- **Estimate scaling:** for one design per format, a past two-option run keeps its planning calls and gpt-image-2 images, drops sunburst images, and counts half of the review/correction calls. The message says so. Test: `studio-estimate.test.js`.
- **UI:** the "Designs per format: One design per format" label replaces "Option A and Option B"; option counts of 1 are hidden; the picker's skip link and intro line are gone; picker tiles are smaller (6 per row at 1366px).

## Decisions recorded
- The two options are a model comparison from one shared plan; similar compositions are expected (user, 8 Nov 2026).
- Product photos may keep their website scenes; only the duplicate photo is removed (user, 8 Nov 2026).
- `spatial-layout` mismatches still block promotion and readiness.

## Known gaps and follow-ups
- `npm run test:qa:both-brands` cannot run: its saved fixture jobs no longer exist. This is incomplete, not passed.
- Image output size is still not enforced to the requested canvas (review item #1).
- Reference uploads before each call are still serial with a 2-slot gate (review item #11).
- `selected-references.js` (legacy path) and `store.budget.brandContext` still expand references. GET `/research/:id` still sends every dossier picture inline to the old workspace.
- The old workspace (`app.js`) labels a deliverable-but-unverified result "Saved review passed".
- An image HTTP retry uses one of the job's image calls, so a later correction can hit the image-call cap.
- The local-queue supervisor's `alive()` uses only `kill(pid,0)`.
