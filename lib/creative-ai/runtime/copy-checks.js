'use strict';
const normalize=s=>s.normalize('NFC').replace(/\s+/g,' ').trim();
// Comparison only: never apply this to source copy, generation or saved transcriptions.
// Separator dots require spaces on both sides; decimal/multiplication dots stay exact.
const dimensionTypography=s=>s.replace(/\b\d+(?:\.\d+)?(?:\s*[xX×]\s*\d+(?:\.\d+)?){1,2}\s*(?:mm|cm|inches|inch|in)\b/g,m=>m.replace(/\s*[xX×]\s*/g,' × '));
const comparisonText=s=>dimensionTypography(normalize(s)).replace(/(?<=\s)[·•](?=\s)/gu,'·').replace(/[‘’]/gu,"'").replace(/[“”]/gu,'"');
// Display equivalences never rewrite saved copy or observed glyphs. Numeric signs,
// ranges, units and amounts stay exact; only a spaced prose dash is a separator.
function displayText(value){
 return comparisonText(value)
  .replace(/(?<!\.)\.\.\.(?!\.)/gu,'…')
  .replace(/(?<=\p{L})\s+[-–—]\s+(?=\p{L})/gu,' — ')
  .replace(/(?:₹\s*|\bRs\.\s*)(?=\d)/gu,'₹')
  .replace(/^(\d+(?:\.\d+)?)(?:\s*[xX×]\s*\d+(?:\.\d+)?){1,2}$/u,m=>m.replace(/\s*[xX×]\s*/gu,' × '));
}
function literalField(record,field){
 if(field.role==='disclaimer')return true;
 const sources=[...(record.lockedRules||[]).map(r=>r.text||r.value||''),record.upstreamContext?.strategyInput?.assignment?.brief||''];
 return sources.some(source=>source.split(/[\n;]+/u).some(part=>{const clause=normalize(part);return /\b(?:verbatim|literal|exact|exactly|punctuation)\b/iu.test(clause)&&(clause.includes(normalize(field.text))||/\b(?:all|every|entire)\s+(?:required\s+|saved\s+|supplied\s+)?(?:copy|text|wording)\b/iu.test(clause));}));
}
function equivalent(record,field,observed){const compare=literalField(record,field)?normalize:displayText;return compare(field.text)===compare(observed);}
const tolerance='Comparison only: whitespace/NFC; typographic quotes and spaced dot separators; ellipsis versus three dots; spaced prose dashes; Rs. versus ₹ before the same amount; x/× between unchanged dimension numbers. No missing units, changed amounts, numeric signs/ranges, words, case or qualifiers. Disclaimers and explicitly literal supplied wording retain punctuation. Saved copy and observations remain unchanged.';
const requiredFields=record=>record.exactCopy.fields.filter(f=>f.delivery==='embedded'&&(f.locked||f.requirement==='mandatory'));
function matchesFullField(ocr,text){
 const passes=ocr?.passes||[ocr],t=comparisonText(text);
 return passes.filter(p=>p?.status==='measured').some(p=>{const joined=comparisonText((p.rows||[]).map(r=>r.text).join(' '));let offset=0;while((offset=joined.indexOf(t,offset))!==-1){const before=joined[offset-1]||'',after=joined[offset+t.length]||'';if(!/[\p{L}\p{N}]/u.test(before)&&!/[\p{L}\p{N}]/u.test(after))return true;offset++;}return false;});
}
const copyObservationSchema={type:'array',items:{type:'object',additionalProperties:false,required:['fieldId','observedText','decoration','confidence','observation'],properties:{fieldId:{type:'string'},observedText:{type:'string',minLength:0},decoration:{enum:['none','separate-icon','inline-text','ambiguous']},confidence:{type:'number',minimum:0,maximum:1},observation:{type:'string'}}}};
const instructions='COPY AUTHORITY v2: Exact-copy verdicts and findings are computed by code from copyObservations against the authoritative saved copy. Do not independently return an exact-required-copy verdict or finding. Inspect each required embedded field in the actual exported image. Return fieldId, observedText, decoration, confidence and a visual observation. Transcribe actual visible words and punctuation, preserving case; never fill unclear glyphs from expected copy. A visibly separate arrow/chevron button icon is decoration: exclude it and use separate-icon. Inline punctuation remains in observedText. Use ambiguous and low confidence for unclear glyphs. '+tolerance+' Harmless permitted display differences must not lower confidence or trigger another criterion, review or correction. No OCR transcript is required or authoritative. Inspect missing, duplicate, clipped or unreadable text visually; uncertainty is a verification problem, not a confirmed typo.';

function applyCopyChecks(record,evidence,observations,ocr){
 const fields=requiredFields(record);
 if(!Array.isArray(observations)||observations.length!==fields.length||new Set(observations.map(o=>o.fieldId)).size!==fields.length||observations.some(o=>!fields.some(f=>f.id===o.fieldId)))throw Error('Copy observations must cover each required embedded field exactly once');
 if(observations.some(o=>typeof o.observedText!=='string'||typeof o.observation!=='string'||!['none','separate-icon','inline-text','ambiguous'].includes(o.decoration)||!Number.isFinite(o.confidence)||o.confidence<0||o.confidence>1))throw Error('Copy observations require valid visual transcription, decoration and confidence');
 const defects=[],uncertain=[];
 for(const field of fields){const o=observations.find(o=>o.fieldId===field.id);if(o.confidence<0.7||o.decoration==='ambiguous')uncertain.push(field.id);else if(!equivalent(record,field,o.observedText))defects.push(field);}
 const status=!fields.length?'not-applicable':defects.length?'fail':uncertain.length?'unknown':'pass';
 const observation=observations.map(o=>o.fieldId+': '+JSON.stringify(o.observedText)+' ('+o.decoration+', '+o.confidence+'). '+o.observation).join(' ');
 const check={criterion:'exact-required-copy',status,confidence:status==='unknown'?Math.min(.65,...observations.map(o=>o.confidence)):defects.length?Math.max(...defects.map(f=>observations.find(o=>o.fieldId===f.id).confidence)):Math.min(1,...observations.map(o=>o.confidence)),applicabilityReason:fields.length?'Required embedded wording is locked.':'No required embedded wording.',tolerance,evidence:{method:fields.length?'vision-attestation':'unavailable',observation:observation||'No required embedded fields.',expected:fields.map(f=>f.id+': '+f.text).join(' ')||'No required embedded wording; physical product markings remain governed by product-identity checks.',location:fields.map(f=>f.id).join(', ')||'none',sourceIds:['review-policy',...fields.map(f=>f.id)],ruleIds:[]}};
 // The observations are authoritative inputs; code owns the verdict and defects.
 // Never change a transcription to fit the expected wording or resolve an unclear glyph.
 evidence.critical=evidence.critical.filter(c=>c.criterion!=='exact-required-copy');evidence.critical.push(check);
 evidence.findings=evidence.findings.filter(f=>f.criterion!=='exact-required-copy');
 for(const [i,field] of defects.entries()){const o=observations.find(o=>o.fieldId===field.id);evidence.findings.push({id:'runtime-exact-copy-'+i,criterion:'exact-required-copy',severity:'critical',authority:'policy',defect:'Observed '+JSON.stringify(o.observedText)+' differs from locked '+JSON.stringify(field.text),location:field.id,confidence:o.confidence,evidence:{...check.evidence,observation:o.observation,expected:field.text,location:field.id,sourceIds:['review-policy',field.id]},correction:'Render the exact locked wording: '+field.text,preserve:['All other locked copy and identity references'],cause:'generated-typo',comparison:[{stage:'artwork',observation:o.observedText||'No visible wording in this field.',referenceId:field.id},{stage:'copy',observation:field.text,referenceId:field.id}]});}
 return observations;
}
function reviewContract(schema,groups,record,ocr,criteria){
 const scoped=structuredClone(groups);scoped.critical.ids=scoped.critical.ids.filter(c=>c!=='exact-required-copy');
 const complete=require('./complete-review').contract(schema,scoped);
 const visit=s=>{if(!s||typeof s!=='object')return;if(s.properties?.criterion)s.properties.criterion.enum=criteria.filter(c=>c!=='exact-required-copy');for(const v of Object.values(s))if(v&&typeof v==='object')visit(v);};visit(complete.schema.properties.findings);
 return {kind:'observed-copy-review-v4',schema:complete.schema,decode(value){const out=complete.decode(value);applyCopyChecks(record,out,out.copyObservations,ocr);return out;}};
}
module.exports={displayText,literalField,equivalent,reviewContract,normalize,requiredFields,matchesFullField,copyObservationSchema,instructions,applyCopyChecks};
