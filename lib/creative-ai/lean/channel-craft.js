'use strict';
// Channel craft v1 (user decision, 11 Nov 2026, from the grade-by-grade marketing review of the Sofa Drip Pro batch).
// New lean jobs pin channelCraftVersion 1. Each channel gets picture jobs and layout rules a marketing manager would
// ask for; they reach the plan, the image brief and (layout rules) the image check, never auto-corrected:
//  - Amazon A+: every module its own picture (benefits show their feature working or close; lifestyle with people).
//  - Google PMax: three different scenes (landscape lifestyle with people, square plain background, portrait close-up).
//  - Carousels: hook lifestyle -> one feature per slide -> hero with the action; one backdrop that runs across slides.
//    RCS cards: look -> feature in use -> close-up detail.
//  - Web push: a tight crop that reads at 192 px.
//  - Stories: a one-line headline (six words or fewer), large type and a large product.
//  - Website heroes: at most three text blocks (headline, one line, button) in a column about 40% wide.
//  - Display banners: a real room or the campaign's colours, not an unrelated flat block.
//  - Campaign look (planning only): this product's recent palettes and how many recent assets showed people.
//  - No web address on any image (print may show a bare domain).
// Earlier jobs keep their saved contracts.
const VERSION=1;
const ID={aplus:'aplus-picture-jobs',pmax:'pmax-picture-jobs',carousel:'carousel-picture-jobs',push:'push-crop',story:'story-layout',hero:'web-hero-layout',display:'display-banner-look',look:'campaign-look-v1'};
const LAYOUT_IDS=Object.entries(ID).filter(([k])=>k!=='look').map(([,v])=>'placement-'+v);
const formatClass=s=>require('./objective-playbook').formatClass(s);
const words=t=>String(t||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const headlineRole=role=>/head|title/i.test(role||'')&&!/product|name|cta|call/i.test(role||'');
const isPmax=s=>/pmax-/.test(s.id||'')||/pmax/i.test(s.description?.formatId||'');
const isRcs=s=>/rcs-/.test(s.id||'');
function isWebHero(s){const d=s.description||{},text=[d.name,d.formatId,s.id].filter(Boolean).join(' ');return /website|web.?banner|web.?hero|homepage|client-website/i.test(text)&&!/module|marketplace|pdp|product.?page/i.test(text);}
const wide=s=>{const d=s.description?.dimensions||{};return /desktop/i.test(s.description?.name||'')||d.width>=1400&&d.height&&d.width/d.height>=2.2;};
const PEOPLE=/\b(people|person|couple|woman|women|man|men|family|friends|child|children|kids?|hands?|someone|guests?|lounging|lounges|sitting|sits|seated)\b/i;
// Whether a saved plan shows people (recorded with its headlines, so the next asset can balance the campaign).
function showsPeople(plan){return (plan?.pages||[]).some(p=>PEOPLE.test([p.artDirection,p.purpose,p.spatial?.productPlacement].join(' ')));}
function planPalette(plan){return String(plan?.pages?.[0]?.palette||'').replace(/\s+/g,' ').trim().slice(0,200);}
// Recent palettes and people share for this product, from the brand-scoped history (lean/marketing-rules.js).
function recentLook(history,{productKey,jobId,unitKey,now=Date.now(),days=30}={}){
 const since=now-days*864e5,entries=(history?.entries||[]).filter(e=>e.productKey===productKey&&!(e.jobId===jobId&&e.unitKey===unitKey)&&Date.parse(e.at)>=since);
 const palettes=[...new Set([...entries].reverse().map(e=>e.palette).filter(Boolean))].slice(0,3);
 const judged=entries.filter(e=>typeof e.people==='boolean');
 return {palettes,peopleShown:judged.filter(e=>e.people).length,peopleTotal:judged.length};
}

function carouselJobs(pages,rcs){
 const n=pages.length;if(n<2)return null;
 return pages.map((s,i)=>{const pos=i+1;
  if(rcs)return [s.id,pos===1?'card '+pos+': the whole product\'s look in a lived-in room':pos===n?'card '+pos+': a close-up detail (for example the legs or the arm)':'card '+pos+': one feature in use (for example a cushion in use)'];
  return [s.id,pos===1?'slide 1: the hook, a lifestyle scene with one or two people enjoying the product':pos===n?'slide '+pos+': the whole product as the hero with the call to action':'slide '+pos+': one feature, shown working or in close-up (for example the arm close-up, a cushion in use, the legs and the easy-to-clean space underneath)'];});
}
// all: every page of the job. RCS cards are planned one card at a time, so each card's job comes from its place in the
// job's whole card set.
function section(input,selection,{look=null,all=null}={}){
 const rules=[],placements={},add=(id,text,ids)=>{if(!ids.length)return;rules.push({id,tier:'contract',text,sourceIds:['user:channel-craft-20261111']});placements[id]=ids;};
 const sel=selection,ids=f=>sel.filter(f).map(s=>s.id);
 if(input.aplus)add(ID.aplus,'A+ PICTURE JOBS v1. Give every module its own picture; no module repeats the hero\'s view. Hero: the whole product in a lived-in room (people optional). Technology: the attached official technology picture when there is one, otherwise its feature shown close. Each benefit panel: its own feature shown working or in close-up (for example a cushion in use, an arm close-up, the legs from a low angle). Lifestyle: one or two people using the product. Details: tight close-ups. People appear in one or two modules (the lifestyle, optionally the hero). A mobile page keeps its desktop page\'s picture idea.',ids(()=>true));
 const pmax=sel.filter(isPmax);
 if(pmax.length>1){const slot=s=>s.description?.assetSet?.slot||(/landscape/.test(s.id)?'landscape':/portrait/.test(s.id)?'portrait':'square');
  add(ID.pmax,'PMAX PICTURE JOBS v1. Give Google different scenes to test, with the same product and colours: '+pmax.map(s=>s.id+' ('+slot(s)+'): '+({landscape:'a lifestyle room scene with one or two people using the product',square:'the whole product on a plain light background with a soft shadow',portrait:'a close-up of one feature (texture, arm, legs or cushion)'}[slot(s)]||'a different scene from the other sizes')).join('; ')+'. No two sizes show the same scene or angle.',pmax.map(s=>s.id));}
 const isCarousel=s=>!input.aplus&&!isPmax(s)&&formatClass(s)==='carousel',here=sel.filter(isCarousel),rcsHere=here.length>0&&here.every(isRcs);
 const carousel=rcsHere?(all||sel).filter(s=>isCarousel(s)&&isRcs(s)):here;
 if(carousel.length>1){const rcs=rcsHere,jobs=carouselJobs(carousel,rcs).filter(([id])=>here.some(s=>s.id===id));
  add(ID.carousel,(rcs?'RCS CARD PICTURE JOBS v1. ':'CAROUSEL PICTURE JOBS v1. ')+'Each '+(rcs?'card':'slide')+' has its own picture job, in order: '+jobs.map(([id,job])=>id+' = '+job).join('; ')+'. No two '+(rcs?'cards':'slides')+' repeat the same product view.'+(rcs?' This set has '+carousel.length+' cards; the same room family on every card.':' Shared backdrop: the same wall colour, floor and light on every slide, and one graphic band or floor line at the same height that runs off the right edge of each slide and continues from the left edge of the next, so the swipe feels continuous (a design link, not a pixel-perfect panorama).'),here.map(s=>s.id));}
 add(ID.push,'PUSH CROP v1. A tight crop: the product fills about 70 to 85% of the width on a simple, uncluttered background, one clear subject, so it still reads at 192 px wide. No small details, props or words.',ids(s=>formatClass(s)==='notification'));
 add(ID.story,'STORY LAYOUT v1. A one-line headline of six words or fewer in large type; the product large in the middle band (about half the frame height); words, logo and button out of the top 14% and bottom 20%.',ids(s=>formatClass(s)==='story'));
 const heroes=sel.filter(s=>!input.aplus&&isWebHero(s));
 add(ID.hero,'WEBSITE HERO v1. At most three text blocks: one headline, one supporting line and one button (the product name goes inside the headline or the line). '+(heroes.some(wide)?'On wide desktop images keep the words in one column about 40% of the width with generous space; the product and scene fill the rest.':'Keep the words in one clear group with generous space.'),heroes.map(s=>s.id));
 if(input.displayBanners)add(ID.display,'DISPLAY BANNER LOOK v1. Put the product in a real room scene or on the campaign\'s room colours'+(look?.palettes?.length?' ('+look.palettes[0]+')':'')+'; no flat pastel or lavender block unrelated to the rest of the campaign. The headline names one specific benefit.',ids(()=>true));
 // Campaign look (planning only): stay in this product's colour family; balance how many assets show people.
 const lookLines=['CAMPAIGN LOOK v1 (planning).'];
 if(look?.palettes?.length)lookLines.push('This product\'s recent assets used these colours: '+look.palettes.map(p=>'"'+p+'"').join(' | ')+'. Keep this asset in the same colour family; vary the room, angle and moment instead.');
 const peopleKinds=sel.filter(s=>!input.aplus&&!isPmax(s)&&!['marketplace','close-read','notification','carousel'].includes(formatClass(s))&&(s.description?.pdp?.textPolicy!=='none'));
 const share=look&&look.peopleTotal?look.peopleShown/look.peopleTotal:0,wantPeople=peopleKinds.length>0&&share<1/3;
 if(wantPeople)lookLines.push((look?.peopleTotal?'So far '+look.peopleShown+' of '+look.peopleTotal+' recent assets for this product showed people. ':'')+'Show one or two people using the product in this asset (about a third of a product\'s assets should).');
 if(lookLines.length>1){rules.push({id:ID.look,tier:'contract',text:lookLines.join(' '),sourceIds:['user:channel-craft-20261111']});placements[ID.look]=sel.map(s=>s.id);}
 return {channelCraft:{version:VERSION,storyPages:ids(s=>formatClass(s)==='story'),heroPages:heroes.map(s=>s.id),print:!!input.format?.print,wantPeople,look:look||null},rules,placements};
}
// ---- Plan checks ----
const URL=/https?:\/\/|www\.|\b[a-z0-9-]+\.(com|in|co\.in|net|org|shop|store)\/\S/i,DOMAIN=/\b[a-z0-9-]+\.(com|in|co\.in|net|org|shop|store)\b/i;
function validate(plan,input){
 const c=input?.channelCraft;if(c?.version!==VERSION)return;
 for(const page of plan.pages||[]){
  for(const x of page.copy||[]){const t=String(x.text||'');
   // Amazon A+ removes links itself and records each removal (runtime/aplus.js clean), so it is not stopped here.
   if(!input.aplus&&(URL.test(t)||!c.print&&DOMAIN.test(t)))throw Error(page.id+': no web address on the image ("'+t.slice(0,60)+'"); links belong in the post, message or page text');}
  if(c.storyPages.includes(page.id))for(const x of page.copy||[])if(headlineRole(x.role)){const n=words(x.text).split(' ').filter(Boolean).length;if(n>6||/\n/.test(x.text))throw Error(page.id+': a story headline is one line of six words or fewer ("'+x.text.replace(/\n/g,' ')+'")');}
  if(c.heroPages.includes(page.id)&&(page.copy||[]).length>3)throw Error(page.id+': a website hero has at most three text blocks (headline, one line, button); this plan has '+page.copy.length);
 }
}
module.exports={VERSION,ID,LAYOUT_IDS,isWebHero,showsPeople,planPalette,recentLook,carouselJobs,section,validate};
