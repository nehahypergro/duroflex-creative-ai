"""Index native PDF text and render actual pages; never run document actions."""
import json
import pathlib
import subprocess
import sys

from pypdf import PdfReader
from PIL import Image

source, output, renderer = sys.argv[1:4]
source, output = pathlib.Path(source), pathlib.Path(output)
with source.open('rb') as stream:
    if stream.read(5) != b'%PDF-':
        raise ValueError('PDF signature does not match the filename')
reader = PdfReader(str(source))
if reader.is_encrypted:
    raise ValueError('Use an unencrypted PDF so every page can be indexed')
count = len(reader.pages)
if not 1 <= count <= 500:
    raise ValueError('Use a PDF with 1–500 pages')
pages = []
for number, page in enumerate(reader.pages, 1):
    text = (page.extract_text() or '').strip()
    pages.append({'slide': number, 'page': number, 'hidden': False,
                  'text': text, 'notes': '', 'hasImages': True,
                  'textStatus': 'native-text' if text else 'no-native-text',
                  'textNote': '' if text else 'No native text was extracted. Inspect the actual page image; no wording or guidance was inferred.'})
prefix = output.with_suffix('')
subprocess.run([renderer, '-f', '1', '-l', str(count), '-scale-to', '1600',
                '-jpeg', '-jpegopt', 'quality=85', str(source), str(prefix) + '-slide'],
               check=True, capture_output=True, timeout=600)
visuals = []
for number in range(1, count + 1):
    matches = [p for p in output.parent.glob(prefix.name + '-slide-*.jpg')
               if int(p.stem.rsplit('-', 1)[1]) == number]
    if len(matches) != 1:
        raise ValueError(f'Actual PDF page {number} was not rendered')
    image = matches[0]
    target = output.parent / f'{prefix.name}-slide-{number}.jpg'
    with Image.open(image) as decoded:
        decoded.verify()
    with Image.open(image) as decoded:
        width, height = decoded.size
    if image != target:
        image.replace(target)
    visuals.append({'slide': number, 'page': number, 'width': width, 'height': height,
                    'method': 'Actual source PDF page rendered with Poppler; no invented artwork.'})
text_pages = sum(bool(p['text']) for p in pages)
result = {'version': 2, 'format': 'pdf', 'pageCount': count, 'slideCount': count,
          'slides': pages, 'visuals': visuals, 'nativeTextPages': text_pages,
          'textCoverage': f'All {count} pages indexed in source order; {text_pages} contain extractable native text. All {count} actual page images are available. Image-only text and layout require visual inspection; no OCR or invented guidance.'}
with output.open('w', encoding='utf8') as stream:
    json.dump(result, stream, ensure_ascii=False, indent=2)
print(json.dumps({'pages': count, 'nativeTextPages': text_pages, 'visuals': len(visuals)}))
