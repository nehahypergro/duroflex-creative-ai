import json,hashlib,urllib.request,concurrent.futures,re
from pathlib import Path
from PIL import Image
from datetime import datetime,timezone
ROOT=Path.cwd(); OUT=ROOT/'work/duroflex-deep-research-2026-10-12'; B=ROOT/'output/creative-ai/brands/brand-1923d633-e03e-44cc-84b2-bbfb5c152710';brand=json.loads((B/'brand.json').read_text());assert brand['name']=='Duroflex'
rows=json.loads((OUT/'online-pages.json').read_text()); (OUT/'images').mkdir(exist_ok=True)
select={'W01':[0,2,4,6,8,10,12,14,28,29,30,32,33,34],'W02':[0,1,4],'W03':[0,1,2],'W04':[10,11,12,13],'W05':[15,19,26,29],'W06':[5,6,7,8,9],'W07':[1,2,6],'W08':[3,4,5,7],'W09':[2,3,4,5],'W10':[2,3,4,10],'W11':[0,1,2,3],'W12':[3,4,5,7]}
def download(pair):
 page,index=pair;im=page['images'][index];id=page['id']+'-I'+str(index).zfill(3);out={'id':id,'sourceId':page['id'],'sourceUrl':page['url'],'url':im['url'],'alt':im['alt'],'kind':'current-official-website','authority':'Observed current website visual; not a permanent supplied guideline or verified exact-SKU fact.'}
 try:
  f=OUT/'images'/(id+'.original');req=urllib.request.Request(im['url'],headers={'User-Agent':'Mozilla/5.0'})
  if not f.exists():
   with urllib.request.urlopen(req,timeout=45) as r:f.write_bytes(r.read())
  data=f.read_bytes();image=Image.open(f);out.update({'originalPath':str(f),'originalSha256':hashlib.sha256(data).hexdigest(),'originalDimensions':list(image.size),'status':'saved'})
  image.convert('RGB').save(OUT/'images'/(id+'.jpg'),quality=90);out['path']=str(OUT/'images'/(id+'.jpg'))
 except Exception as e:out.update(status='unavailable',error=str(e))
 return out
web=list(concurrent.futures.ThreadPoolExecutor(4).map(download,[(r,n)for r in rows for n in select[r['id']]]));images=[];texts=[]
for prefix,docid,kind in [('P','doc-3d51ae63-ac10-47e4-8deb-da27fd857244','supplied-positioning'),('V','doc-de7dd121-8244-4f7e-9efe-ab12b9fbc4a8','supplied-draft-visual-guide')]:
 doc=next(d for d in brand['documents'] if d['id']==docid);idx=json.loads((B/'sources'/(docid+'.json')).read_text());visuals={v['slide'] for v in doc['visuals']}
 for s in idx['slides']:
  id=prefix+str(s['slide']).zfill(3);t={'id':id,'sourceId':docid,'slide':s['slide'],'text':s['text'],'notes':s.get('notes',''),'hidden':s.get('hidden',False),'kind':kind};texts.append(t)
  if s['slide'] in visuals:images.append({**t,'path':str(B/'sources'/(docid+'-slide-'+str(s['slide'])+'.jpg')),'status':'saved'})
for a in brand['assets']:
 assert a['brandId']==brand['id'];id=re.match(r'R\d+',a.get('note','')).group();images.append({'id':id,'sourceId':a['id'],'kind':'user-selected-spatial-inspiration','authority':'Advisory, may be synthetic; no product identity or construction proof','previousObservation':a['note'],'path':str(B/a['originalPath']),'status':'saved'})
images+= [a for a in web if a['status']=='saved']
# Derivatives only for bounded visual analysis; original files and hashes retained.
for im in images:
 src=Path(im['path']);im['sha256']=hashlib.sha256(src.read_bytes()).hexdigest();pic=Image.open(src).convert('RGB');im['dimensions']=list(pic.size);pic.thumbnail((1600,1600));dest=OUT/'images'/(im['id']+'-analysis.jpg');pic.save(dest,quality=88);im['analysisPath']=str(dest);im['analysisSha256']=hashlib.sha256(dest.read_bytes()).hexdigest()
batches=[]
for kind in ['supplied-draft-visual-guide','supplied-positioning','user-selected-spatial-inspiration','current-official-website']:
 ims=[i for i in images if i['kind']==kind]
 for k in range(0,len(ims),38):batches.append({'id':kind+'-'+str(k//38+1),'kind':kind,'imageIds':[i['id'] for i in ims[k:k+38]]})
manifest={'brandId':brand['id'],'brandName':'Duroflex','createdAt':datetime.now(timezone.utc).isoformat(),'model':'gpt-6-astra','reasoningEffort':'high','sourceDocuments':[{k:d[k] for k in ['id','name','sha256','draft','coverage']}for d in brand['documents']],'texts':texts,'images':images,'onlinePages':rows,'onlineDownloads':web,'batches':batches,'limitations':['Nine hidden positioning slides are text only.','PPTX rendering may substitute fonts.','Reference photos may be synthetic; exact materials and origins unverified.','Current web is a dated representative sample, not a complete social/media audit.','Videos are not reviewed; only saved still images.','Astra interpretation remains derived research and does not approve the draft.']}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2));print(json.dumps({'images':len(images),'textSlides':len(texts),'webSaved':sum(r['status']=='saved'for r in web),'webFailures':[r for r in web if r['status']!='saved'],'batches':len(batches)}))
