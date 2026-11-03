'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const composition=require('../../lib/creative-ai/runtime/editable-composition');
const fontkit=require('fontkit');
const font=fontkit.create(fs.readFileSync('/System/Library/Fonts/Supplemental/Arial.ttf'));
const metrics=new Map([['font',font]]);
const box=(values={})=>({fieldId:'h',role:'headline',x:.05,y:.2,width:.39,height:.16,fontId:'font',fontSize:.075,minFontSize:.075,maxLines:2,minContrastRatio:4.5,surface:'Quiet real wall',colour:'#111111',align:'left',lineHeight:1.15,buttonBackground:null,buttonPadding:0,reason:'First message',...values});
for(const brandId of ['Duroflex','Sleepyhead'])test(brandId+': reconciliation rejects impossible exact copy before accepting the plan',()=>{
 const assets={brandId,fonts:[{id:'font',brandId}],logos:[]},spec={text:[{fieldId:'h',delivery:'embedded',exactText:'Everyday moments, together'}]},plan={contractVersion:2,safeMargin:.03,text:[box()],logo:null,protectedRegions:[]};
 const before=JSON.stringify(plan);
 assert.throws(()=>composition.validate(plan,spec,assets,false,{canvas:{width:1200,height:627},fonts:metrics}),/copy.*fit|typography.*fit/i);
 assert.equal(JSON.stringify(plan),before,'Do not silently shrink, rewrite or reposition the failed plan');
 const fixed=structuredClone(plan);Object.assign(fixed.text[0],{fontSize:.045,minFontSize:.04,height:.24,maxLines:3});
 assert.doesNotThrow(()=>composition.validate(fixed,spec,assets,false,{canvas:{width:1200,height:627},fonts:metrics}));
});
test('planning enforces a long unbreakable word, explicit line breaks and CTA padding',()=>{
 const a={brandId:'test',fonts:[{id:'font',brandId:'test'}],logos:[]},s={text:[{fieldId:'h',delivery:'embedded',exactText:'Unbreakable'}]},p={contractVersion:2,safeMargin:.03,text:[box({width:.1,height:.5,fontSize:.08,minFontSize:.04,maxLines:9})],logo:null,protectedRegions:[]},m={canvas:{width:1000,height:1000},fonts:metrics};
 assert.throws(()=>composition.validate(p,s,a,false,m),/copy.*fit|typography.*fit/i);
 s.text[0].exactText='One\nTwo\nThree';Object.assign(p.text[0],{width:.7,fontSize:.03,minFontSize:.03,maxLines:2});
 assert.throws(()=>composition.validate(p,s,a,false,m),/copy.*fit|typography.*fit/i);
 s.text[0].exactText='Explore';Object.assign(p.text[0],{role:'cta',maxLines:1,height:.05,buttonBackground:'#ffffff',buttonPadding:.02});
 assert.throws(()=>composition.validate(p,s,a,false,m),/copy.*fit|typography.*fit/i);
});
test('native copy and historical layout decoding remain outside the new planning fit gate',()=>{
 const a={brandId:'test',fonts:[],logos:[]},p={safeMargin:.03,text:[],logo:null,protectedRegions:[]};
 assert.doesNotThrow(()=>composition.validate(p,{text:[{delivery:'native',fieldId:'caption',exactText:'Native text'}]},a,false,{canvas:{width:1200,height:627},fonts:new Map()}));
});

test('saved failed LinkedIn plan cannot pass the shared font-metric gate; history stays unchanged',async()=>{
 const root=path.resolve(__dirname,'../..'),dir=path.join(root,'output/creative-ai/jobs/creative-557033af-96a2-47cd-825a-46eeccb1c261');
 const files=['editable-continuity-custom_studio-linkedin-post-original.json','editable-review-outcome-continuity-custom_studio-linkedin-post.json','job.json'];
 const bytes=files.map(n=>fs.readFileSync(path.join(dir,n))),doc=JSON.parse(bytes[0]),outcome=JSON.parse(bytes[1]),job=JSON.parse(bytes[2]);
 const a=job.intake.canvasAssets,fonts=await require('../../lib/creative-ai/runtime/layout-text-metrics').load({brands:{dir:id=>path.join(root,'output/creative-ai/brands',id)}},a);
 const spec={text:doc.objects.filter(o=>o.fieldId).map(o=>({fieldId:o.fieldId,delivery:'embedded',exactText:o.text}))};
 assert.throws(()=>composition.validate(doc.layoutIntent.layout,spec,a,true,{canvas:doc.canvas,fonts}),/Typography planning fit failed/);
 assert.equal(outcome.requiresManualReview,true);assert.equal(outcome.compositionChecks.visualApproval,false);
 assert.deepEqual(files.map(n=>fs.readFileSync(path.join(dir,n))),bytes);
});

test('production reconciliation rejects bad geometry in decode and accepts a repaired complete response',()=>{
 const a={brandId:'test',fonts:[{id:'font',brandId:'test'}],logos:[]},s={conceptId:'c',placementId:'p',status:'ready',text:[{fieldId:'h',delivery:'embedded',exactText:'Everyday moments, together'}]},p={contractVersion:2,safeMargin:.03,text:[box()],logo:null,protectedRegions:[]};
 const req={input:{artInput:{placements:[{id:'p',description:{dimensions:{width:1200,height:627}},jobInputs:{logoPolicy:{treatment:'omit'}}}]}},wire:{kind:'typed-reconciliation-v2',instructions:'',input:{units:[s]},schema:{type:'object',properties:{adjustments:{type:'array',items:{type:'object',properties:{conceptId:{type:'string'},placementId:{type:'string'}},required:['conceptId','placementId']}}}},decode:()=>({specifications:[s]})}};
 const saved=[],wire=composition.makeRequest(req,a,(s,p)=>saved.push(p),{fonts:metrics}).wire;
 const out={adjustments:[{conceptId:'c',placementId:'p',overlayLayout:p}]};
 assert.throws(()=>wire.decode(out),/Typography planning fit failed/);assert.equal(saved.length,0);
 assert.ok(wire.input.overlayTypography.units[0].text[0].fonts[0].longestWordEm>0);
 Object.assign(p.text[0],{fontSize:.045,minFontSize:.04,height:.24,maxLines:3});
 assert.equal(wire.decode(out).specifications[0],s);assert.equal(saved.length,1);
});
test('font loading rejects altered pinned files before they can inform a paid planning call',async()=>{
 const temp=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'planning-font-hash-'));try{fs.symlinkSync('/System/Library/Fonts/Supplemental',path.join(temp,'canvas-assets'));const a={brandId:'test',fonts:[{id:'font',brandId:'test',filename:'Arial.ttf',sha256:'incorrect'}]};await assert.rejects(()=>require('../../lib/creative-ai/runtime/layout-text-metrics').load({brands:{dir:()=>temp}},a),/pinned hash/);}finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('real production reconciliation wrapper resolves the selected pinned canvas',async()=>{
 const root=path.resolve(__dirname,'../..'),dir=path.join(root,'output/creative-ai/jobs/creative-b4becbb8-cfeb-4151-bf6f-e9aff2e98fc7');
 const job=JSON.parse(fs.readFileSync(path.join(dir,'job.json'))),inputFile=fs.readdirSync(dir).find(n=>/^plan-.*-art-input.json$/.test(n));
 const input=JSON.parse(await require('../../lib/creative-ai/runtime/artifact-fs').readFile(path.join(dir,inputFile),'utf8'));
 // Replay the actual saved pin, not today's readability/catalogue revision.
 const catalog=JSON.parse(fs.readFileSync(path.join(dir,'placement-catalog.json')));
 const ctx=await require('../../lib/creative-ai/art-director').assembleContext(input,{catalog,includeMessages:false});
 const request={wire:{input:{placements:ctx.placements}}};
 const canvas=require('../../lib/creative-ai/runtime/layout-text-metrics').canvasFor(request,input.placements[0]);
 assert.equal(canvas?.width,1200);assert.equal(canvas?.height,627);
 assert.equal(require('../../lib/creative-ai/runtime/layout-text-metrics').canvasFor(request,{id:'foreign',pin:{profileId:'foreign'}}),null);
});
