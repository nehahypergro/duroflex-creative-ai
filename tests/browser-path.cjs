'use strict';
module.exports=()=>require('../lib/creative-ai/runtime/browser').resolveBrowser({configured:process.env.CREATIVE_QA_BROWSER||process.env.CREATIVE_AI_CHROME});
