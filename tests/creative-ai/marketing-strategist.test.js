'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const contract = require('../../lib/creative-ai/marketing-strategist');
const { getAgentContract } = require('../../lib/creative-ai/agents');
const { inputExample, outputExample } = require('../../lib/creative-ai/marketing-strategist/examples/synthetic');
test('same agent alias, curated knowledge and provenance actually enter assembled context', async () => {
  assert.equal(getAgentContract('Brand strategist'), getAgentContract('marketing-strategist'));
  const result = contract.assembleContext(await inputExample());
  for (const p of contract.loadKnowledge().principles) for (const field of ['sourceSummary', 'application', 'limits', 'syntheticExample', 'counterexample']) assert.ok(result.messages[0].content.includes(p[field]));
  for (const s of contract.loadKnowledge().sources) assert.ok(result.messages[0].content.includes(s.url));
  assert.ok(result.messages[0].content.includes('Do not claim human career experience'));
  assert.ok(!result.messages[1].content.includes('data:image/png'));
  assert.ok(result.runtimeStatus.includes('Inference not integrated'));
});
test('synthetic output keeps supported claims, assumptions, requirements and alternatives auditable', async () => {
  const result = contract.validateOutput(outputExample(), await inputExample()); assert.deepEqual(result.hardErrors, []); assert.equal(result.ok, true);
});
test('supported-claim equality retains qualifiers and rejects invented or unavailable proof', async () => {
  const input = await inputExample(), output = outputExample();
  output.brief.supportingClaims[0].text = 'Keeps everyone hydrated all day'; assert.equal(contract.validateOutput(output, input).ok, false);
  const other = outputExample(); other.brief.supportingClaims[0].sourceIds = ['site']; assert.equal(contract.validateOutput(other, input).ok, false);
  const conflict = structuredClone(input); conflict.facts[0].status = 'conflicted'; assert.equal(contract.analyzeInput(contract.validateInput(conflict)).readiness, 'research_required'); assert.equal(contract.validateOutput(outputExample(), conflict).ok, false);
});
test('missing objective/audience require labeled assumptions, not an approval gate; product absence requires research', async () => {
  const input = await inputExample(); delete input.assignment.objective;
  const context = contract.assembleContext(input); assert.equal(context.analysis.readiness, 'context_ready'); assert.deepEqual(context.analysis.assumptionsNeeded, ['objective', 'audience']); assert.equal(context.agent.humanApprovalRequired, false);
  const output = outputExample(); output.brief.objective.basis = 'assumption'; output.assumptions.push({ id: 'objective', text: 'Consideration is provisional.', reason: 'No objective supplied.' }); output.getWhoToBy = contract.deriveGetWhoToBy(output.brief); assert.equal(contract.validateOutput(output, input).ok, true);
  delete input.assignment.productName; assert.ok(contract.assembleContext(input).analysis.missingEssential.includes('productName')); assert.equal(contract.validateOutput(output, input).ok, false);
});
test('evidence and objective changes alter context, focus and eligible facts', async () => {
  const input = await inputExample(); input.assignment.objective = 'awareness'; const a = contract.assembleContext(input);
  input.assignment.objective = 'action'; const b = contract.assembleContext(input); assert.notEqual(a.contextHash, b.contextHash); assert.ok(a.analysis.focusPrincipleIds.includes('buying-situation')); assert.ok(b.analysis.focusPrincipleIds.includes('risk-trust'));
  input.additionalSources[0].status = 'unavailable'; input.additionalSources[0].note = 'Supplied file unreadable'; const c = contract.assembleContext(input); assert.notEqual(b.contextHash, c.contextHash); assert.ok(!c.analysis.eligibleFacts.some(f => f.id === 'capacity')); assert.equal(c.analysis.readiness, 'research_required');
});
test('guardian conflicts and hard failures precede qualitative scores', async () => {
  const input = await inputExample(); input.conflicts.push({ id: 'brief-conflict', description: 'Brief asks for medical promise excluded by guardian.', factIds: [], requirementIds: ['no-medical'], essential: true });
  assert.equal(contract.assembleContext(input).analysis.readiness, 'research_required'); assert.equal(contract.validateOutput(outputExample(), input).ok, false);
  const output = outputExample(); output.alternatives[0].hardGate = 'fail'; output.alternatives[0].violations = ['Explicit guardian violation']; output.alternatives[0].optionalScore = 99;
  const result = contract.validateOutput(output, await inputExample()); assert.equal(result.qualitativeScoringAllowed, false); assert.ok(result.hardErrors.some(e => e.includes('Cannot select'))); assert.ok(result.hardErrors.some(e => e.includes('cannot receive qualitative score')));
});
test('Meta observations cannot become claim substantiation; predicted conversions and raw reasoning are rejected', async () => {
  const input = await inputExample(); input.additionalSources[0].kind = 'meta'; assert.ok(!contract.assembleContext(input).analysis.eligibleFacts.some(f => f.id === 'capacity'));
  const output = outputExample(); output.decisionSummary = 'This will increase conversions by 20%'; assert.equal(contract.validateOutput(output, await inputExample()).ok, false);
  const raw = outputExample(); raw.privateReasoning = 'Hidden step-by-step thoughts'; assert.equal(contract.validateOutput(raw, await inputExample()).ok, false);
});
test('unknown sources, malformed inputs and missing knowledge applications fail', async () => {
  const input = await inputExample(); input.facts[0].sourceIds = ['unknown']; assert.throws(() => contract.assembleContext(input), /Unknown fact source/);
  const output = outputExample(); output.knowledgeApplications = []; assert.equal(contract.validateOutput(output, await inputExample()).ok, false);
});
test('a constrained assignment is allowed one route, with no forced framework or candidate count', async () => {
  const output = outputExample(); output.alternatives = output.alternatives.slice(0, 1); output.selection.alternativesNote = 'One defensible route in this constrained assignment; no materially different supported route identified.';
  assert.equal(contract.validateOutput(output, await inputExample()).ok, true);
});
test('missing essential facts can return a valid research-required brief without inventing a route or approval', async () => {
  const input = await inputExample(); input.facts[0].status = 'unverified';
  const output = outputExample(); output.status = 'research_required'; output.alternatives = [];
  output.selection = { directionId: 'none', reason: 'Essential product facts are unavailable.', materialTradeoffs: ['Only a provisional audience discussion is possible.'], alternativesNote: 'No product route is selected until product facts are supplied.' };
  output.brief.primaryProposition = { text: 'Primary proposition deferred pending product verification.', basis: 'assumption', sourceIds: [], factIds: [] }; output.brief.supportingClaims = [];
  output.getWhoToBy = contract.deriveGetWhoToBy(output.brief);
  output.researchRequests = contract.assembleContext(input).analysis.missingEssential.map(id => ({ question: 'Supply applicable verified product facts.', essential: true, relatedIds: [id] }));
  assert.equal(contract.validateOutput(output, input).ok, true);
});
test('visible ads alone cannot establish an evidence-based audience', async () => {
  const input = await inputExample(); input.assignment.audience = 'An instructed audience';
  const output = outputExample(); output.brief.audience.basis = 'evidence'; output.brief.audience.sourceIds = ['sample']; output.brief.audience.factIds = [];
  assert.ok(contract.validateOutput(output, input).hardErrors.some(e => e.includes('eligible customer facts')));
});
test('strategy output cannot silently switch assignment objective or drop established positioning', async () => {
  const input = await inputExample(); input.assignment.objective = 'action';
  assert.ok(contract.validateOutput(outputExample(), input).hardErrors.some(e => e.includes('preserve assigned objective')));
  const output = outputExample(); output.brief.positioningFactIds = [];
  assert.ok(contract.validateOutput(output, await inputExample()).hardErrors.some(e => e.includes('positioning references')));
});
test('Get/Who/To/By is required output, derived from mapped brief fields and present in context', async () => {
  const input = await inputExample(), output = outputExample();
  assert.ok(contract.assembleContext(input).messages[0].content.includes('Headline output summary - Get / Who / To / By'));
  const derived = contract.deriveGetWhoToBy(output.brief, { whoFrom: 'communicationProblem', toFrom: 'objective' });
  assert.equal(derived.get.briefField, 'audience'); assert.equal(derived.who.briefField, 'communicationProblem'); assert.equal(derived.to.briefField, 'objective'); assert.equal(derived.by.briefField, 'primaryProposition');
  output.getWhoToBy = derived; assert.equal(contract.validateOutput(output, input).ok, true);
  delete output.getWhoToBy; assert.equal(contract.validateOutput(output, input).ok, false);
  assert.throws(() => contract.deriveGetWhoToBy(output.brief, { whoFrom: 'supportingClaims' }));
});
test('summary cannot promote WHO to measured insight or alter BY provenance; combined text must match components', async () => {
  const input = await inputExample(), who = outputExample(); who.getWhoToBy.who.basis = 'evidence'; who.getWhoToBy.who.sourceIds = ['product-sheet'];
  assert.equal(contract.validateOutput(who, input).ok, false);
  const by = outputExample(); by.getWhoToBy.by.factIds = []; assert.ok(contract.validateOutput(by, input).hardErrors.some(e => e.includes('references must match')));
  const text = outputExample(); text.getWhoToBy.statement = 'Unrelated summary'; assert.equal(contract.validateOutput(text, input).ok, false);
  const wrongField = outputExample(); wrongField.getWhoToBy.get.briefField = 'primaryProposition'; assert.equal(contract.validateOutput(wrongField, input).ok, false);
});
test('awareness can use a situation without inventing pain; missing-source labels and citations display', async () => {
  const input = await inputExample(), output = outputExample(); input.assignment.objective = 'awareness'; output.brief.objectiveType = 'awareness';
  output.getWhoToBy = contract.deriveGetWhoToBy(output.brief); output.getWhoToBy.who.text = 'are preparing for a routine outing'; output.getWhoToBy.statement = contract.renderGetWhoToBy(output.getWhoToBy);
  const { renderStrategyHtml } = require('../../lib/creative-ai/marketing-strategist/render'); const html = renderStrategyHtml(output, input);
  for (const [key, value] of Object.entries(output.getWhoToBy)) if (key !== 'statement') assert.ok(html.includes(`data-component="${key}" data-brief-field="${value.briefField}"`));
  assert.ok(html.includes('Assumption / not measured')); assert.ok(html.includes('Inference / not measured')); assert.ok(html.includes('No source evidence supplied for this component.')); assert.ok(html.includes('Collected 2026-10-04T00:00:00Z')); assert.ok(html.includes('Fictional supplied product sheet'));
  assert.ok(html.indexOf('Get / Who / To / By') < html.indexOf('Supporting brief and decision')); assert.ok(html.includes('Synthetic example / no live strategist inference')); assert.ok(html.includes('<details>'));
});
test('display escapes supplied wording and rejects outputs that fail traceability', async () => {
  const { renderGetWhoToByPanel } = require('../../lib/creative-ai/marketing-strategist/render');
  const input = await inputExample(), output = outputExample(); output.getWhoToBy.who.text = '<script>alert(1)</script>'; output.getWhoToBy.statement = contract.renderGetWhoToBy(output.getWhoToBy);
  const html = renderGetWhoToByPanel(output, input); assert.ok(!html.includes('<script>')); assert.ok(html.includes('&lt;script&gt;'));
  output.getWhoToBy.who.basis = 'evidence'; assert.throws(() => renderGetWhoToByPanel(output, input), /invalid strategy/);
});
