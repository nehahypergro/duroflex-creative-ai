# Creative AI Marketing strategist foundation

`marketing-strategist` is the canonical identifier. `brand-strategist` and `Brand strategist` resolve to the same contract through `../agents.js`; they are not an additional team role. Inspection found no existing nine-role agent runtime in the root application. Root legacy research prompts combine strategy and direction, while the separate Sora Studio has a video-specific knowledge gateway. Neither is replaced or silently repurposed. The completed dossier feature remains intact.

This module provides a callable contract and context assembly, not live inference. No model, SDK, credential, external account, image API or additional agent has been integrated. No human approval gate is introduced. There are no new HTTP endpoints for this foundation.

## Input / output for review

Input is a user goal and brief; optional product name, objective, audience, offer references, market and language; selected formats with supplied/pending specifications; the existing researcher dossier; guardian requirements and inferred preferences; additional source records; attributable product/offer/customer/campaign/destination/brand facts; and explicit conflicts. Empty optional evidence collections are valid. References are IDs, never invented API lookups. Customer and campaign facts are optional, not automatically inferred from website text.

Output is an assignment strategy brief: objective and objective type, audience, buying situation, communication problem, one primary proposition, exact supported proof, objections, desired action, established positioning references and channel/format implications. It includes selected direction, considered alternatives and their seven-dimension critique; hard-gate status; material tradeoffs; explicit requirement checks; assumptions/uncertainties; source references; evidence that could change the recommendation; targeted research requests; an untested, falsifiable hypothesis; applied knowledge principles; and a concise decision summary. It excludes raw private reasoning and downstream concepts/headlines/design.

Fields use evidence/inference/assumption labels. A knowledge citation is not evidence about this brand. Facts marked supported are assertions by the upstream collector; software does not independently verify truth or legal claim substantiation. Claims reproduce eligible fact text and source IDs exactly to preserve qualifiers. Missing/conflicted essential facts require research; missing audience/objective permits a marked assumption without mandatory approval.

## Use the existing Node stack

```js
const { getAgentContract } = require('./lib/creative-ai/agents');
const strategist = getAgentContract('brand-strategist');
const context = strategist.assembleContext(input);
// context.messages is ready for a future model adapter. Do not send it until an adapter is authorized.
// No reasoning-model call happens here.
const result = strategist.validateOutput(proposedOutput, input);
if (!result.ok) {
  // Return targeted corrections to the producer; do not forward hard failures to the director.
  console.log(result.hardErrors);
}
```

The Workflow producer should assemble this after the researcher dossier and guardian guide exist, then provide the resulting strategy to the Creative director. No automatic wiring to the legacy generator is included, because its combined research/design output does not implement this role contract. The existing whole-static image-generation direction stays downstream; this module adds no composition layers.

`agent.json` locates knowledge, instructions and schemas. `loadKnowledge()` loads the curated pack and validates source/principle identity and required annotations. `assembleContext()` includes the full pack in trusted instructions, the output schema, untrusted supplied source data, a readiness audit and contextual focus suggestions. Image bytes are omitted from text context while image availability and provenance stay in the inventory. Changes to objectives, evidence or knowledge alter the auditable context hash. This hash identifies assembled input; it is not a quality score or evidence of independent review.

`input.schema.json` and `output.schema.json` describe the wrapper contracts. The input research object delegates at runtime to the existing dossier's `validateResearch`; it intentionally does not finalize the broader researcher contract. `schema-validator.js` implements only the keywords in these bundled schemas, with no new dependency. Use a full JSON Schema validator if externally extending the schemas.

## Hard checks and limits

Runtime checks verify schema shape, known source/fact/format IDs, citations, accessible fact sources, source timestamps, duplicate records, exact supported claim equality, conflicted facts, guardian requirement coverage, selected-route consistency, assigned objective and positioning-reference preservation, knowledge applications and essential research requests. Meta observations are excluded from fact substantiation. An evidence-based audience or buying situation requires eligible customer facts. Missing objective/audience requires explicit labeled assumptions.

Hard-failed alternatives cannot be selected or scored. Qualitative scoring is permitted only after the output passes hard checks. Known unresolved requirement conflicts cannot be marked met. No route count is forced; one viable route is allowed and no selection is allowed for a research-required output using `directionId: "none"`.

A narrow text tripwire rejects obvious conversion forecasts or winning-ad assertions outside the dedicated untested hypothesis. It is not a complete claim detector. Runtime checks cannot establish semantic truth, implicit claims, actual compliance with a natural-language brand requirement, meaningful route distinctness, strategy quality, or causal performance. These require model/runtime evaluation and qualified reviewer judgment when available. There is no claim that those evaluations have occurred. Data inside sources remains untrusted; separation of messages and instructions reduces ambiguity but cannot prove prompt-injection resistance of a future model.

## Practice and verification

`examples/synthetic.js` provides a clearly labeled fictional input and strategy output for review. `examples/input.json` and `examples/output.json` save the same reviewable machine-readable pair (image bytes omitted from the input fixture). No real campaign history, customer evidence or outcome is implied. The output is human-authored to illustrate the contract, not generated inference. Knowledge annotations contain independent synthetic worked examples and counterexamples. `evaluation-plan.json` defines future reviewer evaluation; it is explicitly unrun.

```sh
npm run test:strategist
node --test tests/creative-ai/marketing-strategist.test.js tests/brand-dossier/dossier.test.js
```

The tests verify knowledge inclusion and aliases, exact claims/qualifiers, source handling, conflicts and hard gates, assumptions without approval, essential research requests, context changes by objective/evidence, no fixed route count, rejected forecast wording and raw-reasoning fields. Passing these tests validates software behavior, not marketing expertise.

Remaining integrations: finalized producer/researcher/guardian adapters; approved reasoning model and model adapter; qualified reviewer and real outcome evaluation; production evidence authorization/storage and context budgeting; downstream director handoff. Static format dimensions remain pending. No publishing or credential requests are part of this work.

## Headline summary and marketer interface

The required `getWhoToBy` output comes before `brief`. It is derived after strategic selection, not added to the input form. GET is the audience; WHO is relevant current situation, belief, need or barrier; TO is the desired change in understanding, attitude or behavior; BY is the central communication proposition. Awareness may use context rather than pain. The agreed definition is retained even though the [Kickframe reference](https://kickframetoolbox.com/get-who-to-by) describes WHO in terms of a problem.

Each component has `text`, `basis`, `sourceIds`, `factIds`, and `briefField`. GET maps to `audience`; WHO to `buyingSituation` or `communicationProblem`; TO to `desiredAction` or `objective`; BY to `primaryProposition`. `statement` is rendered as “Get [GET], who [WHO], to [TO], by [BY].” Component text can be a concise paraphrase. Validation checks allowed mappings, matching evidence status and source/fact ID sets, valid existing references and exact statement construction. An evidence-labeled WHO requires eligible customer/campaign fact references. This proves reference presence, not measured insight or semantic substantiation. Software does not prove that a paraphrase is coherent or faithful; that remains a model/evaluation responsibility. BY is not final ad copy or visual execution.

```js
const strategist = require('./lib/creative-ai/marketing-strategist');
output.getWhoToBy = strategist.deriveGetWhoToBy(output.brief, {
  whoFrom: 'buyingSituation', // or communicationProblem
  toFrom: 'desiredAction'    // or objective
});
// Optional concise editorial wording preserves basis/sourceIds/factIds/briefField.
output.getWhoToBy.statement = strategist.renderGetWhoToBy(output.getWhoToBy);
```

`render.js` supplies `renderGetWhoToByPanel(output, input)` for embedding the validated summary in future results UI, and `renderStrategyHtml(output, input, options)` for a complete strategy presentation. The latter retains the full brief, alternatives, rationale, assumptions, hypothesis and source appendix in native expandable panels. The four summary fields each expose their evidence status, attribution and collection dates. Missing source evidence is explicitly labeled. Research-required outputs display a provisional-data notice with no approval button.

The root application now links to `GET /strategy/demo`, which serves the saved synthetic input/output fixtures. Start the existing root server with `npm start`; default URL is `http://127.0.0.1:1824/strategy/demo`, or substitute the configured PORT. This is the only new view route, also supporting HEAD. It is visibly labeled “DEMONSTRATION / Synthetic example / no live strategist inference.” It does not claim the new agent generated the fixture. `renderStrategyHtml` automatically preserves the demonstration notice when the researcher dossier is a demo.

No current live strategist display exists to wire. When the producer has a real strategy output, call `validateOutput(output, input)`, then pass the same validated pair to `renderGetWhoToByPanel` in its strategy results area, or use `renderStrategyHtml` for a results page. Do not point real jobs at `/strategy/demo`. Model inference, producer job storage and real results routing remain unimplemented. Neither legacy AI summaries nor dossier findings are adapted into fabricated strategist output.

## Customer, message, proof and destination decisions

The existing Marketing strategist owns this work before creative direction. Its instructions now explicitly distinguish the customer's buying situation from placement constraints, and the customer-facing proposition from logo/layout/copy execution. A neutral introduction may proceed with labeled hypotheses; a missing essential product fact or a known destination conflict remains a research dependency. No additional strategist or human approval gate is introduced.

New runtime requests use `schemaFor()` and `validateOutput(output,input,{requireStrategyChecks:true})`. Required `strategyChecks` records product focus, customer barrier, customer relevance, message role, selected proof IDs and their limits, destination verification/action/fit, weakest assumption and evidence needed. Evidence-labeled customer reasoning needs eligible customer/campaign facts. The proof inventory must cover the proposition, selected alternative and supporting claims. A verified destination needs eligible destination facts tied to the exact page URL. Explicit landing URLs and desired actions are preserved. Unverified customer/destination reasoning must disclose uncertainty and a targeted research request; nonessential uncertainty can remain provisional. Narrow tripwires reject the observed format-only WHO and execution-only BY failures. They are not a complete semantic classifier or proof of persuasion.

The base output contract accepts this optional field so historical saved strategies retain their original identity and remain readable. When present it is validated, including at downstream director/art/designer boundaries. New runtime inference requires it; older reports are not retroactively upgraded or re-scored. The runtime uses its existing maximum-one schema repair with the same reasoning/spending budget. The adapter no longer rewrites unsupported supporting-claim text into source facts before validation: mismatches must be rejected and repaired explicitly.

Optional assignment fields `buyingSituation`, `buyingBarrier`, `desiredAction` and `landingPageUrl` provide campaign context. They describe user instructions, not measured customer research. The local runtime API also accepts these fields and `productName`, rejecting invalid values before paid research. Without a supplied product name, the runtime uses the researched brand name without inventing a category. The former `carry goods` literal was already overwritten before dispatch; that redundant assignment has been removed. The intake UI continues to accept campaign details in its brief.

`examples/output.json` and `outputExample({includeStrategyChecks:true})` illustrate the new decisions with explicitly authored fictional assertions. `strategy-decisions.test.js` verifies the new runtime requirement, historical compatibility, product/claim proof, customer provenance, observed WHO/BY failures, exact-page destination evidence, explicit action preservation, uncertainty/research requests, awareness without invented pain, and actual provider-schema repair without image calls. Software checks establish structure/provenance/consistency; source substantiation, implicit claims and persuasion still need semantic judgment and applicable customer evidence.
