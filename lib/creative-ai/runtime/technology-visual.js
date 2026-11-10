'use strict';
// Technology visual v1 (user decision, 9 Nov 2026): ONE shared engine rule for every format.
// When a page's job is a technology visual (the brief's message type is Technology, the page is a
// technology or feature-explainer page such as the A+ technology module, or the plan makes a page
// about a cited technology fact):
// - the technology is named word for word from the exact SKU's supported facts, cited by fact ID;
// - the SKU's official technology picture (A+, feature-tile or supporting media in the same brand's
//   saved product snapshot, hash-checked) is attached as visual evidence for that page only;
// - never invented layers or cutaways; no fact -> strongest supported benefit, and the result says so;
//   a fact but no picture -> the fact text only, and the result says so.
// Pinned for NEW lean jobs (runtimeConfig.technologyVisualVersion 1); older jobs keep their contract.
const sharp=require('sharp'),crypto=require('node:crypto');
const VERSION=1;
const enabled=job=>job?.runtimeConfig?.technologyVisualVersion===VERSION;
// One definition shared with the brief form and brief reader (public/creative-ai/studio-model.js).
const M=require('../../../public/creative-ai/studio-model'),TECH=M.technologyPattern;
// Offers, prices, warranty, trial and replacement promises are never technology evidence.
const NOT_TECH=M.technologyExclusion;
const EXPLAINER=/technolog|feature explainer|how it works|construction|cutaway|inside the|layers?\b/i;
const isTech=text=>TECH.test(text||'')&&!NOT_TECH.test(text||'');
// Supported exact-SKU facts that describe construction or technology (identity records excluded).
function technologyFacts(facts){return (facts||[]).filter(f=>f.id!=='sku-selected-variant'&&isTech(f.text)).slice(0,6);}
// Product-page feature lines that describe the technology (brief form and brief reader defaults).
function technologyFeatures(features){return [...new Set((features||[]).map(v=>typeof v==='string'?v:v?.text||'').filter(isTech))].slice(0,3);}
// The SKU's official technology picture from its own saved product-library snapshot: A+ content
// first, then feature tiles, then supporting content; pictures naming the technology rank first.
// Icons, SVGs and tiny files are skipped. Gallery photos are product identity, not technology.
function imageCandidate(product){
 const usable=(product?.assets||[]).filter(a=>a.type==='image'&&a.status==='stored'&&a.file&&a.sha256&&['a-plus-content','tiles','supporting-content'].includes(a.group)&&!/svg/i.test(a.mime||a.file)&&Number(a.width)>=300&&Number(a.height)>=200);
 const rank=a=>(a.group==='a-plus-content'?0:a.group==='tiles'?1:2)*2+(TECH.test([a.label,a.url].join(' '))?0:1);
 const pick=usable.sort((a,b)=>rank(a)-rank(b))[0];
 return pick?{productId:product.id,brandId:product.brandId,url:pick.resolvedUrl||pick.url,sha256:pick.sha256,label:String(pick.label||'Official product page image').slice(0,160),group:pick.group,width:Number(pick.width),height:Number(pick.height)}:null;
}
const canonical=u=>{try{const p=new URL(u);return p.origin+p.pathname.replace(/\/$/,'');}catch{return null;}};
// Re-reads the pinned picture from the job's own brand and product snapshot and checks its hash.
// Another brand's or another SKU's picture is rejected.
async function loadImage(runtime,intake){
 const pin=intake?.technologyImage;if(!pin)return null;
 const products=runtime.brands?.products;if(!products)return null;
 if(pin.brandId&&pin.brandId!==intake.brandId)throw Error('Technology picture belongs to another brand');
 const profile=await products.read(intake.brandId,pin.productId);
 if(profile.brandId!==intake.brandId||canonical(profile.pageUrl)!==canonical(intake.productPageUrl))throw Error('Technology picture belongs to another product or brand');
 const image=await products.savedImage(intake.brandId,profile,pin.url),bytes=image.bytes||image.buffer;
 if(!Buffer.isBuffer(bytes)||crypto.createHash('sha256').update(bytes).digest('hex')!==pin.sha256)throw Error('Saved technology picture changed');
 const png=await sharp(bytes,{limitInputPixels:40000000}).resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).png().toBuffer();
 return {assetId:'technology-image',roles:['technology'],label:pin.label,sourceUrl:pin.url,sha256:pin.sha256,imageData:'data:image/png;base64,'+png.toString('base64')};
}
// Words printed on the official technology picture (10 Nov 2026, Quboid infographic): read once by the local
// text reader and offered as a citable fact, so real layer names can be cited. Number-only and low-confidence
// reads are ignored. Pinned with plan rules v1.
function pictureTextFact(rows){
 const words=[...new Set((rows||[]).filter(r=>(r?.confidence??1)>=0.3&&/\p{L}{2,}/u.test(r?.text||'')).map(r=>String(r.text).replace(/\s+/g,' ').trim()).filter(Boolean))];
 return words.length?{id:'technology-picture-text',text:('Words printed on the official technology picture: '+words.join('; ')).slice(0,1500),sourceIds:['official-technology-picture']}:null;
}
async function readPictureText(runtime,image){
 const fs=require('node:fs/promises'),path=require('node:path'),dir=await fs.mkdtemp(path.join(require('node:os').tmpdir(),'technology-text-')),file=path.join(dir,'technology.png');
 try{await fs.writeFile(file,Buffer.from(String(image.imageData).split(',')[1]||'','base64'));const read=await (runtime.labelOcr||require('./review').ocr)(file);return read?.status==='measured'?pictureTextFact(read.rows):null;}
 catch{return null;}finally{await fs.rm(dir,{recursive:true,force:true});}
}
function evidence(facts,image){const tech=technologyFacts(facts);return tech.length?{status:image?'available':'facts-only',factIds:tech.map(f=>f.id),image:image?{label:image.label,source:image.sourceUrl}:null}:{status:'missing',factIds:[]};}
const NOTES={missing:'This product\'s official page has no technology fact, so the design uses its strongest supported benefit instead of a technology.','facts-only':'The technology is named from the official product page, but no official technology picture was found in the saved product page, so the design shows no layers or cutaways.'};
const citesTech=(page,ids)=>(page?.copy||[]).some(c=>(c.factIds||[]).some(id=>ids.includes(id)));
const pageName=s=>[s.description?.name,s.description?.pdp?.name,s.description?.printSet?.label,s.jobInputs?.formatIntent?.direction].filter(Boolean).join(' ');
// Is this group a technology visual? Message type Technology, or a technology/feature-explainer page.
function applies(job,intake,selection){return enabled(job)&&(intake?.messageType==='Technology'||(selection||[]).some(s=>EXPLAINER.test(pageName(s))));}
// Packet section for non-A+ formats (A+ pages carry the same rule through their technology module).
function packetSection({job,intake,selection,facts,technologyImage,textPolicy}){
 if(!applies(job,intake,selection))return null;
 const e=evidence(facts,technologyImage),requested=intake?.messageType==='Technology';
 const pages=selection.map(s=>({id:s.id,explainer:EXPLAINER.test(pageName(s)),imageOnly:textPolicy(s)==='none'}));
 const technologyVisual={version:VERSION,requested,...e,pages,notes:NOTES[e.status]?[NOTES[e.status]]:[]};
 const rule={id:'technology-visual-v1',tier:'contract',sourceIds:['user:technology-visual-20261109'],text:'TECHNOLOGY VISUAL v1. '+(e.status==='missing'?'No supported technology fact exists for this exact SKU: say so in the plan and use its strongest supported benefit instead; never invent a technology, layers, cutaways or diagrams.':'Name the exact SKU technology word for word from a cited technology fact ('+e.factIds.join(', ')+') on '+(requested?(pages.length===1?'this page':'the technology page(s)'):'each technology or feature-explainer page')+'; do not substitute a generic benefit. '+(e.status==='available'?'The SKU\'s official technology picture is attached to the technology page(s) as evidence; show only what it shows.':'No official technology picture exists: use the fact text only and draw no layers or cutaways.')+' Never invent layers, cutaways or diagrams.')};
 return {technologyVisual,rule,technologyRef:e.status==='available'?technologyImage:null};
}
// Pages that receive the official picture: explainer pages, every page of a single-page Technology
// brief, image-only pages of a Technology brief, and any page whose copy cites a technology fact.
function pageGetsImage(input,page){
 const a=input?.aplus?.pages?.find(p=>p.id===page.id);if(a)return !!a.technologyImage;
 const t=input?.technologyVisual;if(t?.version!==VERSION||t.status!=='available')return false;
 const p=t.pages.find(x=>x.id===page.id);if(!p)return false;
 return p.explainer||t.requested&&(t.pages.length===1||p.imageOnly)||citesTech(page,t.factIds);
}
function validate(plan,input){
 const t=input?.technologyVisual;if(t?.version!==VERSION||t.status==='missing')return;
 const errors=[];
 for(const p of t.pages){const page=plan.pages.find(x=>x.id===p.id);if(p.explainer&&page?.copy.length&&!citesTech(page,t.factIds))errors.push(p.id+': a technology page must name the SKU technology from a cited technology fact');}
 const withCopy=plan.pages.filter(page=>page.copy.length);
 if(t.requested&&withCopy.length&&!withCopy.some(page=>citesTech(page,t.factIds)))errors.push('A Technology brief must name the SKU technology from a cited technology fact ('+t.factIds.join(', ')+'), not a generic benefit');
 if(errors.length)throw Error('Technology visual: '+errors.join('; '));
}
function promptLine(input,page,index){return pageGetsImage(input,page)?' Image '+index+' is the exact SKU\'s official technology picture from its product page: show the technology only as it shows it; never invent layers, cutaways or diagrams.':input?.technologyVisual?.version===VERSION?' Do not draw layers, cutaways or diagrams that the official evidence does not show.':'';}
module.exports={pictureTextFact,readPictureText,VERSION,TECH,NOTES,enabled,isTech,technologyFacts,technologyFeatures,imageCandidate,loadImage,evidence,applies,packetSection,pageGetsImage,validate,promptLine,citesTech};
