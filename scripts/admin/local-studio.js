'use strict';
// Persistent, localhost-only development deployment. Atlas uses admin-server.js.
const fs = require('node:fs/promises');
const path = require('node:path');
const net = require('node:net');
const crypto = require('node:crypto');

async function assertFree(port) {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(port, '127.0.0.1', () => probe.close(resolve));
  });
}

async function start({root = path.resolve(__dirname, '../..'), port = 1842,
  mongoPort = 28571, privateDir = path.join(root, 'work/admin-private'),
  binaryDir = path.join(root, 'work/mongodb-binaries'),
  createRepl, connect, createApp} = {}) {
  await assertFree(port);
  await assertFree(mongoPort);
  await fs.mkdir(path.join(privateDir, 'database'), {recursive: true, mode: 0o700});
  await fs.chmod(privateDir, 0o700);
  const tokenFile = path.join(privateDir, 'setup-token');
  let setupToken;
  try { setupToken = await fs.readFile(tokenFile, 'utf8'); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    setupToken = crypto.randomBytes(32).toString('base64url');
    await fs.writeFile(tokenFile, setupToken, {mode: 0o600, flag: 'wx'});
  }
  let repl, client, app;
  let closing;
  const close = () => closing ||= (async () => {
    if (app?.server.listening) await new Promise(resolve => app.server.close(resolve));
    if (client) await client.close();
    if (repl) await repl.stop({doCleanup: false, force: false});
  })();
  try {
    createRepl ||= options => require('mongodb-memory-server').MongoMemoryReplSet.create(options);
    connect ||= uri => new (require('mongodb').MongoClient)(uri).connect();
    createApp ||= options => require('../../admin-server').createAdminServer(options);
    repl = await createRepl({binary: {downloadDir: binaryDir},
      instanceOpts: [{dbPath: path.join(privateDir, 'database'), port: mongoPort}],
      replSet: {count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1'}});
    client = await connect(repl.getUri());
    app = await createApp({client, db: client.db('creative_ai_admin_pilot'),
      sourceRoot: root, setupToken, studio: true, preview: false});
    // createAdminServer explicitly sets resumeJobs:false; opening Studio cannot resume a batch.
    await new Promise((resolve, reject) => {
      app.server.once('error', reject);
      app.server.listen(port, '127.0.0.1', resolve);
    });
    await fs.writeFile(path.join(privateDir, 'deployment.json'), JSON.stringify({
      url: `http://127.0.0.1:${port}/admin`, sourceRoot: root,
      startedAt: new Date().toISOString(), pid: process.pid,
      database: 'Persistent local MongoDB; Atlas deferred', automaticJobResumption: false, componentRecoveryVersion: 1, editorChatEnabled: app.runtime?.editorChatEnabled === true
    }, null, 2), {mode: 0o600});
    return {app, close};
  } catch (error) { await close(); throw error; }
}

async function run() {
  const service = await start();
  console.log('Creative AI with login and admin is ready at http://127.0.0.1:1842/admin. Automatic batch resumption is disabled.');
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, async () => {
    await service.close(); process.exit(0);
  });
  return service;
}
if (require.main === module) run().catch(() => {
  console.error('Studio could not start. Check that ports 1842/28571 are free and the local database is available. No unauthenticated fallback was started.');
  process.exitCode = 1;
});
module.exports = {start, run};
