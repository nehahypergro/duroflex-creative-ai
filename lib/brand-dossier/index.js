'use strict';
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { validateResearch } = require('./contract');
const { renderHtml, renderPdf } = require('./render');
function createDossierStore(root) {
  async function researchCompleted(payload) {
    const d = validateResearch(payload);
    const serialized = JSON.stringify(d, null, 2);
    // Content-addressed immutable versions make repeated handoffs idempotent.
    const id = crypto.createHash('sha256').update(serialized).digest('hex');
    const base = `/dossiers/${id}`;
    const target = path.join(root, id);
    try { await fs.access(path.join(target, 'dossier.pdf')); return { id, viewUrl: base, pdfUrl: `${base}/pdf`, inventoryUrl: `${base}/json` }; } catch {}
    const pdf = await renderPdf(d); // Image decoding must succeed before anything is published.
    await fs.mkdir(root, { recursive: true });
    const staging = await fs.mkdtemp(path.join(root, '.pending-'));
    try {
      await fs.writeFile(path.join(staging, 'research.json'), serialized);
      await fs.writeFile(path.join(staging, 'dossier.html'), renderHtml(d, base));
      await fs.writeFile(path.join(staging, 'dossier.pdf'), pdf);
      try { await fs.rename(staging, target); } catch (error) { if (!['EEXIST', 'ENOTEMPTY'].includes(error.code)) throw error; }
    } finally { await fs.rm(staging, { recursive: true, force: true }); }
    return { id, viewUrl: base, pdfUrl: `${base}/pdf`, inventoryUrl: `${base}/json` };
  }
  async function handle(req, res, pathname, readJsonBody) {
    const send = (status, body, type = 'application/json', attachment) => {
      res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...(attachment ? { 'content-disposition': `attachment; filename="${attachment}"` } : {}) });
      res.end(req.method === 'HEAD' ? undefined : body);
    };
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
    const match = /^\/dossiers\/([a-f0-9]{64})(?:\/(pdf|json))?$/.exec(pathname);
    if (!match) return false;
    const kind = match[2] || 'html';
    const file = kind === 'json' ? 'research.json' : `dossier.${kind}`;
    try { send(200, await fs.readFile(path.join(root, match[1], file)), { html: 'text/html; charset=utf-8', json: 'application/json', pdf: 'application/pdf' }[kind], kind === 'html' ? undefined : file); }
    catch (error) { if (error.code !== 'ENOENT') throw error; send(404, JSON.stringify({ error: 'Dossier not found' })); }
    return true;
  }
  return { researchCompleted, handle };
}
module.exports = { createDossierStore };
