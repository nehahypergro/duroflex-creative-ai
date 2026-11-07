# Lean planner comparison experiment

Opt-in experiment for the Duroflex Airboost 6.8 Arctic Ice Queen 78 × 60 × 8 inch mattress. The production engine does not import this module.

## Current flow (v2)

1. Compile current, revision-bound brand guidance and scoped explicit preferences into a reusable content-hashed context. Keep source authority, mandatory requirements and advisory direction separate. Source or preference changes invalidate the cache.
2. Select only the requested format's placement catalogue and treatment playbook. One planner request resolves communication, concept, exact copy, hierarchy and every page in a set. Its model and reasoning effort remain the configured strategy settings.
3. Validate supported fact IDs, named Poppins weights, required guidance coverage, format requirements and complete page coverage. The planner decides copy density; there is no universal word quota.
4. Build six compact execution sections: asset/purpose, exact copy, brand requirements, creative direction, reference roles and format constraints. Detailed research and rationale stay saved outside the image request. Mandatory wording is not replaced by IDs. Oversized handoffs stop before image dispatch rather than being truncated.
5. Generate GPT Image 2 **high** and GPT Image 2.6 Sunburst **high** from the same plan, copy and exact product/logo references. Planner inputs contain verbal style guidance and no images. Library mood-board pixels are not reattached.
6. Save results independently with two image workers total. No OCR or editable reconstruction is invoked.
7. New comparisons inspect every saved page, then allow one targeted correction per model/page for confirmed mismatches. Originals remain available. **Resume checks and corrections** continues both stages when the saved run enables correction. Older review-only v2 comparisons remain review-only unless explicitly corrected; the historical v1 pilot is preserved without retrofitting.

Formats: A4 flyer, bi-fold brochure (two flat faces), tri-fold brochure (two flat faces), standee, website banner, infographic, five-slide Instagram carousel, and iOS push image. The push treatment has no campaign copy or added logo. This is an eight-format experiment, not support for the entire main catalogue or arbitrary SKUs.

Font names, weights and roles are explicit requests; raster generation does not establish exact font fidelity. Preview dimensions are not print-production acceptance. Sunburst uses the installed CLI's `auto` size because it rejects custom canvas dimensions; the target remains in the execution brief and the actual returned dimensions are shown.

## Run locally

```sh
node scripts/creative-ai/lean-planner-experiment.js
```

Open http://127.0.0.1:1863/. Generate comparison starts paid work: two images for a single page, four for brochures, ten for the carousel. `--run` intentionally starts a default flyer. The server binds to loopback and accepts generation from its own origin; one comparison runs at a time.

The installed imagegen CLI is configurable through `IMAGE_GEN_CLI` and `LEAN_IMAGE_PYTHON`. Saved runs remain under `output/imagegen/lean-planner/`; old model quality settings are preserved. Duplicate request IDs reuse records. Interrupted work is not automatically resubmitted. Saved provider IDs and logs must be reconciled before retrying ambiguous requests.

Narrow recovery commands exist for completed planner responses rejected by local validation (`--resume-plan=<id>`) and the proven pre-dispatch Sunburst custom-size error (`--retry-local-size=<id>`). They validate saved bindings and retain failure records; neither is a general-purpose retry.

## Verified high/high comparison — 6 November 2026

Run: `lean-12cd2279-a040-457d-b481-da14c8aa815a`

- Planner: gpt-6-luna, medium, 29.546 seconds; 4,351 input tokens and 2,475 output tokens (including 1,135 reasoning). No planner image attachments.
- Initial execution brief: 4,949 characters, six sections.
- GPT Image 2 high: first output 78.315 seconds; corrected output 83.181 seconds, 1056 × 1488.
- Sunburst high: 45.092 seconds, 1055 × 1491.
- One paid planner request and three paid image requests including the GPT correction. Image billing receipts are unavailable, so actual cost remains unknown. The ₹10,000 allowance is a conservative exposure reservation, not spend.

Three findings were resolved and recorded: valid format rule citations were initially rejected (saved planner response reused without a new call); Sunburst custom sizing was rejected locally (only that image retried using `auto`); GPT printed the internal SKU (removed metadata from the handoff and saved a separate corrected image). The original images, prompts and logs remain. The selected final pair shares plan, copy and references, but GPT used the corrected prompt, so this is not a strict identical-prompt A/B.

Both selected images were manually inspected. The replacement GPT image no longer prints the internal SKU; the planned headline, two supported feature explanations, product title and CTA are visible. This is not a comprehensive product-fidelity or production certification. All 16 focused tests pass; packet preparation was checked for all eight formats. Only the flyer has a live v2 image comparison. Brochure and carousel generation remain unproven in a live v2 run.

Verification: `work/lean-planner-high-20261106/verification.json`.

## Historical pilot (preserved)

## Verified paid pilot — 6 November 2026

Run: `lean-5a40a92a-76e1-4e9d-8ccb-6772f39ca730`

| Step | Result |
| --- | --- |
| Planner | gpt-6-luna, medium; 15.757 seconds |
| Planner usage | 1,906 input tokens; 961 output tokens, including 470 reasoning tokens |
| Planner packet | 6,599 characters; no image attachments |
| Image prompt | 1,978 characters |
| GPT Image 2 medium | Completed in 31.151 seconds |
| Sunburst 2.6 high | Completed in 43.037 seconds |
| Total execution | 59.554 seconds, with image calls running in parallel |

Both images were manually inspected. The five planned copy blocks are present and legible without visible clipping. Sunburst gives the headline a cleaner line break in this sample. This is not a comprehensive product-fidelity, font or print-production certification. The 1024 × 1536 RGB outputs are 2:3 concepts, not A4 print-ready exports.

Four focused tests passed. The Codex browser showed the completed saved run and both result links. No browser download check was performed. No production runtime restart or old batch resumption was performed.

The first local listener attempt hit a sandbox `EPERM` before generation; the server was launched with authorized local/network access. The completed run had no provider failures. The recorded ₹10,000 allowance is a conservative exposure reservation, **not actual spend**. Image usage receipts were not returned by the CLI, so actual cost remains unknown in the run record.


## Initial report-only visual inspection — 6 November 2026

`visual-review.js` is isolated from the main pipeline. It sends the selected final image, its hash-bound exact product reference and (where applicable) official logo to the configured reasoning model, currently **gpt-6-luna at medium effort**. No mood-board images or complete earlier-stage inputs are attached. Model/effort are pinned for the review; medium effort has a 16,000-token output allowance including reasoning.

The compact contract contains authoritative copy, relevant supported facts, product appearance, mandatory execution rules and the selected page's structure. It checks incorrect/missing/additional copy, observable product alterations, logo identity/duplication and concrete clipping/overlap/structure defects. It does not rate aesthetics or enforce an arbitrary font-size floor. Harmless typography equivalents and lighting differences are permitted; numbers, units, qualifiers and meaning stay protected. The output is **Clear mismatch**, **Unable to verify**, or **No mismatch found**, with expected requirement, observed evidence and location. This is not exact-font or print-production certification, and the LLM can still miss defects.

The inspection module itself reports findings without altering artwork. The initial rollout was report-only; correction-enabled runs now pass confirmed findings to the bounded correction coordinator described below. Every existing generation-level technical check still runs before dispatch. Reviews do not certify cross-page visual continuity; each generated page is inspected independently, while required page coverage remains a deterministic planning check.

Saved reports and raw provider responses stay beside the artwork, bound to its hash, contract, reference hashes and reviewer settings. Completed results are reused. Pending response IDs can be retrieved without another paid submission; terminal responses saved locally are reusable after provider retention expires. An ambiguous submission, malformed report or truncated response is a verification problem, not an image failure, and cannot trigger a blind replay. Duplicate actions share one request. The existing experiment reservation covers review exposure; new calls undergo the aggregate cost preflight, while retrieval of existing work does not require a new spend allowance.

The server supports `--review=<saved-v2-run-id>` or same-origin `POST /runs/:id/reviews`. These now use the shared finishing continuation: inspect saved outputs, then continue correction only when `correctionPolicy: 1` is pinned on the run. Historical review-only runs stay review-only. The UI shows findings below each image, keeps both images visible, and offers safe retrieval only when useful.

### Live evidence

Saved run `lean-12cd2279-a040-457d-b481-da14c8aa815a` was inspected without regenerating or altering either selected image:

| Output | Result | Time | Usage estimate in INR |
| --- | --- | --- | --- |
| GPT Image 2 high | One mismatch: additional Duroflex symbol inside CTA; confirmed by manual inspection | 23.318 s | ₹0.129 |
| Sunburst 2.6 high | No visible mismatch reported across 13 checks | 23.140 s | ₹0.124 |

Both calls ran concurrently. Total estimate **₹0.253**, using stored model rates and the existing dated FX reference (₹96.6149/USD, 9 October 2026). This is a usage estimate, not reconciled billing. Actual charges remain unknown. Each request used 4,698 input tokens, including the three image inputs; output usage was 1,493 and 1,386 tokens respectively. Review contract length: 4,232 characters. Reopening/rechecking these saved results performed zero additional provider calls in the replay test.

**Validation:** 31 focused tests pass, covering contract scope, requirement/evidence coverage, unknown outcomes, duplicate submissions, pinned settings, truncated/invalid output, saved-response retrieval, artifact binding, failure isolation and preservation of completed artwork. Two real flyer reviews and the Codex browser UI were verified. Other formats have not yet received a live visual-review trial in this experiment.

Implementation uses the official [Responses image-input guidance](https://developers.openai.com/api/docs/guides/images-vision?api-mode=responses). Test evidence: `work/lean-visual-review-20261106/verification.json`.


## Bounded correction loop — 6 November 2026

New runs pin `correctionPolicy: 1`. Completed conformance reports can trigger one corrective image invocation per model/page. The independent model branches isolate failures; unaffected pages and models are never regenerated. A repeated click or restart cannot reset the durable correction ledger.

- A compact Luna/medium diagnosis rechecks the concrete evidence and chooses a bounded local edit, affected-page regeneration, no action, or a plan conflict. Uncertain checks alone never trigger paid image work. A confirmed issue remains actionable even if another original check is uncertain.
- Original copy, facts, fonts, brand requirements and page roles remain authoritative. Invalid/conflicting plans stop before image dispatch. The diagnosis cannot rewrite claims or silently shorten copy.
- Small isolated defects use an explicit alpha mask, bounded below 20% of the canvas and excluding localized protected product/copy/logo regions. Exact outside-mask pixels are restored locally after the model edit. Product identity or structural defects require a whole-page candidate. A change in mask-edit dimensions is held rather than resized.
- Original images, prompts, references, reports and costs remain saved. Corrected images have separate candidate filenames. Candidate review receives the approved contract, official references and original artwork, including a repair-integrity check for seams, fragments and collateral damage. Every applicable check must find no mismatch before selection. The latest selected-image hash and approved context are checked again before promotion.
- A saved provider response ID is retrieved on resume. Unknown image dispatch outcomes are never resubmitted automatically; write-ahead dispatch receipts survive restarts. One image correction cycle is distinct from any SDK-level transport retries inside the installed image CLI. The CLI does not expose image billing receipts, so correction image cost remains explicitly unknown within the existing reserved allowance.
- The UI keeps the original visible during correction, suppresses the old mismatch banner while correction is active, and exposes the selected correction or the reason the original was retained. It does not offer another correction after exhaustion.

`--correct=<lean-run-id>` starts or safely resumes correction of a saved comparison. It does not start a fresh comparison. There is no broad retry/reset command.

Live proof: `lean-12cd2279-a040-457d-b481-da14c8aa815a`, GPT Image 2 high. Luna localized the extra Duroflex symbol inside the CTA; the one masked edit removed it. 3,705 pixels were admitted to the mask (about 0.24% of the canvas); **zero pixels changed outside it**. The original conformance review passed 13/13; an additional before/after validation of the final integrity-check contract passed 14/14. No new Sunburst image was requested. The selected original and all earlier revisions remain accessible.

Timing: diagnosis 16.15 s; image edit 70.734 s; first candidate review 26.929 s; correction cycle 115.39 s. Supplementary before/after validation: 30.078 s. Total new reasoning cost estimated ₹0.41 at the saved FX rate (₹96.6149/USD, dated 2026-10-09); image cost and actual billing unknown. This extra validation was a development check, not another creative correction.

All 49 focused tests pass, covering bounded admission, bad masks, plan conflicts, failed/uncertain candidates, preserved edits, changed requirements, duplicate clicks, request reconciliation, model isolation and full-page regeneration with a mocked provider. Only the GPT masked flyer correction is live-proven; other formats and Sunburst correction paths are covered locally but have not had a new paid correction run.

Evidence: `work/lean-correction-20261106/verification.json`, `comparative-review.json`, and the per-page `correction-*.json` / dispatch receipts in the saved run folder. Main Studio and its queues were not restarted.

## Editing/regeneration continuation and activation — 6 November 2026

`finishing.js` now provides the same continuation for newly generated runs and resumed checks. It records compact per-attempt progress, isolates review interruptions from other actionable pages, and deduplicates overlapping continuations. It never opts historical runs into correction automatically.

A selected correction retains its original before/after review contract, including repair integrity and the original artwork reference. Rechecking it reuses the matching saved review instead of dispatching a weaker base review. The correction ledger and selected artifact must match before preparing this check.

The UI distinguishes targeted editing from whole-page regeneration during preparation, generation, recheck and selection. It no longer labels correction-enabled runs as report-only. Originals and the earlier revision links remain available.

Validation: **57 focused tests passed**, including correction-enabled versus historical continuation, interrupted review recovery, duplicate requests, cached candidate checks, and full-page regeneration for both image models with mocked providers. A replay of the real saved flyer pair reused all 14 GPT candidate checks and 13 Sunburst checks with **zero network calls and zero new spend admissions**. The selected correction still records exactly one image attempt.

Only the isolated experiment server on port 1863 was restarted, after confirming it was idle. The Codex browser verified the updated labels, both saved images, selected correction, earlier-image link and passing check counts. Main Studio and its queues were untouched. No new paid generation or HTML conversion was performed. Full-page regeneration remains locally tested; the earlier GPT masked flyer edit is the live correction proof.

Evidence: `work/lean-edit-regenerate-20261106/verification.json`, `browser-proof.png`, and `browser-status-proof.png`.
