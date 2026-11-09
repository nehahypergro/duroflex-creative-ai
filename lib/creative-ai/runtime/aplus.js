'use strict';
// Amazon A+ content v1 (user decisions, 9 Nov 2026; docs/aplus-20261109.md).
// One A+ page is ONE coordinated set planned once: every module, in every required size,
// with short on-image text on wide panels, Amazon text fields and alt text in a copy deck.
// Pinned for NEW jobs only (runtimeConfig.aplusVersion 1). Jobs, packets, plans, request
// identities, reviews and budgets saved without the pin keep their own contract.
const sharp=require('sharp');
const VERSION=1,ALT_MAX=100,FILE_MAX=2*1024*1024;
const OFFER_NOTE='Amazon may reject prices or offers in A+ content.';
const WARRANTY_NOTE='Amazon may reject warranty or guarantee wording in A+ content.';
const enabled=job=>job?.runtimeConfig?.aplusVersion===VERSION;
const info=s=>s?.jobInputs?.aplus?.version===VERSION?s.jobInputs.aplus:null;
const isPage=selection=>Array.isArray(selection)&&selection.length>0&&selection.every(s=>info(s));

// ---- Wording rules -------------------------------------------------------------------------
// Never allowed in A+ (stripped, recorded): links, QR codes, contact details, customer reviews or
// ratings, best-seller / top-rated wording and competitor names. Offer, price, EMI, discount,
// warranty/guarantee and time-sensitive wording survive only when the brief supplies it word for
// word (time-sensitive wording also needs a supplied end date).
const COMPETITORS=/\b(wakefit|sleepwell|kurlon|the sleep company|sunday mattress|springfit|centuary|peps|nilkamal|sleepycat|emma|livpure|king ?koil|sealy|tempur|simmons|magic ?koil|coirfit|urban ladder|pepperfry|ikea)\b/i;
const BANNED=[
 ['link',/https?:\/\/|\bwww\.|\b[a-z0-9-]+\.(com|in|net|org|shop|store)\b/i],
 ['qr-code',/\bqr\b|\bscan (the|this|to|here)\b/i],
 ['contact',/\+?\d[\d -]{8,}\d|\b[\w.+-]+@[\w-]+\.[\w.]+|\b(call|whatsapp|sms|email|contact|message) (us|now)\b|toll[- ]free|customer care|helpline|store locator|visit (our|the|a|your nearest) store/i],
 ['customer-review',/\b(customer|user|buyer)s?'? (reviews?|ratings?)\b|\breviews?\b|\b(star|5[- ]star) ratings?\b|\btop[- ]rated\b|\brated \d|\b\d(\.\d)?\s?(\/\s?5|stars?)\b|★|testimonial|customers? (love|say|rate)/i],
 ['best-seller',/best[- ]?sell(er|ers|ing)|top[- ]?(selling|seller)|#\s?1\b|\bno\.?\s?1\b|number one|amazon'?s choice|most (popular|loved|bought)/i],
 ['competitor',COMPETITORS]
];
const OFFER=/₹|\brs\.?\s?\d|\binr\s?\d|\d+\s?%\s*(off|discount|cashback)|\b(flat|upto|up to|extra)\s+(₹|rs\.?\s?)?\d+|\bdiscounts?\b|\bcashback\b|\bcoupons?\b|\bno[- ]cost emi\b|\bemi\b|\bsale\b|\bmrp\b|\bprices?\b|\bpriced\b|\bdeals?\b|\b(special|festive|launch|bank|exchange|limited|exclusive|combo) offers?\b|\bsave (₹|rs|\d|up)|\bfree (gift|delivery|shipping|pillows?|installation)\b/i;
const WARRANTY=/\bwarrant(y|ies)\b|\bguarantee[ds]?\b|\b\d+[- ]?(day|night|year)s?[- ](free )?(trial|replacement|returns?)\b|\breplacement (policy|guarantee)\b/i;
const TIME=/\blimited[- ](time|period)\b|\bhurry\b|\bends? (soon|today|tonight)\b|\blast (few )?(days?|chance)\b|\btoday only\b|\bthis (week|weekend)\b|\bwhile stocks? last\b|\bvalid (till|until)\b|\bcountdown\b|\bexpires?\b|\boffer ends\b/i;
const DATE=/\b\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}\b|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/i;
const loose=t=>String(t||'').normalize('NFKC').toLowerCase().replace(/[“”"‘’'`]/g,'').replace(/[–—]/g,'-').replace(/\s+/g,' ').trim();
function suppliedText(input){return (input?.aplus?.supplied||[]).map(loose).filter(Boolean);}
function isSupplied(text,input){const t=loose(text).replace(/[.!]+$/,'');return !!t&&suppliedText(input).some(s=>s.includes(t));}
// Returns why a piece of wording may not appear in A+, or null when it may.
function problem(text,input){
 const value=String(text||'');if(!value.trim())return null;
 for(const [id,re] of BANNED)if(re.test(value))return id;
 const supplied=isSupplied(value,input);
 if(TIME.test(value)&&!(supplied&&input?.aplus?.suppliedEndDate))return 'time-sensitive';
 if(OFFER.test(value)&&!supplied)return 'offer-not-in-brief';
 if(WARRANTY.test(value)&&!supplied)return 'warranty-not-in-brief';
 return null;
}
const sentences=t=>String(t||'').split(/(?<=[.!?])\s+/).filter(s=>s.trim());
// Deterministic clean-up of a validated plan. Never mutates the saved planner output.
function clean(plan,input){
 if(input?.aplus?.version!==VERSION)return {plan,removed:[]};
 const out=structuredClone(plan),removed=[];
 for(const page of out.pages){
  page.copy=page.copy.filter(c=>{const why=problem(c.text,input);if(why)removed.push({pageId:page.id,field:'on-image '+c.role,text:c.text,reason:why});return !why;});
  if(typeof page.altText==='string'){const why=problem(page.altText,input);if(why){removed.push({pageId:page.id,field:'alt text',text:page.altText,reason:why});page.altText=sentences(page.altText).filter(s=>!problem(s,input)).join(' ');}}
 }
 for(const n of out.aplus?.native||[])for(const key of ['headline','body']){const why=problem(n[key],input);if(why){removed.push({unitId:n.unitId,field:'Amazon '+key,text:n[key],reason:why});n[key]=key==='body'?sentences(n[key]).filter(s=>!problem(s,input)).join(' '):'';}}
 if(out.aplus?.faq)out.aplus.faq=out.aplus.faq.filter(q=>{const why=problem(q.question,input)||problem(q.answer,input);if(why)removed.push({field:'FAQ',text:q.question,reason:why});return !why;});
 return {plan:out,removed};
}

// ---- Technology evidence ---------------------------------------------------------------------
// The technology panel uses the shared technology-visual rule (runtime/technology-visual.js), the
// same rule every other format follows; nothing here is A+-only.
const technology=require('./technology-visual');
const technologyFacts=technology.technologyFacts,technologyImageCandidate=technology.imageCandidate,loadTechnologyImage=technology.loadImage;

// ---- Planning packet --------------------------------------------------------------------------
const TEXT_RULES={
 panel:'Wide panel: short, large on-image text only: the product name, one short headline (8 words or fewer) and up to three feature chips (4 words or fewer each). At most 5 text blocks and 24 words. Readable on a phone.',
 mobile:'Mobile version (600 × 450) of its desktop panel: re-lay out the SAME words copied exactly from the desktop page (product name and headline, plus up to two chips) in larger type for a phone. Never a squashed desktop panel.',
 label:'Small image: no text, or one label of one to three words.',
 none:'No on-image words. Amazon places its own logo, headline and cards on this image.'
};
function packetSection({job,intake,selection,facts,technologyImage}){
 if(!enabled(job)||!isPage(selection))return null;
 const type=info(selection[0]).type,M=require('../../../public/creative-ai/studio-model'),summary=M.aplusSummary(type);
 if(!summary||selection.some(s=>info(s).type!==type))throw Error('A+ page modules belong to different page types');
 const pageId=n=>selection.find(s=>s.jobInputs?.formatIntent?.page===n)?.id||null;
 const hasTechModule=selection.some(s=>info(s).role==='technology');
 const technology=hasTechModule?require('./technology-visual').evidence(facts,technologyImage):{status:'not-applicable'};
 const supplied=(intake.aplusSuppliedText||[]).filter(t=>typeof t==='string'&&t.trim()).map(t=>t.trim().slice(0,5000));
 const units=summary.modules.flatMap(m=>m.units.map(u=>({unitId:u,moduleId:m.id,module:m.name,moduleType:m.moduleType,headline:m.limits.headline||0,body:m.limits.body||0}))).filter(u=>u.headline>0);
 const faq=summary.modules.find(m=>m.textOnly)?{min:3,max:5,question:summary.modules.find(m=>m.textOnly).limits.question,answer:summary.modules.find(m=>m.textOnly).limits.answer}:null;
 const pages=selection.map(s=>{const a=info(s),role=a.role==='technology'&&technology.status==='missing'?'benefit':a.role;
  return {id:s.id,module:a.module,moduleName:a.moduleName,role,unit:a.unit,device:a.device,textRule:a.textRule,logo:a.logo,pairOf:a.pairPage?pageId(a.pairPage):null,technologyImage:role==='technology'&&!!technologyImage};});
 const notes=[];
 if(technology.status==='missing')notes.push('This product\'s official page has no technology evidence, so the technology panel was replaced with a supported-benefit panel.');
 if(technology.status==='facts-only')notes.push(require('./technology-visual').NOTES['facts-only']);
 notes.push(...summary.later.map(x=>'Left out for now: '+x));
 const aplus={version:VERSION,type,name:summary.name,tier:summary.tier,imageCount:summary.imageCount,modules:summary.modules.map(({images,...m})=>m),units,faq,technology,supplied,suppliedEndDate:supplied.some(t=>DATE.test(t)),pages,altTextMax:ALT_MAX,notes};
 const moduleList=summary.modules.map(m=>m.name+(m.textOnly?' (text only)':'')).join(' → ');
 const rule={id:'aplus-page-v1',tier:'contract',sourceIds:['user:aplus-20261109'],text:'AMAZON A+ PAGE v1 ('+summary.name+'). Plan ONE story across every module in this order: '+moduleList+'. Each module has a distinct job; desktop and mobile pages of a module share its message. '
  +'ON-IMAGE TEXT per page textRule: panel = '+TEXT_RULES.panel+' mobile = '+TEXT_RULES.mobile+' label = '+TEXT_RULES.label+' none = '+TEXT_RULES.none+' The brand logo appears only on the hero (pages with logo true). '
  +'TECHNOLOGY: '+(technology.status==='missing'?'no technology evidence exists for this SKU; plan the technology module as a supported-benefit panel instead.':technology.status==='not-applicable'?'not part of this page type.':'the technology page must name the exact SKU technology word for word from a cited technology fact ('+technology.factIds.join(', ')+'). '+(technology.status==='available'?'The official technology picture is attached for that page only; show only what it shows.':'No official technology picture exists; do not draw layers or cutaways.')+' Never invent layers, cutaways or diagrams.')+' '
  +'NEVER ADD: links or URLs, QR codes, contact details, customer reviews or ratings, best-seller / top-rated / number-one wording, competitor names. Prices, offers, EMI, discounts and warranty or guarantee wording only when the brief supplies them word for word; time-sensitive words only with a supplied end date. No CTA buttons. '
  +'AMAZON TEXT FIELDS: write aplus.native with one entry per listed unit (headline and body within each unit\'s character limits; an image-only unit is not listed) and an altText for every page (what the image shows, '+ALT_MAX+' characters or fewer, no keyword lists).'+(faq?' Write aplus.faq: '+faq.min+'-'+faq.max+' short questions and answers (question '+faq.question+' and answer '+faq.answer+' characters or fewer), each citing the supported product facts it uses.':' aplus.faq stays empty.')};
 return {aplus,rule,technologyRef:technologyImage&&technology.status==='available'?technologyImage:null,notes};
}
function pageStructure(aplus,page,index,total){
 const p=aplus.pages.find(x=>x.id===page.id);if(!p)return null;
 return 'Amazon A+ '+aplus.name+' · '+p.moduleName+' ('+(p.device==='shared'?'image':p.device)+'), page '+(index+1)+' of '+total+'. '+TEXT_RULES[p.textRule]+(p.logo?' Use the approved brand logo once.':' No brand logo.')+(p.role==='technology'?(p.technologyImage?' Show the exact SKU technology as the attached official technology picture shows it; never invent layers or cutaways.':' Do not draw layers, cutaways or diagrams.'):'')+' No links, QR codes, contact details, ratings, reviews or competitor names. Finished flat artwork.';
}

// ---- Plan schema and validation ---------------------------------------------------------------
function extendSchema(schema,input){
 const a=input.aplus,str={type:'string'};
 schema.properties.pages.items.properties.altText=str;schema.properties.pages.items.required.push('altText');
 schema.properties.aplus={type:'object',additionalProperties:false,required:['native','faq'],properties:{
  native:{type:'array',minItems:a.units.length,maxItems:a.units.length,items:{type:'object',additionalProperties:false,required:['unitId','headline','body'],properties:{unitId:{type:'string',enum:a.units.map(u=>u.unitId)},headline:str,body:str}}},
  faq:{type:'array',minItems:a.faq?a.faq.min:0,maxItems:a.faq?a.faq.max:0,items:{type:'object',additionalProperties:false,required:['question','answer','factIds'],properties:{question:str,answer:str,factIds:{type:'array',items:str}}}}}};
 schema.required.push('aplus');
 return schema;
}
const words=t=>String(t||'').trim().split(/\s+/).filter(Boolean).length;
const chars=t=>[...String(t||'')].length;
function validate(rawPlan,input){
 const a=input.aplus;if(a?.version!==VERSION)return;
 const {plan}=clean(rawPlan,input),errors=[];
 const identity=new Set([input.product.id,input.product.variant?.id].filter(Boolean).map(String));
 const facts=new Set(input.product.facts.map(f=>f.id)),techIds=new Set(a.technology.factIds||[]);
 for(const page of plan.pages){
  const p=a.pages.find(x=>x.id===page.id);if(!p){errors.push('Unknown A+ page '+page.id);continue;}
  const n=page.copy.length,total=page.copy.reduce((s,c)=>s+words(c.text),0);
  if(p.textRule==='panel'&&(n<1||n>5||total>24||page.copy.some(c=>words(c.text)>8)))errors.push(page.id+': a wide panel needs 1-5 short text blocks (8 words or fewer each, 24 in total) after A+ wording rules');
  if(p.textRule==='label'&&(n>1||total>3))errors.push(page.id+': a small image carries no text or one label of 1-3 words');
  if(p.textRule==='mobile'){const desktop=plan.pages.find(x=>x.id===p.pairOf),allowed=new Set((desktop?.copy||[]).map(c=>loose(c.text)));if(n<1||n>Math.max(1,(desktop?.copy||[]).length)||page.copy.some(c=>!allowed.has(loose(c.text))))errors.push(page.id+': the mobile version must reuse text blocks copied exactly from its desktop page, no more than the desktop page has');}
  if(p.role==='hero'&&p.device!=='mobile'&&!page.copy.some(c=>c.factIds.some(id=>identity.has(String(id)))))errors.push(page.id+': the hero must name the product (cite the product or variant ID)');
  if(p.role==='technology'&&p.device!=='mobile'&&techIds.size&&!require('./technology-visual').citesTech(page,[...techIds]))errors.push(page.id+': the technology panel must name the SKU technology from a cited technology fact');
  if(typeof page.altText!=='string'||!page.altText.trim()||chars(page.altText)>ALT_MAX)errors.push(page.id+': alt text must describe the image in '+ALT_MAX+' characters or fewer');
 }
 const native=plan.aplus?.native||[];
 for(const u of a.units){const n=native.find(x=>x.unitId===u.unitId);if(!n||!n.headline.trim()||chars(n.headline)>u.headline||chars(n.body)>u.body)errors.push('Amazon text for '+u.unitId+' needs a headline of '+u.headline+' and a body of '+u.body+' characters or fewer');}
 if(a.faq){const faq=plan.aplus?.faq||[];if(faq.length<a.faq.min||faq.length>a.faq.max)errors.push('FAQ needs '+a.faq.min+'-'+a.faq.max+' questions after A+ wording rules');for(const q of faq)if(!q.question.trim()||!q.answer.trim()||chars(q.question)>a.faq.question||chars(q.answer)>a.faq.answer||!q.factIds.length||q.factIds.some(id=>!facts.has(id)&&!identity.has(String(id))))errors.push('FAQ answers need short wording and supported fact citations: '+q.question.slice(0,60));}
 else if((plan.aplus?.faq||[]).length)errors.push('This A+ page type has no FAQ');
 if(errors.length)throw Error('A+ plan: '+errors.join('; '));
}
// Planning record notes: offer/warranty warnings, technology fallback and removed wording.
function notes(plan,input,removed=[]){
 const a=input.aplus,out=[...a.notes];
 const texts=[...plan.pages.flatMap(p=>p.copy.map(c=>c.text)),...(plan.aplus?.native||[]).flatMap(n=>[n.headline,n.body]),...(plan.aplus?.faq||[]).flatMap(q=>[q.question,q.answer])];
 if(texts.some(t=>OFFER.test(t)))out.unshift(OFFER_NOTE);
 if(texts.some(t=>WARRANTY.test(t)))out.unshift(WARRANTY_NOTE);
 if(removed.length)out.push('Removed because Amazon does not allow it in A+ content: '+[...new Set(removed.map(r=>r.reason.replace(/-/g,' ')))].join(', ')+'.');
 return [...new Set(out)];
}

// ---- Files and copy deck ------------------------------------------------------------------------
// Amazon accepts JPG or PNG, RGB, 2 MB or less. Keep a PNG when it fits; otherwise make a JPEG
// at the same pixels, lowering quality step by step until it fits.
async function amazonFile(bytes){
 const base=()=>sharp(bytes,{limitInputPixels:40000000}).flatten({background:'#ffffff'}).toColourspace('srgb');
 const m=await sharp(bytes).metadata(),png=await base().png({compressionLevel:9}).toBuffer();
 if(png.length<=FILE_MAX)return {bytes:png,format:'png',width:m.width,height:m.height,fallback:false};
 for(const quality of [92,88,84,80,75,70,65,60]){const jpg=await base().jpeg({quality,mozjpeg:true}).toBuffer();if(jpg.length<=FILE_MAX)return {bytes:jpg,format:'jpeg',width:m.width,height:m.height,fallback:true,quality,pngBytes:png.length};}
 throw Error('This image cannot fit Amazon\'s 2 MB limit even as a JPEG');
}
const slug=t=>String(t||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function deckFromRecord(job,record){
 const a=record.input.aplus,plan=record.plan,pages=a.pages.map((p,i)=>{const page=plan.pages.find(x=>x.id===p.id),s=job.selection.find(x=>x.id===p.id),d=s?.description?.dimensions||{};
  return {index:i+1,placementId:p.id,module:p.module,moduleName:p.moduleName,unit:p.unit,device:p.device,width:d.width,height:d.height,altText:page?.altText||'',onImageText:(page?.copy||[]).map(c=>c.text),file:String(i+1).padStart(2,'0')+'-'+slug(p.moduleName)+'-'+slug(p.unit)+'-'+(p.device==='shared'?'image':p.device)+'-'+d.width+'x'+d.height};});
 return {version:VERSION,jobId:job.id,brandId:job.intake.brandId,page:{type:a.type,name:a.name,tier:a.tier,imageCount:a.imageCount},notes:job.aplus?.notes||a.notes,
  modules:a.modules.map(m=>({id:m.id,name:m.name,moduleType:m.moduleType,role:m.role,textOnly:m.textOnly,limits:m.limits,native:(plan.aplus?.native||[]).filter(n=>m.units.includes(n.unitId)),images:pages.filter(p=>p.module===m.id)})),
  faq:(plan.aplus?.faq||[]).map(({question,answer})=>({question,answer})),limits:{altText:ALT_MAX,fileBytes:FILE_MAX,formats:['png','jpeg'],colour:'RGB'},
  basis:'Studio caps are Amazon\'s documented limits where verified and shorter conservative caps elsewhere. Upload and Amazon approval are separate.'};
}
// The saved plan of a job's A+ set, hash-checked through its immutable planning records.
async function deck(runtime,job){
 if(!enabled(job))return null;
 const fs=require('./artifact-fs'),path=require('node:path'),dir=runtime.store.dir(job.id),hash=b=>require('crypto').createHash('sha256').update(b).digest('hex');
 let manifest;try{manifest=await fs.readJson(path.join(dir,'image-queue.json'));}catch(e){if(e.code==='ENOENT')return null;throw e;}
 if(manifest.jobId!==job.id||manifest.brandId!==job.intake.brandId)throw Error('A+ copy deck belongs to another project');
 for(const unit of manifest.units||[]){if(!/^image-queue-[a-f0-9]{24}\.json$/.test(unit.file))continue;const record=await fs.readJson(path.join(dir,unit.file));if(hash(JSON.stringify(record))!==unit.hash)throw Error('Saved A+ plan changed');if(record.input?.aplus?.version===VERSION){require('./lean-workflow').validateRecord(job,record);return deckFromRecord(job,record);}}
 return null;
}
const csvCell=v=>{const s=String(v??'');return '"'+(/^[=+\-@\t\r]/.test(s)?"'"+s:s).replace(/"/g,'""')+'"';};
function deckCsv(d){
 const rows=[['module','module type','unit','field','text','limit','characters','image file']];
 for(const m of d.modules){for(const n of m.native)for(const key of ['headline','body'])rows.push([m.name,m.moduleType||'',n.unitId,'Amazon '+key,n[key],m.limits[key]||'',[...n[key]].length,'']);
  for(const i of m.images){rows.push([m.name,m.moduleType||'',i.unit,'alt text ('+i.device+')',i.altText,d.limits.altText,[...i.altText].length,i.file]);for(const t of i.onImageText)rows.push([m.name,m.moduleType||'',i.unit,'on-image text ('+i.device+')',t,'','',i.file]);}}
 for(const [i,q] of d.faq.entries()){rows.push(['FAQ','',('faq-'+(i+1)),'question',q.question,120,[...q.question].length,'']);rows.push(['FAQ','',('faq-'+(i+1)),'answer',q.answer,300,[...q.answer].length,'']);}
 for(const n of d.notes)rows.push(['Note','','','note',n,'','','']);
 return rows.map(r=>r.map(csvCell).join(',')).join('\r\n');
}
// Zip entries for a package: Amazon-ready files (PNG, or JPEG when over 2 MB), the copy deck as JSON
// and CSV, and a short README. images: [{placementId, bytes}] chosen by the existing package flow.
async function packageEntries(d,images,prefix='amazon-a-plus/'){
 const entries=[],files=[];
 for(const img of images){const page=d.modules.flatMap(m=>m.images).find(p=>p.placementId===img.placementId);if(!page)continue;const f=await amazonFile(img.bytes),name=prefix+'upload/'+page.file+(f.format==='png'?'.png':'.jpg');entries.push({name,bytes:f.bytes});files.push({placementId:img.placementId,file:name,format:f.format,bytes:f.bytes.length,width:f.width,height:f.height,jpegFallback:f.fallback,...(f.fallback?{pngBytes:f.pngBytes,quality:f.quality}:{})});}
 const deckOut={...d,files};
 entries.push({name:prefix+'copy-deck.json',bytes:JSON.stringify(deckOut,null,2)},{name:prefix+'copy-deck.csv',bytes:deckCsv(d)});
 entries.push({name:prefix+'README.txt',bytes:d.page.name+' for Amazon\n\nupload/ has every image at its Amazon size as PNG, or JPEG when the PNG is over 2 MB (RGB, 2 MB or less).\ncopy-deck.csv and copy-deck.json have the Amazon text fields (headline and body per module), alt text for every image'+(d.faq.length?', the FAQ':'')+' and the words already on each image.\n'+(d.notes.length?'\nNotes:\n- '+d.notes.join('\n- ')+'\n':'')+'\nUploading the page and Amazon\'s approval happen separately in Seller/Vendor Central.\n'});
 return {entries,files};
}
module.exports={VERSION,ALT_MAX,FILE_MAX,OFFER_NOTE,WARRANTY_NOTE,TEXT_RULES,enabled,info,isPage,problem,isSupplied,clean,technologyFacts,technologyImageCandidate,loadTechnologyImage,packetSection,pageStructure,extendSchema,validate,notes,amazonFile,deckFromRecord,deck,deckCsv,packageEntries};
