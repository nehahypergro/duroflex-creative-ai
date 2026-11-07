'use strict';
// Read Studio's catalogue and presets, rather than maintaining a second format list.
const M=require('../../../public/creative-ai/studio-model');
const categories=[['social','Social & ads'],['website','Web & commerce'],['retail','Retail & local'],['messaging','Messaging'],['corporate','Corporate & PR'],['training','Sales & partners']].map(([id,name])=>({id,name}));
const category=id=>({employee:'corporate',editorial:'corporate',press:'corporate',partners:'training'})[id]||id;
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const part=(name,width,height)=>({name,width,height});
function catalog(){
 const entries=[];
 const add=e=>{if(!entries.some(x=>x.id===e.id))entries.push({text:'embedded',mode:'image',...e});};
 for(const group of ['social','website','retail','messaging','corporate'])for(const f of M.toolFormats(group)){
  const o=M.output(f.id);o.id='experiment';let parts,print,direction='',text='embedded',mode='image';
  if(f.imagePlatform?.startsWith('Retail:')){M.applyRetailPreset(o,f.imagePlatform.slice(7));const e=M.retailEntry(o),p=M.retailPrintPresets.find(p=>p.id===e.printId);if(p){print=p.print;parts=Array.from({length:p.pages},(_,i)=>part(p.pages>1?'Face '+(i+1):f.name,p.width,p.height));direction=p.guidelines;}else if(e.planningOnly)direction='Raster concept only. Use the supplied per-page plan; do not imply that store variants or a production toolkit have been assembled.';}
  if(f.carouselPlatform)o.staticValues={platform:f.carouselPlatform,narrativeType:f.narrativeType};
  if(f.imagePlatform==='PMax'){parts=[part('Landscape',1200,628),part('Square',1200,1200),part('Portrait',960,1200)];text='none';direction='Photographic image for paid advertising. No campaign lettering, offers, buttons or logo overlays.';}
  if(f.websiteType==='Category tile'){o.width=o.height=1080;text='none';}
  if(f.amazonPreset){M.applyAmazonPreset(o,f.amazonPreset);text='none';direction=M.amazonTemplates[f.amazonPreset].instruction;}
  if(f.id===5){parts=M.pdpSlots.map(n=>part(n,1080,1080));text='none';direction='Product gallery photography. Show only supported visible product details. No invented cutaways or internal construction.';}
  if(f.id===6){text='none';}
  if(f.imagePlatform==='Email'){M.applyEmailPreset(o,'Email hero');text='none';}
  if(f.imagePlatform==='RCS'){M.applyRcsPreset(o,'Single card · medium image');text='none';}
  if(f.imagePlatform==='Push'){M.applyPushPreset(o,'Android','Landscape image · 2:1');text='none';direction='One recognisable subject at small size. No diagrams, feature callouts, text or fake notification controls.';}
  if(f.imagePlatform==='Push icons')mode='local-icons';
  if(!parts){const p=M.staticParts(o);parts=p.length?p.map(p=>part(p.name,p.width,p.height)):[part(f.name,o.width,o.height)];}
  add({id:group+'-'+slug(f.name),category:group,name:f.name,featureId:f.id,parts,text,mode,print,direction,requiresBrief:M.retailEntry(o)?.key==='price',mainPlanned:!!M.retailEntry(o)?.planningOnly});
 }
 // Every image preview in the remaining Studio shelves can be tried as raw artwork.
 for(const g of M.catalogueVisuals.additional)for(const [name,description,key]of g.items){
  const tall=['cheatsheet','salespage','mobilecard','battlecard','employeestatus','portrait','pressportrait'].includes(key),set=['partnerset','kit','presskit','deck'].includes(key);
  const count=set?(key==='deck'?5:3):1,width=tall?1080:1200,height=tall?1528:675;
  add({id:g.id+'-'+key,category:category(g.id),name,mainPlanned:true,direction:description+'. Experimental flat raster artwork only; no editable deck, document, publishing or production certification.',parts:Array.from({length:count},(_,i)=>part(set?'Page '+(i+1):name,width,height)),requiresBrief:['portrait','pressportrait','hiring','award','cobrand','alliance','battlecard','process','infographic'].includes(key)});
 }
 // The preset menus contain formats that do not have their own sidebar card.
 for(const p of M.retailPrintPresets)add({preset:true,id:'print-'+slug(p.id),category:'retail',name:p.name,print:p.print,direction:p.guidelines,parts:Array.from({length:p.pages},(_,i)=>part(p.pages>1?'Face '+(i+1):p.name,p.width,p.height))});
 for(const [name,t]of Object.entries(M.amazonTemplates))add({preset:true,id:'amazon-'+slug(name),category:'website',name,text:'none',direction:t.instruction,parts:M.amazonImageSlots(t,{}).map(([n,w,h])=>part(n,w,h))});
 for(const [name,size]of Object.entries(M.emailPresets))add({preset:true,id:'email-'+slug(name),category:'messaging',name,text:'none',parts:[part(name,...(size||[1200,600]))]});
 for(const [name,p]of Object.entries(M.rcsPresets))add({preset:true,id:'rcs-'+p.slug,category:'messaging',name:'RCS · '+name,text:'none',parts:Array.from({length:p.carousel?3:1},(_,i)=>part('Card '+(i+1),p.width,p.height))});
 for(const destination of Object.keys(M.pushDestinations))for(const [name,size]of Object.entries(M.pushPresets))add({preset:true,id:'push-'+slug(destination+'-'+name),category:'messaging',name:destination+' push · '+name,text:'none',direction:'One recognisable photographic subject. No lettering, diagrams, feature callouts or fake notification controls.',parts:[part(destination+' push image',...(size||[1024,512]))]});
 return entries;
}
function textInput(value,name,max=6000){if(value==null)return '';if(typeof value!=='string'||value.length>max)throw Error(name+' must be text under '+max+' characters');return value.trim();}
function resolve(requests){
 if(!Array.isArray(requests)||!requests.length||requests.length>100)throw Error('Choose 1–100 asset types');
 const entries=catalog(),seen=new Set(),slots=[];
 for(const r of requests){const e=entries.find(e=>e.id===r.assetId);if(!e||seen.has(e.id))throw Error('Unknown or repeated asset type');seen.add(e.id);
  if(e.mode!=='image')throw Error(e.name+' uses Studio’s saved-artwork icon preparation tool; it is not an image-generation request.');
  const brief=textInput(r.brief,'Asset brief'),copy=textInput(r.copy,'Exact copy');
  if(e.requiresBrief&&!brief)throw Error('Add the factual brief for '+e.name+' before generation.');
  if(e.text==='none'&&copy)throw Error(e.name+' is image-only; keep native copy outside the artwork.');
  if(r.parts!=null&&(!Array.isArray(r.parts)||r.parts.length!==e.parts.length))throw Error('Keep every page/face in '+e.name);
  for(let i=0;i<e.parts.length;i++){const p=e.parts[i],v=r.parts?.[i]||{},width=v.width??p.width,height=v.height??p.height;
   if(![width,height].every(n=>Number.isInteger(n)&&n>=64&&n<=8192)||width/height>8||height/width>8)throw Error('Unsupported canvas for '+e.name);
   if(e.print&&(width!==p.width||height!==p.height))throw Error('Print previews must retain the preset’s physical proportions');
   const pageCopy=textInput(v.copy,'Page copy')||copy;if(e.text==='none'&&pageCopy)throw Error(e.name+' is image-only; keep native copy outside the artwork.');
   slots.push({key:e.id+'-'+(i+1),group:e.id,category:e.category,groupLabel:e.name,label:p.name,width,height,text:e.text,direction:[e.direction,brief,textInput(v.direction,'Page direction')].filter(Boolean).join('\n'),copy:pageCopy||null,print:e.print||null,page:i+1,pages:e.parts.length,mainPlanned:!!e.mainPlanned});
  }
 }
 if(slots.length>120)throw Error('Use collections of at most 120 images');
 return slots;
}
module.exports={categories,catalog,resolve};
