'use strict';
const normalize=s=>s.normalize('NFKC').replace(/\s+/g,' ').trim();
const requiredFields=record=>record.exactCopy.fields.filter(f=>f.delivery==='embedded'&&(f.locked||f.requirement==='mandatory'));
const copyObservationSchema={type:'array',items:{type:'object',additionalProperties:false,required:['fieldId','observedText','decoration','confidence','observation'],properties:{fieldId:{type:'string'},observedText:{type:'string'},decoration:{enum:['none','separate-icon','inline-text','ambiguous']},confidence:{type:'number',minimum:0,maximum:1},observation:{type:'string'}}}};
const instructions='Exact copy policy: inspect every required embedded field. Return copyObservations containing fieldId, observedText, decoration, confidence and a visual observation. observedText must transcribe the actual words and punctuation, preserving case; never copy expected wording without seeing it. A visibly separate arrow/chevron used as a button icon is decoration, not changed copy: exclude that icon from observedText and use separate-icon, describing its spatial separation. An arrow or punctuation inside the text run is inline-text and must remain in observedText. If separation or glyphs are unclear, use ambiguous with low confidence. Missing/extra words, changed spelling, case or punctuation fail. This policy is identical for both concept routes. A decorative icon cannot establish required-text legibility or cure missing words.';
function applyCopyChecks(record,evidence,observations,ocr){
 const fields=requiredFields(record),check=evidence.critical.find(c=>c.criterion==='exact-required-copy');
 if(!Array.isArray(observations)||observations.length!==fields.length||new Set(observations.map(o=>o.fieldId)).size!==fields.length||observations.some(o=>!fields.some(f=>f.id===o.fieldId)))throw Error('Copy observations must cover each required embedded field exactly once');
 if(observations.some(o=>typeof o.observedText!=='string'||typeof o.observation!=='string'||!['none','separate-icon','inline-text','ambiguous'].includes(o.decoration)||!Number.isFinite(o.confidence)||o.confidence<0||o.confidence>1))throw Error('Copy observations require valid visual transcription, decoration and confidence');
 if(!check&&fields.length)throw Error('Exact-copy evidence missing');
 let mismatch=false,uncertain=false;
 for(const field of fields){const o=observations.find(o=>o.fieldId===field.id);if(o.confidence<0.7||o.decoration==='ambiguous'){uncertain=true;continue;}if(normalize(o.observedText)!==normalize(field.text))mismatch=true;}
 // Validate contradictions instead of silently turning a failed model check into a pass.
 if(mismatch){check.status='fail';check.evidence.observation+=' Required field transcription differs from locked copy.';}
 else if(uncertain&&check?.status==='pass'){check.status='unknown';check.confidence=Math.min(check.confidence,0.65);check.evidence.observation+=' Required text or icon separation remains uncertain.';}
 else if(fields.length&&check.status==='fail')throw Error('Exact-copy failure contradicts matching visual field transcriptions. A separate decorative icon does not change wording; reassess evidence without changing the transcriptions.');
 if(!mismatch&&!uncertain&&evidence.findings.some(f=>f.criterion==='exact-required-copy'&&f.severity!=='advisory'))throw Error('Exact-copy finding contradicts matching visual transcriptions; separate decorative icons are not copy defects.');
 // OCR is supporting evidence only. Full field boundaries avoid accepting e.g. Nowhere for Now.
 const joinedPasses=(ocr?.passes||[ocr]).filter(p=>p?.status==='measured').map(p=>normalize((p.rows||[]).map(r=>r.text).join(' ')));
 const hasField=text=>joinedPasses.some(joined=>{const t=normalize(text);let offset=0;while((offset=joined.indexOf(t,offset))!==-1){const before=joined[offset-1]||'',after=joined[offset+t.length]||'';if(!/[\p{L}\p{N}]/u.test(before)&&!/[\p{L}\p{N}]/u.test(after))return true;offset++;}return false;});
 if(ocr?.status==='measured'&&fields.some(f=>!hasField(f.text))&&check?.status==='pass'){check.status='unknown';check.confidence=Math.min(check.confidence,0.65);check.evidence.observation+=' Independent OCR did not match full required wording; focused verification required.';}
 return observations;
}
module.exports={normalize,requiredFields,copyObservationSchema,instructions,applyCopyChecks};
