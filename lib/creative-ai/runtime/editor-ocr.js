'use strict';
const fs=require('./artifact-fs'),path=require('path'),sharp=require('sharp'),crypto=require('crypto');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const normalize=s=>s.normalize('NFC').toLowerCase().replace(/’/g,"'").replace(/(?<=\s)[·•](?=\s)/gu,'·').replace(/\s+/g,' ').trim().replace(/[.!?。！？]+$/u,'');
const intersects=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
function select(rows,fields,protectedRegions=[]){
 const sorted=rows.map((r,i)=>({...r,index:i})).sort((a,b)=>a.box.y-b.box.y||a.box.x-b.box.x),matches=[],issues=[];
 for(const f of fields.filter(f=>f.delivery==='embedded')){
  const target=normalize(f.text);if(!target)continue;const candidates=[];
  for(let start=0;start<sorted.length;start++){
   const group=[];for(const r of sorted.slice(start,start+8)){
    if(protectedRegions.some(p=>intersects(p,r.box)))break;
    const p=group.at(-1);if(p&&(r.box.y-p.box.y-p.box.height>Math.max(p.box.height,r.box.height)*1.5||Math.abs(r.box.x-p.box.x)>.15))break;
    group.push(r);const actual=normalize(group.map(r=>r.text).join(' '));if(actual===target)candidates.push([...group]);if(actual.length>target.length+2)break;
   }
  }
  if(candidates.length===1){const lines=candidates[0],x=Math.min(...lines.map(r=>r.box.x)),y=Math.min(...lines.map(r=>r.box.y));matches.push({fieldId:f.id,role:f.role||'supporting-copy',text:f.text,lines,box:{x,y,width:Math.max(...lines.map(r=>r.box.x+r.box.width))-x,height:Math.max(...lines.map(r=>r.box.y+r.box.height))-y}});}
  else issues.push({fieldId:f.id,text:f.text,reason:candidates.length?'Repeated text: choose manually; original preserved.':'Not confidently matched; original preserved.'});
 }
 const counts={};for(const m of matches)for(const r of m.lines)counts[r.index]=(counts[r.index]||0)+1;
 return {matches:matches.filter(m=>{if(m.lines.some(r=>counts[r.index]>1)){issues.push({fieldId:m.fieldId,text:m.text,reason:'Overlapping copy bindings; original preserved.'});return false;}return true;}),issues};
}
async function source(runtime,id,route,placementId){
 require('./editable').key(route,placementId);const job=await runtime.store.read(id),result=job.results.find(r=>r.route===route&&r.placementId===placementId);
 if(!result?.imageUrl)throw Error('This creative has no saved image.');
 const prefix='/creative-ai/api/jobs/'+id+'/files/',name=result.imageUrl.slice(prefix.length);
 if(!result.imageUrl.startsWith(prefix)||!/^static-[\w-]+\.(png|jpg|jpeg|webp)$/.test(name))throw Error('Open the original saved artwork to start editing.');
 const file=path.join(runtime.store.dir(id),name),bytes=await fs.readFile(file),meta=await sharp(bytes,{limitInputPixels:24e6}).metadata();
 const attempt=/-([01])\.[^.]+$/.exec(name)?.[1];let record;
 if(attempt)record=JSON.parse(await fs.readFile(path.join(runtime.store.dir(id),'package-'+route+'-'+placementId+'-'+attempt+'.json')));
 if(record&&(record.route!==route||record.placementId!==placementId||record.assignmentId!==id))throw Error('Saved copy does not belong to this artwork.');
 return {job,result,file,bytes,width:meta.width,height:meta.height,sha256:hash(bytes),record};
}
async function analyze(runtime,id,route,placementId){
 const s=await source(runtime,id,route,placementId),ocr=await require('./review').ocr(s.file);
 if(ocr.status!=='measured')throw Error('Local text recognition is unavailable. OCR requires Apple Vision on this Mac. You can still add text and images over the original.');
 const selection=select(ocr.rows,s.record?.exactCopy?.fields||[]);
 const proposal={version:1,jobId:id,brandId:s.job.intake.brandId,route,placementId,imageUrl:s.result.imageUrl,imageSha256:s.sha256,copySha256:hash(JSON.stringify(s.record?.exactCopy||{})),width:s.width,height:s.height,rows:ocr.rows,...selection,apiCostInr:0,createdAt:new Date().toISOString()};
 proposal.token=hash(JSON.stringify(proposal));await runtime.store.save(id,'editor-ocr-'+require('./editable').key(route,placementId)+'-proposal.json',proposal);return proposal;
}
// Local harmonic fill. Unmasked pixels are copied byte-for-byte; no remote service.
async function cleanup(bytes,regions,preserve=[],options={}){
 const {data,info}=await sharp(bytes).removeAlpha().raw().toBuffer({resolveWithObject:true}),{width:w,height:h,channels:c}=info,mask=options.textOnly?require('./editor-pixels').textMask({data,info},regions,preserve):new Uint8Array(w*h);
 function mark(r,value,pad){const x0=Math.max(0,Math.floor(r.x*w)-pad),y0=Math.max(0,Math.floor(r.y*h)-pad),x1=Math.min(w,Math.ceil((r.x+r.width)*w)+pad),y1=Math.min(h,Math.ceil((r.y+r.height)*h)+pad);for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)mask[y*w+x]=value;}
 if(!options.textOnly){regions.forEach(r=>mark(r,1,5));preserve.forEach(r=>mark(r,0,4));}
 const selected=[];for(let p=0;p<mask.length;p++)if(mask[p])selected.push(p);
 if(selected.length>w*h*.35)throw Error('The selected cleanup area is too large. Select individual copy areas.');
 const values=Float32Array.from(data);
 // Initialise each run from its unmasked left/right boundary, then diffuse locally.
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(!mask[y*w+x])continue;const start=x;while(x<w&&mask[y*w+x])x++;const end=x;for(let xx=start;xx<end;xx++)for(let k=0;k<c;k++){const a=(y*w+Math.max(0,start-1))*c+k,b=(y*w+Math.min(w-1,end))*c+k,t=(xx-start+1)/(end-start+1);values[(y*w+xx)*c+k]=data[a]*(1-t)+data[b]*t;}}
 for(let n=0;n<200;n++)for(const p of selected){const x=p%w,y=Math.floor(p/w),neighbors=[x? p-1:p,x<w-1?p+1:p,y?p-w:p,y<h-1?p+w:p];for(let k=0;k<c;k++)values[p*c+k]=neighbors.reduce((sum,q)=>sum+values[q*c+k],0)/4;}
 const output=Buffer.from(data);for(const p of selected)for(let k=0;k<c;k++)output[p*c+k]=Math.round(values[p*c+k]);
 return {bytes:await sharp(output,{raw:info}).png().toBuffer(),maskedPixels:selected.length,outsideMaskChangedPixels:0};
}
function validRegion(r){return r&&['x','y','width','height'].every(k=>Number.isFinite(r[k])&&r[k]>=0&&r[k]<=1)&&r.width>0&&r.height>0&&r.x+r.width<=1.001&&r.y+r.height<=1.001;}
// Fabric 6 advances lines by fontSize × _fontSizeMult (1.13) × lineHeight.
// Use OCR line-top separation, rather than imposing a fixed leading on all art.
function lineHeight(match,size,canvasHeight){
 if(match.lines.length<2)return 1.05;
 const gaps=match.lines.slice(1).map((r,i)=>(r.box.y-match.lines[i].box.y)*canvasHeight).sort((a,b)=>a-b),middle=Math.floor(gaps.length/2),advance=gaps.length%2?gaps[middle]:(gaps[middle-1]+gaps[middle])/2;
 return Math.max(.8,Math.min(2,advance/(size*1.13)));
}
// Preserve the requested string; OCR supplies geometry, not replacement copy.
function requestedText(match){
 const words=[...match.text.matchAll(/\S+/gu)],counts=match.lines.map(r=>(r.text.match(/\S+/gu)||[]).length);
 if(counts.reduce((a,b)=>a+b,0)!==words.length||counts.some(n=>!n))return match.text;
 let cursor=0;return counts.map(n=>{const start=words[cursor].index;cursor+=n;const end=words[cursor-1].index+words[cursor-1][0].length;return match.text.slice(start,end);}).join('\n');
}
async function convert(runtime,id,route,placementId,input){
 const mod=require('./editable'),k=mod.key(route,placementId);try{return await runtime.editable.read(id,route,placementId);}catch(e){if(e.code!=='ENOENT')throw e;}
 const s=await source(runtime,id,route,placementId);if(input.imageUrl!==s.result.imageUrl)throw Error('Artwork changed. Reopen this image.');
 const overlay=await require('./logo-overlay').verify(runtime,id,s.record,'data:image/png;base64,'+s.bytes.toString('base64'),path.basename(s.file));
 let proposal,selected=[],logoRegion=input.logoRegion;
 if(input.token){proposal=JSON.parse(await fs.readFile(path.join(runtime.store.dir(id),'editor-ocr-'+k+'-proposal.json')));if(proposal.token!==input.token||proposal.imageSha256!==s.sha256||proposal.brandId!==s.job.intake.brandId||proposal.copySha256!==hash(JSON.stringify(s.record?.exactCopy||{})))throw Error('OCR preview is stale. Scan the current artwork again.');if(!Array.isArray(input.fieldIds)||new Set(input.fieldIds).size!==input.fieldIds.length||input.fieldIds.some(id=>!proposal.matches.some(m=>m.fieldId===id)))throw Error('Choose only matched copy fields.');selected=proposal.matches.filter(m=>input.fieldIds.includes(m.fieldId));}
 else if(input.fieldIds?.length||logoRegion)throw Error('Scan the original before separating elements.');
 if(logoRegion&&!validRegion(logoRegion))throw Error('Select a valid logo area.');
 const brandAssets=await mod.assets(runtime,s.job.intake.brandId);let logo=brandAssets.logos?.find(a=>a.id===input.logoId)||brandAssets.logo;
 if(logoRegion&&(!logo||logo.id!==input.logoId))throw Error('Choose this brand’s saved logo.');
 if(overlay){const b=overlay.proof.box;logoRegion={x:b.left/s.width,y:b.top/s.height,width:b.width/s.width,height:b.height/s.height};const logoName='editor-'+hash(overlay.logoRaster).slice(0,24)+'.png';await runtime.store.save(id,logoName,overlay.logoRaster);logo={...overlay.proof.asset,scope:'job',id:'composed-logo-'+hash(overlay.logoRaster).slice(0,24),filename:logoName,sha256:hash(overlay.logoRaster),url:'/creative-ai/api/jobs/'+id+'/files/'+logoName,sourceReference:overlay.proof.asset.sourceReference+'; proportional compositor raster. Original source SHA256: '+overlay.proof.asset.sha256};}
 if(logoRegion&&selected.some(m=>intersects(m.box,logoRegion)))throw Error('Logo selection overlaps copy. Draw around only the logo.');
 const raw=await sharp(s.bytes).removeAlpha().raw().toBuffer({resolveWithObject:true}),uncertainText=[];
 selected=selected.filter(m=>{if(require('./editor-pixels').separable(raw,m))return true;uncertainText.push({fieldId:m.fieldId,reason:'Text colour cannot be separated confidently; original lettering preserved.'});return false;});
 const used=new Set(selected.flatMap(m=>m.lines.map(r=>r.index))),preserve=(proposal?.rows||[]).filter((r,i)=>!used.has(i)&&!(logoRegion&&intersects(r.box,logoRegion))).map(r=>r.box);
 const cleaned=selected.length||logoRegion?await cleanup(overlay?overlay.background:s.bytes,[...selected.flatMap(m=>m.lines.map(r=>r.box)),...(logoRegion&&!overlay?[logoRegion]:[])],preserve,{textOnly:!logoRegion||!!overlay}):{bytes:await sharp(overlay?overlay.background:s.bytes).png().toBuffer(),maskedPixels:0,outsideMaskChangedPixels:0};
 const photoName='photo-'+k+'-ocr.png';await runtime.store.save(id,photoName,cleaned.bytes);
 const fonts=[...brandAssets.fonts,...await require('./editor-assets').library(runtime,id)];if(!fonts.length)throw Error('Add a font file before creating editable text.');
 const photo={id:'photograph',kind:'photograph',brandId:s.job.intake.brandId,name:'Original photograph with selected copy removed',sha256:hash(cleaned.bytes),url:'/creative-ai/api/jobs/'+id+'/files/'+photoName};
 const doc={schemaVersion:1,engine:'fabric-6',brandId:s.job.intake.brandId,canvas:{width:s.width,height:s.height},safeMargin:Math.round(Math.min(s.width,s.height)*.045),objects:[{id:'photograph',role:'photograph',type:'image',assetId:photo.id,left:0,top:0,width:s.width,height:s.height,locked:true}],assets:[photo,...(logoRegion?[logo]:[])],fonts};
 for(const m of selected){const f=fonts.find(f=>f.weight===(m.role==='headline'?700:400))||fonts[0],file=await require('./editor-assets').file(runtime,id,f,doc.brandId)||path.join(runtime.brands.dir(doc.brandId),'canvas-assets',f.filename),font=require('fontkit').create(await fs.readFile(file));let size=Infinity;
  for(const r of m.lines){const run=font.layout(r.text),aw=run.positions.reduce((n,p)=>n+p.xAdvance,0),ah=Math.max(...run.glyphs.map(g=>g.bbox.maxY))-Math.min(...run.glyphs.map(g=>g.bbox.minY));size=Math.min(size,r.box.width*s.width/Math.max(aw,1)*font.unitsPerEm,r.box.height*s.height/Math.max(ah,1)*font.unitsPerEm);}
  const ink=require('./editor-pixels').ink(raw,m.lines[0].box).rgb;
  const left=m.box.x*s.width,top=m.box.y*s.height,width=m.box.width*s.width+4;
  doc.objects.push({id:'copy-'+m.fieldId.replace(/[^\w-]/g,'-'),fieldId:m.fieldId,role:m.role,type:'text',text:requestedText(m),left,top,width,height:m.box.height*s.height+size*.4,fontId:f.id,fontSize:Math.max(8,Math.min(500,size)),fill:'#'+ink.map(v=>v.toString(16).padStart(2,'0')).join(''),align:'left',lineHeight:lineHeight(m,size,s.height),charSpacing:0});
 }
 if(logoRegion)doc.objects.push({id:'official-logo',role:'logo',type:'image',assetId:logo.id,left:logoRegion.x*s.width,top:logoRegion.y*s.height,width:logoRegion.width*s.width,height:logoRegion.height*s.height,locked:false});
 const now=new Date().toISOString(),originalFile='editable-'+k+'-original.json';const state={version:1,jobId:id,route,placementId,revision:0,original:doc,document:doc,assetRegistry:doc.assets,fontRegistry:fonts,history:[{revision:0,file:originalFile,createdAt:now}],validation:[],ocr:{sourceImageUrl:s.result.imageUrl,sourceImageSha256:s.sha256,copySha256:proposal?.copySha256||null,allCopySeparated:!!proposal&&proposal.issues.length===0&&selected.length===proposal.matches.length,selectedFieldIds:selected.map(m=>m.fieldId),uncertainText,preservedText:preserve.length,logoSeparated:!!logoRegion,maskedPixels:cleaned.maskedPixels,outsideMaskChangedPixels:cleaned.outsideMaskChangedPixels,apiCostInr:0,qualityApproval:false,note:'Text and background are reconstructed locally. Compare with the original; font appearance and repaired detail may differ. Unselected lettering remains in the photograph.'}};
 if(s.record)await runtime.store.save(id,'editable-source-package-'+k+'.json',s.record);await runtime.store.save(id,originalFile,doc);await runtime.store.save(id,'editable-'+k+'.json',state);return state;
}
module.exports={requestedText,lineHeight,ink:require('./editor-pixels').ink,select,cleanup,analyze,convert,source,validRegion};
