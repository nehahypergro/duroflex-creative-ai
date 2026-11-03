'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const local=require('../../lib/creative-ai/runtime/deterministic-preflight');
const {prepare}=require('../../lib/creative-ai/runtime/image-prompt');
const {OpenAIProvider}=require('./offline-provider.cjs');
for(const brand of ['duroflex','sleepyhead'])test(brand+': duplicate references repair once without changing pixels or identity',async()=>{
 const row={id:brand+'-sku',imageData:'data:image/png;base64,AAAA',role:'exact SKU'};
 const reports=[];const out=await local.images([row,{...row}],{record:r=>reports.push(r)});
 assert.deepEqual(out.value,[row]);assert.equal(out.value[0],row);assert.equal(reports.length,1);assert.equal(out.report.repaired,true);assert.deepEqual(out.report.attempts.map(a=>a.status),['failed','passed']);
 await assert.rejects(local.images([row,{...row,imageData:'other pixels'}]),{code:'REFERENCE_ID_CONFLICT'});
});
test('local repair is bounded and changed inputs must pass validation',async()=>{
 let repairs=0,checks=0;
 await assert.rejects(local.run({stage:'fixture',value:1,check:()=>{checks++;throw Error('invalid');},repair:v=>{repairs++;return v+1;}}),e=>e.deterministicPreflight.attempts.length===2);
 assert.equal(checks,2);assert.equal(repairs,1);
 checks=0;await assert.rejects(local.run({stage:'fixture',value:undefined,check:()=>{checks++;throw Error('missing');},repair:v=>v}));assert.equal(checks,1);
});
test('diagnostic write errors do not cause a repair',async()=>{
 let repairs=0;await assert.rejects(local.run({stage:'fixture',value:1,check:()=>{},repair:()=>repairs++,record:()=>{throw Error('disk');}}),/disk/);assert.equal(repairs,0);
});
test('prompt repair uses exactly the existing lossless compiler output',async()=>{
 const rule='Keep the exact SKU shape, colour and physical construction. '.repeat(30);
 const prompt='Locked brand execution rules: '+JSON.stringify([{id:'r1',text:rule,value:rule}])+'\n'+Array(30).fill('Reading order: '+rule).join('\n');
 const expected=prepare(prompt),out=await local.prompt(prompt);
 assert.deepEqual(out.compiled,expected);assert.equal(out.report.repaired,true);assert.equal(out.report.attempts.length,2);
 assert.deepEqual((await local.prompt('Exact embedded text: Keep Me')).compiled,prepare('Exact embedded text: Keep Me'));
});
test('unrepairable prompt preserves diagnostics and makes no paid reservation',async()=>{
 let reserved=0;const reports=[];
 await assert.rejects(new OpenAIProvider({imageTimeoutMs:1000}).generate({prompt:'x'.repeat(32001),attachments:[],requestKey:'fixture'}, {reserve:()=>reserved++,deterministicPreflight:r=>reports.push(r)}),e=>e.code==='IMAGE_PROMPT_LIMIT'&&!!e.promptBudget&&e.deterministicPreflight.status==='blocked');
 assert.equal(reserved,0);assert.equal(reports.at(-1).status,'blocked');
});
test('distinct references are never discarded to meet capacity',async()=>{
 await assert.rejects(local.images(Array.from({length:9},(_,i)=>({id:String(i)}))),{code:'REFERENCE_CAPACITY'});
});
