'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../../lib/creative-ai/runtime/layout-text-metrics');
const font={unitsPerEm:1000,layout:t=>({positions:[...t].map(()=>({xAdvance:400}))})};
const plan=height=>({contractVersion:2,text:[{fieldId:'cta',fontId:'f',fontSize:.065,width:.5,height,maxLines:1,lineHeight:1.2,buttonBackground:null,buttonPadding:0}]});
const spec={text:[{fieldId:'cta',exactText:'Explore Drip Pro'}]},metrics={canvas:{width:1200,height:627},fonts:new Map([['f',font]])};
test('subpixel planning height rounding agrees with the 1px final guide tolerance',()=>{const p=plan(.14),before=JSON.stringify(p);assert.doesNotThrow(()=>M.validate(p,spec,metrics));assert.equal(JSON.stringify(p),before);});
test('meaningful overflow still fails without reducing type or changing copy',()=>{assert.throws(()=>M.validate(plan(.13),spec,metrics),/Typography planning fit failed/);const p=plan(.14);p.text[0].width=.1;assert.throws(()=>M.validate(p,spec,metrics),/Typography planning fit failed/);});
