"""Read-only OOXML extraction. Never execute macros, links or embedded objects."""
import sys, json, zipfile, posixpath, xml.etree.ElementTree as ET
src, out = sys.argv[1:3]
A = '{http://schemas.openxmlformats.org/drawingml/2006/main}'
P = '{http://schemas.openxmlformats.org/presentationml/2006/main}'
R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
with zipfile.ZipFile(src) as z:
    items = z.infolist()
    if len(items) > 12000 or sum(i.file_size for i in items) > 2_000_000_000:
        raise ValueError('Presentation archive is too large to inspect safely')
    def xml(name):
        if z.getinfo(name).file_size > 5_000_000:
            raise ValueError('XML exceeds inspection limit')
        content = z.read(name)
        if b'<!DOCTYPE' in content or b'<!ENTITY' in content:
            raise ValueError('External XML entities are not allowed')
        return ET.fromstring(content)
    def relationships(name):
        relname = posixpath.join(posixpath.dirname(name), '_rels', posixpath.basename(name) + '.rels')
        if relname not in z.namelist(): return {}
        result = {}
        for rel in xml(relname):
            if rel.get('TargetMode') == 'External': continue
            target = posixpath.normpath(posixpath.join(posixpath.dirname(name), rel.get('Target', ''))) if not rel.get('Target', '').startswith('/') else rel.get('Target').lstrip('/')
            if target.startswith('../'): raise ValueError('Invalid archive relationship')
            result[rel.get('Id')] = (target, rel.get('Type', ''))
        return result
    presentation = xml('ppt/presentation.xml')
    rels = relationships('ppt/presentation.xml')
    order = list(presentation.iter(P + 'sldId'))
    if not order or len(order) > 500: raise ValueError('Use a presentation with 1–500 slides')
    slides = []
    for ordinal, slide in enumerate(order, 1):
        name, kind = rels[slide.get(R + 'id')]
        if not kind.endswith('/slide'): raise ValueError('Invalid slide relationship')
        root = xml(name)
        text = '\n'.join(t.text or '' for t in root.iter(A + 't'))
        notes = ''
        for target, kind in relationships(name).values():
            if kind.endswith('/notesSlide'):
                notes = '\n'.join(t.text or '' for t in xml(target).iter(A + 't'))
        slides.append({'slide': ordinal, 'hidden': root.get('show') == '0', 'text': text, 'notes': notes, 'hasImages': bool(list(root.iter(P + 'pic')))})
    result = {'version': 2, 'slideCount': len(slides), 'slides': slides, 'textCoverage': 'All slide XML text and available notes indexed in presentation order, including hidden slides. Embedded images, charts and video require visual inspection.'}
    with open(out, 'w', encoding='utf8') as f: json.dump(result, f, ensure_ascii=False, indent=2)
