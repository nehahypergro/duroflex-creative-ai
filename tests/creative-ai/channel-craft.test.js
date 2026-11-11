'use strict';
// Regression (grade-by-grade marketing review of the Sleepyhead Sofa Drip Pro batch, 11 Nov 2026):
//  - A+ hero, technology and three benefit panels used the same front shot (B)
//  - PMax: three pictures with the same angle and room; banners in a lavender look unrelated to the campaign (B)
//  - WhatsApp image printed "Shop now: https://mysleepyhead.com/products/..."; RCS cards built no story (B-)
//  - carousels: slides 1, 4 and 5 the same front shot, no story from hook to action (C)
//  - stories: three-line headlines in small type; website heroes: five text blocks in one corner (C)
//  - Purchase briefs never asked for a price or offer
// Failing before: channelCraftVersion and these rules did not exist. Both brands; offline fakes, no paid calls.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
const policy=require('../../lib/creative-ai/runtime/lean-policy'),cc=require('../../lib/creative-ai/lean/channel-craft'),mr=require('../../lib/creative-ai/lean/marketing-rules'),checklist=require('../../lib/creative-ai/lean/checklist'),correction=require('../../lib/creative-ai/lean/correction');
const {brands,fixture}=require('./lean-marketing-fixture');
const page=(id,name,formatId,w,h,extra={})=>({id,description:{name,formatId,dimensions:{width:w,height:h},...extra},jobInputs:{logoPolicy:{treatment:'include',reason:'Official logo required'}}});
const slides=(n,kind='square')=>Array.from({length:n},(_,i)=>page('custom_studio-carousel-'+kind+'-slide-0'+(i+1),'Carousel · '+kind+' · Slide '+(i+1)+' of '+n,'custom:studio-carousel-'+kind,1080,1080,{carousel:{id:'custom:studio-carousel-'+kind,name:'Carousel · '+kind,index:i+1,count:n}}));
const input=(extra={})=>({format:{print:null},...extra});

test('new lean jobs pin channel craft v1; the snapshot keeps it; older configs have none',()=>{
 const c=policy.configure({},{leanWorkflowVersion:1}),pc=require('../../lib/creative-ai/runtime/provider-config');
 assert.equal(c.channelCraftVersion,1);assert.equal(pc.snapshot(c).channelCraftVersion,1);assert.equal(pc.snapshot({}).channelCraftVersion,undefined);
});

test('each channel gets its own picture jobs and layout rule',()=>{
 // A+: every module its own picture; people in one or two modules.
 const aplus=cc.section(input({aplus:{version:1}}),[page('a1','Premium A+ page · Hero · desktop','custom:aplus',1464,600)]);
 assert.match(aplus.rules.find(r=>r.id===cc.ID.aplus).text,/no module repeats the hero's view[\s\S]*Lifestyle: one or two people/);
 // PMax: three different scenes by size.
 const pmax=cc.section(input(),['landscape','square','portrait'].map((slot,i)=>page('custom_studio-pmax-'+slot,'PMax '+slot+' image','custom:studio-pmax-'+slot,1200,slot==='landscape'?628:slot==='portrait'?1500:1200,{assetSet:{id:'pmax-images',slot,index:i+1,count:3}})));
 const t=pmax.rules.find(r=>r.id===cc.ID.pmax).text;assert.match(t,/landscape\): a lifestyle room scene with one or two people/);assert.match(t,/square\): the whole product on a plain light background/);assert.match(t,/portrait\): a close-up of one feature/);
 // Carousel: hook -> features -> hero with the action, and one backdrop across slides.
 const car=cc.section(input(),slides(5)).rules.find(r=>r.id===cc.ID.carousel).text;
 assert.match(car,/slide-01 = slide 1: the hook, a lifestyle scene with one or two people/);assert.match(car,/slide-03 = slide 3: one feature, shown working or in close-up/);assert.match(car,/slide-05 = slide 5: the whole product as the hero with the call to action/);assert.match(car,/runs off the right edge of each slide and continues from the left edge of the next/);
 // RCS cards: look -> feature in use -> close-up.
 const rcs=cc.section(input(),[1,2,3].map(i=>page('custom_rcs-image-carousel-medium-medium-0'+i,'RCS card '+i,undefined,1184,672))).rules.find(r=>r.id===cc.ID.carousel).text;
 assert.match(rcs,/^RCS CARD PICTURE JOBS v1[\s\S]*card 1: the whole product's look[\s\S]*card 2: one feature in use[\s\S]*card 3: a close-up detail/);
 // RCS cards are planned one at a time (saved job e023ac15): each card still gets its own place in the set.
 const cards=[1,2,3].map(i=>page('custom_rcs-image-carousel-medium-medium-0'+i,'RCS card '+i,undefined,1184,672));
 const second=cc.section(input(),[cards[1]],{all:cards}).rules.find(r=>r.id===cc.ID.carousel);
 assert.match(second.text,/medium-02 = card 2: one feature in use/);assert.doesNotMatch(second.text,/card 1:/);assert.match(second.text,/This set has 3 cards/);
 // Push, story, website hero and display banners.
 assert.match(cc.section(input(),[page('custom_push-image-web-1024x512','Web Push',undefined,1024,512)]).rules.find(r=>r.id===cc.ID.push).text,/reads at 192 px wide/);
 assert.match(cc.section(input(),[page('custom_studio-social-story','Story · vertical','custom:studio-social-story',1080,1920)]).rules.find(r=>r.id===cc.ID.story).text,/one-line headline of six words or fewer/);
 const hero=cc.section(input(),[page('custom_client-website-desktop-1920x640','Website Desktop image',undefined,1920,640)]);
 assert.match(hero.rules.find(r=>r.id===cc.ID.hero).text,/At most three text blocks[\s\S]*one column about 40% of the width/);
 const banners=cc.section(input({displayBanners:{version:1}}),[page('b1','Display · inline rectangle · 300×250','custom:studio-display-300x250',300,250)],{look:{palettes:['warm peach walls, terracotta accents'],peopleShown:0,peopleTotal:0}});
 assert.match(banners.rules.find(r=>r.id===cc.ID.display).text,/real room scene or on the campaign's room colours \(warm peach walls, terracotta accents\); no flat pastel or lavender block/);
 // Layout rules are never auto-corrected.
 for(const id of cc.LAYOUT_IDS)assert.equal(correction.isLayout(id),true,id);
});

test('plan checks: no web address on any image, one-line story headlines, three blocks on website heroes',()=>{
 const plan=copy=>({pages:[{id:'p',copy}]}),c=(over={})=>({channelCraft:{version:1,storyPages:[],heroPages:[],print:false,...over}});
 // The saved WhatsApp share card (a74cf1c1) printed a full product link.
 assert.throws(()=>cc.validate(plan([{role:'footer',text:'Shop now: https://mysleepyhead.com/products/sofa-drip-pro-3-seater-sofa-fabric-coco-brown'}]),c()),/no web address on the image/);
 assert.throws(()=>cc.validate(plan([{role:'footer',text:'Visit mysleepyhead.com'}]),c()),/no web address/);
 assert.doesNotThrow(()=>cc.validate(plan([{role:'footer',text:'Visit mysleepyhead.com'}]),c({print:true})),'print may show a bare domain');
 assert.throws(()=>cc.validate(plan([{role:'footer',text:'duroflexworld.com/products/back-magic'}]),c({print:true})),'never a full link, even in print');
 assert.throws(()=>cc.validate(plan([{role:'headline',text:'Bring home your\nkind of comfort.'}]),c({storyPages:['p']})),/one line of six words or fewer/);
 assert.throws(()=>cc.validate(plan([{role:'headline',text:'Make your first home feel like yours'}]),c({storyPages:['p']})),/six words or fewer/);
 assert.doesNotThrow(()=>cc.validate(plan([{role:'headline',text:'Lean back, cushions off'}]),c({storyPages:['p']})));
 const five=['Sofa Drip Pro','Make your first place yours.','Removable back cushion.','3-year warranty','Shop now'].map((text,i)=>({role:['name','headline','support','support','cta'][i],text}));
 assert.throws(()=>cc.validate(plan(five),c({heroPages:['p']})),/at most three text blocks/);
 assert.doesNotThrow(()=>cc.validate(plan(five.slice(1,3).concat(five[4])),c({heroPages:['p']})));
});

test('campaign look and people share come from this product\'s recent assets; stories and wide heroes get bigger text',()=>{
 const now=Date.parse('2026-11-11T10:00:00Z'),h={entries:[
  {jobId:'j1',unitKey:'u1',productKey:'p',at:'2026-11-11T08:00:00Z',headlines:['A'],palette:'warm peach walls',people:false},
  {jobId:'j2',unitKey:'u1',productKey:'p',at:'2026-11-11T09:00:00Z',headlines:['B'],palette:'terracotta and cream',people:false},
  {jobId:'j3',unitKey:'u1',productKey:'other',at:'2026-11-11T09:00:00Z',headlines:['C'],palette:'navy',people:true}]};
 const look=cc.recentLook(h,{productKey:'p',now});assert.deepEqual(look,{palettes:['terracotta and cream','warm peach walls'],peopleShown:0,peopleTotal:2});
 const s=cc.section(input(),[page('custom_studio-social-square','Social square','custom:studio-social-square',1080,1080)],{look});
 const rule=s.rules.find(r=>r.id===cc.ID.look).text;assert.match(rule,/same colour family/);assert.match(rule,/So far 0 of 2 recent assets for this product showed people\. Show one or two people/);
 assert.equal(cc.section(input(),[page('x','Social square','custom:studio-social-square',1080,1080)],{look:{palettes:[],peopleShown:1,peopleTotal:2}}).channelCraft.wantPeople,false,'a third or more already showed people');
 assert.equal(cc.showsPeople({pages:[{artDirection:'A young couple lounging on the sofa with mugs'}]}),true);assert.equal(cc.showsPeople({pages:[{artDirection:'The sofa alone in a sunlit room'}]}),false);
 assert.equal(checklist.minTextPxV2(page('s','Story · vertical','custom:studio-social-story',1080,1920)).normal,34,'12 CSS px on a 390 px phone');
 assert.equal(checklist.minTextPxV2(page('l','Website Desktop image',undefined,1920,640)).normal,21,'a landing hero classed as feed is judged as desktop');
});

test('the read-back page asks a Purchase brief for a price or offer, never fills one in',()=>{
 const M=require('../../public/creative-ai/studio-model');
 assert.equal(M.offerSuggested({objective:'Purchase',messageType:'Benefit',outputs:[{staticValues:{}}]}),true);
 assert.equal(M.offerSuggested({objective:'Purchase',messageType:'Offer / price / EMI'}),false);
 assert.equal(M.offerSuggested({objective:'Purchase',mandatoryInfo:'Flat 20% off'}),false);
 assert.equal(M.offerSuggested({objective:'Awareness'}),false);
 const src=require('node:fs').readFileSync(require.resolve('../../public/creative-ai/studio.js'),'utf8');
 assert.match(src,/data-action="understood-add-offer"/);assert.match(src,/we never make one up/);
});

for(const brand of brands){
 test(brand+': a pinned carousel carries its picture jobs into every slide brief and check; the campaign look stays in planning',async t=>{
  const f=await fixture(t,{brand,selection:slides(3),copyFor:(input,p,i)=>[{role:'headline',text:['Sink into the corner seat','Arms that angle outward','Lean back tonight'][i],factIds:[]}],pageExtra:()=>({artDirection:'A young couple lounging on the sofa',palette:'warm peach walls, terracotta accents'})});
  assert.equal(f.planError,null);assert.equal(f.records.length,3);
  for(const r of f.records){assert.match(r.prompt,/CAROUSEL PICTURE JOBS v1/);assert.ok(r.reviewContract.requirements.some(x=>x.id==='placement-'+cc.ID.carousel));assert.doesNotMatch(r.prompt,/CAMPAIGN LOOK v1/);}
  const saved=JSON.parse(await fs.readFile(mr.historyFile(f.root,'brand-'+brand.toLowerCase()),'utf8'));
  assert.equal(saved.entries[0].palette,'warm peach walls, terracotta accents');assert.equal(saved.entries[0].people,true);
  // The next asset for the same product is told the campaign's colours; another brand is not.
  const g=await fixture(t,{brand,root:f.root});const look=g.calls.find(c=>c.kind==='lean-planning').input;
  assert.match(look.format.guidance.mandatory.find(r=>r.id===cc.ID.look).text,/"warm peach walls, terracotta accents"/);
  const other=await fixture(t,{brand:brands.find(b=>b!==brand),root:f.root});
  assert.equal(other.calls.find(c=>c.kind==='lean-planning').input.channelCraft.look.palettes.length,0);
 });
 test(brand+': an older job keeps its contract: no channel rules',async t=>{
  const f=await fixture(t,{brand,pinned:false,unpin:['channelCraftVersion'],selection:slides(3),copyFor:(input,p,i)=>[{role:'headline',text:['One','Two','Three'][i]+' seats',factIds:[]}]});
  assert.equal(f.planError,null);const input=f.calls.find(c=>c.kind==='lean-planning').input;
  assert.equal(input.channelCraft,undefined);assert.ok(!input.format.guidance.mandatory.some(r=>Object.values(cc.ID).includes(r.id)));
 });
}
