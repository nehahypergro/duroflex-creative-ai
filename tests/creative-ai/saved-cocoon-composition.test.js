'use strict';
// Read-only, image-bound regression for the rejected Cocoon outputs. Boxes are
// manual annotations from inspected pixels, not a claim of automatic detection.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),crypto=require('crypto'),guards=require('../../lib/creative-ai/runtime/composition-guards');
const root=path.resolve(__dirname,'../../output/creative-ai/jobs/creative-c538f1cf-5a65-49a3-8d0f-31fca63f6550');
for(const route of ['continuity','exploration'])test('saved Cocoon '+route+' remains failed; colour-only repairs leave product overlap',{skip:!fs.existsSync(root)},()=>{
 const key=route+'-custom_studio-social-story',files=['editable-'+key+'-original.json','editable-'+key+'-revision-1.json','editable-review-'+key+'.json','static-editable-'+key+'.png'],bytes=files.map(f=>fs.readFileSync(path.join(root,f))),digest=b=>crypto.createHash('sha256').update(b).digest('hex'),before=bytes.map(digest),original=JSON.parse(bytes[0]),corrected=JSON.parse(bytes[1]),saved=JSON.parse(bytes[2]);
 assert.equal(original.brandId,'brand-1923d633-e03e-44cc-84b2-bbfb5c152710');assert.ok(saved.review.observations.some(o=>o.check==='subject-occlusion'&&o.status==='fail'));
 const regions=[{id:'sofa',kind:'product',left:30,top:870,width:990,height:540,evidence:'Manually annotated visible sofa bounding rectangle from this exact saved image'}];if(route==='continuity')regions.push({id:'face',kind:'face',left:215,top:740,width:150,height:145,evidence:'Manually annotated left seated person head/face'});
 const d={...original,layoutPolicyVersion:2,protectedRegions:regions},p={...corrected,layoutPolicyVersion:2,protectedRegions:regions},rows=p.objects.filter(o=>o.role!=='photograph'&&o.visible!==false),issues=guards.check(p,rows);assert.ok(issues.some(i=>/copy-3.*protected sofa/.test(i)));assert.ok(issues.some(i=>/hierarchy/.test(i)));
 const overlaps=guards.collisions(d,d.objects.filter(o=>o.role!=='photograph'),regions).map((x,i)=>({...x,id:'overlap-'+i,evidence:'Bounding boxes intersect in inspected artifact'}));const review={protectedRegions:regions,overlaps,unresolvedOverlapIds:[],corrections:overlaps.map(f=>({id:f.layerId,resolves:[f.id]}))};assert.throws(()=>guards.verifyReview(d,p,review,rows),/unresolved overlap/);
 assert.deepEqual(files.map(f=>digest(fs.readFileSync(path.join(root,f)))),before,'Historical bytes must remain unchanged');
});
