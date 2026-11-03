'use strict';
// Presentation policy only. Never removes jobs or changes execution, approval or costs.
const fs=require('node:fs/promises'),path=require('node:path');
const batch=/^(?:static-option1-|strategy-live-|all-static-|live-matrix-|both-brand-pdp-(?:nonblocking-)?test-)/;
function reason(job){if(job.clientVisibility==='internal'||job.intake?.clientVisibility==='internal'||job.synthetic===true)return 'Marked as internal work';if(batch.test(job.intake?.requestKey||''))return 'Internal batch test';if(/launch-creative test|Local test, not publication|local banner test, not publication|outside this (?:static )?image test|controlled product-identity experiment|isolated text-layer experiment|QA draft modules|Internal (?:970 × 600 hero )?test|Create a test Instagram\/Facebook|Treat this as a test creative/i.test(String(job.intake?.brief||'')))return 'Explicit test brief';if(hasAuditMarker(job.intake)||hasAuditMarker(job.submittedBrief))return 'Internal interface audit';return null;}
function hasAuditMarker(value){return /\bUX audit tab\s+[a-z0-9]\b/i.test(JSON.stringify(value||{}));}
async function registry(root){try{const r=JSON.parse(await fs.readFile(path.join(root,'output/creative-ai/internal-work.json'),'utf8'));if(r.version!==1||!r.jobs||typeof r.jobs!=='object')throw Error('Invalid internal-work register');return r;}catch(e){if(e.code==='ENOENT')return {version:1,jobs:{}};throw e;}}
function classify(job,register){return register?.jobs?.[job.id]?.reason||reason(job);}
async function internal(root,job){return !!classify(job,await registry(root));}
async function visible(root,jobs){const r=await registry(root);return jobs.filter(j=>!classify(j,r));}
module.exports={reason,hasAuditMarker,registry,classify,internal,visible};
