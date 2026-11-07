'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const copy=require('../../lib/creative-ai/runtime/copy-checks');
function inspect(expected,observed,{brand='Duroflex',rules=[],confidence=1,ocr={status:'measured',rows:[{text:'unrelated product marking'}]}}={}){
 const record={brand,lockedRules:rules,exactCopy:{fields:[{id:'headline',role:'headline',text:expected,delivery:'embedded',locked:true}]}},observations=[{fieldId:'headline',observedText:observed,decoration:'none',confidence,observation:'Synthetic visible field evidence'}],evidence={critical:[],findings:[]};
 const before=JSON.stringify({record,observations,ocr});copy.applyCopyChecks(record,evidence,observations,ocr);assert.equal(JSON.stringify({record,observations,ocr}),before);return evidence.critical[0].status;
}
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': safe display typography passes without depending on OCR reading order',()=>{
 for(const [a,b] of [['Rest... recharge','Rest… recharge'],['Comfort - every day','Comfort – every day'],['From ₹1,499','From Rs. 1,499'],['72 × 36','72x36'],['Sleep well','Sleep\nwell']])assert.equal(inspect(a,b,{brand}),'pass',a+' / '+b);
});
test('prices, signs, units, qualifiers and explicit literal wording remain protected',()=>{
 for(const [a,b] of [['₹1,499','Rs. 14,999'],['₹1,499','1,499'],['-5°C','5°C'],['-5°C','–5°C'],['10–20 days','10-20 days'],['72 × 36 cm','72 x 36'],['72 × 36 cm','72 x 36 in'],['Up to 20% off','20% off'],['2× stronger','2x stronger']])assert.equal(inspect(a,b),'fail',a+' / '+b);
 assert.equal(inspect('Rest... recharge','Rest… recharge',{rules:[{id:'client-copy',text:'Use exactly "Rest... recharge", verbatim including punctuation.'}]}),'fail');
 assert.equal(inspect('From ₹1,499','From Rs. 1,499',{rules:[{id:'client-copy',text:'Use the headline exactly as supplied: From ₹1,499'}]}),'fail');
 assert.equal(inspect('Rest... recharge','Rest… recharge',{confidence:.4}),'unknown');
});
test('OCR disagreement cannot veto a confident visual copy observation',()=>assert.equal(inspect('Sleep well','Sleep well'),'pass'));
test('editable review checks the saved copy before a paid visual call',async()=>{
 const Q=require('../../lib/creative-ai/runtime/editable-quality'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),dir=await fs.mkdtemp(path.join(os.tmpdir(),'copy-authority-'));let calls=0;
 try{const runtime={store:{dir:()=>dir,save:async()=>{}},provider:{reason:async()=>{calls++;throw Error('Should not dispatch');}}},record={exactCopy:{fields:[{id:'headline',text:'Saved wording',delivery:'embedded'}]},artDirection:{},attachmentManifest:[]},doc={canvas:{width:1080,height:1080},assets:[],objects:[{id:'t',type:'text',fieldId:'headline',text:'Changed wording'}]};
 await assert.rejects(Q.reviewOnce(runtime,'fixture','unit',doc,{data:'fixture',measurements:[],issues:[]},record,{}),/chosen wording/);assert.equal(calls,0);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('split editable lines retain saved order independent of canvas stacking order',()=>{
 const verify=require('../../lib/creative-ai/runtime/wording-agreement').verifyCanvas,record={exactCopy:{fields:[{id:'h',text:'Sleep well tonight',delivery:'embedded'}]}},doc={objects:[{id:'2',type:'text',fieldId:'h',lineIndex:1,lineCount:2,text:'tonight'},{id:'1',type:'text',fieldId:'h',lineIndex:0,lineCount:2,text:'Sleep well'}]};assert.equal(verify(record,doc),true);doc.objects[0].lineIndex=0;assert.throws(()=>verify(record,doc),/chosen wording/);
});

test('final artwork review never invokes the Mac OCR snapshot path',async()=>{
 const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),snapshots=require('../../lib/creative-ai/runtime/review-ocr-snapshot'),references=require('../../lib/creative-ai/runtime/product-review-images');
 const fixture=await require('../../lib/creative-ai/creative-reviewer/examples/synthetic').inputExample(),dir=await fs.mkdtemp(path.join(os.tmpdir(),'no-review-ocr-')),oldLoad=snapshots.load,oldBuild=references.build,stop=Error('Offline captured request');let request;
 snapshots.load=async()=>assert.fail('Final review must not call OCR');references.build=async()=>({images:[],references:[],instructions:''});
 try{await fs.writeFile(path.join(dir,'placement-catalog.json'),'{}');await assert.rejects(require('../../lib/creative-ai/runtime/review').review(fixture.package,fixture.artifact.imageData,{dir,attempt:0,budget:{},provider:{reason:async r=>{request=r;throw stop;}}}),e=>e===stop);assert.equal(request.input.ocr.status,'not-requested');assert.match(request.instructions,/COPY AUTHORITY v2/);assert.equal(typeof require('../../lib/creative-ai/runtime/review').ocr,'function','Localization helper remains available');}
 finally{snapshots.load=oldLoad;references.build=oldBuild;await fs.rm(dir,{recursive:true,force:true});}
});
test('disclaimers and global literal requirements do not permit typography substitutions',()=>{
 const field={id:'d',role:'disclaimer',text:'Terms... apply'};
 assert.equal(copy.equivalent({},field,'Terms… apply'),false);
 assert.equal(inspect('Rest... recharge','Rest… recharge',{rules:[{text:'All supplied copy must be reproduced verbatim.'}]}),'fail');
});
test('hidden, missing and unbound editable text is rejected without OCR',()=>{
 const verify=require('../../lib/creative-ai/runtime/wording-agreement').verifyCanvas,record={exactCopy:{fields:[{id:'h',text:'Sleep well',delivery:'embedded'}]}},o={id:'h',type:'text',fieldId:'h',text:'Sleep well'};
 for(const objects of [[],[{...o,visible:false}],[o,{id:'extra',type:'text',text:'Free gift'}],[{...o,type:'shape'}]])assert.throws(()=>verify(record,{objects}),/chosen wording/);
});
