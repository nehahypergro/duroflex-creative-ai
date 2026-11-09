'use strict';
// Live run 9 Nov 2026: after "Looks right, create 5 designs", Projects reopened with the last
// remembered filter ("Ready"), so the five new jobs were hidden. A multi-job submit now opens
// Projects on "Creating" (a filter readRouteFilters accepts), the same for both brands.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('several queued jobs open Projects on the Creating filter',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../../public/creative-ai/studio.js'),'utf8');
 const i=s.indexOf("asset jobs queued'"),branch=s.slice(i,i+400);
 assert.ok(i>0,'multi-job submit branch exists');
 assert.match(branch,/go\('projects\?status=creating'\)/);
 assert.match(s,/\['all','draft','ready','attention','creating'\]\.includes\(r\.params\.get\('status'\)\)/,'Creating is a valid Projects filter');
});
