# Creative AI brand isolation

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

- The user explicitly confirmed that each brand's official website is the final approved source for its product images and information. Treat exact-SKU official website evidence, including saved snapshots and hash-bound media, as approved source material without asking for identity or source-approval confirmation again. Where draft documents conflict with official website product information or identity, use the official website. Preserve exact variant selection and source provenance; source approval does not approve newly generated artwork or justify invented or stronger claims. Reuse saved evidence under the policy below rather than requiring website-freshness confirmation.
- New SKU URLs are archived only in their named brand's product library. Website breadcrumbs/product types define taxonomy; missing categories remain Uncategorized. Each product keeps its own profile, raw source snapshot, variants and media folders.
- Keep product images, feature tiles, A+ content, video links/files and supporting content distinct. Exclude recommendation, complementary-product and script-template images. Asset roles inferred from page structure remain explicitly labeled.
- Saved website descriptions are source material, not approved efficacy claims. Attach an identity/feature audit only to the exact matching product snapshot; fresh generation reuses a successful saved audit only when brand, selected variant, source and image hashes, audit contract and validator version match, and current validators pass. Otherwise audit the selected saved snapshot. A reused audit retains its original job/time provenance and must not copy provider spend into the new job. Reuse the exact saved page/variant and hash-checked images without revisiting the website. Use the product library's explicit Refresh action for updated website evidence. Never promote a stored file into a verified product hero without inspection.
- Repeated URLs may reopen the saved profile. Refresh preserves earlier snapshots. Retain collection gaps, download errors and external video/stream links; never imply a video was downloaded or inspected if only its URL was stored.

## Reference-led SKU production
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
