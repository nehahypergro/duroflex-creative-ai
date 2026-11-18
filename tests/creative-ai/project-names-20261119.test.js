'use strict';
// Regression (19 Nov 2026, live QA): the Sleepyhead RCS carousel for "Original - 3 Layered BodyIQ Orthopedic Memory Foam
// Mattress - Grey" was named "Original - · Campaign · 19 Nov": the short name kept the dash, and its numbered slots
// ("RCS card 1", "RCS card 2", "RCS card 3") were read as three formats. Failing before.
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../../public/creative-ai/studio-model.js');
test('short product names stop at a spaced dash, both brands',()=>{
 for(const [full,short] of [['Original - 3 Layered BodyIQ Orthopedic Memory Foam Mattress - Grey','Original'],['Prime - Premium 5 Zone Pocket Spring Mattress','Prime'],['Sofa Drip - 3 Seater Sofa (Fabric, Pine Green)','Sofa Drip'],['Napster Mini Mattress','Napster Mini'],['Duropedic Airboost 6.8 Arctic Ice Mattress | 1','Airboost 6.8'],['Wave Kinect Propel Arctic Ice Mattress','Wave Kinect']])
  assert.equal(M.shortProductName(full),short,full);
});
test('numbered slots of one set name one format, both brands',()=>{
 const at='2026-11-18T22:11:00Z';
 assert.equal(M.projectTitle({productSummary:{name:'Original - 3 Layered BodyIQ Orthopedic Memory Foam Mattress - Grey'},placements:[1,2,3].map(n=>({name:'RCS card '+n})),createdAt:at},{automatic:true}),'Original · RCS card · 19 Nov');
 assert.equal(M.projectTitle({productSummary:{name:'Posture Perfect Mattress'},placements:[1,2,3].map(n=>({name:'RCS card '+n})),createdAt:at},{automatic:true}),'Posture Perfect · RCS card · 19 Nov');
 assert.equal(M.projectTitle({productSummary:{name:'Posture Perfect Mattress'},placements:[{name:'Story · vertical'},{name:'WhatsApp status'}],createdAt:at},{automatic:true}),'Posture Perfect · Campaign · 19 Nov','different formats are still a campaign');
});
