'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../../public/creative-ai/studio-model'),placements=require('../../lib/creative-ai/runtime/placements');
const variants=[[1,'portrait',1080,1350],[1,'feed-landscape',1200,628],[13,'square',1200,1200],[13,'portrait',720,900],[13,'square',1080,1080],[13,'portrait',1080,1350],[7,'custom',1920,700],[7,'portrait',1080,1350],[1,'square',1080,1080],[8,'story',1080,1920],[7,'banner',1920,640]];
for(const brand of ['duroflex','sleepyhead'])for(const [featureId,formatId,width,height] of variants)test(`${brand} route ${featureId} ${width}x${height}`,()=>{
 const d={brandId:brand,focus:'product',outputs:[{...M.output(featureId),formatId,width,height,slides:1}]},before=JSON.stringify(d),p=M.generationProfile(d);assert.ok(p,'supported client variant must have a route');
 const s=placements.resolve({brandUrl:'https://example.com',brief:'Synthetic route validation',placementIds:p.placementIds||[p.placementId],...(p.customProfiles?{customProfiles:p.customProfiles}:{})}).selections;
 assert.equal(s.length,1);assert.equal(s[0].description.dimensions.width,width);assert.equal(s[0].description.dimensions.height,height);assert.equal(JSON.stringify(d),before);
 assert.equal(M.generationProfile({...d,outputs:[{...d.outputs[0],width:width+1}]}),null,'dimensions must never silently substitute');
});
