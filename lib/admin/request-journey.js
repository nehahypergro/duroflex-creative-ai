'use strict';
const ms=v=>{const n=Date.parse(v);return Number.isFinite(n)?n:null;};
const iso=v=>ms(v)==null?null:new Date(ms(v)).toISOString();
function buildJourney(job,{events=[],documents=[],journal=[],edits=[]}={}){
 const rows=[],seen=new Set();
 function add(kind,label,at,detail='',source='recorded'){at=iso(at);if(!at)return;const key=[kind,at,detail].join('|');if(seen.has(key))return;seen.add(key);rows.push({kind,label,at,detail,source});}
 for(const d of documents){add('uploaded','Brief uploaded',d.uploadedAt,(d.format||'Document').toUpperCase()+' · '+({extracted:'Text extracted',partial:'Check partially extracted text','needs-text':'Text needs attention',extracting:'Extraction not confirmed'}[d.status]||'Import status unknown'),'saved document');if(d.extractedAt)add('extracted',d.status==='extracted'?'Document text read':'Document import checked',d.extractedAt,d.status==='extracted'?'Text extracted':'Check import results','saved document');}
 for(const e of events){const at=e.kind==='brief.submitted'?e.submittedAt||e.receivedAt:e.receivedAt;
  if(e.kind==='brief.started')add('started','Brief opened',at,'Recorded browser activity');
  if(e.kind==='brief.autofill-corrected')add('corrected','Autofill corrected',at,(e.fields||[]).join(', ')+' · values are not recorded');
  if(e.kind==='brief.validation')add('blocked','Brief needed attention',at,e.code==='server-preflight'?'A readiness check did not pass.':'Required information was missing.');
  if(e.kind==='brief.submitted')add('submitted','Submitted',at,'Creation request saved');
  if(e.kind==='download.intent')add('downloaded','Download requested',at,'Browser action; a completed device save is not confirmed.');
  if(e.kind==='download.served')add('served','Download prepared',at,'Server response recorded; a completed device save is not confirmed.');
  if(e.kind==='asset.decision')add('decision',e.decision==='approved'?'Image approved':'Changes requested',at,'Decision belongs to the recorded image version.');
  if(e.kind==='recovery.requested')add('retry',e.accepted?'Retry accepted':'Retry not accepted',e.requestedAt||at,'Only the recorded recovery request is shown.');
 }
 if(!rows.some(r=>r.kind==='submitted'))add('submitted','Submitted',job.createdAt,'Saved request timestamp','job record');
 for(const e of journal){if(e.type==='artifact.saved'&&e.details?.artifact?.kind==='image')add('generated','Image created',e.recordedAt,'Image saved in the processing journal','verified journal');if(e.type==='task.failed')add('failed','A processing step failed',e.recordedAt,'Open request details for the recorded reason.','verified journal');if(e.type==='task.started'){const kind=String(e.details?.taskKind||'');add('processing',/review|verif/i.test(kind)?'Checking images':/generation/i.test(kind)?'Generating images':'Planning',e.recordedAt,'Processing step started','verified journal');}}
 for(const e of edits)add('edited','Image edit saved',e.at,'Revision '+e.revision+' · '+require('../../public/admin/labels').text(e.placementId),'saved edit history');
 rows.sort((a,b)=>ms(a.at)-ms(b.at));for(let i=0;i<rows.length;i++)rows[i].minutesSincePrevious=i?Math.max(0,(ms(rows[i].at)-ms(rows[i-1].at))/60000):null;
 const first=k=>rows.find(r=>r.kind===k)?.at||null,elapsed=(a,b)=>a&&b&&ms(b)>=ms(a)?(ms(b)-ms(a))/60000:null,submitted=first('submitted'),image=first('generated'),download=rows.find(r=>['downloaded','served'].includes(r.kind))?.at||null;
 return {rows,milestones:[['uploaded','Brief uploaded'],['corrected','Autofill corrected'],['submitted','Submitted'],['generated','Images created'],['edited','Edited'],['downloaded','Download requested']].map(([kind,label])=>({kind,label,at:first(kind),note:first(kind)?'Recorded':kind==='generated'&&job.results?.some(r=>r.imageUrl)?'Images exist; creation time was not recorded.':'Not recorded; may not have been needed.'})),timing:{briefToSubmission:elapsed(first('started'),submitted),submissionToFirstImage:elapsed(submitted,image),submissionToDownload:elapsed(submitted,download)},basis:'Elapsed wall-clock time between recorded events, including waiting and time away. Missing steps are not inferred. Times shown in India Standard Time.'};
}
module.exports={buildJourney};
