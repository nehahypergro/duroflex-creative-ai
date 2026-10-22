'use strict';
// A saved failure record is not an image. Review readiness stays on each result.
function classify(results,expected){const count=results.filter(r=>typeof r.imageUrl==='string'&&r.imageUrl.length>0).length;return count===0?'failed':count===expected?'finished':'partial';}
function problem(results){const absent=results.filter(r=>!r.imageUrl);if(!absent.length)return null;const notes=[...new Set(absent.flatMap(r=>[r.error,...(r.unresolved||[]).filter(u=>u.criterion==='package-dependency').map(u=>u.request)]).filter(v=>typeof v==='string'&&v.trim()))];return (notes.join(' · ')||'No image was produced. Review the saved output details before trying again.').slice(0,800);}
module.exports={classify,problem};
