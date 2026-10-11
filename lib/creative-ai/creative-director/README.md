# Creative AI Creative director foundation

This module extends the existing CommonJS agent registry and the strategist's schema/context pattern. It preserves the dossier and Marketing strategist (`brand-strategist` alias) work. Only the Creative director foundation is added; no downstream agent or model API is implemented.

## Confirmed behavior

The director produces exactly **two internal concept cards**: one continuity and one exploration. Both express the same strategy, preserve the established positioning/product truth/mandatory rules, and automatically go to **both Copywriter and Art director** when mandatory checks pass. There is no shortlist, selected concept, approval button or mandatory intermediate user task. Continuity uses supplied observed/approved brand language; inferred guardian preferences remain preferences. Exploration varies the premise inside the same mandatory boundaries, not the positioning.

User-facing idea/takeaway/rationale appears only beside the corresponding reviewed finished static. The concept working titles, copy direction, visual direction and internal critique are not exposed as a concept-selection screen.

## Input and output

`input.schema.json` accepts version, stable assignment ID, the original `strategyInput`, validated `strategy` output (including GET/WHO/TO/BY and full brief), selected source-backed creative-reference asset IDs, and optional user preferences (empty list permitted). Reusing the authoritative strategist packet keeps researcher sources/status, guardian requirements versus preferences, product/offer/customer/destination facts, formats and source attribution in one place rather than reconciling duplicate packets. The existing researcher dossier is still validated by its own runtime contract; the broader researcher/guardian contract remains pending.

`output.schema.json` requires version, director/assignment IDs, strategy fingerprint, ready/blocked status, bounded attempt metadata and internal questions, exactly two cards, and the deterministic typed handoff. Each card contains stable ID/route, working title, central idea, intended takeaway, premise, exact strategy/evidence linkage, brand linkage, proposed copy and visual directions (not final copy/layout), references/assumption IDs, required assets/proof, format implications, risks, mandatory checks, six-dimension qualitative critique, refinement summary, rationale, explicitly applied knowledge principles/limits and concise public explanation. No raw private reasoning is requested.

`knowledge/pack.json` contains seven annotated principles and six primary source references: strategic appropriateness/originality, concept versus decoration, analogy/metaphor, story/situation, attention/interpretation, recognizable brand expression and bounded critique. Each includes short source-grounded summaries, editorial application guidance, limits and clearly labeled synthetic examples/counterexamples. Full books or papers are not reproduced. The story reference is an author-university abstract, explicitly labeled as such; no full-article review is claimed. The principles do not prove quality, memory or campaign effectiveness. No qualified reviewer validation or personal agency experience is claimed.

## Callable integration

```js
const director = require('./lib/creative-ai/agents').getAgentContract('creative-director');
const context = director.assembleContext(input); // loads knowledge/instructions, no model call
// Future authorized inference uses director.coreOutputSchema: all output fields except handoff.
const output = director.finalizeOutput(coreOutput, input);
const validation = director.validateOutput(output, input);
// Future producer dispatches only if validation.dispatchAllowed is true.
```

`conceptIdFor(input, route)` derives stable route IDs from the assignment ID. `strategyFingerprint` covers the supplied strategy and its original evidence packet. `conceptFingerprint` covers assignment, strategy fingerprint and the entire card. These identify provenance/versions, not creative quality. Source data is separated from trusted instructions; prompt-injection resistance of a future model is not proven. Image bytes are omitted from text/handoff context while inventory references and image availability remain, so future Art director/producer must resolve actual approved assets separately.

`buildAutomaticHandoffs`/`finalizeOutput` produce `creative-ai.specialist-handoff.v1`. The payload carries shared strategy, guardian, facts, formats, dossier metadata, uncertainties, assumptions and user preferences; each recipient has both concept IDs and both full cards, with per-card fingerprints. No actual model invocation, messaging or external write occurs. Copywriter owns exact text; Art director owns visual execution. The whole-static image generator is still downstream and no separate text/logo composition layers are added.

If either card has a mandatory failure, missing essential execution image or upstream strategy dependency, the **pair is blocked**. Both concept IDs remain in the handoff but neither recipient may dispatch and packets are empty. Internal questions go to the producer/relevant logical role. One represented attempt is accepted; the persistent reviewer lifecycle owns the single correction cycle per static; this foundation does not run retries, repair facts or introduce a human approval requirement.

## Result-side presentation

`results.js` exports `associateReviewedResults(output, input, results)` and `renderReviewedResultsHtml(output, input, results)`. A result must be finished, have a passed review marker, and match the assignment ID, strategy fingerprint, concept ID/fingerprint and selected format. Queued, failed and unreviewed results reveal no concept explanation. Unknown/mismatched completed associations are rejected. Real generated artifacts need a local image URL and runtime review marker; synthetic fixtures cannot masquerade as generated images. Producer markers are assertions, not an independent review performed here.

`GET/HEAD /creative-results/demo` is an isolated, explicitly labeled **synthetic result-shape demonstration** served by the existing root Node server. It uses `examples/input.json`, `output.json` and `results.json`, authored by `examples/synthetic.js`. The two placeholders say that no images were generated and that review markers are simulated. There are no select/approve controls. This is not linked as an intermediate main-app step. No current real director/finished-static result path exists to wire, and legacy image jobs are not assigned fabricated concept associations.

Run `npm start` and open `http://127.0.0.1:1824/creative-results/demo` (substitute PORT if configured). In the future results handler, pass the matching validated director output, original input and producer-associated reviewed results into the renderer. Do not serve the demo route for real jobs. The renderer attaches only the public explanation and its source/assumption disclosure, preserving hidden workflow UX.

## Checks and honest limits

Software checks exact route count/type, IDs, exact strategy/GET-WHO-TO-BY evidence linkage, assumption preservation, mandatory-reference/check coverage, known eligible proof and source references, unchanged format status, literal duplicate premises, pair blocking, and exact automatic handoff contents. It rejects inventory metadata being falsely declared available image bytes. It checks result association and artifact/review markers before display.

Software does **not** prove conceptual distinctness beyond literal duplication, semantic claim truth, actual interpretation of a metaphor, faithfulness of natural-language brand linkage, subjective originality, quality or execution feasibility. A director's mandatory-check labels and producer review markers still require trustworthy upstream execution and later qualified evaluation. Multiple model critique passes are not independent evidence. Missing exact static dimensions remain pending rather than invented.

Pending: approved reasoning model/inference adapter; final guardian/producer contracts; real asset resolver and result storage/association; actual Copywriter, Art director and reviewer adapters; qualified semantic review and creative evaluation; production access/retention/context budgeting. There is no deployment or collection integration here.

## Verification

```sh
npm run test:director
node --test tests/creative-ai/*.test.js tests/brand-dossier/dossier.test.js
```

Tests cover exact two route types, both automatic specialist handoffs, stable IDs, strategy/assumption/brand preservation, invalid references/proof/format status, blocked upstream dependencies and essential assets, handoff tampering, result association, no premature display, synthetic labels, escaped text and absence of user selection controls. Strategist and dossier regressions remain included.
