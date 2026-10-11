import json, os, subprocess
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
root=Path(__file__).resolve().parents[2]
node=Path(os.environ.get('STUDIO_NODE_BINARY',str(Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node')))
rows=json.loads(subprocess.check_output([str(node),str(root/'scripts/placements/production-presets.js')],cwd=root))
out=root/'output/pdf/india-print-production-calibration.pdf'
out.parent.mkdir(parents=True,exist_ok=True)
c=canvas.Canvas(str(out), pagesize=A4); W,H=A4;page=0
c.setTitle('India print and outdoor - calibration and production checks')
def header(title,sub):
 global page
 page+=1;c.setFillColorRGB(.15,.12,.19);c.setFont('Helvetica-Bold',19);c.drawString(18*mm,H-22*mm,title);c.setFont('Helvetica',10);c.drawString(18*mm,H-30*mm,sub)
def footer():
 c.setFont('Helvetica',8);c.setFillColorRGB(.35,.35,.35);c.drawString(18*mm,12*mm,'Duroflex / Sleepyhead Studio | India | 9 October 2026 | Production evidence, not approval');c.drawRightString(W-18*mm,12*mm,str(page));c.showPage()
def para(text,y,size=11,width=174):
 c.setFont('Helvetica',size);words=[];line='';lines=[]
 for token in text.split():
  part=''
  for char in token:
   if c.stringWidth(part+char,'Helvetica',size)>width*mm:
    words.append(part);part=''
   part+=char
  if part:words.append(part)
 for word in words:
  candidate=(line+' '+word).strip()
  if c.stringWidth(candidate,'Helvetica',size)>width*mm and line:lines.append(line);line=word
  else:line=candidate
 if line:lines.append(line)
 for line in lines:c.drawString(18*mm,y*mm,line);y-=size*1.35/mm
 return y-3
header('Print calibration - A4, 100%','Use Actual Size. Turn off Fit, Shrink, borderless expansion and duplex.')
y=para('This page tests scale and close-reading samples on your office printer. It is not a proof of a campaign artwork, press colour, substrate, or outdoor readability.',249)
c.setStrokeColorRGB(0,0,0);c.setLineWidth(.8);c.line(18*mm,220*mm,68*mm,220*mm)
for x in [18,68]:c.line(x*mm,217*mm,x*mm,223*mm)
c.setFont('Helvetica-Bold',12);c.drawString(18*mm,207*mm,'This line must measure 50 mm on paper.')
c.setFont('Helvetica',10);c.drawString(18*mm,199*mm,'Studio scale tolerance: 49.5-50.5 mm. Reprint if outside this range.')
c.rect(18*mm,85*mm,100*mm,100*mm);c.setFont('Helvetica',10);c.drawString(21*mm,172*mm,'100 x 100 mm square - measure both axes')
for size,y in [(12,153),(14,135),(16,117)]:c.setFont('Helvetica',size);c.drawString(21*mm,y*mm,f'{size} pt: Comfort, details and terms.')
y=para('Inspect the actual generated artwork separately. Clear sample type cannot certify that rasterized campaign copy uses this size or remains readable.',72)
para('Record printer, paper, print setting, measured ruler length, observer and date. Use a press/stock sample to check colour and finishing.',y)
footer()
header('Physical checks & operator handoff','Record what was actually inspected on the exact file version.')
y=252
for title,body in [
 ('1. Lock the specification','Printer/operator and exact product template reference. Confirm finished dimensions, bleed, safe margins, stock/GSM, folds, die cuts, duplex order, cassette/eyelet/seam keep-outs, ICC/file requirements and finished-size PPI.'),
 ('2. Check the generated files','Use the Studio master, calibrated proof packet and preflight report. A blocked or pending check is not cleared by download. Raster/PDF-X/CMYK/vector requirements must match the chosen vendor.'),
 ('3. Print and measure','Print A4 tiles at Actual Size / 100%. Measure every calibration line. Assemble full coverage tiles using the indicated overlap. Large-format samples are partial and do not prove the whole installation.'),
 ('4. Read in context','Use actual distance, eye level, light/glare, motion and available reading time. Read all essential claims and adjacent terms without zoom. Check folds, hanging holes, stands and mounting do not hide them.'),
 ('5. Examine production samples','Check product/brand colour on the chosen stock and printing process, laminate/finish, fold/trim alignment, mounting and front/back order. An office-printer test cannot establish commercial colour accuracy.'),
 ('6. Save evidence','Enter who checked it, the operator specification/approval reference and observed findings in Studio. Evidence is bound to master and proof hashes. A revised file needs new checks; manufacture remains the operator release decision.')]:
 c.setFont('Helvetica-Bold',12);c.drawString(18*mm,y*mm,title);y-=8;y=para(body,y,10.5);y-=3
footer()
for start in range(0,len(rows),16):
 header('Format production inventory',f'All 43 embedded print presets | {start+1}-{min(start+16,len(rows))} of {len(rows)}')
 y=251
 for p in rows[start:start+16]:
  s=p['print'];c.setFont('Helvetica-Bold',9.5);c.drawString(18*mm,y*mm,p['name'].replace('·','-')[:90]);y-=5
  info=f"{s['trimWidthMm']:g} x {s['trimHeightMm']:g} mm; {p['pages']} face(s); bleed {s['bleedMm']:g} mm; safe {s['safeMm']:g} mm; fold {s['fold']}"
  c.setFont('Helvetica',9);c.drawString(18*mm,y*mm,info);y-=7
 para('These are editable Studio starting sizes, not vendor specifications. Replace them with the exact chosen Indian printer/operator template before preparing artwork. Display resolution, source detail and press acceptance remain separate.',47,10.5)
 footer()
header('India sources & limits','Primary vendor guidance checked on 9 October 2026.')
y=250
sources=[
 ('VistaPrint India - exact product specifications','https://www.vistaprint.in/customer-care/help-centre/360052259431','Use the selected product specs/templates for size, bleed, safety, stock and finish. Numeric margins are product-specific.'),
 ('VistaPrint India - colour changes','https://www.vistaprint.in/customer-care/help-centre/360060410851','RGB-to-CMYK printing can shift colours; a physical stock/process sample is needed for brand/product colour.'),
 ('PrintStop India - artwork FAQ','https://www.printstop.co.in/faq.php','The FAQ calls for artwork above 300 dpi and explains bleed, trim and safe margins. This is vendor guidance, not a universal OOH PPI target.'),
 ('Printo India - standard poster uploads','https://printopro.printo.in/standard-posters-1634/upload/','Selected product templates define full bleed and safety; the upload guidance calls for 300 dpi.'),
 ('Adobe Acrobat - tiling large documents','https://helpx.adobe.com/acrobat/desktop/print-documents/set-up-and-print-pdfs/large-documents.html','Poster tiling has scale, overlap, marks and labels. Studio A4 proof packets already use physical 1:1 crops; print those pages at 100%.'),
 ('OAAA - print production reference','https://oaaa.org/wp-content/uploads/2022/09/Print-Production-Specifications3.pdf','Supplemental outdoor production reference. The selected Indian operator controls mechanical scale, seams, stock, resolution and installation requirements.')]
for title,url,body in sources:
 c.setFont('Helvetica-Bold',10.5);c.drawString(18*mm,y*mm,title);y-=6
 # Short clickable label plus human-readable host/path split to avoid clipping.
 c.setFillColorRGB(.18,.2,.5);link_top=y;y=para(url,y,8.5);c.linkURL(url,(18*mm,(y+3)*mm,192*mm,(link_top+4)*mm),relative=0);c.setFillColorRGB(.15,.12,.19);y=para(body,y,10);y-=3
footer();c.save();print(out)
