# Creative AI brand isolation

## Main Studio lean artwork workflow (6 November 2026)

- The user promoted the lean planner comparison into new main Studio jobs, retaining two options: `gpt-image-2` high and `gpt-image-2.6-sunburst` high. `workspace.json` selects `artworkWorkflow: lean-v1`; intake and provider settings are pinned per new job. This supersedes one-option and editable-reconstruction defaults for these jobs only. Existing jobs, experiments, images, reviews, edits and budgets retain their own contracts.
- Use one compact GPT 6.1 Sol high communication/copy/spatial plan per independent asset or coordinated set, named approved fonts, exact scoped SKU references and applicable brand/placement requirements. Preserve every set page in both options. Use verbal inspiration, not repeated mood-image attachments. Separate native media copy from raster copy where the selected template requires it.
- Generate complete raster artwork, run Luna medium conformance inspection and allow one evidence-directed correction candidate per option/page. Preserve the original, validate masks and protected regions, and recheck before promoting a candidate. Uncertainty is not a defect; failed verification must not silently certify artwork. The user-facing main flow displays the selected saved artwork without Fabric reconstruction or internal model/review labels.
- Keep independent main planning/image queues, durable provider recovery, pinned models, brand boundaries and existing cost accounting. Do not reactivate stopped experiment batches as part of deployment. See `docs/lean-main-flow-20261106.md`.
- New lean jobs pin `leanContextVersion: 1`: do not inject legacy copywriter/OCR handoff authority or require unused legacy role models/editor font binaries. Resolve continuation from lean unit checkpoints, not saved-image counts; incompatible legacy recovery/editor-conversion actions must reject before dispatch. Keep historical request identities intact. See `docs/lean-flow-isolation-20261106.md`.

## Verbal brand inspiration

- On 4 November 2026 the user requested reusable written look-and-feel guidance instead of repeatedly sending inspiration images. New named-brand campaigns pin `verbalBrandStyleVersion: 1`. Compile and cache the already interpreted guidance separately for each brand; invalidate it when its sources change. Keep source authority and draft/advisory distinctions. This is application memory, not model training.
- Downstream planning/generation must not reattach library mood/reference/screenshot pixels. Keep the actual written guidance in the relevant planning packet; image generation receives the selected execution direction, not another copy of the complete guide. Exact SKU photos, identity assets, current artwork and masks remain visual evidence when needed. Do not erase source-library files or retrofit historical checkpoints. Follow-up edits inherit their parent's policy. See `docs/verbal-brand-style-20261104.md`.

## Push-image strategy

- On 2 November 2026 the user requested correcting push imagery after a source-labelled Quboid cutaway proved too dense. New jobs use push treatment v3: one recognisable subject/visual idea, with detailed explanation and action outside the image. Do not reproduce exploded diagrams, technical callouts or reference infographics by default. Preserve authentic physical product markings; reference captions are not markings. Apply the pinned guidance through planning, generation and existing review checks, including zero-copy images. Keep historical snapshots and verdicts unchanged; do not add numerical density or copy-fit gates. See `docs/push-image-strategy-20261102.md`.

## Recovered project continuation

- The continuation context and recovered requests are in `docs/project-continuation-20261101.md`. Read it when resuming the recovered project chat. The original Get / To / By autofill is now implemented separately from the product-model matching fix; see `docs/communication-goal-resume-20261101.md` for verification and the remaining backlog.
- Preserve the existing dirty checkout and historical data. Recovery evidence and a local source safety copy are in `work/project-recovery-20261101/`; they are not permission to restore older files over current work.

These rules apply to Creative AI brand research and image generation, including
images produced directly in chat with an image tool.

- Start every brand assignment with a fresh brand brief. Read the selected
  workspace's `output/creative-ai/brands/<brandId>/brand.json` and its own current
  research. Verify that the research job's `intake.brandId` matches that workspace.
  Use only documents listed in that brand's manifest and product evidence from
  that brand's official product page.
- Never carry another brand's visual or verbal direction through conversation
  history, old prompts, reference images or generated artwork. This includes
  palettes, room styling, lighting, typography, positioning and tone. General
  design principles may be shared; brand knowledge may not.
- An absent visual guide stays absent. Explain when a direction is inferred from
  the selected brand's website or proposed for the current brief. Do not borrow
  another brand's guide or describe an inference as an approved brand-world rule.
- Use the scoped runtime for app generation. For direct image-tool generation,
  first inspect a fresh context with
  `scripts/creative-ai/brand-generation-context.js <brandId> [productPageUrl]`.
  Use its boundary instructions and sources in the new prompt, and save the
  selected brand ID and source references with the output. Native image tools
  bypass the app's provider checks, so do not claim those checks validated a
  direct tool generation.

# Dedicated studio and named training

## Image provider preference

- On 26 October 2026 the user requested returning image generation to OpenAI after the Nano Banana comparison. Use the existing scoped OpenAI route with `gpt-image-2` for subsequent image work in both brands. Vertex/Nano Banana runners are retained as historical experiments; do not use them for new image generation unless the user requests another comparison or provider change. Preserve their outputs and cost records. The user reports the OpenAI credit issue is resolved; model access alone does not verify paid generation or billing availability.

## Single-option sequential testing

- Superseded on 3 November 2026 for the saved `work/all-static-option1-20261027` briefs: use five rolling project slots, immediately refilling each completed/failed slot. Individual failures must not stop unrelated projects. Preserve source briefs and October records; new run evidence lives in `work/parallel-static-20261103`. Log errors, quality failures, corrections and checkpoint-safe resume attempts, retaining prior evidence. Keep existing overall spend limits and ambiguous-request protections; a global budget/credit block preserves the unstarted queue. Do not apply the old sequential configuration wrapper to this batch. Option 1 and exact SKU/brand boundaries remain.

- On 27 October 2026 the user requested Option 1 only (`continuity`), one complete set per asset, all Duroflex projects followed by all Sleepyhead projects, with one project at a time. Use the explicit `conceptRoutes: ["continuity"]` intake for this test batch; preserve every page/slot in each set. Do not silently plan or render Option 2. Existing two-option jobs keep their original contracts. See `docs/single-option-testing-20261027.md` and `work/all-static-option1-20261027/sequential-plan.json`.

## Shared engine fixes

- Every newly observed engine failure needs a reproducible regression test before its fix is complete. Record the original symptom and a failing-before/passing-after check, then run relevant shared tests and saved-run checks for both Duroflex and Sleepyhead. Keep fixtures isolated, preserve historical evidence, and report any unavailable replay or legacy incompatibility explicitly. See `docs/creative-ai-regression-policy.md`.

- Duroflex and Sleepyhead use the same base engine. Fix engine, orchestration, validation, encoding, handoff, caching, cost-accounting and export defects in the shared implementation so future runs of both brands receive the fix. Do not add brand-specific copies or exceptions to general engine logic merely because a defect was discovered in one brand's campaign.
- Keep brand guidelines, assets, product evidence, research and preferences separately scoped. A shared engine fix does not authorize copying brand knowledge or creative direction between workspaces.
- For shared changes affecting campaign flows, run the relevant shared regression tests and check applicable saved fixtures from both brands. Report historical contract incompatibilities separately; never rewrite old artifacts, verdicts or costs to make a replay pass. Brand-specific behavior must come from an explicit scoped requirement or configuration.

- This product supports only Duroflex and Sleepyhead. The default workspace is Duroflex; the visible toggle switches brands. Do not change the generic product in `/Users/neha/Desktop/codex2`.
- When the user asks to save training or tuning and explicitly names Duroflex or Sleepyhead, use that name as the destination, even if a different brand is currently on screen. For reusable creative preferences, POST `{brandName, preference}` to `/creative-ai/api/training` on the dedicated local server and verify the returned brand ID. Do not treat a request about building the training workflow as a preference to save.
- Do not guess a destination for an ambiguous training request. Ask for the brand name if the conversation does not establish it. Never save a shared group identity or copy a preference into both brands implicitly.
- Image thumbs and notes from the interface are stored-only feedback. They must not create preferences, increment learning revisions, qualify as learning examples, or be injected into generation. Keep standalone named-brand training separate.
- The separate **Review feedback & save explicit preferences** action may create a new scoped preference when the operator deliberately supplies its text and named brand. Use `/api/brands/:id/feedback-promote`, with the expected memory revision, source feedback ID and exact image hash. This is explicit preference creation, not automatic learning from a thumb. Preserve the original stored-only record, historical image review and `qualityApproval: false` provenance; never turn a flagged example into an approved learning example.
- Image feedback belongs to the exact image's saved brand and version. A different named brand must be rejected, not used to move the image feedback. Standalone named training has its own provenance and does not invent image provenance.
- Source documents and verified product evidence stay in the named brand's own workspace. Creative preference memory cannot establish product claims or override supplied rules and critical checks.

# Cost ledger maintenance

- Testing authorization updated 4 November 2026: ₹100,000 per project and ₹1,500,000 overall across both brands, superseding the 24 October ₹300,000 per-project / ₹1,000,000 overall approval. See `output/cost-tracking/approvals/testing-20261104.json`. Do not reuse old runner-specific lower allocations for new testing. Count prior testing costs, concurrent reservations and unresolved charge exposure toward the overall ceiling before dispatching each paid batch; unknown usage is never zero. The Studio default enforces the per-job reservation allowance; the overall authorization currently requires operator accounting, not an automatic aggregate runtime gate. Preserve historical job budgets and receipts.
- Always report costs to this user in INR, including chat breakdowns and the studio display. Preserve original provider currency/usage and label INR conversions as estimates with a dated, sourced exchange rate. Never treat missing usage as zero cost.
- The user authorized maintaining a Google Sheet of this system's costs and the studio cost subpage. Use `output/cost-tracking/sheet-sync.json` for the observed Sheet ID and managed tab IDs. Keep this data private under existing Drive permissions.
- Use `scripts/costs/sheet-sync.js` to build an update from the dedicated studio. Read native metadata before applying the structured request. Update only the four managed snapshot tabs. Save the sync marker only after Google accepts the update and total/entry-count readback agrees with the local snapshot.
- Keep billing unknown when usage or actual invoices are unavailable. Reservation allowances are not spend; inherited copied receipts must not be counted twice. Do not calculate Codex development compute from subscription usage percentages.

# Brand asset uploads

- Brand assets belong to the explicitly named workspace. Use its `/assets` endpoint with `X-Brand-Name` matching that brand; never route by a previous screen or share files between brand stores.
- Indexed documents and raster visual references feed the next brand research refresh, which must precede a new brief after knowledge changes. Sample creatives are advisory references, drafts are not approved guidance, and neither substantiates product claims.
- Stored-only font, design, video and audio files must remain visibly unparsed until a dedicated extraction/rendering workflow is implemented. Never claim they were trained on, transcribed, inspected or applied merely because their originals were saved.
- The implemented **Process originals / link exports** workflow is opt-in and brand-scoped. Local font specimens, PSD composites, PDF-compatible AI artboards and bounded video/audio metadata are processed references only after successful extraction. Keep decoder limits visible. Audio waveforms are not visual-style references; supplied transcripts stay explicitly user-supplied. Unsupported proprietary originals require a separately uploaded same-brand export and remain unparsed. Font metadata never proves licence clearance or automatic font application. Processing/annotation changes invalidate only that brand's current research pointer.
- Keep existing document IDs, originals and historical job evidence intact when organizing the library. Changes to knowledge must invalidate the current research pointer without resetting any old review status or generation budget.

# Client scene execution feedback

- The client explicitly applied the 8 October 2026 scene integration feedback to both Duroflex and Sleepyhead. Save it separately through named-brand training; keep each brand's screenshot examples in its own `datasets/scene-integration-feedback-2026-10-08` archive. These are negative execution examples, not positive style references or product evidence.
- For future briefs, choose room finishes, furniture and decor that complement the exact SKU's colour, material, make and scale. Adapt the room instead of recolouring or redesigning the product. Product and people share physically coherent light, exposure, contact/cast shadows, occlusion and support. Check believable anatomy, poses and body/furniture contact.
- Copy/logo negative space belongs to a real wall or backdrop surface in the image. Reject added white patches, haze, blur masks or artificial gradients/fades used to rescue contrast. Genuine pale walls and natural light falloff are permitted. Resolve contrast through composition or permitted text/logo treatment.
- `Scene integration standard v1:` is named client production direction pinned in new job memory. The existing artwork reviewer checks it as policy, separately from supplied brandbook rules, using observed evidence and the existing single correction cycle. Historical jobs keep their original pinned memory and reviews. Do not promise perfect anatomy or guaranteed rendering compliance.

# Guideline reasoning

- When preparing a new campaign brief, do not add a default ban/preference against people or prescribe warm daylight, neutral interiors, a fixed setting, or photographic treatment unless the user or a sourced mandatory rule specifies it. Let the Creative director choose human presence, setting, lighting and visual treatment to serve the brief; let the Art director refine execution. Historical test briefs remain unchanged as evidence, but their assistant-added stylistic defaults must not become new campaign requirements. For a new retry, remove those defaults when applying the user's revised creative freedom, while preserving explicit user constraints and SKU identity.
- Develop continuity first and contrast exploration against it within the existing concept call. Exploration should change the storytelling premise and at least two meaningful visual dimensions while retaining brand/product truth. Keep image generation parallel unless the user explicitly chooses a sequential rendering experiment; merely discussing sequential rendering as a possible way to obtain variety does not change scheduling.

- Record specific guideline-to-design explanations in the new generation's saved art specification. Bind each decision and reason to a locked rule supported by that assignment's own supplied guideline source.
- Preserve draft/coverage limitations. Website patterns, campaign instructions and general design principles must not be presented as supplied brand guidelines.
- Display intended guideline application separately from rendered artwork compliance. Do not invent new rationale for historical images or replace their saved packages/review flags.

# Product library

- Standing testing instruction, 24 October 2026, for both Duroflex and Sleepyhead: accept the selected brand's official website and explicit current brief as client-approved source truth until the user explicitly reinstates source-verification blocking. Do not block or fail an assignment solely because those supplied sources lack independent verification, repeated approval, freshness confirmation, or additional warranty/replacement substantiation. Keep exact source attribution and variant scope. Omit absent optional claims or use a supported alternative; missing technology-artwork preservation must not hold up other ready PDP images. This policy does not expire after a test run or silently tighten on retry. Source acceptance does not approve generated artwork: still flag actual rendering defects, invented statements, wrong-brand/wrong-SKU references and material contradictions needed by the chosen artwork. Preserve historical records and pinned policies; apply this standing instruction to new testing plans.

- For Duroflex and Sleepyhead work, the user accepts each brand’s explicitly stated official-product-website certifications and verifications as final approved source statements (reviewed fix plan F28/F67, 23 October 2026). New jobs pin `config/website-certification-approvals.json`; preserve exact issuer, SKU/variant scope, wording and qualifiers. Record client approval as the basis, never invent independent issuer checks. Missing or ambiguous statements remain unresolved. Generated artwork still requires its own wording, identity and visual checks. Each brand has its own scoped approval record; never carry certification facts or product evidence between brands.

- The user explicitly confirmed that each brand's official website is the final approved source for its product images and information. Treat exact-SKU official website evidence, including saved snapshots and hash-bound media, as approved source material without asking for identity or source-approval confirmation again. Where draft documents conflict with official website product information or identity, use the official website. Preserve exact variant selection and source provenance; source approval does not approve newly generated artwork or justify invented or stronger claims. Reuse saved evidence under the policy below rather than requiring website-freshness confirmation.
- New SKU URLs are archived only in their named brand's product library. Website breadcrumbs/product types define taxonomy; missing categories remain Uncategorized. Each product keeps its own profile, raw source snapshot, variants and media folders.
- Keep product images, feature tiles, A+ content, video links/files and supporting content distinct. Exclude recommendation, complementary-product and script-template images. Asset roles inferred from page structure remain explicitly labeled.
- Saved website descriptions are source material, not approved efficacy claims. Attach an identity/feature audit only to the exact matching product snapshot; fresh generation reuses a successful saved audit only when brand, selected variant, source and image hashes, audit contract and validator version match, and current validators pass. Otherwise audit the selected saved snapshot. A reused audit retains its original job/time provenance and must not copy provider spend into the new job. Reuse the exact saved page/variant and hash-checked images without revisiting the website. Use the product library's explicit Refresh action for updated website evidence. Never promote a stored file into a verified product hero without inspection.
- Repeated URLs may reopen the saved profile. Refresh preserves earlier snapshots. Retain collection gaps, download errors and external video/stream links; never imply a video was downloaded or inspected if only its URL was stored.

## Reference-led SKU production
New composed jobs also pin `skuReferenceDetailVersion: 1`: include up to two provenance-checked source-quadrant detail views, prioritising the pinned exact-SKU reference, before the final typography guide. Catalogue names and feature claims must not replace wording physically printed on the product; source pixels remain authoritative for markings. These panels are inspection views, not extra products, and do not recover missing detail or isolate a single instance. Preserve unpinned historical requests and verdicts. See `docs/sku-reference-detail-20261103.md`.

New dedicated-studio briefs use reference-led generation under the user's revised policy. Keep brand-scoped exact SKU/variant selection, official reference snapshots, source hashes and product-library storage. Official website photographs are trusted under the user's assumption, not claimed as human inspection. Ambiguous variants still require exact variant and photo selection; never infer dimensions from image pixels.
Allow new camera angles, perspective, lighting, framing and natural scene integration. Website backdrops are not SKU identity and do not need to match. Build or experiment with the creative environment from the selected brand’s supplied guidelines and actually inspected/indexed visual references or datasets, respecting their authority and draft status and any explicit brief setting. Do not default to reproducing room styling, wall art or props from product photographs. Preserve product branding (logos, labels, exact wording and their placement relative to the product) and any documented technology names/features. Depict internal layers or cutaways only with exact-SKU official evidence. Keep colour, fabric/pattern, proportions and construction recognisable with semantic visual tolerance. No mandatory full-photo compositing, reserved photo rectangle, PNG-only requirement or pixel-match gate applies to new briefs.
The existing creative review must inspect the entire creative, including duplicate/invented products and unfinished placeholders. Branding/technology errors and major SKU misrepresentation block delivery; uncertainty remains unverified. Feed specific observed defects into the existing single correction cycle. Do not claim zero hallucinations or exact font/pixel fidelity from model review. Historical full-photo-locked jobs retain their original policy, packages, proof and budgets; never retrofit their evidence. Do not add a separate paid review agent.

# Physical print and outdoor evidence

- India is the client's main production context; no specific commercial printer/operator or substrate/ICC specification is confirmed. Use exact chosen vendor templates, not a universal India bleed, CMYK or billboard PPI assumption.
- New print selections pin `proofWorkflowVersion: 1`. Preserve historical specifications and evidence. Prepare calibrated A4 actual-size tiles or explicitly partial samples, with physical PDF box and source/export resolution preflight.
- Physical measurements, substrate/colour/finishing, installed reading distance and template clearance require observed operator evidence. Store attestations separately, bound to the exact master/proof hashes and saved brand. Never infer physical printing or commercial acceptance from downloads, PDF creation or unchecked form defaults.
- RGB raster PDFs cannot claim PDF/X, CMYK conversion, embedded vector type, imposed signatures or certified dielines. Keep failed/unknown checks visible and operator release responsibility explicit.
- The separate vendor handoff can convert actual raster pixels through an uploaded, hash-bound CMYK printer-output ICC and embed its output intent. Preserve the RGB master and exact PDF geometry. Label unprofiled source colour as assumed sRGB, retain source PPI, and require new colour/stock proof tied to the final CMYK hash. This is CMYK raster PDF, not PDF/X certification or editable vector/dieline production. Vendor requirements are user-recorded, not independently authenticated operator approval.

# Complete delivery packages

- Build immutable static/email/native handoffs from saved files in the project's own brand. Preserve actual image bytes, hashes, historical creative reviews and budgets. Failed or missing checks cannot be upgraded through packaging.
- Email delivery includes live HTML/plain-text copy and a local hero preview; send HTML requires an operator-supplied absolute HTTPS hero URL. Do not claim that URL was uploaded or its bytes verified. Client, link, image-off and copy approval require explicit operator checks. No email is sent by packaging.
- Native delivery freezes the placement contract, field JSON/CSV and actual selected assets. Enforce required slots, known field/count/dimension/file rules; retain Unicode, publisher-preview and unsupported-rule uncertainties. CSV is a field handoff, not a universal importer. No ad is published or publisher acceptance implied.
- See `docs/placements/complete-delivery-and-ingestion.md` for implemented formats, local decoder setup and commercial handoff boundaries. Never contact a printer or other recipient without explicit messaging authorization.

# Saved creative versions and accompanying copy

- Copy edits and translations create immutable child versions bound to the parent campaign, route, placement and named brand. Retain the parent's exact SKU policy, source attachments and pinned preference memory. One selected artwork, at most one automatic correction. Never silently select a new version or overwrite the original.
- Feedback and delivery packages resolve the selected version and exact hash. Reject stale source selections. A changed print face cannot reuse the original production proof, and an edited carousel slide cannot inherit the original sequence review.
- Accompanying copy stays separate from artwork. Use only current same-brand guidance and exact-product facts. Team edits stay visibly unchecked; checked-only campaign packs exclude them. Model writing/review and image generation require explicit user workflow actions, and no paid generation is needed to test these interfaces.
- Campaign packs freeze selected versions, actual artwork bytes, copy status and presentation content. Keep flags and absent copy explicit. Raster artwork export never establishes physical print acceptance. Include revision and accompanying-copy provider receipts in the existing deduplicated cost ledger.

# CDN migration inventory

- Keep the non-secret CDN defaults in `config/media-storage.json` and verified media link inventory in `config/cdn-media-manifest.json` under Git. Before a Git backup/migration checkpoint, run `npm run media:manifest` and include the updated inventory in the commit.
- Export only verified media URLs, brand bindings, hashes, sizes and relative paths. Retain unuploaded sources explicitly as unavailable. Never invent successful uploads or add environment credentials, private briefs, provider responses, review records or cost histories to the tracked manifest.
- `npm run media:restore -- --apply --destination <folder>` restores and verifies media content. Test representative assets in a separate destination when changing this workflow. A complete workspace migration still needs the separate private metadata/environment backup; CDN links are not an independent binary archive.


## Source acceptance confirmed in the voice scope review

- The client confirmed on 24 October 2026 that exact-SKU official website statements and original technical/CGI artwork are final client-approved source evidence across image formats, including construction, certifications, warranty, guarantees and product claims. The registry retains the old certification envelope for running-process compatibility and adds productSourcePolicyVersion 2. Do not require additional independent proof or source reapproval merely to reuse those explicit statements. Preserve variant scope, conditions, qualifiers and provenance; this is client source acceptance, not independently performed verification.
- Current user-authored brief offer/price/festive/EMI/bank terms and attributed expert proof/quotes are accepted client source evidence with supplied approval. Do not substitute website offers or add an independent-authentication gate. Missing required details, conflicts, fabricated statements and actual artwork defects remain explicit. Demonstration final client review remains pending; comparison is Partial and on hold until specified. Historical jobs and costs remain unchanged.

## Complete-artwork editable flow

- On 2 November 2026, the user approved promoting the composed-artwork → masked text removal → editable text reconstruction flow into new main Studio generation. New editable jobs pin `composedTextVersion: 1`; preserve older jobs and their renderer/checkpoints.
- Preserve the measured reconstruction's font, size, position, spacing and exact wording through background repair. Do not silently shrink or reposition it during automatic fitting/review. Explicit user editing remains available. Font reconstruction is approximate; do not promise exact recovery of generated typography.
- The user sees only the final composed image with text. Source artwork, masks and text-free intermediate backgrounds remain internal processing/recovery artifacts.
- See `docs/composed-text-flow-20261102.md` for shared-engine behavior, checks and limitations.

## Five-project Duroflex test batch

On 2 November 2026 the user superseded the one-project-at-a-time restriction for the new Duroflex Retail & local, Customer messaging/push, and Training & sales tests: run five asset jobs concurrently, with a different previously untested SKU per asset type. Keep one continuity route and all required pages/slots. Shared provider and render gates remain bounded; do not use the old sequential-test-runtime wrapper for this batch. Preserve old run evidence and count aggregate cost exposure before dispatch.

## Separate editable lines and bounded fit recovery

- Sales/push end-to-end testing on 2 November exposed two further planning issues: structured blocked copy/layout dependencies must enter the existing bounded revision regardless of the explanation's failure keywords; close-read document policy `2026-11-02.1` has no assumed phone-thumbnail font floor. Explicit supplied display widths and final readability checks remain. Line calibration must search within the approved ±5% range before rejecting a raster-rounding mismatch; do not widen the cap. Preserve old pins, source images and failure history. See `docs/sales-push-e2e-20261102.md` for actual failed product-fidelity outcomes, not a claim that the final assets passed.

On 2 November 2026 the user approved separate editable lines to preserve the complete artwork's measured line geometry, and fixing email-hero upstream fit recovery. New composed jobs pin `composedLineVersion: 1` (reconstruction v4). Each line has its own measured size/position and editable layer, while immutable field ID, line index/count bind the complete saved wording. Never substitute OCR characters for copy. Do not distort glyphs or globally shrink a text field to fit; bounded initial font/spacing calibration is frozen before masked repair. Preserve historical reconstruction files and expose only final artwork.

Returned blocked layouts with copy/layout fit dependencies must enter the existing single upstream revision before image dispatch. Optional unlocked generated feature wording may be shortened or omitted from the hero; exact locked wording, disclaimers, required content and necessary claim qualifiers remain protected. Native/accompanying detail may use only actually supported fields. Unresolved fit after that single revision stays blocked.

The user subsequently approved up to 5% font-size approximation for editable reconstruction. Keep separate editable lines; bound each line's font calibration to ±5% of its source-derived size estimate, preserve measured line placement and saved wording, and freeze the calibrated result before repair. Record font approximation honestly; do not claim exact recovery of generated typography. New copy lock authority v1 is derived from supplied brief/source wording and disclaimers; model-generated mandatory/locked flags alone do not make exact client copy.

## Local background batch service

- On 3 November 2026 the user approved an isolated local worker queue and crash-recovery testing, then explicitly requested continuing in the background. The saved static batch is now owned by `scripts/creative-ai/local-queue.cjs` with SQLite metadata in `work/local-workers-20261103/queue.sqlite` and macOS service `com.neha.creative-ai.local-queue`. Use its live status, not the historical `work/parallel-static-20261103/summary.json`. Do not start the old single-process batch runner concurrently. Preserve checkpoints, request reservations, prior failures and overall cost admission. See `docs/local-worker-queue-20261103.md` for evidence, commands and limitations.
