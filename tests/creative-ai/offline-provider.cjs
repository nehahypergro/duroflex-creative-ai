'use strict';
// Existing tests mock generation only. Counting is tested separately through the
// real provider in context-preflight.test.js; never disable it in production.
const real=require('../../lib/creative-ai/runtime/provider');
class OpenAIProvider extends real.OpenAIProvider{constructor(config){super({...config,inputContextPreflight:false});}}
module.exports={...real,OpenAIProvider};
