import tarfile,json,math,sys
from pathlib import Path
root=Path(__file__).resolve().parents[2]
# Fetch the pinned public npm archive separately, then pass its local path.
archive=sys.argv[1] if len(sys.argv)>1 else '/private/tmp/creative-ai-lucide-1.66.0.tgz'
with tarfile.open(archive) as t:
 nodes=json.load(t.extractfile('package/icon-nodes.json'));tags=json.load(t.extractfile('package/tags.json'));license=t.extractfile('package/LICENSE').read()
def path(tag,a):
 if tag=='path': return a['d']
 if tag=='line':return f"M{a['x1']} {a['y1']}L{a['x2']} {a['y2']}"
 if tag in ['polyline','polygon']:return 'M'+a['points']+('Z' if tag=='polygon' else '')
 if tag in ['circle','ellipse']:
  x=float(a['cx']);y=float(a['cy']);rx=float(a.get('r',a.get('rx',0)));ry=float(a.get('r',a.get('ry',0)))
  return f'M{x-rx} {y}a{rx} {ry} 0 1 0 {2*rx} 0a{rx} {ry} 0 1 0 {-2*rx} 0'
 if tag=='rect':
  x=float(a.get('x',0));y=float(a.get('y',0));w=float(a['width']);h=float(a['height']);r=min(float(a.get('rx',0)),w/2,h/2)
  if not r:return f'M{x} {y}h{w}v{h}h{-w}Z'
  return f'M{x+r} {y}h{w-2*r}a{r} {r} 0 0 1 {r} {r}v{h-2*r}a{r} {r} 0 0 1 {-r} {r}h{-w+2*r}a{r} {r} 0 0 1 {-r} {-r}v{-h+2*r}a{r} {r} 0 0 1 {r} {-r}Z'
 raise Exception(tag)
catalog={k:{'path':' '.join(path(tag,a) for tag,a in v),'tags':tags.get(k,[])} for k,v in nodes.items()}
text='/* Lucide 1.66.0 — ISC/MIT; see vendor/LUCIDE-LICENSE.txt. Locally bundled, no remote requests. */\n(function(root){const catalog='+json.dumps(catalog,separators=(',',':'))+';if(typeof module===\'object\')module.exports=catalog;else root.CreativeIconCatalog=catalog;})(typeof window===\'undefined\'?globalThis:window);\n'
(root/'public/creative-ai/editor-icon-catalog.js').write_text(text)
(root/'public/creative-ai/vendor/LUCIDE-LICENSE.txt').write_bytes(license)
print(len(catalog),'icons',len(text),'bytes')
