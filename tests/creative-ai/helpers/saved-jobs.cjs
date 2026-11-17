'use strict';
// Some regression tests replay saved historical jobs from output/creative-ai/jobs. output/ is not in Git, so a
// fresh checkout may not have them. Returns a skip reason naming the first missing job folder, or false when all
// are present (the test then runs unchanged).
const fs=require('node:fs'),path=require('node:path');
const jobsDir=path.resolve(__dirname,'../../../output/creative-ai/jobs');
function missingJobs(...ids){
 const absent=ids.filter(id=>!fs.existsSync(path.join(jobsDir,id)));
 return absent.length?'saved job output/creative-ai/jobs/'+absent.join(', ')+' is not in this checkout':false;
}
module.exports={missingJobs};
