# Graphic designer foundation

Builds deterministic generation packages for BOTH concepts at EVERY selected placement. It does not generate images or compose separate text/logo layers. Copywriter remains an input interface. Art director and existing upstream contracts are preserved.

```js
const graphic = require('./lib/creative-ai/graphic-designer');
const fixture = require('./lib/creative-ai/graphic-designer/examples/synthetic');
const ctx = await graphic.assembleContext(await fixture.inputExample());
const packages = graphic.buildGenerationPackages(ctx);
graphic.validateOutput(packages, ctx);
const adapterStatus = await graphic.providerAdapter.generate(); // configuration-pending; no network call
```

Each request contains the complete prompt, exact copy deck with mandatory/optional/locked fields and claim evidence, strategy/GET/WHO/TO/BY, concept/art/copy/brand/placement hashes, concrete art direction, actual numbered reference bytes and allowed roles, source-status canvas/output, native fields separately, locked/flexible decisions, internal dependencies, targeted revision criteria and an intended composition rationale. Every supplied field is exact for the current revision. Declared conflicts, missing required product/logo/font, unknown output/canvas and mandatory dimension violations block the package and route internally. No silent rewrite, proposition change, fake asset, naive resize or approval step is introduced.

`provider.json` records the requested engine label “ChatGPT image 2.0” and official documented `gpt-image-2` / `gpt-image-2-2026-04-21` identifiers, verified 2026-10-04. This is documentation evidence, not account access, connector mapping or live adapter configuration. The guide also includes examples from other models; shared prompting techniques must be evaluated on the requested model. Output sizes need provider validation before live integration. Request-ready is separate from generated; dispatch is false and generation stays not-run in this foundation.

`buildRevisionPackage(record,{target,issues,attempt,cyclePlan})` creates a targeted automatic request to Copywriter or Art director, preserving all locked payload and identity hashes. The reviewer lifecycle authorizes exactly one consolidated correction cycle; no retry runner is implemented.

`results.associateReviewedResults(packages,results,{demo})` accepts only finished matching records with every required review attestation passing and review hashes bound to actual decoded bytes. It checks dimensions/format and package integrity. The renderer displays a concise intended-choice rationale alongside each corresponding image. Synthetic results require a synthetic assignment, explicit demo mode and simulated-review evidence; they are labeled placeholders. Live results require a non-demo assignment and runtime-review evidence. These are trusted reviewer attestations, not independent OCR/vision review; generated origin is an upstream attestation and must come from a future verified provider runtime. No actual generated/vision-reviewed result exists here.

The rationale explains intended takeaway, focal hierarchy/imagery/brand and placement adaptation without claiming that the output achieves audience effects. Missing, failed, pending or mismatched results get no public rationale. No new app page or server integration is required; the renderer is callable when the future pipeline supplies a reviewed output.

Knowledge separates verified provider guidance from authored design/production heuristics. Synthetic good/bad examples are practice cases, not past successes. Pending evaluation includes real exact-text/legibility checks, product/logo fidelity, implicit claims, reference-role adherence, placement crop/output and expert design review.

`results.buildReviewerHandoff(record,imageData)` decodes actual output, measures dimensions/format/bytes and applies supplied byte ceilings without resolving an unknown publisher byte convention. It emits an automatic reviewer packet with artifact hash and every semantic/rendered check pending. A passing numeric self-check is not a completed review.

Revision policy update: `buildRevisionPackage` requires a `cyclePlan` from the Creative reviewer lifecycle and permits only attempt 1. The one consolidated cycle covers all findings and agents for a static; version changes cannot reset it. Reviewed pass-only association remains intact. The separate reviewer delivery module handles honest flagged delivery when that cycle is exhausted.
