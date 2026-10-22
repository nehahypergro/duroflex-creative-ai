'use strict';
// Receipt durations measure calls, not serial job latency. Union observed wall
// intervals so concurrent render calls are never counted twice as elapsed time.
function summarize(receipts){const calls=[...new Map(receipts.filter(r=>r.kind==='image').map((r,i)=>[r.requestKey||'unkeyed-'+i,r])).values()],intervals=[];let sum=0,unknownCalls=0;
 for(const r of calls){const h=r.handoff||{},start=Date.parse(h.startedAt),end=Date.parse(h.completedAt),duration=h.responseSource==='saved'?h.originalResponseElapsedMs:h.responseElapsedMs;if(!Number.isFinite(start)||!Number.isFinite(end)||end<start||!Number.isFinite(duration)||duration<0){unknownCalls++;continue;}intervals.push([start,end]);sum+=duration;}
 intervals.sort((a,b)=>a[0]-b[0]);const merged=[];for(const v of intervals){const prev=merged.at(-1);if(prev&&v[0]<=prev[1])prev[1]=Math.max(prev[1],v[1]);else merged.push([...v]);}
 return {calls:calls.length,measuredCalls:intervals.length,unknownCalls,complete:unknownCalls===0,observedBusyMs:intervals.length?merged.reduce((n,[s,e])=>n+e-s,0):null,sumProviderMs:intervals.length?sum:null,measurement:'Union of observed HTTP image-call intervals. Sum of call durations is aggregate HTTP request time, not model compute time or job wall time. Missing historical timing is unknown.'};
}
module.exports={summarize};
