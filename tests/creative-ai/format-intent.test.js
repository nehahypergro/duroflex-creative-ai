'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const intent=require('../../lib/creative-ai/runtime/format-intent');
const selection=(id,name,extra={})=>({id,description:{name,...extra},jobInputs:{}});
test('new planning distinguishes independent retail assets from ordered sets without prescribing a palette',()=>{
 const items=[selection('poster','Store poster'),selection('flyer','Flyer'),selection('a','Brochure face 1',{printSet:{id:'brochure',index:1,count:2}}),selection('b','Brochure face 2',{printSet:{id:'brochure',index:2,count:2}})];
 const out=intent.describe(items);
 assert.notEqual(out[0].familyId,out[1].familyId);assert.equal(out[2].familyId,out[3].familyId);
 assert.notEqual(out[0].purpose,out[1].purpose);assert.equal(out[2].relationship,'coordinated-set');
 const text=intent.guidance(items);assert.match(text,/locked wording/);assert.match(text,/not a shared room/);assert.doesNotMatch(text,/blue-green|Honey|Poppins|warm daylight/);
});
test('legacy strategy is untouched; new strategy constraints preserve supplied content and bind every placement',()=>{
 const si={assignment:{formats:[{id:'p',constraints:['Exact supplied terms']}]}},s=[selection('p','Push image')];
 assert.equal(intent.apply(si,{},s),si);
 const out=intent.apply(si,{formatIntentVersion:1},s);assert.equal(out.assignment.formats[0].constraints[0],'Exact supplied terms');assert.match(out.assignment.formats[0].constraints.join('\n'),/Push image/);assert.deepEqual(si.assignment.formats[0].constraints,['Exact supplied terms']);
});

test('long current asset requirements fit schema without silently dropping words',()=>{
 const s=selection('p','Flyer');s.jobInputs.formatIntent={familyId:'flyer',relationship:'independent',direction:'Direction '.repeat(600),exactCopy:{headline:'Exact '.repeat(1000)}};
 const out=intent.apply({assignment:{formats:[{id:'p',constraints:[]}]}},{formatIntentVersion:1},[s]);
 const c=out.assignment.formats[0].constraints;assert.ok(c.every(x=>x.length<=2000));
 assert.equal(c.filter(x=>x.startsWith('Current asset brief')).map(x=>x.replace(/^.*?\): /,'')).join(''),s.jobInputs.formatIntent.direction);
 assert.equal(JSON.parse(c.filter(x=>x.startsWith('Current exact copy')).map(x=>x.replace(/^.*?\): /,'')).join('')).headline,s.jobInputs.formatIntent.exactCopy.headline);
});
