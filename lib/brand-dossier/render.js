'use strict';
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { SECTIONS } = require('./contract');
const TITLES = { overview: 'Brand at a glance', products: 'Products & priorities', identity: 'Visual identity', tone: 'How the brand speaks', creative: 'Creative references', ads: 'Meta ad observations', opportunities: 'Continuity & exploration', conflicts: 'Questions to resolve' };
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function pagesFor(d) {
  const sources = new Map(d.sources.map(s => [s.id, s]));
  const attribution = ids => ids.map(id => { const s = sources.get(id); return `${s.id}: ${s.label} | ${s.reference} | collected ${s.collectedAt}`; }).join('\n');
  const pages = [{ title: d.brandName, subtitle: 'Brand research dossier', cards: [{ title: d.demo ? 'DEMONSTRATION / NOT LIVE RESEARCH' : 'Research snapshot', text: `${d.demo ? 'All sample findings and artwork below demonstrate the layout only. No brand research has been performed.\n' : ''}Completed ${d.completedAt}\nResearch ${d.researchId}\n${d.sources.length} source records / ${d.assets.length} candidate assets. Source access is reported separately from findings.` }] }];
  const chunk = (title, subtitle, cards) => { for (let i = 0; i < cards.length; i += 2) pages.push({ title, subtitle, cards: cards.slice(i, i + 2) }); };
  chunk('Source coverage', 'Available, partial, and unavailable sources', d.sources.map(s => ({ title: `${s.kind.toUpperCase()} / ${s.status}`, text: `${s.label}\n${s.note || 'Source supplied for review.'}`, citation: attribution([s.id]) })));
  const represented = new Set();
  for (const section of SECTIONS) {
    const findings = d.findings.filter(f => f.section === section);
    const cards = findings.map(f => {
      const asset = d.assets.find(a => f.assetIds?.includes(a.id));
      if (asset) represented.add(asset.id);
      return { title: `${f.basis.toUpperCase()}${f.direction ? ' / ' + f.direction : ''} / ${f.title}`, text: f.text, image: asset?.imageData, imageLabel: asset ? `${asset.label}${asset.imageData ? '' : ' / image unavailable'}` : undefined, citation: attribution([...new Set([...f.sourceIds, ...(asset?.sourceIds || [])])]) };
    });
    if (section === 'identity' || section === 'creative' || section === 'ads') {
      for (const a of d.assets.filter(a => !represented.has(a.id) && (section === 'identity' ? ['logo', 'product', 'reference'].includes(a.kind) : section === 'ads' ? a.kind === 'ad' : ['creative', 'screenshot'].includes(a.kind)))) {
        represented.add(a.id); cards.push({ title: a.label, text: `${a.kind} candidate reference${a.imageData ? '' : '\nImage unavailable; only the inventory record was supplied.'}`, image: a.imageData, imageLabel: a.label, citation: attribution(a.sourceIds) });
      }
    }
    if (cards.length) chunk(TITLES[section], section === 'ads' ? 'Library observations do not establish conversions or performance.' : 'Evidence and inference are labeled on each finding.', cards);
  }
  const missing = ['site', 'product', 'guidelines', 'asset', 'social', 'meta'].filter(kind => !d.sources.some(s => s.kind === kind && s.status !== 'unavailable'));
  if (missing.length) pages.push({ title: 'Evidence gaps', subtitle: 'Scope the next research pass', cards: [{ title: 'MISSING / UNAVAILABLE', text: `No accessible evidence for: ${missing.join(', ')}.\nNo findings are inferred from unavailable sources. Meta collection and API coverage remain unverified. Performance cannot be inferred from library visibility.` }] });
  chunk('Source appendix', 'Full inventory is preserved in the downloadable research JSON.', d.sources.map(s => ({ title: `${s.id} / ${s.label}`, text: `${s.reference}\nCollected ${s.collectedAt}\n${s.kind} / ${s.status}${s.advertiserId ? '\nAdvertiser: ' + s.advertiserId : ''}${s.note ? '\n' + s.note : ''}` })));
  return pages;
}
function renderHtml(d, base = '') {
  const pages = pagesFor(d);
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(d.brandName)} dossier</title><style>
  *{box-sizing:border-box}body{margin:0;background:#e9eee9;color:#182d28;font:16px/1.5 system-ui}nav{padding:18px 5%;background:#183b32;color:white;display:flex;gap:20px;flex-wrap:wrap}a{color:inherit}main{max-width:1200px;margin:30px auto;padding:0 20px}.page{background:#fffdf7;margin:24px 0;padding:44px;border-radius:12px}h1{font-size:40px;line-height:1.1;margin:8px 0 18px}h2{font-size:18px}.eyebrow{font-size:12px;letter-spacing:2px;color:#61756c}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;margin:30px 0}article{background:#edf2eb;padding:24px;border-radius:8px;overflow-wrap:anywhere}p{white-space:pre-wrap}img{width:100%;height:230px;object-fit:contain;background:#fff}small{display:block;white-space:pre-wrap;font-size:11px;overflow-wrap:anywhere;color:#52665b}.badge{background:#ffde92;color:#342811;padding:6px 12px;border-radius:4px}footer{font-size:12px;color:#63776d}@media(max-width:700px){.grid{grid-template-columns:1fr}.page{padding:24px}h1{font-size:30px}}@media print{nav{display:none}body{background:white}main{padding:0}.page{break-after:page;box-shadow:none}}
  </style><nav><b>Creative AI / Research dossier</b>${d.demo ? '<span class="badge">DEMONSTRATION</span>' : ''}${base ? `<a href="${esc(base)}/pdf">Download PDF</a><a href="${esc(base)}/json">Full research inventory</a>` : ''}</nav><main>${pages.map((p, i) => `<section class="page"><div class="eyebrow">${d.demo ? 'SAMPLE TEMPLATE' : 'RESEARCH'} / ${esc(p.subtitle)}</div><h1>${esc(p.title)}</h1><div class="grid">${p.cards.map(c => `<article><h2>${esc(c.title)}</h2>${c.image ? `<img src="${esc(c.image)}" alt="${esc(c.imageLabel)}"><small>${esc(c.imageLabel)}</small>` : ''}<p>${esc(c.text)}</p><small>${esc(c.citation)}</small></article>`).join('')}</div><footer>${i + 1} / ${pages.length} · ${esc(d.brandName)} · ${esc(d.completedAt)}</footer></section>`).join('')}</main></html>`;
}
// Card images are either embedded data URLs or, for compact dossiers, a source the
// caller resolves to bytes. pdf-lib reads the whole underlying ArrayBuffer, so pass a
// standalone copy: small decoded Buffers share Node's pool and start mid-buffer.
async function imageBytes(src, resolveImage) {
  if (src.startsWith('data:')) return { bytes: Uint8Array.from(Buffer.from(src.slice(src.indexOf(',') + 1), 'base64')), png: src.startsWith('data:image/png') };
  if (!resolveImage) throw new Error('Dossier image source needs a resolver');
  const { bytes, png } = await resolveImage(src);
  return { bytes: Uint8Array.from(bytes), png };
}
async function renderPdf(d, { resolveImage } = {}) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  // Standard font fallback keeps unsupported characters visible as '?' rather than failing export.
  const clean = value => [...String(value ?? '').normalize('NFKD')].map(c => { if (c === '\n') return c; try { font.encodeText(c); return c; } catch { return '?'; } }).join('');
  const pages = pagesFor(d);
  function wrap(value, size, width) {
    const lines = [];
    for (const para of clean(value).split('\n')) {
      let line = '';
      for (const word of para.split(/\s+/)) {
        // Break long URLs and tokens without dropping attribution.
        for (let start = 0; start < word.length;) {
          let end = start + 1;
          while (end <= word.length && font.widthOfTextAtSize(word.slice(start, end), size) <= width) end++;
          const piece = word.slice(start, Math.max(start + 1, end - 1));
          const candidate = line ? line + ' ' + piece : piece;
          if (font.widthOfTextAtSize(candidate, size) > width && line) { lines.push(line); line = piece; } else line = candidate;
          start += piece.length;
          if (start < word.length) { lines.push(line); line = ''; }
        }
      }
      lines.push(line);
    }
    return lines;
  }
  for (const [index, p] of pages.entries()) {
    let page = pdf.addPage([960, 640]);
    const header = continued => {
      page.drawRectangle({ x: 0, y: 0, width: 960, height: 640, color: rgb(.99, .98, .95) });
      page.drawText(clean(`${d.demo ? 'DEMONSTRATION / ' : ''}CREATIVE AI / ${p.subtitle}`), { x: 40, y: 598, size: 10, font, color: rgb(.3, .4, .35) });
      const titleLines = wrap(p.title + (continued ? ' (continued)' : ''), 34, 870);
      titleLines.slice(0, 2).forEach((line, n) => page.drawText(line, { x: 40, y: 552 - n * 38, size: 34, font: bold }));
      page.drawText(clean(`${d.brandName} | ${d.completedAt} | Section ${index + 1}/${pages.length}`), { x: 40, y: 24, size: 9, font });
    };
    header(false);
    for (let column = 0; column < p.cards.length; column++) {
      const c = p.cards[column], x = 40 + column * 450, width = 420;
      page.drawRectangle({ x, y: 50, width, height: 440, color: rgb(.93, .95, .91) });
      let y = 465;
      const text = (value, size, type = font) => {
        for (const line of wrap(value, size, width - 28)) {
          if (y < 60) { page = pdf.addPage([960, 640]); header(true); y = 475; }
          page.drawText(line, { x: x + 14, y, size, font: type, color: rgb(.1, .2, .16) }); y -= size * 1.4;
        }
        y -= 12;
      };
      text(c.title, 17, bold);
      if (c.image) {
        const { bytes, png } = await imageBytes(c.image, resolveImage);
        const image = png ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
        const dimensions = image.scaleToFit(width - 28, 210);
        page.drawImage(image, { x: x + (width - dimensions.width) / 2, y: y - dimensions.height, width: dimensions.width, height: dimensions.height });
        y -= dimensions.height + 14; text(c.imageLabel, 11);
      }
      text(c.text, 16);
      if (c.citation) text(c.citation, 10);
    }
  }
  pdf.setTitle(`${d.brandName} - ${d.demo ? 'demonstration ' : ''}brand dossier`);
  return Buffer.from(await pdf.save());
}
module.exports = { pagesFor, renderHtml, renderPdf, imageBytes };
