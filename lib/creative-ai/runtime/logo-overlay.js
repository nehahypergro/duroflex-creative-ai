'use strict';
// Approved campaign identity is composed locally. Product markings remain in photography.
const fs=require('./artifact-fs'),path=require('path'),sharp=require('sharp'),crypto=require('crypto');
const identity=require('./approved-identity'),exporter=require('./export');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),verified=new WeakSet();
async function snapshot(runtime,intake){
 if(!intake.brandId||intake.editableCanvas)return null;
 const brand=await runtime.brands.read(intake.brandId),a=brand.canvasAssets;
 if(!a?.logo)return null;
 const ids=a.logoOverlayIds||[a.logo.id],library=a.logos||[a.logo];
 if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)throw Error('Choose approved logo variants in this brand library');
 const variants=[];for(const id of ids){const pin=library.find(a=>a.id===id);if(!pin)throw Error('Approved logo variant is unavailable');await identity.bytes(runtime,pin,intake.brandId);variants.push(structuredClone(pin));}
 return {version:1,brandId:intake.brandId,variants};
}
async function raster(runtime,asset,brandId,width){
 const bytes=await identity.bytes(runtime,asset,brandId);
 // Transparent outer padding only; colours, internal counters and geometry are unchanged.
 const trimmed=await sharp(bytes,{limitInputPixels:40000000}).ensureAlpha().trim({background:'#00000000',threshold:0}).png().toBuffer();
 const meta=await sharp(trimmed).metadata();
 const resized=await sharp(trimmed).resize({width,fit:'inside'}).png().toBuffer();
 return {bytes:resized,ratio:meta.width/meta.height,...await sharp(resized).metadata()};
}
async function prepare(runtime,id,record,scope,attempt){
 const job=await runtime.store.read(id),policy=job.intake.logoOverlayPolicy;
 if(!policy||job.intake.editableCanvas||record.protectedProduct)return null;
 if(policy.version!==1||policy.brandId!==job.intake.brandId)throw Error('Logo overlay policy belongs to another brand');
 const selected=job.selection?.find(s=>s.id===record.placementId);
 if(selected&&!require('./placement-logo-policy').required(job.intake,selected))return null;
 const {width:w,height:h}=record.canvas||{};
 if(!Number.isSafeInteger(w)||!Number.isSafeInteger(h)||w<=0||h<=0||w*h>40000000)throw Error('Invalid logo overlay canvas');
 if(!policy.variants?.length)throw Error('Approved logo variants missing');
 const width=Math.max(1,Math.round(Math.min(w*.28,Math.min(w,h)*.45))),margin=Math.ceil(Math.min(w,h)*.05);
 const variants=[];for(const asset of policy.variants){const r=await raster(runtime,asset,policy.brandId,width);variants.push({asset,...r});}
 const height=Math.max(...variants.map(v=>v.height));
 const direction=record.artDirection.logo.treatment+' '+record.artDirection.composition;
 const left=/\b(?:top|upper)[ -]left\b.{0,35}\blogo\b|\blogo\b.{0,35}\b(?:top|upper)[ -]left\b/i.test(direction)||/^top left/i.test(record.artDirection.logo.treatment);
 const top=Math.max(margin,/story|status/.test(scope.placementId)?Math.ceil(h*.14):margin);
 const box={left:left?margin:w-margin-width,top,width,height};
 if(box.left<0||box.top+height+margin>h)throw Error('Approved logo does not fit this canvas');
 return {version:1,brandId:policy.brandId,packageHash:record.packageHash,key:scope.route+'-'+scope.placementId+'-'+attempt,box,variants,
  placementBasis:'Art-directed top corner; numeric size and inset are layout heuristics, not publisher certification. Story control clearance remains subject to visual review.'};
}
function request(record,plan){
 const attachments=record.attachmentManifest.filter(a=>a.roles?.includes('product')||(!a.roles?.includes('logo')&&!record.artDirection.logo.assetIds.includes(a.assetId))).map(a=>a.roles?.includes('product')?{...a,roles:a.roles.filter(r=>r!=='logo')}:a);
 const prompt=record.prompt.split('\n').filter(l=>!l.startsWith('Logo treatment: ')&&!l.startsWith('Attachment roles: ')).join('\n').replace('No separate composition layers.','The approved campaign logo is a separate local overlay.');
 return {attachments,prompt:prompt+'\nCAMPAIGN LOGO COMPOSITING OVERRIDE: Generate the artwork and exact embedded copy, but NO added campaign logo, brand wordmark, symbol, imitation logo or placeholder. All campaign-logo rendering instructions above describe the later compositor, not your pixels. Preserve genuine branding physically on the referenced product. Do not copy campaign logos from inspiration or prior artwork.\nReserve this exact empty natural-background rectangle plus clear space for the approved logo overlay; keep copy, people, product and props outside it: '+JSON.stringify({canvas:record.canvas,box:plan.box,clearSpace:Math.ceil(Math.min(record.canvas.width,record.canvas.height)*.02)})+'. Do not draw a box, panel or gradient. Compose the copy and scene around this reserved area.\nAttachment roles: '+JSON.stringify(attachments.map((a,i)=>({attachmentNumber:i+1,assetId:a.assetId,roles:a.roles,instruction:a.instruction})))};
}
const luminance=(r,g,b)=>[r,g,b].map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);
async function contrast(background,logo,box){
 const a=await sharp(logo).ensureAlpha().raw().toBuffer({resolveWithObject:true}),b=await sharp(background).extract({left:box.left,top:box.top,width:a.info.width,height:a.info.height}).removeAlpha().toColourspace('srgb').raw().toBuffer(),scores=[];
 for(let p=0;p<a.info.width*a.info.height;p+=3)if(a.data[p*4+3]>220){const l=luminance(...a.data.subarray(p*4,p*4+3)),bg=luminance(...b.subarray(p*3,p*3+3));scores.push((Math.max(l,bg)+.05)/(Math.min(l,bg)+.05));}
 if(!scores.length)throw Error('Approved logo has no visible pixels');scores.sort((a,b)=>a-b);return scores[Math.floor(scores.length*.1)];
}
async function compose(runtime,id,record,plan,imageData){
 const background=await sharp(Buffer.from(imageData.split(',')[1],'base64')).resize(record.canvas.width,record.canvas.height,{fit:'cover'}).png().toBuffer();
 const scored=[];for(const v of plan.variants)scored.push({...v,contrast:await contrast(background,v.bytes,plan.box)});scored.sort((a,b)=>b.contrast-a.contrast);
 const chosen=scored[0],box={...plan.box,height:chosen.height},baseName='logo-background-'+plan.key+'.png';
 const composed=await sharp(background).composite([{input:chosen.bytes,left:box.left,top:box.top}]).png().toBuffer(),out=await exporter.exportWholeStatic('data:image/png;base64,'+composed.toString('base64'),record);
 await runtime.store.save(id,baseName,background);
 out.proof.compositing=true;out.proof.operation='approved-logo-overlay-and-encoding';out.proof.note='Exact approved source file, proportional rasterization and local composition before final encoding. Identity provenance is code-verified; visibility, contrast, size, safe areas and unintended duplicate marks require visual review.';
 out.proof.logoOverlay={version:1,brandId:plan.brandId,packageHash:record.packageHash,asset:chosen.asset,box,sourceRatio:chosen.ratio,logoRasterHash:hash(chosen.bytes),backgroundName:baseName,backgroundHash:hash(background),placementBasis:plan.placementBasis,contrast:{method:'10th-percentile opaque-logo-pixel contrast against local background; selection heuristic, not an approval',selected:chosen.contrast,candidates:scored.map(v=>({assetId:v.asset.id,score:v.contrast}))}};
 return out;
}
async function verify(runtime,id,record,imageData,name){
 const job=await runtime.store.read(id);if(!job.intake.logoOverlayPolicy||job.intake.editableCanvas||record?.protectedProduct)return null;
 const selected=job.selection?.find(s=>s.id===record.placementId);if(selected&&!require('./placement-logo-policy').required(job.intake,selected))return null;
 if(!/^static-[\w-]+\.(png|jpg|webp)$/.test(name))throw Error('Invalid composed artwork filename');
 const proof=JSON.parse(await fs.readFile(path.join(runtime.store.dir(id),'export-proof-'+name.slice(7).replace(/\.(png|jpg|webp)$/,'')+'.json'))),p=proof.logoOverlay,bytes=Buffer.from(imageData.split(',')[1],'base64');
 if(!p||p.version!==1||p.packageHash!==record.packageHash||proof.exportHash!==hash(bytes)||p.brandId!==job.intake.brandId)throw Error('Approved logo proof does not match these artwork bytes');
 const pin=job.intake.logoOverlayPolicy.variants.find(a=>a.id===p.asset.id);if(!pin||JSON.stringify(pin)!==JSON.stringify(p.asset))throw Error('Approved logo source changed');
 if(path.basename(p.backgroundName)!==p.backgroundName||!p.backgroundName.startsWith('logo-background-'))throw Error('Invalid logo background filename');
 const background=await fs.readFile(path.join(runtime.store.dir(id),p.backgroundName));if(hash(background)!==p.backgroundHash)throw Error('Logo background changed');
 const r=await raster(runtime,pin,p.brandId,p.box.width);if(hash(r.bytes)!==p.logoRasterHash||r.height!==p.box.height)throw Error('Approved logo raster changed');
 if(!Object.values(p.box).every(Number.isSafeInteger)||p.box.left<0||p.box.top<0||p.box.left+p.box.width>record.canvas.width||p.box.top+p.box.height>record.canvas.height)throw Error('Approved logo is clipped');
 const assembled=await sharp(background).composite([{input:r.bytes,left:p.box.left,top:p.box.top}]).png().toBuffer(),rebuilt=await exporter.exportWholeStatic('data:image/png;base64,'+assembled.toString('base64'),record);
 if(rebuilt.proof.exportHash!==proof.exportHash)throw Error('Approved logo composition does not match the final image');
 const result={packageHash:record.packageHash,artifactHash:proof.exportHash,proof:p,background,logoRaster:r.bytes};verified.add(result);return result;
}
function isVerified(value,record,artifactHash){return !!value&&verified.has(value)&&value.packageHash===record.packageHash&&value.artifactHash===artifactHash;}
const presentationCriteria=['visibility','size','placement','contrast','clipping'];
const presentationSchema={type:'array',items:{type:'object',additionalProperties:false,required:['criterion','status','confidence','observation'],properties:{criterion:{enum:presentationCriteria},status:{enum:['pass','fail','unknown']},confidence:{type:'number',minimum:0,maximum:1},observation:{type:'string',minLength:1}}}};
function check(value,presentation){
 if(!Array.isArray(presentation)||presentation.length!==presentationCriteria.length||presentationCriteria.some(id=>presentation.filter(p=>p.criterion===id).length!==1)||presentation.some(p=>!['pass','fail','unknown'].includes(p.status)||!Number.isFinite(p.confidence)||p.confidence<0||p.confidence>1||typeof p.observation!=='string'||!p.observation.trim()))throw Error('Logo presentation observations must cover each visual check exactly once');
 const failed=presentation.filter(p=>p.status==='fail'&&p.confidence>=.7),unknown=presentation.some(p=>p.status==='unknown'||p.confidence<.7);
 return {criterion:'logo-identity',status:failed.length?'fail':unknown?'unknown':'pass',confidence:failed.length?Math.max(...failed.map(p=>p.confidence)):unknown?0.65:Math.min(...presentation.map(p=>p.confidence)),applicabilityReason:'Source identity is verified by code; the existing logo gate also requires visible, usable placement.',tolerance:'Original geometry/colours retained; proportional resampling and output encoding permitted. Reviewer assesses presentation only.',evidence:{method:'vision-attestation',observation:'CODE-VERIFIED SOURCE: composition matches saved output hash; approved asset '+value.proof.asset.id+' / '+value.proof.asset.sha256+'. VISUAL PRESENTATION: '+presentation.map(p=>p.criterion+': '+p.status+' — '+p.observation).join('; '),expected:'Pinned approved file, clearly visible and readable, safely placed without overlap or clipping.',location:JSON.stringify(value.proof.box),sourceIds:['review-policy'],ruleIds:[]}};
}
const instructions='The campaign logo in the supplied rectangle is a code-verified overlay of the approved original asset. Do NOT recognise, re-identify, compare glyphs, question source artwork identity or demand pixel identity for this overlay. Code supplies source identity. Return logoPresentation observations for visibility, size, placement, contrast and clipping, each with status, confidence and actual observation; those checks still gate delivery. Inspect its visible size, placement, contrast, clipping and overlap with copy/product/people under placementFit, brandRecognition and visualCraft (and any applicable locked layout rule). Flag unintended additional campaign marks outside this rectangle. Genuine physical product markings still require the usual product review. Asset identity verification does not prove readability or a good placement.';
module.exports={snapshot,prepare,request,compose,verify,isVerified,check,instructions,presentationSchema,presentationCriteria};
