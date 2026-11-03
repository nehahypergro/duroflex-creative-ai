'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const input=require('../../lib/creative-ai/runtime/campaign-input');
const model=require('../../public/creative-ai/studio-model');
for(const brandId of ['duroflex','sleepyhead'])test(brandId+': new campaigns always select one complete set',()=>{
 for(const creativeCount of [undefined,1,2])assert.equal(model.creativeCount({creativeCount}),1);
 const original={brandId,conceptRoutes:['continuity','exploration'],brief:'Campaign\nAudience is defined by this brief, not verified consumer research. Produce two distinct options of the complete ordered asset set.'};
 const result=input.normalize(original);
 assert.deepEqual(result.conceptRoutes,['continuity']);
 assert.match(result.brief,/Produce one option of the complete ordered asset set/);
 assert.equal(original.conceptRoutes.length,2);
 assert.match(original.brief,/two distinct options/);
 const windows={...original,brief:'Client wording\r\n'+original.brief.split('\n').at(-1)+'\r\n  '};
 assert.match(input.normalize(windows).brief,/Client wording\r\nAudience/);
 assert.match(input.normalize(windows).brief,/Produce one option/);
 const quoted=original.brief+'\nThis footer is a quoted example only.';
 assert.equal(input.normalize({...original,brief:quoted}).brief,quoted);
});
