'use strict';
const {fail,hash}=require('./accounts');
const categories=['generation','artwork','editing','download','navigation','other'];
const statuses=['open','investigating','waiting-for-user','resolved'];
class Issues{
 constructor(requests,tracking){this.requests=requests;this.tracking=tracking;this.rows=requests.db.collection('reported_issues');}
 async init(){await this.rows.createIndex({status:1,createdAt:-1});await this.rows.createIndex({actorId:1,createdAt:-1});await this.rows.createIndex({brandId:1,jobId:1});}
 async context(actor,input){
  const j=await this.requests.read(actor,input.jobId),brand=this.requests.brands.find(b=>b.id===j.intake.brandId);
  const context={jobId:j.id,brandId:brand.id,brandName:brand.name,product:j.intake.productName||j.productSummary?.name||'Brand-only',project:j.intake.campaignName||j.intake.productName||'Saved project',status:j.status,stage:j.stage||null,updatedAt:j.updatedAt,route:null,placementId:null,image:null};
  if(input.route||input.placementId){
   const slot=j.results?.find(r=>r.route===input.route&&r.placementId===input.placementId);
   if(!slot)throw fail('This image slot is not part of the project.',404);
   const versionId=j.activeVersions?.[input.route+'|'+input.placementId]||'original';
   if(input.versionId!==undefined&&input.versionId!==versionId)throw fail('This image changed since you opened it. Reload the creative before attaching a report.',409);
   context.route=input.route;context.placementId=input.placementId;
   let a;try{a=await this.tracking.resolve(actor,j.id,input.route,input.placementId);}catch(e){
    // A missing file must remain reportable, but identity/access errors must never
    // be disguised as a usable image attachment.
    if(!['The local saved image is unavailable.','The latest edit needs a saved preview in Studio before it can be reviewed.','No saved image for this slot.'].includes(e.message))throw e;
    context.imageUnavailable={versionId,reportedRevision:Number.isInteger(Number(input.revision))?Number(input.revision):null,note:'Image file unavailable; project and slot attached without a verified image.'};
   }
   if(a){if(input.versionId!==undefined&&Number(input.revision)!==a.revision)throw fail('This image changed since you opened it. Reload the creative before attaching a report.',409);context.image=this.tracking.publicAsset(a);}
  }
  return context;
 }
 async create(actor,input){
  if(typeof input.eventId!=='string'||! /^[a-zA-Z0-9_-]{1,100}$/.test(input.eventId))throw fail('Reload the report form.');
  if(!categories.includes(input.category)||typeof input.description!=='string'||input.description.trim().length<5||input.description.length>2000)throw fail('Choose an issue type and describe what happened in 5–2,000 characters.');
  const clean={jobId:input.jobId,route:input.route||null,placementId:input.placementId||null,key:input.key||null,category:input.category,description:input.description.trim(),screen:['brief','progress','project','review','editor','download'].includes(input.screen)?input.screen:'project'};
  const id=hash(actor.id+'|'+input.eventId),payloadHash=hash(JSON.stringify(clean));await this.requests.read(actor,clean.jobId);
  const previous=await this.rows.findOne({_id:id});if(previous){if(previous.payloadHash!==payloadHash)throw fail('This report changed. Open a new report.',409);return {id:previous._id,status:previous.status,createdAt:previous.createdAt};}
  const context=await this.context(actor,clean);if(context.image?.key!== (clean.key||undefined))throw fail('The image changed. Your note is still here. Reopen the report from the image you want to report.',409);
  const j=await this.requests.read(actor,clean.jobId),row={_id:id,payloadHash,actorId:actor.id,actorName:actor.name,brandId:context.brandId,jobId:j.id,category:clean.category,description:clean.description,screen:clean.screen,context,technical:{error:String(j.error?.message||j.error||'').replace(/(Bearer\s+|sk-)[\w.-]+/gi,'[redacted]').replace(/((?:api[_-]?key|password|token|secret)\s*[:=]\s*)[^\s,;]+/gi,'$1[redacted]').slice(0,2000)},status:'open',revision:0,createdAt:new Date(),updatedAt:new Date(),history:[]};
  try{await this.rows.insertOne(row);}catch(e){if(e.code!==11000)throw e;const existing=await this.rows.findOne({_id:id});if(existing.payloadHash!==payloadHash)throw fail('This report changed. Open a new report.',409);}
  return {id,status:'open',createdAt:row.createdAt};
 }
 async list(actor,params){if(actor.role!=='admin')throw fail('Administrator access required.',403);const q={};if(params.get('id')){if(!/^[a-f0-9]{64}$/.test(params.get('id')))throw fail('Report not found.',404);q._id=params.get('id');}if(params.get('status')){if(!statuses.includes(params.get('status')))throw fail('Choose an issue status.');q.status=params.get('status');}if(params.get('brand'))q.brandId=params.get('brand');const page=Math.max(0,Math.min(100000,Number(params.get('page'))||0));return {items:await this.rows.find(q,{projection:{payloadHash:0}}).sort({createdAt:-1,_id:1}).skip(page*30).limit(30).toArray(),total:await this.rows.countDocuments(q),page,brands:this.requests.brands,statuses,categories};}
 async update(actor,id,input){if(actor.role!=='admin')throw fail('Administrator access required.',403);if(!statuses.includes(input.status)||!Number.isInteger(input.revision)||typeof input.note!=='string'||input.note.length>2000)throw fail('Choose a status and use a note under 2,000 characters.');if(input.status==='resolved'&&!input.note.trim())throw fail('Describe the resolution before closing this report.');const at=new Date();const row=await this.rows.findOneAndUpdate({_id:id,revision:input.revision},{$set:{status:input.status,updatedAt:at},$inc:{revision:1},$push:{history:{status:input.status,note:input.note.trim(),actorId:actor.id,actorName:actor.name,at}}},{returnDocument:'after'});if(!row)throw fail('This report changed. Refresh before saving your update.',409);return {id,status:row.status,revision:row.revision};}
}
module.exports={Issues,categories,statuses};
