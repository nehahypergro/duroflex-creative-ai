'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const focused=require('../../lib/creative-ai/runtime/focused-context');
const deterministic=require('../../lib/creative-ai/runtime/deterministic-output');
const copy=require('../../lib/creative-ai/copywriter');
const {wire}=require('../../lib/creative-ai/runtime/copy-wire');
const {OpenAIProvider}=require('./offline-provider.cjs');
function input(){return {concepts:[{conceptId:'c1'},{conceptId:'c2'}],placements:[{id:'story',expanded:{profile:{nativeFields:[]},rules:[]}}],facts:[{id:'f1',status:'supported',text:'Manufacturer claim; not independent proof',sourceIds:['product']} ]};}
function response(){return {units:{unit0:{fields:[{role:'headline',text:'EXACT Product',target:'embedded',proofFactIds:['f1'],requirement:'mandatory',locked:true}]},unit1:{fields:[{role:'cta',text:'Explore',target:'embedded',proofFactIds:[],requirement:'optional',locked:true}]}},rationale:'One clear message.',unknowns:[]};}
test('copy wire binds IDs and embedded delivery without a model echo; authoritatively validates facts',()=>{
 const i=input(),w=wire(i,'Copy'),out=w.decode(response());
 assert.equal(out.decks[0].conceptId,'c1');assert.equal(out.decks[1].conceptId,'c2');assert.equal(out.decks[0].placementId,'story');assert.equal(out.decks[0].fields[0].id,'copy-1');assert.equal(out.decks[0].fields[0].nativeFieldId,'none');assert.equal(out.decks[0].fields[0].text,'EXACT Product');
 copy.validateOutput(out,i);
 const unsupported=response();unsupported.units.unit0.fields[0].proofFactIds=['invented'];assert.throws(()=>copy.validateOutput(w.decode(unsupported),i),/Unsupported copy proof/);
 const absent=response();delete absent.units.unit1;assert.throws(()=>w.decode(absent));
 const foreign=response();foreign.units.unit2=foreign.units.unit0;assert.throws(()=>w.decode(foreign));
});
test('native copy remains a constrained model choice; never defaulted to embedded',()=>{
 const i=input();i.placements[0].expanded.profile.nativeFields=[{id:'caption',required:true}];const w=wire(i,'Copy'),r=response();for(const u of Object.values(r.units))u.fields[0].target='native:caption';
 const out=w.decode(r);copy.validateOutput(out,i);assert.equal(out.decks[0].fields[0].delivery,'native');assert.equal(out.decks[0].fields[0].nativeFieldId,'caption');
 r.units.unit0.fields[0].target='native:foreign';assert.throws(()=>w.decode(r));
});
test('constants are omitted recursively and rehydrated without changing discretionary fields',()=>{
 const schema={type:'object',properties:{version:{const:1},rows:{type:'array',items:{type:'object',properties:{placementId:{enum:['p']},width:{const:1080},text:{type:'string'}},required:['placementId','width','text'],additionalProperties:false}}},required:['version','rows'],additionalProperties:false};
 const before=structuredClone(schema),projected=deterministic.project(schema);assert.deepEqual(projected.required,['rows']);assert.deepEqual(projected.properties.rows.items.required,['text']);
 assert.deepEqual(deterministic.restore({rows:[{text:'Exact'}]},schema),{version:1,rows:[{placementId:'p',width:1080,text:'Exact'}]});assert.deepEqual(schema,before);
});
test('role projections retain exact evidence and constraints without mutating source archives',()=>{
 const i={...input(),brandKnowledge:{brandId:'brand-one',revision:'v2'},guardian:{requirements:[{id:'rule',text:'EXACT mandatory qualifier',sourceIds:['guide']}]},strategy:{brief:{text:'Intent'},strategyChecks:{duplicate:'audit'}},brandResearch:{brandName:'Brand One',sources:[{id:'guide',status:'partial',note:'Draft only'},{id:'product',status:'available'},{id:'space',note:'Visual reference'},{id:'unused'}],findings:[{section:'tone',text:'Friendly',sourceIds:['guide']},{section:'conflicts',text:'Draft is not approved',sourceIds:['guide']},{section:'creative',text:'Visual geometry',sourceIds:['space']}],assets:[{id:'decor',kind:'reference',sourceIds:['space']},{id:'logo',kind:'logo',sourceIds:['guide']}]},assets:[{id:'decor',kind:'reference',sourceIds:['space']},{id:'logo',kind:'logo',sourceIds:['guide']}]};
 i.placements[0].expanded.rules=[{id:'size',text:'1080 x 1920; heuristic safe areas',check:{width:1080,height:1920},sourceIds:['guide']}];
 const original=structuredClone(i),out=focused.project('copy',i),art=focused.project('art',i);
 assert.deepEqual(i,original);assert.deepEqual(out.guardian,i.guardian);assert.deepEqual(out.facts,i.facts);assert.deepEqual(out.placements,i.placements);assert.deepEqual(out.brandKnowledge,i.brandKnowledge);
 assert.deepEqual(out.assets.map(a=>a.id),['logo']);assert.equal(out.brandResearch.assets,undefined);assert.deepEqual(out.brandResearch.sources.map(s=>s.id),['guide','product']);assert.match(out.brandResearch.sources[0].note,/Draft/);assert.ok(out.brandResearch.findings.some(f=>f.section==='conflicts'));
 assert.ok(art.brandResearch.findings.some(f=>f.section==='creative'));assert.deepEqual(art.assets,i.assets);
});
test('one provider call produces valid copy without asking the model for deterministic fields',async()=>{
 const original=global.fetch;let requests=0,validations=0;const i=input(),w=wire(i,'Copy');
 global.fetch=async(url,options)=>{requests++;const body=JSON.parse(options.body),field=body.text.format.schema.properties.units.properties.unit0.properties.fields.items;
 assert.equal(field.properties.id,undefined);assert.equal(field.properties.target,undefined); // singleton embedded is also code-bound
 const r=response();for(const u of Object.values(r.units))delete u.fields[0].target;
 return {ok:true,json:async()=>({id:'fake',status:'completed',usage:{},output:[{content:[{type:'output_text',text:JSON.stringify(r)}]}]})};};
 try{const p=new OpenAIProvider({reasoningModel:'fixture',reasoningTimeoutMs:1000});const out=await p.reason({contextKind:'copy',instructions:'Copy',input:i,wire:w,schema:copy.schemaFor(i),validate:o=>{validations++;copy.validateOutput(o,i);}},{reserve:async()=>{},receipt:async()=>{}});assert.equal(requests,1);assert.equal(validations,1);assert.equal(out.decks[0].fields[0].nativeFieldId,'none');}finally{global.fetch=original;}
});
test('art slots bind each requested pair and reject missing or foreign slots',()=>{
 const {wire:unitsWire}=require('../../lib/creative-ai/runtime/unit-wire');
 const row={type:'object',properties:{conceptId:{type:'string'},placementId:{type:'string'},scene:{type:'string'}},required:['conceptId','placementId','scene'],additionalProperties:false};
 const request={input:{placements:[{id:'p',dimensions:{width:1080,height:1920}}]},instructions:'Keep real assets',schema:{type:'object',properties:{drafts:{type:'array',items:row}},required:['drafts'],additionalProperties:false}};
 const pairs=[{conceptId:'a',placementId:'p'},{conceptId:'b',placementId:'p'}],w=unitsWire(request,'drafts',pairs),r={drafts:{unit0:{scene:'Room A'},unit1:{scene:'Room B'}}};
 assert.deepEqual(w.decode(r).drafts,[{scene:'Room A',...pairs[0]},{scene:'Room B',...pairs[1]}]);assert.deepEqual(w.input.placements,request.input.placements);
 assert.equal(w.schema.properties.drafts.properties.unit0.properties.conceptId,undefined);
 delete r.drafts.unit1;assert.throws(()=>w.decode(r));
});

test('editable copy roles survive every downstream art, graphics and review schema',async()=>{
 const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'../../lib/creative-ai'),roles=copy.outputSchema.properties.decks.items.properties.fields.items.properties.role.enum;let count=0;
 function visit(value,file){if(!value||typeof value!=='object')return;if(Array.isArray(value.enum)&&value.enum.includes('headline')){assert.deepEqual(value.enum,roles,file+' copy roles drifted');count++;}for(const child of Object.values(value))if(typeof child==='object')visit(child,file);}
 for(const name of ['art-director/input.schema.json','art-director/output.schema.json','art-director/handoff.schema.json','graphic-designer/input.schema.json','graphic-designer/output.schema.json','creative-reviewer/input.schema.json'])visit(JSON.parse(fs.readFileSync(path.join(root,name))),name);
 assert.equal(count,9);
 const art=require('../../lib/creative-ai/art-director'),fixture=await require('../../lib/creative-ai/art-director/examples/synthetic').inputExample();for(const deck of fixture.copy){deck.fields[0].role='product-name';if(deck.fields[1])deck.fields[1].role='supporting-copy';}art.validateInput(fixture);
});

test('editable concept handoff exposes approved font and logo IDs for each brand without binary assets',async()=>{
 const agents=require('../../lib/creative-ai/runtime/agents'),fixture=require('../../lib/creative-ai/creative-director/examples/synthetic');
 for(const brandId of ['brand-duroflex','brand-sleepyhead']){
  const registry={brandId,fonts:[{id:brandId+'-font',brandId,approved:true,name:'Approved font',weight:400,style:'normal',filename:'font.woff2',imageData:'do-not-send'}],logo:{id:brandId+'-logo',brandId,approved:true,name:'Approved logo',colour:'#ffffff'}};
  let packet;
  await assert.rejects(()=>agents.concepts(fixture.inputExample(),{reason:async req=>{packet=focused.project('concepts',req.wire.input);throw Error('captured');}},{},{canvasAssets:registry}),/captured/);
  assert.equal(packet.editableAssets.brandId,brandId);
  assert.equal(packet.editableAssets.fonts[0].id,brandId+'-font');assert.equal(packet.editableAssets.logos[0].id,brandId+'-logo');
  assert.equal(packet.editableAssets.fonts[0].filename,undefined);assert.equal(packet.revision.canvasAssets,undefined);
  assert.match(packet.editableAssets.instructions,/separate.*registry/i);
 }
 const engine=require('fs').readFileSync(require('path').join(__dirname,'../../lib/creative-ai/runtime/engine.js'),'utf8');assert.match(engine,/concepts\(directorInput,this.provider,budget,\{canvasAssets:intake.canvasAssets\}\)/);
});
