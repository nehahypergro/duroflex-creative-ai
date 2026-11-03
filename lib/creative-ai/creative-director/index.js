'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const strategist = require('../marketing-strategist');
const { check } = require('../marketing-strategist/schema-validator');
const inputSchema = require('./input.schema.json');
const outputSchema = require('./output.schema.json');
const agent = require('./agent.json');
const coreOutputSchema = structuredClone(outputSchema);
delete coreOutputSchema.properties.handoff;
coreOutputSchema.required = coreOutputSchema.required.filter(key => key !== 'handoff');
coreOutputSchema.$id = 'https://creative-ai.local/contracts/creative-director/core-output/v1';
const clone = require('../clone-data');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value !== null && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
const same = (a,b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const sameIds = (a,b) => same([...new Set(a)].sort(), [...new Set(b)].sort());
const fingerprint = value => crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
function loadKnowledge() {
  const pack = JSON.parse(fs.readFileSync(path.join(__dirname, agent.knowledge), 'utf8'));
  if (pack.agentId !== agent.id || pack.version !== 1) throw new Error('Invalid director knowledge identity');
  const sources = new Set(), principles = new Set();
  for (const s of pack.sources) { if (sources.has(s.id) || !s.url || !['verified-content','verified-abstract'].includes(s.accessStatus)) throw new Error('Invalid director knowledge source'); sources.add(s.id); }
  for (const p of pack.principles) {
    if (principles.has(p.id) || !p.sourceIds.length || p.sourceIds.some(id => !sources.has(id))) throw new Error('Invalid director principle provenance');
    for (const k of ['sourceSummary','application','limits','syntheticExample','counterexample']) if (!p[k]) throw new Error(`Missing director knowledge ${k}`);
    principles.add(p.id);
  }
  return pack;
}
function validateInput(payload) {
  const errors = check(inputSchema, payload);
  try { require('../concept-selection').routes(payload); } catch(e) { errors.push(e.message); }
  if (!errors.length) {
    try { strategist.validateInput(payload.strategyInput); } catch (e) { errors.push(e.message); }
    if (!errors.length) { const v = strategist.validateOutput(payload.strategy, payload.strategyInput); errors.push(...v.hardErrors); }
    const ids = new Set();
    const sourceMap = new Map(payload.strategyInput.research.sources.map(s => [s.id,s]));
    for (const id of payload.referenceCreativeIds) {
      if (ids.has(id)) errors.push(`Duplicate creative reference ${id}`); ids.add(id);
      const asset = payload.strategyInput.research.assets.find(a => a.id === id);
      if (!asset || !['creative','screenshot','ad','reference'].includes(asset.kind) || !asset.sourceIds.length || asset.sourceIds.some(s => !sourceMap.has(s) || sourceMap.get(s).status === 'unavailable')) errors.push(`Missing/inaccessible source-backed creative reference ${id}`);
    }
  }
  if (errors.length) { const error = new Error(errors.join('\n')); error.validationErrors = errors; throw error; }
  return clone(payload);
}
const strategyFingerprint = input => fingerprint({ strategy: input.strategy, strategyInput: input.strategyInput });
const conceptIdFor = (input, route) => `concept-${fingerprint(input.assignmentId).slice(0,16)}-${route}`;
const conceptFingerprint = (input, concept) => fingerprint({ assignmentId: input.assignmentId, strategyHash: strategyFingerprint(input), concept });
function executionContext(input) {
  const research = clone(input.strategyInput.research);
  research.assets = research.assets.map(({imageData,...asset}) => ({...asset,imageAvailable:!!imageData}));
  return { strategy: clone(input.strategy), strategyInput: { ...clone(input.strategyInput), research }, referenceCreativeIds: clone(input.referenceCreativeIds), userPreferences: clone(input.userPreferences) };
}
function coreErrors(output, input, strategyHash = strategyFingerprint(input)) {
  // Validate core with the same strict schema, reserving the handoff field for the deterministic builder.
  const {handoff, ...core} = output;
  const errors = check(require('../concept-selection').schemaFor(coreOutputSchema,input), core);
  if (errors.length) return errors;
  const sourceMap = new Map([...input.strategyInput.research.sources,...input.strategyInput.additionalSources].map(s => [s.id,s]));
  const eligibleFacts = new Set(strategist.analyzeInput(input.strategyInput).eligibleFacts.map(f => f.id));
  const assumptionIds = input.strategy.assumptions.map(a => a.id);
  const requirements = input.strategyInput.guardian.requirements.map(r => r.id);
  const preferences = new Set(input.strategyInput.guardian.preferences.map(r => r.id));
  const formats = input.strategyInput.assignment.formats;
  const principleIds = new Set(loadKnowledge().principles.map(p => p.id));
  const expectedLinkage = { strategyHash, primaryProposition: input.strategy.brief.primaryProposition, getWhoToBy: input.strategy.getWhoToBy, objectiveType: input.strategy.brief.objectiveType, positioningFactIds: input.strategy.brief.positioningFactIds };
  if (output.assignmentId !== input.assignmentId || output.strategyHash !== strategyHash) errors.push('Assignment/strategy fingerprint mismatch');
  if (!Number.isInteger(output.workflow.attempt)) errors.push('Attempt must be an integer');
  if (!sameIds(output.concepts.map(c => c.route), require('../concept-selection').routes(input))) errors.push('Concept routes must match the explicit selection (default: continuity and exploration)');
  if (new Set(output.concepts.map(c=>c.conceptId)).size !== output.concepts.length) errors.push('Concept IDs must be distinct');
  const normalized = text => text.trim().toLowerCase().replace(/\s+/g,' ');
  if (output.concepts.length===2 && normalized(output.concepts[0].creativePremise.description) === normalized(output.concepts[1].creativePremise.description)) errors.push('Literal duplicate premises are not two distinct expressions');
  if (output.concepts.length===2 && normalized(output.concepts[0].visualDirection) === normalized(output.concepts[1].visualDirection)) errors.push('Literal duplicate visual direction is not a distinct exploration route');
  for (const c of output.concepts) {
    for (const application of c.knowledgeApplications) if (!principleIds.has(application.principleId)) errors.push(`Unknown director principle ${application.principleId}`);
    if (c.conceptId !== conceptIdFor(input,c.route)) errors.push(`Unstable concept ID ${c.conceptId}`);
    if (!same(c.strategyLinkage, expectedLinkage)) errors.push(`Strategy/evidence linkage changed: ${c.conceptId}`);
    if (!sameIds(c.evidence.assumptionIds, assumptionIds)) errors.push(`Strategy assumptions must remain attached: ${c.conceptId}`);
    if (!sameIds(c.brandLinkage.preservedRequirementIds,requirements)) errors.push(`Mandatory brand references must be preserved: ${c.conceptId}`);
    for (const id of c.brandLinkage.observedPreferenceIds) if (!preferences.has(id)) errors.push(`Unknown observed preference ${id}`);
    for (const id of c.evidence.sourceIds) if (!sourceMap.has(id) || sourceMap.get(id).status === 'unavailable') errors.push(`Invalid concept source ${id}`);
    for (const id of [...c.evidence.factIds,...c.requiredProofFactIds]) {
      if (!eligibleFacts.has(id)) errors.push(`Unsupported concept fact/proof ${id}`);
      for (const sourceId of input.strategyInput.facts.find(f => f.id === id)?.sourceIds || []) if (!c.evidence.sourceIds.includes(sourceId)) errors.push(`Missing concept fact attribution ${sourceId}`);
    }
    for (const id of c.evidence.referenceCreativeIds) {
      if (!input.referenceCreativeIds.includes(id)) {
        const asset = input.strategyInput.research.assets.find(a => a.id === id);
        errors.push(`Unknown selected creative reference ${id}. Allowed evidence.referenceCreativeIds: ${JSON.stringify(input.referenceCreativeIds)}. ${asset ? `This inventory asset has kind ${asset.kind}; use it in requiredAssets for execution, not as a style reference.` : 'This ID is absent from the supplied inventory; do not invent a replacement.'} Use [] when no creative references are supplied.`);
      }
      for (const sourceId of input.strategyInput.research.assets.find(a => a.id === id)?.sourceIds || []) if (!c.evidence.sourceIds.includes(sourceId)) errors.push(`Missing reference creative attribution ${sourceId}`);
    }
    for (const a of c.requiredAssets) if (a.status === 'available') {
      const asset = input.strategyInput.research.assets.find(asset => asset.id === a.assetId);
      if (!asset || !asset.imageData) errors.push(`Available execution image needs supplied inventory bytes: ${a.assetId}`);
    }
    if (!sameIds(c.formatImplications.map(f => f.formatId),formats.map(f => f.id)) || c.formatImplications.length !== formats.length) errors.push(`Format coverage mismatch: ${c.conceptId}`);
    for (const f of c.formatImplications) if (f.specificationStatus !== formats.find(format => format.id === f.formatId)?.specificationStatus) errors.push(`Format specification status changed: ${f.formatId}`);
    const checks = c.qualityReview.mandatoryChecks;
    if (!sameIds(checks.map(k => k.requirementId),requirements) || checks.length !== requirements.length) errors.push(`Mandatory check coverage mismatch: ${c.conceptId}; missing: ${requirements.filter(id=>!checks.some(c=>c.requirementId===id)).join(', ')||'none'}; unexpected: ${checks.filter(c=>!requirements.includes(c.requirementId)).map(c=>c.requirementId).join(', ')||'none'}; expected exactly ${requirements.length} unique checks, received ${checks.length}`);
    const mustFail = checks.some(k => k.status === 'fail') || c.qualityReview.violations.length || c.requiredAssets.some(a => a.essential && a.status === 'missing');
    if (mustFail && c.qualityReview.hardGate !== 'fail') errors.push(`Mandatory failure cannot be marked pass: ${c.conceptId}`);
    if (c.qualityReview.hardGate === 'fail' && !c.qualityReview.violations.length) errors.push(`Failed card needs a violation/dependency explanation: ${c.conceptId}`);
  }
  const pairBlocked = input.strategy.status !== 'ready' || output.concepts.some(c => c.qualityReview.hardGate === 'fail');
  if (output.status !== (pairBlocked ? 'blocked' : 'ready')) errors.push('Pair status must preserve upstream readiness and mandatory failures');
  if (pairBlocked && !output.workflow.internalQuestions.length) errors.push('Blocked pair needs an internal targeted dependency/question');
  return errors;
}
function buildAutomaticHandoffs(payload, inputPayload) {
  const input = validateInput(inputPayload), strategyHash = strategyFingerprint(input), errors = coreErrors(payload,input,strategyHash);
  if (errors.length) throw new Error(errors.join('\n'));
  const ready = payload.status === 'ready';
  return { version: 1, contract: 'creative-ai.specialist-handoff.v1', status: payload.status, automatic: true, humanApprovalRequired: false, assignmentId: input.assignmentId, strategyHash, context: executionContext(input), recipients: ['copywriter','art-director'].map(agentId => ({agentId,dispatchAllowed:ready,conceptIds:payload.concepts.map(c => c.conceptId),packets:ready ? payload.concepts.map(card => ({conceptId:card.conceptId,route:card.route,conceptHash:fingerprint({assignmentId:input.assignmentId,strategyHash,concept:card}),card:clone(card)})) : []})) };
}
function finalizeOutput(core, input) { return {...clone(core),handoff:buildAutomaticHandoffs(core,input)}; }
function validateOutput(payload,inputPayload) {
  const input = validateInput(inputPayload), errors = check(outputSchema,payload);
  if (!errors.length) errors.push(...coreErrors(payload,input));
  if (!errors.length && !same(payload.handoff,buildAutomaticHandoffs(payload,input))) errors.push('Handoff must automatically preserve both concepts for both specialists and exact execution context');
  return {ok:!errors.length,hardErrors:[...new Set(errors)],dispatchAllowed:!errors.length && payload.status === 'ready',limitations:'Structural/provenance checks only. Originality, implicit claims, creative quality and actual semantic compliance have not been established.'};
}
function assembleContext(payload) {
  const input = validateInput(payload), knowledge = loadKnowledge(), strategyHash = strategyFingerprint(input);
  const instruction = fs.readFileSync(path.join(__dirname,agent.instructions),'utf8');
  const referenceRoles = {
    allowedCreativeReferenceIds: input.referenceCreativeIds,
    executionAssets: input.strategyInput.research.assets.map(a => ({assetId:a.id,kind:a.kind,creativeReferenceAllowed:input.referenceCreativeIds.includes(a.id),imageAvailable:!!a.imageData})),
  };
  const messages = [{role:'system',content:`${instruction}${require('../concept-selection').routes(input).length===1?'\nSINGLE-OPTION ASSIGNMENT: produce only the selected '+require('../concept-selection').routes(input)[0]+' direction. This overrides generic paired-concept instructions. Do not plan, compare against, or generate an unselected option.':''}\nCURATED PRINCIPLES\n${JSON.stringify(knowledge)}\nREFERENCE ROLE BINDINGS\n${JSON.stringify(referenceRoles)}\nOnly allowedCreativeReferenceIds may appear in evidence.referenceCreativeIds. An empty list requires [] on both concepts. Product photos and logos belong in requiredAssets, remain available to downstream production, and must not be promoted to creative style references.\nMODEL CORE OUTPUT SCHEMA (handoff is built by the producer)\n${JSON.stringify(coreOutputSchema)}\nStable concept IDs: ${JSON.stringify(Object.fromEntries(require('../concept-selection').routes(input).map(route => [route,conceptIdFor(input,route)])))}\nStrategy fingerprint: ${strategyHash}\nThe deterministic producer finalizer builds handoff; do not invent specialist dispatch APIs.`},{role:'user',content:`UNTRUSTED SUPPLIED ASSIGNMENT/EVIDENCE\n${JSON.stringify({...executionContext(input),assignmentId:input.assignmentId})}`}];
  return {agent:clone(agent),messages,strategyHash,contextHash:fingerprint(messages),knowledgeVersion:knowledge.version,readiness:input.strategy.status === 'ready' ? 'context_ready':'upstream_research_required',runtimeStatus:'No inference, retry execution, downstream agent calls or image generation is integrated.'};
}
module.exports = {agent:clone(agent),inputSchema:clone(inputSchema),outputSchema:clone(outputSchema),coreOutputSchema:clone(coreOutputSchema),loadKnowledge,validateInput,validateOutput,assembleContext,strategyFingerprint,conceptIdFor,conceptFingerprint,buildAutomaticHandoffs,finalizeOutput};
