"""Bounded native Word text extraction. No macros, links or embedded objects executed."""
import sys, json, zipfile, xml.etree.ElementTree as ET
W='{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
with zipfile.ZipFile(sys.argv[1]) as z:
    items=z.infolist()
    if len(items)>3000 or sum(i.file_size for i in items)>50_000_000: raise ValueError('Archive too large')
    if len({i.filename for i in items})!=len(items): raise ValueError('Duplicate archive entries')
    if any('vbaproject' in i.filename.lower() for i in items): raise ValueError('Macros unsupported')
    def read(name):
        if z.getinfo(name).file_size>5_000_000: raise ValueError('XML too large')
        raw=z.read(name)
        if b'<!DOCTYPE' in raw.upper() or b'<!ENTITY' in raw.upper(): raise ValueError('Entities unsupported')
        return ET.fromstring(raw)
    names=['word/document.xml']+[i.filename for i in items if i.filename.startswith(('word/header','word/footer','word/footnotes','word/endnotes')) and i.filename.endswith('.xml')]
    lines=[]; uncertain=False
    for name in names:
        root=read(name)
        uncertain=uncertain or any(e.tag in [W+'drawing',W+'pict',W+'altChunk',W+'del',W+'ins'] for e in root.iter())
        for p in root.iter(W+'p'):
            # w:delText excluded; cached field results retained, field instructions ignored.
            text=''.join(e.text or '' if e.tag==W+'t' else '\t' if e.tag==W+'tab' else '\n' if e.tag in [W+'br',W+'cr'] else '' for e in p.iter())
            if text.strip(): lines.append(text)
    text='\n'.join(lines)
    if len(text)>100000: raise ValueError('Text too long')
    print(json.dumps({'text':text,'status':'needs-text' if not text else 'partial' if uncertain else 'extracted','note':'Word body, tables, headers, footers and notes imported as text. Check layout and tracked changes; images and embedded objects are not read.'},ensure_ascii=False))
