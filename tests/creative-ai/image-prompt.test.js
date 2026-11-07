'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{compact,prepare}=require('../../lib/creative-ai/runtime/image-prompt'),{OpenAIProvider}=require('./offline-provider.cjs');
test('image prompt deduplication preserves every rule and exact copy, including nonduplicate values',()=>{
 const prompt='Rules: '+JSON.stringify([{id:'r',text:'Exact requirement.',value:'Exact requirement.',sourceIds:['source']},{text:'One',value:'Different'}])+'\nExact copy: "Explore Bubbles."\nUnparsed { prose';
 const out=compact(prompt),rules=JSON.parse(out.split('\n')[0].slice(7));assert.deepEqual(rules,[{id:'r',text:'Exact requirement.',sourceIds:['source']},{text:'One',value:'Different'}]);assert.match(out,/Exact copy: "Explore Bubbles\."/);assert.match(out,/Unparsed \{ prose/);
});
test('an oversized image prompt fails before budget reservation or paid dispatch',async()=>{
 let calls=0,reserved=0;const prior=global.fetch;global.fetch=async()=>{calls++;throw Error('No dispatch allowed');};try{await assert.rejects(()=>new OpenAIProvider({imageTimeoutMs:1000}).generate({prompt:'x'.repeat(32001),attachments:[],requestKey:'fixture'},{reserve:async()=>reserved++}),e=>e.code==='IMAGE_PROMPT_LIMIT');assert.equal(calls,0);assert.equal(reserved,0);assert.equal(prepare('x'.repeat(32000)).wireCharacters,32000);}finally{global.fetch=prior;}
});
test('render projection retains complete authoritative rules and exact copy while referencing repeated instructions',()=>{
 const rule='Keep all product colours, geometry and brand marks recognisable. Use coherent side-window light and physically supported anatomy. '.repeat(25);
 const locked='Locked brand execution rules: '+JSON.stringify([{id:'r1',text:rule,value:rule,sourceIds:['brand-source']}]);
 const exact='Exact embedded text: '+JSON.stringify([{text:rule,value:rule}]);
 const prompt=locked+'\n'+exact+'\n'+Array(12).fill('Reading order: '+rule).join('\n')+'\nScope: '+JSON.stringify({brandId:'brand-a',sourceIds:['audit-only'],instruction:'No invented copy.'});
 const out=prepare(prompt);assert.ok(out.wireCharacters<=32000);assert.equal(JSON.parse(out.text.split('\n')[0].slice('Locked brand execution rules: '.length))[0].text,rule);
 assert.equal(out.text.split('\n')[1],'Exact embedded text: '+JSON.stringify([{text:rule}]));assert.match(out.text,/Apply locked rule r1 above\./);assert.match(out.text,/"brandId":"brand-a"/);assert.match(out.text,/No invented copy\./);assert.doesNotMatch(out.text,/audit-only/);
});
test('composed-artwork Brand locked rules share repeated checks without touching exact typography',()=>{
 const {renderProjection}=require('../../lib/creative-ai/runtime/image-prompt');const rule='Preserve the exact product silhouette, correct colour variant, genuine markings and required claim qualifiers.';
 const exact='Exact campaign wording and typography: '+JSON.stringify([{text:rule,font:'Approved'}]);const source='Brand locked rules: '+JSON.stringify([{id:'sku-rule',text:rule}])+'\n'+exact+'\nFinal art direction: '+JSON.stringify({checkCriteria:['Required product check: '+rule],scene:'Simple room'});
 const out=renderProjection(source);assert.equal(out.split('\n')[1],exact);assert.match(out.split('\n')[0],/Preserve the exact product/);assert.match(out.split('\n')[2],/Apply locked rule sku-rule above/);assert.equal(JSON.parse(out.split('\n')[2].slice('Final art direction: '.length)).scene,'Simple room');
});

test('render fact projection preserves wording, qualifiers and uncertain evidence status',()=>{
 const {renderProjection}=require('../../lib/creative-ai/runtime/image-prompt');
 const out=renderProjection('Source-backed product facts: '+JSON.stringify([{id:'campaign-production-assets',text:'registry audit'},{id:'product',text:'Three years conditional warranty.',status:'supported',sourceIds:['audit']},{id:'uncertain',text:'Unverified claim',status:'unknown'}]));
 assert.deepEqual(JSON.parse(out.slice('Source-backed product facts: '.length)),[{text:'Three years conditional warranty.'},{text:'Unverified claim',status:'unknown'}]);
});
