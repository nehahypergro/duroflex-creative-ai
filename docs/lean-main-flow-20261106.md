# Lean artwork workflow in main Studio

New jobs opt in through `workspace.json` → `artworkDelivery: original`, `artworkWorkflow: lean-v1`. The server pins `leanWorkflowVersion: 1`, two routes and their models. Historical jobs and the separate experiment remain unchanged.

## Flow

1. Existing scoped product/brand preparation and cached verbal inspiration.
2. One GPT-6 Astra medium plan for each independent asset or complete coordinated set: communication, exact copy, named fonts, layout regions, hierarchy, applicable rules and all page roles.
3. Deterministic checks for page coverage, supported fact citations, required rule decisions, font naming, reference binding and compact prompt length.
4. Main image queue renders every page twice from the same plan: GPT Image 2 high and GPT Image 2.6 Sunburst high. Model and quality remain pinned on recovery.
5. GPT-6 Luna medium checks finished pixels against saved copy, product/logo evidence and the applicable page rules. This is conformance inspection, not aesthetic scoring or print certification.
6. A visible mismatch can receive one diagnosis and one separate correction candidate. A local edit uses a bounded mask with protected regions and restores all pixels outside the mask; regeneration is placement/option-specific. A candidate is selected only after its checks pass, including comparison with the original. An uncertain or unsuccessful candidate never replaces the original.
7. Studio shows the selected raster. There is no text extraction, Fabric reconstruction, background stripping or post-generation logo overlay for these jobs. All originals, review evidence, attempts and cost receipts remain saved.

The route IDs `continuity` and `exploration` now identify the two image-model options for lean jobs; they do not request two unrelated concepts. Each option retains the complete ordered set. Other assets and options can finish when one fails.

## Integration checks

- Main orchestration tests use the real ActivityLedger, stage cache, store and image handoff with a mocked provider, for both brands. They cover saved resumes, independent model failures, masked corrections, candidate rejection, scope/variant/citation checks and historical/experiment isolation.
- Provider tests cover both pinned image models at high quality and reuse of saved responses without duplicate charges.
- Real saved context was replayed through Studio preparation for both brands: social, website, brochure and push. Both options retained; website logo omitted; push has no campaign copy; brochure has both faces. Image prompts were 3,600–8,100 characters in these replays. These are offline planning-contract checks, not a new live generation comparison.
- A free model-access probe listed all configured models, including Astra, Luna and Sunburst. Access listing does not prove paid billing availability.
- Latest focused run: 110 tests passed (`lean-*`, provider configuration/access and stage queues). The 32 Studio readiness/intake/access tests also pass after replacing a missing historical font-policy fixture and updating the superseded one-option/Fabric expectations (31 passes together plus the corrected fixture passing its targeted rerun). Earlier independent brand-isolation tests passed with network access.
- Signed-in Codex browser verification: the saved Airboost main brief shows two complete sets and an enabled Confirm & create button after readiness. No generation submitted. Evidence: `work/lean-main-integration-20261106/verification.json` and `studio-two-options.jpg`.

## Boundaries

- Named font instructions and visual review do not guarantee pixel-exact font fidelity.
- Provider output dimensions are recorded from the actual raster. Sunburst uses its supported automatic size selection; no fabricated exact-size or commercial-print certification is shown.
- Native RCS/email/Amazon image presets and push/PMax retain their no-campaign-copy policy. Custom marketplace artwork and retail assets are not blanket image-only assignments.
- No new paid image run was part of the integration checks recorded above. No old batch was resumed.

## Deployment and rollback

Activated on 6 November 2026 at 09:39:42 UTC after verifying the main backend had no queued or running jobs. The supervisor restarted the backend as PID 8979. `work/admin-private/deployment.json` records `artworkWorkflow: lean-v1`; automatic job resumption remains disabled. The signed-in browser loaded the two-option draft UI.

Removing `artworkWorkflow` disables admission of new lean jobs. Do not alter existing job pins or saved handoffs; in-progress lean jobs retain their original workflow. Retain the source implementation while those jobs remain recoverable. This is an admission switch, not a historical data migration.

The subsequent [isolation audit](lean-flow-isolation-20261106.md) removed legacy request/prerequisite/recovery interference and activated the fixes on backend PID 11030. New jobs additionally pin `leanContextVersion: 1`; old paid request identities remain unchanged.
