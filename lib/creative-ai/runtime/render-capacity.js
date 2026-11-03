'use strict';
// All projects and local workers share Chrome admission before loading image bytes.
const path=require('node:path');
const limit=2;
function run(runtime,fn){const root=runtime.store?.root||path.join(runtime.root,'output/creative-ai/jobs');return require('./shared-capacity').run(path.join(root,'.provider-capacity'),'render',limit,fn,{timeoutMs:120000,signal:AbortSignal.timeout(120000)});}
module.exports={run,limit};
