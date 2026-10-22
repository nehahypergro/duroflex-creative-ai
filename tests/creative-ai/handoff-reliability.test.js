'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {decodeHtmlOnce}=require('../../lib/creative-ai/runtime/text-boundary');
test('HTML intake decodes one layer only, handles Unicode and preserves invalid entities',()=>{
 assert.equal(decodeHtmlOnce('&amp;quot; &quot; &amp;#39; &#x1f642; &#xD800; &#999999999; &times;'), '&quot; " &#39; 🙂 &#xD800; &#999999999; ×');
 const {parsePage}=require('../../lib/creative-ai/runtime/research');
 const page=parsePage('<a href="/products/tatva?variant=41734983516292&amp;ref=नया">Tatva — आराम</a>','https://www.duroflexworld.com');
 assert.equal(new URL(page.links[0].url).searchParams.get('variant'),'41734983516292');assert.equal(new URL(page.links[0].url).searchParams.get('ref'),'नया');
 assert.equal(page.links[0].label,'Tatva — आराम');
});
test('copy comparison preserves semantic Unicode distinctions and ambiguous I/l',()=>{
 const {normalize}=require('../../lib/creative-ai/runtime/copy-checks');
 assert.equal(normalize('Café'),normalize('Cafe\u0301'));assert.equal(normalize('नया\u00a0घर'),normalize('नया घर'));
 for(const [a,b]of [['LiveIn','Liveln'],['10 m²','10 m2'],['Sale—now','Sale-now'],['Sofa™','SofaTM'],['Ａ','A']])assert.notEqual(normalize(a),normalize(b));
 const raw='“आराम” — '+('Tatva🙂 '.repeat(200));assert.equal(JSON.parse(JSON.stringify({text:raw})).text,raw);
});
test('authority labels distinguish explicit brief, facts, proposals and unknowns without inventing creative restrictions',()=>{
 const {compile,instructions}=require('../../lib/creative-ai/runtime/handoff-authority');
 const input={assignment:{goal:'Introduce this product',audience:'First-home buyers',desiredAction:'Explore'},guardian:{requirements:[{id:'logo'}],preferences:[{id:'daylight'}]},facts:[{id:'material',status:'supported',sourceIds:['page']},{id:'health',status:'unverified',sourceIds:['page']},{id:'missing',status:'supported',sourceIds:[]}],assumptions:[{id:'people'}]};
 const before=JSON.stringify(input),records=compile(input).records;
 const authority=path=>records.find(r=>r.path===path)?.authority;
 assert.equal(authority('assignment.audience'),'required');assert.equal(authority('guardian.requirements[logo]'),'required');assert.equal(authority('guardian.preferences[daylight]'),'proposed');assert.equal(authority('facts[material]'),'sourced');assert.equal(authority('facts[health]'),'unknown');assert.equal(authority('facts[missing]'),'unknown');assert.equal(authority('assumptions[people]'),'proposed');assert.match(instructions,/does not prohibit people/);assert.equal(JSON.stringify(input),before);
});
test('native destination URL is code-owned, not rewritten by the copywriter',()=>{
 const {wire}=require('../../lib/creative-ai/runtime/copy-wire');
 const url='https://www.duroflexworld.com/products/tatva?variant=41734983516292&ref=web';
 const input={concepts:[{conceptId:'c'}],placements:[{id:'web',expanded:{profile:{nativeFields:[{id:'destinationUrl'}]}}}],strategy:{strategyChecks:{destination:{url}}}};
 const w=wire(input,'Copy'),field={target:'native:destinationUrl',role:'other',proofFactIds:[],locked:true,requirement:'mandatory'},out={units:{unit0:{fields:[field]}},rationale:'Link to the exact variant.',unknowns:[]};
 assert.equal(w.decode(out).decks[0].fields[0].text,url);
 field.text='https://www.duroflexworld.com/products/other';assert.throws(()=>w.decode(out));delete field.text;
 field.target='native:foreign';assert.throws(()=>w.decode(out));
});
test('unexpected provider fields fail visibly rather than being silently discarded',()=>{
 const {bindConstants}=require('./offline-provider.cjs');
 assert.throws(()=>bindConstants({known:'ok',mandatoryClaim:'unsupported'},{type:'object',properties:{known:{type:'string'}},additionalProperties:false}),/Contract drift.*mandatoryClaim/);
});
test('explicit desired action and variant URL bypass model authorship and reach the validated strategy',async()=>{
 const fixture=require('../../lib/creative-ai/marketing-strategist/examples/synthetic'),input=await fixture.inputExample();
 input.assignment.desiredAction='Explore the exact variant';input.assignment.landingPageUrl='https://example.com/products/tatva?variant=41734983516292&ref=banner';
 input.additionalSources.push({id:'user-brief',kind:'user',label:'Brief',reference:'User input',status:'available',collectedAt:'2026-10-13T00:00:00Z'});
 let request;const stop=Error('capture');await assert.rejects(()=>require('../../lib/creative-ai/runtime/agents').strategist(input,{reason:async r=>{request=r;throw stop;}},{}),e=>e===stop);
 assert.equal(request.wire.schema.properties.brief.properties.desiredAction,undefined);assert.equal(request.wire.schema.properties.strategyChecks.properties.destination.properties.url,undefined);
 const raw=fixture.outputExample({includeStrategyChecks:true});for(const key of ['audience','buyingSituation'])delete raw.brief[key].basis;for(const key of ['customerBarrier','customerRelevance'])delete raw.strategyChecks[key].basis;delete raw.getWhoToBy;delete raw.sourceIds;delete raw.brief.positioningFactIds;delete raw.brief.desiredAction;delete raw.strategyChecks.destination.expectedAction;delete raw.strategyChecks.destination.url;
 for(const key of ['audience','buyingSituation']){if(input.assignment[key])delete raw.brief[key];else{delete raw.brief[key].sourceIds;delete raw.brief[key].factIds;}}
 raw.brief.supportingClaims=raw.brief.supportingClaims.map(c=>c.factId);
 const decoded=request.wire.decode(require('../../lib/creative-ai/runtime/strategy-choice').fromRecorded(raw));request.validate(decoded);
 assert.equal(decoded.brief.desiredAction.text,input.assignment.desiredAction);assert.equal(decoded.brief.desiredAction.basis,'brief');assert.equal(decoded.getWhoToBy.to.basis,'brief');assert.equal(decoded.strategyChecks.destination.url,input.assignment.landingPageUrl);
});
test('reconciliation accepts typed nested data and preserves identity and locked Unicode copy',async()=>{
 const fixture=await require('../../lib/creative-ai/graphic-designer/examples/synthetic').inputExample(),art=require('../../lib/creative-ai/art-director');
 const ctx=await art.assembleContext(fixture.artInput),expected={specifications:structuredClone(fixture.artOutput.specifications)};
 expected.specifications[0].text[0].exactText='“LiveIn” — आराम × ²';
 const w=require('../../lib/creative-ai/runtime/reconciliation-patch').wire({expected,artInput:fixture.artInput,ctx,copyFit:[],eligibleBrandGuidelineRules:[],visualFields:['crop','rationale','product','logo']});
 const out={adjustments:expected.specifications.map(s=>({conceptId:s.conceptId,placementId:s.placementId,status:s.status,dependencies:s.dependencies,reconciliation:s.reconciliation,text:s.text.filter(f=>f.delivery!=='native').map(({fieldId,position,font,sizeDirection,contrastDirection})=>({fieldId,position,font,sizeDirection,contrastDirection})),changes:[]}))};
 const crop=structuredClone(expected.specifications[0].crop);out.adjustments[0].changes=[{field:'crop',value:crop}];
 assert.deepEqual(w.decode(out),expected);assert.deepEqual(out.adjustments[0].changes[0].value,crop);
 const bad=structuredClone(out);bad.adjustments[0].changes[0]={field:'crop',valueJson:JSON.stringify(crop)};assert.throws(()=>w.decode(bad));
 const duplicate=structuredClone(out);duplicate.adjustments[0].changes.push(duplicate.adjustments[0].changes[0]);assert.throws(()=>w.decode(duplicate),/duplicate reconciliation field/);
 const tampered=structuredClone(out);tampered.adjustments[0].text[0].exactText='Changed';assert.throws(()=>w.decode(tampered));
});
