'use strict';
const {fingerprint:fp}=require('../art-director'),fs=require('./artifact-fs'),path=require('node:path');
function identity(record){return record.route+'-'+record.placementId;}
function fields(record){return record.exactCopy.fields.map(f=>({id:f.id,role:f.role,text:f.text,delivery:f.delivery,nativeFieldId:f.nativeFieldId,...(f.locked===true?{locked:true}:{}),sourceFactIds:f.proofFactIds||f.sourceFactIds||[]}));}
function validate(job,record){
 const brief=job.briefContract;if(!brief||fp(brief.content)!==brief.contentHash||brief.content.brandId!==job.intake.brandId)throw Error('Saved brief agreement changed');
 if(record.assignmentId!==(job.wordingSource?.assignmentId||job.id)||record.copyHash!==fp(record.exactCopy)||record.exactCopy.conceptId!==record.conceptId||record.exactCopy.placementId!==record.placementId)throw Error('Copy agreement identity changed');
 const expected=record.exactCopy.fields.map(f=>({id:f.id,text:f.text,delivery:f.delivery,nativeFieldId:f.nativeFieldId})),actual=record.artDirection.text.map(f=>({id:f.fieldId,text:f.exactText,delivery:f.delivery,nativeFieldId:f.nativeFieldId}));
 if(fp(expected)!==fp(actual)||new Set(expected.map(f=>f.id)).size!==expected.length)throw Error('Layout disagrees with chosen wording, order or delivery');
 const amendment=job.strategyClarification||job.intake.campaignClarification,briefText=brief.content.brief+(amendment?'\nCampaign clarification: '+amendment.text:'');
 const assignment=record.upstreamContext.strategyInput.assignment;if(job.refinement){if(!job.wordingSource||job.wordingSource.sourcePackageHash!==job.refinement.sourcePackageHash||fp(assignment)!==job.wordingSource.assignmentHash)throw Error('Refinement differs from its saved source brief');}else if(assignment.brief!==briefText||assignment.goal!==briefText)throw Error('Planning stages disagree with the saved brief');
 return {briefHash:brief.contentHash,amendmentHash:job.refinement?fp({refinement:job.refinement,source:job.wordingSource}):amendment?fp(amendment):null};
}
function build(job,record,{parent}={}){
 const binding=validate(job,record),chosen=fields(record);
 if(parent){const {hash,...body}=parent;if(fp(body)!==hash||parent.brandId!==job.intake.brandId||parent.jobId!==job.id||parent.conceptId!==record.conceptId||parent.placementId!==record.placementId)throw Error('Invalid parent wording agreement');for(const f of parent.fields.filter(f=>f.locked||f.role==='disclaimer'))if(!chosen.some(n=>n.text===f.text&&n.role===f.role&&n.delivery===f.delivery&&n.nativeFieldId===f.nativeFieldId))throw Error('Correction changed locked wording or a disclaimer');}
 const body={version:1,revision:parent?parent.revision+1:1,parentHash:parent?.hash||null,jobId:job.id,brandId:job.intake.brandId,conceptId:record.conceptId,placementId:record.placementId,route:record.route,...binding,copyHash:record.copyHash,fields:chosen};return {...body,hash:fp(body)};
}
function verify(job,record,agreement){const {hash,...body}=agreement;if(fp(body)!==hash)throw Error('Wording agreement hash changed');const rebuilt=build(job,record);for(const k of ['jobId','brandId','conceptId','placementId','route','briefHash','amendmentHash','copyHash','fields'])if(fp(rebuilt[k])!==fp(agreement[k]))throw Error('Wording agreement changed: '+k);return true;}
async function read(runtime,id,ref){return JSON.parse(await fs.readFile(path.join(runtime.store.dir(id),ref.file),'utf8'));}
async function ensure(runtime,id,record,attempt){
 if((await runtime.store.read(id)).wordingAgreementVersion!==1)return;
 await runtime.store.update(id,async job=>{
  if(job.wordingAgreementVersion!==1)return job;
  const key=identity(record);job.wordingAgreements??={};const versions=job.wordingAgreements[key]??={};const prior=versions[attempt];
  if(prior){const agreement=await read(runtime,id,prior);if(agreement.hash!==prior.hash)throw Error('Wording index changed');verify(job,record,agreement);return job;}
  let parent=null;if(attempt===1){const ref=versions.preflight||versions[0];if(!ref)throw Error('Correction has no initial wording agreement');parent=await read(runtime,id,ref);}
  const agreement=build(job,record,{parent}),file='wording-'+agreement.hash+'.json';await runtime.store.save(id,file,agreement);versions[attempt]={file,hash:agreement.hash};return job;
 });
}
async function assertCurrent(runtime,id,record,attempt){const job=await runtime.store.read(id);if(job.wordingAgreementVersion!==1)return;const ref=job.wordingAgreements?.[identity(record)]?.[attempt];if(!ref)throw Error('Agreed wording is missing before dispatch or review');const agreement=await read(runtime,id,ref);if(agreement.hash!==ref.hash)throw Error('Wording index changed');verify(job,record,agreement);}
function verifyCanvas(record,doc){
 // Measured line wrapping changes whitespace, never the agreed wording.
 const wording=text=>text.replace(/\s+/gu,' ').trim();
 const expected=record.exactCopy.fields.filter(f=>f.delivery==='embedded').map(f=>({id:f.id,text:wording(f.text)})).sort((a,b)=>a.id.localeCompare(b.id));
 const actual=doc.objects.filter(o=>['text','cta'].includes(o.type)).map(o=>({id:o.fieldId,text:wording(o.text),hidden:o.visible===false}));
 if(actual.some(o=>o.hidden))throw Error('Editable canvas disagrees with the chosen wording');try{require('./saved-copy-layout').assertCopy({...doc,objects:doc.objects.filter(o=>['text','cta'].includes(o.type))},record.exactCopy.fields);}catch(cause){throw Error('Editable canvas disagrees with the chosen wording',{cause});}if(actual.some(o=>!expected.some(e=>e.id===o.id)))throw Error('Editable canvas disagrees with the chosen wording');return true;
}
module.exports={build,verify,ensure,assertCurrent,verifyCanvas};
