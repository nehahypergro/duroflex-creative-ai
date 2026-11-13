import json,re,hashlib,urllib.request,urllib.parse,concurrent.futures
from pathlib import Path
from html.parser import HTMLParser
from datetime import datetime,timezone
ROOT=Path.cwd(); OUT=ROOT/'work/duroflex-deep-research-2026-10-12'; OUT.mkdir(exist_ok=True)
BASE='https://www.duroflexworld.com'
urls=['/','/pages/about-us','/blogs/news/a-new-chapter-designed-to-de-stress','/collections/airboost-mattress','/collections/orthopedic-mattress','/collections/sofa-sets','/collections/motion-sofa','/collections/recliners','/collections/beds','/collections/pillows','/collections/neuma-massager','/collections/smart-sleep-solutions']
class Parser(HTMLParser):
 def __init__(self,url):
  super().__init__();self.url=url;self.main=False;self.skip=0;self.text=[];self.images=[];self.links=[]
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if t=='main':self.main=True
  if t in ['script','style']:self.skip+=1
  if t=='a' and a.get('href'):self.links.append(urllib.parse.urljoin(self.url,a['href']))
  if t=='img' and self.main:
   src=a.get('data-src') or a.get('src') or ''
   if src and not src.startswith('data:'):self.images.append({'url':urllib.parse.urljoin(self.url,src),'alt':a.get('alt',''),'width':a.get('width'),'height':a.get('height')})
 def handle_endtag(self,t):
  if t=='main':self.main=False
  if t in ['script','style']:self.skip=max(0,self.skip-1)
 def handle_data(self,d):
  if self.main and not self.skip and d.strip():self.text.append(d.strip())
def fetch(url):
 req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
 with urllib.request.urlopen(req,timeout=45) as r:return r.read(),r.geturl(),r.headers.get('Content-Type')
def collect(pair):
 i,u=pair;id=f'W{i:02}';url=BASE+u;file=OUT/(id+'.html')
 try:
  data,final,mime=fetch(url);file.write_bytes(data);p=Parser(final);p.feed(data.decode('utf8','replace'))
  images=[];seen=set()
  for im in p.images:
   identity=im['url'].split('?')[0]
   if identity in seen:continue
   seen.add(identity);images.append(im)
  row={'id':id,'url':url,'resolvedUrl':final,'fetchedAt':datetime.now(timezone.utc).isoformat(),'sha256':hashlib.sha256(data).hexdigest(),'htmlPath':str(file),'text':'\n'.join(p.text),'images':images,'links':list(dict.fromkeys(p.links)),'status':'available'}
 except Exception as e:row={'id':id,'url':url,'status':'unavailable','error':str(e)}
 return row
rows=list(concurrent.futures.ThreadPoolExecutor(4).map(collect,enumerate(urls,1)))
(OUT/'online-pages.json').write_text(json.dumps(rows,indent=2))
for r in rows: print(json.dumps({k:r.get(k) for k in ['id','url','status','error']}),len(r.get('text','')),len(r.get('images',[])))
