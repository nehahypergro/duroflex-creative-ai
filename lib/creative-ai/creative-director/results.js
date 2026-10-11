'use strict';
const director = require('./index');
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/** Pure result-side mapping. No concepts/explanations are exposed before a matching finished static passes review. */
function associateReviewedResults(output,payload,results) {
  const input = director.validateInput(payload), validation = director.validateOutput(output,input);
  if (!validation.ok) throw new Error(validation.hardErrors.join('; '));
  if (!Array.isArray(results)) throw new Error('Results must be an array');
  if (!validation.dispatchAllowed) return [];
  const cards = new Map(output.concepts.map(c=>[c.conceptId,c]));
  const seen = new Set();
  const presented=[];
  for (const result of results) {
    if (result?.status !== 'finished' || result?.review?.status !== 'passed') continue;
    const card=cards.get(result.conceptId);
    if (typeof result.id !== 'string' || !result.id || seen.has(result.id)) throw new Error('Invalid/duplicate static result ID'); seen.add(result.id);
    if (!card || result.assignmentId !== input.assignmentId || result.strategyHash !== director.strategyFingerprint(input) || result.conceptHash !== director.conceptFingerprint(input,card)) throw new Error('Static result-to-concept association mismatch');
    if (!input.strategyInput.assignment.formats.some(f=>f.id===result.formatId)) throw new Error('Unknown static result format');
    if (result.artifact?.kind !== 'static' || !['generated','synthetic-placeholder'].includes(result.artifact.origin)) throw new Error('Only identified static artifacts can be presented');
    if (result.artifact.origin === 'synthetic-placeholder') {
      if (!input.strategyInput.research.demo || result.review.evidenceStatus !== 'synthetic-simulation') throw new Error('Synthetic result must use demo data and simulated review labels');
    } else {
      if (input.strategyInput.research.demo || result.review.evidenceStatus !== 'runtime') throw new Error('Generated result cannot use synthetic evidence or simulated review');
      // Local app asset references only. This module never collects/downloads images.
      if (typeof result.artifact.url !== 'string' || !/^\/(?!\/)[A-Za-z0-9/_%.\-]+$/.test(result.artifact.url) || !/\.(png|jpe?g|webp)$/i.test(result.artifact.url)) throw new Error('Generated static needs a local image artifact URL');
    }
    presented.push({resultId:result.id,conceptId:card.conceptId,route:card.route,formatId:result.formatId,artifact:structuredClone(result.artifact),explanation:structuredClone(card.publicExplanation),assumptionIds:structuredClone(card.evidence.assumptionIds),sourceIds:structuredClone(card.evidence.sourceIds),synthetic:result.artifact.origin==='synthetic-placeholder'});
  }
  return presented;
}
function renderReviewedResultsHtml(output,input,results) {
  const associated = associateReviewedResults(output,input,results);
  const sources = new Map([...input.strategyInput.research.sources,...input.strategyInput.additionalSources].map(s=>[s.id,s]));
  const demo=input.strategyInput.research.demo;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Creative AI / Static results${demo?' demonstration':''}</title><style>*{box-sizing:border-box}body{margin:0;background:#edf1ed;color:#203a30;font:16px/1.5 system-ui}header{background:#233e34;color:white;padding:22px 5%}main{max-width:1200px;margin:32px auto;padding:0 24px}h1{font-size:34px;line-height:1.2}.notice{padding:20px;background:#fff0cf;border-left:4px solid #bc8b2d}.grid{align-items:start;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;margin:28px 0}.result{background:#fffdf7;border-radius:12px;padding:24px;overflow-wrap:anywhere}.placeholder{aspect-ratio:1;background:#e3eade;display:flex;align-items:center;justify-content:center;text-align:center;padding:32px;border:2px dashed #7a9582}.placeholder b{font-size:22px}.placeholder span{display:block;margin-top:12px}.result img{width:100%;height:auto}.route{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#597364}h2{font-size:23px;line-height:1.3}details{margin:18px 0}summary{cursor:pointer;font-weight:650}small{display:block;color:#5e7366;font-size:12px}.source{padding:12px 0;border-top:1px solid #d6e0d4}.label{font-size:12px;background:#ffecbb;display:inline-block;padding:5px 9px}@media(max-width:700px){.grid{grid-template-columns:1fr}h1{font-size:28px}}</style></head><body><header><b>Creative AI / Static results${demo?' / DEMONSTRATION':''}</b></header><main><h1>Ideas behind the finished statics</h1>${demo?'<aside class="notice"><b>Synthetic result-shape demonstration</b><p>These labeled placeholders illustrate where explanations attach to finished, reviewed static results. No images were generated. Review markers are simulated; no live inference or creative review occurred.</p></aside>':''}${associated.length?`<div class="grid">${associated.map(r=>`<article class="result" data-result-id="${esc(r.resultId)}" data-concept-id="${esc(r.conceptId)}">${r.synthetic?'<div class="placeholder"><div><b>SYNTHETIC PLACEHOLDER</b><span>No static image generated.<br>Finished-result shape only.</span></div></div>':`<img src="${esc(r.artifact.url)}" alt="Reviewed static result">`}<p class="route">${esc(r.route)} · ${esc(r.formatId)}</p><h2>${esc(r.explanation.idea)}</h2><p><b>Intended takeaway:</b> ${esc(r.explanation.takeaway)}</p><p>${esc(r.explanation.rationale)}</p><span class="label">Creative idea / interpretation untested${r.assumptionIds.length?' / strategy assumptions retained':''}</span><details><summary>Evidence and assumptions</summary>${r.assumptionIds.map(id=>{const a=input.strategy.assumptions.find(a=>a.id===id);return `<p><b>Assumption:</b> ${esc(a.text)} <small>${esc(a.reason)}</small></p>`;}).join('')}${r.sourceIds.map(id=>{const s=sources.get(id);return `<div class="source"><b>${esc(s.label)}</b><p>${esc(s.reference)}</p><small>Collected ${esc(s.collectedAt)} · ${esc(s.status)}</small></div>`;}).join('')}</details></article>`).join('')}</div>`:'<p>No matching finished static results with passed review are available. Concept explanations remain internal.</p>'}<small>Association markers come from the producer. This renderer does not generate images or independently review them.</small></main></body></html>`;
}
function handleResultsDemo(req,res,pathname) {
  if(pathname!=='/creative-results/demo'||!['GET','HEAD'].includes(req.method))return false;
  const fs=require('fs'),path=require('path');
  const read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,'examples',name+'.json'),'utf8'));
  const html=renderReviewedResultsHtml(read('output'),read('input'),read('results'));
  res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'"});res.end(req.method==='HEAD'?undefined:html);return true;
}
module.exports={associateReviewedResults,renderReviewedResultsHtml,handleResultsDemo};
