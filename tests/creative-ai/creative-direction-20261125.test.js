'use strict';
// Client creative direction v1 (Neha, 25 Nov 2026). Duroflex client feedback: no light blue or light green backgrounds (a
// competitor uses light blue); the person and room by range (Duropedic: fit, works out; LiveIn / Energise / Natural Living:
// sustainable); the website room's style reverse-engineered and a NEW space built in it; Japandi / Scandinavian / earthy rooms;
// limbo shots for features, explainers, close-ups and sale; crisp texture; about 30% breathing space; clean athleisure.
// Sleepyhead client feedback: the same colour rule and website-style rule; very bright, high-contrast limbo shots with shapes
// that explain the layers; orange as an accent, not a wall; streetwear drip meets comfort; dopamine-high Gen-Z rooms; the
// board's "quieter alternatives" no longer reach new designs; expressive creative freedom.
// Before this, none of it reached the planner, the image brief or the check (the module did not exist). Both brands, no
// paid calls.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),sharp=require('sharp'),crypto=require('node:crypto');
const cd=require('../../lib/creative-ai/lean/creative-direction');
const policy=require('../../lib/creative-ai/runtime/lean-policy'),pc=require('../../lib/creative-ai/runtime/provider-config');
const {fixture,square}=require('./lean-marketing-fixture');
const root=path.resolve(__dirname,'../..');
const IDS={Duroflex:'brand-1923d633-e03e-44cc-84b2-bbfb5c152710',Sleepyhead:'brand-3a5870df-d114-43eb-ba02-e5d8c3c729de'};
const brands=['Duroflex','Sleepyhead'];
const raw=brand=>JSON.parse(fs.readFileSync(path.join(root,'output/creative-ai/brands',IDS[brand],'creative-direction.json'),'utf8'));
// The real brand file, re-homed to the fixture's brand ID (the fixture's workspaces are synthetic).
const pinned=(brand,range=null)=>brandId=>({version:1,brandId,sha256:'f'.repeat(64),direction:{...raw(brand),brandId},range,at:'2026-11-25T00:00:00.000Z'});
const planning=f=>f.calls.find(c=>c.kind==='lean-planning'),reviews=f=>f.calls.filter(c=>c.kind==='lean-review'),images=f=>f.calls.filter(c=>c.kind==='image');
const pdp=(key,i=1)=>({id:'pdp-'+i,description:{name:'Product page image '+i,formatId:'custom:studio-pdp',pdp:{key,index:i,count:12},dimensions:{width:1080,height:1080}},jobInputs:{logoPolicy:{treatment:'include',reason:'Official logo required'}}});

test('new lean jobs pin creativeDirectionVersion and the saved settings keep it',()=>{
 const c=policy.configure({},{leanWorkflowVersion:1});assert.equal(c.creativeDirectionVersion,1);assert.equal(pc.snapshot(c).creativeDirectionVersion,1);assert.equal(pc.snapshot({}).creativeDirectionVersion,undefined);
});

test('each brand has its own file, read only for that brand, with no shared brand wording',async()=>{
 for(const brand of brands){const l=await cd.load(root,IDS[brand]);assert.equal(l.direction.brandName,brand);assert.match(l.sha256,/^[a-f0-9]{64}$/);}
 const other=path.join(require('node:os').tmpdir(),'cd-other-'+process.pid);fs.mkdirSync(path.join(other,'output/creative-ai/brands',IDS.Sleepyhead),{recursive:true});
 try{fs.writeFileSync(path.join(other,'output/creative-ai/brands',IDS.Sleepyhead,'creative-direction.json'),JSON.stringify(raw('Duroflex')));await assert.rejects(()=>cd.load(other,IDS.Sleepyhead),/another brand/,'a file naming another brand is refused');}
 finally{fs.rmSync(other,{recursive:true,force:true});}
 assert.equal(await cd.load(root,'brand-none'),null,'a brand with no file gets nothing');
 const d=raw('Duroflex'),s=raw('Sleepyhead');
 for(const k of ['rooms','wardrobe','limboColours','limboGraphics'])assert.notEqual(d[k],s[k],k+' is each brand\'s own');
 assert.doesNotMatch(JSON.stringify([s.rooms,s.wardrobe,s.limboColours,s.general]),/Japandi|Scandinavian|athleisure|Duropedic|clean girl/i,'no Duroflex direction in Sleepyhead');
 assert.doesNotMatch(JSON.stringify([d.rooms,d.wardrobe,d.limboColours,d.ranges]),/Gen-Z|Gen Z|dopamine|streetwear|building-brick|pop-art/i,'no Sleepyhead direction in Duroflex');
 assert.equal(d.freedom,'guided');assert.equal(s.freedom,'expressive');
 assert.doesNotMatch(JSON.stringify([s.rooms,s.general]),/Scandinavian|quieter/i,'Sleepyhead rooms are not Scandinavian or quiet');
 assert.match(s.rooms,/orange appears as at least one accent/);assert.match(s.rooms,/walls do not need to be orange/);
});

test('the range comes from the product\'s own saved website page',()=>{
 const d=raw('Duroflex'),read=id=>JSON.parse(fs.readFileSync(path.join(root,'output/creative-ai/brands',IDS.Duroflex,'products',id,'profile.json'),'utf8'));
 const byName=Object.fromEntries(fs.readdirSync(path.join(root,'output/creative-ai/brands',IDS.Duroflex,'products')).filter(x=>x.startsWith('product-')).map(id=>{const p=read(id);return [p.name,cd.detectRange(d,p)?.id||null];}));
 const find=re=>Object.entries(byName).find(([n])=>re.test(n))?.[1];
 assert.equal(find(/^Back Magic/),'duropedic');assert.equal(find(/^Posture Perfect/),'duropedic');
 assert.equal(find(/^LiveIn 100% Latex/),'natural-living');assert.equal(find(/^Quboid/),'natural-living','Energise collection');assert.equal(find(/^Tatva/),'natural-living','Natural Living range');
 assert.equal(find(/^LiveIn Orthopedic/),'duropedic','"LiveIn Duropedic" takes the Duropedic look (Neha\'s default)');
 assert.equal(find(/^Octave/),null,'a sofa with no range gets the general look');
 assert.equal(cd.detectRange(raw('Sleepyhead'),read('product-45b3f915e4bf3558c623')),null,'Sleepyhead has no ranges');
});

test('room or limbo is fixed by the page\'s job, otherwise the planner\'s choice',()=>{
 const s=(id,extra={})=>({id,description:{name:'Page',formatId:'custom:x',dimensions:{width:1080,height:1080},...extra.description},jobInputs:extra.jobInputs||{}});
 assert.equal(cd.sceneFor(s('custom:recipe-marketplace-main-01'),{}).scene,'limbo');assert.match(cd.sceneFor(s('custom:recipe-marketplace-main-01'),{}).backdrop,/pure white/);
 assert.equal(cd.sceneFor(s('custom:recipe-product-image-03'),{}).scene,'room','marketplace lifestyle');
 for(const key of ['detail','dimensions','firmness','technology','materials','included','primary-benefit'])assert.equal(cd.sceneFor(pdp(key),{}).scene,'limbo',key);
 assert.equal(cd.sceneFor(pdp('lifestyle'),{}).scene,'room');assert.equal(cd.sceneFor(pdp('hero'),{}).scene,'either');
 assert.equal(cd.sceneFor(s('a',{jobInputs:{aplus:{role:'technology'}}}),{}).scene,'limbo');assert.equal(cd.sceneFor(s('a',{jobInputs:{aplus:{role:'lifestyle'}}}),{}).scene,'room');
 assert.equal(cd.sceneFor(s('custom:studio-infographic',{description:{name:'Infographic'}}),{}).scene,'limbo');
 assert.equal(cd.sceneFor(s('custom:recipe-listing-feature-02'),{}).scene,'limbo');assert.equal(cd.sceneFor(s('custom:recipe-listing-feature-01'),{}).scene,'either');
 assert.equal(cd.sceneFor(s('custom:pmax-square'),{}).scene,'limbo');assert.equal(cd.sceneFor(s('custom:pmax-landscape'),{}).scene,'room');
 for(const m of ['Offer / price / EMI','Technology','Comparison'])assert.equal(cd.sceneFor(square(1),{messageType:m}).scene,'limbo',m);
 for(const m of ['Benefit','Product launch','Store news'])assert.equal(cd.sceneFor(square(1),{messageType:m}).scene,'either',m);
});

for(const brand of brands){
 test(brand+': the planner gets the direction; the brief and the check carry the planned scene',async t=>{
  const f=await fixture(t,{brand,selection:[square(1)],direction:pinned(brand)});assert.equal(f.planError,null);await f.run();
  const input=planning(f).input,c=input.creativeDirection,d=raw(brand);
  assert.equal(c.version,1);assert.equal(c.brand,brand);assert.equal(c.freedom,d.freedom);assert.equal(c.brief.rooms,d.rooms);assert.equal(c.brief.wardrobe,d.wardrobe);
  assert.match(c.rule,/build a NEW space, never a copy/);assert.match(c.rule,/never name a real brand|Never name a real brand/i);
  assert.equal(c.pages[0].scene,'either');assert.equal(c.pages[0].space,'calm');
  assert.ok(!JSON.stringify(c).includes(d.notes),'the record-only notes (real brand names) never reach the planner');
  for(const n of cd.NEVER_NAME)assert.ok(!new RegExp('\\b'+n+'\\b','i').test(JSON.stringify({rule:c.rule,brief:{...c.brief,neverName:[]}})),n+' is not sent to the planner');
  const prompt=images(f)[0].prompt;
  assert.match(prompt,new RegExp('CLIENT DIRECTION \\('+brand+'\\)'));assert.match(prompt,/SCENE: A bright, playful room/);assert.match(prompt,/A new space in this style, not a copy of any photo/);
  assert.ok(prompt.includes(d.avoidColours.text));assert.ok(prompt.includes(d.wardrobe));assert.match(prompt,/TEXTURE: Show the product's surface in sharp, high detail/);
  assert.match(prompt,/BREATHING SPACE: keep about 30% of the canvas calm/);assert.ok(prompt.includes(cd.FREEDOM[d.freedom]));
  assert.doesNotMatch(prompt,/Build a different setting/,'the old "different setting" sentence is gone');
  const req=reviews(f)[0].input.requirements.map(r=>r.id);
  for(const id of cd.IDS)assert.ok(req.includes(id),id+' is checked');assert.ok(!req.includes('reference-backdrop'),'the planned-scene check replaces the old room-copy check');
  const scene=reviews(f)[0].input.requirements.find(r=>r.id==='scene-type');assert.match(scene.expected,/A room in the planned style/);assert.match(scene.expected,/recognisably the same room as an official product photo/);
 });

 test(brand+': a sale message makes the page a limbo shot; a room plan for it is refused with the reason',async t=>{
  const room=(input,p)=>({scene:{type:'room',backdrop:'A calm bedroom with oak floors and linen.',elements:['a ceramic vase','a woven rug','a lamp']}});
  const f=await fixture(t,{brand,selection:[square(1)],direction:pinned(brand),messageType:'Offer / price / EMI',pageExtra:room});
  assert.match(String(f.planError?.message||''),/page-1: this page is a limbo shot: The brief.s message is "Offer \/ price \/ EMI", a sale, technology or comparison page\. Write scene\.type "limbo"\./);
  const g=await fixture(t,{brand,selection:[square(1)],direction:pinned(brand),messageType:'Offer / price / EMI'});assert.equal(g.planError,null);await g.run();
  assert.match(images(g)[0].prompt,/SCENE: limbo shot on A seamless warm terracotta backdrop\. LIMBO SHOT: the product on one seamless, solid-colour backdrop/);
  assert.match(reviews(g)[0].input.requirements.find(r=>r.id==='scene-type').expected,/A limbo shot on/);
 });

 test(brand+': the plan check refuses an avoided backdrop colour, a real brand name and too few named elements',async t=>{
  const d=raw(brand),make=scene=>(input,p)=>({scene}),four=['a lamp','a rug','a vase','a plant','a print','a stool'].slice(0,d.props.min);
  const blue=await fixture(t,{brand,direction:pinned(brand),pageExtra:make({type:'room',backdrop:'A pale blue wall with oak shelves.',elements:four})});
  assert.match(String(blue.planError?.message),/the backdrop may not be pale blue/);
  const ok=await fixture(t,{brand,direction:pinned(brand),pageExtra:make({type:'room',backdrop:'A warm sand wall (no light blue) with oak shelves.',elements:four})});
  assert.equal(ok.planError,null,'a colour named only to rule it out is fine');
  const named=await fixture(t,{brand,direction:pinned(brand),pageExtra:make({type:'room',backdrop:'A playful room.',elements:['a Lego set',...four].slice(0,Math.max(1,d.props.min))})});
  assert.match(String(named.planError?.message),/do not name "Lego" in the plan; describe it generically/);
  const few=await fixture(t,{brand,direction:pinned(brand),pageExtra:make({type:'room',backdrop:'A playful room with bold colours.',elements:[]})});
  assert.match(String(few.planError?.message),new RegExp('a room page names '+d.props.min+' to '+d.props.max+' specific elements'));
 });

 test(brand+': replaced preferences and advice stay out; recent palettes in an avoided colour are not offered',()=>{
  const d=raw(brand);
  for(const id of d.replacesPreferences)assert.equal(cd.keepPreference({id},d),false,id);
  assert.equal(cd.keepPreference({id:'preference-logo'},d),true,'other preferences stay');
  assert.equal(cd.keepAdvice({id:'spatial-world'},d),brand==='Duroflex','Sleepyhead drops its board\'s quieter-room advice');
  assert.equal(cd.keepAdvice({id:'brand-observation-0'},d),brand==='Duroflex');assert.equal(cd.keepAdvice({id:'personality'},d),true);
  assert.deepEqual(cd.filterLook({palettes:['Soft sky blue walls, oak','Terracotta and cream'],peopleShown:1,peopleTotal:3},d).palettes,['Terracotta and cream']);
 });

 test(brand+': a clear background-colour finding gets the one redraw',async t=>{
  const flag=out=>{const c=out.checks.find(x=>x.id==='background-colour');if(c&&!flag.done){flag.done=true;c.result='clear_mismatch';c.evidence='The back wall is a clear light blue.';}};
  const f=await fixture(t,{brand,direction:pinned(brand),reviewEdit:flag});await f.run();
  assert.equal(images(f).length,2);assert.ok(images(f)[1].prompt.includes('The back wall is a clear light blue.'));
  const r=(await f.read()).results[0];assert.equal(r.correction.action,'redraw');
 });

 test(brand+': the website room style and the texture close-up reach the planner and the image model',async t=>{
  const reply=()=>({room:{present:true,style:'Japandi',architecture:'plain plaster walls, wide windows',materials:'oak and linen',furniture:'low platform bed',decor:'paper lantern',lighting:'soft daylight',palette:'cream and pale blue',mood:'calm'},limbo:{present:true,palette:'bright yellow',shapes:'circles',devices:'stacked layer cards'},texture:{photo:1,x:0.3,y:0.3,w:0.3,h:0.3,shows:'quilted knit fabric'}});
  const f=await fixture(t,{brand,direction:pinned(brand),spaceReply:reply});assert.equal(f.planError,null);
  const c=planning(f).input.creativeDirection;assert.match(c.websiteRoomStyle,/style: Japandi; architecture: plain plaster walls/);assert.match(c.websiteLimboStyle,/stacked layer cards/);
  assert.match(c.rule,/If the website.s room style or studio look uses light blue or light green, keep the style and change those colours: this rule wins over websiteRoomStyle and websiteLimboStyle/);
  const rec=f.records[0];assert.equal(rec.textureCloseUp.sourceAssetId,'sku-photo');assert.deepEqual(rec.textureCloseUp.box,{left:324,top:324,width:324,height:324});
  await f.run();const req=images(f)[0],last=req.attachments.at(-1);
  assert.equal(last.assetId,'texture-close-up');assert.deepEqual(last.roles,['texture']);
  assert.match(req.prompt,new RegExp('Image '+req.attachments.length+' is an enlarged close-up of the product\'s real surface texture \\(quilted knit fabric\\), cropped from exact product reference image 1'));
  assert.equal(await cd.textureMatches(last,req.attachments,{leanWorkflowVersion:1}),true,'the safety check accepts the exact crop');
  const tampered={...last,imageData:'data:image/png;base64,'+(await sharp({create:{width:20,height:20,channels:3,background:'#ff0000'}}).png().toBuffer()).toString('base64')};
  assert.equal(await cd.textureMatches(tampered,req.attachments,{leanWorkflowVersion:1}),false,'any other picture is refused');
  assert.equal(await cd.textureMatches({...last,roles:['product']},req.attachments,{leanWorkflowVersion:1}),false);
  const saved=fs.readdirSync(path.join(f.root,'output/creative-ai/brands','brand-'+brand.toLowerCase(),'product-spaces'));assert.equal(saved.length,1,'cached once for this brand and product');
 });

 test(brand+': jobs without the pin, or a brand with no file, are unchanged',async t=>{
  for(const opts of [{brand,pinned:false,unpin:['creativeDirectionVersion'],direction:pinned(brand)},{brand}]){
   const f=await fixture(t,opts);assert.equal(f.planError,null);await f.run();
   assert.equal(planning(f).input.creativeDirection,undefined);assert.doesNotMatch(images(f)[0].prompt,/CLIENT DIRECTION/);
   const req=reviews(f)[0].input.requirements.map(r=>r.id);assert.ok(req.includes('reference-backdrop'));for(const id of cd.IDS)assert.ok(!req.includes(id));
  }
 });
}

test('"Did it deliver?" shows Brand look, and breathing space under Layout',()=>{
 const M=require('../../public/creative-ai/studio-model');
 const rows=M.deliveryRows([{id:'background-colour',result:'clear_mismatch',evidence:'Light blue wall'},{id:'scene-type',result:'no_mismatch'},{id:'breathing-space',result:'no_mismatch'},{id:'product-texture',result:'no_mismatch'}]);
 assert.deepEqual(rows.map(r=>[r.name,r.state]),[['Product','ok'],['Brand look','check'],['Layout','ok']]);
});
