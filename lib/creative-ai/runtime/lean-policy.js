'use strict';
// Server-owned policy for NEW Studio jobs. Existing snapshots never change.
const options=[{route:'continuity',model:'gpt-image-2',quality:'high'},{route:'exploration',model:'gpt-image-2.6-sunburst',quality:'high'}];
const roles={'lean-planning':{model:'gpt-6.1-sol',reasoningEffort:'high'},'lean-review':{model:'gpt-6-luna',reasoningEffort:'medium'},'lean-correction':{model:'gpt-6-luna',reasoningEffort:'medium'}};
const enabled=intake=>intake?.leanWorkflowVersion===1;
const isRole=role=>Object.hasOwn(roles,role);
function configure(config,intake){return enabled(intake)?{...config,leanContextVersion:1,leanPlanningContractVersion:2,imageModel:options[0].model,imageOptionModels:options.map(o=>o.model),roleModels:{...(config.roleModels?.['product-audit']?{'product-audit':config.roleModels['product-audit']}:{}),...roles}}:config;}
function assertLegacyAction(job){if(enabled(job.intake))throw Object.assign(Error('This project uses the simplified artwork workflow. Continue interrupted saved work through its recovery action; legacy review, reconstruction and component repair do not apply.'),{code:'LEAN_WORKFLOW_ACTION_UNAVAILABLE'});}
module.exports={options,roles,enabled,isRole,configure,assertLegacyAction};
