'use strict';
// Regression: every job re-saved the complete brand dossier (research.json,
// dossier.html and dossier.pdf, each embedding every picture as base64).
// Observed 8 Nov 2026: 564 folders / ~180 GB under output/brand-dossiers,
// one 330 MB copy per product, plus a fresh copy whenever the approved-logo
// source was stamped with the time the job read it.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs/promises'), os = require('node:os'), path = require('node:path'), crypto = require('node:crypto');
const sharp = require('sharp');
const { createDossierStore } = require('../../lib/brand-dossier');
const identity = require('../../lib/creative-ai/runtime/approved-identity');

const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');
const solid = (background, format) => sharp({ create: { width: 96, height: 64, channels: 3, background } })[format]().toBuffer();
const dataUrl = (bytes, mime) => `data:${mime};base64,${bytes.toString('base64')}`;

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dossier-storage-'));
  const red = await solid('#d92c25', 'png'), sand = await solid('#d8c8a8', 'png'), photo = await solid('#334455', 'jpeg');
  const research = {
    version: 1, event: 'research.completed', researchId: 'live-test-research', brandName: 'Test Brand', demo: false,
    completedAt: '2026-11-08T00:00:00.000Z',
    sources: [
      { id: 'source-site', kind: 'site', label: 'Official site', reference: 'https://example.com/', collectedAt: '2026-11-07T10:00:00.000Z', status: 'available' },
      { id: 'source-library', kind: 'asset', label: 'Brand library', reference: 'library:test', collectedAt: '2026-11-07T10:00:00.000Z', status: 'available' },
    ],
    assets: [
      { id: 'mood-1', kind: 'reference', label: 'Mood board one', sourceIds: ['source-library'], imageData: dataUrl(sand, 'image/png') },
      { id: 'mood-2', kind: 'reference', label: 'Mood board two', sourceIds: ['source-library'], imageData: dataUrl(photo, 'image/jpeg'), metadata: { note: 'kept' } },
      { id: 'site-shot', kind: 'screenshot', label: 'Homepage', sourceIds: ['source-site'] },
    ],
    findings: [{ section: 'identity', basis: 'evidence', title: 'Palette', text: 'Sand and red.', sourceIds: ['source-library'], assetIds: ['mood-1'] }],
  };
  return { root, red, sand, photo, research };
}

function request(store, pathname, method = 'GET') {
  return new Promise((resolve, reject) => {
    const res = { status: 0, headers: {}, writeHead(status, headers) { this.status = status; this.headers = headers || {}; }, end(body) { resolve({ status: this.status, headers: this.headers, body: body === undefined ? Buffer.alloc(0) : Buffer.from(body) }); } };
    store.handle({ method }, res, pathname, async () => ({})).then(handled => { if (!handled) resolve({ status: 'unhandled' }); }, reject);
  });
}

async function folderFiles(root) {
  const out = {};
  for (const entry of await fs.readdir(root, { withFileTypes: true })) if (entry.isDirectory() && /^[a-f0-9]{64}$/.test(entry.name)) out[entry.name] = (await fs.readdir(path.join(root, entry.name))).sort();
  return out;
}

test('the same research saved by two jobs is stored once, with each picture saved once as a binary file', async () => {
  const { root, red, research } = await fixture();
  const brandId = 'brand-test', logoDir = path.join(root, 'brands', brandId, 'canvas-assets');
  await fs.mkdir(logoDir, { recursive: true }); await fs.writeFile(path.join(logoDir, 'logo.png'), red);
  const runtime = { brands: { dir: id => path.join(root, 'brands', id) } };
  const pin = { brandId, approved: true, kind: 'logo', filename: 'logo.png', sha256: sha256(red), name: 'Test logo', sourceReference: 'User approved test logo', assetId: 'approved-logo-test', sourceId: 'source-approved-logo-test' };
  const store = createDossierStore(path.join(root, 'dossiers'));

  // Two jobs attach the approved logo at different times, as engine.js does per job.
  const first = await identity.attach(runtime, { dossier: research }, pin, brandId);
  await new Promise(r => setTimeout(r, 15));
  const second = await identity.attach(runtime, { dossier: research }, pin, brandId);
  assert.equal(first.dossier.sources.at(-1).collectedAt, second.dossier.sources.at(-1).collectedAt, 'approved-logo source date must not change per job');

  const a = await store.researchCompleted(first.dossier), b = await store.researchCompleted(second.dossier);
  assert.equal(a.id, b.id);
  const folders = await folderFiles(path.join(root, 'dossiers'));
  assert.deepEqual(Object.keys(folders), [a.id]);
  assert.deepEqual(folders[a.id], ['research.json'], 'HTML and PDF are built on request, not saved per job');
  const saved = await fs.readFile(path.join(root, 'dossiers', a.id, 'research.json'), 'utf8');
  assert.equal(saved.includes('data:image'), false, 'pictures are not embedded as text');
  const images = (await fs.readdir(path.join(root, 'dossiers', 'images'))).sort();
  assert.equal(images.length, 3);
  for (const asset of first.dossier.assets.filter(x => x.imageData)) {
    const bytes = Buffer.from(asset.imageData.split(',')[1], 'base64');
    assert.ok(images.includes(sha256(bytes) + (asset.imageData.startsWith('data:image/png') ? '.png' : '.jpg')));
  }
});

test('a dossier for another product reuses saved pictures and adds only its own small record', async () => {
  const { root, research } = await fixture();
  const store = createDossierStore(root);
  const one = await store.researchCompleted(research);
  const other = structuredClone(research);
  other.sources.push({ id: 'source-sku', kind: 'product', label: 'Selected SKU', reference: 'https://example.com/p/2', collectedAt: '2026-11-07T11:00:00.000Z', status: 'available' });
  other.assets.push({ ...structuredClone(research.assets[0]), id: 'sku-photo', kind: 'product', sourceIds: ['source-sku'] });
  const imagesBefore = (await fs.readdir(path.join(root, 'images'))).length;
  const two = await store.researchCompleted(other);
  assert.notEqual(one.id, two.id);
  assert.equal((await fs.readdir(path.join(root, 'images'))).length, imagesBefore, 'no picture is saved twice');
});

test('a compact dossier still opens as a page, a PDF and the full research inventory', async () => {
  const { root, sand, photo, research } = await fixture();
  const store = createDossierStore(root);
  const { id, viewUrl, pdfUrl, inventoryUrl } = await store.researchCompleted(research);

  const page = await request(store, viewUrl);
  assert.equal(page.status, 200);
  const html = page.body.toString('utf8');
  assert.equal(html.includes('data:image'), false);
  const src = `/dossiers/images/${sha256(sand)}.png`;
  assert.ok(html.includes(`src="${src}"`));

  const image = await request(store, src);
  assert.equal(image.status, 200);
  assert.equal(image.headers['content-type'], 'image/png');
  assert.equal(sha256(image.body), sha256(sand));
  assert.equal((await request(store, src, 'HEAD')).status, 200);

  const pdf = await request(store, pdfUrl);
  assert.equal(pdf.status, 200);
  assert.equal(pdf.body.subarray(0, 5).toString(), '%PDF-');
  const { PDFDocument } = require('pdf-lib');
  assert.ok((await PDFDocument.load(pdf.body)).getPageCount() >= 3);

  const inventory = await request(store, inventoryUrl);
  assert.equal(inventory.status, 200);
  assert.deepEqual(JSON.parse(inventory.body.toString('utf8')), research, 'download returns exactly the supplied research, pictures included');
  assert.deepEqual(Object.keys(JSON.parse(inventory.body.toString('utf8')).assets[1]), Object.keys(research.assets[1]), 'field order is preserved');
  assert.equal(sha256(Buffer.from(JSON.parse(inventory.body).assets[1].imageData.split(',')[1], 'base64')), sha256(photo));
  assert.deepEqual((await folderFiles(root))[id], ['research.json'], 'viewing does not write HTML or PDF copies');
});

test('older full-size dossier folders keep serving their saved files unchanged', async () => {
  const { root } = await fixture();
  const id = 'a'.repeat(64), dir = path.join(root, id);
  await fs.mkdir(dir);
  await fs.writeFile(path.join(dir, 'research.json'), '{"legacy":true}');
  await fs.writeFile(path.join(dir, 'dossier.html'), '<p>legacy view</p>');
  await fs.writeFile(path.join(dir, 'dossier.pdf'), '%PDF-legacy');
  const store = createDossierStore(root);
  assert.equal((await request(store, `/dossiers/${id}`)).body.toString(), '<p>legacy view</p>');
  assert.equal((await request(store, `/dossiers/${id}/pdf`)).body.toString(), '%PDF-legacy');
  assert.equal((await request(store, `/dossiers/${id}/json`)).body.toString(), '{"legacy":true}');
  assert.equal((await request(store, `/dossiers/${'b'.repeat(64)}`)).status, 404);
  assert.equal((await request(store, `/dossiers/images/${'c'.repeat(64)}.png`)).status, 404);
});

test('an undecodable picture publishes nothing', async () => {
  const { root, research } = await fixture();
  const broken = structuredClone(research);
  broken.assets[0].imageData = 'data:image/png;base64,' + Buffer.from('not really a png at all').toString('base64');
  const store = createDossierStore(root);
  await assert.rejects(store.researchCompleted(broken));
  const entries = await fs.readdir(root).catch(() => []);
  assert.deepEqual(entries.filter(e => !e.startsWith('.pending-') && e !== 'images'), []);
  const images = await fs.readdir(path.join(root, 'images')).catch(() => []);
  assert.deepEqual(images, [], 'valid pictures from a rejected dossier are not left behind');
});
