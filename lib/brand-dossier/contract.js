'use strict';
const KINDS = ['site', 'product', 'guidelines', 'asset', 'social', 'meta'];
const SECTIONS = ['overview', 'products', 'identity', 'tone', 'creative', 'ads', 'opportunities', 'conflicts'];
// clone:false validates without copying the payload; the dossier store uses it to
// avoid duplicating every embedded picture (often 100+ MB) just to compact it.
function validateResearch(input, { clone = true } = {}) {
  const fail = message => { const error = new Error(message); error.statusCode = 400; throw error; };
  const string = (value, label, max = 2000) => { if (typeof value !== 'string' || !value.trim() || value.length > max) fail(`Invalid ${label}`); };
  if (!input || input.version !== 1 || input.event !== 'research.completed') fail('Expected version 1 research.completed event');
  string(input.researchId, 'researchId', 100);
  string(input.brandName, 'brandName', 120);
  if (typeof input.demo !== 'boolean') fail('demo must explicitly be true or false');
  const date = (value, label) => { string(value, label, 40); if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) fail(`Invalid ${label}`); };
  date(input.completedAt, 'completedAt');
  for (const key of ['sources', 'assets', 'findings']) if (!Array.isArray(input[key]) || input[key].length > 500) fail(`Invalid ${key} inventory`);
  const ids = new Set();
  for (const source of input.sources) {
    string(source.id, 'source.id', 100); if (ids.has(source.id)) fail('Duplicate source id'); ids.add(source.id);
    string(source.label, 'source.label', 180); string(source.reference, 'source.reference', 1000);
    if (!KINDS.includes(source.kind) || !['available', 'unavailable', 'partial'].includes(source.status)) fail('Invalid source kind/status');
    date(source.collectedAt, 'source.collectedAt');
    if (source.status !== 'available') string(source.note, 'access limitation');
    if (source.kind === 'meta' && source.status !== 'unavailable' && (source.advertiserVerified !== true || !source.advertiserId)) fail('Meta evidence requires verified advertiser identity');
  }
  const refs = (values, label) => { if (!Array.isArray(values) || values.some(id => !ids.has(id))) fail(`Invalid ${label} sourceIds`); };
  const assetIds = new Set();
  for (const asset of input.assets) {
    string(asset.id, 'asset.id', 100); if (assetIds.has(asset.id)) fail('Duplicate asset id'); assetIds.add(asset.id);
    string(asset.label, 'asset.label', 180); refs(asset.sourceIds, 'asset');
    if (!asset.sourceIds.length || asset.sourceIds.some(id => input.sources.find(s => s.id === id).status === 'unavailable')) fail('Assets need accessible sources');
    if (!['logo', 'product', 'screenshot', 'creative', 'ad', 'reference'].includes(asset.kind)) fail('Invalid asset kind');
    if (asset.imageData !== undefined && (!require('./embedded-image').valid(asset.imageData))) fail('Images must be embedded PNG/JPEG data URLs under 6MB');
    if (asset.kind === 'ad' && !asset.sourceIds.some(id => { const s = input.sources.find(s => s.id === id); return s.kind === 'meta' && s.advertiserVerified === true; })) fail('Ad reference requires verified Meta source');
  }
  for (const finding of input.findings) {
    if (!SECTIONS.includes(finding.section) || !['evidence', 'inference', 'sample'].includes(finding.basis)) fail('Invalid finding section/basis');
    string(finding.title, 'finding.title', 160); string(finding.text, 'finding.text', 900); refs(finding.sourceIds, 'finding');
    if (finding.basis === 'sample' && !input.demo) fail('Sample findings require demo mode');
    if (finding.basis === 'evidence' && (!finding.sourceIds.length || finding.sourceIds.some(id => input.sources.find(s => s.id === id).status === 'unavailable'))) fail('Evidence needs accessible sources');
    if (finding.section === 'ads' && finding.basis === 'evidence' && !finding.sourceIds.some(id => { const s = input.sources.find(s => s.id === id); return s.kind === 'meta' && s.advertiserVerified === true; })) fail('Ad observations require verified Meta source');
    if (finding.direction !== undefined && !['continuity', 'exploration'].includes(finding.direction)) fail('Invalid opportunity direction');
    if (finding.assetIds !== undefined && (!Array.isArray(finding.assetIds) || finding.assetIds.some(id => !assetIds.has(id)))) fail('Invalid finding assetIds');
  }
  return clone ? structuredClone(input) : input;
}
module.exports = { validateResearch, KINDS, SECTIONS };
