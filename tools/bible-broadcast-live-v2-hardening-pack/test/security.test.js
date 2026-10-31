'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const {
  atomicWriteJson,
  getBearerToken,
  isAllowedPublicPath,
  readJsonBody,
  requireBearerToken,
  requireJsonContentType,
  resolvePublicFile,
  safeResolveStaticPath,
  timingSafeSecretEquals,
  validateSlotIndex,
} = require('../src/security');

const root = path.resolve('/srv/bible-public');

test('safe path allows an ordinary public file', () => {
  assert.equal(safeResolveStaticPath(root, '/operator/index.html'), path.join(root, 'operator', 'index.html'));
  assert.equal(safeResolveStaticPath(root, '/operator/index.html?mode=live'), path.join(root, 'operator', 'index.html'));
});

test('safe path rejects traversal outside the root', () => {
  assert.equal(safeResolveStaticPath(root, '/../../etc/passwd'), null);
  assert.equal(safeResolveStaticPath(root, '/%2e%2e/%2e%2e/etc/passwd'), null);
  assert.equal(safeResolveStaticPath(root, '/..%5c..%5cWindows%5cwin.ini'), null);
  assert.equal(safeResolveStaticPath(root, '/%ZZ'), null);
  assert.equal(safeResolveStaticPath(root, '/%00file'), null);
});

test('public allowlist excludes private root files and sensitive path segments', () => {
  assert.equal(isAllowedPublicPath(root, path.join(root, 'operator', 'index.html'), ['operator', 'output']), true);
  assert.equal(isAllowedPublicPath(root, path.join(root, 'server.js'), ['.']), false);
  assert.equal(isAllowedPublicPath(root, path.join(root, 'package.json'), ['.']), false);
  assert.equal(isAllowedPublicPath(root, path.join(root, '.env'), ['.']), false);
  assert.equal(isAllowedPublicPath(root, path.join(root, '.wrangler', 'state.json'), ['.wrangler']), false);
  assert.equal(isAllowedPublicPath(root, path.join(root, 'operator', '.gitignore'), ['operator']), false);
  assert.equal(isAllowedPublicPath(root, path.join(root, 'operator', 'credentials.json'), ['operator']), false);
  assert.equal(isAllowedPublicPath(root, path.join(root, 'operator-secret', 'x.js'), ['operator']), false);
  assert.equal(isAllowedPublicPath(root, root, ['.']), false);
});

test('existing public-file resolver requires allowlisted regular file', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'bbl-public-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.mkdir(path.join(directory, 'operator'));
  await fs.writeFile(path.join(directory, 'operator', 'index.html'), '<h1>ok</h1>');
  await fs.writeFile(path.join(directory, 'server.js'), 'secret');

  assert.equal(
    await resolvePublicFile(directory, '/operator/index.html', ['operator']),
    path.join(directory, 'operator', 'index.html'),
  );
  assert.equal(await resolvePublicFile(directory, '/server.js', ['.']), null);
  assert.equal(await resolvePublicFile(directory, '/missing.html', ['.']), null);
});

test('existing public-file resolver refuses symlinks escaping the public root', async (t) => {
  if (process.platform === 'win32') return t.skip('Symlink creation may require extra privileges on Windows');
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'bbl-symlink-'));
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'bbl-outside-'));
  t.after(async () => {
    await fs.rm(directory, { recursive: true, force: true });
    await fs.rm(outside, { recursive: true, force: true });
  });
  await fs.writeFile(path.join(outside, 'secret.txt'), 'secret');
  await fs.symlink(outside, path.join(directory, 'public-link'), 'dir');
  assert.equal(await resolvePublicFile(directory, '/public-link/secret.txt', ['public-link']), null);
});

test('slot index accepts only integer values from zero to three', () => {
  assert.equal(validateSlotIndex(0), 0);
  assert.equal(validateSlotIndex('3'), 3);
  for (const value of [-1, 4, 1.5, 'x', null, undefined, true, false, '', '  ']) {
    assert.equal(validateSlotIndex(value), null);
  }
});

test('bearer token extraction and authorization work without query-string secrets', () => {
  const goodReq = { headers: { authorization: 'Bearer my-secret' } };
  assert.equal(getBearerToken(goodReq), 'my-secret');
  assert.equal(getBearerToken({ headers: {} }), null);
  assert.equal(getBearerToken({ url: '/api/update?token=my-secret', headers: {} }), null);
  assert.doesNotThrow(() => requireBearerToken(goodReq, 'my-secret'));
  assert.throws(() => requireBearerToken({ headers: {} }, 'my-secret'), { statusCode: 401 });
  assert.throws(() => requireBearerToken({ headers: { authorization: 'Bearer wrong' } }, 'my-secret'), { statusCode: 401 });
});

test('JSON content type is required for JSON API requests', () => {
  assert.doesNotThrow(() => requireJsonContentType({ headers: { 'content-type': 'application/json; charset=utf-8' } }));
  assert.doesNotThrow(() => requireJsonContentType({ headers: { 'content-type': 'application/problem+json' } }));
  assert.throws(() => requireJsonContentType({ headers: { 'content-type': 'text/plain' } }), { statusCode: 415 });
  assert.throws(() => requireJsonContentType({ headers: {} }), { statusCode: 415 });
});

test('secret comparison requires equal non-empty secrets', () => {
  assert.equal(timingSafeSecretEquals('abc', 'abc'), true);
  assert.equal(timingSafeSecretEquals('abc', 'abd'), false);
  assert.equal(timingSafeSecretEquals('abc', 'abcd'), false);
  assert.equal(timingSafeSecretEquals('', ''), false);
  assert.equal(timingSafeSecretEquals('abc', undefined), false);
});

test('JSON body reader parses a valid object including multibyte UTF-8 chunks', async () => {
  const req = new EventEmitter();
  req.resume = () => {};
  const promise = readJsonBody(req);
  req.emit('data', Buffer.from('{"verse":"Juan '));
  req.emit('data', Buffer.from('3:16 '));
  const emoji = Buffer.from('🙏');
  req.emit('data', emoji.subarray(0, 2));
  req.emit('data', emoji.subarray(2));
  req.emit('data', Buffer.from('"}'));
  req.emit('end');
  assert.deepEqual(await promise, { verse: 'Juan 3:16 🙏' });
});

test('JSON body reader rejects invalid JSON, arrays, null, and oversized requests', async () => {
  for (const raw of ['{bad json', '[]', 'null']) {
    const req = new EventEmitter();
    req.resume = () => {};
    const promise = readJsonBody(req);
    req.emit('data', Buffer.from(raw));
    req.emit('end');
    await assert.rejects(promise, { statusCode: 400 });
  }

  const req = new EventEmitter();
  req.resume = () => {};
  const promise = readJsonBody(req, 4);
  req.emit('data', Buffer.from('12345'));
  await assert.rejects(promise, { statusCode: 413 });
});

test('atomic JSON save writes complete parseable JSON and cleans temporary files', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'bbl-v2-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'session.json');
  await atomicWriteJson(file, { revision: 7, slots: [1, 2, 3, 4] });
  assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')), { revision: 7, slots: [1, 2, 3, 4] });
  await atomicWriteJson(file, { revision: 8, slots: [4, 3, 2, 1] });
  assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')), { revision: 8, slots: [4, 3, 2, 1] });
  const files = await fs.readdir(directory);
  assert.deepEqual(files, ['session.json']);
});
