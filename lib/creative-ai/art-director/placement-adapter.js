'use strict';
// Consumer only. The placement-knowledge package and its catalog are independently owned.
const placement = require('../placement-knowledge');
function resolve(selection, input, catalog) {
  if (selection.selectionStatus === 'pending') {
    if (Object.keys(selection.pin).length) throw Error('Pending placement cannot carry a pin');
    return {version:1,readiness:'placement-selection-required',placements:[],missingInputs:[{key:'placement-profile'}],conflicts:[],limits:['No publisher dimensions, safe areas or output rules have been supplied.']};
  }
  return placement.assembleContext({pins:[selection.pin],role:'art-director',assignment:input.directorInput.strategyInput.assignment,brandRules:input.visualRules,truthfulClaims:input.directorInput.strategyInput.facts,jobInputs:selection.jobInputs},catalog);
}
module.exports = {resolve};
