'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {reviewState,downloadAssessment}=require('../../lib/creative-ai/runtime/campaigns');
function fixture(lean=true){return {status:'finished',intake:{conceptRoutes:['continuity'],...(lean?{leanWorkflowVersion:1}:{})},selection:[{id:'slide-1',description:{id:'slide-1',carousel:{id:'set'}}}],results:[{placementId:'slide-1',route:'continuity',imageUrl:'/image.png',ready:true,qualityVerified:true}]};}
test('lean carousel exports use conformance result without requiring a legacy set review',()=>{const j=fixture();assert.equal(downloadAssessment(j,j.results[0]).ready,true);j.results[0].qualityVerified=false;assert.equal(downloadAssessment(j,j.results[0]).ready,false);});
test('legacy carousel retains its saved whole-set gate',()=>{const j=fixture(false);assert.equal(downloadAssessment(j,j.results[0]).ready,false);j.carousels=[{route:'continuity',carouselId:'set',ready:true}];assert.equal(downloadAssessment(j,j.results[0]).ready,true);});
test('campaign totals respect the saved option count',()=>{const j=fixture(false);j.selection[0].description.carousel=null;assert.deepEqual(reviewState(j),{total:1,ready:1,images:1,passed:true});j.intake.conceptRoutes.push('exploration');assert.equal(reviewState(j).passed,false);assert.equal(reviewState(j).total,2);});
