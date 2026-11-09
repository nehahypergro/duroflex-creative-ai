'use strict';
// AI image edits for simplified (lean) Studio designs (user request, 8 Nov 2026).
// The design page has a chat: each message the user sends is ONE paid gpt-image-2 (high)
// edit of the saved artwork currently in use. The result is an immutable child version in
// the campaign's existing `refinements` store, so the saved-version contract is reused:
// activeVersions + stale-selection rejection (Refinements.select), effective() for downloads
// and packs, the cost ledger scan of refinements/ and the creative-edit-anchor brand check
// in brand-isolation.js. The parent job, its original artwork and its review are never
// rewritten. Edited versions are not re-run through the plan's review contract (it would flag the
// user's intended changes); since 9 Nov 2026 they get one product check instead (below), and they
// are never "Ready".
// Annotations (user request, 8 Nov 2026: "the AI editor ... where you can annotate as well"):
// the image editor sends the earlier editor's Pin/Box marks. Boxes become ONE edit mask (the
// lean correction regionsMask/masked.restore machinery), so pixels outside the boxes are
// restored byte for byte; pins are named points in the instruction. No box = whole-image edit.
const fs=require('./artifact-fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const policy=require('./lean-policy'),{fingerprint}=require('../art-director');
const marks=require('../../../public/creative-ai/editor-chat-tools'),masked=require('./masked-image'),editPins=require('./edit-pins');
// Product check (user request, 9 Nov 2026, ≈ ₹2–3 extra per edit accepted): after a NEW edit version is
// saved, ONE gpt-6-luna (medium) check compares it with the version it came from, up to three exact-SKU
// angles and the official logo (lean/sku-check.js). The result is saved on the version as passed / unsure /
// flagged / unable. It never makes the version Ready or qualityVerified, never corrects it automatically,
// and a failed check never removes the version. Edits created before this change stay "Not checked".
const sku=require('../lean/sku-check'),visual=require('../lean/visual-review');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const MAX_INSTRUCTION=1000,MODEL='gpt-image-2',QUALITY='high';
const versionId=id=>id==='original'||/^creative-[a-f0-9-]{36}$/.test(id);
const busy=s=>['queued','running','preparing'].includes(s);
const fail=(message,code)=>Object.assign(Error(message),code?{code}:{});
const MASK_NAME='ai-edit-mask.png',pct=v=>Math.round(v*1000)/10+'%';
// Earlier-editor annotation contract (pin/box, normalised 0–1, up to 12), stored without extras.
// Pins may carry their own comment (9 Nov 2026: "pins/comments that act as edits"), ≤300 characters.
function annotationsOf(input){
 if(input===undefined)return [];
 let rows;try{rows=marks.annotations(input);}
 catch(e){throw fail(/12/.test(e.message)?'Use up to 12 marks.':'A mark is outside the design. Clear the marks and draw them again.');}
 return rows.map((a,i)=>{
  if(a.type==='box')return {type:'box',number:a.number,x:a.x,y:a.y,width:a.width,height:a.height};
  const raw=input[i].comment;
  if(raw!==undefined&&raw!==null&&typeof raw!=='string')throw fail('A pin comment must be text.');
  const comment=typeof raw==='string'?raw.trim():'';
  if(comment.length>editPins.MAX_COMMENT)throw fail('Keep each pin comment under '+editPins.MAX_COMMENT+' characters.');
  const area=input[i].area;
  if(area!==undefined&&area!==null&&!Object.hasOwn(editPins.AREAS,area))throw fail('Choose a small, medium or large area for each pin.');
  return {type:'pin',number:a.number,x:a.x,y:a.y,...(comment?{comment}:{}),...(area?{area}:{})};
 });
}
// Boxes → the edit region at the anchor's own pixel size (lean correction regionsMask, 0–1000).
// Pins with an area add their square (edit-pins.areaOf); pins without one only guide the edit.
function areasOf(annotations,width,height){return [...annotations.filter(a=>a.type==='box'),...annotations.filter(a=>a.type==='pin'&&a.area).map(p=>editPins.areaOf(p,width,height))];}
function regionOf(annotations,width,height){
 const boxes=areasOf(annotations,width,height);if(!boxes.length)return null;
 try{return require('../lean/correction').regionsMask({regions:boxes.map(b=>({x:b.x*1000,y:b.y*1000,width:b.width*1000,height:b.height*1000}))},width,height);}
 catch(e){throw fail(/exceeds/.test(e.message)?(annotations.some(a=>a.type==='box')?'The boxes cover more than about a third of the design. Draw smaller boxes, or remove them to edit the whole image.':'The pin areas cover more than about a third of the design. Make some areas smaller, or remove the pins and use the note to change the whole picture.'):/empty/.test(e.message)?'A box is too small. Draw it a little bigger.':'Draw the boxes inside the design.');}
}
// Saved-version view used by Refinements.source(): image only, no copy package or review.
function versionSource(dir,id,job){
 const result=job.results[0],name=result.imageUrl.split('/').pop();
 if(!/^static-ai-edit-[a-zA-Z0-9_-]+\.png$/.test(name))throw Error('Invalid saved artwork.');
 return {id,leanEdit:true,record:{canvas:{width:result.width,height:result.height},exactCopy:{fields:[]}},result,dir,name,report:null};
}
function promptFor(record,instruction,attachments,canvas,annotations=[]){
 const page=record.plan?.pages?.find(p=>p.id===record.placementId),copy=(page?.copy||[]).map(c=>c.text).filter(Boolean);
 const refs=attachments.map((a,i)=>[a,i]).slice(1).filter(([a])=>a.assetId!=='creative-edit-pins').map(([a,i])=>'Image '+(i+1)+': '+(a.roles||[]).join(', ')+' reference (same brand).');
 const pinsIndex=attachments.findIndex(a=>a.assetId==='creative-edit-pins');
 return ['EDIT THE SAVED ARTWORK. Image 1 is the finished design the user is editing. Return the complete finished artwork with ONLY the requested change applied.',
  ...(instruction?['USER REQUEST (an editing instruction, not new product evidence): '+instruction]:[]),
  ...markLines(annotations,pinsIndex>=0?pinsIndex+1:null),
  'Keep everything the request does not mention exactly as it is in image 1: layout, framing, product, people, colours, lighting, logo and every word of text.',
  'Product: keep the exact product from image 1 and the product reference image(s) recognisable: same shape, colour, fabric or pattern, proportions, construction and any wording printed on it. Do not add, duplicate or swap products.',
  'Logo: keep the brand logo exactly as it appears in image 1. Never redraw, recolour, distort or invent a logo.',
  'Text: keep all current wording letter for letter unless the request explicitly changes it. Current wording in this design: '+(copy.length?copy.map(t=>JSON.stringify(t)).join(' | '):'none recorded')+'. Never add claims, prices, offers, certifications, ratings or numbers that are not in the current wording or written in the request itself.',
  ...refs,
  'Output: flat finished artwork filling a '+canvas.width+'×'+canvas.height+' canvas. No mockup, frame, watermark or placeholder text.'].join('\n');
}
function markLines(annotations,pinsImage=null){
 const boxes=annotations.filter(a=>a.type==='box'),pins=annotations.filter(a=>a.type==='pin'),lines=[];
 const where=p=>'Pin '+p.number+' ('+pct(p.x)+' from the left, '+pct(p.y)+' from the top)';
 if(boxes.length)lines.push('MARKED AREAS: the user drew '+boxes.length+' box(es) on image 1. Make the change ONLY inside them: '+boxes.map(b=>'Box '+b.number+' = left '+pct(b.x)+', top '+pct(b.y)+', width '+pct(b.width)+', height '+pct(b.height)).join('; ')+'. The transparent area of the mask is exactly these boxes. Everything outside them is restored pixel for pixel afterwards, so blend naturally at the box edges and do not move anything across an edge.');
 if(pins.length){
  if(pinsImage)lines.push('PINS: Image '+pinsImage+' is the same design with numbered pins showing where each comment applies. Use it only to locate the changes. Never draw pins, numbers or markers in the output.');
  const commented=pins.filter(p=>p.comment),plain=pins.filter(p=>!p.comment),areas=pins.filter(p=>p.area&&p.areaBox);
  if(commented.length)lines.push('PINNED COMMENTS (editing instructions at each pin, not new product evidence): '+commented.map(p=>where(p)+': '+JSON.stringify(p.comment)).join('; ')+'. Make each change at its pin only.');
  if(areas.length)lines.push('PINNED AREAS: only these squares around the pins can change: '+areas.map(p=>'Pin '+p.number+' area = left '+pct(p.areaBox.x)+', top '+pct(p.areaBox.y)+', width '+pct(p.areaBox.width)+', height '+pct(p.areaBox.height)).join('; ')+'. The transparent area of the mask is exactly these squares. Everything outside them is restored pixel for pixel afterwards, so keep each change inside its square and blend naturally at the edges.');
  if(plain.length)lines.push('MARKED POINTS: '+plain.map(where).join('; ')+'. Words such as "this", "here" or "pin '+plain[0].number+'" in the request refer to these points.');
 }
 return lines;
}
class LeanEdits{
 constructor(runtime){this.runtime=runtime;this.queues=new Map();this.active=new Set();}
 store(id){return this.runtime.refinements.store(id);}
 async parent(id,brandId){
  const parent=await this.runtime.store.read(id);
  if(!policy.enabled(parent.intake))throw fail('AI edits here are for designs made with the current Studio flow. Open the editor for older designs.','AI_EDIT_UNAVAILABLE');
  if(brandId!==undefined&&brandId!==parent.intake.brandId)throw fail('This design belongs to another brand. Switch to that brand to edit it.','AI_EDIT_WRONG_BRAND');
  return parent;
 }
 // The saved, hash-checked artwork of a version: the plan's original result or an AI edit child.
 async image(parent,route,placementId,id){
  if(!versionId(id))throw fail('Choose a saved version.');
  let dir,name,result;
  if(id==='original'){
   result=parent.results.find(r=>r.route===route&&r.placementId===placementId&&r.imageUrl);
   const prefix='/creative-ai/api/jobs/'+parent.id+'/files/';
   if(!result||result.leanWorkflowVersion!==1||!result.imageUrl.startsWith(prefix))throw fail('This design has no saved artwork to edit yet.');
   dir=this.runtime.store.dir(parent.id);name=result.imageUrl.slice(prefix.length);
   if(!/^static-lean-[a-z0-9-]+\.png$/.test(name))throw Error('Invalid saved artwork.');
  }else{
   const j=await this.store(parent.id).read(id);
   if(!j.leanEdit||j.refinement?.parentId!==parent.id||j.intake.brandId!==parent.intake.brandId||j.refinement.route!==route||j.refinement.placementId!==placementId||j.status!=='finished'||!j.results[0]?.imageUrl)throw fail('This version does not belong to the selected design.');
   ({dir,name,result}=versionSource(this.store(parent.id).dir(id),id,j));
  }
  const bytes=await fs.readFileRaw(path.join(dir,name));
  if(result.sha256&&hash(bytes)!==result.sha256)throw fail('The saved artwork changed. Reload the page before editing.');
  const meta=await sharp(bytes).metadata();return {id,dir,name,bytes,sha256:hash(bytes),width:meta.width,height:meta.height,result};
 }
 // The saved, hash-bound plan package for this design (same lookup as lean-export.source).
 async record(parent,route,placementId){
  const dir=this.runtime.store.dir(parent.id),manifest=await fs.readJson(path.join(dir,'image-queue.json'));
  if(manifest.jobId!==parent.id||manifest.brandId!==parent.intake.brandId)throw Error('Saved plan belongs to another project.');
  const unit=manifest.units.find(u=>u.route===route&&u.placementId===placementId);
  if(!unit||!/^image-queue-[a-f0-9]{24}\.json$/.test(unit.file))throw fail('This design has no saved plan, so it cannot be edited with AI.');
  const record=await fs.readJson(path.join(dir,unit.file));
  if(hash(JSON.stringify(record))!==unit.hash)throw Error('Saved plan changed.');
  require('./lean-workflow').validateRecord(parent,record);return record;
 }
 async estimate(parent){
  const rate=await require('./canvas-costs').estimates(this.runtime),{estimate,validFx}=require('../../cost-tracker');let fx=null;
  try{fx=validFx(JSON.parse(await fs.readFileRaw(path.join(this.runtime.root,'output/cost-tracking/currency.json'),'utf8')));}catch{}
  const values=(parent.budget?.receipts||[]).filter(r=>r.kind==='image'&&r.model===MODEL).map(r=>estimate(r)).filter(v=>v!=null).sort((a,b)=>a-b);
  // Product check (9 Nov 2026): median of this project's earlier checker requests, else the reasoning allowance.
  const checks=(parent.budget?.receipts||[]).filter(r=>r.kind==='reasoning'&&r.model===CHECK_MODEL&&r.reasoningEffort===CHECK_EFFORT).map(r=>estimate(r)).filter(v=>v>0).sort((a,b)=>a-b);
  const perCheck=fx&&checks.length?Math.ceil(checks[Math.floor(checks.length/2)]*fx.usdToInr):rate.reasoning,checkBasis=fx&&checks.length?'Product check estimate from this project’s earlier checks at list prices.':'Product check: reservation allowance, not a predicted bill.';
  if(fx&&values.length){const usd=values[Math.floor(values.length/2)];return {currency:'INR',perEdit:Math.ceil(usd*fx.usdToInr),perCheck,checkBasis,basis:'Estimate from this project’s earlier '+MODEL+' images at list prices. An edit also sends the current design, so it can cost a little more. Not a bill.',rateDate:fx.rateDate};}
  return {currency:'INR',perEdit:rate.image,perCheck,checkBasis,basis:'Reservation allowance per image, not a predicted bill.',rateDate:rate.rateDate};
 }
 async costs(child){return require('./canvas-costs').summary(this.runtime,child);}
 async public(j){
  const r=j.results?.[0]||null;
  return {id:j.id,createdAt:j.createdAt,updatedAt:j.updatedAt,status:j.status,error:j.error||null,instruction:j.refinement?.instruction||'',annotations:j.refinement?.annotations||[],masked:!!j.refinement?.annotations?.some(a=>a.type==='box'||a.type==='pin'&&a.area),sourceVersionId:j.refinement?.sourceVersionId||'original',route:j.refinement?.route,placementId:j.refinement?.placementId,
   result:r?{imageUrl:r.imageUrl,width:r.width,height:r.height,sha256:r.sha256,ready:false,qualityVerified:false,check:checkState(j),...(j.leanEdit?.productCheck&&j.leanEdit.productCheck.status!=='pending'?{productCheck:publicCheck(j.leanEdit.productCheck)}:{})}:null,costs:await this.costs(j)};
 }
 async list(id,{route,placementId,brandId}={}){
  const parent=await this.parent(id,brandId),original=parent.results.find(r=>r.route===route&&r.placementId===placementId&&r.imageUrl);
  if(!original)throw fail('This design has no saved artwork yet.');
  const store=this.store(id),rows=[];
  for(const j of (await store.list()).filter(j=>j.leanEdit&&j.refinement?.route===route&&j.refinement?.placementId===placementId)){
   // A request left running by a stopped Studio is closed without sending anything again.
   if(busy(j.status)&&!this.active.has(id+'/'+j.id)){rows.push(await store.update(j.id,c=>{c.status='failed';c.error='This edit stopped when the Studio restarted. Your design is unchanged. Any charge for it is recorded as unknown. Send the edit again if you still want it.';return c;}));continue;}
   if(stoppedCheck(j)&&!this.active.has(id+'/'+j.id)){rows.push(await store.update(j.id,closeCheck));continue;}
   rows.push(j);
  }
  rows.sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
  return {jobId:id,brandId:parent.intake.brandId,route,placementId,activeVersionId:parent.activeVersions?.[route+'|'+placementId]||'original',estimate:await this.estimate(parent),model:MODEL,
   versions:[{id:'original',label:'Original',status:'finished',result:{imageUrl:original.imageUrl,width:original.width,height:original.height,sha256:original.sha256,ready:!!original.ready,qualityVerified:!!original.qualityVerified,check:original.visualReview?.status==='completed'?'checked':'not-checked'}},...await Promise.all(rows.map(j=>this.public(j)))]};
 }
 async read(id,childId,brandId){const parent=await this.parent(id,brandId),j=await this.store(id).read(childId);if(!j.leanEdit||j.refinement?.parentId!==parent.id||j.intake.brandId!==parent.intake.brandId)throw fail('This edit belongs to another design.');return this.public(j);}
 async create(id,input){const next=(this.queues.get(id)||Promise.resolve()).catch(()=>{}).then(()=>this.createRequest(id,input));this.queues.set(id,next);return next;}
 async createRequest(id,input){
  const instruction=typeof input.instruction==='string'?input.instruction.trim():'';
  if(instruction.length>MAX_INSTRUCTION)throw fail('Keep the change under '+MAX_INSTRUCTION+' characters.');
  if(!['continuity','exploration'].includes(input.route)||typeof input.placementId!=='string'||!/^[a-zA-Z0-9_:-]{1,200}$/.test(input.placementId))throw fail('Choose a saved design.');
  if(typeof input.requestKey!=='string'||!/^[a-zA-Z0-9_-]{8,100}$/.test(input.requestKey))throw fail('A saved request ID is required.');
  const annotations=annotationsOf(input.annotations);
  if(!instruction&&!annotations.some(a=>a.comment))throw fail('Type the change you want first, on a pin or in the note.');
  const parent=await this.parent(id,input.brandId),sourceVersionId=input.sourceVersionId||'original',store=this.store(id);
  const change={action:'ai-edit',route:input.route,placementId:input.placementId,sourceVersionId,instruction,requestKey:input.requestKey,...(annotations.length?{annotations}:{})};
  // The same Send (network retry or double click) never buys a second image.
  const prior=(await store.list()).find(j=>j.intake.requestKey===input.requestKey);
  if(prior){if(!prior.leanEdit||JSON.stringify(prior.intake.refinementRequest)!==JSON.stringify(change))throw fail('This request ID belongs to a different edit.');return this.public(prior);}
  if(busy(parent.status))throw fail('Let this design finish before editing it.');
  const active=parent.activeVersions?.[input.route+'|'+input.placementId]||'original';
  if(input.expectedVersionId!==undefined&&input.expectedVersionId!==active)throw fail('The version in use changed in another window. Reload the page before editing.');
  if((await store.list()).some(j=>j.leanEdit&&busy(j.status)&&this.active.has(id+'/'+j.id)&&j.refinement?.route===input.route&&j.refinement?.placementId===input.placementId))throw fail('An edit is already being made for this design. Wait for it to finish.');
  const scope=await this.runtime.refinements.fresh(parent); // Existing current-research and brand gate.
  const source=await this.image(parent,input.route,input.placementId,sourceVersionId),record=await this.record(parent,input.route,input.placementId);
  const region=regionOf(annotations,source.width,source.height),mask=region?await masked.pngMask(region,source.width,source.height):null; // Checked before any child or paid call.
  const selection=parent.selection.find(s=>s.id===input.placementId);
  const config={...policy.configure(this.runtime.config,parent.intake),initialStatus:'queued',maxReasoningCalls:CHECK_CALLS,jobTimeoutMs:Math.min(this.runtime.config.jobTimeoutMs||1200000,20*60*1000),estimatedSpend:{...this.runtime.config.estimatedSpend,maxUsd:Math.min(10,this.runtime.config.estimatedSpend?.maxUsd??10)}};
  const j=await store.create({...parent.intake,brandKnowledge:scope,requestKey:input.requestKey,refinementRequest:change},config,[selection]);
  if(j.reused)return this.public(j);
  this.active.add(id+'/'+j.id); // Owned by this process from creation, so list() never closes it as interrupted.
  try{
   await store.update(j.id,c=>{c.leanEdit={version:1,model:MODEL,quality:QUALITY,visualCheck:'not-checked',productCheck:{version:sku.VERSION,status:'pending',model:CHECK_MODEL,effort:CHECK_EFFORT}};c.refinement={...change,parentId:id,sourceSha256:source.sha256};c.budget.maxImageCalls=1;for(const k of ['preferenceMemory','brandStyleMemory','brandStyleExecutionHashes'])if(parent[k])c[k]=structuredClone(parent[k]);return c;});
   // Same-brand references the provider may verify: this campaign's own research files.
   const dir=this.runtime.store.dir(id);for(const name of await fs.readdir(dir))if(/^(research(?:-[a-z0-9-]+)?|corrected-research-[a-z0-9-]+)\.json$/.test(name))await store.save(j.id,name,await fs.readFileRaw(path.join(dir,name)));
   if(mask)await store.save(j.id,MASK_NAME,mask);
   const pinsImage=editPins.pinsOf(annotations).length?await editPins.render(source.bytes,annotations):null;
   if(pinsImage)await store.save(j.id,editPins.NAME,pinsImage);
   await store.save(j.id,'creative-edit-anchor.json',{parentId:id,sourceVersionId,route:input.route,placementId:input.placementId,brandId:parent.intake.brandId,name:source.name,sha256:source.sha256,...(mask?{maskName:MASK_NAME,maskSha256:hash(mask),width:source.width,height:source.height}:{}),...(pinsImage?{pinsName:editPins.NAME,pinsSha256:hash(pinsImage)}:{})});
  }catch(e){await store.update(j.id,c=>{c.status='failed';c.error='We couldn’t prepare this edit. Your design is unchanged.';return c;});this.active.delete(id+'/'+j.id);throw e;}
  this.run(id,j.id).catch(async e=>{await store.save(j.id,'ai-edit-error.json',{error:e.message,code:e.code||null,recordedAt:new Date().toISOString()});await store.update(j.id,c=>{c.status='failed';c.error=plain(e);return c;});}).finally(()=>this.active.delete(id+'/'+j.id));
  return this.public(await store.read(j.id));
 }
 async run(id,childId){
  const store=this.store(id),child=await store.read(childId),change=child.refinement;
  await store.update(childId,c=>{c.status='running';return c;});
  const parent=await this.parent(id),source=await this.image(parent,change.route,change.placementId,change.sourceVersionId),record=await this.record(parent,change.route,change.placementId);
  const anchor=await fs.readJson(path.join(store.dir(childId),'creative-edit-anchor.json'));
  if(anchor.sha256!==source.sha256||change.sourceSha256!==source.sha256)throw fail('The saved artwork changed. Your design is unchanged.');
  const canvas={width:record.canvas?.width||source.width,height:record.canvas?.height||source.height};
  const scope={conceptId:record.conceptId,route:change.route,placementId:change.placementId},annotations=change.annotations||[],fit=require('./exact-canvas').fit;
  // Pins: rebuild the marked-up copy from the saved anchor and marks and require the bytes saved at Send.
  let pinsRef=[];
  if(editPins.pinsOf(annotations).length){const rebuilt=await editPins.render(source.bytes,annotations);let saved=null;try{saved=await fs.readFileRaw(path.join(store.dir(childId),editPins.NAME));}catch{}if(anchor.pinsName!==editPins.NAME||!saved||hash(rebuilt)!==anchor.pinsSha256||hash(saved)!==anchor.pinsSha256)throw fail('The pins changed. Your design is unchanged.');pinsRef=[{assetId:'creative-edit-pins',ownership:'generated-project-reference',brandId:parent.intake.brandId,roles:['visual-style'],sourceIds:[],sha256:anchor.pinsSha256,imageData:'data:image/png;base64,'+saved.toString('base64')}];}
  else if(anchor.pinsName)throw fail('The pins changed. Your design is unchanged.');
  const attachments=[{assetId:'creative-edit-anchor',ownership:'generated-project-reference',brandId:parent.intake.brandId,roles:['visual-style'],sourceIds:[],sha256:source.sha256,imageData:'data:image/png;base64,'+source.bytes.toString('base64')},...pinsRef,...record.attachments];
  // Boxes: rebuild the mask from the saved marks and require the exact bytes saved at Send.
  const region=regionOf(annotations,source.width,source.height);let mask=null;
  if(region){mask=await masked.pngMask(region,source.width,source.height);const saved=await fs.readFileRaw(path.join(store.dir(childId),MASK_NAME));if(anchor.maskName!==MASK_NAME||hash(mask)!==anchor.maskSha256||hash(saved)!==anchor.maskSha256)throw fail('The marked area changed. Your design is unchanged.');}
  else if(anchor.maskName)throw fail('The marked area changed. Your design is unchanged.');
  const promptMarks=annotations.map(a=>a.type==='pin'&&a.area?{...a,areaBox:editPins.areaOf(a,source.width,source.height)}:a);
  const output=await this.runtime.provider.generate({prompt:promptFor(record,change.instruction,attachments,canvas,promptMarks),attachments,...(mask?{mask}:{}),quality:QUALITY,model:MODEL,size:require('./placements').generationSize(canvas.width,canvas.height).size,scope,resolvedLeanBrief:true,requestKey:fingerprint([id,childId,'ai-edit',source.sha256,change.instruction,...(annotations.length?[annotations]:[])])},store.budget(childId));
  const raw=Buffer.from(String(output.imageData).split(',')[1]||'','base64');if(!raw.length)throw fail('No image came back. Your design is unchanged.');
  await store.save(childId,'ai-edit-raw.png',await sharp(raw).png().toBuffer());
  let fitted,maskProof=null,alignment=null;
  if(region){
   // Same order as the lean correction: fit to the anchor's pixel grid, restore every pixel
   // outside the boxes from the anchor, then fit to the exact format size (exact when equal).
   const onAnchor=await fit(raw,source.width,source.height);
   // Line up the model's redraw with the anchor (even zoom + shift, matched on the protected
   // pixels) so the restored original meets the edited areas without seams (9 Nov 2026).
   const lined=await require('./edit-align').align(source.bytes,onAnchor.bytes,region,source.width,source.height);alignment=lined.alignment;
   if(lined.alignment.applied)await store.save(childId,'ai-edit-aligned.png',lined.bytes);
   const restored=await masked.restore(source.bytes,lined.bytes,region,{transitionPixels:3});
   if(restored.outsideMaskChangedPixels!==0)throw fail('The edit changed pixels outside the marked areas, so it was not saved. Your design is unchanged.');
   maskProof={maskSha256:anchor.maskSha256,maskedPixels:restored.maskedPixels,outsideMaskChangedPixels:0,transitionPixels:restored.transitionPixels};
   await store.save(childId,'ai-edit-restored.png',restored.bytes);
   fitted=await fit(restored.bytes,canvas.width,canvas.height);fitted={...fitted,source:onAnchor.source,anchorFit:onAnchor.method};
  }else fitted=await fit(raw,canvas.width,canvas.height);
  const bytes=fitted.bytes,name='static-ai-edit-'+childId.slice('creative-'.length)+'.png';
  await store.save(childId,name,bytes);
  const result={conceptId:record.conceptId,route:change.route,placementId:change.placementId,imageUrl:'/creative-ai/api/jobs/'+id+'/versions/'+childId+'/files/'+name,width:canvas.width,height:canvas.height,sha256:hash(bytes),originalArtwork:true,editable:false,status:'available',ready:false,qualityVerified:false,imageModel:MODEL,leanWorkflowVersion:1,aiEdit:{instruction:change.instruction,sourceVersionId:change.sourceVersionId,annotations,mask:maskProof,...(alignment?{alignment}:{}),fit:{method:fitted.method,source:fitted.source,...(fitted.anchorFit?{anchorFit:fitted.anchorFit}:{})}},visualReview:{status:'not-checked',conclusion:null},note:'Edited with AI. Not checked yet. Look closely before using it.',versionId:childId};
  await store.update(childId,c=>{c.results=[result];c.status='finished';c.error=null;c.updatedAt=new Date().toISOString();if(c.leanEdit?.productCheck?.status==='pending')c.leanEdit.productCheck={...c.leanEdit.productCheck,status:'checking',updatedAt:c.updatedAt};return c;});
  await this.check(id,childId);
 }
 // ONE product check of a saved edit version. Every failure is recorded on the version as
 // "unable"; the version itself is never removed or changed.
 async check(id,childId){
  const store=this.store(id),child=await store.read(childId),pc=child.leanEdit?.productCheck;
  if(pc?.status!=='checking'||child.status!=='finished')return;
  const set=patch=>store.update(childId,c=>{c.leanEdit.productCheck={...c.leanEdit.productCheck,...patch,updatedAt:new Date().toISOString()};return c;});
  try{
   const change=child.refinement,parent=await this.parent(id);
   if(child.intake.brandId!==parent.intake.brandId||change?.parentId!==parent.id)throw fail('This version belongs to another brand or design, so it was not checked.','AI_EDIT_WRONG_BRAND');
   const record=await this.record(parent,change.route,change.placementId);
   const edited=await this.image(parent,change.route,change.placementId,childId),source=await this.image(parent,change.route,change.placementId,change.sourceVersionId);
   if(source.sha256!==change.sourceSha256)throw fail('The version that was edited has changed, so the two could not be compared.','AI_EDIT_CHECK_SOURCE_CHANGED');
   // Pinned designs use their bound angles; older designs use their saved references (same bytes once, at most three).
   const binding=sku.enabled(record)?record.skuCheck:sku.plan(record.attachments),refs=sku.references({...record,skuCheck:binding}).filter(r=>['product','logo'].includes(r.role));
   const contract=sku.editContract({record,instruction:change.instruction,annotations:change.annotations,productAngles:binding.productAngles,logo:refs.some(r=>r.role==='logo')});
   const prepared=await sku.prepare([{id:'edited-version',role:'artwork',kind:'artwork',bytes:edited.bytes,expectedSha256:edited.result.sha256,label:'Image 1: edited version to inspect'},{id:'before-edit',role:'source',kind:'artwork',bytes:source.bytes,expectedSha256:change.sourceSha256,label:'Image 2: the version the user edited (before the change)'},...refs]);
   await set({productAngles:binding.productAngles,referenceSource:sku.enabled(record)?'sku-check-v1':'saved-design-references',...(binding.note?{note:binding.note}:{}),images:prepared.manifest,startedAt:new Date().toISOString()});
   const output=await this.runtime.provider.reason({contextKind:'lean-review',strictSchema:true,instructions:sku.editInstructions,input:contract,images:prepared.images,schema:visual.schema,maxOutputTokens:16000,maxProviderRequests:1,validate:o=>visual.validateReport(o,contract.requirements)},store.budget(childId));
   const report=visual.validateReport(output,contract.requirements);
   await store.save(childId,'ai-edit-check.json',{version:sku.VERSION,versionSha256:edited.sha256,sourceSha256:source.sha256,contract,report,images:prepared.manifest,checkedAt:new Date().toISOString()});
   await set({...sku.editOutcome(report),finishedAt:new Date().toISOString()});
  }catch(e){
   try{await store.save(childId,'ai-edit-check-error.json',{error:e.message,code:e.code||null,recordedAt:new Date().toISOString()});}catch{}
   await set({status:'unable',error:plainCheck(e),code:e.code||null,finishedAt:new Date().toISOString()});
  }
 }
 // "Use this version": the existing selection rule plus the exact hash the user looked at.
 async select(id,{route,placementId,versionId:vid,expectedVersionId,expectedSha256,brandId}){
  const parent=await this.parent(id,brandId);if(!/^[a-f0-9]{64}$/.test(expectedSha256||''))throw fail('Reload the versions before choosing one.');
  const img=await this.image(parent,route,placementId,vid);
  if(img.sha256!==expectedSha256)throw fail('This version changed since you looked at it. Reload the page before choosing.');
  return this.runtime.refinements.select(id,{route,placementId,versionId:vid,expectedVersionId});
 }
 // Startup: close interrupted edits without dispatching (resume-work recovery rule).
 async interrupt(){for(const p of await this.runtime.store.list({metadataOnly:true}).catch(()=>[]))for(const j of await this.store(p.id).list().catch(()=>[]))if(j.leanEdit&&busy(j.status)&&!this.active.has(p.id+'/'+j.id))await this.store(p.id).update(j.id,c=>{c.status='failed';c.error='This edit stopped when the Studio restarted. Your design is unchanged. Any charge for it is recorded as unknown. Send the edit again if you still want it.';return c;});else if(stoppedCheck(j)&&!this.active.has(p.id+'/'+j.id))await this.store(p.id).update(j.id,closeCheck);}
}
// Product check helpers (9 Nov 2026). A check left running by a stopped Studio is closed, never re-sent.
const CHECK_MODEL=policy.roles['lean-review'].model,CHECK_EFFORT=policy.roles['lean-review'].reasoningEffort,CHECK_CALLS=2;
const stoppedCheck=j=>j.status==='finished'&&['pending','checking'].includes(j.leanEdit?.productCheck?.status);
function closeCheck(c){c.leanEdit.productCheck={...c.leanEdit.productCheck,status:'unable',error:'The product check stopped when the Studio restarted. Any charge for it is recorded as unknown. Look closely before using this version.',updatedAt:new Date().toISOString()};return c;}
function checkState(j){const s=j.leanEdit?.productCheck?.status;return s==='checking'?'checking':['passed','unsure','flagged','unable'].includes(s)?s:'not-checked';}
function publicCheck(pc){return {status:pc.status,problems:(pc.problems||[]).map(p=>({name:p.name,evidence:p.evidence,location:p.location})),unverified:(pc.unverified||[]).map(p=>({name:p.name,evidence:p.evidence})),productAngles:pc.productAngles??null,...(pc.note?{note:pc.note}:{}),...(pc.error?{error:pc.error}:{})};}
function plainCheck(e){const m=String(e?.message||'');
 if(e?.code==='REVIEW_PAYLOAD_TOO_LARGE')return 'The pictures were too large to check. No check was paid for. Look closely before using this version.';
 if(/brand|boundary/i.test(m))return 'The check was blocked by a brand safety check. Look closely before using this version.';
 if(/time budget|timed? ?out|abort/i.test(m))return 'The check took too long and was stopped. If the provider charged for it, the cost is recorded as unknown.';
 return 'The product check could not run. Look closely before using this version. Detail: '+m.slice(0,200);}
function plain(e){
 const m=String(e?.message||'');
 if(/time budget|timed? ?out|abort/i.test(m))return 'The edit took too long and was stopped. Your design is unchanged. If the provider charged for it, the cost is recorded as unknown.';
 if(/credit|quota|billing|insufficient/i.test(m))return 'The image service refused the request (credit or quota). Your design is unchanged.';
 if(/brand|boundary|another campaign/i.test(m))return 'This edit was blocked by a brand safety check. Your design is unchanged.';
 return 'The edit could not be made. Your design is unchanged. Detail: '+m.slice(0,300);
}
module.exports={LeanEdits,versionSource,promptFor,annotationsOf,regionOf,areasOf,MAX_INSTRUCTION,MODEL,MASK_NAME};
