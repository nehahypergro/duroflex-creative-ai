'use strict';
// A code-drawn spatial reference, never brand/SKU evidence or final artwork.
const fs=require('./artifact-fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const digest=x=>crypto.createHash('sha256').update(x).digest('hex');
const geometry=doc=>require('./photo-layout-coordinates').geometry(doc);
function fromPlan(plan,canvas){const px=b=>({left:b.x*canvas.width,top:b.y*canvas.height,width:b.width*canvas.width,height:b.height*canvas.height});return geometry({canvas,objects:[...plan.text.map(b=>({type:'text',role:b.role,fill:b.colour,...px(b)})),...(plan.logo?[{type:'image',role:'logo',...px(plan.logo)}]:[])],protectedRegions:plan.protectedRegions.map(b=>({id:b.id,kind:b.kind,...px(b)}))});}
// Canonical order avoids the overlay renderer's logo-first ordering affecting identity.
function canonical(g){return {...g,overlayExclusions:[...g.overlayExclusions].map(({colour,...b})=>b).sort((a,b)=>a.role.localeCompare(b.role)||a.pixels.top-b.pixels.top||a.pixels.left-b.pixels.left)};}
async function png(g){
 const rect=(b,colour,opacity)=>`<rect x="${b.left}" y="${b.top}" width="${b.width}" height="${b.height}" fill="${colour}" fill-opacity="${opacity}" stroke="${colour}" stroke-width="4"/>`;
 // No words, brand marks or source photographs enter this schematic.
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${g.canvas.width}" height="${g.canvas.height}"><rect width="100%" height="100%" fill="#eef1f4"/>${g.subjectEnvelopes.filter(b=>b.kind==='product').map(b=>rect(b.pixels,'#537ea1',.4)).join('')}${g.subjectEnvelopes.filter(b=>b.kind!=='product').map(b=>rect(b.pixels,'#9168a6',.35)).join('')}${g.overlayExclusions.map(b=>rect(b.pixels,'#42a883',.12)).join('')}</svg>`;
 return sharp(Buffer.from(svg)).png().toBuffer();
}
async function source(dir,scope,brandId){
 const k=require('./editable').key(scope.route,scope.placementId),job=JSON.parse(await fs.readFile(path.join(dir,'job.json'),'utf8')),saved=JSON.parse(await fs.readFile(path.join(dir,'composition-overlay-'+k+'.json'),'utf8')),record=JSON.parse(await fs.readFile(path.join(dir,'editable-source-package-'+k+'.json'),'utf8'));
 if(job.intake.brandId!==brandId||saved.brandId!==brandId||record.route!==scope.route||record.placementId!==scope.placementId||record.conceptId!==scope.conceptId||saved.layout.contractVersion!==2||saved.artHash!==require('../art-director').fingerprint(record.artDirection))throw Error('Layout guide is outside the pinned brand, unit or art plan');
 return {k,jobId:job.id,geometry:canonical(fromPlan(saved.layout,record.canvas))};
}
async function create(runtime,id,record,doc){
 const binding=await source(runtime.store.dir(id),record,doc.brandId),actual=canonical(geometry(doc));
 if(binding.jobId!==id||JSON.stringify(binding.geometry)!==JSON.stringify(actual))throw Error('Layout guide does not match the current pinned overlay geometry');
 const bytes=await png(actual),asset={assetId:'editable-layout-guide',ownership:'generated-project-reference',roles:['composition-guide'],brandId:doc.brandId,jobId:id,sha256:digest(bytes),geometryHash:digest(JSON.stringify(actual)),imageData:'data:image/png;base64,'+bytes.toString('base64')};
 const name='editable-layout-guide-'+binding.k+'.png',file=path.join(runtime.store.dir(id),name);
 try{if(digest(await fs.readFile(file))!==asset.sha256)throw Error('Layout guide checkpoint changed; preserve the previous job and start a fresh composition');}catch(e){if(e.code!=='ENOENT')throw e;await runtime.store.save(id,name,bytes);}
 return asset;
}
async function verify(asset,context,scope){
 if(asset.ownership!=='generated-project-reference'||asset.brandId!==context.scope.brandId||asset.roles?.length!==1||asset.roles[0]!=='composition-guide')throw Error('Invalid layout guide provenance');
 const binding=await source(context.dir,scope,context.scope.brandId),bytes=await png(binding.geometry);
 if(asset.jobId!==binding.jobId||asset.geometryHash!==digest(JSON.stringify(binding.geometry))||asset.sha256!==digest(bytes)||asset.imageData!=='data:image/png;base64,'+bytes.toString('base64'))throw Error('Layout guide bytes or geometry differ from this job’s pinned plan');
}
const instructions='The LAST attached image is a technical spatial guide for this exact model canvas, not a photograph, mood reference or artwork to copy. Green rectangles reserve quiet real surfaces for later text/logo: render no lettering or logos there. Blue rectangles contain the complete product; purple rectangles contain complete people/face silhouettes. Follow their position, scale and limits. Render the art-directed scene naturally inside these envelopes. Do not reproduce any guide rectangles, outlines, colours or panels. Keep the underlying copy surfaces uniformly light for dark ink (or dark for light ink), including at their edges; a dim mottled surface is not suitable. Any lettering or wordmarks on mood references are excluded. No campaign logo, headline, CTA or placeholder is to be generated.';
module.exports={create,verify,instructions};
