'use strict';
// Editorial starting points, not publisher limits or measured font sizes.
// Only newly pinned jobs receive these recommendations; historical pins stay intact.
const version='2026-11-02.1';
const supportedVersions=new Set(['2026-10-09.2','2026-10-22.1','2026-10-22.2','2026-10-22.3','2026-10-23.1','2026-10-23.2',version]);
function supportsVersion(value){return supportedVersions.has(value);}
const classes={
 'push-image':{view:'Notification thumbnail and expanded image area',headline:5,body:0,total:8,width:300,note:'Image-only notification attachment. Zero added copy is valid; essential message and action remain native text. Check subject recognition and centre crops; do not require an advertising headline or painted button.'},
 'rcs-image':{view:'Selected RCS media crop at card width and expanded mobile view',headline:6,body:0,total:10,width:296,note:'Image-only media: zero added copy is valid. Native title, description and actions are separate. Preserve explicitly requested wording and product markings; check centre crop and subject recognition.'},
 // Amazon A+ page v1 (9 Nov 2026): wide panels carry short, large on-image text; mobile versions reuse it larger.
 'aplus-panel':{view:'Amazon A+ wide panel at a 360 CSS-pixel phone width and on desktop',headline:8,body:16,total:24,width:360,note:'Short, large on-image text only: product name, one headline and up to three feature chips. Amazon headline/body fields and alt text are separate. No CTA, links, QR codes, contacts, ratings or competitor names.'},
 'aplus-mobile':{view:'Amazon A+ mobile image at a 360 CSS-pixel phone width',headline:8,body:8,total:16,width:360,note:'Reuse the desktop panel words in larger type for a phone; never a squashed desktop panel.'},
 'aplus-image':{view:'Selected Amazon image slot at a 320 CSS-pixel preview, with separate desktop/mobile assets where specified',headline:8,body:12,total:25,width:320,note:'Image-only phase: zero added copy is valid and preferred. Native headings, paragraphs, alt text and interactive labels are separate. These optional drafting targets apply only when the user explicitly asks for artwork wording; preserve required qualifiers and genuine product markings. Inspect feature visibility and crop, not a mandatory advertising hierarchy.'},
 'micro-banner':{view:'Fixed display slot at 1:1 pixels',headline:5,body:0,total:10,width:null,note:'One short line, recognizable brand and short action. No optional paragraph, feature list or duplicate branding. Recompose rather than shrink a poster.'},
 'compact-banner':{view:'Fixed display slot at 1:1 pixels',headline:6,body:8,total:18,width:null,note:'At most one short supporting line. Narrow skyscrapers need short line lengths, not stacked paragraphs. Keep product identifiable after the final crop.'},
 'display-card':{view:'Fixed display slot at 1:1 pixels',headline:7,body:14,total:26,width:null,note:'One proposition and one action. Extra area in a half-page unit does not justify a long brochure. Review the actual slot, not an enlarged editor.'},
 'feed':{view:'Phone feed at 320 and 360 CSS-pixel widths',headline:8,body:18,total:32,width:320,note:'One clear message per image or slide. Use native caption fields for longer explanation. Essential content must survive the target app crop; caption character allowances are not artwork copy budgets.'},
 'story':{view:'Phone story/status at 320 and 360 CSS-pixel widths, with target-app controls',headline:7,body:12,total:25,width:320,note:'Keep logo, faces, product identity and action clear of native controls. Safe-zone coordinates require the current target-app preview; do not copy video/Reels exclusions onto every still story.'},
 'thumbnail':{view:'Feed thumbnail at 160 and 320 CSS-pixel widths',headline:5,body:0,total:7,width:160,note:'One recognizable focal subject and a very short hook. No explanatory paragraph. Check duration/native UI obstruction and any surface-specific replacement crop.'},
 'web':{view:'Responsive slot at 320 CSS pixels and supplied desktop breakpoint',headline:8,body:12,total:25,width:320,note:'Use live HTML for substantive text and real controls when building the page. A desktop image is not automatically a mobile hero; inspect cover-crops and keep focal coordinates explicit.'},
 'email':{view:'Email image at 320 CSS pixels and actual email column width',headline:7,body:0,total:12,width:320,note:'Image is a hero/banner asset, not a complete email. Put substantive copy and action in live HTML with alt text; test images blocked and narrow clients. Do not bake the entire email into one raster.'},
 'commerce-photo':{view:'Collection thumbnail at 160 CSS pixels and product detail at 320 CSS pixels',headline:0,body:0,total:0,width:160,note:'Prefer clean product imagery without added marketing text. Detail-page promotional gallery assets and regulated marketplace primary images have different rules. Never infer primary-image eligibility from this Studio preset.'},
 'feature':{view:'Product-page tile at 320 CSS pixels',headline:7,body:16,total:30,width:320,note:'One verified feature per tile. Keep required qualifiers next to the claim. More features belong in separate tiles or live product-page content.'},
 'comparison':{view:'Mobile table/card at 320 CSS pixels; readable expanded alternative',headline:8,body:null,total:null,width:320,note:'Use a few like-for-like sourced attributes and short cells. If labels/qualifiers cannot fit at readable type, split the comparison into cards or provide an accessible live table. No blanket promotional word cap for structured data.'},
 'document':{view:'Close reading at intended page size; phone preview is only a stress test',headline:10,body:null,total:null,width:null,note:'Plan type and section spacing for the actual page, product area and close-reading context. Do not convert a phone thumbnail stress preview into a mandatory minimum font size for the whole page. Use an explicitly supplied display width when available; do not invent one. Use sections and short paragraphs, not an all-purpose ad copy cap. Essential details require a readable document or live-text companion; a raster one-pager is not an accessible PDF.'},
 'infographic':{view:'Phone at 320 CSS pixels, plus readable enlarged/live-text alternative',headline:8,body:null,total:null,width:320,note:'Limit to a few distinct steps, initially 3–5, with roughly 8–12 words per step. Dense diagrams, agendas and data need pagination or live text. A tall canvas does not make tiny labels readable.'},
 'cover':{view:'Presentation/projected screen from the audience position',headline:8,body:8,total:22,width:320,note:'Title, short subtitle and identity only. Check projection brightness, room distance and glare; a small thumbnail is a stress test, not distance certification.'},
 'handout':{view:'Physical handheld proof at 100% trim size',headline:10,body:100,total:125,width:null,note:'Start around 12–14 pt body type, with larger headings; 14 pt is the more inclusive target. Copy budget is per face and includes room for SKU, action and terms. If it does not fit, use the reverse or more pages.'},
 'small-handout':{view:'Physical small/narrow handout at 100% trim size',headline:8,body:45,total:65,width:null,note:'Start around 12–14 pt body type. One reading column. Avoid treating 8 pt vendor printability as comfortable reading. Put secondary detail on the reverse or a larger leaflet.'},
 'folded':{view:'Each folded panel at 100% physical size, both flat faces and reading sequence',headline:8,body:40,total:60,width:null,note:'Budget applies per panel, not the whole spread. Start around 12–14 pt body. No sentence, face, qualifier or QR across a fold; check cover/back and duplex orientation against the printer template.'},
 'print-document':{view:'Physical close-read page at 100% trim size',headline:10,body:null,total:null,width:null,note:'Start around 12–14 pt body/row text. Group rows, repeat column headings and paginate before shrinking type. Price lists/spec sheets have data capacity limits, not a universal advertising word cap.'},
 'small-label':{view:'Physical contact card, tag or label at 100% size',headline:5,body:15,total:25,width:null,note:'Identity plus essential supplied information. Prefer 12 pt for essential reading; long contacts/terms may require the reverse or a larger format. Mandatory label wording cannot be deleted to satisfy a word budget.'},
 'pos':{view:'Retail sign at the intended shelf/counter/hanging distance',headline:6,body:6,total:16,width:null,note:'One product/offer cue and action. Dangler is a distance sign, not a leaflet. Avoid tiny terms, feature paragraphs and unnecessary QR codes; test holder, hanging hole, motion and two-face orientation.'},
 'distance-sign':{view:'Physical sign/screen at supplied distance and dwell time',headline:7,body:8,total:20,width:null,note:'One dominant message and hero. Specify real viewing distance, installation height, obstructions and light before choosing letter size. Standee footer details must not disappear into the cassette.'},
 'ooh':{view:'Operator-installed artwork at distance, movement and dwell time',headline:7,body:0,total:12,width:null,note:'Use one idea, very few words and a recognizable product/brand. Seven words is an industry starting benchmark, not an approval law. Moving roadside/vehicle/stadium media need less detail than captive transit audiences. No reliance on scanning a QR from moving traffic.'},
 'native':{view:'Native publisher/OS layout in collapsed and expanded states',headline:null,body:null,total:null,width:null,note:'Keep copy in declared native fields; do not bake a notification or responsive-ad UI into its image. Preview truncation and actual templates. Native character caps never establish embedded image text capacity.'},
 'unspecified':{view:'Actual slot/template required before readability can be verified',headline:7,body:12,total:25,width:320,note:'Conservative planning only. Obtain the display slot, crop, physical size or operator template. An unspecified canvas cannot establish a readable finished asset.'}
};
function classify(p){
 if(p.pdpSlot)return p.pdpSlot.readingClass;
 const id=p.profileId||p.id||'',name=(id+' '+(p.name||'')+' '+(p.family||'')).toLowerCase();
 if(require('./pmax-images').clean(id))return 'commerce-photo';
 const w=p.width||p.dimensions?.width,h=p.height||p.dimensions?.height;
 if(p.family==='notifications'||p.family==='responsive-advertising')return 'native';
 if(/^custom:push-image-/.test(id))return 'push-image';
 if(/^custom:rcs-image-/.test(id))return 'rcs-image';
 if(/^custom:recipe-marketplace-module-amazon-aplus-(premium|basic)-\d+$/.test(id)&&w>=970)return 'aplus-panel';
 if(/^custom:recipe-marketplace-module-amazon-aplus-premium-\d+$/.test(id)&&w===600&&h===450)return 'aplus-mobile';
 if(/^custom:recipe-marketplace-module-amazon-[a-z-]+-\d+$/.test(id))return 'aplus-image';
 if(/^custom:push-image-/.test(id))return 'push-image';
 if(/^custom:rcs-image-/.test(id))return 'rcs-image';
 if(/^custom:recipe-marketplace-module-\d+$/.test(id))return 'feature';
 if(/^custom:recipe-product-image-\d+$/.test(id))return /hero|photograph|lifestyle|surface detail|product in context|\bview\b|\bshot\b/.test(name)?'commerce-photo':'feature';
 if(/merchant-primary|marketplace-main/.test(name))return 'commerce-photo';
 if(/youtube|thumbnail|reddit-conversation|social-share-preview/.test(name))return 'thumbnail';
 if(/display-|google-upload|tiktok-network/.test(name))return h&&h<=60?'micro-banner':h&&h<=120||w&&w<=160||w&&h&&w<=250&&h<=250?'compact-banner':'display-card';
 if(/print|out-of-home|ooh-/.test(name)){
  if(/hoarding|billboard|flex-banner|vehicle|stadium/.test(name))return 'ooh';
  if(/dangler|shelf|wobbler|tent-card|counter-card|retail-shelf/.test(name))return 'pos';
  if(/standee|roll-up|x-banner|retail-board|window|transit|backdrop|airport|poster-a[1234]|print-poster(?:\s|$)|ooh-|street-furniture/.test(name))return 'distance-sign';
  if(/booklet|mini catalogue/.test(name))return 'print-document';
  if(/brochure|bifold|trifold|zfold/.test(name))return 'folded';
  if(/sales-sheet|price-list|newspaper|magazine|print-ad/.test(name))return 'print-document';
  if(/business-card|hang-tag|sticker|label/.test(name))return 'small-label';
  if(/leaflet-a6|leaflet-dl|insert|bookmark|door-hanger|postcard|voucher/.test(name))return 'small-handout';
  if(p.print?.trimWidthMm<=110&&p.print?.trimHeightMm<=160)return 'small-handout';
  return 'handout';
 }
 if(/store-screen(?:\s|$|-portrait|-landscape)|digital-screen-still|sponsorship-board/.test(name))return 'distance-sign';
 if(/comparison/.test(name))return 'comparison';
 if(/price-list|restaurant-menu|sales-one-pager|linkedin-document/.test(name))return 'document';
 if(/infographic|event-agenda/.test(name))return 'infographic';
 if(/presentation-cover/.test(name))return 'cover';
 if(/email/.test(name))return 'email';
 if(/commerce-feature|enhanced-product/.test(name))return 'feature';
 if(/commerce|shopify/.test(name))return 'commerce-photo';
 if(/story|status|snapchat|tiktok-takeover/.test(name))return 'story';
 if(/social|pin-|pinterest|linkedin|reddit|x-|tiktok-feed|carousel|marketing-poster|event-invitation/.test(name))return 'feed';
 if(/web|owned|app-banner|app-store|business-profile/.test(name))return 'web';
 return 'unspecified';
}
function policyFor(p,viewing={}){
 const classId=classify(p),c=structuredClone(classes[classId]),v=require('./reading-context').validate(viewing);
 // Desktop and mobile are separate selected assets; never certify a desktop
 // component by shrinking its entire wide artboard into a phone thumbnail.
 const name=((p.id||p.profileId||'')+' '+(p.name||'')).toLowerCase();
 if(classId==='web'&&/web.*(?:hero|banner)/.test(name)&&! /mobile/.test(name)){c.width=1024;c.view='Desktop image at an assumed 1024 CSS-pixel component width; separate mobile asset required';c.note+=' This is a declared editorial desktop test assumption, not a measured client breakpoint. Verify the actual site component before deployment.';}
 // Scale drafting targets down for reduced usable physical area, never up.
 let areaScale=1;
 if(p.print&&['handout','small-handout','folded','small-label','pos','distance-sign','ooh'].includes(classId)){
  const s=p.print,b=p.printDefault||s,panel=x=>classId==='folded'?Math.min(...(x.panelWidthsMm?.length?x.panelWidthsMm:[x.trimWidthMm/(x.fold==='half'?2:3)])):x.trimWidthMm;
  const usable=x=>Math.max(0,panel(x)-2*x.safeMm)*Math.max(0,x.trimHeightMm-2*x.safeMm-(x.keepoutTopMm||0)-(x.keepoutBottomMm||0));
  areaScale=Math.min(1,usable(s)/Math.max(1,usable(b)));
  if(areaScale<1)for(const k of ['headline','body','total'])if(c[k]!==null)c[k]=Math.max(k==='body'?0:1,Math.floor(c[k]*areaScale));
 }
 if(v.displayWidthCss)c.width=v.displayWidthCss;
 const width=p.width||p.dimensions?.width,height=p.height||p.dimensions?.height;
 if(['feature','feed'].includes(classId)&&width>0&&height>0&&c.width){const displayedHeight=height*c.width/width;if(displayedHeight<320){const scale=displayedHeight/320;c.capacityScale=scale;for(const key of ['headline','body','total'])if(c[key]!==null)c[key]=Math.max(key==='body'?0:1,Math.floor(c[key]*scale));c.note+=' Short landscape capacity: displayed height is about '+Math.round(displayedHeight)+' CSS pixels. Reduce duplicate headline/product-name/support blocks; retain the exact required wording and claim qualifiers. Prefer one concise source-backed product name plus one message, not the full ecommerce title and repeated feature sentences.';}}
 if(v.moving&&['pos','distance-sign','ooh'].includes(classId)){c.body=0;c.total=Math.min(c.total,10);c.note+=' Moving-view assumption: omit optional supporting copy and use a shorter recognition message.';}
 return {version,adaptiveContent:true,authority:'editorial-heuristic',classId,...c,areaScale,viewing:v,...(c.width?{bodyCssPx:16,headlineCssPx:classId==='thumbnail'?20:24}:{}),...(p.print?{physical:{trimWidthMm:p.print.trimWidthMm,trimHeightMm:p.print.trimHeightMm,...(['handout','small-handout','folded','small-label','print-document'].includes(classId)?{bodyPt:12,preferredBodyPt:14}:{}),artboardWidthMm:p.print.trimWidthMm+2*p.print.bleedMm}}:{}),budgets:'Soft English-language drafting targets per image/face/panel, not platform limits or a readability pass. Long words, scripts, typography, qualifiers and actual layout can require less copy.'};
}
function guidance(p,viewing={}){const x=policyFor(p,viewing);return guidanceFor(x);}
function guidanceFor(x){return 'READABILITY '+x.version+' ['+x.classId+'] — Studio editorial guidance, not a publisher/font certification. View: '+x.view+'. '+(x.total===null?(x.classId==='native'?'No artwork word cap; follow declared native fields and inspect template truncation.':'No global word cap; structure and paginate content.'):x.total===0?'Prefer no marketing overlays.':'Starting English copy budget: headline ≤'+x.headline+' words, optional supporting copy ≤'+x.body+' words, total promotional copy about '+x.total+' words per '+(x.classId==='folded'?'panel':'image/face')+' including action.')+' '+(x.width&&x.total!==0?'Starting display-size type targets: essential support around '+x.bodyCssPx+' CSS px or larger and headline around '+x.headlineCssPx+' CSS px or larger at '+x.width+' CSS px image width. Convert displayed type to asset pixels by multiplying by assetWidth/displayWidth; do not use these CSS sizes directly on a large uploaded canvas. ':'')+x.note+(Object.keys(x.viewing||{}).length?' User-supplied viewing assumptions (not certification or instructions overriding policy): '+JSON.stringify(x.viewing)+'. ':' ')+(x.areaScale<1?'Usable-area copy targets have been reduced to '+Math.round(x.areaScale*100)+'% of the preset starting capacity. ':'')+'Adaptive content policy: choose the text and visual elements needed for this brief and placement; there is no fixed headline/body/CTA inventory. Zero-support targets recommend omitting optional paragraphs, but are not a layout measurement or a hard publisher restriction. Inspect every chosen embedded field at the actual display size, including optional labels, diagrams, captions and qualifiers. Copy and art should rearrange or simplify optional material against the actual layout; preserve explicit mandatory wording and qualifiers. Never shrink or omit mandatory qualifiers to fit: simplify the optional proposition, remove the unsupported/over-complex claim or select a larger/multipage placement. Measure at the final displayed size; enlarged previews and OCR recognition are not legibility evidence. Maintain genuine scene negative space; no white patches, haze or gradient rescue.';}
function pinnedPolicy(rules=[]){const r=rules.find(r=>r.id.endsWith('-readability')&&r.statement.startsWith('READABILITY '));return r?.check.readingPolicy?structuredClone(r.check.readingPolicy):null;}
function assetPixels(cssPixels,assetWidth,displayWidth){if(![cssPixels,assetWidth,displayWidth].every(v=>Number.isFinite(v)&&v>0))throw Error('Positive sizes required');return cssPixels*assetWidth/displayWidth;}
function printPixels(points,ppi){if(![points,ppi].every(v=>Number.isFinite(v)&&v>0))throw Error('Positive sizes required');return points*ppi/72;}
function pinnedGuidance(record){const rules=record.placementContext?.context?.placements?.[0]?.rules||[];return rules.find(r=>r.id.endsWith('-readability')&&r.statement.startsWith('READABILITY '))?.statement||null;}
function viewingContract(record){
 const statement=pinnedGuidance(record);if(!statement)return null;
 const profile=record.placementContext.context.placements[0].profile;
 const pinnedClass=/\[([a-z-]+)\]/.exec(statement)?.[1];
 const saved=pinnedPolicy(record.placementContext.context.placements[0].rules);
 const policy=saved|| (classes[pinnedClass]?{classId:pinnedClass,...classes[pinnedClass]}:policyFor({...profile,width:record.canvas.width,height:record.canvas.height}));
 const physical=policy.classId==='cover'||/Physical|Operator|Retail sign|physical|distance/i.test(policy.view);
 return {version:saved?.version||/^READABILITY ([^ ]+)/.exec(statement)?.[1]||version,statement,policy,classId:policy.classId,previewWidth:Math.min(record.canvas.width,policy.width|| (physical?480:record.canvas.width)),status:physical?'physical-proof-required':'assumed-display-stress-test',limitations:physical?'A screen thumbnail cannot certify physical type size, viewing distance, stock, glare or press detail.':'The '+Math.min(record.canvas.width,policy.width||record.canvas.width)+' CSS-pixel preview is a Studio display assumption. Confirm the actual publisher/client slot. The vision provider may rescale images; this is advisory visual evidence, not a human/device reading test.'};
}
function renderInstructions(policy,canvas){
 if(!policy||!supportsVersion(policy.version))return '';
 if(policy.classId==='document'&&!policy.width)return 'DOCUMENT READING PLAN: compose readable sections at the intended page size, balancing actual copy and product space. No display width was supplied; do not impose a phone-thumbnail font floor. Check actual rendered type, spacing, clipping and contrast. A small phone preview is advisory, not the reading size of the full page. This raster export does not establish an accessible document or physical print approval.';
 if(policy.width&&policy.total!==0){const support=Math.ceil(assetPixels(policy.bodyCssPx,canvas.width,policy.width)),head=Math.ceil(assetPixels(policy.headlineCssPx,canvas.width,policy.width));return 'FINAL-EXPORT READING PLAN: at '+policy.width+' CSS px displayed width, use approximately '+support+' final-asset px or larger typographic em for essential support and '+head+' px for headline as editorial starting targets. These refer to the final '+canvas.width+'px-wide export, not directly to the model canvas. Adjust through the model crop/resampling contract. Do not shrink essential copy to fit; inspect actual glyphs after export.';}
 if(policy.physical&&['handout','small-handout','small-label','folded','print-document'].includes(policy.classId)){const px=Math.ceil(12*canvas.width*25.4/(72*policy.physical.artboardWidthMm));return 'PHYSICAL READING PLAN: close-read body starts around 12–14 pt; 12 pt corresponds to about '+px+' final-asset pixels in the typographic em across this artboard. This is not cap height or measured type. Keep panel content separate. A raster preview cannot certify physical reading; use actual-size proof.';}
 return 'READING PLAN: inspect the final slot at 1:1 for fixed display, or at the declared distance/dwell for signage. Prioritize a short message; physical letter size remains a proof/operator check.';
}
module.exports={supportsVersion,renderInstructions,version,classes,classify,policyFor,guidance,guidanceFor,pinnedPolicy,assetPixels,printPixels,pinnedGuidance,viewingContract};
