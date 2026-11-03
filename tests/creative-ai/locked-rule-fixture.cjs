'use strict';
// Synthetic transport fixture only. Never persist as actual artwork approval.
module.exports=record=>record.lockedRules.map(r=>({ruleId:r.id,status:'pass',confidence:.95,observation:'Mocked rule observation for pipeline contract testing; not live artwork evidence.',location:'Synthetic fixture'}));
