'use strict';
async function demoResearch() {
  const sharp = require('sharp');
  const png = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="500"><rect width="900" height="500" fill="#234b3b"/><circle cx="680" cy="260" r="180" fill="#edbb66"/><rect x="600" y="130" width="150" height="270" rx="30" fill="#fff7df"/><text x="50" y="110" fill="#fff7df" font-size="38" font-family="sans-serif">SAMPLE ARTWORK</text><text x="50" y="170" fill="#fff7df" font-size="22" font-family="sans-serif">Layout reference only</text><text x="50" y="420" fill="#fff7df" font-size="18" font-family="sans-serif">Fictional brand / No collected screenshot</text></svg>`)).png().toBuffer();
  const date = '2026-10-04T00:00:00Z';
  return { version: 1, event: 'research.completed', researchId: 'demo-template-v1', brandName: 'Sample Brand', demo: true, completedAt: date,
    sources: [
      { id: 'sample', kind: 'asset', status: 'available', label: 'Locally authored demonstration artwork', reference: 'demo.js / fictional layout illustration', collectedAt: date, note: 'Not an official brand asset.' },
      ...['site', 'product', 'guidelines', 'social', 'meta'].map(kind => ({ id: kind, kind, status: 'unavailable', label: `${kind} evidence`, reference: 'Not supplied / not collected', collectedAt: date, note: kind === 'meta' ? 'Advertiser identity and collection access unverified. No ads collected.' : 'No live research or supplied document in this demonstration.' }))
    ],
    assets: [{ id: 'art', kind: 'reference', label: 'Fictional layout study / sample artwork', sourceIds: ['sample'], imageData: `data:image/png;base64,${png.toString('base64')}` }],
    findings: [
      { section: 'overview', basis: 'sample', title: 'A concise brand introduction belongs here', text: 'Summarize what the brand sells and whom it serves using supplied evidence. This is guidance for the template, not a brand finding.', sourceIds: [] },
      { section: 'identity', basis: 'sample', title: 'Show the visual character', text: 'Use representative logos, product imagery, colors, and typography references. This fictional artwork demonstrates image placement only.', sourceIds: ['sample'], assetIds: ['art'] },
      { section: 'opportunities', basis: 'sample', direction: 'continuity', title: 'Carry forward proven brand cues', text: 'Once evidence is supplied, describe which recognizable visual and verbal cues to retain.', sourceIds: [] },
      { section: 'opportunities', basis: 'sample', direction: 'exploration', title: 'Make room for a new direction', text: 'Separate creative hypotheses from observed patterns. Any proposed experiment should be marked as inference.', sourceIds: [] }
    ] };
}
module.exports = { demoResearch };
