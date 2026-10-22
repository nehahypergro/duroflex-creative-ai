'use strict';
// These are explicit Studio raster presets, not publisher certification.
const pk=require('../placement-knowledge');
const presets=[
 ['social-square','Social post · square','Social',1080,1080,'Instagram / Facebook'],
 ['social-portrait','Social post · portrait','Social',1080,1350,'Instagram / Facebook'],
 ['social-story','Story · vertical','Social',1080,1920,'Instagram / Facebook'],
 ['linkedin-post','LinkedIn post','Social',1200,627,'LinkedIn'],
 ['social-landscape','Social post · landscape','Social',1200,628,'LinkedIn / Facebook'],
 ['pin-portrait','Pin · portrait','Social',1000,1500,'Pinterest'],
 ['web-hero','Website hero','Web & email',1920,1080,'Website'],
 ['email-hero','Email hero image','Web & email',1200,600,'Email'],
 ['commerce-product','Product showcase','Commerce',1600,1600,'Product page'],
 ['commerce-feature','Product feature tile','Commerce',1080,1350,'Product page'],
 ['marketing-poster','Digital poster / invitation','Marketing',1080,1350,'Digital marketing'],
 ['marketing-infographic','Infographic','Marketing',1080,1920,'Digital marketing'],
 ['carousel-square','Carousel · square','Carousels',1080,1080,'Social'],
 ['carousel-portrait','Carousel · portrait','Carousels',1080,1350,'Social']
].map(([slug,name,category,width,height,platform])=>({id:'custom:studio-'+slug,name,category,width,height,platform,kind:slug.startsWith('carousel-')?'carousel':'static'}));
const baseGuidelines={
 'social-square':'Single feed image. One clear message; avoid dense copy and keep essential content clear of crop edges. Inspect on a phone.',
 'social-portrait':'Portrait feed image. Keep identity and headline clear through any feed preview crop. Inspect phone-size type and exact product identity.',
 'social-story':'Vertical story. Reserve real backdrop space for text. Keep essential logo, headline and CTA in the central viewing area, clear of app header/footer controls; preview in the target app.',
 'linkedin-post':'Landscape LinkedIn feed post. One clear message, concise copy and readable identity at small preview size. Native caption is separate.',
 'social-landscape':'Landscape feed image. Brief headline and readable product at small preview size. Native captions and campaign fields remain separate.',
 'pin-portrait':'Vertical Pin. Strong product cue and concise copy; destination/native fields remain separate. Check the actual publishing crop.',
 'web-hero':'Desktop hero image. Compose real backdrop negative space and preserve the hero product through responsive cropping. Alt text, live HTML and breakpoint behavior are separate.',
 'email-hero':'Email raster hero. Short readable copy at the displayed email column width; email text, alt text and clickable HTML links are separate.',
 'commerce-product':'Product showcase, not a certified marketplace primary image. Keep exact SKU colour, pattern and construction visible; no invented features or included accessories.',
 'commerce-feature':'One source-backed product feature and benefit per tile. Preserve qualifiers and exact SKU identity at the displayed product-page width.',
 'marketing-poster':'Digital poster / invitation. Clear headline and exact supplied date, time, venue and action; do not invent event details or offers.',
 'marketing-infographic':'Readable sequence with concise source-backed steps. No invented numbers or health claims. Review the actual phone-sized output.',
 'carousel-square':'Ordered square slides: advance the message with distinct content; consistent visual system and identity, opening hook and closing action. Native captions separate.',
 'carousel-portrait':'Ordered portrait slides: distinct content in a consistent visual system, opening hook and closing action. Avoid cut-off essentials in feed previews.'
};
for(const p of presets){p.guidelines=baseGuidelines[p.id.replace('custom:studio-','')];p.sourceIds=p.id.endsWith('pin-portrait')?['pinterest']:(p.id.endsWith('social-landscape')||p.id.endsWith('linkedin-post'))?['linkedin-image']:[];}
presets.push(...require('./static-options').presets);
const creativeTypes=[
 {id:'auto',name:'Let the strategist choose',direction:'Choose the clearest creative treatment for the supplied objective and evidence.'},
 {id:'product-benefits',name:'Product benefits',direction:'Connect a supported product feature to a relevant customer benefit; retain all source qualifiers.'},
 {id:'launch',name:'Launch / announcement',direction:'Introduce the selected product or campaign. Do not invent launch dates, availability or newness.'},
 {id:'offer',name:'Offer / promotion',direction:'Use only supplied or source-backed offers, prices, validity and terms. Missing essential offer details require clarification.'},
 {id:'lifestyle',name:'Lifestyle / brand story',direction:'Show a relatable occasion and brand promise without treating lifestyle mood as proof of product performance.'},
 {id:'educational',name:'Educational / how it works',direction:'Explain source-backed features or practical use in clear steps. Avoid unsourced health advice.'},
 {id:'comparison',name:'Comparison',direction:'Compare only verified like-for-like attributes. Missing comparison evidence requires clarification; do not invent competitor facts.'},
 {id:'testimonial',name:'Testimonial / social proof',direction:'Use only authentic source-backed quotes and attribution, preserving exact wording. Missing testimony requires clarification; never invent a customer.'},
 {id:'event',name:'Event / occasion',direction:'Use only supplied event details, dates and venue. A seasonal theme does not establish an offer or event.'}
];
const limits={minSlides:2,maxSlides:6,defaultSlides:4,maxUnitsPerConcept:6};
function spec(p,intake={}){return p.kind==='print'?require('./print-production').specFor(p,intake.printOptions && Object.hasOwn(intake.printOptions,p.id)?intake.printOptions[p.id]:{}):null;}
function row(p,id=p.id,name=p.name,print=null){return {id,name,platform:p.platform,publisher:'studio',placement:p.kind==='carousel'?'carousel-slide':p.kind==='print'?'print-design-proof':p.name,assetType:'static',canvas:{width:print?.raster.width||p.width,height:print?.raster.height||p.height,unit:'px'},exportContract:{formats:['png'],...(p.maxBytes?{maxBytes:p.maxBytes}:{})},displayContext:print?require('./print-production').guidance(p,print,Number(id.match(/-page-(\d+)$/)?.[1]||1)):(p.width+'×'+p.height+'px '+p.name+'; '+(p.guidelines||'explicit Studio preset, review in the target publishing application.'))};}
function publicFormats(){return presets.map(p=>({id:p.id,name:p.name,family:'studio-preset',category:p.category,platform:p.platform,assetType:p.kind,kind:p.kind,unitCount:p.kind==='print'?p.pages:1,coverageStatus:'conditional',supported:true,dimensions:{width:p.width,height:p.height,ratio:p.width/p.height},...(p.print?{print:p.print,physicalSize:{width:p.print.trimWidthMm,height:p.print.trimHeightMm,unit:'mm'}}:{}),readability:require('./readability').policyFor(p),guidelines:(p.guidelines||'Compose for the selected viewing context; preserve exact content and SKU identity.')+'\n'+require('./readability').guidance(p),sources:(p.sourceIds||[]).map(id=>require('./static-options').sources.find(s=>s.id===id)),guidance:p.kind==='print'?'Editable physical preset. PNG previews and an ordered RGB PDF proof; printer preflight remains required.':'Studio raster preset. Publisher crop, safe areas and upload eligibility require target-platform checks.',requiredJobInputs:[],unknowns:p.kind==='print'?['Printer template, press profile, effective source resolution and finishing are not certified.']:['Publisher acceptance is not certified.']}));}
function validate(intake){
 require('./reading-context').validateIntake(intake);
 if(intake.creativeType!==undefined&&!creativeTypes.some(t=>t.id===intake.creativeType))throw Error('Choose a valid creative type.');
 if(!Array.isArray(intake.placementIds)||new Set(intake.placementIds).size!==intake.placementIds.length)throw Error('Choose distinct image formats.');
 if(intake.placementIds.some(id=>typeof id!=='string'||/-slide-|-(?:page)-\d+$/.test(id)))throw Error('Choose formats, not internal page/slide IDs.');
 if(intake.printOptions!==undefined&&(!intake.printOptions||typeof intake.printOptions!=='object'||Array.isArray(intake.printOptions)))throw Error('Print options must be an object keyed by selected format.');
 for(const id of Object.keys(intake.printOptions||{})){const p=presets.find(p=>p.id===id);if(!intake.placementIds.includes(id)||p?.kind!=='print')throw Error('Print options must belong to selected print formats.');spec(p,intake);}
 const hasCarousel=intake.placementIds.some(id=>presets.find(p=>p.id===id)?.kind==='carousel');
 const count=intake.carouselSlideCount??limits.defaultSlides;
 if(hasCarousel&&(!Number.isInteger(count)||count<limits.minSlides||count>limits.maxSlides))throw Error('Choose '+limits.minSlides+'–'+limits.maxSlides+' carousel slides.');
 const units=intake.placementIds.reduce((n,id)=>{const p=presets.find(p=>p.id===id);return n+(p?.kind==='carousel'?count:p?.kind==='print'?p.pages:1);},0);
 if(units>limits.maxUnitsPerConcept)throw Error('This selection creates '+units+' images per direction. Use at most '+limits.maxUnitsPerConcept+'; reduce pages/slides by choosing a smaller set or remove a format.');
 const reserved=new Set(presets.map(p=>p.id));
 if(intake.customProfiles?.some(p=>reserved.has(p.id)||p.id?.startsWith('custom:studio-')))throw Error('Custom formats cannot replace Studio presets.');
 return {hasCarousel,count,units};
}
function expand(intake){
 const {count}=validate(intake),placementIds=[],rows=[],metadata=new Map();
 for(const id of intake.placementIds){const p=presets.find(p=>p.id===id);if(!p){placementIds.push(id);continue;}
  const total=p.kind==='carousel'?count:p.kind==='print'?p.pages:1,print=spec(p,intake);
  for(let n=1;n<=total;n++){const profileId=p.kind==='carousel'?id+'-slide-'+String(n).padStart(2,'0'):p.kind==='print'?id+'-page-'+String(n).padStart(2,'0'):id;
   const label=p.kind==='carousel'?'Slide '+n+' of '+total:p.kind==='print'?require('./print-production').pageLabel(p,n):'';
   placementIds.push(profileId);rows.push(row(p,profileId,p.name+(label?' · '+label:''),print));
   metadata.set(profileId,{outputKind:p.kind,formatId:p.id,formatName:p.name,category:p.category,guidelines:p.guidelines||'',readability:require('./readability').policyFor({...p,...(print?{print,printDefault:p.print}:{})},intake.placementViewing?.[id]||{}),...(print?{print,printSet:{id:p.id,name:p.name,index:n,count:total,label}}:{}),...(p.kind==='carousel'?{carousel:{id:p.id,name:p.name,index:n,count:total}}:{})});
  }
 }
 return {placementIds,rows,metadata};
}
function addPresets(catalog,rows,metadata=new Map()){
 if(!rows.length)return catalog;
 const next=pk.importCustomProfiles(rows,{source:{id:'user:studio-output-presets',title:'Selected Studio output presets',url:'user-supplied:creative-ai-output-presets',verifiedAt:'2026-10-09',limitations:'Application presets selected in the brief. Physical sizes and margins are editable job specifications, not universal printer standards. Raster/PDF proofs do not certify publisher or press acceptance.'}},catalog);
 for(const row of rows){const p=next.profiles.find(p=>p.id===row.id),rule={...structuredClone(next.rules.find(r=>r.id===row.id+'-canvas')),id:row.id+'-layout',statement:row.displayContext,check:{method:'rendered-review'},rationale:'Inspect the actual final artwork against this selected placement’s geometry, reading order, viewing size and content requirements.',limits:'Source resolution, press profile, die cutting and publisher/operator acceptance require separate checks.'};next.rules.push(rule);p.ruleIds.push(rule.id);}
 addReadabilityRules(next,rows.map(r=>r.id),metadata);
 return pk.validateCatalog(next);
}
function addReadabilityRules(catalog,ids,metadata=new Map()){for(const id of ids){const p=catalog.profiles.find(p=>p.id===id);if(!p||p.ruleIds.some(id=>id.endsWith('-readability')))continue;const exact=catalog.rules.find(r=>p.ruleIds.includes(r.id)&&r.check.method==='dimensions'&&r.check.exact)?.check.exact;const preset=presets.find(x=>id===x.id||id.startsWith(x.id+'-page-')||id.startsWith(x.id+'-slide-'));const readingPolicy=metadata.get(id)?.readability||require('./readability').policyFor(preset||{...p,width:exact?.[0],height:exact?.[1]});const rule={id:id+'-readability',version:'1.1.0',tier:'heuristic',severity:'advisory',sourceIds:['editorial'],statement:require('./readability').guidanceFor(readingPolicy),scope:{profileIds:[id]},check:{method:'rendered-review',readingPolicy},verifiedAt:'2026-10-09',versionDate:'2026-10-09',confidence:'medium',evidenceStatus:'editorial-heuristic',rationale:'Separate content capacity and displayed/physical reading context from upload pixels. Supporting research is in docs/placements/readability-audit-2026-10-09.md.',limits:'Soft drafting guidance, not official character limits, measured type or publisher/printer acceptance. Mandatory wording takes priority.'};catalog.rules.push(rule);p.ruleIds.push(rule.id);}return pk.validateCatalog(catalog);}
function creativeDirection(intake){const t=creativeTypes.find(t=>t.id===intake.creativeType);return t&&t.id!=='auto'?'Creative treatment: '+t.name+'. '+t.direction:'';}
module.exports={presets,creativeTypes,limits,publicFormats,validate,expand,addPresets,addReadabilityRules,creativeDirection};
