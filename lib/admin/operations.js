'use strict';
// Read-side operations only: no runtime, provider, job mutation or queue controls.
const fs=require('node:fs/promises'),path=require('node:path');
const {fail}=require('./accounts');
const {buildJourney}=require('./request-journey');
const ATTENTION=['failed','partial','needs-input','cancelled','canceled','stopped','interrupted','paused'];
const ACTIVE=['running','preparing','queued'];
const FILTERS=['brand','stage','user','asset','origin','from','to','product','outcome','reason','run','groupBy'];
function admin(actor){if(actor?.role!=='admin')throw fail('Administrator access required.',403);}
function cleanView(input){
 if(typeof input?.name!=='string'||!input.name.trim()||input.name.trim().length>60)throw fail('Use a view name of 1–60 characters.');
 if(!['overview','requests','analytics','health'].includes(input.tab))throw fail('Choose a supported dashboard.');
 const filters={};for(const [k,v]of Object.entries(input.filters||{})){if(!FILTERS.includes(k)||typeof v!=='string'||v.length>200)throw fail('Unsupported view filter.');if(v)filters[k]=v;}
 if(filters.stage&&!['draft','creating','ready','attention','planning','generation / review','delivery','review','not recorded'].includes(filters.stage))throw fail('Choose a valid stage.');
 if(filters.origin&&!['team','system','test','authenticated','legacy-system'].includes(filters.origin))throw fail('Choose a valid activity source.');
 for(const k of ['from','to'])if(filters[k]&&(!/^\d{4}-\d{2}-\d{2}$/.test(filters[k])||!Number.isFinite(Date.parse(filters[k]))))throw fail('Choose valid dates.');
 if(!['all','7','30','custom'].includes(input.period||'all'))throw fail('Choose a valid date period.');
 return {name:input.name.trim(),tab:input.tab,filters,period:input.period||'all'};
}
class Operations{
 constructor({requests,tracking,issues}){Object.assign(this,{requests,tracking,issues});this.db=requests.db;this.views=this.db.collection('dashboard_views');this.cache=new Map();}
 async init(){await this.views.createIndex({owner:1,id:1},{unique:true});}
 async savedViews(actor){admin(actor);return this.views.find({owner:actor.id},{projection:{_id:0,owner:0}}).sort({createdAt:1}).limit(30).toArray();}
 async saveView(actor,input){admin(actor);const value=cleanView(input);if(await this.views.countDocuments({owner:actor.id})>=20)throw fail('Keep up to 20 saved views. Remove an old view first.');const row={...value,id:require('node:crypto').randomUUID(),owner:actor.id,createdAt:new Date().toISOString()};await this.views.insertOne(row);return {id:row.id,...value};}
 async deleteView(actor,id){admin(actor);if(!/^[a-f0-9-]{36}$/.test(id))throw fail('View not found.',404);await this.views.deleteOne({owner:actor.id,id});return {ok:true};}
 async overview(actor,params){admin(actor);await this.requests.refresh();const query=this.requests.query(actor,params);delete query.status;delete query.displayStage;const now=Date.now(),cutoff=new Date(now-30*60000).toISOString(),base={$and:[query,{synthetic:{$ne:true}}]},stale={$and:[base,{status:{$in:ACTIVE},updatedAt:{$lt:cutoff}}]},failed={$and:[base,{status:{$in:ATTENTION}}]};
 const issueQuery={status:{$ne:'resolved'}};if(params.get('brand'))issueQuery.brandId=params.get('brand');
 const [stalled,stalledCount,failures,failureCount,reports,reportCount,candidates,reviewCandidateCount]=await Promise.all([
  this.requests.collection.find(stale).sort({updatedAt:1}).limit(20).toArray(),this.requests.collection.countDocuments(stale),
  this.requests.collection.find(failed).sort({updatedAt:-1}).limit(20).toArray(),this.requests.collection.countDocuments(failed),
  this.issues.rows.find(issueQuery,{projection:{description:1,jobId:1,createdAt:1,status:1,context:1}}).sort({createdAt:1}).limit(20).toArray(),this.issues.rows.countDocuments(issueQuery),
  this.requests.collection.find({$and:[base,{images:{$gt:0},status:{$nin:ACTIVE}}]}).sort({updatedAt:-1}).limit(20).toArray(),
  this.requests.collection.countDocuments({$and:[base,{images:{$gt:0},status:{$nin:ACTIVE}}]})]);
 const decisions=[];let reviewUnavailable=0;
 for(const r of candidates){const key=r._id+':'+r.updatedAt;let saved=this.cache.get(key);if(!saved||now-saved.at>15000){try{const a=await this.tracking.assets(actor,r._id);saved={at:now,assets:a.assets};this.cache.set(key,saved);}catch{saved={at:now,assets:[],unavailable:true};}}
  const available=saved.assets.filter(a=>!a.unavailable),pending=available.filter(a=>!a.decision),changes=available.filter(a=>a.decision?.decision==='changes-requested');reviewUnavailable+=saved.unavailable?1:saved.assets.some(a=>a.unavailable)?1:0;
  if(pending.length||changes.length)decisions.push({...this.row(r),pending:pending.length,changes:changes.length});
 }
 if(this.cache.size>200)this.cache.clear();
 return {brands:this.requests.brands,assets:await this.requests.collection.distinct('assetTypes'),at:new Date(now).toISOString(),staleMinutes:30,stalled:stalled.map(r=>({...this.row(r),minutes:Math.floor((now-Date.parse(r.updatedAt))/60000)})),stalledCount,failures:failures.map(r=>({...this.row(r),reason:r.failure?.reason||'Open the request for details.'})),failureCount,reports:reports.map(r=>({id:r._id,jobId:r.jobId,title:r.context?.project||'Client report',brand:r.context?.brandName,status:r.status,at:r.createdAt,description:String(r.description||'').slice(0,300)})),reportCount,decisions,reviewChecked:candidates.length,reviewCandidateCount,reviewUnavailable,warning:this.requests.warning,issueScope:'Reported issues follow the brand filter; request filters do not hide client reports.'};
 }
 row(r){return {id:r._id,title:r.title,brand:r.brand,brandId:r.brandId,user:r.userName,at:r.updatedAt,status:r.status};}
 async health(actor){admin(actor);const checkedAt=new Date().toISOString(),checks=[];
 try{const start=Date.now();await this.db.command({ping:1},{maxTimeMS:1500});checks.push({name:'Admin database',state:'ok',detail:'Responded in '+(Date.now()-start)+' ms.',at:checkedAt});}catch{checks.push({name:'Admin database',state:'attention',detail:'Could not confirm a database connection.',at:checkedAt});}
 try{await fs.access(path.join(this.requests.root,'output/creative-ai/jobs'));checks.push({name:'Saved request storage',state:'ok',detail:'The request folder is readable. This is not a write or backup test.',at:checkedAt});}catch{checks.push({name:'Saved request storage',state:'attention',detail:'The request folder could not be read.',at:checkedAt});}
 try{await this.requests.refresh();const active=await this.requests.collection.countDocuments({status:{$in:ACTIVE}}),stale=await this.requests.collection.countDocuments({status:{$in:ACTIVE},updatedAt:{$lt:new Date(Date.now()-1800000).toISOString()}});checks.push({name:'Creation activity',state:stale?'attention':active?'observed':'idle',detail:`${active} requests recorded as creating; ${stale} have no recorded update for 30 minutes. Worker connectivity is not directly probed.`,at:new Date(this.requests.refreshed).toISOString()});if(this.requests.warning)checks.push({name:'Request history',state:'attention',detail:this.requests.warning,at:checkedAt});}catch{checks.push({name:'Creation activity',state:'unknown',detail:'The request index could not be refreshed.',at:checkedAt});}
 try{const docs=this.db.collection('brief_documents'),pending=await docs.countDocuments({status:'extracting'}),needsText=await docs.countDocuments({status:{$in:['needs-text','partial']}}),last=await docs.findOne({},{sort:{uploadedAt:-1},projection:{uploadedAt:1}});checks.push({name:'Brief document import',state:needsText?'attention':pending?'observed':last?'observed':'unknown',detail:`${pending} imports recorded as extracting; ${needsText} need text or a reading check. Saved records only; no test document was submitted.`,at:last?.uploadedAt||null});}catch{checks.push({name:'Brief document import',state:'unknown',detail:'Import records are unavailable.',at:null});}
 try{const last=await this.tracking.events.findOne({},{sort:{receivedAt:-1},projection:{receivedAt:1}});checks.push({name:'Journey tracking',state:this.tracking.health.writeFailures?'attention':last?'observed':'unknown',detail:`${this.tracking.health.writeFailures} server tracking writes failed since this process started. Browser outboxes may contain unsent events.`,at:last?.receivedAt||null});}catch{checks.push({name:'Journey tracking',state:'unknown',detail:'Tracking records could not be read.',at:null});}
 checks.push({name:'Image and planning providers',state:'unknown',detail:'No live provider or credit-balance check is performed here. Inspect recorded request failures; no paid calls are made.',at:null});
 try{const s=JSON.parse(await fs.readFile(path.join(this.requests.root,'output/cost-tracking/latest-snapshot.json'),'utf8'));const unknown=Number.isFinite(s.summary?.unknown)?s.summary.unknown:null;checks.push({name:'Cost tracking',state:!Number.isFinite(Date.parse(s.generatedAt))?'unknown':Date.now()-Date.parse(s.generatedAt)>7200000?'attention':'observed',detail:`Saved snapshot; ${unknown==null?'Unknown charge count unavailable':unknown+' unresolved charge records'}. Costs are not a provider balance.`,at:s.generatedAt});}catch{checks.push({name:'Cost tracking',state:'unknown',detail:'No readable cost snapshot. Unknown usage is not zero.',at:null});}
 return {checkedAt,checks};
 }
 async journey(actor,id){const j=await this.requests.read(actor,id),draftId=j.submittedBrief?.id||j.intake?.sourceStudioDraftId,owner=j.submittedBy?.id,brandId=j.intake.brandId;
 const query={brandId,$or:[{jobId:id},...(draftId&&owner?[{draftId,actorId:owner}]:[])]};
 const events=await this.tracking.events.find(query,{projection:{payloadHash:0,inputHash:0,note:0}}).sort({receivedAt:1}).limit(501).toArray();
 const documents=draftId&&owner?await this.db.collection('brief_documents').find({owner,brandId,draftId},{projection:{uploadedAt:1,extractedAt:1,status:1,format:1}}).limit(50).toArray():[];
 let journal=[],warning=null;try{journal=(await this.requests.ledger.project(id)).events||[];}catch{warning='The processing journal could not be verified; recorded user actions are still shown.';}
 const edits=[];for(const r of (j.results||[]).slice(0,100)){if(!/^(continuity|exploration)$/.test(r.route)||! /^[a-zA-Z0-9_-]+$/.test(r.placementId))continue;try{const e=JSON.parse(await fs.readFile(path.join(this.requests.root,'output/creative-ai/jobs',id,`editable-${r.route}-${r.placementId}.json`),'utf8'));if(e.jobId===id&&e.document?.brandId===brandId)for(const h of e.history||[])if(h.revision>0&&h.origin!=='bounded-automatic-layer-correction')edits.push({at:h.createdAt,revision:h.revision,placementId:r.placementId,route:r.route});}catch{/* Absent or unreadable edits are not inferred from job updates. */}}
 return {...buildJourney(j,{events:events.slice(0,500),documents,journal,edits}),warning,truncated:events.length>500,at:new Date().toISOString()};
 }
}
module.exports={Operations,cleanView,ACTIVE,ATTENTION};
