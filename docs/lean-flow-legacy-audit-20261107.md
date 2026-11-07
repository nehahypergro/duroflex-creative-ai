# Simplified main-flow integration audit — 7 November 2026

Scope: Studio brief adaptation/admission, lean policy/context, engine branching, provider configuration, planning handoff, image generation, conformance/correction, checkpoint recovery, result projection and campaign exports. Reviewed current checkout at 3938f1a. Review only: no generation, restart, job mutation or production-code changes.

## Findings

### P1 — Requested output dimensions are not enforced
`runtime/lean-workflow.js:50–54,75–77` saves provider pixels and publishes their dimensions without enforcing the requested canvas. `runtime/placements.js:5–15` computes a model-sized canvas with a promised crop/resample export, but that export is absent from the lean path. File delivery (`runtime/http.js:116`) returns saved bytes; campaign-pack conversions (`runtime/campaign-pack.js:21–25`) change encoding only.

Observed saved evidence:
- creative-87d31172-49c3-4f99-be78-3a6fc6352ae1: requested 1920×640; outputs 1744×592 and 2172×724.
- creative-3155114b-aad9-4b40-b839-6dcc13ab1e67: requested 1080×1080; outputs 1008×1008 and 1254×1254.
- creative-41448bd4-c0ab-4748-b983-bb0d7bc1fa11: requested 1200×627; outputs 1735×907 and 1392×736.

This is a dropped legacy export responsibility, not evidence that the old compositor runs. Define an explicit final-canvas step, preserve original pixels, and inspect the actual final output. Do not silently crop important content or stretch an incompatible ratio. Check both model options and print-specific delivery separately.

### P1 — Campaign downloads still require a legacy whole-carousel review
`runtime/campaigns.js:23–30` rejects even a ready, qualityVerified page when its placement has carousel metadata and `job.carousels` has no passing set review. Lean generation does not create the old carousel review record. `runtime/campaign-pack.js:18–19` invokes this gate and excludes the image by default.

Offline reproduction: a lean result with ready=true and qualityVerified=true, carousel placement metadata and no legacy carousel record returns ready=false with “The full carousel review has not passed.” This applies to placements carrying that metadata, not necessarily every custom multi-page recipe. Add a lean-specific assessment using its actual saved checks; do not fabricate an old review or reintroduce the old reviewer stack.

### P2 — Campaign exports lose authoritative planner copy
`runtime/refinements.js:69` expects reviewUrl and old package files. Lean results have neither. `runtime/campaign-pack.js:20` catches the “older creative” error and substitutes exactCopy.fields=[]; lines 22–26 build captions from that empty list. Images can export, but their saved planner copy is omitted and described as unavailable.

Provide a lean export adapter reading the immutable plan/page copy and selected original/candidate. Do not use OCR to recover copy already saved in the plan.

### P2 — Saved jobs are not fully insulated from future policy/prompt changes
Provider configuration is pinned correctly, but `runtime/lean-workflow.js:26,39–41` builds and validates against live `lean-policy.options`, current validatePlan and current imagePrompt. A change to option definitions or execution-brief serialization can reject an intact saved package before resume, despite a preserved package hash and job runtime snapshot.

This is a demonstrated dependency in code, not a claim that a current job has failed from it. Pin an execution-contract version and option policy; validate old packages under their original contract. Preserve integrity checks. Test resume after a new deployment changes defaults.

### P2 — Brief objectives retain an incomplete older mapping
`public/creative-ai/studio-model.js:776` accepts Engagement and Education; `runtime/studio-generation.js:48` has no mappings for either and defaults them to consideration. A funnel-stage value also takes precedence over the explicit objective. The natural-language brief may retain some intent, but the structured objective disagrees.

Resolve objective and funnel consistently and preserve the selected intent explicitly in planner input. Purchase→action was already fixed; it should not be re-fixed. Tests currently explicitly expect BOFU to override Awareness, so changing precedence needs a deliberate contract decision.

### P2 — Mixed campaigns still encounter an all-or-nothing eligibility gate
`public/creative-ai/studio-model.js:1068` requires every output to have a generationProfile. `public/creative-ai/studio.js:410,630` then presents a generic unavailable-format message. Backend `runtime/studio-generation.js:64–70` also refuses the whole campaign on an unsupported output or child-readiness failure, although submission later isolates child admission errors.

Consequently one stale or unsupported asset setting can prevent all valid assets reaching the queue. Do not silently drop that asset. Return per-asset actionable eligibility and let the user retain/fix the blocked item while submitting explicitly selected valid items.

## Efficiency issue, separate from legacy execution

`runtime/studio-generation.js:68–71` prepares campaign children sequentially, and line 80 repeats the entire preparation at submission. This preserves freshness but duplicates expensive prerequisite work. Measure and cache immutable product/brand checks by binding hash; keep final freshness/idempotency checks. This is code-path evidence, not a measured attribution of previous model latency.

## Correctly isolated responsibilities

- Engine lean branch returns before legacy strategy/copy/art/reconciliation execution.
- Lean provider requests skip legacy context selection and handoff-authority expansion.
- Legacy reconstruction/component-repair entry points use assertLegacyAction guards.
- Current job-owned provider settings preserve model/reasoning choices; the remaining pinning issue is execution policy/validation above.
- Original and candidate images are separate; candidate checks precede promotion; interrupted review resumes from saved artwork.
- Exact SKU identity, same-brand evidence, named fonts and placement-specific text/logo policies remain intentional safeguards, not legacy fluff.

## Verification and limits

Ran focused lean-main-flow, lean-isolation, lean-display-status and studio-generation suites: 66 passed, zero failures/cancellations/skips (434.8 seconds). Passing suites do not cover the integration gaps identified above. Also reproduced the carousel export gate offline and inspected saved result metadata for three concrete dimension mismatches. No paid calls, browser download checks or new live visual review. This is an integration audit of the active main path, not a security audit or proof that every historical endpoint is safe.

Recommended order: final-canvas delivery; lean export/readiness adapter; pinned execution contracts; objective adaptation; asset-specific admission and cached readiness. Keep old code for historical jobs until callers and stored contracts are migrated. Bulk deletion would risk saved work.
