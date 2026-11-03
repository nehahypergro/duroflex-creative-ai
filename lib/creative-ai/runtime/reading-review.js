'use strict';
const {requiredFields}=require('./copy-checks');
function fieldsFor(record,viewing){return viewing?.policy?.adaptiveContent===true?record.exactCopy.fields.filter(f=>f.delivery==='embedded'&&f.text.trim()):requiredFields(record);}
function enabled(record,viewing){return require('./readability').supportsVersion(viewing?.version)&&viewing.status!=='physical-proof-required'&&fieldsFor(record,viewing).length>0;}
function schema(record,viewing){const ids=fieldsFor(record,viewing).map(f=>f.id);return {type:'array',minItems:ids.length,maxItems:ids.length,items:{type:'object',additionalProperties:false,required:['fieldId','previewWidth','status','confidence','observation'],properties:{fieldId:{type:'string',enum:ids},previewWidth:{const:viewing.previewWidth},status:{enum:['readable','unreadable','uncertain']},confidence:{type:'number',minimum:0,maximum:1},observation:{type:'string',minLength:1}}}};}
const instructions='Return readabilityObservations for each supplied embedded field, including optional labels and supporting text actually chosen for this design at the supplied second-image previewWidth. Report actual reading difficulty, not recognition after zooming. Name the observed location and describe glyph size, clipping, line spacing or local background interference. Use unreadable when essential wording cannot be read at this displayed size, uncertain when the input cannot establish it, and readable only from actual visual inspection. OCR and matching expected copy do not prove readable type. Do not claim a measured font size from a raster. This does not certify actual-device accessibility.';
function apply(record,evidence,observations,viewing){
 if(!enabled(record,viewing))return [];
 const ids=fieldsFor(record,viewing).map(f=>f.id);
 if(!Array.isArray(observations)||observations.length!==ids.length||new Set(observations.map(o=>o.fieldId)).size!==ids.length||observations.some(o=>!ids.includes(o.fieldId)||o.previewWidth!==viewing.previewWidth||!['readable','unreadable','uncertain'].includes(o.status)||!Number.isFinite(o.confidence)||o.confidence<0||o.confidence>1||typeof o.observation!=='string'||!o.observation.trim()))throw Error('Reading observations must cover every required field at the pinned preview width.');
 const check=evidence.critical.find(c=>c.criterion==='required-text-legibility');if(!check)throw Error('Required text legibility criterion missing.');
 const failed=observations.filter(o=>o.status==='unreadable'&&o.confidence>=0.7),unknown=observations.filter(o=>o.status==='uncertain'||o.confidence<0.7);
 if(failed.length){check.status='fail';check.confidence=Math.max(check.confidence,...failed.map(o=>o.confidence));check.evidence.observation+=' Display-size reading failure: '+failed.map(o=>o.fieldId+': '+o.observation).join('; ');}
 else if(unknown.length&&check.status==='pass'){check.status='unknown';check.confidence=Math.min(check.confidence,0.65);check.evidence.observation+=' Display-size readability remains uncertain: '+unknown.map(o=>o.fieldId).join(', ');}
 // Never turn another observed failure into a pass just because this preview was readable.
 return observations;
}
module.exports={fieldsFor,enabled,schema,instructions,apply};
