'use strict';
// Reads a marketer's free-text brief before any campaign exists and turns it into
// suggested Studio choices (product, assets, message type, language, exact wording).
// It is one small paid reasoning call with its own budget and receipts, stored under
// output/creative-ai/brief-reads so the shared cost ledger counts it. The result is
// only a suggestion: the operator confirms every field on the brief appreciation page
// before any generation is created. See docs/brief-reader-20261108.md.
const path=require('path'),{JobStore}=require('./store'),{check}=require('../marketing-strategist/schema-validator');
const studio=require('../../../public/creative-ai/studio-model.js');
const VERSION=1,MAX_BRIEF=12000,MAX_DOCUMENT_TEXT=60000;
const OBJECTIVES=['Awareness','Consideration','Purchase','Engagement','Education'];
const WORDING_KINDS=['offer','terms','validity','tagline','cta','disclaimer','other'];
const QUESTION_FIELDS=['product','variant','offerWording','offerValidity','assets','other'];
const languages=()=>studio.languages||['English','Hindi','Hinglish','Kannada','Tamil','Telugu','Malayalam','Gujarati','Marathi','Bengali'];
const messageTypes=()=>studio.messageTypes||['Benefit','Product launch','Offer / price / EMI','Proof / claim','Technology','Comparison','Store news'];
const OFFER=/offer/i;
// Exact-wording checks compare text loosely: case, curly quotes and spacing may differ,
// but the words themselves must already be in the brief.
const loose=s=>String(s||'').normalize('NFKC').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,'-').replace(/\s+/g,' ').trim().toLowerCase();

function cards(){return (studio.assetCatalogue||[]).filter(c=>c.status==='ready').map(c=>({id:c.id,name:c.name,division:c.division||c.divisionName||'',size:c.sizeLabel||c.size||'',channel:c.channel||'',publishing:c.publishing||''}));}
function compactProducts(catalog){return (catalog||[]).map(p=>({id:p.id,name:p.name,sku:p.sku||'',category:p.category||'',variants:(p.variants||[]).slice(0,80).map(v=>({id:String(v.id),name:v.name||''}))}));}

const text=(max,min=0)=>({type:'string',minLength:min,maxLength:max});
const sourced=(value)=>({type:'object',additionalProperties:false,required:['value','source'],properties:{value,source:{enum:['brief','suggested','none']}}});
function schemaFor(){return {type:'object',additionalProperties:false,required:['ask','product','assets','messageType','objective','language','audience','tone','keyMessage','features','offer','exactWording','occasion','cta','contactDetails','logoRequested','otherBrandMentioned','assumptions','questions'],properties:{
 ask:text(400,1),
 product:{type:'object',additionalProperties:false,required:['productId','candidateIds','variantId','briefName','evidence'],properties:{productId:text(80),candidateIds:{type:'array',maxItems:5,items:text(80)},variantId:text(80),briefName:text(160),evidence:text(300)}},
 assets:{type:'array',minItems:1,maxItems:8,items:{type:'object',additionalProperties:false,required:['cardId','source','reason'],properties:{cardId:text(80,1),source:{enum:['brief','suggested']},reason:text(200)}}},
 messageType:sourced({enum:messageTypes()}),
 objective:{type:'object',additionalProperties:false,required:['value','source','reason'],properties:{value:{enum:OBJECTIVES},source:{enum:['brief','suggested']},reason:text(200)}},
 language:sourced({enum:languages()}),
 audience:sourced(text(300)),
 tone:sourced(text(120)),
 keyMessage:sourced(text(300)),
 features:{type:'array',maxItems:6,items:text(160)},
 offer:{type:'object',additionalProperties:false,required:['wording','terms','startDate','endDate'],properties:{wording:text(300),terms:text(600),startDate:text(10),endDate:text(10)}},
 exactWording:{type:'array',maxItems:8,items:{type:'object',additionalProperties:false,required:['text','kind'],properties:{text:text(300,1),kind:{enum:WORDING_KINDS}}}},
 occasion:sourced(text(60)),
 cta:sourced(text(60)),
 contactDetails:{type:'boolean'},
 logoRequested:{type:'boolean'},
 otherBrandMentioned:text(80),
 assumptions:{type:'array',maxItems:6,items:text(200)},
 questions:{type:'array',maxItems:4,items:{type:'object',additionalProperties:false,required:['field','question'],properties:{field:{enum:QUESTION_FIELDS},question:text(240,1)}}}
}};}

const instructions=brand=>['You read a marketing brief for the '+brand+' brand and fill in a Studio order form. You do not write ads, copy or creative ideas.',
 'Use only the brief text, the attached brief documents, the listed products of this brand and the listed asset cards. Never use knowledge of other brands.',
 'ask: one plain sentence, starting with a verb, that restates the job: what to make people feel, think or do, who they are and why now, in the brief\'s own terms (for example "Make first-time renters notice how compact and colourful Sofa Bubbles is"). Never say "the marketer" or "the brief". Do not add claims, benefits or numbers the brief does not contain.',
 'product: choose productId only when the brief clearly names one listed product. If several listed products could match, leave productId empty and list up to five candidateIds. If none match, leave both empty. variantId only when the brief names the size/colour/variant or the product has exactly one variant. briefName is the product name exactly as the brief writes it, copied word for word (empty if the brief names no product). evidence briefly explains the match.',
 'assets: list the cards the brief asks for with source "brief". If the brief names a channel or format loosely ("stories for Insta and FB", "a WhatsApp", "PDP images"), map it to the closest listed card. If the brief names no asset, suggest a small sensible set (one to three cards) for its goal and channel hints, with source "suggested" and a short reason. You may add at most one suggested card next to requested ones, only when it clearly helps the same goal. An "A+", "A plus" or "Amazon A+" request is the amazon-aplus card, which makes a whole Premium A+ page by default (Basic or Brand Story can be chosen later).',
 'messageType, language, audience, tone, keyMessage, occasion, cta: source "brief" when the brief states it; "suggested" when you infer it from the brief (for example an offer brief suggests "Purchase"); "none" with an empty value when nothing supports it. Language defaults to English with source "suggested" unless the brief asks for another language (Hinglish counts as its own language).',
 'objective: always choose one; source "suggested" with a one-line reason when the brief does not state it.',
 'features: product features the brief itself asks to highlight, in its own words. Empty when the brief names none; the Studio picks features from the official product page.',
 'offer: for an offer or price brief, wording is the offer exactly as the brief writes it (e.g. "Flat 30% off"), terms the conditions exactly as written, and startDate/endDate as YYYY-MM-DD when the brief gives them (resolve "till 15 Nov" against today; never guess a missing date). Empty strings when not given or not an offer brief.',
 'exactWording: only text that must appear word for word: offer wording, prices, discounts, dates, terms, taglines, disclaimers, CTAs the brief supplies. Copy each exactly as written in the brief; never rephrase, translate or invent. Leave it empty when the brief supplies none.',
 'contactDetails: true only when the brief asks for a phone number, store address, QR code or similar contact details. logoRequested: true only when the brief explicitly asks for the logo.',
 'otherBrandMentioned: the name of any furniture or mattress brand other than '+brand+' that the brief names, otherwise an empty string.',
 'assumptions: short statements of each default you chose that the marketer should double-check.',
 'questions: only for information the Studio must not guess: an unclear product or variant, missing offer wording or offer end date for an offer brief, or contradictory asset requests. At most four, each one short question.',
 'Return exactly the requested JSON fields. No hidden reasoning.'].join('\n');

function corpus(brief,documents){return loose([brief,...documents.map(d=>d.text)].join('\n'));}
function validate(output,{products,brief,documents}){
 const errors=check(schemaFor(),output);if(errors.length)throw Error(errors.join('\n'));
 const byId=new Map(products.map(p=>[p.id,p])),ready=new Set(cards().map(c=>c.id)),all=corpus(brief,documents),problems=[];
 const p=output.product;
 if(p.productId&&!byId.has(p.productId))problems.push('product.productId must be one of the listed product ids or empty.');
 for(const id of p.candidateIds)if(!byId.has(id))problems.push('product.candidateIds contains an unlisted product id: '+id);
 if(p.variantId&&!(byId.get(p.productId)?.variants||[]).some(v=>v.id===p.variantId))problems.push('product.variantId must belong to the chosen product, or be empty.');
 const seen=new Set();for(const a of output.assets){if(!ready.has(a.cardId))problems.push('assets contains an unlisted card id: '+a.cardId);if(seen.has(a.cardId))problems.push('assets lists '+a.cardId+' twice.');seen.add(a.cardId);}
 for(const w of output.exactWording)if(!all.includes(loose(w.text)))problems.push('exactWording must be copied word for word from the brief; not found: '+w.text);
 if(p.briefName&&!all.includes(loose(p.briefName)))problems.push('product.briefName must be copied word for word from the brief; not found: '+p.briefName);
 for(const k of ['wording','terms'])if(output.offer[k]&&!all.includes(loose(output.offer[k])))problems.push('offer.'+k+' must be copied word for word from the brief; not found: '+output.offer[k]);
 for(const k of ['startDate','endDate'])if(output.offer[k]&&(!/^\d{4}-\d{2}-\d{2}$/.test(output.offer[k])||!Number.isFinite(Date.parse(output.offer[k]))))problems.push('offer.'+k+' must be YYYY-MM-DD or empty.');
 if(output.offer.startDate&&output.offer.endDate&&output.offer.endDate<output.offer.startDate)problems.push('offer.endDate must not be before offer.startDate.');
 for(const key of ['messageType','language','audience','tone','keyMessage','occasion','cta'])if(output[key].source==='none'&&String(output[key].value||'').trim()&&!['messageType','language'].includes(key))problems.push(key+' has source "none" but a value.');
 if(problems.length)throw Error(problems.join('\n'));
 return output;
}

// Deterministic additions the model cannot remove: missing product/variant and missing
// offer details always become questions, so nothing is guessed downstream.
function finish(output,{products}){
 const r=structuredClone(output),byId=new Map(products.map(p=>[p.id,p])),questions=[...r.questions],has=f=>questions.some(q=>q.field===f);
 const product=byId.get(r.product.productId);
 if(!product){r.product.productId='';r.product.variantId='';if(!has('product'))questions.unshift({field:'product',question:r.product.candidateIds.length>1?'Which product is this for?':'Which product is this brief about?'});}
 else{const fallback=studio.defaultVariant?studio.defaultVariant(product):'';if(!r.product.variantId&&fallback&&product.variants.length===1)r.product.variantId=fallback;if(!r.product.variantId&&!fallback&&product.variants.length>1&&!has('variant'))questions.push({field:'variant',question:'Which size or variant of '+product.name+'?'});}
 if(OFFER.test(r.messageType.value)){if(!r.offer.wording&&!has('offerWording'))questions.push({field:'offerWording',question:'What is the exact offer wording? We will not make it up.'});if((!r.offer.endDate||!r.offer.terms)&&!has('offerValidity'))questions.push({field:'offerValidity',question:!r.offer.endDate&&!r.offer.terms?'When does the offer end, and are there any terms?':!r.offer.endDate?'When does the offer end?':'Are there any terms or exclusions? Write “None” if not.'});}
 // Technology visual v1 (9 Nov 2026): a Technology brief that names no feature gets the product's own
 // technology features from its official page as a suggestion the marketer confirms.
 if(product&&r.messageType?.value==='Technology'&&!r.features.length&&studio.technologyFeatures){const tech=studio.technologyFeatures(product);if(tech.length){r.features=tech.map(t=>t.slice(0,160));r.assumptions=[...r.assumptions,('Technology taken from the product page: '+tech.join('; ')).slice(0,200)].slice(0,6);}}
 r.questions=questions.slice(0,6);
 r.decision=r.assets.length>1?'campaign':'design';
 return r;
}

class BriefReader{
 constructor(runtime,{recover=true}={}){this.runtime=runtime;this.store=new JobStore(path.join(runtime.root,'output/creative-ai/brief-reads'));this.running=new Map();this.ready=recover?this.recover():Promise.resolve();}
 public(j){return {id:j.id,brandId:j.intake.brandId,status:j.status,createdAt:j.createdAt,updatedAt:j.updatedAt,result:j.briefReading||null,error:j.error||null};}
 async recover(){for(const j of await this.store.list())if(['queued','running','preparing'].includes(j.status)&&!this.running.has(j.id))await this.store.update(j.id,x=>{x.status='failed';x.error='Reading this brief was interrupted. Nothing else was started. Try again.';return x;});}
 async read(brandId,input){
  await this.ready;
  if(typeof input.requestKey!=='string'||!/^[a-zA-Z0-9_-]{8,100}$/.test(input.requestKey))throw Error('A saved request ID is required.');
  const brief=typeof input.brief==='string'?input.brief.trim():'',documents=Array.isArray(input.briefDocuments)?input.briefDocuments.filter(d=>typeof d?.text==='string'&&d.text.trim()):[];
  if(!brief&&!documents.length)throw Error('Write a line about what you need, or attach a brief.');
  if(brief.length>MAX_BRIEF)throw Error('Keep the brief under '+MAX_BRIEF.toLocaleString('en-IN')+' characters, or attach it as a document.');
  if(documents.reduce((n,d)=>n+d.text.length,0)>MAX_DOCUMENT_TEXT)throw Error('The attached brief is too long to read in one go. Paste the key part instead.');
  const brand=await this.runtime.brands.read(brandId);
  if(input.brandName!==brand.name)throw Object.assign(Error('This brief was written in another brand. Switch brands and try again.'),{status:409});
  const products=compactProducts(await this.runtime.brands.products.catalog(brandId)),assetCards=cards();
  if(!assetCards.length)throw Error('The asset list is unavailable. Reload the Studio and try again.');
  const config=this.runtime.config,effort=config.briefReadEffort||'low';
  const intake={brandId,brandUrl:brand.brandUrl,brief,requestKey:input.requestKey,costPurpose:'Generating',briefRead:{version:VERSION,documentIds:documents.map(d=>d.id||'')}};
  const j=await this.store.create(intake,{...config,roleModels:{...(config.roleModels||{}),'brief-reading':{model:config.briefReadModel||config.reasoningModel,reasoningEffort:effort}},maxReasoningCalls:3,jobTimeoutMs:4*60*1000,estimatedSpend:{...config.estimatedSpend,maxUsd:Math.min(config.estimatedSpend?.maxUsd??3,3)}},[]);
  if(j.reused)return this.wait(j);
  const run=this.run(j,{brand,brief,documents,products,assetCards}).catch(async error=>{await this.store.save(j.id,'error.json',{error:String(error.message).slice(0,2000)});if(process.env.BRIEF_READER_DEBUG)console.error(error);await this.store.update(j.id,x=>{x.status='failed';x.error='We couldn’t read your brief just now (the AI service may be slow). Nothing was started and your text is still here. Try again, or choose formats yourself.';return x;});}).finally(()=>this.running.delete(j.id));
  this.running.set(j.id,run);await run;return this.public(await this.store.read(j.id));
 }
 async wait(j){const run=this.running.get(j.id);if(run)await run;return this.public(await this.store.read(j.id));}
 async run(j,{brand,brief,documents,products,assetCards}){
  await this.store.update(j.id,x=>{x.status='running';return x;});
  const budget=this.store.budget(j.id),context={products,documents};
  const input={today:new Date().toISOString().slice(0,10),brand:brand.name,brief,briefDocuments:documents.map(d=>({name:String(d.name||'Brief document').slice(0,120),text:d.text})),products,assetCards,messageTypes:messageTypes(),languages:languages(),objectives:OBJECTIVES};
  const output=await this.runtime.provider.reason({contextKind:'brief-reading',instructions:instructions(brand.name),input,schema:schemaFor(),strictSchema:true,maxOutputTokens:3000,validate:o=>validate(o,{...context,brief})},budget);
  const result=finish(output,context);
  await this.store.save(j.id,'brief-reading.json',result);
  await this.store.update(j.id,x=>{x.status='finished';x.briefReading=result;x.updatedAt=new Date().toISOString();return x;});
 }
}
module.exports={BriefReader,schemaFor,validate,finish,instructions,cards,compactProducts,VERSION};
