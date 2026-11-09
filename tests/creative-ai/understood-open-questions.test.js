'use strict';
// Live run, 9 Nov 2026 (Duroflex Posture Perfect, Purchase, performance ads): the brief reader
// asked "Which listed asset card should be used for Google display banners…" (that card is
// "Coming soon"). The read-back page counted it as a blocking need with no way to answer it, so
// "Create" stayed locked even after the formats were checked. Format questions now clear once
// the user confirms the formats; other questions can be skipped. Both brands share this model.
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../../public/creative-ai/studio-model.js');
const reading=()=>({result:{questions:[{field:'assets',question:'Which listed asset card should be used for Google display banners?'},{field:'other',question:'Should the store locator be mentioned?'},{field:'offer',question:'What is the exact offer?'}]}});
for(const brand of ['Duroflex','Sleepyhead'])test(brand+': read-back questions about formats and other details can be resolved',()=>{
 const r=reading();
 assert.deepEqual(M.openReadingQuestions(r).map(q=>q.field),['assets','other'],'only format/other questions are listed here; offer and product questions come from validation');
 M.resolveReadingQuestion(r,{formats:true});
 assert.deepEqual(M.openReadingQuestions(r).map(q=>q.field),['other'],'confirming the formats answers format questions');
 M.resolveReadingQuestion(r,{question:'Should the store locator be mentioned?'});
 assert.deepEqual(M.openReadingQuestions(r),[],'a skipped question no longer blocks Create');
 assert.deepEqual(M.openReadingQuestions(null),[]);assert.deepEqual(M.openReadingQuestions({}),[]);
});
