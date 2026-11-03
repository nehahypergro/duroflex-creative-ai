'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
for(const brandId of ['Duroflex','Sleepyhead'])test(brandId+': oversize composed prompt stops before rendering a guide or generating an image',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'early-prompt-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));let guides=0,images=0;
 t.mock.method(require('../../lib/creative-ai/runtime/composed-type-guide'),'create',async()=>{guides++;return {};});
 const job={intake:{brandId,composedQualityVersion:3}},record={route:'continuity',placementId:'fixture',conceptId:'concept',exactCopy:{fields:[{id:'h',delivery:'embedded',text:'Required words'}]},artDirection:{composition:'X'.repeat(33000)},attachmentManifest:[]},doc={brandId,canvas:{width:1000,height:1000},objects:[{id:'h',fieldId:'h',type:'text',text:'Required words',role:'headline',fontSize:100,left:20,top:20,width:800,height:200}],fonts:[]};
 const runtime={store:{dir:()=>dir,read:async()=>job,save:async(id,name,v)=>fs.writeFile(path.join(dir,name),JSON.stringify(v))},provider:{generate:async()=>{images++;throw Error('unexpected provider call');}}};
 await assert.rejects(require('../../lib/creative-ai/runtime/composed-text').prepare(runtime,'id','unit',record,doc,{}),e=>e.code==='IMAGE_PROMPT_LIMIT');
 assert.equal(guides,0);assert.equal(images,0);
 const report=JSON.parse(await fs.readFile(path.join(dir,'prompt-budget-source-dispatch-unit.json')));assert.equal(report.status,'blocked');assert.equal(report.paidDispatch,false);
});
test('early prompt check includes the exact brand boundary prefix',async()=>{
 const {BrandScopedProvider}=require('../../lib/creative-ai/runtime/brand-isolation'),p=new BrandScopedProvider({},{}),scope={brandId:'fixture',brandName:'Fixture',brandUrl:'https://example.com',revision:1,visualGuidance:'supplied'};
 p.context=async()=>({scope});const req={prompt:'x'.repeat(31500),scope:{placementId:'fixture'}};
 assert(req.prompt.length<32000);
 await assert.rejects(p.preflightImagePrompt(req,{}),e=>e.code==='IMAGE_PROMPT_LIMIT');
});
test('saved source artwork is not invalidated by the new dispatch-only prompt check',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cached-source-budget-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));await fs.writeFile(path.join(dir,'composed-source-unit.png'),'immutable historical source');let preflights=0;
 t.mock.method(require('../../lib/creative-ai/runtime/composed-type-guide'),'create',async()=>{throw Error('Existing checkpoint guide path reached');});
 const job={intake:{composedQualityVersion:3}},record={route:'continuity',placementId:'fixture',exactCopy:{fields:[{id:'h',delivery:'embedded',text:'Required words'}]},artDirection:{composition:'X'.repeat(33000)},attachmentManifest:[]},doc={canvas:{width:1000,height:1000},objects:[{fieldId:'h',type:'text',text:'Required words',role:'headline',fontSize:100,left:20,top:20,width:800,height:200}],fonts:[]};
 const runtime={store:{dir:()=>dir,read:async()=>job,save:async()=>{}},provider:{preflightImagePrompt:async()=>{preflights++;throw Error('New dispatch guard should not run');}}};
 await assert.rejects(require('../../lib/creative-ai/runtime/composed-text').prepare(runtime,'id','unit',record,doc,{}),/Existing checkpoint guide path reached/);assert.equal(preflights,0);assert.equal(await fs.readFile(path.join(dir,'composed-source-unit.png'),'utf8'),'immutable historical source');
});
test('planning reports an oversized placement without blocking its valid sibling',async()=>{
 const saved=[],runtime={store:{save:async(id,name,value)=>saved.push({name,value})},provider:{}};
 const rows=[{status:'request-ready',route:'continuity',placementId:'bad',prompt:'x'.repeat(32001)},{status:'request-ready',route:'continuity',placementId:'good',prompt:'Preserve exact approved wording.'}];
 const result=await require('../../lib/creative-ai/runtime/planning-prompt-budget').checkRecords(runtime,'fixture',{intake:{}},rows,{});
 assert.deepEqual(result.map(r=>r.status),['blocked','passed']);assert.equal(rows[0].prompt.length,32001);assert(saved.some(r=>r.value.status==='passed'));
});
