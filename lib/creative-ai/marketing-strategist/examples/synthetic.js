'use strict';
// Fictional practice case. No real brand research, audience study or campaign outcomes.
const { demoResearch } = require('../../../brand-dossier/demo');
const { deriveGetWhoToBy } = require('../summary');
async function inputExample() {
  const research = await demoResearch();
  return { version: 1,
    assignment: { goal: 'Explain the fictional bottle for consideration', brief: 'Synthetic practice assignment: introduce the bottle without medical or environmental superiority claims.', productName: 'Fictional Everyday Bottle', objective: 'consideration', market: 'Market unspecified', language: 'English', formats: [{ id: 'social-static', label: 'Social static', channel: 'Social feed', specificationStatus: 'pending', constraints: [] }] },
    research,
    guardian: { requirements: [{ id: 'no-medical', text: 'Do not imply medical benefits.', sourceIds: ['brief-source'] }], preferences: [{ id: 'calm', text: 'Consider a calm, clear tone.', sourceIds: ['brief-source'] }], establishedPositioningFactIds: ['positioning'] },
    additionalSources: [
      { id: 'product-sheet', label: 'Fictional supplied product sheet', reference: 'Synthetic example / authored fixture, not official evidence', collectedAt: '2026-10-04T00:00:00Z', kind: 'product', status: 'available' },
      { id: 'brief-source', label: 'Fictional user brief and brand promise', reference: 'Synthetic example / authored fixture', collectedAt: '2026-10-04T00:00:00Z', kind: 'user', status: 'available' }
    ],
    facts: [
      { id: 'capacity', kind: 'product', text: 'The fictional bottle holds 500 ml.', status: 'supported', sourceIds: ['product-sheet'], essential: true },
      { id: 'positioning', kind: 'brand', text: 'Fictional established promise: uncomplicated everyday essentials.', status: 'supported', sourceIds: ['brief-source'], essential: true }
    ], conflicts: [] };
}
const statement = (text, basis = 'inference', sourceIds = [], factIds = []) => ({ text, basis, sourceIds, factIds });
function outputExample({ includeStrategyChecks = false } = {}) {
  const proposition = statement('An everyday bottle for carrying water during routine outings.', 'inference', ['product-sheet'], ['capacity']);
  const critique = { customerRelevance: 'Routine outings are a relevance hypothesis; no customer research was supplied.', productTruth: 'Capacity is the only supplied product claim. No hydration outcome is asserted.', brandFit: 'Everyday use is consistent with the fictional essentials promise and medical-benefit exclusion.', distinctiveness: 'Recognition depends on guardian assets; no linkage measurement exists.', clarity: 'One product and one usage idea.', channelDestinationFit: 'Feed context is supplied; exact dimensions and landing facts are pending.', strongestObjection: 'The proposed routine may not matter to the actual audience.' };
  const output = { version: 1, agentId: 'marketing-strategist', status: 'ready',
    brief: {
      objectiveType: 'consideration', positioningFactIds: ['positioning'],
      objective: statement('Support product consideration by explaining a relevant use.', 'evidence', ['brief-source']),
      audience: statement('People who carry water during routine outings.', 'assumption'),
      buyingSituation: statement('Preparing to leave home for an everyday outing.'),
      communicationProblem: statement('The product may need a concrete usage context to feel relevant; no diagnosis has been measured.'),
      primaryProposition: proposition,
      supportingClaims: [{ factId: 'capacity', text: 'The fictional bottle holds 500 ml.', sourceIds: ['product-sheet'] }],
      objections: [statement('Whether this capacity suits the outing remains an audience question.')],
      desiredAction: statement('Learn about the product; confirm the actual destination before stronger action wording.'),
      channelFormatImplications: [{ formatId: 'social-static', implication: statement('Prioritize one relevant proposition. Exact dimensions are pending; visual execution belongs downstream.') }]
    },
    alternatives: [
      { id: 'routine', direction: 'Use-context relevance', primaryProposition: proposition, proofFactIds: ['capacity'], principleIds: ['customer-value', 'feature-benefit'], hardGate: 'pass', violations: [], critique, tradeoffs: ['Concrete context improves specificity but depends on an unresearched situation.'] },
      { id: 'specification', direction: 'Product specification clarity', primaryProposition: statement('Help people assess whether a 500 ml bottle fits their routine.', 'inference', ['product-sheet'], ['capacity']), proofFactIds: ['capacity'], principleIds: ['feature-benefit'], hardGate: 'pass', violations: [], critique: { ...critique, customerRelevance: 'Lets buyers assess fit; does not establish which situations they value.', strongestObjection: 'Capacity alone may not distinguish the brand.' }, tradeoffs: ['Less interpretive but may feel less relevant.'] }
    ],
    selection: { directionId: 'routine', reason: 'Provisional use context adds a reason to consider the product while keeping the factual claim narrow.', materialTradeoffs: ['Audience relevance is untested; specification clarity carries less interpretive risk.'], alternativesNote: 'Two materially different priorities considered: usage relevance and specification assessment.' },
    requirementChecks: [{ requirementId: 'no-medical', status: 'met', summary: 'No health outcome or medical benefit proposed.' }],
    assumptions: [{ id: 'audience', text: 'Routine water carriers are the provisional audience.', reason: 'The synthetic assignment has no audience research or audience instruction.' }],
    uncertainties: ['Buying situation, local relevance and actual destination are unverified.'],
    evidenceThatWouldChangeRecommendation: ['Customer evidence that a different usage situation matters more.'],
    testHypothesis: { statement: 'The usage-context route may improve relevance without weakening product understanding.', comparison: 'Usage-context route versus specification route, with comparable brand and format execution.', measure: 'Planned relevance and product-understanding responses in a comprehension task.', falsification: 'No relevance advantage or lower accurate product understanding.', limitations: 'Untested; comprehension is not conversion. No media or campaign outcomes are supplied.', status: 'untested' },
    researchRequests: [{ question: 'What destination and buying situations are relevant?', essential: false, relatedIds: [] }],
    sourceIds: ['product-sheet', 'brief-source'],
    knowledgeApplications: [
      { principleId: 'customer-value', decision: 'Consider a concrete customer task as the relevance route.', limit: 'Customer task is an untested hypothesis.' },
      { principleId: 'feature-benefit', decision: 'Keep capacity as fact and usage relevance as inference.', limit: 'Capacity does not establish preference or a health outcome.' }
    ], decisionSummary: 'Synthetic practice summary: a provisional usage-context route was selected over a specification-first route. The capacity claim stays exact, the audience stays assumed, the brand promise stays intact and evaluation remains unrun.' };
  const getWhoToBy = deriveGetWhoToBy(output.brief);
  // Concise summary wording is an editorial choice; provenance is retained from the brief.
  getWhoToBy.get.text = 'people who carry water on routine outings';
  getWhoToBy.who.text = 'are preparing to leave home';
  getWhoToBy.to.text = 'consider whether the bottle fits their routine';
  getWhoToBy.by.text = "communicating the bottle's role as an uncomplicated everyday water-carrying option";
  getWhoToBy.statement = require('../summary').renderGetWhoToBy(getWhoToBy);
  if(includeStrategyChecks)output.strategyChecks={
    productFocus:statement('The fictional 500 ml Everyday Bottle is the offering for this assignment.','evidence',['product-sheet'],['capacity']),
    customerBarrier:statement('No measured purchase barrier is established; whether 500 ml fits an outing is a provisional question.','assumption'),
    customerRelevance:statement('Carrying water on an outing is a plausible reason to consider the bottle.','inference',['product-sheet'],['capacity']),
    messageRole:'customer-proposition',proofFactIds:['capacity'],proofLimits:['500 ml establishes capacity only; it does not prove hydration outcomes, preference or a measured customer need.'],
    destination:{status:'unknown',expectedAction:structuredClone(output.brief.desiredAction),fit:'assumed',rationale:'No destination page or supported page action was supplied.',factIds:[]},
    weakestAssumption:'The routine outing matters to the actual audience.',evidenceNeeded:['Applicable customer research on outing needs and purchase barriers.','Verified destination URL and available next action.']
  };
  return { version: output.version, agentId: output.agentId, status: output.status, getWhoToBy, ...output };
}
module.exports = { inputExample, outputExample };
