'use strict';
function explicit(base){return {...structuredClone(base),version:base.version===3?5:4,threshold:0,qualityGate:false,status:'explicit-blockers-v1',limits:[...base.limits,'Creative scores and stylistic findings are advisory. Enumerated critical checks and explicit requirements govern delivery.']};}
function byVersion(version){
 if(version===4)return explicit(require('./policy-v2.json'));
 if(version===5)return explicit(require('./policy-pdp-v1.json'));
 if(version===3)return require('./policy-pdp-v1.json');
 if(version===2)return require('./policy-v2.json');
 return require('./policy.json');
}
function assertBinding(state,report){if((state.blockingPolicyVersion===1)!==[4,5].includes(report.policy?.version))throw Error('Review blocking policy does not match the saved lifecycle');}
module.exports={explicit,byVersion,assertBinding};
