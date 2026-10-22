'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {detectBriefProduct}=require('../../lib/creative-ai/runtime/product-input');
function replay(output){return {reason:async request=>{request.validate(output);return output;}};}
for(const brand of ['Duroflex','Sleepyhead']){
 test(brand+' brand greeting accepts the recorded no-product response',async()=>{
  const output={requiresProductPage:false,productName:'',reason:'The brief requests a generic brand Diwali greeting, not a specific product.'};
  const actual=await detectBriefProduct({brief:'Create a generic '+brand+' Happy Diwali greeting.'},brand,replay(output),{});
  assert.deepEqual(actual,output);
 });
 test(brand+' named product still requires exact brief provenance',async()=>{
  const output={requiresProductPage:true,productName:'Example Mattress',reason:'Named product requested.'};
  assert.equal((await detectBriefProduct({brief:'Feature Example Mattress.'},brand,replay(output),{})).requiresProductPage,true);
  await assert.rejects(detectBriefProduct({brief:'Generic greeting.'},brand,replay(output),{}),/must occur/);
 });
}
