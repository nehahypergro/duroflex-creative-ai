'use strict';
// Google Display banners v1 (user request, 9 Nov 2026; docs/display-banners-20261109.md).
// One click makes a whole set of Google Ads *uploaded image ads* (fixed sizes, 150 KB each), planned
// once: the same headline and call to action on every size, re-laid out per shape. Uploaded image ads
// carry their own words and CTA, so text is on the image. Pinned for NEW lean jobs only
// (runtimeConfig.displayBannersVersion 1); jobs saved without it keep their own contract.
//
// Extreme shapes: gpt-image-2 draws at most 3:1 (placements.generationSize). Every banner is drawn at
// its nearest supported shape and the planner and image prompt are told the exact band that is kept
// (the existing FINAL EXPORT CROP CONTRACT). The fit keeps that band with even scaling only; banner
// pages never use the mirror-extend fallback. Shapes that keep less than 75% of the drawn picture
// ("strip" sizes, e.g. 728 x 90 keeps ~36%) are left out of the standard set until a paid run shows
// the result is good enough; the user can add them as an untested option.
const sharp=require('sharp');
const VERSION=1,FILE_MAX=150000,MIN_QUALITY=60,BAND_MIN=0.75;
const SOURCES={sizes:'https://support.google.com/google-ads/answer/1722096',quality:'https://support.google.com/adspolicy/answer/14848199',design:'https://support.google.com/adspolicy/answer/15937463'};
const M=()=>require('../../../public/creative-ai/studio-model');
const enabled=job=>job?.runtimeConfig?.displayBannersVersion===VERSION;
const info=s=>s?.jobInputs?.displayBanner?.version===VERSION?s.jobInputs.displayBanner:null;
const isSet=selection=>Array.isArray(selection)&&selection.length>0&&selection.every(s=>info(s));

// How a size is drawn: 'native' (the model draws this shape), 'band' (drawn wider/taller, at least
// 75% kept) or 'strip' (less than 75% kept). The band is in model-canvas pixels.
function shape(width,height){
 const g=require('./placements').generationSize(width,height),kept=g.crop.width*g.crop.height/(g.width*g.height);
 return {generation:g.size,generationWidth:g.width,generationHeight:g.height,band:{x:Math.round(g.crop.x),y:Math.round(g.crop.y),width:Math.round(g.crop.width),height:Math.round(g.crop.height)},kept:Math.round(kept*100)/100,mode:kept>=0.98?'native':kept>=BAND_MIN?'band':'strip'};
}
// Per-size text budget, from the shared readability classes (micro-banner / compact-banner / display-card).
const LIMITS={card:{blocks:4,words:20,headline:7},compact:{blocks:3,words:14,headline:6},micro:{blocks:3,words:10,headline:5}};
function textClass(id,width,height){const c=require('./readability').policyFor({id,width,height}).classId;return c==='micro-banner'?'micro':c==='compact-banner'?'compact':'card';}

// ---- Wording ------------------------------------------------------------------------------------
// Removed and recorded (shared wording checks in aplus.js): links, QR codes, contact details, customer
// ratings or reviews, best-seller wording, competitor names; offers/prices/EMI only word for word from
// the brief, time-limited words only with a supplied end date. Warranty and other facts from the
// official product page stay (client-approved source evidence).
function problem(text,input){const why=require('./aplus').problem(text,{aplus:{supplied:input.displayBanners.supplied,suppliedEndDate:input.displayBanners.suppliedEndDate}});return why==='warranty-not-in-brief'?null:why;}
// Google: download/install buttons and controls that do not work (close, play) are misleading design.
const BAD_CTA=/\b(download|install|play|close|skip|unmute|watch)\b|[×✕]/i;
const isCta=role=>/\b(cta|call.to.action|button|action)\b/i.test(String(role||''));
const isHeadline=role=>/headline/i.test(String(role||''))&&!isCta(role);
const loose=t=>String(t||'').normalize('NFKC').toLowerCase().replace(/[“”"‘’'`]/g,'').replace(/[–—]/g,'-').replace(/[.!]+$/,'').replace(/\s+/g,' ').trim();
const words=t=>String(t||'').trim().split(/\s+/).filter(Boolean).length;
// Deterministic clean-up of a validated plan. Never mutates the saved planner output.
function clean(plan,input){
 if(input?.displayBanners?.version!==VERSION)return {plan,removed:[]};
 const out=structuredClone(plan),removed=[];
 for(const page of out.pages)page.copy=page.copy.filter(c=>{const why=problem(c.text,input);if(why)removed.push({pageId:page.id,field:'on-image '+c.role,text:c.text,reason:why});return !why;});
 return {plan:out,removed};
}
function validate(rawPlan,input){
 const b=input.displayBanners;if(b?.version!==VERSION)return;
 const {plan}=clean(rawPlan,input),errors=[],heads=new Set(),ctas=new Set();
 for(const page of plan.pages){
  const p=b.pages.find(x=>x.id===page.id);if(!p){errors.push('Unknown banner page '+page.id);continue;}
  const limit=LIMITS[p.textClass],cta=page.copy.filter(c=>isCta(c.role)),head=page.copy.filter(c=>isHeadline(c.role)),total=page.copy.reduce((n,c)=>n+words(c.text),0);
  if(cta.length!==1||words(cta[0].text)<1||words(cta[0].text)>3)errors.push(p.name+' '+p.width+'x'+p.height+': needs exactly one call to action of 1-3 words');
  else if(BAD_CTA.test(cta[0].text))errors.push(p.name+': the call to action must not be a download, install, play or close control');
  else ctas.add(loose(cta[0].text));
  if(head.length!==1||words(head[0].text)>limit.headline)errors.push(p.name+': needs one headline of '+limit.headline+' words or fewer');else heads.add(loose(head[0].text));
  if(page.copy.length>limit.blocks||total>limit.words)errors.push(p.name+' '+p.width+'x'+p.height+': over its text budget ('+limit.blocks+' text blocks, '+limit.words+' words at most)');
 }
 if(heads.size>1)errors.push('Every banner size must carry the same headline, word for word');
 if(ctas.size>1)errors.push('Every banner size must carry the same call to action, word for word');
 if(b.cta&&ctas.size===1&&!ctas.has(loose(b.cta)))errors.push('Use the supplied call to action word for word: '+b.cta);
 if(errors.length)throw Error('Display banner plan: '+errors.join('; '));
}
function notes(plan,input,removed=[]){
 const out=[...input.displayBanners.notes];
 if(removed.length)out.push('Removed from the banners: '+[...new Set(removed.map(r=>r.reason.replace(/-/g,' ')))].join(', ')+'.');
 return [...new Set(out)];
}

// ---- Planning packet ----------------------------------------------------------------------------
const POLICY_TEXT='GOOGLE UPLOADED IMAGE AD: the artwork fills the whole banner edge to edge with an opaque background (no blank, transparent or framed areas; nothing sideways or blurred); the planned words are sharp and readable at actual size; one call to action is shown as a clearly labelled button in proportion to the ad, never the largest element; no fake close, play, download or install controls, system-warning styles, cursor or click arrows, flashing effects, or layouts that look like more than one ad; the brand logo and the call to action sit completely inside the banner.';
function packetSection({job,intake,selection}){
 if(!enabled(job)||!isSet(selection))return null;
 // displayBannerFitVersion 1 (redo run, 9 Nov 2026): band sizes keep the whole drawing (plain-edge fill)
 // and every size gets a safe margin; strip sizes (opt-in, untested) keep the band crop.
 const fitV1=job?.runtimeConfig?.displayBannerFitVersion===1;
 const pages=selection.map((s,i)=>{const b=info(s),geo=shape(b.width,b.height);return {id:s.id,slug:b.slug,name:b.name,width:b.width,height:b.height,group:b.group,top:!!b.top,index:i+1,mode:geo.mode,generation:geo.generation,band:geo.band,kept:geo.kept,textClass:textClass(s.id,b.width,b.height),...(fitV1?{fit:geo.mode==='band'?'extend':geo.mode==='strip'?'band':'native'}:{})};});
 const supplied=(intake.displayBannersSuppliedText||[]).filter(t=>typeof t==='string'&&t.trim()).map(t=>t.trim().slice(0,5000));
 const cta=typeof intake.displayBannersCta==='string'&&intake.displayBannersCta.trim()?intake.displayBannersCta.trim().slice(0,40):'';
 const DATE=/\b\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}\b|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/i;
 const all=M().displayBannerSizes,chosen=new Set(pages.map(p=>p.slug)),strips=pages.filter(p=>p.mode==='strip'),left=all.filter(s=>s.strip&&!chosen.has(s.slug)),list=x=>x.map(p=>p.width+' × '+p.height+' '+p.name).join(' and ');
 const notesOut=[];
 if(strips.length)notesOut.push(list(strips)+' '+(strips.length>1?'are':'is')+' made with a strip layout: the image model draws a wider picture and only its middle band is kept ('+strips.map(p=>Math.round(p.kept*100)+'%').join(' and ')+'). These sizes have not been checked in a paid run yet, so look at them closely before use.');
 if(left.length)notesOut.push('Left out of the standard set: '+list(left)+' (strip sizes the image model cannot draw directly). Choose "Standard set + strip sizes" to try them.');
 const displayBanners={version:VERSION,...(fitV1?{fitVersion:1}:{}),name:'Google Display banner set',imageCount:pages.length,pages,supplied,suppliedEndDate:supplied.some(t=>DATE.test(t)),cta,fileMaxBytes:FILE_MAX,limits:LIMITS,sources:SOURCES,notes:notesOut};
 const sizes=pages.map(p=>p.id.replace('custom:studio-display-','')+' = '+p.width+'x'+p.height+' '+p.textClass+(p.mode==='native'?'':' ('+p.mode+')')).join('; ');
 const plan='GOOGLE DISPLAY BANNER SET v1 (Google Ads uploaded image ads; every size is its own complete ad). Plan ONE message for all '+pages.length+' sizes: the SAME headline (copy role "headline") and the SAME call to action (role "cta") on every page, word for word; adapt only the layout and the optional supporting line (role "supporting") or supplied offer (role "offer") to each size. Text budget per page: card = up to 4 blocks and 20 words (headline 7 words or fewer); compact = up to 3 blocks and 14 words (headline 6 or fewer); micro = up to 3 blocks and 10 words (headline 5 or fewer). Pages: '+sizes+'. '
  +'CALL TO ACTION: exactly one per page, 1-3 words, a truthful action the landing page fulfils'+(cta?'; use the supplied wording "'+cta+'" word for word':'')+'; never download, install, play or close. '
  +'Brand logo on every size and the exact product recognisable at 1:1 pixels; one dominant subject; very few words. Offers, prices, EMI and discounts only word for word from the brief; time-limited words only with a supplied end date. Never add links, QR codes, phone numbers, ratings or reviews, best-seller claims or competitor names. '
  +(fitV1?'Every size keeps the whole product, the complete logo, every word and the button inside the banner with a clear margin from every edge. Band pages are drawn at the nearest supported shape and then lengthened with their own plain background colour at the two ends: plan a layout that keeps those ends a plain background. Strip pages are drawn on a wider model canvas and only a central band is kept: plan a single-row layout that fits that band.':'Band and strip pages are drawn on a wider (or taller) model canvas and only a central band is kept: plan a single-row (or single-column) layout that fits that band.');
 const rule={id:'display-banner-policy-v1',tier:'contract',sourceIds:['user:display-banners-20261109'],text:POLICY_TEXT};
 return {displayBanners,plan,rule};
}
function pageStructure(b,page){
 const p=b.pages.find(x=>x.id===page.id);if(!p)return null;
 const wide=p.width/p.height>=2.5,tall=p.height/p.width>=2;
 const layout=p.mode==='strip'||wide?'Lay out logo, product, headline and call to action in one row, left to right.':tall?'Stack logo, headline, product and call to action top to bottom in one column.':'Logo, product, headline and call to action in a clear hierarchy.';
 return 'Google Display uploaded image ad · '+p.name+' '+p.width+' × '+p.height+' (image '+p.index+' of '+b.pages.length+'). The artwork fills the entire canvas with an opaque background; no border frame or ad-within-an-ad. Render only the planned words, large enough to read at actual size. The call to action is one clear button-shaped label with the planned words, in proportion to the ad. Never draw close, play, download or install controls, cursors, click arrows or system-warning styles. Use the brand logo once, fully inside the banner. '+layout
  +(b.fitVersion===1?' Keep the whole product, the complete logo, every word and the button inside the banner with a clear margin from every edge; nothing touches or runs off an edge.':'')
  +(p.fit==='extend'?' The Studio lengthens this picture to the final '+p.width+' × '+p.height+' size by continuing its background at the '+(p.width>p.height?'left and right':'top and bottom')+' ends, so keep those two ends a plain, flat background colour with no product, logo, words, pattern or objects touching them.'
   :p.mode==='native'?'':' '+require('./placements').generationInstruction(p.width,p.height)+' Keep the logo and call to action fully inside that rectangle with a small margin.');
}
// Banner pages keep the planned band: even scaling plus a centred trim, never the mirror-extend fallback.
// Only pinned jobs get a banner packet, so the saved planning record alone decides.
function fitOptions(record){
 const page=record?.input?.displayBanners?.version===VERSION?record.input.displayBanners.pages.find(p=>p.id===record.placementId):null;
 return !page?{}:page.fit==='extend'?{extendFlat:true}:{maxTrimShape:Infinity};
}

// ---- Files ----------------------------------------------------------------------------------------
// Google accepts GIF, JPG or PNG up to 150 KB. Keep an opaque PNG when it fits; otherwise a JPEG at the
// same pixels, stepping quality down to MIN_QUALITY. A file that still does not fit is flagged, never
// resized below the exact pixels.
async function bannerFile(bytes,{maxBytes=FILE_MAX}={}){
 const base=()=>sharp(bytes,{limitInputPixels:40000000}).flatten({background:'#ffffff'}).toColourspace('srgb');
 const m=await sharp(bytes).metadata(),png=await base().png({compressionLevel:9,adaptiveFiltering:true}).toBuffer();
 if(png.length<=maxBytes)return {bytes:png,format:'png',width:m.width,height:m.height,overLimit:false};
 let last=null;
 for(const quality of [92,88,84,80,76,72,68,64,MIN_QUALITY]){last={quality,bytes:await base().jpeg({quality,mozjpeg:true}).toBuffer()};if(last.bytes.length<=maxBytes)return {bytes:last.bytes,format:'jpeg',width:m.width,height:m.height,quality,pngBytes:png.length,overLimit:false};}
 return {bytes:last.bytes,format:'jpeg',width:m.width,height:m.height,quality:last.quality,pngBytes:png.length,overLimit:true};
}
const folder=group=>String(group||'other').toLowerCase().replace(/[^a-z0-9]+/g,'-');
// Zip entries: google-display/<group>/<W>x<H>-<size>.png|jpg, sizes.csv and a README.
// images: [{placementId, bytes}] chosen by the existing package flow.
async function packageEntries(images,prefix='google-display/'){
 const sizes=M().displayBannerSizes,entries=[],files=[];
 for(const img of images){const slug=String(img.placementId||'').replace('custom:studio-display-',''),s=sizes.find(x=>x.slug===slug);if(!s)continue;
  const f=await bannerFile(img.bytes),file=prefix+folder(s.group)+'/'+s.width+'x'+s.height+'-'+s.slug+(f.format==='png'?'.png':'.jpg');
  entries.push({name:file,bytes:f.bytes});files.push({placementId:img.placementId,file,name:s.name,group:s.group,width:f.width,height:f.height,exactSize:f.width===s.width&&f.height===s.height,format:f.format,bytes:f.bytes.length,...(f.quality?{jpegQuality:f.quality}:{}),overLimit:f.overLimit});}
 const csv=[['size','name','group','file','format','bytes','limit bytes','within limit'],...files.map(f=>[f.width+'x'+f.height,f.name,f.group,f.file,f.format,f.bytes,FILE_MAX,f.bytes<=FILE_MAX&&!f.overLimit?'yes':'NO'])].map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const over=files.filter(f=>f.overLimit||f.bytes>FILE_MAX);
 entries.push({name:prefix+'sizes.csv',bytes:csv},{name:prefix+'README.txt',bytes:'Google Display banners (uploaded image ads)\n\nEach folder groups one family of sizes; every file name starts with its exact size in pixels.\nFiles are PNG, or JPEG when the PNG is over Google\'s 150 KB limit (quality stepped down, never resized).\n'+(over.length?'\nOVER THE 150 KB LIMIT (re-export before upload): '+over.map(f=>f.file).join(', ')+'\n':'')+'\nUpload these in Google Ads as image ads. Google reviews every ad; upload and approval are separate.\nSizes and limits: '+SOURCES.sizes+'\n'});
 return {entries,files};
}
module.exports={VERSION,FILE_MAX,MIN_QUALITY,BAND_MIN,LIMITS,SOURCES,POLICY_TEXT,enabled,info,isSet,shape,textClass,problem,clean,validate,notes,packetSection,pageStructure,fitOptions,bannerFile,packageEntries};
