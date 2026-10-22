'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const copy=require('../../lib/creative-ai/runtime/copy-checks'),focus=require('../../lib/creative-ai/runtime/focused-ocr').focus;
function inspect(expected,observed,{confidence=1,decoration='none',brand='Sleepyhead',route='continuity'}={}){
 const record={brand,route,exactCopy:{fields:[{id:'copy-1',text:expected,locked:true,delivery:'embedded'}]}},observations=[{fieldId:'copy-1',observedText:observed,confidence,decoration,observation:'Synthetic transcription for comparison policy test.'}],ocr={status:'measured',rows:[{text:observed}]},evidence={critical:[],findings:[]};
 const before=JSON.stringify({record,observations,ocr});copy.applyCopyChecks(record,evidence,observations,ocr);assert.equal(JSON.stringify({record,observations,ocr}),before,'Comparison must not rewrite supplied or observed text');return {record,ocr,evidence};
}
for(const brand of ['Duroflex','Sleepyhead'])for(const route of ['continuity','exploration'])test(brand+' '+route+': harmless OCR punctuation passes without findings or focused verification',async()=>{
 for(const [expected,observed] of [['Bubbles · Canyon Rose','Bubbles • Canyon Rose'],['“Your home” isn’t ordinary','"Your home" isn\'t ordinary'],['Your\nhome','Your   home']]){
  const {record,ocr,evidence}=inspect(expected,observed,{brand,route});assert.equal(evidence.critical[0].status,'pass');assert.deepEqual(evidence.findings,[]);
  assert.equal(await focus(record,'must-not-read-image.png',{width:1080,height:1080},ocr,{recognize:()=>{throw Error('Harmless punctuation must not trigger OCR retry');}}),ocr);
 }
});
test('meaningful punctuation, words, numbers and case still fail; uncertain reading stays unknown',()=>{
 for(const [expected,observed] of [['₹1,499','1,499'],['₹1,499','₹14,999'],['2.5 inches','25 inches'],['20% off','20 off'],['3-seater','3 seater'],['Bubbles · Canyon Rose','Bubbles · Pine Green'],['LiveIn','Liveln'],['Find Yours','find Yours'],['Find Yours','Find Yours!'],['1·5','1•5']])assert.equal(inspect(expected,observed).evidence.critical[0].status,'fail',expected+' vs '+observed);
 for(const options of [{confidence:.4},{decoration:'ambiguous'}])assert.equal(inspect('Bubbles · Canyon Rose','Bubbles • Canyon Rose',options).evidence.critical[0].status,'unknown');
});
test('saved same-brief square copy reviews for both brands: no history mutation or unrelated flag removal',()=>{
 const root=path.resolve(__dirname,'../../output/creative-ai/jobs');
 for(const [job,route,attempt] of [['creative-e9f8c2ce-6138-4120-9043-68d4de847c6f','continuity',1],['creative-e9f8c2ce-6138-4120-9043-68d4de847c6f','exploration',1],['creative-b421f4a4-3a63-48ec-b573-361048edabbe','continuity',0]]){
  const suffix=route+'-custom_studio-social-square-'+attempt+'.json',names=['package-','review-copy-','ocr-','review-'].map(prefix=>path.join(root,job,prefix+suffix)),bytes=names.map(name=>fs.readFileSync(name)),[record,observations,ocr]=bytes.map(b=>JSON.parse(b));
  const unrelated={criterion:'logo-identity',status:'unknown'},finding={criterion:'logo-identity',defect:'Keep original logo concern'},evidence={critical:[unrelated],findings:[finding]};
  copy.applyCopyChecks(record,evidence,observations,ocr);assert.equal(evidence.critical.find(c=>c.criterion==='exact-required-copy').status,'pass',job+' '+route);assert.deepEqual(evidence.findings,[finding]);assert.deepEqual(evidence.critical[0],unrelated);
  names.forEach((name,i)=>assert.deepEqual(fs.readFileSync(name),bytes[i]));
 }
});
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': dimension separator typography is comparison-only and never triggers focused OCR',async()=>{
 for(const observed of ['Single · 72 × 36 x 4 in','Single • 72 X 36 × 4 in','Single · 72x36x4 in']){const {record,ocr,evidence}=inspect('Single · 72 × 36 × 4 in',observed,{brand});assert.equal(evidence.critical[0].status,'pass');assert.deepEqual(evidence.findings,[]);assert.equal(await focus(record,'never.png',{width:1080,height:1080},ocr,{recognize:()=>{throw Error('Do not retry harmless dimension typography')}}),ocr);}
 for(const observed of ['Single · 72 x 36 x 5 in','Single · 72 x 36 x 4 cm','Single · 72 x 36 x 4','Single · 72 + 36 + 4 in'])assert.equal(inspect('Single · 72 × 36 × 4 in',observed,{brand}).evidence.critical[0].status,'fail');
 assert.equal(inspect('2× stronger','2x stronger',{brand}).evidence.critical[0].status,'fail');assert.equal(inspect('X model','x model',{brand}).evidence.critical[0].status,'fail');assert.equal(inspect('Single · 72 × 36 × 4 in','Single · 72 x 36 x 4 in',{brand,confidence:.4}).evidence.critical[0].status,'unknown');
});
