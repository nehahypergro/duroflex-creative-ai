'use strict';
const FIELD_MAP = {
  get: ['audience'],
  who: ['buyingSituation', 'communicationProblem'],
  to: ['desiredAction', 'objective'],
  by: ['primaryProposition']
};
function renderGetWhoToBy(summary) {
  const phrase = component => component.text.trim().replace(/[.!?]+$/, '');
  return `Get ${phrase(summary.get)}, who ${phrase(summary.who)}, to ${phrase(summary.to)}, by ${phrase(summary.by)}.`;
}
/** Convenience derivation only; performs no inference or qualitative assessment. */
function deriveGetWhoToBy(brief, { whoFrom = 'buyingSituation', toFrom = 'desiredAction' } = {}) {
  if (!FIELD_MAP.who.includes(whoFrom) || !FIELD_MAP.to.includes(toFrom)) throw new Error('Invalid Get/Who/To/By brief field');
  const fields = { get: 'audience', who: whoFrom, to: toFrom, by: 'primaryProposition' };
  const summary = Object.fromEntries(Object.entries(fields).map(([key, field]) => {
    if (!brief[field]) throw new Error(`Missing brief field ${field}`);
    return [key, { ...structuredClone(brief[field]), briefField: field }];
  }));
  return { statement: renderGetWhoToBy(summary), ...summary };
}
module.exports = { FIELD_MAP, deriveGetWhoToBy, renderGetWhoToBy };
