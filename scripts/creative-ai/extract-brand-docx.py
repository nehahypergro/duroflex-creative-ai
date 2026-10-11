"""Index DOCX text and embedded raster media without executing document content."""
import sys,json,zipfile,pathlib,xml.etree.ElementTree as ET
from PIL import Image
src,out=map(pathlib.Path,sys.argv[1:3]);W='{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
with zipfile.ZipFile(src) as z:
    items=z.infolist()
    if len(items)>12000 or sum(i.file_size for i in items)>300_000_000:raise ValueError('Document archive exceeds indexing limits')
    def xml(name):
        if z.getinfo(name).file_size>8_000_000:raise ValueError('XML exceeds indexing limits')
        data=z.read(name)
        if b'<!DOCTYPE' in data or b'<!ENTITY' in data:raise ValueError('External XML entities are not allowed')
        return ET.fromstring(data)
    doc=xml('word/document.xml');texts=[''.join(t.text or '' for t in p.iter(W+'t')) for p in doc.iter(W+'p')]
    for name in z.namelist():
        if name.startswith(('word/header','word/footer')) and name.endswith('.xml'):texts+=[''.join(t.text or '' for t in p.iter(W+'t')) for p in xml(name).iter(W+'p')]
    full='\n'.join(texts)
    if len(full)>2_000_000:raise ValueError('Use a document with under 2 million text characters')
    slides=[{'slide':i+1,'text':full[n:n+12000],'notes':'','hidden':False,'hasImages':False} for i,n in enumerate(range(0,max(1,len(full)),12000))]
    visuals=[]
    for name in z.namelist():
        if not name.startswith('word/media/') or not name.lower().endswith(('.png','.jpg','.jpeg','.webp')):continue
        if len(visuals)>=40:break
        if z.getinfo(name).file_size>20_000_000:continue
        import io
        with Image.open(io.BytesIO(z.read(name))) as im:
            if im.width*im.height>40_000_000:raise ValueError('Embedded image exceeds pixel limit')
            im.thumbnail((1600,1600));im=im.convert('RGB');idx=len(visuals)+1;im.save(out.parent/f'{out.stem}-slide-{idx}.jpg',quality=88)
            visuals.append({'slide':idx,'width':im.width,'height':im.height,'method':'Actual embedded DOCX image; not a page-layout rendering.'})
    # Text section numbers and embedded image numbers are independent; preserve images as extra sections.
    for i,v in enumerate(visuals):
        old=out.parent/f'{out.stem}-slide-{v["slide"]}.jpg';number=len(slides)+i+1;temp=out.parent/f'{out.stem}-embedded-{number}.jpg';old.replace(temp);v['slide']=number
    for v in visuals:
        (out.parent/f'{out.stem}-embedded-{v["slide"]}.jpg').replace(out.parent/f'{out.stem}-slide-{v["slide"]}.jpg')
        slides.append({'slide':v['slide'],'text':'','notes':'Actual embedded image. Its original document layout is not reconstructed.','hidden':False,'hasImages':True})
    result={'version':1,'format':'docx','slideCount':len(slides),'slides':slides,'visuals':visuals,'textCoverage':f'All native body, table, header and footer text indexed in {len(slides)-len(visuals)} sections; {len(visuals)} embedded images retained (maximum 40). Layout, tracked deletions and annotations are not interpreted as approved guidance.'}
out.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
