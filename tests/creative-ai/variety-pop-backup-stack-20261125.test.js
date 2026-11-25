'use strict';
// Regression (25 Nov 2026, Neha: "Yes, all four", after the local variety batch of 6 designs per brand):
//  1. Variety memory: Duroflex rooms kept landing on warm ivory with the same props (a yoga mat in two of six) and
//     Sleepyhead people kept wearing an orange or pink tee with purple or cobalt trousers: each plan was written without
//     knowing what the brand's other designs had just used. New jobs pin varietyVersion 1: each plan's scenes join the
//     brand's own history, the next plan gets the brand's recent scenes (any product) and writes outfits in scene.wardrobe.
//  2. Duroflex's "little pop": the plans named one but the pictures stayed muted. The brand's own file now names the pop;
//     the planner writes it in scene.pop on room pages and the image brief asks for it, clearly visible.
//  3. Backup planner room: the backup thinks at length and its answer limit counts its thinking; 8 of 22 saved one-image
//     backup answers were cut off at 12,500 tokens (Sleepyhead Original creative-09af3cf4 failed; Napster creative-d35a51e2
//     needed a repair). New jobs pin backupRoomVersion 1: the backup gets 30,000 tokens.
//  4. Layer stack: the Sleepyhead Flip infographic (creative-6957b50b) put the labels left and the exploded stack right,
//     drawn too wide, so it ran off the right edge twice. New jobs pin layerStackVersion 1: a planner note when the inside
//     may be shown, and the redraw says how to fit a cut stack.
// Both brands; fails before; no paid calls.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),fsp=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const policy=require('../../lib/creative-ai/runtime/lean-policy'),pc=require('../../lib/creative-ai/runtime/provider-config');
const {fixture,square,story}=require('./lean-marketing-fixture');
const {OpenAIProvider}=require('./offline-provider.cjs');
const root=path.resolve(__dirname,'../..');
const IDS={Duroflex:'brand-1923d633-e03e-44cc-84b2-bbfb5c152710',Sleepyhead:'brand-3a5870df-d114-43eb-ba02-e5d8c3c729de'};
const raw=brand=>JSON.parse(fs.readFileSync(path.join(root,'output/creative-ai/brands',IDS[brand],'creative-direction.json'),'utf8'));
const pinned=(brand,edit=d=>d)=>brandId=>({version:1,brandId,sha256:'f'.repeat(64),direction:edit({...raw(brand),brandId}),range:null,at:'2026-11-25T00:00:00.000Z'});
const planning=f=>f.calls.find(c=>c.kind==='lean-planning'),images=f=>f.calls.filter(c=>c.kind==='image');
async function sharedRoot(t){const dir=await fsp.mkdtemp(path.join(os.tmpdir(),'variety-'));t.after(()=>fsp.rm(dir,{recursive:true,force:true}));return dir;}
const ROOM={Duroflex:'A Japandi bedroom with warm ivory limewash walls and pale oak floors.',Sleepyhead:'A dopamine-high studio room with a hot pink wall and a chequered floor.'};
const OUTFIT={Duroflex:'A woman in a bone ribbed set and a man in a charcoal henley with oat joggers.',Sleepyhead:'A young man in an orange oversized tee with purple cargo pants and a cap.'};
const roomWith=(brand,{backdrop=ROOM[brand],wardrobe=OUTFIT[brand],first='a rolled yoga mat by the wall'}={})=>input=>{const n=input.creativeDirection.props.min;return {scene:{type:'room',backdrop,elements:[first,'a ceramic vase','a woven jute rug','a floor lamp','a stack of books','a potted plant'].slice(0,n),...(input.creativeDirection.variety?{wardrobe}:{})}};};

test('new lean jobs pin variety, backup room and layer stack; the snapshot keeps them',()=>{
 const c=policy.configure({},{leanWorkflowVersion:1});
 for(const k of ['varietyVersion','backupRoomVersion','layerStackVersion']){assert.equal(c[k],1,k);assert.equal(pc.snapshot(c)[k],1,k);assert.equal(pc.snapshot({})[k],undefined,k);}
});

// ---- 1. Variety memory ----
test('variety: the same kind of piece is counted once per design whatever its wording; old entries and this unit are left out',()=>{
 const v=require('../../lib/creative-ai/lean/variety');
 assert.equal(v.itemKey('a rolled yoga mat by the wall'),'mat');assert.equal(v.itemKey('A sage-free terracotta vase on the side table'),'vase');assert.equal(v.itemKey('two chunky trainers'),'trainer');
 const at='2026-11-25T08:00:00.000Z',now=Date.parse('2026-11-25T12:00:00.000Z'),scene=(backdrop,elements,wardrobe)=>[{type:'room',backdrop,elements,...(wardrobe?{wardrobe}:{})}];
 const history={entries:[
  {jobId:'old',unitKey:'u',at:'2026-10-01T00:00:00.000Z',scenes:scene('An old room',['a rolled yoga mat'])},
  {jobId:'a',unitKey:'u',at,headlines:['x']},
  {jobId:'b',unitKey:'u',at,scenes:scene('Warm ivory bedroom',['a rolled yoga mat by the wall','a linen throw'],'Bone ribbed set')},
  {jobId:'c',unitKey:'u',at,scenes:scene('Warm ivory living room',['a yoga mat leaning on the wall','a clay vase'])},
  {jobId:'me',unitKey:'u',at,scenes:scene('This unit',['a yoga mat'])}]};
 const r=v.recent(history,{jobId:'me',unitKey:'u',now});
 assert.equal(r.designs,2,'the 30-day window, entries with scenes, not this unit');
 assert.deepEqual(r.rooms,['Warm ivory living room','Warm ivory bedroom']);assert.deepEqual(r.wardrobe,['Bone ribbed set']);
 assert.deepEqual(r.repeated,[{item:'a yoga mat leaning on the wall',designs:2}]);
});
for(const brand of ['Duroflex','Sleepyhead']){
 test(brand+': the next design gets the brand\'s recent scenes (any product) and writes outfits; the image brief names them',async t=>{
  const dir=await sharedRoot(t);
  const first=await fixture(t,{brand,root:dir,selection:[square(1)],direction:pinned(brand),pageExtra:roomWith(brand)});assert.equal(first.planError,null);
  const firstInput=planning(first).input.creativeDirection;assert.deepEqual(firstInput.variety,{version:1,designs:0},'nothing recent yet');assert.match(firstInput.rule,/VARIETY: Write each person's outfit/);
  const saved=JSON.parse(await fsp.readFile(path.join(dir,'output/creative-ai/brands','brand-'+brand.toLowerCase(),'campaign-headlines.json'),'utf8'));
  assert.deepEqual(saved.entries.at(-1).scenes[0].wardrobe,OUTFIT[brand],'the outfit joins the brand history');
  const second=await fixture(t,{brand,root:dir,productName:'Another product',selection:[square(1)],direction:pinned(brand),pageExtra:roomWith(brand,{backdrop:'A new room with a clay plaster wall.',wardrobe:'A woman in a mocha seamless set.'})});assert.equal(second.planError,null);await second.run();
  const cd=planning(second).input.creativeDirection;
  assert.equal(cd.variety.designs,1);assert.deepEqual(cd.variety.rooms,[ROOM[brand]]);assert.deepEqual(cd.variety.wardrobe,[OUTFIT[brand]]);assert.ok(cd.variety.elements.includes('a rolled yoga mat by the wall'));
  assert.match(cd.rule,/Make this design clearly different, within the brand's direction: a different kind of room and a different wall colour or finish from variety\.rooms/);
  assert.match(cd.rule,/different garments and outfit colours from variety\.wardrobe/);
  const schema=require('../../lib/creative-ai/lean/planning').schemaFor(planning(second).input);assert.ok(schema.properties.pages.items.properties.scene.required.includes('wardrobe'));
  assert.match(images(second)[0].prompt,/Outfits in this picture: A woman in a mocha seamless set\./);
 });
 test(brand+': a piece used in two recent designs is listed as repeated; another brand\'s history is never read',async t=>{
  const dir=await sharedRoot(t);
  for(let i=0;i<2;i++)assert.equal((await fixture(t,{brand,root:dir,selection:[square(1)],direction:pinned(brand)})).planError,null);
  const other=brand==='Duroflex'?'Sleepyhead':'Duroflex',theirs=await fixture(t,{brand:other,root:dir,selection:[square(1)],direction:pinned(other)});
  assert.equal(planning(theirs).input.creativeDirection.variety.designs,0,'the other brand has its own history');
  const next=await fixture(t,{brand,root:dir,selection:[square(1)],direction:pinned(brand)});
  const v=planning(next).input.creativeDirection.variety;assert.equal(v.designs,2);assert.deepEqual(v.repeated.find(r=>/yoga mat/.test(r.item)),{item:'a rolled yoga mat',designs:2});
  assert.match(planning(next).input.creativeDirection.rule,/never use a piece in variety\.repeated again/);
 });
 test(brand+': jobs admitted before the pin keep their planner input, schema and history entries',async t=>{
  const dir=await sharedRoot(t);
  const f=await fixture(t,{brand,root:dir,selection:[square(1)],direction:pinned(brand),pinned:false,unpin:['varietyVersion']});assert.equal(f.planError,null);
  const cd=planning(f).input.creativeDirection;assert.equal(cd.variety,undefined);assert.doesNotMatch(cd.rule,/VARIETY/);
  assert.equal(require('../../lib/creative-ai/lean/planning').schemaFor(planning(f).input).properties.pages.items.properties.scene.properties.wardrobe,undefined);
  const saved=JSON.parse(await fsp.readFile(path.join(dir,'output/creative-ai/brands','brand-'+brand.toLowerCase(),'campaign-headlines.json'),'utf8'));assert.equal(saved.entries.at(-1).scenes,undefined);
 });
}

// ---- 2. Duroflex's pop of colour (Duroflex's own file; Sleepyhead's file names none) ----
test('Duroflex: the pop of colour reaches the planner and the image brief; a room plan without one is refused',async t=>{
 assert.match(raw('Duroflex').pop,/pop of colour/);assert.doesNotMatch(raw('Duroflex').rooms,/where it helps/);assert.equal(raw('Sleepyhead').pop,undefined);
 const f=await fixture(t,{brand:'Duroflex',selection:[square(1)],direction:pinned('Duroflex')});assert.equal(f.planError,null);await f.run();
 const cd=planning(f).input.creativeDirection;assert.equal(cd.brief.pop,raw('Duroflex').pop);assert.match(cd.rule,/POP OF COLOUR \(room pages\): brief\.pop\. Write scene\.pop/);
 assert.ok(require('../../lib/creative-ai/lean/planning').schemaFor(planning(f).input).properties.pages.items.properties.scene.required.includes('pop'));
 assert.match(images(f)[0].prompt,/POP OF COLOUR: a burnt-orange ceramic vase on the side table\. One small object in a rich, saturated colour, clearly visible/);
 const none=await fixture(t,{brand:'Duroflex',selection:[square(1)],direction:pinned('Duroflex'),planEdit:out=>{out.pages[0].scene.pop='';}});
 assert.match(String(none.planError?.message),/write scene\.pop: the one small object that is the pop of colour/);
});
test('Sleepyhead, and a Duroflex direction pinned before the pop: no pop field, line or check',async t=>{
 for(const [brand,edit] of [['Sleepyhead',d=>d],['Duroflex',d=>{const {pop,...rest}=d;return rest;}]]){
  const f=await fixture(t,{brand,selection:[square(1)],direction:pinned(brand,edit)});assert.equal(f.planError,null);await f.run();
  const cd=planning(f).input.creativeDirection;assert.equal(cd.brief.pop,undefined);assert.doesNotMatch(cd.rule,/POP OF COLOUR/);
  assert.equal(require('../../lib/creative-ai/lean/planning').schemaFor(planning(f).input).properties.pages.items.properties.scene.properties.pop,undefined);
  assert.doesNotMatch(images(f)[0].prompt,/POP OF COLOUR/);
 }
 assert.throws(()=>require('../../lib/creative-ai/lean/creative-direction').validateFile({...raw('Duroflex'),pop:'x'.repeat(700)},IDS.Duroflex),/pop is one short paragraph/);
});

// ---- 3. Backup planner room ----
function backupRun({pin,cutFirst=false}){
 const p=new OpenAIProvider({reasoningModel:'gpt-6-luna',...(pin?{backupRoomVersion:1}:{}),roleModels:{'lean-planning':{model:'gpt-6.1-sol',reasoningEffort:'high'}},fallbackModels:{'lean-planning':{model:'gpt-6-luna',reasoningEffort:'high'}},reasoningBackground:true,reasoningStore:true,reasoningTimeoutMs:900000,maxOutputTokens:25000,maxRecoveryOutputTokens:50000,reasoningCallLimits:{planningMs:240000,reviewMs:240000,queuedMs:90000,retryMinimumMs:120000,pollMaxIntervalMs:4000}});
 let clock=0;const bodies=[],receipts=[],saved=new Map();p.sleep=async ms=>{clock+=ms;};
 const done=(id,out)=>({ok:true,json:async()=>({id,status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(out)}]}]})});
 const cut=id=>({ok:true,json:async()=>({id,status:'incomplete',incomplete_details:{reason:'max_output_tokens'},usage:{output_tokens:12500,output_tokens_details:{reasoning_tokens:12500}},output:[]})});
 p.sendReasoning=async b=>{bodies.push(structuredClone(b));if(b.background)return {ok:true,json:async()=>({id:'resp_bg',status:'queued'})};const n=bodies.filter(x=>!x.background).length;return cutFirst&&n===1?cut('resp_cut'):done('resp_backup_'+n,{ok:true});};
 p.retrieveReasoning=async id=>{clock+=5000;return {ok:true,json:async()=>({id,status:'queued',output:[]})};};
 p.cancelReasoning=async id=>({ok:true,json:async()=>({id,status:'cancelled'})});
 const budget={reserve:async()=>{},receipt:async r=>receipts.push(r),remainingMs:async()=>40*60*1000,loadResponse:async(k,key)=>structuredClone(saved.get(key)),saveResponse:async(k,key,v)=>{saved.set(key,structuredClone(v));},waiting:async()=>{}};
 const realNow=Date.now;Date.now=()=>1e12+clock;
 return p.reason({contextKind:'lean-planning',callPages:1,instructions:'plan',input:{},maxOutputTokens:12500,schema:{type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false}},budget).finally(()=>{Date.now=realNow;}).then(out=>({out,bodies,receipts}));
}
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': a backup planner that takes over a one-image plan gets 30,000 tokens; its repair after a cut-off gets 50,000',async()=>{
 const {out,bodies,receipts}=await backupRun({pin:true});assert.deepEqual(out,{ok:true});
 assert.deepEqual(bodies.map(b=>[b.model,b.max_output_tokens]),[['gpt-6.1-sol',12500],['gpt-6-luna',30000]],'the main planner keeps its limit; the backup gets the room');
 assert.equal(receipts.find(r=>r.requestId==='resp_backup_1').outputTokenLimit,30000);
 const cut=await backupRun({pin:true,cutFirst:true});assert.deepEqual(cut.bodies.filter(b=>!b.background).map(b=>b.max_output_tokens),[30000,50000]);
 const old=await backupRun({pin:false});assert.deepEqual(old.bodies.map(b=>[b.model,b.max_output_tokens]),[['gpt-6.1-sol',12500],['gpt-6-luna',12500]],'earlier jobs keep the limit');
});

// ---- 4. Layer stack ----
const BASE={Duroflex:'https://duroflex.test/cdn/shop/files/',Sleepyhead:'https://sleepyhead.test/cdn/shop/files/'};
const gallery=base=>[{id:'sku-product-image-1',label:'Mattress on a bed, angled view',url:base+'M_1.jpg'},{id:'sku-product-image-2',label:'Mattress front view',url:base+'M_2.jpg'},{id:'sku-product-image-3',label:'Exploded product cutaway with labelled construction layers',url:base+'M_7.jpg'}];
const STACK_CUT='The lower construction illustration runs through the right canvas edge, cutting off the outer fabric, both foam slabs and lower mattress shell despite the requirement to keep the whole product inside the canvas.';
function flag(evidence){let n=0;return out=>{n++;if(n!==1)return;const c=out.checks.find(x=>x.id==='placement-composition-layout')||out.checks.find(x=>['spatial-layout','layout','structure'].includes(x.id));if(c){c.result='clear_mismatch';c.evidence=evidence;}};}
const NARROWER=/The layer stack ran off the edge last time: draw the whole stack narrower \(at most about half the canvas width\)/;
for(const brand of ['Duroflex','Sleepyhead']){
 test(brand+': with an official construction picture the planner gets the layer-stack note; a stack cut by the edge is redrawn narrower',async t=>{
  const name=brand==='Duroflex'?'Duropedic Airboost 6.8 Mattress':'Flip - Dual Comfort Mattress';
  const f=await fixture(t,{brand,productName:name,selection:[story()],gallery:gallery(BASE[brand]),identityUrl:BASE[brand]+'M_1.jpg',reviewEdit:flag(STACK_CUT)});assert.equal(f.planError,null);await f.run();
  const stack=planning(f).input.layerStack;assert.ok(stack,'the planner gets the note');assert.match(stack.rule,/with labels on one side, the stack takes at most about half the canvas width/);assert.match(stack.rule,/productPlacement and spacingAndCrop, in your own words/);
  const [first,redraw]=images(f);assert.ok(redraw,'one redraw');assert.match(redraw.prompt,NARROWER);assert.doesNotMatch(first.prompt,NARROWER,'no fixed line in the first drawing');
 });
 test(brand+': no construction picture, or a job admitted before the pin: no layer-stack note or line',async t=>{
  const none=await fixture(t,{brand,selection:[square(1)],gallery:gallery(BASE[brand]).slice(0,2)});assert.equal(planning(none).input.layerStack,undefined);
  const old=await fixture(t,{brand,selection:[square(1)],gallery:gallery(BASE[brand]),identityUrl:BASE[brand]+'M_1.jpg',pinned:false,unpin:['layerStackVersion'],reviewEdit:flag(STACK_CUT)});await old.run();
  assert.equal(planning(old).input.layerStack,undefined);const [,redraw]=images(old);assert.ok(redraw);assert.doesNotMatch(redraw.prompt,NARROWER);
 });
}
