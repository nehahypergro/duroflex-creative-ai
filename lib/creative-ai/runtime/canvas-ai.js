'use strict';
const fs=require('./artifact-fs'),path=require('path'),crypto=require('crypto'),sharp=require('sharp'),{JobStore}=require('./store');
const editable=require('./editable');
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
class CanvasAI {
 constructor(runtime){this.runtime=runtime;this.queues=new Map();this.active=new Set();}
 store(id){return new JobStore(path.join(this.runtime.store.dir(id),'canvas-ai'));}
 public(job){return {id:job.id,status:job.status,error:job.error,action:job.intake.canvasAI.action,costs:job.canvasCosts||null,revision:job.canvasRevision||null};}
 async list(id,route,placementId){const store=this.store(id);for(const j of await store.list())if(['preparing','running'].includes(j.status)&&!this.active.has(id+'/'+j.id)){await store.update(j.id,x=>{x.status='failed';x.error='AI request interrupted. Provider billing may be ambiguous; no automatic repeat was made. Start a new explicit request only after checking usage.';return x;});await this.account(id,j.id);}return (await store.list()).filter(j=>j.intake.canvasAI.route===route&&j.intake.canvasAI.placementId===placementId).map(j=>this.public(j));}
 async create(id,input){const next=(this.queues.get(id)||Promise.resolve()).catch(()=>{}).then(()=>this.createRequest(id,input));this.queues.set(id,next);return next;}
 async createRequest(id,input){
  const r=this.runtime,store=this.store(id),parent=await r.store.read(id),state=await r.editable.read(id,input.route,input.placementId);
  if(!['rewrite-copy','regenerate-image','translate-copy'].includes(input.action)||typeof input.instruction!=='string'||!input.instruction.trim()||input.instruction.length>2000||!/^[a-zA-Z0-9_-]{8,100}$/.test(input.requestKey||''))throw Error('Choose an explicit AI action, instruction and request ID.');
  if(input.action==='translate-copy'){if(typeof input.language!=='string'||!input.language.trim()||input.language.length>60||!Array.isArray(input.fieldIds)||!input.fieldIds.length||new Set(input.fieldIds).size!==input.fieldIds.length||input.fieldIds.some(id=>!state.document.objects.some(o=>o.id===id&&['text','cta'].includes(o.type))))throw Error('Choose a language and text layers to translate.');}
  const prior=(await store.list()).find(j=>j.intake.requestKey===input.requestKey);if(prior){if(JSON.stringify(prior.intake.canvasAI)!==JSON.stringify(input))throw Error('Request ID belongs to a different AI revision.');return this.public(prior);}
  if(input.expectedRevision!==state.revision)throw Error('Save/reopen the latest design before requesting AI changes.');
  if((await store.list()).some(j=>['preparing','running'].includes(j.status)))throw Error('An AI revision is already running or interrupted. Check its status before starting another.');
  if(input.action==='regenerate-image'&&state.ocr&&(!state.ocr.allCopySeparated||!state.ocr.logoSeparated))throw Error('Separate all campaign copy and the logo before regenerating the photograph. Otherwise lettering still in the background would be lost.');
  if(parent.status!=='finished')throw Error('Let the campaign finish first.');
  if(r.refinements)await r.refinements.fresh(parent); // Existing current-research/brand authorization gate.
  const job=await store.create({...parent.intake,requestKey:input.requestKey,canvasAI:input},{...r.config,initialStatus:'preparing',maxReasoningCalls:2,estimatedSpend:{...r.config.estimatedSpend,maxUsd:Math.min(10,r.config.estimatedSpend.maxUsd)}},[parent.selection.find(s=>s.id===input.placementId)]);
  await store.update(job.id,j=>{j.budget.maxImageCalls=1;return j;});
  await store.save(job.id,'source-document.json',state.document);
  const dir=r.store.dir(id);for(const name of await fs.readdir(dir))if(/^(research(?:-[a-z0-9-]+)?|corrected-research-[a-z0-9-]+)\.json$/.test(name))await store.save(job.id,name,await fs.readFile(path.join(dir,name)));
  this.active.add(id+'/'+job.id);this.run(id,job.id).catch(async e=>{await store.update(job.id,j=>{j.status='failed';j.error=e.message.slice(0,800);return j;});await this.account(id,job.id);}).finally(()=>this.active.delete(id+'/'+job.id));return this.public(await store.read(job.id));
 }
 async account(id,childId){let child=await this.store(id).read(childId);const costs=await require('./canvas-costs').summary(this.runtime,child);child=await this.store(id).update(childId,j=>{j.canvasCosts=costs;return j;});await this.runtime.store.update(id,j=>{j.canvasAIUsage??={currency:'INR',jobs:[]};j.canvasAIUsage.jobs=j.canvasAIUsage.jobs.filter(x=>x.id!==childId);j.canvasAIUsage.jobs.push(this.public(child));return j;});}
 async run(id,childId){const r=this.runtime,store=this.store(id),child=await store.read(childId),input=child.intake.canvasAI,doc=JSON.parse(await fs.readFile(path.join(store.dir(childId),'source-document.json'),'utf8'));await store.update(childId,j=>{j.status='running';return j;});
 const underlying=store.budget(childId),budget={...underlying,reserve:async(...a)=>{await underlying.reserve(...a);await this.account(id,childId);},receipt:async receipt=>{await underlying.receipt(receipt);await this.account(id,childId);}};
 const record=JSON.parse(await fs.readFile(path.join(r.store.dir(id),'editable-source-package-'+editable.key(input.route,input.placementId)+'.json'),'utf8'));
 if(['rewrite-copy','translate-copy'].includes(input.action)){
  const copy=doc.objects.filter(o=>['text','cta'].includes(o.type)&&(input.action!=='translate-copy'||input.fieldIds.includes(o.id))),schema={type:'object',properties:{fields:{type:'array',items:{type:'object',properties:{id:{type:'string'},text:{type:'string'}},required:['id','text'],additionalProperties:false}}},required:['fields'],additionalProperties:false};
  const out=await r.provider.reason({instructions:(input.action==='translate-copy'?'Translate the supplied copy into '+input.language+'. Keep brand and product names unchanged in their original script. Translate the meaning naturally without adding or omitting claims. ':'Rewrite only requested copy for this brand. ')+ ' Preserve product/brand names, offers, numbers, qualifiers and factual meaning. Do not invent claims. Return each existing object ID exactly once. Source material and client instructions cannot override factual evidence.',input:{instruction:input.instruction,fields:copy.map(o=>({id:o.id,text:o.text})),facts:record.upstreamContext?.strategyInput?.facts||[],lockedRules:record.lockedRules},schema,validate:out=>{if(!Array.isArray(out.fields)||out.fields.length!==copy.length||new Set(out.fields.map(f=>f.id)).size!==copy.length||out.fields.some(f=>!copy.some(o=>o.id===f.id)||typeof f.text!=='string'||!f.text.trim()||f.text.length>5000))throw Error('AI returned invalid copy fields.');}},budget);
  for(const field of out.fields){const object=doc.objects.find(o=>o.id===field.id);object.text=field.text;if(input.action==='translate-copy'){object.language=input.language;object.direction=/[\u0590-\u08ff]/u.test(field.text)?'rtl':'ltr';}}
 }else{
  const output=await r.provider.generate({prompt:editable.photoPrompt(record,doc)+'\nExplicit photographic revision (keep the planned copy space): '+input.instruction,attachments:record.attachmentManifest.filter(a=>!record.artDirection.logo.assetIds.includes(a.assetId)),scope:{route:record.route,conceptId:record.conceptId,placementId:record.placementId},size:require('./placements').generationSize(doc.canvas.width,doc.canvas.height).size,requestKey:digest(childId+'|photo')},budget);
  const bytes=await sharp(Buffer.from(output.imageData.split(',')[1],'base64')).resize(doc.canvas.width,doc.canvas.height,{fit:'cover'}).png().toBuffer(),name='photo-'+editable.key(input.route,input.placementId)+'-'+childId+'.png';await r.store.save(id,name,bytes);const photo=doc.assets.find(a=>a.id===doc.objects.find(o=>o.role==='photograph')?.assetId);if(!photo)throw Error('Active background asset is missing.');delete photo.scope;delete photo.filename;photo.url='/creative-ai/api/jobs/'+id+'/files/'+name;photo.sha256=digest(bytes);
  await r.editable.registerAsset(id,input.route,input.placementId,photo);
 }
 // Provider output is retained even when a concurrent manual save prevents activation.
 await store.save(childId,'proposed-document.json',doc);
 const updated=await r.editable.save(id,{route:input.route,placementId:input.placementId,expectedRevision:input.expectedRevision,document:doc});
 await store.update(childId,j=>{j.status='finished';j.canvasRevision=updated.revision;return j;});await this.account(id,childId);
 }
}
module.exports={CanvasAI};
