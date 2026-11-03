'use strict';
// Historical opt-in runner shares the field-bound contract, but never enables new Studio jobs.
const shared=require('../runtime/editable-composition');
module.exports={...shared,nameFor:shared.experimentNameFor,
 makeRequest:(request,assets,onPlan)=>shared.makeRequest(request,assets,onPlan,{experiment:true}),
 documentFor:(record,assets,photoUrl,saved)=>shared.documentFor(record,assets,photoUrl,saved,{experiment:true}),
 install:runtime=>shared.install(runtime,{experiment:true})};
