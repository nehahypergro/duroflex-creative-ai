'use strict';
// Marketing rules v1 (user decision, 11 Nov 2026, after the marketing-manager review of the 52-card Sleepyhead
// Sofa Drip Pro batch: "one ad repeated 52 times"). New lean jobs pin marketingRulesVersion 1:
//  2. Fresh headlines across a product's campaign, not only within one set: the planner sees this brand's recent
//     headlines for the same product (saved per brand, never shared) and avoids repeating them or their overused
//     opening words; an exact repeat or an overused opening fails the plan check (the planner's repair fixes it).
//  3. A short product name in ad copy ("Sofa Drip Pro"); the full catalogue name only on marketplace, product-page,
//     A+ and close-reading pages.
//  5. A feature that is the page's message is shown working in the picture (checked by the image check).
//  6. Story safe zones (top 14%, bottom 20% free of words, logo and button; measured by the local text reader) and
//     bigger minimum text for wide website images and distance print (standees, wall graphics, posters).
//  7. A free spelling check: the local text reader compares the finished words with the planned words; a misspelt
//     word blocks "Ready" and goes to the single correction.
//  8. Warranty wording: "3-year warranty", without the word "conditional" (user decision, 11 Nov 2026).
// Earlier jobs keep their saved contracts.
const fs=require('node:fs/promises'),path=require('node:path');
const VERSION=1,COPY_ID='campaign-copy-v1',FEATURE_ID='feature-demonstration',STORY_ID='story-safe-zone';
const STORY={top:0.14,bottom:0.20};
const HISTORY_DAYS=30,HISTORY_LIMIT=40,HISTORY_KEEP=400;
const formatClass=s=>require('./objective-playbook').formatClass(s);
// Indian scripts (live test, 17 Nov 2026): vowel signs and nukta are marks (\p{M}); without them a 4-word Hindi
// headline split into 9 "words" and failed planning.
const words=t=>String(t||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu,' ').trim();
const headlineRole=role=>/head|title/i.test(role||'')&&!/product|name|cta|call/i.test(role||'');
const SKIP_OPENING=new Set(['the','a','an']);
const opening=text=>words(text).split(' ').find(w=>w&&!SKIP_OPENING.has(w))||'';

// ---- 3: short product name ----
// "Sofa Drip Pro - 3 Seater Sofa (Fabric, Coco Brown)" -> "Sofa Drip Pro". null when the name is already short.
function shortName(name){
 const full=String(name||'').replace(/\s+/g,' ').trim();
 const short=full.replace(/\([^)]*\)/g,' ').split(/\s[-–—|:]\s/)[0].replace(/\s+/g,' ').replace(/[\s,.;:]+$/,'').trim();
 // A one-word remainder ("Original - 3 Layered BodyIQ ...") does not name the product: keep the full name.
 return short&&short.split(' ').length>=2&&short!==full?short:null;
}
// ---- Ad name v1 (client feedback for Duroflex and Sleepyhead, relayed by Neha on 25 Nov 2026: "No need of writing full
// product name or mention variant name (example 6.8 etc)"). New lean jobs pin adNameVersion 1. The local variety batch
// printed "Duropedic Airboost 6.8 / Arctic Ice Mattress", "Quboid Arctic Ice Qube Cell Technology Mattress", "Cocoon Cool
// Grey Fabric 3 Seater Sofa" and "Sofa Yolo 3+2 Seater Set": the short name above only cut at a spaced dash or bracket, so
// most Duroflex names stayed whole. The ad name is the product's own name words up to the first number, model code, colour,
// size, seat count, material or type word ("Duropedic Airboost", "Quboid", "Cocoon", "Sofa Yolo", "Recliner RX6"; a name
// that ends in its type keeps it: "Spine Contour Pillow"). Ad pages name the product only that way; the plan check refuses
// the ad name followed by a variant (a number, colour, size or seat count from the name) or by two more catalogue words,
// and a model number such as "6.8" anywhere. Marketplace, product-page, A+ and close-reading pages are unchanged.
const AD_NAME_VERSION=1;
const TYPE=new Set(['sofa','sofas','mattress','mattresses','topper','toppers','pillow','pillows','protector','recliner','comforter','cushion','cushions','bed','lounger','set']);
const DESCRIPTOR=new Set([...TYPE,'seater','seat','seats','fabric','leatherette','leather','memory','foam','latex','pocket','spring','springs','orthopedic','orthopaedic','coir','natural','waterproof','water','stain','repellent','premium','dual','sided','single','double','queen','king','size','with','technology','lightweight','travel','reversible','microfiber','layered','euro','top','cum','lh','rh','lhs','rhs','shape','inch','inches','cm','cover','filler','fillers','and','for','of']);
const COLOUR=new Set(['grey','gray','brown','yellow','honey','white','black','blue','green','pink','red','orange','teal','rose','beige','cream','ivory','taupe','tan','olive','navy','indigo','sapling','sesame','stone','coco','pine','canyon','gunmetal','golden','tobacco','lilly','lily','coffee','ash','cool','warm','arctic','ice','nickel','pumice','feather','simply','brushed','charcoal','mocha','sand','rust','mustard','silver','gold']);
const VARIANT_WORDS=new Set(['seater','seat','seats','queen','king','single','double','size','inch','inches','cm']);
const adTokens=t=>String(t||'').toLowerCase().match(/[\p{L}\p{M}][\p{L}\p{M}\p{N}]*(?:\.[\p{L}\p{M}\p{N}]+)*|\d+(?:[.+x/]\d+)*%?/gu)||[];
const firstPart=name=>String(name||'').replace(/\([^)]*\)/g,' ').split(/\s[-–—|:+]|,|\|/)[0].replace(/\s+/g,' ').trim();
const stopper=w=>{const k=w.toLowerCase().replace(/[^\p{L}\p{M}\p{N}.+%]/gu,'');return /^\d/.test(k)||/\p{L}\.\p{L}/u.test(k)||DESCRIPTOR.has(k)||COLOUR.has(k);};
function adName(name){
 const part=firstPart(name),words=part.split(' ').filter(Boolean);if(!words.length)return String(name||'').trim();
 if(stopper(words[0]))return part; // a type-led or generic name ("Sofa Drip Pro", "Memory Foam Topper") stays as it is
 let i=1;while(i<words.length&&!stopper(words[i]))i++;
 if(i===words.length)return part;
 const stop=words[i].toLowerCase().replace(/[^\p{L}]/gu,'');
 // A one-word name followed by its type ("Napster Sofa", "Headboard Cushion"), or a name that ends in its type
 // ("Spine Contour Pillow", "All Weather Comforter"), keeps the type word.
 if(TYPE.has(stop)&&(i===1||i===words.length-1))return words.slice(0,i+1).join(' ');
 return words.slice(0,i).join(' ');
}
// The words the plan check treats as a variant or the rest of the catalogue name (precomputed into the planner input).
function adNameData(product){
 const name=product?.name||'',ad=adName(name),adSet=new Set(adTokens(ad)),all=adTokens(name);
 const variant=/^default title$/i.test(String(product?.variant?.name||'').trim())?[]:adTokens(product?.variant?.name);
 const extra=[...new Set(all.filter(t=>!adSet.has(t)))];
 const markers=[...new Set([...extra.filter(t=>/^\d/.test(t)||/\p{L}\.\p{L}/u.test(t)||COLOUR.has(t)||VARIANT_WORDS.has(t)),...variant.filter(t=>!adSet.has(t)&&(/^\d/.test(t)||VARIANT_WORDS.has(t)||COLOUR.has(t)))])];
 const models=[...new Set([...all,...variant].filter(t=>!adSet.has(t)&&(/^\d+\.\d+$/.test(t)||/\p{L}\.\p{L}/u.test(t))))];
 // Colour names: two or more colour words in a row in the name or variant ("Sesame Grey", "Arctic Ice", "Coco Brown").
 const colours=[];for(const list of [all,variant]){let run=[];for(const t of [...list,'']){if(COLOUR.has(t)&&!adSet.has(t))run.push(t);else{if(run.length>=2)colours.push(run.join(' '));run=[];}}}
 return {version:AD_NAME_VERSION,adName:ad,fullName:name,tokens:[...adSet].length?adTokens(ad):[],extra,markers,models,colours:[...new Set(colours)]};
}
// The brief's own exact offer wording (never the offer product): it is reproduced word for word, so it is not checked.
function offerWording(input){const out=[];for(const m of String(input?.assignment?.brief||'').matchAll(/(?:^|\n)Asset-specific inputs: (\{[^\n]*\})/g)){let v;try{v=JSON.parse(m[1]);}catch{continue;}if(v.promotionMode&&v.promotionMode!=='Yes')continue;if(typeof v.offer==='string'&&v.offer.trim())out.push(v.offer.trim());}return out;}
// allowed: the text of the facts this copy line cites (a fact may itself name "Arctic Ice" or a number).
function adNameProblem(text,a,offers=[],allowed=''){
 let t=String(text||'');for(const o of offers)t=t.split(o).join(' ');
 const toks=adTokens(t),n=a.tokens.length,ok=' '+adTokens(allowed).join(' ')+' ',has=(list,phrase)=>(' '+list.join(' ')+' ').includes(' '+phrase+' ');
 for(const m of a.models)if(toks.includes(m)&&!ok.includes(' '+m+' '))return 'drop the model number "'+m+'"';
 for(const c of a.colours||[])if(has(toks,c)&&!ok.includes(' '+c+' '))return 'drop the colour name "'+c+'"';
 if(!n)return null;
 // The name ends at punctuation or a line break ("Quboid: Qube Cell Technology" names a feature, not the variant).
 for(const segment of t.split(/[\n:;,.·•|/()–—!?]+|\s-\s/)){const seg=adTokens(segment);
  for(let i=0;i+n<=seg.length;i++){if(!a.tokens.every((w,j)=>seg[i+j]===w))continue;
   const next=seg.slice(i+n,i+n+3);
   if(next.length&&a.markers.includes(next[0]))return 'drop "'+next.filter((w,j)=>j===0||a.extra.includes(w)).join(' ')+'" after it';
   if(next.length>=2&&a.extra.includes(next[0])&&a.extra.includes(next[1]))return 'drop "'+next.filter(w=>a.extra.includes(w)).join(' ')+'" after it';}}
 return null;
}
const stripParens=name=>String(name||'').replace(/\([^)]*\)/g,' ').replace(/\s+/g,' ').replace(/[\s,.;:]+$/,'').trim();
const FULL_NAME_CLASSES=new Set(['marketplace','close-read']);
function fullNamePage(input,s){return !!input.aplus||FULL_NAME_CLASSES.has(formatClass(s));}

// ---- 2: this brand's recent headlines for the same product ----
function historyFile(root,brandId){if(!/^brand-[a-z0-9-]+$/.test(brandId||''))throw Error('Choose a brand first.');return path.join(root,'output/creative-ai/brands',brandId,'campaign-headlines.json');}
async function loadHistory(root,brandId){try{const v=JSON.parse(await fs.readFile(historyFile(root,brandId),'utf8'));return v?.brandId===brandId&&Array.isArray(v.entries)?v:{version:1,brandId,entries:[]};}catch(e){if(e.code==='ENOENT')return {version:1,brandId,entries:[]};throw e;}}
const productKey=intake=>String(intake?.productPageUrl||intake?.productName||'brand-focus').trim().toLowerCase();
let writing=Promise.resolve();
// Appends one planning unit's headlines (same process; writes are queued so concurrent jobs do not lose entries).
function recordHeadlines(root,brandId,entry){
 const run=writing.then(async()=>{const file=historyFile(root,brandId),h=await loadHistory(root,brandId);
  h.entries=h.entries.filter(e=>!(e.jobId===entry.jobId&&e.unitKey===entry.unitKey));h.entries.push({jobId:entry.jobId,unitKey:entry.unitKey,productKey:entry.productKey,at:entry.at||new Date().toISOString(),headlines:(entry.headlines||[]).slice(0,30),...(entry.palette?{palette:String(entry.palette).slice(0,200)}:{}),...(typeof entry.people==='boolean'?{people:entry.people}:{}),...(Array.isArray(entry.scenes)&&entry.scenes.length?{scenes:require('./variety').clean(entry.scenes)}:{})});
  h.entries=h.entries.slice(-HISTORY_KEEP);await fs.mkdir(path.dirname(file),{recursive:true});const tmp=file+'.'+process.pid+'.tmp';await fs.writeFile(tmp,JSON.stringify(h,null,1));await fs.rename(tmp,file);});
 writing=run.catch(()=>{});return run;
}
// Recent headlines for this product, newest first, excluding the unit being planned. Deterministic for a given history.
function recentFor(history,{productKey:key,jobId,unitKey,now=Date.now(),days=HISTORY_DAYS,limit=HISTORY_LIMIT}={}){
 const since=now-days*864e5,out=[],seen=new Set();
 for(const e of [...(history?.entries||[])].reverse()){
  if(e.productKey!==key||e.jobId===jobId&&e.unitKey===unitKey||!(Date.parse(e.at)>=since))continue;
  for(const h of e.headlines||[]){const k=words(h);if(k&&!seen.has(k)){seen.add(k);out.push(String(h).replace(/\s+/g,' ').trim());}}
  if(out.length>=limit)break;
 }
 return out.slice(0,limit);
}
// Opening words used at least twice recently (at most six, most used first).
function overusedOpenings(headlines){
 const n=new Map();for(const h of headlines){const w=opening(h);if(w)n.set(w,(n.get(w)||0)+1);}
 return [...n.entries()].filter(([,c])=>c>=2).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,6).map(([w])=>w);
}
function headlines(plan){return [...new Set((plan?.pages||[]).flatMap(p=>(p.copy||[]).filter(c=>headlineRole(c.role)).map(c=>String(c.text).replace(/\s+/g,' ').trim())).filter(Boolean))];}

// ---- 6: story safe zone ----
function storyPages(selection){return Object.fromEntries(selection.filter(s=>formatClass(s)==='story').map(s=>{const h=s.description.dimensions.height;return [s.id,{topPx:Math.round(h*STORY.top),bottomPx:Math.round(h*STORY.bottom)}];}));}

// ---- Packet section: one planning-only copy rule, the feature rule, and the story rule for story pages ----
// adNameVersion: 1 on jobs pinning the ad name (25 Nov 2026); earlier jobs keep the short-name line below.
function section(input,selection,{recent=[],adNameVersion=0}={}){
 const full=input.product?.name||'',fullPages=selection.filter(s=>fullNamePage(input,s)).map(s=>s.id),ad=adNameVersion===AD_NAME_VERSION?adNameData(input.product):null;
 const short=ad?null:shortName(full),shortPages=short?selection.map(s=>s.id).filter(id=>!fullPages.includes(id)):[],adPages=ad?selection.map(s=>s.id).filter(id=>!fullPages.includes(id)):[];
 const avoid=overusedOpenings(recent),stories=storyPages(selection);
 const copy=['CAMPAIGN COPY v1 (planning). Write a fresh headline for this asset with a specific reason to choose this product (a feature\'s benefit, a moment of use, the look), not a generic "make it yours" line.'];
 if(recent.length)copy.push('This product\'s recent campaign assets already used these headlines; do not reuse any of them or a close variant: '+recent.map(h=>'"'+h+'"').join(' | ')+'.');
 if(avoid.length)copy.push('Do not start a headline with these overused opening words: '+avoid.map(w=>'"'+w[0].toUpperCase()+w.slice(1)+'"').join(', ')+'.');
 if(shortPages.length)copy.push('Name the product as "'+short+'" in this copy (you may add the colour or size after it). The full catalogue name "'+full+'" is not used on these pages: '+shortPages.join(', ')+'.');
 if(adPages.length)copy.push('PRODUCT NAME (client direction, 25 Nov 2026: no full product name and no variant name). Name the product only as "'+ad.adName+'" (the brand name may go before it). Never add its model number, size, seat count, colour, fabric or the rest of the catalogue name "'+full+'"'+(ad.models.length?' (for example never "'+ad.models[0]+'")':'')+'. Where the type helps, say it in plain words ("the mattress", "this sofa"). These pages: '+adPages.join(', ')+'.');
 copy.push('Warranty wording (user decision, 11 Nov 2026): write a warranty as "N-year warranty" without the word "conditional" (for example "3-year warranty"); this one wording decision overrides the qualifier rule for that word.');
 const rules=[{id:COPY_ID,tier:'contract',text:copy.join(' '),sourceIds:['user:marketing-review-20261111']},
  {id:FEATURE_ID,tier:'contract',text:'FEATURE SHOWN v1. When a page\'s message is a physical product feature (for example removable or loose cushions, a recline, storage, a zip-off cover, the arm design, the legs or the fabric), the picture shows that feature clearly at work or in close-up, consistent with the official photos and facts: for example a back cushion lifted off or used as an arm pillow, a hand pressing into the seat, a close-up of the arm or leg. The page purpose names what the picture shows. Hidden inner layers, foam or springs appear only through the official technology picture or as an outside benefit (someone sinking into the seat), never as an invented cutaway.',sourceIds:['user:marketing-review-20261111']}];
 if(Object.keys(stories).length)rules.push({id:STORY_ID,tier:'contract',text:'STORY SAFE ZONE v1. On a full-screen story the app covers the top 14% (profile bar) and the bottom 20% (reply bar and ad button). Keep the logo, every word and any button out of those bands; fill them with the scene or background only. '+Object.entries(stories).map(([id,z])=>id+': keep the top '+z.topPx+' px and the bottom '+z.bottomPx+' px free of words, logo and button').join('; ')+'.',sourceIds:['user:marketing-review-20261111']});
 return {marketing:{version:VERSION,shortName:short,fullName:full,shortNamePages:shortPages,...(ad?{adName:{...ad,pages:adPages}}:{}),recentHeadlines:recent,avoidOpenings:avoid,storyPages:stories,plainWarranty:true},rules,placements:{[COPY_ID]:selection.map(s=>s.id),[FEATURE_ID]:selection.map(s=>s.id),[STORY_ID]:Object.keys(stories)}};
}
// Source-acceptance wording for pinned packets: the warranty decision is stated beside the qualifier rule.
const WARRANTY_NOTE=' User decision (11 Nov 2026): the word "conditional" is left out of warranty wording ("3-year warranty").';

// ---- Plan check (2, 3, 8) ----
function validate(plan,input){
 const m=input?.marketing;if(m?.version!==VERSION)return;
 for(const page of plan.pages||[])for(const c of page.copy||[]){
  // 8: the word "conditional" before "warranty" is removed deterministically (idempotent).
  if(m.plainWarranty)c.text=String(c.text).replace(/\bconditional\s+(warrant(?:y|ies))/gi,'$1');
  if(headlineRole(c.role)){const key=words(c.text);
   if(key&&m.recentHeadlines.some(h=>words(h)===key))throw Error('Headline "'+c.text+'" was already used by a recent asset for this product; write a fresh headline');
   const first=opening(c.text);if(first&&m.avoidOpenings.includes(first))throw Error('Headline "'+c.text+'" starts with the overused opening word "'+first+'"; start it differently');}
  if(m.shortName&&m.shortNamePages.includes(page.id)&&[m.fullName,stripParens(m.fullName)].some(f=>words(f)!==words(m.shortName)&&words(c.text).includes(words(f))))throw Error(page.id+': use the short product name "'+m.shortName+'" instead of the full catalogue name');
  if(m.adName?.version===AD_NAME_VERSION&&m.adName.pages.includes(page.id)){const cited=(c.factIds||[]).filter(id=>!/^sku-selected-variant$/.test(id)&&![input.product?.id,input.product?.variant?.id].includes(id)).map(id=>(input.product?.facts||[]).find(f=>f.id===id)?.text||'').join(' '),problem=adNameProblem(c.text,m.adName,offerWording(input),cited);if(problem)throw Error(page.id+' '+(c.role||'copy')+' "'+String(c.text).replace(/\s+/g,' ').slice(0,120)+'": name the product only as "'+m.adName.adName+'" (client direction: no full product name and no variant name); '+problem);}
 }
}

// ---- 7: spelling check of the finished words against the planned words (local text reader, no paid call) ----
function distance(a,b){ // Damerau-Levenshtein (optimal string alignment)
 const d=Array.from({length:a.length+1},(_,i)=>[i,...Array(b.length).fill(0)]);for(let j=1;j<=b.length;j++)d[0][j]=j;
 for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1);}
 return d[a.length][b.length];
}
function matchLine(rowTokens,planned){return planned.find(p=>{const have=new Set(p.tokens);return rowTokens.filter(x=>have.has(x)).length>=Math.max(1,Math.ceil(rowTokens.length*0.6));});}
// Letter shapes the local text reader confuses (11 Nov 2026 replay of 263 saved images: "Sofa" read as "Sota",
// "BodyIQ" as "BodylQ", "MAGIC" as "MAOIC"). A one-letter swap between these is never reported.
const CONFUSED=[['f','t'],['i','l'],['i','j'],['o','g'],['o','q'],['o','c'],['c','e'],['e','o'],['a','o'],['u','v'],['n','h'],['b','h'],['n','m'],['r','n'],['k','x']].map(p=>p.sort().join(''));
// A clear typo, judged on one word: a doubled, extra or missing letter inside the word ("cusshion"), two swapped
// neighbours ("comfrot"), or on large text an unmistakable wrong letter. A different ending ("zone"/"zoned",
// "cushion"/"cushions") is a wording choice the image check judges, not a spelling slip.
function typo(found,want,px){
 if(found===want||Math.abs(found.length-want.length)>1||distance(found,want)!==1)return false;
 if(found.startsWith(want)||want.startsWith(found))return false;
 if(found.length!==want.length)return px>=16;
 const at=[...found].map((c,i)=>c!==want[i]?i:-1).filter(i=>i>=0);
 if(at.length===2)return px>=16; // two swapped neighbours
 return want.length>=6&&px>=24&&!CONFUSED.includes([found[at[0]],want[at[0]]].sort().join(''));
}
function spellingCheck(rows,{copy=[],height=1080}={}){
 const planned=copy.map(c=>({text:c.text,tokens:words(c.text).split(' ').filter(Boolean)})).filter(p=>p.tokens.length);
 if(!rows?.length||!planned.length)return null;
 const all=new Set(planned.flatMap(p=>p.tokens)),wrong=[];let matched=0;
 for(const r of rows){if(!(Number(r.confidence??1)>=0.5))continue;const tokens=words(r.text).split(' ').filter(Boolean);if(!tokens.length)continue;
  const line=matchLine(tokens,planned);if(!line)continue;matched++;const px=Math.round((r.box?.height||0)*height);
  for(const t of tokens){if(all.has(t)||!/^\p{L}{4,}$/u.test(t))continue;
   const near=line.tokens.find(p=>p.length>=4&&!tokens.includes(p)&&typo(t,p,px));
   if(near)wrong.push({found:t,planned:near,line:String(r.text).slice(0,80),box:r.box});}}
 if(!matched)return null;
 if(!wrong.length)return {id:'copy-spelling',name:'Spelling of the planned words',result:'no_mismatch',evidence:'Read '+matched+' planned line'+(matched>1?'s':'')+' with the local text reader; every word matches the plan.',location:'Planned text'};
 const w=wrong[0],b=w.box;
 return {id:'copy-spelling',name:'Spelling of the planned words',result:'clear_mismatch',evidence:'"'+w.found+'" is printed where the plan says "'+w.planned+'" (in "'+w.line+'")'+(wrong.length>1?'; '+wrong.slice(1,4).map(x=>'"'+x.found+'" for "'+x.planned+'"').join(', '):'')+'.',location:b?'Text line at about '+Math.round(b.x*100)+'% from the left, '+Math.round(b.y*100)+'% from the top':'Planned text',measured:'local-text-reader'};
}
// ---- 6: story safe zone, measured ----
function storyZoneCheck(rows,{copy=[],brandName='',zone}={}){
 if(!zone||!rows?.length)return null;
 const planned=copy.map(c=>({tokens:words(c.text).split(' ').filter(Boolean)})).filter(p=>p.tokens.length),brand=words(brandName).replace(/\s+/g,'');
 const height=zone.height||1920,top=zone.topPx/height,bottom=1-zone.bottomPx/height,tol=0.005,inside=[];let measured=0;
 for(const r of rows){if(!r.box||!(Number(r.confidence??1)>=0.5))continue;const tokens=words(r.text).split(' ').filter(Boolean);if(!tokens.length)continue;
  const isBrand=brand&&tokens.join('').includes(brand),isCopy=!!matchLine(tokens,planned);if(!isBrand&&!isCopy)continue;measured++;
  if(r.box.y<top-tol||r.box.y+r.box.height>bottom+tol)inside.push({text:String(r.text).slice(0,60),where:r.box.y<top-tol?'top':'bottom'});}
 if(!measured)return null;
 if(!inside.length)return {id:STORY_ID,name:'Story safe zone',result:'no_mismatch',evidence:'Measured '+measured+' line'+(measured>1?'s':'')+'; all clear of the top 14% and bottom 20%.',location:'Whole image'};
 const f=inside[0];
 return {id:STORY_ID,name:'Story safe zone',result:'clear_mismatch',evidence:'"'+f.text+'" sits in the '+f.where+(f.where==='top'?' 14%':' 20%')+' that the app covers'+(inside.length>1?' ('+inside.length+' lines in the covered bands)':'')+'.',location:f.where==='top'?'Top band':'Bottom band',measured:'local-text-reader'};
}
module.exports={VERSION,AD_NAME_VERSION,adName,adNameData,adNameProblem,COPY_ID,FEATURE_ID,STORY_ID,STORY,WARRANTY_NOTE,shortName,fullNamePage,historyFile,loadHistory,recordHeadlines,recentFor,overusedOpenings,headlines,productKey,storyPages,section,validate,distance,spellingCheck,storyZoneCheck};
