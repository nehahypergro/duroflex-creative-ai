# Creative reviewer foundation

Callable automated policy, cause-based routing, persistent one-cycle lifecycle and final-result presentation. No live generation, OCR, vision or semantic evaluator is connected. Both concept routes proceed automatically; no human approval or concept selection is added. The `reviewer` alias resolves to `creative-reviewer`.

```js
const reviewer = require('./lib/creative-ai/creative-reviewer');
const fixture = require('./lib/creative-ai/creative-reviewer/examples/synthetic');
const input = await fixture.inputExample(); // explicit synthetic placeholder and simulated attestations
const ctx = await reviewer.assembleContext(input);
const report = reviewer.evaluate(ctx);
reviewer.validateOutput(report, ctx);
```

Review input binds an immutable Graphic designer package (with strategy, GET/WHO/TO/BY, concept, art, exact copy, brand constraints, actual reference roles and pinned placement) to actual decoded raster bytes. The package and artifact hashes must match evaluator evidence. Raster dimensions/format/bytes are inspected by code; the remaining criteria are explicitly supplied evaluator attestations. Pending evaluators cannot manufacture pass. Synthetic practice reports are conspicuously labeled and cannot become runtime review. Identity is judged with criterion-specific semantic tolerance rather than pixel equality; locked wording stays exact.

Critical checks cover logo/product identity, supported explicit/implied claims, exact locked/mandatory copy, required-text readability, explicit mandatory brand rules, verified mandatory upload rules and the reference boundary. Applicable checks need sufficient evidence. Missing or low-confidence evidence stays unknown and produces focused verification. Logo/product applicability follows supplied identity assets and explicit rules; an observed unexpected identity defect may still be reported as critical. Technical constraints retain pinned source status and ambiguous counting/byte conventions. Unknown inspection methods remain unknown. No pixel-header check can establish spelling, readability, truthful claims or brand compliance.

Creative quality weights: communication 30%, brand recognition 25%, placement fit 20%, visual craft 15%, emotional/audience fit 10%. **75 passes equality**, provided all applicable critical checks pass. A 95 cannot outweigh a critical defect. Every score requires an observable reason, location, comparison target and confidence. Inferred style is advisory and cannot be promoted to an explicit mandatory rule. Exploration is judged for its own concept/strategy, without a historical-style similarity penalty. Weights, 75 threshold and 0.7 confidence floor are initial uncalibrated policy; no empirical performance or human-brand-manager approval is claimed.

`routing.routeFinding` uses declared cause plus required stage comparisons. Correct copy/rendered typo and correct asset/distorted render go to Graphic designer. Weak deck wording goes to Copywriter. Weak prescribed hierarchy goes to Art director; ignored good art goes to Graphic designer. Wrong source logo goes to Brand researcher, with Guardian verification. A faithful concept that fails strategy goes to Creative director. Ambiguous rules go to Guardian; missing/conflicting placement specs go to Workflow producer. Uncertain cause requests diagnosis rather than assigning blame from a score. `consolidatedPlan` unions affected downstream stages once and preserves unaffected work. Comparisons are evaluator evidence, not an independently computed causal diagnosis.

```js
const {ReviewLedger} = require('./lifecycle');
const ledger = new ReviewLedger('/absolute/producer-owned/review-ledger');
let state = await ledger.start(input.package, input.artifact.imageData);
state = await ledger.review(state.unitKey, report);
// If correction-planned: routing.consolidatedPlan(report,state) authorizes the ONE consolidated cycle.
// Revised affected upstream versions -> new package -> one regeneration -> ledger.correction(...).
// ledger.review(...finalReport) ends in ready, flagged-cap-reached or no-output; never another cycle.
```

The durable unit key is assignment×route×placement, **not package/concept/art/copy/placement-profile version**. `start` reuses stored state; it cannot reset a spent cycle under a new version. Exclusive transaction locks and atomic writes prevent multiple workers spending the cycle. A busy lock returns an explicit retryable transaction error; it does not authorize another generation. Future producer must keep this ledger path across runs and serialize orchestration through it. Pure state functions are planning helpers; creating a new directory or discarding persisted state is not authorized retry behavior. No agent/provider execution runner is fabricated.

`Graphic designer.buildRevisionPackage` now accepts only attempt 1 and requires the consolidated `cyclePlan` authorization. It is an idempotent packet builder, not an execution permit or separate per-agent budget. Workflow attempt metadata in existing director/art/designer contracts is also capped at one. Corrected upstream artifacts get new hashes, while the reviewer ledger keeps the spent cycle.

`delivery.buildDelivery` and `renderDeliveryHtml` preserve the existing pass-only result association and add a **distinct flagged-cap-reached path**. Initial ready delivers immediately. After the single correction, final failed/unverified artwork is delivered with honest unresolved issues, intended concept/composition explanation and no readiness/approval claim. If regeneration fails, the earlier available matching artifact can be presented as a flagged fallback. If no decodable image ever exists, no-output is terminal and carries no fabricated image or rationale. Source/byte/package identity is checked again at delivery. The user-facing presentation contains concise notes and issues, not internal routing panels.

Knowledge includes primary typography/perception/design guidance plus annotated synthetic good/bad critiques, source-comparison limits and an explicit qualified-evaluation plan. Real review performance, false-positive rates, score calibration, tolerance judgments and cause agreement remain unevaluated. The separately owned placement library, app server and unrelated UI are unchanged.
