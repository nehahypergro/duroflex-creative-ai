'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
test('correction prompt losslessly interns repeated escaped rules without touching literal copy',()=>{
 const {prepare}=require('../../lib/creative-ai/runtime/image-prompt');
 const rule='Keep the selected SKU’s exact markings.\nPreserve "Night" and all qualifiers. '.repeat(65);
 const prompt='Locked brand execution rules: '+JSON.stringify([{id:'r',text:rule,value:rule}])+'\nComposition: '+JSON.stringify({instruction:rule,other:rule})+'\nRevision: '+JSON.stringify({instruction:rule,observed:rule})+'\nExact embedded text: '+JSON.stringify([{exactText:'Night',position:'left'}])+'\n'+'Keep independent constraints. '.repeat(200);
 const out=prepare(prompt);assert.ok(out.wireCharacters<=32000);assert.match(out.text,/Exact embedded text: \[{"exactText":"Night","position":"left"}\]/);assert.ok(out.text.includes(JSON.stringify(rule).slice(1,-1)));assert.match(out.text,/Keep independent constraints/);
});
test('every locked rule is assessed; campaign-only rules do not become unavailable brandbook checks',()=>{
 const rules=require('../../lib/creative-ai/runtime/locked-rule-review');
 const record={lockedRules:[{id:'brief',text:'No overlay on this photo',sourceIds:['user-brief']}]};
 const evidence={critical:[]};rules.apply(record,evidence,[{ruleId:'brief',status:'pass',confidence:.94,observation:'No overlay present',location:'whole image'}]);
 assert.equal(evidence.critical[0].status,'pass');assert.deepEqual(evidence.critical[0].evidence.ruleIds,['brief']);
 assert.throws(()=>rules.apply(record,{critical:[]},[]),/every locked rule/);
 const failed={critical:[]};rules.apply(record,failed,[{ruleId:'brief',status:'fail',confidence:.94,observation:'Added headline',location:'top'}]);assert.equal(failed.critical[0].status,'fail');
 const unknown={critical:[]};rules.apply(record,unknown,[{ruleId:'brief',status:'unknown',confidence:.3,observation:'Image unclear',location:'whole'}]);assert.equal(unknown.critical[0].status,'unknown');
});
test('whole-pack evidence uses selected variant and accepted source facts, scoped to its brand',()=>{
 const {sourceEvidence}=require('../../lib/creative-ai/runtime/pdp-review');
 const job={intake:{brandId:'brand-a',productReferencePolicy:{brandId:'brand-a',variantId:'queen',sku:'QUEEN'}},productReferencePolicy:{brandId:'brand-a',variantId:'queen',sku:'QUEEN'}};
 const research={facts:[{id:'f1',status:'supported',text:'78 × 60 × 8 in',sourceIds:['source']}],dossier:{sources:[{id:'source',url:'https://example.test/item'}]},productBriefEvidence:{sku:'DEFAULT',selectedVariantProvenance:{sku:'QUEEN',variantId:'queen'},websiteCertificationApproval:{brandId:'brand-a',status:'client-approved'}}};
 const evidence=sourceEvidence(job,research);assert.equal(evidence.selectedVariant.sku,'QUEEN');assert.equal(evidence.facts[0].text,'78 × 60 × 8 in');assert.equal(evidence.sources[0].id,'source');
 research.productBriefEvidence.websiteCertificationApproval.brandId='brand-b';assert.throws(()=>sourceEvidence(job,research),/brand/);
});
test('PDP slot intent survives scoping without exposing siblings as current work',()=>{
 const {slotContext}=require('../../lib/creative-ai/runtime/pdp-quality');
 const slot={placementId:'p1',role:'dimensions',buyerQuestion:'Will it fit?',dimensionAnnotations:[{axis:'length',label:'78 in',proofFactId:'f1'}],visualEvidenceIds:['selected'],proofFactIds:['f1']};
 const c=slotContext({sets:[{conceptId:'c',slots:[slot,{placementId:'p2',role:'care'}]}]},'c','p1');assert.equal(c.current.role,'dimensions');assert.equal(c.current.dimensionAnnotations[0].label,'78 in');assert.match(c.instructions,/physical edges/);assert.equal(c.gallery.length,2);
});
test('reconciliation can replace a conflicting product reference from the resolved catalog',()=>{
 const art=require('../../lib/creative-ai/art-director');
 const wire=require('../../lib/creative-ai/runtime/reconciliation-patch').wire({expected:{specifications:[]},artInput:{assets:[],directorInput:{strategyInput:{research:{sources:[]},additionalSources:[],facts:[],guardian:{preferences:[]}},strategy:{}},directorOutput:{concepts:[]},referenceSources:[]},ctx:{lockedRules:[],placements:[],knowledge:{}},copyFit:[],eligibleBrandGuidelineRules:[],visualFields:['scene','references','product','logo']});
 const allowed=wire.schema.properties.adjustments.items.properties.changes.items.anyOf.map(b=>b.properties.field.const);assert.ok(allowed.includes('references'));assert.ok(allowed.includes('product'));assert.ok(!allowed.includes('logo'));
});
test('reference replacement is still rejected when it invents an asset or loses the product role',async()=>{
 const art=require('../../lib/creative-ai/art-director'),fixture=require('../../lib/creative-ai/art-director/examples/synthetic'),input=await fixture.inputExample(),ctx=await art.assembleContext(input),core=fixture.coreExample(ctx);
 const s=core.specifications[0];s.product.assetIds=[s.references[0].assetId];s.references[0].roles.push('product');
 const foreign=structuredClone(core);foreign.specifications[0].product.assetIds=['unresolved-foreign-product'];foreign.specifications[0].references.push({assetId:'unresolved-foreign-product',roles:['product'],instruction:'Wrong source'});assert.ok(art.validateCore(foreign,ctx).length);
 const missingRole=structuredClone(core);missingRole.specifications[0].references=missingRole.specifications[0].references.filter(r=>!s.product.assetIds.includes(r.assetId));assert.ok(art.validateCore(missingRole,ctx).some(e=>/role|reference/i.test(e)));
 assert.deepEqual(art.validateCore(core,ctx),[]);
});
