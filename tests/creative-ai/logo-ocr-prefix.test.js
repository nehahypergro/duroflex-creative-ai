'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),Q=require('../../lib/creative-ai/runtime/composed-quality');
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': a single OCR logo-symbol digit is removable only in the reserved campaign region',()=>{
 const doc={canvas:{width:1088,height:2560},objects:[{role:'logo',left:841.61,top:89.6,width:185.81,height:30.054}],protectedRegions:[{left:400,top:1600,width:550,height:300}]};
 const row={text:'9 '+brand.toUpperCase(),confidence:1,box:{x:.6933259444,y:.04147368435,width:.2426034763,height:.02029791176}};
 const boxes=Q.logos([row],doc,brand,{symbolPrefix:true});assert.equal(boxes.length,1,'Saved standee OCR row must be included in the mask');
 assert.equal(Q.logos([row],doc,brand).length,0,'Historical mask construction stays pinned');
 const physical={...row,box:{x:.5,y:.68,width:.15,height:.02}};assert.equal(Q.logos([physical],doc,brand,{symbolPrefix:true}).length,0);
 for(const text of ['9 years '+brand,'9 '+brand+' sale','OtherBrand','19 '+brand])assert.equal(Q.logos([{...row,text}],doc,brand,{symbolPrefix:true}).length,0,'Never erase arbitrary nearby copy: '+text);
 assert.equal(Q.logos([{...row,confidence:.4}],doc,brand,{symbolPrefix:true}).length,0);
 assert.throws(()=>Q.logos([{...row,box:{x:.1,y:.3,width:.2,height:.03}}],doc,brand,{symbolPrefix:true}),/ambiguous/);
});
