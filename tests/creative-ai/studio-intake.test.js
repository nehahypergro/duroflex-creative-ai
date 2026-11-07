'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../../public/creative-ai/studio-model');
test('intake keeps optional audience choices optional and requires commercial facts only for relevant assets',()=>{
const d=M.startDraft('brand','quick',1);Object.assign(d,{intakeVersion:1,name:'Launch',brief:'Show the product',focus:'brand',creativeCount:1});
assert.equal(M.intakeProgress(d).percent,100);assert.equal(M.creativeCount({...d,creativeCount:undefined}),2);
for(const n of [0,2,3,'NaN']){assert.equal(M.creativeCount({...d,creativeCount:n}),2);assert.equal(M.validateBrief({...d,creativeCount:n}).creativeCount,undefined);}
d.outputs=[M.output(3)];const errors=M.validateBrief(d);for(const k of M.requiredAssetFields(d.outputs[0],d))assert.ok(errors['static-'+d.outputs[0].id+'-'+k]);
const a=M.output(6);M.applyAmazonPreset(a,'Amazon Brand Story');d.outputs=[a];assert.equal(M.intakeProgress(d).percent,100);
});
test('RTBs stay bound to selected product and preserve literal user text without importing external service state',()=>{
const p={features:['Keeps its shape','Washable cover']},d={focus:'product',productId:'p',rtbProductId:'p',selectedRtbs:['Keeps its shape','invented'],rtbs:'Supplied <literal> & qualifiers',markets:'India',themes:['Functional']};
assert.match(M.intakeContext(d,p),/Keeps its shape/);assert.doesNotMatch(M.intakeContext(d,p),/invented/);assert.match(M.intakeContext(d,p),/<literal>/);assert.doesNotMatch(M.intakeContext({...d,productId:'other'},p),/Keeps its shape/);
});
test('incomplete asset facts do not block the saved planning preview, but remain required for generation',()=>{const d=M.startDraft('brand','quick',3);Object.assign(d,{intakeVersion:1,name:'Offer',brief:'Plan an offer',focus:'brand'});assert.ok(Object.keys(M.validateBrief(d)).some(k=>k.startsWith('static-')));assert.deepEqual(M.validateBrief(d,{purpose:'preview'}),{});});

test('current briefs require a supported objective before review while drafts can be saved',()=>{const d={...M.startDraft('brand','quick',1),intakeVersion:2,focus:'brand',brief:'A product post'};for(const objective of ['',undefined,'invalid'])assert.ok(M.validateBrief({...d,objective},{purpose:'review'}).objective);assert.equal(M.validateBrief(d,{purpose:'review'}).objective,undefined);assert.equal(M.validateBrief({...d,objective:''},{purpose:'preview'}).objective,undefined);});
