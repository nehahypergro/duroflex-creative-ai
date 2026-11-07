'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../../lib/creative-ai/experiments/lean-planner/index.html'),'utf8');
const source=html.slice(html.indexOf('function runStatus('),html.indexOf('async function refresh()'));
const status=vm.runInNewContext(source+';runStatus');
const clear={status:'completed',report:{conclusion:'no_mismatch'}};
const fixture=(page={})=>({status:'completed',visualReviewPolicy:1,correctionPolicy:1,models:[{pages:[{status:'completed',...page}]}]});
test('saved images are not overall complete until review finishes',()=>{
 for(const review of [undefined,{status:'pending'},{status:'checking'}])assert.match(status(fixture({visualReview:review})),/pending/);
 assert.equal(status(fixture({visualReview:clear})),'Completed');
});
test('failed or inconclusive checks remain unresolved',()=>{
 for(const review of [{status:'verification_problem'},{status:'completed',report:{conclusion:'clear_mismatch'}},{status:'completed',report:{conclusion:'unable_to_verify'}}])assert.match(status(fixture({visualReview:review})),/unresolved/);
});
test('correction completion requires the selected candidate check',()=>{
 assert.match(status(fixture({visualReview:clear,correction:{status:'checking'}})),/pending/);
 assert.match(status(fixture({visualReview:clear,correction:{status:'not_selected'}})),/unresolved/);
 assert.equal(status(fixture({visualReview:{status:'completed',report:{conclusion:'clear_mismatch'}},correction:{status:'selected',candidateReview:clear}})),'Completed');
});
test('partial generation and finishing errors cannot appear complete',()=>{
 assert.match(status({...fixture({visualReview:clear}),status:'partial'}),/unresolved/);
 assert.match(status({...fixture({visualReview:clear}),finishing:{errors:[{message:'interrupted'}]}}),/unresolved/);
});
test('legacy image-only and active runs retain their own status',()=>{
 assert.equal(status({status:'completed'}),'completed');
 assert.equal(status({...fixture(),status:'running'}),'running');
});
