'use strict';
// Local authored knowledge only. Brief text cannot nominate a source or pack.
const fs = require('node:fs');
const path = require('node:path');
const fields = ['purpose', 'copy', 'visual', 'action', 'sequence', 'inputs', 'checks', 'avoid'];
function validate(data) {
  if (data.schemaVersion !== 1 || !data.version || !Array.isArray(data.packs) || !Array.isArray(data.sources)) throw Error('Invalid format playbook library');
  const sources = new Set();
  for (const s of data.sources) {
    if (!s.id || sources.has(s.id) || !s.url || !s.accessStatus || !s.basis) throw Error('Invalid playbook source');
    sources.add(s.id);
  }
  const references = ids => Array.isArray(ids) && ids.length && ids.every(id => sources.has(id));
  const ids = new Set(['format-common']), selectors = new Set(), rules = new Set();
  for (const r of data.commonRules) {
    if (!r.id || rules.has(r.id) || !r.statement || !['contract', 'recommendation'].includes(r.tier) || !references(r.sourceIds)) throw Error('Invalid common treatment rule');
    rules.add(r.id);
  }
  for (const p of data.packs) {
    if (!p.id || ids.has(p.id) || !p.version || !p.title || !p.authority || !references(p.sourceIds) || fields.some(f => typeof p.treatment?.[f] !== 'string' || !p.treatment[f].trim())) throw Error('Invalid format treatment');
    ids.add(p.id);
    for (const key of ['profileIds', 'formatIds', 'profilePatterns']) {
      if (!Array.isArray(p.selectors?.[key])) throw Error('Invalid treatment selectors');
      for (const value of p.selectors[key]) {
        if (typeof value !== 'string' || !value || selectors.has(key + ':' + value)) throw Error('Duplicate or invalid treatment selector');
        selectors.add(key + ':' + value);
        if (key === 'profilePatterns') {
          if (!value.startsWith('^custom:') || !value.endsWith('$')) throw Error('Treatment patterns must be anchored custom profile identities');
          new RegExp(value);
        }
      }
    }
    for(const [key,value] of Object.entries(p.formatTreatments||{})){
      if(![...p.selectors.profileIds,...p.selectors.formatIds].includes(key))throw Error('Invalid specific format treatment selector');
      if(!value.id||!value.treatment||Object.keys(value.treatment).some(k=>!fields.includes(k))||Object.values(value.treatment).some(v=>typeof v!=='string'||!v.trim()))throw Error('Invalid specific format treatment');
    }
    if (p.variants && Object.values(p.variants).some(v => typeof v !== 'string')) throw Error('Invalid treatment variant');
  }
  return data;
}
function load() {
  return validate(JSON.parse(fs.readFileSync(path.join(__dirname, 'format-playbooks.json'), 'utf8')));
}
function sourceRecords(data, rules) {
  const ids = new Set(rules.flatMap(r => r.sourceIds));
  return data.sources.filter(s => ids.has(s.id));
}
function common(data) {
  return {id: 'format-common', version: data.version, authority: data.sourcePolicy,
    rules: structuredClone(data.commonRules), sources: structuredClone(sourceRecords(data, data.commonRules))};
}
function materialize(data, p, selection) {
  const selected=p.formatTreatments?.[selection.description.formatId]||p.formatTreatments?.[selection.pin.profileId];
  const treatment={...p.treatment,...selected?.treatment};
  const rules = fields.map(field => ({id: p.id + '-' + field, tier: 'recommendation', sourceIds: p.sourceIds,
    statement: field.toUpperCase() + ': ' + treatment[field]}));
  if (p.variants && Object.keys(p.variants).length) rules.push({id: p.id + '-variants', tier: 'recommendation', sourceIds: p.sourceIds,
    statement: 'Apply only the selected variant: ' + Object.entries(p.variants).map(([k, v]) => k + ': ' + v).join(' | ')});
  return structuredClone({id: p.id, version: p.version, libraryVersion: data.version, title: p.title,
    authority: p.authority, ...(selected?{selectedFormat:selected.id}:{}), rules, sources: sourceRecords(data, rules)});
}
function select(data, selection) {
  const profileId = selection.pin.profileId, formatId = selection.description.formatId;
  const matches = data.packs.filter(p => p.selectors.profileIds.includes(profileId) ||
    p.selectors.formatIds.includes(formatId) || p.selectors.formatIds.includes(profileId) ||
    p.selectors.profilePatterns.some(pattern => new RegExp(pattern).test(profileId)));
  if (matches.length > 1) throw Error('Ambiguous format treatment for ' + profileId);
  return matches.map(p => materialize(data, p, selection));
}
module.exports = {load, validate, common, select};
