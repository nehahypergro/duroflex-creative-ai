/* Shared, provider-free UI contracts. Also loaded directly by the offline tests. */
(function (root, factory) {
  const value = factory();
  if (typeof module === 'object' && module.exports) module.exports = value;
  else root.StudioModel = value;
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  const formatPreviews = (function(){
  'use strict';
  const specs={
    1:['social','square','instagram','1080 × 1080','post'],
    2:['website','square','layers','1080 × 1080','technology'],
    3:['social','square','tag','1080 × 1080','offer'],
    4:['social','square','check','1080 × 1080','proof'],
    5:['website','square','bag','1080 × 1080','product'],
    6:['website','wide','bag','Module sizes vary','marketplace'],
    7:['website','banner','window','1920 × 600','banner'],
    8:['social','story','instagram','1080 × 1920','story'],
    9:['social','stack','layers','Multiple slides','carousel'],
    10:['retail','square','store','1080 × 1080','store'],
    11:['retail','poster','store','Set your print size','poster'],
    12:['retail','square','people','1080 × 1080','partner'],
    13:['corporate','wide','linkedin','1200 × 627','linkedin'],
    14:['messaging','message','whatsapp','Square or story','message'],
    15:['corporate','wide','window','Choose your dimensions','article']
  };
  const paths={layers:'m3 8 9-5 9 5-9 5ZM3 12l9 5 9-5M3 16l9 5 9-5',tag:'M3 3h9l9 9-9 9-9-9ZM7 7h.1',check:'m5 12 4 4L19 6',bag:'M4 7h16l1 14H3ZM8 7V5a4 4 0 0 1 8 0v2',window:'M3 4h18v16H3ZM3 8h18M6 6h.1M9 6h.1',store:'M4 10v11h16V10M3 4h18l1 6H2ZM9 21v-7h6v7',people:'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21v-3a7 7 0 0 1 14 0v3M17 4a4 4 0 0 1 0 8M19 15a5 5 0 0 1 3 5'};
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function glyph(name){
    if(name==='instagram')return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>';
    if(name==='linkedin')return '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="5" r="2"/><path d="M3 9h4v12H3zM10 9h4v1.5C16 7.8 21 8.2 21 13v8h-4v-7c0-2.5-3-2.5-3 0v7h-4z"/></svg>';
    if(name==='whatsapp')return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17a9 9 0 1 1 4 4l-5 1Z"/><path d="m8 7 2 3-1 1c1 2 2 3 4 4l1-1 3 1c-1 4-5 2-8-1S5 9 8 7Z"/></svg>';
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name]||paths.window}"/></svg>`;
  }
  function spec(id){const s=specs[id];return s?{tone:s[0],shape:s[1],badge:s[2],dimensions:s[3],design:s[4]}:null;}
  function render(id,{imageUrl='',compact=false,platform=false,iconOnly=false}={}){
    const s=spec(id);if(!s)return '';
    // Platform badges only where a platform is actually selected or named.
    const badge=id===1&&!platform?'layers':s.badge;
    if(iconOnly)return `<span class="format-preview format-cue tone-${s.tone}${compact?' is-compact':''}" aria-hidden="true"><span class="format-badge badge-${badge}">${glyph(badge)}</span></span>`;
    const safe=typeof imageUrl==='string'&&/^\/creative-ai\/api\/brands\/[a-zA-Z0-9_./%|-]+$/.test(imageUrl)&&!imageUrl.includes('..')?imageUrl:'';
    return `<span class="format-preview tone-${s.tone} shape-${s.shape} design-${s.design}${compact?' is-compact':''}" aria-hidden="true"><span class="format-mini"><span class="mini-chrome"><i></i><i></i><i></i></span><span class="mini-lines"><i></i><i></i><i></i></span><span class="mini-product">${safe?`<img class="format-product-image" src="${escape(safe)}" alt="" loading="lazy" decoding="async">`:'<svg class="mini-placeholder" viewBox="0 0 80 50" fill="none" stroke="currentColor" stroke-width="2"><rect x="12" y="10" width="56" height="25" rx="6"/><path d="M8 24v17h64V24M16 41v5M64 41v5M40 13v20"/></svg>'}</span><span class="mini-cta"></span><span class="mini-stamp">${glyph(s.badge==='tag'?'tag':s.badge==='check'?'check':'layers')}</span></span><span class="format-badge badge-${badge}">${glyph(badge)}</span></span>`;
  }
  return {spec,render};
  })();
  const groups = [
    {id:'social',name:'Social & campaigns',icon:'spark',description:'Posts, stories, reels & campaigns',accent:'purple'},
    {id:'website',name:'Website & marketplaces',icon:'window',description:'Product pages, banners & A+',accent:'blue'},
    {id:'retail',name:'Retail & local',icon:'store',description:'Store offers, print & local versions',accent:'pink'},
    {id:'messaging',name:'Customer messaging',icon:'message',description:'WhatsApp, email & RCS',accent:'orange'},
    {id:'corporate',name:'Corporate & PR',icon:'megaphone',description:'LinkedIn, articles & announcements',accent:'teal'},
    {id:'training',name:'Training & sales',icon:'book',description:'Decks, explainers & catalogues',accent:'plum'}
  ];
  // Scope IDs stay stable even when labels or grouping change.
  const rows = [
    [1,'Benefit-led post','social','image',['proof']], [2,'Technology visual','website','image',['proof','source']],
    [3,'Offer creative','social','image',['offer']], [4,'Proof & claim card','social','image',['proof']],
    [5,'Product-page images','website','image',['source','alt']], [6,'Marketplace A+','website','image',['marketplace','proof']],
    [7,'Website banner','website','image',['destination','alt']], [8,'Instagram story','social','image',[]],
    [9,'Carousel','social','image',['slides']], [10,'Store post','retail','image',['store','destination']],
    [11,'In-store print','retail','image',['print']], [12,'Partner creative','retail','image',['partner']],
    [13,'LinkedIn post','corporate','image',['facts']], [14,'Messaging visual','messaging','image',['personalisation']],
    [15,'Blog & OG graphic','corporate','image',['source','alt']], [16,'Benefit film','social','video',['proof','audio']],
    [17,'Technology film','website','video',['source','proof','audio']], [18,'Marketplace explainer','website','video',['marketplace','audio']],
    [19,'Claim video','social','video',['proof','audio']], [20,'WhatsApp cutdown','messaging','video',['source']],
    [21,'Slideshow','social','video',['source','audio']], [22,'Store offer video','retail','video',['store','offer','audio']],
    [23,'Trend-led reel','social','video',['trend','audio']], [24,'Product reel','social','video',['audio']],
    [25,'Avatar video','training','video',['presenter','audio']], [26,'Benefit reel','social','video',['proof','audio']],
    [27,'Emotional short','social','video',['story','audio']], [28,'Festive film','social','video',['occasion','audio']],
    [29,'Training video','training','video',['chapters','presenter','quiz']], [30,'LinkedIn video','corporate','video',['facts','audio']],
    [31,'Product launch film','social','video',['story','audio']], [32,'In-store TV loop','retail','video',['store','schedule']],
    [33,'Influencer finishing','social','video',['source','audio']], [34,'Email copy','messaging','copy',['destination','personalisation']],
    [35,'Article','corporate','document',['source','outline']], [36,'PR kit','corporate','document',['facts','quotes']],
    [37,'Training & sales deck','training','document',['chapters','quiz']], [38,'SKU catalogue','training','document',['catalogue']],
    [39,'Resize creative','social','adapt',['source']], [40,'Translate & localise','messaging','adapt',['source','terms']],
    [41,'Store & city versions','retail','adapt',['source','store']], [42,'Personalised versions','messaging','adapt',['source','personalisation']]
  ];
  const features = rows.map(([id,name,group,kind,fields])=>({id,name,group,kind,fields}));
  const fields = {
    proof:{label:'Benefit, claim & supporting source',placeholder:'What can we say, and which saved source supports it?',type:'textarea'},
    source:{label:'Source material',placeholder:'Describe the footage, images, CGI or existing creative to use.',type:'textarea'},
    alt:{label:'Image descriptions',placeholder:'Any important details to include in alt text?',type:'textarea'},
    offer:{label:'Offer details',placeholder:'Price, EMI, applicable products and terms. Keep qualifications with the offer.',type:'textarea'},
    destination:{label:'CTA destination',placeholder:'https://…',type:'url'},
    marketplace:{label:'Marketplace & module requirements',placeholder:'Marketplace, module slots and eligibility.',type:'textarea'},
    store:{label:'Store or city details',placeholder:'Locations, store names, addresses and QR destinations. Data import comes later.',type:'textarea'},
    print:{label:'Print requirements',placeholder:'Vendor template, size, bleed, stock and viewing distance. Avoid assumed specifications.',type:'textarea'},
    partner:{label:'Partner & approval details',placeholder:'Partner name, supplied logos and required reviewer.',type:'textarea'},
    facts:{label:'Facts to include',placeholder:'Names, roles, dates and sourced announcement details.',type:'textarea'},
    personalisation:{label:'Personalisation & fallback',placeholder:'Use example placeholders such as {{first_name}}. Do not enter customer records.',type:'textarea'},
    audio:{label:'Voice, music & captions',placeholder:'Voice/language preference, supplied music and caption requirements.',type:'textarea'},
    trend:{label:'Trend reference',placeholder:'A link or description of the selected trend.',type:'textarea'},
    presenter:{label:'Presenter',placeholder:'Approved presenter, voice and disclosure requirements.',type:'textarea'},
    story:{label:'Story premise',placeholder:'The moment or story you want to tell.',type:'textarea'},
    occasion:{label:'Occasion & region',placeholder:'Festival, occasion, region and cultural context.',type:'text'},
    chapters:{label:'Chapters & learning outcomes',placeholder:'Topics, sequence and what people should learn.',type:'textarea'},
    quiz:{label:'Quiz requirements',placeholder:'Questions and review needs. Interactive assessment delivery is not connected.',type:'textarea'},
    schedule:{label:'Screen & schedule',placeholder:'Silent playback, loop duration and offer schedule.',type:'textarea'},
    outline:{label:'Outline & search intent',placeholder:'Sections, FAQs, search intent and source links.',type:'textarea'},
    quotes:{label:'Approved quotes',placeholder:'Exact quotes, speaker and source.',type:'textarea'},
    catalogue:{label:'Catalogue selection',placeholder:'Products, regions, price source and required output format.',type:'textarea'},
    terms:{label:'Keep these terms unchanged',placeholder:'Product names, technology names, numbers and qualifiers.',type:'textarea'}
  };
  const formats = [
    {id:'square',name:'Square post',w:1080,h:1080}, {id:'portrait',name:'Portrait post',w:1080,h:1350},
    {id:'story',name:'Story / vertical video',w:1080,h:1920}, {id:'linkedin',name:'LinkedIn landscape',w:1200,h:627},
    {id:'landscape',name:'Landscape / video',w:1920,h:1080}, {id:'banner',name:'Website banner',w:1920,h:640},
    {id:'custom',name:'Custom size',w:1080,h:1080}
  ];
  const languages=['English','Hindi','Hinglish','Kannada','Tamil','Telugu','Malayalam','Gujarati','Marathi','Bengali'];
  const uid = () => 'draft-'+globalThis.crypto.randomUUID();
  const clone = v => JSON.parse(JSON.stringify(v));
  function output(featureId) {
    const f=features.find(x=>x.id===Number(featureId));
    if(!f) throw Error('Choose an available deliverable.');
    const formatId=f.id===8?'story':f.id===7?'banner':f.id===13?'linkedin':f.kind==='video'?'story':'square';
    const size=formats.find(x=>x.id===formatId);
    return {id:uid(),featureId:f.id,formatId,width:size.w,height:size.h,slides:f.id===9?5:1,duration:15,language:'English'};
  }
  function newDraft(brandId,group='social') {
    return {schemaVersion:1,id:uid(),brandId,revision:0,updatedAt:new Date().toISOString(),name:'',brief:'',audience:'',message:'',objective:'Awareness',focus:'product',productId:'',productName:'',productUrl:'',variant:'',group,language:'English',people:'Decide from the brief',lighting:'Decide from the brief',setting:'Decide from the brief',details:{},outputs:[],references:[],status:'draft'};
  }
  // A project owns its brief and plan. Studio is a destination, never a new project.
  const workspaces=[{id:'static',name:'Static Studio',available:true},{id:'video',name:'Video Studio',available:false},{id:'copy',name:'Copy Studio',available:false},{id:'adaptation',name:'Adaptation Studio',available:false}];
  function workspaceFor(kind){return kind==='video'?'video':kind==='adapt'?'adaptation':['copy','document'].includes(kind)?'copy':'static';}
  function startDraft(brandId,mode,featureId=1){
    if(!['campaign','quick'].includes(mode))throw Error('Choose Campaign or Quick Create.');
    const feature=features.find(f=>f.id===Number(featureId));
    if(mode==='quick'&&feature?.kind!=='image')throw Error('Quick Create currently supports static recipes.');
    const d=newDraft(brandId,feature?.group||'social');d.creationMode=mode;
    d.planning={strategy:{proposition:'',approach:''},concepts:[],team:'',deadline:''};
    if(mode==='quick'){d.outputs=[output(feature.id)];d.name=feature.id===10?'GMB / store post':feature.name;}
    return d;
  }
  function assetPlan(d){
    const concepts=d.planning?.concepts||[];
    return (d.outputs||[]).map((o,index)=>{const f=features.find(f=>f.id===o.featureId);const workspace=workspaceFor(f?.kind);return {id:o.id,index,name:o.name?.trim()||f?.name||'Unavailable recipe',workspace,available:!!f&&workspace==='static',conceptId:concepts.some(c=>c.id===o.conceptId)?o.conceptId:'',format:o.width+' × '+o.height,language:o.language||d.language,status:'Planned',slides:f?.id===9?o.slides:1};});
  }
  function planIssues(d){const issues=[];if(!d.outputs?.length)issues.push('Add at least one deliverable.');
    if(d.creationMode==='campaign'){
      if(!d.planning?.strategy?.proposition?.trim())issues.push('Add the campaign proposition.');
      const concepts=d.planning?.concepts||[];
      if(!concepts.length)issues.push('Add at least one creative concept.');
      if(concepts.some(c=>!c.name?.trim()||!c.idea?.trim()))issues.push('Give each concept a name and an idea.');
      if(assetPlan(d).some(a=>!a.conceptId))issues.push('Assign every deliverable to a concept.');
    }
    return issues;
  }
  // Recipe-specific planning UI. These inputs do not establish source approval.
  const staticRecipes={
    1:{story:'Turn one product benefit into a focused ad.',fields:[['benefit','Main benefit'],['proof','Supporting source','textarea'],['qualifier','Qualification or disclaimer']],checks:['Benefit matches the exact product','Headline and supporting proof agree'],handoff:'Review the image and its saved checks, edit if needed, then download PNG or JPEG.'},
    2:{story:'Explain a product technology using the supplied visual evidence.',fields:[['technology','Technology name'],['mechanism','What to explain','textarea'],['source','Supplied diagram / cutaway source','textarea']],checks:['Technology wording is exact','Internal layers are supported by this SKU’s source'],handoff:'Review technology labels and product construction before editing or downloading.'},
    3:{story:'Create a promotional offer with its terms and dates.',fields:[['offer','Offer and price wording','textarea'],['terms','Terms and qualifications','textarea'],['offerStart','Offer starts','date'],['offerEnd','Offer ends','date'],['destination','CTA destination','url']],checks:['Price and terms are supplied','Offer dates are in the correct order'],handoff:'Check the complete offer and expiry date before downloading. Publishing is separate.'},
    4:{story:'Communicate a supported claim without losing its qualification.',fields:[['claim','Exact claim','textarea'],['proof','Claim source','textarea'],['qualifier','Required qualification','textarea']],checks:['Claim has an exact source','Qualifications remain readable'],handoff:'Review the claim and qualification together, then edit or download the image.'},
    5:{story:'Plan a coherent, ordered set of product-page images.',part:'Image',parts:['Product hero','Benefit detail','Material / technology'],fields:[['source','Product-page requirements','textarea'],['filename','Filename prefix'],['alt','Shared image description','textarea']],checks:['Every image has a distinct job','Image descriptions match the product'],handoff:'Review each generated image separately. A complete image set requires all planned items.'},
    6:{story:'Plan marketplace modules against the selected marketplace’s template.',part:'Module',parts:['Hero module','Benefit module','Product detail'],fields:[['marketplace','Marketplace / account'],['template','Module template reference'],['eligibility','Eligibility and module constraints','textarea'],['proof','Comparison / claim source','textarea']],checks:['Module slots match supplied templates','Eligibility and claims are confirmed externally'],handoff:'Download reviewed module images. Marketplace upload and acceptance happen separately.'},
    7:{story:'Create a banner for a specific page and placement.',fields:[['brandedHost','Visible branded header','select',['Yes','No']],['placement','Page and placement'],['destination','CTA destination','url'],['fileLimit','Required file limit'],['alt','Accessible image description','textarea']],checks:['Dimensions match the placement','CTA and destination agree'],handoff:'Download the required image format. Website publishing is not performed here.'},
    8:{story:'Create a story with space for platform interface elements.',fields:[['publishing','Publishing context','select',['Organic','Paid']],['platform','Story platform'],['safeArea','Safe-area / platform template notes','textarea'],['interaction','Link sticker or interaction notes','textarea']],checks:['Copy and logo avoid the specified interface area','Text remains readable at viewing size'],handoff:'Review the final story and add platform stickers separately before sharing.'},
    9:{story:'Build an ordered story across several carousel slides.',part:'Slide',parts:[],fields:[['narrative','Narrative / progression','textarea'],['caption','Accompanying caption','textarea'],['destination','CTA destination','url']],checks:['Slide order makes sense','Claims and product identity stay consistent across slides'],handoff:'Review every slide in order. Downloading one image does not export the full carousel.'},
    10:{story:'Create a local store or Google Business Profile post.',fields:[['storeName','Store name'],['address','Address / location','textarea'],['destination','Map or landing-page URL','url'],['localCTA','Local call to action']],checks:['Store address and destination are correct','Offer wording includes applicable terms'],handoff:'Download the reviewed visual; post it to the selected store account separately.'},
    11:{story:'Prepare an in-store print design for a named vendor specification.',fields:[['vendor','Printer / vendor'],['template','Vendor template reference'],['physicalWidth','Finished width','number'],['physicalHeight','Finished height','number'],['unit','Physical units','select',['mm','cm','in']],['bleed','Vendor-specified bleed'],['stock','Stock and finish'],['print','Proof and handoff requirements','textarea']],checks:['Vendor supplies dimensions, bleed and colour requirements','Physical proof is reviewed before production'],handoff:'PNG/JPEG is a screen preview. Use the current studio’s print handoff for proofs and vendor files; it is not certified print-ready.'},
    12:{story:'Create a co-branded asset with explicit partner requirements.',fields:[['partner','Partner name'],['partnerAsset','Partner asset / reference'],['lockup','Logo lockup and placement instructions','textarea'],['reviewer','Required approver']],checks:['Correct partner assets are attached','Partner review requirements are recorded'],handoff:'Review the co-branding and seek partner approval separately. Downloads do not send approval requests.'},
    13:{story:'Turn a corporate announcement into a LinkedIn visual.',fields:[['occasion','Announcement / occasion'],['facts','Names, roles, dates and facts','textarea'],['proof','Source for announcement','textarea']],checks:['Names and roles are accurate','Announcement facts have a source'],handoff:'Review the visual and wording before editing or downloading for LinkedIn.'},
    14:{story:'Create a messaging visual for a defined channel and audience.',fields:[['channel','Channel','select',['WhatsApp','RCS','Other']],['fileLimit','Channel file / size requirements'],['personalisation','Example placeholders','textarea'],['fallback','Fallback wording','textarea']],checks:['Placeholder examples have fallback wording','Image is readable in the destination app'],handoff:'Download a preview image. No messages are sent and no personalisation data is merged.'},
    15:{story:'Create a blog hero or Open Graph image tied to an article.',fields:[['articleTitle','Article title'],['destination','Article URL','url'],['facts','Key facts / source','textarea'],['alt','Image description','textarea']],checks:['Graphic reflects the article','Title, source and image description agree'],handoff:'Download the image. Site metadata and publishing are managed outside this screen.'}
  };
  function staticRecipe(id){return staticRecipes[Number(id)]||null;}
  const featureCoverage=features.map(f=>({id:f.id,name:f.name,scope:f.kind==='image'?'static':'deferred',workspace:workspaceFor(f.kind),story:staticRecipe(f.id)?.story||'Outside this static-studio pass.'}));
  function staticParts(o){const r=staticRecipe(o.featureId);if(!r?.part)return [];const count=o.featureId===9?Math.min(12,Math.max(2,Math.trunc(Number(o.slides))||5)):(o.staticParts?.length||r.parts.length);return Array.from({length:count},(_,i)=>{const part=o.staticParts?.[i]||{id:o.id+'-part-'+(i+1),name:r.parts[i]||r.part+' '+(i+1),copy:'',alt:'',width:o.width,height:o.height};return o.featureId===6?part:{...part,width:o.width,height:o.height};});}

  function validateBrief(d,context={}){
    const errors=validate(d),products=context.products||[];
    if(d.focus==='product'&&d.productId){const p=products.find(p=>p.id===d.productId);if(!p)errors.productId='This saved product is unavailable. Choose a current product or add its name.';else if(p.variants?.length&&(!d.variant||!p.variants.some(v=>String(v.id)===String(d.variant))))errors.variant='Choose an exact product variant.';}
    if(d.focus==='collection'){if(!d.productIds?.length)errors.productIds='Choose at least one saved product for the collection.';else for(const id of d.productIds){const p=products.find(p=>p.id===id);if(!p||p.variants?.length&&!p.variants.some(v=>String(v.id)===String(d.collectionVariants?.[id])))errors.productIds='Choose available products and an exact variant for each.';}}
    if(d.productUrl&&d.focus==='product'&&context.brand?.brandUrl){try{const u=new URL(d.productUrl);if(u.protocol!=='https:'||u.hostname.replace(/^www\./,'')!==new URL(context.brand.brandUrl).hostname.replace(/^www\./,''))errors.productUrl='Use an official URL for '+(context.brand.name||'this brand')+'.';}catch{errors.productUrl='Enter a complete https:// product URL.';}}
    for(const o of d.outputs||[]){const values=o.staticValues||{},key='output-'+o.id;if(values.offerStart&&values.offerEnd&&values.offerEnd<values.offerStart)errors[key]='Offer end date must come after the start date.';
      for(const [name,,type] of staticRecipe(o.featureId)?.fields||[]){if(!values[name])continue;if(type==='url'){try{const url=new URL(values[name]);if(!['https:','http:'].includes(url.protocol))throw Error();}catch{errors[key]='Use a complete http:// or https:// destination URL.';}}if(type==='number'&&(!Number.isFinite(Number(values[name]))||Number(values[name])<=0))errors[key]='Physical dimensions must be positive numbers.';}
      if(o.staticParts?.length>20)errors[key]='Use up to 20 items per set.';
      if(staticParts(o).some(p=>!Number.isInteger(Number(p.width))||!Number.isInteger(Number(p.height))||Number(p.width)<64||Number(p.height)<64||Number(p.width)>8192||Number(p.height)>8192))errors[key]='Item dimensions must be whole pixels between 64 and 8192.';
    }
    return errors;
  }
  function validate(d) {
    const errors={};
    if(!d.name?.trim()) errors.name='Give this project a name.';
    if(!d.brief?.trim()) errors.brief='Tell us what you want to create.';
    if(d.creationMode==='quick'&&d.outputs?.length!==1)errors.outputs='Quick Create needs exactly one recipe.';
    if(!d.outputs?.length) errors.outputs='Add at least one deliverable.';
    if(d.focus==='product'&&!d.productId&&!d.productName?.trim()) errors.productName='Choose a saved product or add its name.';
    if(d.productUrl&&d.focus==='product') {try{const u=new URL(d.productUrl);if(u.protocol!=='https:')throw Error();}catch{errors.productUrl='Enter a complete https:// product URL.';}}
    for(const o of d.outputs||[]) {
      const f=features.find(f=>f.id===o.featureId);
      if(!f) {errors['output-'+o.id]='This deliverable is unavailable. Choose another.';continue;}
      if(['image','video','adapt'].includes(f.kind)&&(!Number.isInteger(o.width)||!Number.isInteger(o.height)||o.width<64||o.height<64||o.width>8192||o.height>8192)) errors['output-'+o.id]='Use whole-pixel dimensions between 64 and 8192.';
      if(f.id===9&&(!Number.isInteger(o.slides)||o.slides<2||o.slides>12)) errors['output-'+o.id]='Choose between 2 and 12 slides for this preview.';
      if(f.kind==='video'&&(!Number.isFinite(o.duration)||o.duration<1||o.duration>600)) errors['output-'+o.id]='Use a duration between 1 and 600 seconds for this preview.';
    }
    if(d.details?.offerStart&&d.details?.offerEnd&&d.details.offerEnd<d.details.offerStart)errors.offerEnd='End date must come after the start date.';
    return errors;
  }
  function requiredDetails(d) {return [...new Set((d.outputs||[]).flatMap(o=>features.find(f=>f.id===o.featureId)?.fields||[]))].filter(k=>fields[k]);}
  function units(d) {return (d.outputs||[]).reduce((n,o)=>n+([5,6].includes(o.featureId)?staticParts(o).length:o.featureId===9?o.slides:1),0);}
  function status(project) {
    if(project.loadError)return {label:'Couldn’t load',tone:'red',action:'View recovery'};
    if(project.local)return {label:project.status==='draft'?'Draft':'Layout preview',tone:'purple',action:project.status==='draft'?'Continue brief':'Open preview'};
    if(['running','queued','preparing'].includes(project.status))return {label:'Creating',tone:'blue',action:'View progress'};
    if(project.status==='failed')return {label:'Needs attention',tone:'red',action:'View details'};
    if(!project.results?.some(r=>safeAsset(r.imageUrl)))return {label:'Needs attention',tone:'amber',action:'View details'};
    return {label:project.results.every(r=>r.ready===true)?'Checks passed':'Ready',tone:'green',action:'Review options'};
  }
  function safeAsset(url) {return typeof url==='string'&&(/^\/creative-ai\/api\/(jobs|brands)\/[a-zA-Z0-9_./%|-]+$/.test(url)||/^\/creative-ai\/api\/jobs\/[a-zA-Z0-9_-]+\/editable\/(continuity|exploration)\/[a-zA-Z0-9_-]+\/preview\?revision=\d+$/.test(url))&&!url.includes('..')?url:'';}
  function completeSet(p,route){const slots=p.placements||[];if(slots.length<2)return null;const rows=slots.map(s=>(p.results||[]).find(r=>r.route===route&&r.placementId===s.id&&safeAsset(r.imageUrl)));return rows.every(Boolean)?rows:null;}
  function carouselDownload(p,result) {
    return (p.carousels||[]).find(c=>c.route===result.route&&safeAsset(c.downloadUrl)&&c.downloadUrl.startsWith('/creative-ai/api/jobs/'+(p.sourceJobId||p.id)+'/files/')&&c.slides?.length>1&&c.slides.some(s=>s.placementId===result.placementId)&&c.slides.every((s,i)=>s.index===i+1&&safeAsset(s.imageUrl)&&(p.results||[]).some(r=>r.route===result.route&&r.placementId===s.placementId&&r.imageUrl===s.imageUrl)))||null;
  }
  function jobProgress(p){
    const ids=['preparing','creating','reviewing','ready'],labels=['Preparing','Creating','Reviewing','Ready'];
    const mapping={queued:'preparing',preparing:'preparing',brand:'preparing',research:'preparing',guardian:'preparing',strategy:'preparing',concepts:'preparing',copy:'preparing',art:'preparing',reconciliation:'preparing',generation:'creating',statics:'creating',review:'reviewing',quality:'reviewing'};
    const running=['queued','preparing','running'].includes(p.status),finished=['finished','completed','complete','succeeded'].includes(p.status),hasOutput=(p.results||[]).some(r=>safeAsset(r.imageUrl));
    const active=(p.activeStages||[]).map(k=>mapping[k]).filter(Boolean);
    let current=active.length?ids.find(id=>active.includes(id)):mapping[p.stage]||mapping[p.progress?.stage]||mapping[p.status]||null;
    if(!running)current=finished&&hasOutput?'ready':null;
    const complete=id=>(p.stages||[]).some(s=>s.id===id&&s.status==='completed');
    const recorded=[complete('brand')&&complete('concepts'),complete('statics'),complete('quality'),current==='ready'];
    const label=p.status==='needs-input'?'A detail is needed':p.status==='failed'?'Creation needs attention':p.status==='partial'?'Some outputs need attention':current==='ready'?'Ready':current?labels[ids.indexOf(current)]:running?'Waiting for a stage update':'No completed output yet';
    const description=current==='preparing'?(p.status==='queued'?'Your request is waiting to start.':'Preparing the brief, product references and design.'):
      current==='creating'?(active.includes('reviewing')?'Creating images; some options are already being reviewed.':'Creating your images.'):
      current==='reviewing'?'Checking the generated images.':current==='ready'?'Your options are ready to review. Check any flagged issues before sharing.':running?'The request is still active. The next recorded stage will appear here.':'Your saved work remains available below.';
    return {current,label,description,running,steps:ids.map((id,i)=>({id,label:labels[i],state:id===current?'current':recorded[i]?'completed':'pending'}))};
  }
  // One request at a time, bound to a visible job. Timers never start generation.
  function createProgressPoller({read,apply,error,setTimer=setTimeout,clearTimer=clearTimeout}){
    let target=null,timer=null,flight=null,version=0,failures=0;
    function clear(){if(timer!==null)clearTimer(timer);timer=null;}
    function plan(ms){clear();if(target&&!flight)timer=setTimer(()=>{timer=null;run();},ms);}
    async function run(){if(!target||flight)return;const t={...target},v=version,controller=new AbortController(),f={controller};flight=f;
      try{const result=await read(t,controller.signal);if(v!==version||controller.signal.aborted)return;failures=0;apply(result,t);}
      catch(e){if(v===version&&!controller.signal.aborted){failures++;error(e,t);}}
      finally{if(flight===f)flight=null;if(target&&!flight){if(v!==version)plan(0);else if(target.repeat||failures)plan(Math.min(30000,5000*2**Math.min(failures,3)));}}
    }
    return {watch(next,{immediate=false}={}){
      const changed=target?.key!==next?.key;
      if(changed){version++;clear();flight?.controller.abort();failures=0;target=next;if(target&&!flight)plan(0);}
      else{target=next;if(!next){clear();return;}if(!next.repeat)clear();if(immediate&&!flight)plan(0);}
    },stop(){this.watch(null);}};
  }
  function normalizeJob(j,brandId) {
    if((j.brandId||j.intake?.brandId)!==brandId)throw Error('This project belongs to a different brand.');
    return {...j,brandId,local:false,name:j.intake?.campaignName||j.intake?.productName||j.productSummary?.name||j.concepts?.find(c=>c.route==='continuity')?.name||'Saved project',brief:j.intake?.brief||j.strategy?.statement||'',updatedAt:j.updatedAt||j.createdAt,results:(j.results||[]).map(r=>({...r,imageUrl:safeAsset(r.imageUrl)}))};
  }
  function storage(store) {
    const prefix='studio-ui-v1:';
    function key(brand,id){return prefix+brand+':'+id;}
    function read(brand,id){const raw=store.getItem(key(brand,id));if(!raw)return null;let d;try{d=JSON.parse(raw);}catch{throw Error('This saved draft could not be read. It has not been removed.');}if(d.schemaVersion!==1||d.brandId!==brand||d.id!==id||!Array.isArray(d.outputs))throw Error('This draft needs recovery. The saved record is unchanged.');return d;}
    function list(brand){const drafts=[],errors=[];for(let i=0;i<store.length;i++){const k=store.key(i);if(!k?.startsWith(prefix+brand+':'))continue;try{drafts.push(read(brand,k.slice((prefix+brand+':').length)));}catch(e){errors.push(e.message);}}return {drafts:drafts.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),errors};}
    function save(d,expected=d.revision){const prior=read(d.brandId,d.id);if(prior&&prior.revision!==expected)throw Error('This draft changed in another tab. Reload it or save a separate copy.');const next={...clone(d),revision:(prior?.revision||0)+1,updatedAt:new Date().toISOString()};store.setItem(key(d.brandId,d.id),JSON.stringify(next));return next;}
    return {read,list,save,key};
  }
  // User-story catalogue doubles as the deterministic, provider-free screen inventory.
  const journeyRows=[
    ['brief','Create','Write a one-page brief','brief','ready','Describe the idea, product, audience and formats before committing to creation.','As a marketer, I can complete one brief without repeating inputs.'],
    ['brief-invalid','Create','Missing required details','brief','error','Give the project a name, add the brief and choose a product or brand-only focus.','As a marketer, I see errors beside the fields and keep everything I entered.'],
    ['variant-required','Create','Choose an exact variant','brief','attention','This product has several variants. Choose the size and colour to use.','As a marketer, I choose the exact SKU rather than accepting an inferred variant.'],
    ['reference-failed','Create','Reference upload failed','brief','error','The reference could not be saved. The rest of your brief is still open.','As a marketer, I can retry a failed reference without losing my brief.'],
    ['draft-conflict','Create','Draft changed in another tab','brief','error','A newer draft exists. Compare versions or save your changes as a separate copy.','As a marketer, I resolve a conflict without overwriting newer work.'],
    ['save-failed','Create','Draft save failed','brief','error','Your latest changes are still on screen. Retry or download the brief before leaving.','As a marketer, I can recover my work when device storage is unavailable.'],
    ['brief-summary','Create','Confirm the brief','confirm','ready','Review deliverables, product and audience before starting.','As a marketer, I know exactly what will be created and whether a cost is available.'],
    ['generation-unavailable','Create','Creation not connected','confirm','attention','This interface can save the brief. Creation starts in the current studio until the connection is ready.','As a marketer, I can distinguish preparing a brief from paying for generation.'],
    ['queued','Create','Waiting to start','progress','waiting','Your request is queued. You can leave this page and return to the project.','As a marketer, I can identify a queued request without submitting it twice.'],
    ['creating','Create','Creating your options','progress','running','Your creative options are being prepared. Completed work appears here as it becomes available.','As a marketer, I see the current step without a fabricated ETA.'],
    ['connection-lost','Create','Connection interrupted','progress','error','We cannot confirm the latest status. The request may still be running. Updates resume when the connection returns.','As a marketer, I recover a connection without creating duplicate paid requests.'],
    ['needs-input','Create','One detail needs your input','progress','attention','Confirm the product variant before this request can continue.','As a marketer, I can answer a precise question and resume the existing project.'],
    ['generation-failed','Create','Creation interrupted','progress','error','The request did not finish. Completed artwork remains available.','As a marketer, I keep completed work when another item fails.'],
    ['partial','Create','Some options are ready','project','attention','One option is ready to review; another needs attention.','As a marketer, I can work with completed options while resolving the remaining item.'],
    ['project-ready','Review','Project overview','project','ready','Choose a deliverable to review its options.','As a marketer, I can see a campaign’s deliverables and their next actions in one place.'],
    ['review','Review','Review creative and rationale','review','ready','Explore the selected option, its design intent and saved artwork checks.','As a marketer, I understand why this design was chosen without reading an essay.'],
    ['review-concerns','Review','Artwork needs attention','review','attention','The logo and supporting copy need a closer look. Selection does not remove review concerns.','As a marketer, I see quality concerns before sharing an image.'],
    ['rationale-unavailable','Review','Rationale unavailable','review','error','Saved reasoning could not load. The artwork and editing actions are still available.','As a marketer, I can retry reasoning without losing access to the artwork.'],
    ['review-unrated','Review','No saved ratings','review','attention','This image has no recorded category scores. It is shown as not rated.','As a marketer, I am not misled by invented quality scores.'],
    ['image-unavailable','Review','Artwork could not load','review','error','The saved image could not load. Its project record and review are still retained.','As a marketer, I can retry an unavailable asset without it disappearing.'],
    ['feedback-saved','Review','Feedback saved','review','success','Your note was saved for this option. It does not automatically change brand guidance or trigger AI.','As a marketer, I know what saving feedback does.'],
    ['editor','Edit','Edit the selected creative','editor','ready','Select text or an image to see the relevant controls.','As a marketer, I can edit text, move elements and add an image without regenerating.'],
    ['editor-prepare','Edit','Prepare text for editing','editor','waiting','The original image remains available while editable text is prepared.','As a marketer, I understand that an existing flat image needs preparation first.'],
    ['editor-asset-missing','Edit','Image layer unavailable','editor','error','This image could not load. Its layer, dimensions and position stay saved.','As a marketer, I can retry or replace an image without losing its layer.'],
    ['editor-font-missing','Edit','Font file unavailable','editor','attention','A font could not load. Retry it or choose an available font before export.','As a marketer, I see a font issue instead of a silently changed layout.'],
    ['editor-overflow','Edit','Text needs more room','editor','attention','The headline no longer fits. Widen the text box, reduce its size or edit the wording.','As a marketer, I can fix long text without changing the photograph.'],
    ['editor-save-failed','Edit','Changes not saved','editor','error','Your edits are still open. Retry saving or keep this tab open while you recover them.','As a marketer, I do not mistake failed saving for a saved revision.'],
    ['editor-revisions','Edit','Original and revisions','editor','success','Client changes are separate from the original AI design.','As a marketer, I can return to an earlier version without overwriting the original.'],
    ['download','Download','Choose download format','download','ready','Download the selected saved artwork in its original dimensions.','As a marketer, I can choose the correct format and revision.'],
    ['download-preparing','Download','Preparing the file','download','waiting','Images and fonts must finish loading before the export is ready.','As a marketer, I know when an export is still being prepared.'],
    ['download-failed','Download','Download failed','download','error','The file could not be prepared. Retry; your saved artwork is unchanged.','As a marketer, I can retry a failed export without regenerating artwork.'],
    ['download-complete','Download','Download prepared','download','success','The file has been handed to your browser. Check your browser’s Downloads.','As a marketer, I know what was exported without an unsupported claim that it reached disk.'],
    ['download-flagged','Download','Download with review concerns','download','attention','This draft retains its review notes. Downloading does not approve it for publication.','As a marketer, I can export a draft while keeping review limitations visible.'],
    ['projects','Library & work','Find and resume work','projects','ready','Search projects and continue from the last saved state.','As a marketer, I can recognise my campaign and its next action.'],
    ['projects-empty','Library & work','No projects yet','projects','empty','Start a brief to create the first project for this brand.','As a marketer, I have a clear first action in a new workspace.'],
    ['search-empty','Library & work','No matching projects','projects','empty','Try another name or clear the filters.','As a marketer, I can recover from a search with no results.'],
    ['projects-failed','Library & work','Projects could not load','projects','error','Retry loading. This does not mean your projects were deleted.','As a marketer, I can distinguish a network failure from an empty workspace.'],
    ['library','Library & work','Browse saved products','library','ready','Products and brand references stay in the selected workspace.','As a marketer, I can reuse approved source material without another website lookup.'],
    ['library-empty','Library & work','No saved materials','library','empty','Add materials through the existing brand library.','As a marketer, I know where to add missing source material.'],
    ['library-failed','Library & work','Library partially unavailable','library','error','Some materials could not load. Saved files remain unchanged.','As a marketer, I can retry missing library items without losing the rest.'],
    ['library-unprocessed','Library & work','File saved, not processed','library','attention','A saved upload is not necessarily parsed or applied to new work.','As a marketer, I can distinguish uploaded files from usable extracted guidance.'],
    ['usage','Account & recovery','View recorded usage','costs','ready','Review recorded INR usage, with estimates separate from confirmed charges.','As a marketer, I can understand costs without interpreting provider tokens.'],
    ['usage-unavailable','Account & recovery','Usage unavailable','costs','error','Billing data could not load. An unknown cost is not ₹0.','As a marketer, I can tell missing billing from zero spend.'],
    ['wrong-brand','Account & recovery','Project not in this workspace','recovery','error','This project is not available in the selected brand. Choose the correct workspace or return home.','As a marketer, I cannot accidentally edit another brand’s project.'],
    ['not-found','Account & recovery','Link unavailable','recovery','error','This link no longer resolves to an available item. Your other work is unchanged.','As a marketer, I have a safe path back from a broken link.']
  ];
  const journeys=journeyRows.map(([id,group,title,screen,state,message,story])=>({id,group,title,screen,state,message,story}));
  function reviewSummary(unit,result={}){
    const art=unit?.plannedArt||{},sentence=(v,re)=>typeof v==='string'?v.split(/(?<=[.!?;])\s+|\n+/).find(s=>re.test(s))||'':'',text=v=>typeof v==='string'?v:typeof v?.direction==='string'?v.direction:'';
    const decisions=[['Message','message',result.conceptExplanation?.takeaway],['Layout','panel',text(art.rationale)||sentence(art.composition,/layout|headline|copy|product|zone/i)||result.compositionRationale?.text],['Logo','shield',sentence(art.composition,/logo/i)||art.logo?.treatment],['Scene','image',text(art.scene)||text(art.lighting)||text(art.camera)]].map(([title,icon,body],i)=>({id:i+1,title,icon,text:text(body),basis:'intent',recorded:!!text(body)}));
    const scores=[['communication','Message clarity'],['visualCraft','Visual craft'],['placementFit','Format fit'],['brandRecognition','Brand recognition']].map(([id,title])=>{const q=unit?.review?.qualityScores?.find(q=>q.criterion===id),valid=q&&Number.isFinite(q.score)&&q.score>=0&&q.score<=100&&q.usedInScore===true&&typeof q.evidence?.method==='string'&&!!q.evidence.method.trim()&&!['unavailable','synthetic-simulation'].includes(q.evidence.method)&&!!q.evidence?.observation;return {id,title,score:valid?q.score/20:null,originalScore:valid?q.score:null,note:valid?q.evidence.observation:'No eligible rating was recorded.'};});
    const issues=(unit?.review?.criticalChecks||[]).filter(c=>!['pass','not-applicable'].includes(c.status));
    const actions={
      'logo-identity':['Logo','Compare with the approved logo in Brand Library.','brand','Check brand assets'],
      'product-identity':['Product accuracy','Compare the product with the saved SKU images.','products','Check product'],
      'supported-claims':['Claims','Check the wording against the saved product information.','products','Check product'],
      'exact-required-copy':['Required wording','Compare and correct the wording in the editor.','edit','Edit wording'],
      'required-text-legibility':['Readability','Increase text size or contrast in the editor, then inspect the export.','edit','Improve readability'],
      'mandatory-brand-rules':['Brand rules','Compare this choice with the saved brand guidance.','brand','Check brand assets'],
      'verified-upload-constraints':['Format requirements','Check the size, margins and upload requirements in the saved report.','report','View requirements'],
      'reference-boundary':['Reference use','Check the reference findings in the saved report.','report','View findings']
    };
    const concerns=[],seen=new Map();
    for(const raw of [...issues,...(unit?.review?.findings||[]).filter(f=>f.severity!=='advisory'),...(unit?.review?.verificationDependencies||[]),...(Array.isArray(result.unresolved)?result.unresolved:[])]){const c=typeof raw==='string'?{note:raw}:raw;if(!c||['pass','not-applicable','resolved'].includes(c.status))continue;if(c.request&&c.criterion&&concerns.some(x=>x.criterion===c.criterion))continue;const criterion=c.criterion||'review-note',observation=text(c.defect)||text(c.evidence?.observation)||text(c.note)||text(c.request)||'This check is unresolved.',key=criterion+'|'+observation.trim().toLowerCase();if(seen.has(key))continue;seen.set(key,true);const [title,nextStep,action,label]=actions[criterion]||['Review concern','Check this item before sharing.','report','View finding'];const failed=['fail','critical','creative','major'].includes(c.status||c.severity);concerns.push({criterion,title,observation,status:failed?'fail':'unverified',nextStep:text(c.correction)||(!failed&&action==='edit'?'Check the wording, size and contrast against the brief before making changes.':nextStep),action,label:!failed&&action==='edit'?'Check in editor':label});}
    // A missing evaluator is one recovery task, not a separate invented defect for every check.
    const missing=concerns.filter(c=>c.status==='unverified'&&/^No qualified evaluator evidence available\.?$/i.test(c.observation.trim()));
    if(missing.length>1){const index=concerns.indexOf(missing[0]);for(const c of missing)concerns.splice(concerns.indexOf(c),1);concerns.splice(index,0,{criterion:'review-coverage',title:'Review incomplete',observation:'Not verified: '+missing.map(c=>c.title).join(', ')+'.',status:'unverified',nextStep:'Check the unverified items before sharing.',action:'report',label:'View missing checks'});}
    concerns.sort((a,b)=>(a.status==='fail'?0:1)-(b.status==='fail'?0:1));
    return {decisions,scores,issues,concerns,reviewAvailable:!!unit?.review,sources:unit?.brandGuidelineReasoning?.applications||[]};
  }
  function feedbackKey(p,item,r){return [p.id,item.id,r.route||'',r.versionId||'original',r.imageHash||r.imageUrl||'unavailable'].join('|');}
  function organization(store){
    const prefix='studio-organise-v1:';
    function read(brandId){const raw=store.getItem(prefix+brandId);if(!raw)return {schemaVersion:1,brandId,revision:0,entries:{},copies:[]};let v;try{v=JSON.parse(raw);}catch{throw Error('Your saved organisation could not be read. It has not been overwritten.');}if(v.schemaVersion!==1||v.brandId!==brandId||!Number.isInteger(v.revision)||!v.entries||typeof v.entries!=='object'||Array.isArray(v.entries)||!Array.isArray(v.copies)||v.copies.some(p=>p.brandId!==brandId))throw Error('Your saved organisation needs recovery. Existing data is unchanged.');return v;}
    function save(next,expected=next.revision){const prior=read(next.brandId);if(prior.revision!==expected)throw Error('Your organisation changed in another tab. Reload before trying again.');const value={...clone(next),revision:prior.revision+1};store.setItem(prefix+next.brandId,JSON.stringify(value));return value;}
    function update(value,key,patch){if(!/^(project|creative):/.test(key)||!patch||Object.keys(patch).some(k=>!['name','campaign','tags','favourite','shortlisted','trashedAt','savedAt'].includes(k)))throw Error('Unsupported organisation change.');const next=clone(value);const clean={...patch};for(const k of ['name','campaign'])if(k in clean){if(typeof clean[k]!=='string'||clean[k].length>160)throw Error('Use a name of up to 160 characters.');clean[k]=clean[k].trim();if(k==='name'&&!clean[k])throw Error('Enter a name.');}if('tags' in clean){if(!Array.isArray(clean.tags)||clean.tags.length>20||clean.tags.some(t=>typeof t!=='string'||t.length>40))throw Error('Use up to 20 tags, each under 40 characters.');clean.tags=[...new Set(clean.tags.map(t=>t.trim()).filter(Boolean))];}for(const k of ['favourite','shortlisted'])if(k in clean&&typeof clean[k]!=='boolean')throw Error('Invalid bookmark value.');for(const k of ['trashedAt','savedAt'])if(k in clean&&clean[k]!==null&&!Number.isFinite(Date.parse(clean[k])))throw Error('Invalid saved time.');next.entries[key]={...next.entries[key],...clean};return save(next);}
    function duplicate(value,p,result){if(p.brandId!==value.brandId)throw Error('Cannot copy a different brand’s project.');if(p.local)throw Error('Use draft storage to copy a brief.');if(result&&!p.results.some(r=>r.route===result.route&&r.placementId===result.placementId&&(r.versionId||'original')===(result.versionId||'original')&&r.imageUrl===result.imageUrl))throw Error('The selected creative is not part of this project.');const next=clone(value),id=uid();const copy={id,brandId:p.brandId,local:false,collectionCopy:true,sourceJobId:p.sourceJobId||p.id,name:String(result?.name||p.name||'Project').slice(0,155)+' copy',brief:p.brief||'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),status:p.status,intake:clone(p.intake||{}),productSummary:clone(p.productSummary||{}),placements:clone((p.placements||[]).filter(v=>!result||v.id===result.placementId)),results:clone(result?[result]:p.results||[])};next.copies.push(copy);return {value:save(next),copy};}
    return {read,save,update,duplicate,key:brandId=>prefix+brandId};
  }
  function generationProfile(d){
    if(d?.focus!=='product'||d.outputs?.length!==1)return null;
    const o=d.outputs[0];
    const profile=(slug,label,extra={})=>({placementId:'custom:studio-'+slug,label,width:o.width,height:o.height,...extra});
    if([5,6].includes(o.featureId)){
      const parts=staticParts(o);if(!parts.length||parts.length>6||parts.some(p=>!Number.isInteger(p.width)||!Number.isInteger(p.height)||p.width<64||p.height<64||p.width>8192||p.height>8192))return null;
      if(o.featureId===5&&parts.length===1&&o.width===1600&&o.height===1600&&o.formatId==='custom')return profile('commerce-gallery','product-page image');
      const customProfiles=parts.map((p,i)=>({id:'custom:recipe-'+(o.featureId===5?'product-image':'marketplace-module')+'-'+String(i+1).padStart(2,'0'),name:p.name||'Item '+(i+1),platform:o.featureId===5?'Product page':'Marketplace module',publisher:'studio',placement:'image-module',assetType:'static',canvas:{width:p.width,height:p.height,unit:'px'},exportContract:{formats:['png']},displayContext:'Item '+(i+1)+' of '+parts.length+'; '+(p.name||'')+'. '+(p.copy||'')+' User-selected module dimensions; publisher eligibility is not certified.'}));
      return {placementId:customProfiles[0].id,placementIds:customProfiles.map(p=>p.id),customProfiles,label:o.featureId===5?'product-page image set':'marketplace modules',width:o.width,height:o.height,unitCount:parts.length,...(o.featureId===5?{omitLogo:true}:{})};
    }
    if(o.featureId===9){if(!Number.isInteger(o.slides)||o.slides<2||o.slides>6||o.width!==1080)return null;if(o.height===1080&&o.formatId==='square')return profile('carousel-square','carousel',{carouselSlideCount:o.slides});if(o.height===1350&&o.formatId==='portrait')return profile('carousel-portrait','carousel',{carouselSlideCount:o.slides});return null;}
    if(o.slides!==1)return null;
    if(o.featureId===7&&o.width===1920&&o.height===640&&o.formatId==='banner')return profile('web-banner','website banner');
    if(o.featureId===14&&o.width===1080){if(o.height===1080&&o.formatId==='square')return profile('whatsapp-card','WhatsApp visual');if(o.height===1920&&o.formatId==='story')return profile('whatsapp-status','WhatsApp status');}
    if(o.featureId===5&&o.width===1600&&o.height===1600&&o.formatId==='custom'&&staticParts(o).length===1)return profile('commerce-gallery','product-page image');
    if([2,3,4,10,12].includes(o.featureId)&&o.width===1080&&o.height===1080&&o.formatId==='square')return profile('social-square',features.find(f=>f.id===o.featureId).name.toLowerCase());
    if(o.featureId===15&&o.width===1200&&o.height===628&&o.formatId==='custom')return profile('social-landscape','blog graphic');
    if(o.featureId===13&&o.width===1200&&o.height===627&&o.formatId==='linkedin')return {placementId:'custom:studio-linkedin-post',label:'LinkedIn post',width:1200,height:627};
    if(o.width!==1080)return null;
    if(o.featureId===1&&o.height===1080&&o.formatId==='square')return {placementId:'custom:studio-social-square',label:'square post',width:1080,height:1080};
    if(o.featureId===8&&o.height===1920&&o.formatId==='story')return {placementId:'custom:studio-social-story',label:'Instagram Story',width:1080,height:1920};
    return null;
  }
  function creativeKey(p,r){return 'creative:'+JSON.stringify([p.id,r.placementId,r.route,r.versionId||'original',r.imageHash||r.imageUrl||'unavailable']);}
  function searchMatch(query,...values){const text=values.flatMap(v=>typeof v==='object'?JSON.stringify(v):String(v??'')).join(' ').normalize('NFKC').toLocaleLowerCase();return String(query||'').normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).every(word=>text.includes(word));}
  function composerStorage(store){
    const defaults=()=>({prompt:'',productId:'',audience:'',style:'',featureId:1,formatChosen:false});
    const key=id=>'creative-ai-home:'+id;
    function read(id){const raw=store.getItem(key(id));if(raw===null)return {version:1,brandId:id,revision:0,data:defaults()};try{const value=JSON.parse(raw);if(value.version!==1||value.brandId!==id||!Number.isInteger(value.revision)||value.revision<1||!value.data)throw Error();for(const field of ['prompt','productId','audience','style'])if(typeof value.data[field]!=='string')throw Error();if(!features.some(f=>f.kind==='image'&&f.id===Number(value.data.featureId)))throw Error();return {...value,data:{...defaults(),...value.data}};}catch{throw Error('Your saved Home draft could not be read. It has not been overwritten.');}}
    function save(id,value){const current=read(id);if(current.revision!==value.revision)throw Error('Home was changed in another tab. Your text is still here; copy it before reloading the saved version.');const data={...defaults(),...value.data};for(const field of ['prompt','productId','audience','style'])if(typeof data[field]!=='string'||data[field].length>50000)throw Error('Home inputs must be text under 50,000 characters.');data.featureId=Number(data.featureId);if(!features.some(f=>f.kind==='image'&&f.id===data.featureId))throw Error('Choose an available image format.');const next={version:1,brandId:id,revision:current.revision+1,data,updatedAt:new Date().toISOString()};store.setItem(key(id),JSON.stringify(next));return next;}
    return {read,save};
  }
  function activeWork(projects){
    const rank=p=>p.loadError||['failed','needs-input','partial'].includes(p.status)?0:p.local?1:['running','queued','preparing'].includes(p.status)?2:3;
    const rows=projects.filter(p=>p.local||p.loadError||['failed','needs-input','partial','running','queued','preparing'].includes(p.status)||p.results?.some(r=>safeAsset(r.imageUrl)&&(r.ready!==true||r.latestEdit))).slice().sort((a,b)=>rank(a)-rank(b)||String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
    // Keep one issue visible without burying drafts and artwork behind historical failures.
    let issueShown=false;return rows.filter(p=>{if(rank(p)!==0)return true;if(issueShown)return false;issueShown=true;return true;}).slice(0,4);
  }

  const navigation={
    parse(hash){const [path,query='']=String(hash||'home').replace(/^#/,'').split('?');return {path,view:path.split('/')[0],parts:path.split('/'),params:new URLSearchParams(query)};},
    projects(v={}){const q=new URLSearchParams();for(const [k,value,defaultValue] of [['status',v.filter,'all'],['sort',v.sort,'edited'],['format',v.formatFilter,'all'],['q',v.search,'']])if(value&&value!==defaultValue)q.set(k,value);return 'projects'+(q.size?'?'+q:'');},
    brandRoute(hash){const r=this.parse(hash);if(r.view==='projects')return hash;if(['home','create','recipes','creatives','favourites','costs','settings','tools','search'].includes(r.view))return r.path;if(r.view==='library')return ['product','asset'].includes(r.parts[1])?'library/'+(r.parts[1]==='product'?'products':'inspiration'):r.path;return 'projects';}
  };
  return {jobProgress,createProgressPoller,navigation,composerStorage,activeWork,completeSet,carouselDownload,generationProfile,formatPreviews,staticRecipe,staticParts,featureCoverage,validateBrief,workspaces,workspaceFor,startDraft,assetPlan,planIssues,organization,creativeKey,searchMatch,journeys,reviewSummary,feedbackKey,groups,features,fields,formats,languages,uid,clone,newDraft,output,validate,requiredDetails,units,status,safeAsset,normalizeJob,storage};
});
