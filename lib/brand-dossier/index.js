'use strict';
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { validateResearch } = require('./contract');
const { renderHtml, renderPdf } = require('./render');

// Storage version 2 (8 Nov 2026). Each dossier folder holds one compact
// research.json. Every embedded picture is saved once as a binary file under
// images/<sha256>.<png|jpg> and shared by all dossiers. The HTML view, PDF and
// full JSON inventory are built when requested, so nothing is saved three times.
// Version-1 folders (research.json with base64 pictures + dossier.html +
// dossier.pdf) are served exactly as they were saved.
const STORAGE_VERSION = 2;
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg' };
const MIME = { png: 'image/png', jpg: 'image/jpeg' };
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
// Replace one field in place so stored and restored records keep their field order.
const swapKey = (object, from, to, value) => Object.fromEntries(Object.entries(object).map(([k, v]) => k === from ? [to, value] : [k, v]));

function createDossierStore(root) {
  const imageDir = path.join(root, 'images');
  const imagePath = image => path.join(imageDir, `${image.sha256}.${EXT[image.mime]}`);
  const imageUrl = image => `/dossiers/images/${image.sha256}.${EXT[image.mime]}`;
  const urls = id => { const base = `/dossiers/${id}`; return { id, viewUrl: base, pdfUrl: `${base}/pdf`, inventoryUrl: `${base}/json` }; };

  async function exists(file, size) {
    try { const stat = await fs.stat(file); return size === undefined || stat.size === size; }
    catch (error) { if (error.code === 'ENOENT') return false; throw error; }
  }
  // Same decoder as the PDF export, so a published dossier can always be exported.
  async function assertDecodable(bytes, png) {
    const { PDFDocument } = require('pdf-lib');
    const pdf = await PDFDocument.create();
    if (png) await pdf.embedPng(Uint8Array.from(bytes)); else await pdf.embedJpg(Uint8Array.from(bytes));
  }
  async function writeImage(image, bytes) {
    const file = imagePath(image), temporary = `${file}.${crypto.randomUUID()}.pending`;
    await fs.mkdir(imageDir, { recursive: true });
    try { await fs.writeFile(temporary, bytes, { flag: 'wx' }); await fs.rename(temporary, file); }
    finally { await fs.rm(temporary, { force: true }); }
  }
  async function readImage(image) {
    const bytes = await fs.readFile(imagePath(image));
    if (sha256(bytes) !== image.sha256) throw new Error('Saved dossier image changed; restore its original file.');
    return bytes;
  }

  async function researchCompleted(payload) {
    const d = validateResearch(payload, { clone: false });
    const pictures = new Map();
    const assets = d.assets.map(asset => {
      if (asset.imageData === undefined) return asset;
      const mime = asset.imageData.startsWith('data:image/png;') ? 'image/png' : 'image/jpeg';
      const bytes = Buffer.from(asset.imageData.slice(asset.imageData.indexOf(',') + 1), 'base64');
      const image = { sha256: sha256(bytes), mime, bytes: bytes.length };
      pictures.set(image.sha256, { image, bytes });
      return swapKey(asset, 'imageData', 'image', image);
    });
    const serialized = JSON.stringify({ ...d, assets, storage: { version: STORAGE_VERSION, images: 'shared' } }, null, 2);
    // Content-addressed immutable versions make repeated handoffs idempotent.
    const id = sha256(serialized), target = path.join(root, id);
    if (await exists(path.join(target, 'research.json'))) return urls(id);
    const fresh = [];
    for (const entry of pictures.values()) if (!(await exists(imagePath(entry.image), entry.image.bytes))) fresh.push(entry);
    for (const { image, bytes } of fresh) await assertDecodable(bytes, image.mime === 'image/png'); // before anything is published
    for (const { image, bytes } of fresh) await writeImage(image, bytes);
    await fs.mkdir(root, { recursive: true });
    const staging = await fs.mkdtemp(path.join(root, '.pending-'));
    try {
      await fs.writeFile(path.join(staging, 'research.json'), serialized);
      try { await fs.rename(staging, target); } catch (error) { if (!['EEXIST', 'ENOTEMPTY'].includes(error.code)) throw error; }
    } finally { await fs.rm(staging, { recursive: true, force: true }); }
    return urls(id);
  }

  // Compact record -> pictures as /dossiers/images URLs (view and PDF) or as the
  // originally supplied data URLs (full inventory download).
  const forView = record => ({ ...record, assets: record.assets.map(a => a.image ? swapKey(a, 'image', 'imageData', imageUrl(a.image)) : a) });
  async function inventory(record) {
    const { storage, ...rest } = record, assets = [];
    for (const a of record.assets) assets.push(a.image ? swapKey(a, 'image', 'imageData', `data:${a.image.mime};base64,${(await readImage(a.image)).toString('base64')}`) : a);
    return { ...rest, assets };
  }
  async function resolveImage(src) {
    const match = /^\/dossiers\/images\/([a-f0-9]{64})\.(png|jpg)$/.exec(src);
    if (!match) throw new Error('Unknown dossier image source');
    return { bytes: await readImage({ sha256: match[1], mime: MIME[match[2]] }), png: match[2] === 'png' };
  }

  async function handle(req, res, pathname, readJsonBody) {
    const send = (status, body, type = 'application/json', attachment) => {
      res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...(attachment ? { 'content-disposition': `attachment; filename="${attachment}"` } : {}) });
      res.end(req.method === 'HEAD' ? undefined : body);
    };
    const notFound = what => send(404, JSON.stringify({ error: `${what} not found` }));
    if (pathname === '/api/dossiers/research-completed' && req.method === 'POST') {
      try { send(201, JSON.stringify(await researchCompleted(await readJsonBody(req, 24_000_000)))); }
      catch (error) { send(error.statusCode || 400, JSON.stringify({ error: error.message })); }
      return true;
    }
    if (!['GET', 'HEAD'].includes(req.method)) return false;
    if (pathname === '/dossiers/demo') {
      const { demoResearch } = require('./demo');
      const result = await researchCompleted(await demoResearch());
      res.writeHead(302, { location: result.viewUrl }); res.end(); return true;
    }
    const picture = /^\/dossiers\/images\/([a-f0-9]{64})\.(png|jpg)$/.exec(pathname);
    if (picture) {
      const image = { sha256: picture[1], mime: MIME[picture[2]] };
      let bytes;
      try { bytes = await readImage(image); } catch (error) { if (error.code !== 'ENOENT') throw error; notFound('Image'); return true; }
      // Content-addressed, so the browser may keep it; the route stays behind Studio access.
      res.writeHead(200, { 'content-type': image.mime, 'cache-control': 'private, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' });
      res.end(req.method === 'HEAD' ? undefined : bytes); return true;
    }
    const match = /^\/dossiers\/([a-f0-9]{64})(?:\/(pdf|json))?$/.exec(pathname);
    if (!match) return false;
    const [, id, kind = 'html'] = match, dir = path.join(root, id);
    const types = { html: 'text/html; charset=utf-8', json: 'application/json', pdf: 'application/pdf' };
    if (await exists(path.join(dir, 'dossier.html'))) { // version 1: serve the saved files
      const file = kind === 'json' ? 'research.json' : `dossier.${kind}`;
      try { send(200, await fs.readFile(path.join(dir, file)), types[kind], kind === 'html' ? undefined : file); }
      catch (error) { if (error.code !== 'ENOENT') throw error; notFound('Dossier'); }
      return true;
    }
    let record;
    try { record = JSON.parse(await fs.readFile(path.join(dir, 'research.json'), 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; notFound('Dossier'); return true; }
    if (record.storage?.version !== STORAGE_VERSION) { notFound('Dossier'); return true; }
    if (kind === 'html') send(200, renderHtml(forView(record), `/dossiers/${id}`), types.html);
    else if (kind === 'pdf') send(200, await renderPdf(forView(record), { resolveImage }), types.pdf, 'dossier.pdf');
    else send(200, JSON.stringify(await inventory(record), null, 2), types.json, 'research.json');
    return true;
  }
  return { researchCompleted, handle };
}
module.exports = { createDossierStore };
