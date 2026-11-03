#!/usr/bin/env python3
"""Freeze private engineering evidence. No network, provider calls or job writes.
Build once into a new directory; verify can subsequently detect changed/missing files.
"""
import argparse, base64, collections, datetime, hashlib, html, json, os, pathlib, re, shutil, subprocess, xml.etree.ElementTree as ET
ROOT=pathlib.Path(__file__).resolve().parents[2]
def sha(p):
 h=hashlib.sha256()
 with open(p,'rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def read(p):return json.loads(pathlib.Path(p).read_text())
def write(p,v):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def verify(out):
 m=read(out/'manifest.json');bad=[]
 for f in m['files']:
  p=out/f['path']
  if not p.is_file() or p.stat().st_size!=f['bytes'] or sha(p)!=f['sha256']:bad.append(f['path'])
 return {'checkedFiles':len(m['files']),'mismatches':bad,'ok':not bad,'manifestSha256':sha(out/'manifest.json')}
def build(out,run):
 out.mkdir(parents=True,exist_ok=False);gaps=[];sources={}
 def freeze(rel):
  p=ROOT/rel;rel=str(p.relative_to(ROOT))
  if rel in sources:return sources[rel]
  if not p.is_file():gaps.append({'type':'missing-source','path':rel});return None
  dest=out/'evidence'/rel;dest.parent.mkdir(parents=True,exist_ok=True)
  before=sha(p);shutil.copyfile(p,dest)
  if sha(dest)!=before or sha(p)!=before:raise RuntimeError('Source changed while freezing: '+rel)
  sources[rel]={'sourcePath':rel,'snapshotPath':str(dest.relative_to(out)),'sha256':before,'bytes':dest.stat().st_size}
  return sources[rel]
 catalog=read(ROOT/'docs/failure-evidence-cases.json')
 for c in catalog['cases']:
  c['sourceReferences']=[]
  for rel in [*c['historicalEvidence'],*c['regressionFiles']]:
   p=ROOT/rel
   choices=sorted(p.glob('*')) if p.is_dir() else [p]
   for q in choices:
    if not q.is_file() or q.suffix not in ['.json','.txt','.log','.js','.md']:continue
    x=freeze(q.relative_to(ROOT))
    if x:c['sourceReferences'].append(x)
  c['evidenceInterpretation']='Historical before-fix logs are preserved, not rerun against reverted code. Current regression passes validate guarded behaviour, not live image quality. Root-cause summaries reference the saved engineering reports.'
 anchors=['work/full-route-execution-20261022/execution.json','work/full-route-execution-20261022/findings.json','work/full-route-execution-20261022/route-audit.json','work/reliability-fix-20261022/comparison.json','work/full-rerun-20261023/evidence.json','work/full-rerun-20261023/summary.json','work/pdp-airboost-atomic-retry-20261023/artwork-cases.json','work/pdp-fix-20261023/artwork-cases.json','docs/pdp-reliability.md','docs/creative-ai-reliability-fixes.md','docs/navigation-reliability.md','docs/client-release-readiness.md','docs/proposed-delivery-contracts.json','docs/client-static-document-scope.json','AGENTS.md','docs/creative-ai-regression-policy.md']
 ids=set()
 extension=ROOT/'work/failure-evidence-20261023/brand-extension.json'
 if extension.exists():
  freeze(extension.relative_to(ROOT));ids.update(x['jobId'] for x in read(extension)['jobs'])
 for rel in anchors:
  freeze(rel)
  ids.update(re.findall(r'creative-[0-9a-f-]{36}',(ROOT/rel).read_text()))
 # Dated admission/recovery attempts can be referenced only from these local records.
 for rel in ['work/pdp-airboost-atomic-retry-20261023/approval.json','work/pdp-airboost-atomic-retry-20261023/cost-summary.json','work/pdp-airboost-atomic-retry-20261023/continuation-result.json','work/pdp-airboost-atomic-retry-20261023/saved-image-resume-result.json']:
  freeze(rel);ids.update(re.findall(r'creative-[0-9a-f-]{36}',(ROOT/rel).read_text()))
 jobs=[];observations=[];artifacts=[]
 def image_reference(value,brand,expected=None):
  if not isinstance(value,str) or not value.startswith('data:image/'):return None
  header,data=value.split(',',1);b=base64.b64decode(data,validate=True);digest=hashlib.sha256(b).hexdigest();ext=header.split('/')[1].split(';')[0];ext={'jpeg':'jpg','svg+xml':'svg'}.get(ext,ext)
  if ext not in ['png','jpg','webp','svg','gif']:raise RuntimeError('Unsupported saved reference encoding')
  ref=pathlib.Path('references')/(brand or 'unscoped')/(digest+'.'+ext);target=out/ref;target.parent.mkdir(parents=True,exist_ok=True)
  if not target.exists():target.write_bytes(b)
  if expected and expected!=digest:gaps.append({'type':'reference-hash-mismatch','brandId':brand,'expected':expected,'actual':digest})
  return {'snapshotPath':str(ref),'sha256':digest,'bytes':len(b),'brandId':brand,'expectedHash':expected,'hashMatches':None if not expected else expected==digest}

 def symptom_tags(text):
  # These are search labels, explicitly not inferred root causes or verdict changes.
  rules={'connection':['socket','fetch failed','connection','ambiguous_provider','epipe'],'readability':['legibility','readability','too small','tiny','copy fit','copy-fit'],'identity':['product-identity','marking','fabric','pattern','identity reference'],'logo':['logo','clipping'],'source':['source','qualifier','claim','evidence'],'lifecycle':['task','handoff','deadline','timeout'],'budget':['budget','allowance','reservation']}
  return [k for k,words in rules.items() if any(w in text.lower() for w in words)]
 for jid in sorted(ids):
  d=ROOT/'output/creative-ai/jobs'/jid;p=d/'job.json'
  if not p.exists():gaps.append({'type':'missing-job','jobId':jid});continue
  originalHash=sha(p);j=read(p);budget=j.get('budget',{});intake=j.get('intake',{})
  selected={k:intake[k] for k in ['brandId','brandUrl','brief','productName','productPageUrl','productId','variantId','placementIds','productHandlingMode','researchId'] if k in intake}
  receiptKeys={r.get('kind','')+':'+r.get('requestKey','') for r in budget.get('receipts',[]) if r.get('requestKey')}
  unresolved=[{'requestIdentity':k,**{a:v for a,v in s.items() if a in ['kind','key','reservedAt','status']}} for k,s in budget.get('requestStates',{}).items() if k not in receiptKeys]
  snap={'jobId':jid,'sourcePath':str(p.relative_to(ROOT)),'sourceSha256':originalHash,'createdAt':j.get('createdAt'),'updatedAt':j.get('updatedAt'),'brandId':intake.get('brandId'),'intake':selected,'status':j.get('status'),'stage':j.get('stage'),'error':j.get('error'),'unitErrors':j.get('unitErrors',[]),'results':j.get('results',[]),'pdpPacks':j.get('pdpPacks',[]),'pdpTimeContinuations':j.get('pdpTimeContinuations',[]),'accounting':{'reasoningCalls':budget.get('reasoningCalls'),'imageCalls':budget.get('imageCalls'),'deadline':budget.get('deadline'),'unresolvedRequestCandidates':unresolved,'note':'Missing receipt is a reconciliation candidate, not proof of a charged request. Unknown is never zero. Monetary data is preserved in the frozen cost summaries; reservations are not actual spend.'}}
  identity=intake.get('productProtection',{});snap['productIdentity']={k:v for k,v in identity.items() if k!='imageData'};snap['productReferencePolicy']=j.get('productReferencePolicy') or intake.get('productReferencePolicy');snap['approvedLogoReference']=intake.get('approvedLogoReference')
  snap['identityPixels']=image_reference(identity.get('imageData'),intake.get('brandId'),identity.get('reference',{}).get('rasterHash'))
  logo=intake.get('approvedLogoReference') or {}
  if logo.get('filename') and logo.get('brandId')==intake.get('brandId'):
   rel=pathlib.Path('output/creative-ai/brands')/logo['brandId']/'canvas-assets'/pathlib.Path(logo['filename']).name
   if (ROOT/rel).exists():
    snap['approvedLogoPixels']=freeze(rel)
    if logo.get('sha256') and snap['approvedLogoPixels']['sha256']!=logo['sha256']:gaps.append({'type':'logo-hash-mismatch','jobId':jid})
   else:gaps.append({'type':'missing-approved-logo-file','jobId':jid,'sourcePath':str(rel)})
  write(out/'jobs'/jid/'observation.json',snap)
  jobs.append({'jobId':jid,'brandId':intake.get('brandId'),'createdAt':j.get('createdAt'),'status':j.get('status'),'error':j.get('error'),'results':len(j.get('results',[])),'savedImages':sum(bool(r.get('imageUrl')) for r in j.get('results',[])),'passedImages':sum(r.get('ready') is True for r in j.get('results',[])),'userCancelled':str(j.get('error') or '').startswith('Stopped at user request:'),'observation':'jobs/'+jid+'/observation.json'})
  if j.get('error') or j.get('unitErrors'):observations.append({'id':jid+'-job','kind':'user-cancelled' if str(j.get('error') or '').startswith('Stopped at user request:') else 'job-error','jobId':jid,'brandId':intake.get('brandId'),'status':j.get('status'),'error':j.get('error'),'unitErrors':j.get('unitErrors',[]),'tags':symptom_tags(str(j.get('error'))+str(j.get('unitErrors'))),'source':'jobs/'+jid+'/observation.json'})
  for n,r in enumerate(j.get('results',[])):
   item={'id':jid+'-output-'+str(n),'kind':'output','jobId':jid,'brandId':intake.get('brandId'),'route':r.get('route'),'placementId':r.get('placementId'),'ready':r.get('ready') is True,'decision':r.get('reviewDecision'),'status':r.get('status'),'issues':r.get('unresolved',[]),'error':r.get('error'),'tags':symptom_tags(json.dumps(r.get('unresolved',[]))+str(r.get('error'))),'source':'jobs/'+jid+'/observation.json'}
   for key in ['imageUrl','reviewUrl']:
    u=r.get(key)
    if not u:continue
    name=u.split('/')[-1]
    if pathlib.Path(name).name!=name:raise RuntimeError('Unsafe artifact name')
    f=d/name;ref=freeze(f.relative_to(ROOT))
    if ref:item[key.replace('Url','')]=ref
   if item.get('image') and item.get('review'):
    rv=read(out/item['review']['snapshotPath']);expected=rv.get('artifactHash')
    item['reviewImageHashMatches']=expected==item['image']['sha256'] if expected else None
    if expected and not item['reviewImageHashMatches']:gaps.append({'type':'review-image-binding-mismatch','jobId':jid,'placementId':r.get('placementId'),'route':r.get('route'),'expected':expected,'actual':item['image']['sha256']})
   reviewName=(r.get('reviewUrl') or '').split('/')[-1]
   packagePath=d/reviewName.replace('review-','package-',1)
   if reviewName and packagePath.is_file():
    pk=read(packagePath);fields=['version','assignmentId','conceptId','route','placementId','conceptHash','placementHash','copyHash','artHash','brandHash','status','exactCopy','artDirection','canvas','outputFormat','productReference','lockedRules','dependencies','packageHash']
    ps={k:pk[k] for k in fields if k in pk};ps['sourcePath']=str(packagePath.relative_to(ROOT));ps['sourceSha256']=sha(packagePath);ps['attachmentManifest']=[]
    for attachment in pk.get('attachmentManifest',[]):
     a={k:v for k,v in attachment.items() if k!='imageData'};a['frozenPixels']=image_reference(attachment.get('imageData'),intake.get('brandId'),attachment.get('sha256'));ps['attachmentManifest'].append(a)
    packageRef='jobs/'+jid+'/package-observation-'+str(n)+'.json';write(out/packageRef,ps);item['packageObservation']=packageRef
   item['relatedCaseIdsByCriterion']=sorted({case for issue in item['issues'] for case in {'required-text-legibility':['F08','F11','F18'],'product-identity':['F12'],'logo-identity':['F13','F63'],'exact-required-copy':['F62'],'mandatory-brand-rules':['F64'],'creative-quality':['F65'],'supported-claims':['F27','F28'],'package-dependency':['F31','F32'],'verified-upload-constraints':['F21'],'reference-boundary':['F21']}.get(issue.get('criterion'),[])})
   item['mappingNote']='Related cases by criterion, not a confirmed causal assignment; inapplicable route-specific cases must be excluded during triage.'
   observations.append(item)
  # Exact diagnostics and prior artwork/reviews are retained, not only final outputs.
  for q in sorted(d.iterdir()):
   include=(q.name.startswith('static-') and q.suffix in ['.png','.jpg','.webp']) or (q.suffix=='.json' and (q.name.startswith(('review-','transport-','copy-fit','pdp-preflight')) or 'error' in q.name or q.name in ['pdp-plan.json','strategy.json','copy.json','art-output.json']))
   if include and q.is_file():
    ref=freeze(q.relative_to(ROOT));artifacts.append({'jobId':jid,**ref})
  if sha(p)!=originalHash:raise RuntimeError('Job changed during capture: '+jid)
 # Preserve every historical scope row, not just routes that produced images.
 scope=read(ROOT/'work/full-route-execution-20261022/execution.json')['rows']
 rerun=read(ROOT/'work/full-rerun-20261023/evidence.json')['runs']
 write(out/'scope-baseline.json',{'scopeRows':scope,'laterRunRoutes':rerun,'note':'These are dated historical execution snapshots. A historical not-built status does not override a later implementation; see current case dispositions. Untested does not mean failed generation.'})
 tests=[]
 for name in ['regression-results.xml','browser-results.xml','context-results.xml']:
  p=run/name
  if not p.exists():gaps.append({'type':'missing-current-test-results','path':str(p)});continue
  try:
   root=ET.parse(p).getroot()
   for c in root.iter('testcase'):
    tests.append({'name':c.get('name'),'classname':c.get('classname'),'file':c.get('file'),'seconds':c.get('time'),'status':'failed' if c.find('failure') is not None or c.find('error') is not None else 'skipped' if c.find('skipped') is not None else 'passed','detail':''.join(c.itertext()).strip()[:12000]})
  except ET.ParseError:raise RuntimeError('Tests are still running or XML is incomplete: '+name)
 for c in catalog['cases']:
  matched=[t for t in tests if any((t.get('file') or '').endswith(f) for f in c['regressionFiles'])]
  c['currentRegressionSummary']=dict(collections.Counter(t['status'] for t in matched))
  c['currentRegressionNames']=[t['name'] for t in matched]
  c['regressionCoverageNote']='Shared test-file coverage; counts overlap between cases and must not be summed. No matching tests is an evidence gap, not a pass.'
 for p in sorted(run.iterdir()):
  if p.is_file() and p.suffix in ['.txt','.xml','.json']:freeze(p.relative_to(ROOT))
 replayText=(run/'both-brands.txt').read_text();replay=json.loads(replayText[replayText.index('{'):]);
 # Source fingerprints make later offline runs detect source drift instead of silently changing baseline.
 code=[]
 for folder in ['lib/creative-ai','tests/creative-ai','public/creative-ai']:
  for p in sorted((ROOT/folder).rglob('*')):
   if p.is_file() and p.suffix in ['.js','.cjs','.json','.css','.html','.md']:code.append({'path':str(p.relative_to(ROOT)),'sha256':sha(p)})
 for rel in ['server.js','package.json','package-lock.json','tests/group-workspace.test.js']:
  if (ROOT/rel).exists():code.append({'path':rel,'sha256':sha(ROOT/rel)})
 write(out/'code-fingerprints.json',code)
 brands={'brand-1923d633-e03e-44cc-84b2-bbfb5c152710':'Duroflex','brand-3a5870df-d114-43eb-ba02-e5d8c3c729de':'Sleepyhead'}
 brandCoverage=[]
 for brand,name in brands.items():
  jj=[x for x in jobs if x['brandId']==brand];oo=[x for x in observations if x.get('brandId')==brand and x['kind']=='output']
  brandCoverage.append({'brandId':brand,'brandName':name,'savedJobs':len(jj),'userCancelledJobs':sum(x['userCancelled'] for x in jj),'datedRange':[min(x['createdAt'] for x in jj),max(x['createdAt'] for x in jj)] if jj else [],'outputRecords':len(oo),'nonPassingOutputRecords':sum(not x['ready'] for x in oo),'recordedReplay':'passed' if replay['failedStages']==0 else 'inspect replay','liveAcceptance':'Incomplete: historic per-output results are not ten new complete scenarios per affected route.'})
 for c in catalog['cases']:
  c['brandCoverage']=[]
  for brand,name in brands.items():
   candidates=[o for o in observations if o.get('brandId')==brand and (c['id'] in o.get('relatedCaseIdsByCriterion',[]) or o['jobId'] in c.get('relatedJobIds',[]))]
   applicable='Shared engine / separately scoped brand evidence' if c['id']!='F39' else ('Explicit client-approved Duroflex website policy' if name=='Duroflex' else 'Boundary only: no implicit certification approval transferred to Sleepyhead')
   c['brandCoverage'].append({'brandId':brand,'brandName':name,'applicability':applicable,'relatedHistoricalObservations':[o['id'] for o in candidates],'historicalObservationNote':'Criterion links are triage candidates, not confirmed identical root causes. Empty links mean no direct observation assigned to this case, not that the issue cannot affect this brand.','sharedRegressionEvidence':c.get('currentRegressionSummary',{}),'recordedBrandHandoffReplay':'passed' if replay['failedStages']==0 else 'inspect','routeSpecificLiveClosure':'Not established by these regression/replay results.'})
 write(out/'brand-coverage.json',{'brands':brandCoverage,'cases':[{'id':c['id'],'title':c['title'],'coverage':c['brandCoverage']} for c in catalog['cases']],'limits':'Historical artwork belongs to its saved brand and exact SKU. The source-certification approval remains Duroflex-only. User cancellations are not counted as engine defects.'})
 summary={'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'caseCount':len(catalog['cases']),'brandCoverage':brandCoverage,'dispositions':dict(collections.Counter(c['disposition'] for c in catalog['cases'])),'jobs':len(jobs),'jobStatuses':dict(collections.Counter(j['status'] for j in jobs)),'jobBrands':dict(collections.Counter(str(j['brandId']) for j in jobs)),'outputObservations':sum(o['kind']=='output' for o in observations),'nonPassingOutputObservations':sum(o['kind']=='output' and not o['ready'] for o in observations),'scopeRows':len(scope),'laterRunRoutes':len(rerun),'currentTests':dict(collections.Counter(t['status'] for t in tests)),'bothBrandReplayFailedStages':replay['failedStages'],'newPaidCalls':0,'gaps':gaps,'notes':['Private local evidence, not published or shared.','A guarded software defect is not a passing creative route.','Observations are retained per attempt; failed originals and later passing retries remain distinct.','Source snapshots and metadata retain brand bindings. No cross-brand creative material is reused.','Historical raw provider envelopes are not copied; exact original source paths/hashes and recorded diagnostics remain available. This is an evidence corpus, not a complete executable workspace backup.','Symptom tags are search aids, not automatic root-cause assignments.','Current tests exercise synthetic failures/recorded replays. Ten varied live scenarios per affected route remain outstanding.','No reviewer finding was newly adjudicated by this capture.']}
 write(out/'cases.json',catalog);write(out/'jobs.json',jobs);write(out/'observations.json',observations);write(out/'artifacts.json',artifacts);write(out/'current-tests.json',tests);write(out/'summary.json',summary);write(out/'source-index.json',list(sources.values()))
 render(out,catalog['cases'],summary,jobs,observations,tests)
 files=[{'path':str(p.relative_to(out)),'sha256':sha(p),'bytes':p.stat().st_size} for p in sorted(out.rglob('*')) if p.is_file()]
 write(out/'manifest.json',{'version':1,'createdAt':summary['createdAt'],'algorithm':'SHA-256','files':files,'notes':'Manifest excludes itself. Store the external manifest.sha256 receipt to detect manifest replacement.'})
 (out.parent/(out.name+'.manifest.sha256')).write_text(sha(out/'manifest.json')+'  '+out.name+'/manifest.json\n')
 return summary

def render(out,cases,summary,jobs,observations,tests):
 esc=lambda x:html.escape(str(x if x is not None else ''))
 def link(ref,label):return '<a href="'+esc(ref)+'">'+esc(label)+'</a>'
 cards=[]
 for c in cases:
  ev=' '.join(link(r['snapshotPath'],pathlib.Path(r['sourcePath']).name) for r in c['sourceReferences'])
  cards.append('<article class="case" data-search="'+esc(' '.join([c['id'],c['category'],c['disposition'],c['title']])).lower()+'"><h3>'+esc(c['id']+' · '+c['title'])+'</h3><p><b>'+esc(c['disposition'])+'</b> · '+esc(c['category'])+'</p><p>'+esc(c['causeOrLimitation'])+'</p><p><strong>To close:</strong> '+esc(c['closureEvidenceRequired'])+'</p><details><summary>Duroflex / Sleepyhead coverage</summary><pre>'+esc(json.dumps(c.get('brandCoverage',[]),ensure_ascii=False,indent=2))+'</pre></details><details><summary>Frozen evidence and regression fixtures</summary><div class="links">'+ev+'</div><p>'+esc(c['evidenceInterpretation'])+'</p></details></article>')
 gallery=[]
 for o in observations:
  if o['kind']!='output' or o['ready']:continue
  im=o.get('image');rv=o.get('review');image=('<a href="'+esc(im['snapshotPath'])+'"><img loading="lazy" src="'+esc(im['snapshotPath'])+'" alt="Saved '+esc(o['placementId'])+'"></a>') if im else '<div class="empty">No saved final image</div>'
  gallery.append('<article class="case" data-search="'+esc(str(o)+' '+({'brand-1923d633-e03e-44cc-84b2-bbfb5c152710':'Duroflex','brand-3a5870df-d114-43eb-ba02-e5d8c3c729de':'Sleepyhead'}.get(o.get('brandId'),''))).lower()+'">'+image+'<p><b>'+esc({'brand-1923d633-e03e-44cc-84b2-bbfb5c152710':'Duroflex','brand-3a5870df-d114-43eb-ba02-e5d8c3c729de':'Sleepyhead'}.get(o.get('brandId'),o.get('brandId')))+'</b></p><h3>'+esc(o['placementId'])+' · '+esc(o['route'])+'</h3><p>'+esc(o['decision'] or o['status'])+'</p><p class="small">'+esc(o['jobId'])+'</p><details><summary>Recorded findings</summary><pre>'+esc(json.dumps(o['issues'],ensure_ascii=False,indent=2))+'</pre></details>'+ (link(rv['snapshotPath'],'Frozen review') if rv else '')+' · '+(link(o['packageObservation'],'Exact copy & source references') if o.get('packageObservation') else link(o['source'],'Saved job / identity reference'))+'</article>')
 failures=[t for t in tests if t['status']!='passed']
 content='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Frozen failure evidence · 23 Oct 2026</title><style>body{font:16px/1.5 system-ui,sans-serif;margin:0;background:#f4f5fa;color:#202339}main{max-width:1250px;margin:auto;padding:36px}h1{font-size:34px;margin-bottom:10px}h2{margin-top:42px}p{max-width:100ch}a{color:#4b36bc}nav{display:flex;gap:20px;flex-wrap:wrap}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:16px}.case{background:white;padding:20px;border:1px solid #dddfea;border-radius:12px;min-width:0}.case h3{margin:0;font-size:18px}.links{display:flex;gap:10px;flex-wrap:wrap;padding-top:10px}img{width:100%;height:220px;object-fit:contain;background:#eee}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}.small{font-size:12px;overflow-wrap:anywhere}.empty{padding:70px 10px;text-align:center;background:#eee}input{padding:12px;width:min(90%,650px);font:inherit;border:1px solid #bbb;border-radius:8px}.notice{border-left:4px solid #bb7922;padding:15px;background:#fff6e9}details{margin-top:12px}.hidden{display:none}</style><main>'''
 content+='<h1>Failure evidence · Duroflex &amp; Sleepyhead</h1><p>Frozen '+esc(summary['createdAt'])+'. Private local snapshot · no new paid calls.</p><p>'+esc(summary['caseCount'])+' classified issues/gaps · '+esc(summary['jobs'])+' saved jobs · '+esc(summary['scopeRows'])+' client scope rows · '+esc(summary['nonPassingOutputObservations'])+' non-passing output records.</p><p class="notice">Software regressions, model review findings and missing acceptance evidence are separate. Historical findings are not new human verdicts. A saved image, complete set or passing unit test is not a client-ready deliverable.</p><h2>Brand-specific evidence</h2><pre>'+esc(json.dumps(summary['brandCoverage'],ensure_ascii=False,indent=2))+'</pre><nav><a href="#cases">Issue register</a><a href="#artwork">Failed / uncertain artwork</a><a href="#runs">Runs & tests</a>'+link('summary.json','Summary JSON')+link('manifest.json','Hash manifest')+link('scope-baseline.json','All scope rows')+link('brand-coverage.json','Per-brand evidence matrix')+'</nav><p><input id="filter" aria-label="Filter cases and artwork" placeholder="Filter: identity, timeout, A+, navigation, F31…"></p><h2 id="cases">Classified issues and acceptance gaps</h2><div class="grid">'+''.join(cards)+'</div><h2 id="artwork">Saved failed or uncertain outputs</h2><p>Includes original and retry attempts. Expand each card for its recorded findings; no quality threshold has been changed.</p><div class="grid">'+''.join(gallery)+'</div><h2 id="runs">Reproduction and coverage</h2><pre>'+esc(json.dumps(summary,indent=2,ensure_ascii=False))+'</pre><h3>Non-passing current tests</h3><pre>'+esc(json.dumps(failures,indent=2,ensure_ascii=False))+'</pre><p>'+link('jobs.json','All saved job states')+' · '+link('current-tests.json','Individual current test results')+' · '+link('observations.json','All output and job-error observations')+'</p></main><script>document.getElementById("filter").addEventListener("input",e=>{const q=e.target.value.trim().toLowerCase();document.querySelectorAll(".case").forEach(c=>c.classList.toggle("hidden",!c.dataset.search.includes(q)));});</script></html>'
 (out/'index.html').write_text(content)

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('action',choices=['build','verify','check-code']);p.add_argument('--output',required=True);p.add_argument('--run-directory');a=p.parse_args();out=pathlib.Path(a.output).resolve()
 if a.action=='build':r=build(out,pathlib.Path(a.run_directory).resolve())
 elif a.action=='verify':
  r=verify(out);receipt=out.parent/(out.name+'.manifest.sha256')
  if receipt.exists() and receipt.read_text().split()[0]!=sha(out/'manifest.json'):r['ok']=False;r['mismatches'].append('manifest.json (external receipt)')
 else:
  rows=read(out/'code-fingerprints.json');changed=[x['path'] for x in rows if not (ROOT/x['path']).is_file() or sha(ROOT/x['path'])!=x['sha256']];r={'checkedFiles':len(rows),'changed':changed,'ok':not changed}
 print(json.dumps(r,indent=2,ensure_ascii=False))
 if r.get('ok') is False:raise SystemExit(1)
