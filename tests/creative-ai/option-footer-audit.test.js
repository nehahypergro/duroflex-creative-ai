'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),campaign=require('../../lib/creative-ai/runtime/campaign-input');
const footer=count=>'Audience is defined by this brief, not verified consumer research. Use saved official product identity and approved brand assets. Do not ask again for identity or website freshness. Do not invent offers, prices or stronger product claims. Produce '+(count===1?'one option':'two distinct options')+' of the complete ordered asset set. Each option must include every listed item in order, at that item’s own specified dimensions.';
for(const brandId of ['Duroflex','Sleepyhead'])test(brandId+': generated delivery count follows the mandatory single-set policy before model work',()=>{
 const intake={brandId,conceptRoutes:['continuity'],brief:'Produce one complete set in the continuity direction (Option 1 only). Do not plan or generate Option 2.\n\n'+footer(2)},before=JSON.stringify(intake);
 assert.match(campaign.normalize(intake).brief,/Produce one option/);assert.equal(JSON.stringify(intake),before);
 assert.doesNotThrow(()=>campaign.normalize({...intake,brief:'One complete continuity set.\n\n'+footer(1)}));
 assert.doesNotThrow(()=>campaign.normalize({...intake,conceptRoutes:['continuity','exploration'],brief:footer(2)}));
 assert.deepEqual(campaign.normalize({...intake,conceptRoutes:['continuity','exploration'],brief:footer(1)}).conceptRoutes,['continuity']);
 // Genuine client wording, quoted examples and legacy defaults are not rewritten or inferred.
 assert.equal(campaign.normalize({brief:'Show two distinct options for firmness.'}).brief,'Show two distinct options for firmness.');
 assert.doesNotThrow(()=>campaign.normalize({brief:footer(2)}));
});
