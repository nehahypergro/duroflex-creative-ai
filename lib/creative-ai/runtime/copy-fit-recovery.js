'use strict';
// One upstream planning repair, before any image call. Never retry transport,
// erase exact requested wording, reset budgets or overwrite the initial copy.
function fitTopic(message){return /copy|text/i.test(message||'')&&/fit|legib|readab|text region|layout/i.test(message||'');}
function fitConflict(error){return fitTopic(error.message)&&/internal revision|revision.required|cannot|blocked/i.test(error.message||'');}
function protect(before,after){if(!Array.isArray(after?.decks)||after.decks.length!==before.decks.length)throw Error('Copy recovery changed unit bindings');const seen=new Set();for(const d of before.decks){const key=d.conceptId+'|'+d.placementId,next=after.decks.find(x=>x.conceptId===d.conceptId&&x.placementId===d.placementId);if(!next||seen.has(key))throw Error('Copy recovery changed unit bindings');seen.add(key);const count=unit=>unit.fields.filter(f=>f.delivery==='embedded').reduce((n,f)=>n+f.text.trim().split(/\s+/u).filter(Boolean).length,0);if(count(next)>count(d))throw Error('Copy-fit revision made embedded copy longer. Shorten generated wording while preserving exact locked words and every claim qualifier, or retain the original and report the unresolved fit.');for(const f of d.fields.filter(f=>f.locked===true||f.role==='disclaimer'))if(!next.fields.some(g=>g.text===f.text&&g.role===f.role&&g.delivery===f.delivery&&g.nativeFieldId===f.nativeFieldId))throw Error('Copy recovery must preserve exact locked wording and disclaimers');}}
// The structured status already establishes that planning is blocked. Do not
// require the explanatory prose to repeat "cannot" or "blocked" as well.
function checked(output){const blocked=(output.specifications||[]).filter(s=>s.status==='blocked'&&(s.dependencies||[]).some(d=>d.target==='copywriter'&&fitTopic(d.reason)));if(blocked.length)throw Error('Exact copy cannot fit; internal revision required. '+blocked.flatMap(s=>s.dependencies.map(d=>d.reason)).join('; '));return output;}
async function run({copy,reconcile,revise,save}){try{return checked(await reconcile(copy));}catch(error){if(!fitConflict(error))throw error;const revised=await revise({copy:structuredClone(copy),reason:error.message});protect(copy,revised);await save(revised,{reason:error.message});return checked(await reconcile(revised));}}
function selectRevision(before,after){
 if(!Array.isArray(after?.decks)||after.decks.length!==before.decks.length)throw Error('Copy recovery changed unit bindings');
 const output=structuredClone(after),decisions=[],seen=new Set(),count=d=>d.fields.filter(f=>f.delivery==='embedded').reduce((n,f)=>n+f.text.trim().split(/\s+/u).filter(Boolean).length,0);
 for(let i=0;i<output.decks.length;i++){const d=output.decks[i],key=d.conceptId+'|'+d.placementId,prior=before.decks.find(x=>x.conceptId===d.conceptId&&x.placementId===d.placementId);if(!prior||seen.has(key))throw Error('Copy recovery changed unit bindings');seen.add(key);if(count(d)>count(prior)){output.decks[i]=structuredClone(prior);decisions.push({conceptId:d.conceptId,placementId:d.placementId,reason:'expanding-revision-retained-original',originalWords:count(prior),rejectedWords:count(d)});}}
 protect(before,output);return {output,decisions};
}
module.exports={run,protect,fitConflict,selectRevision};
