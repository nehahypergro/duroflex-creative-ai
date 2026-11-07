'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {validateCitations}=require('../../lib/creative-ai/experiments/lean-planner/planning');
const product={id:'product-1',name:'Airboost 6.8 Arctic Ice',variant:{id:'51476984692868',name:'Queen / 78 x 60 (198 cm x 152 cm) / 8 (20.3 cm)',options:['Queen','78 x 60 (198 cm x 152 cm)','8 (20.3 cm)']},facts:[{id:'sku-fact-6'}]};
const check=(text,id='51476984692868')=>validateCitations([{role:'variant',text,factIds:[id]}],product);
test('saved brochure identity and specification citations validate',()=>{check('Airboost 6.8\nArctic Ice');check('Queen • 78 × 60 inches • 8 inches thick');check('Airboost 6.8 Arctic Ice\nQueen\n78 × 60 inches (198 × 152 cm)\n8 inches (20.3 cm) thick');});
test('foreign identity, altered dimensions and unsupported benefits remain blocked',()=>{assert.throws(()=>check('Queen','another-variant'),/Unknown/);assert.throws(()=>check('Queen 72 x 60 inches'),/does not support/);assert.throws(()=>check('Airboost cures back pain'),/does not support/);});
