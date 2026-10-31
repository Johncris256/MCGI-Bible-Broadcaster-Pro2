'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const WebSocket = require('ws');

async function getFreePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', (error) => error ? reject(error) : resolve()));
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

function waitForServer(child, expectedPort, timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error(`Server did not start. Output:\n${output}`)), timeoutMs);
    const onData = (chunk) => {
      output += chunk.toString();
      const match = output.match(/Local: http:\/\/localhost:(\d+)\//);
      if (match) {
        clearTimeout(timer);
        child.stdout.off('data', onData);
        resolve(Number(match[1]));
      }
    };
    child.stdout.on('data', onData);
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Server exited before ready (code ${code}). Output:\n${output}`));
    });
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function openWebSocket(url, cookie, origin) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, { headers: { Cookie: cookie, Origin: origin } });
    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error('WebSocket connection timeout'));
    }, 5000);
    ws.once('open', () => { clearTimeout(timer); resolve(ws); });
    ws.once('error', (error) => { clearTimeout(timer); reject(error); });
  });
}

function nextMessage(ws, predicate = () => true, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off('message', onMessage);
      reject(new Error('Timed out waiting for WebSocket message'));
    }, timeoutMs);
    const onMessage = (raw) => {
      let data;
      try { data = JSON.parse(raw.toString()); } catch { return; }
      if (!predicate(data)) return;
      clearTimeout(timer);
      ws.off('message', onMessage);
      resolve(data);
    };
    ws.on('message', onMessage);
  });
}

async function postJson(baseUrl, pathname, body, cookie, origin = baseUrl) {
  return fetch(`${baseUrl}${pathname}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

test('V2 server: auth, same-origin protection, API compatibility, state sync and slot locks', async (t) => {
  const root = path.resolve(__dirname, '../../..');
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bbl-v2-server-'));
  const sessionFile = path.join(tempDir, 'session-cache.json');
  const port = await getFreePort();
  const pin = 'V2-Integration-Test-PIN-2026';
  const secret = 'test-only-session-secret-should-be-more-than-thirty-two-bytes';
  const child = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      BBL_ACCESS_PIN: pin,
      BBL_SESSION_SECRET: secret,
      BBL_SESSION_CACHE_FILE: sessionFile,
      BBL_HOST_ALLOWLIST: '127.0.0.1,localhost',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  t.after(async () => {
    if (child.exitCode === null) child.kill('SIGTERM');
    await new Promise((resolve) => {
      if (child.exitCode !== null) return resolve();
      child.once('exit', resolve);
      setTimeout(resolve, 1500).unref();
    });
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const actualPort = await waitForServer(child, port);
  const baseUrl = `http://127.0.0.1:${actualPort}`;

  // Una unauthenticated device is sent to the local PIN page.
  const rootResponse = await fetch(`${baseUrl}/`, { redirect: 'manual' });
  assert.equal(rootResponse.status, 302);
  assert.match(rootResponse.headers.get('location'), /^\/login\?/);

  const unauthenticatedApi = await fetch(`${baseUrl}/api/live-session`, { redirect: 'manual' });
  assert.equal(unauthenticatedApi.status, 302);

  const wrongPin = await postJson(baseUrl, '/api/auth/login', { pin: 'incorrect-pin' });
  assert.equal(wrongPin.status, 401);

  const login = await postJson(baseUrl, '/api/auth/login', { pin });
  assert.equal(login.status, 200);
  assert.equal((await login.json()).ok, true);
  const setCookie = login.headers.get('set-cookie');
  assert.ok(setCookie && setCookie.includes('HttpOnly') && setCookie.includes('SameSite=Strict'));
  const cookie = setCookie.split(';')[0];

  const health = await fetch(`${baseUrl}/api/health`, { headers: { Cookie: cookie } });
  assert.equal(health.status, 200);
  assert.equal((await health.json()).ok, true);

  const badOrigin = await postJson(baseUrl, '/api/pastor-tap', { type: 'SET_SLOT_HIGHLIGHT', slotIndex: 0 }, cookie, 'https://attacker.example');
  assert.equal(badOrigin.status, 403);

  const staticApp = await fetch(`${baseUrl}/operator/`, { headers: { Cookie: cookie } });
  assert.equal(staticApp.status, 200);
  assert.match(staticApp.headers.get('content-security-policy') || '', /frame-ancestors 'self'/);
  assert.equal(staticApp.headers.get('access-control-allow-origin'), null);

  const privateFile = await fetch(`${baseUrl}/server.js`, { headers: { Cookie: cookie } });
  assert.equal(privateFile.status, 404);
  const translations = await fetch(`${baseUrl}/api/translations`, { headers: { Cookie: cookie } });
  assert.equal(translations.status, 200);
  assert.ok((await translations.json()).some((item) => item.id === 'ANG DATING BIBLIA'));

  const invalidSlot = await postJson(baseUrl, '/api/slave-action', {
    type: 'SLAVE_SLOT_PACKET', action: 'JOIN', slotIndex: null, operatorName: 'One', clientId: 'one',
  }, cookie);
  assert.equal(invalidSlot.status, 400);

  const joinOne = await postJson(baseUrl, '/api/slave-action', {
    type: 'SLAVE_SLOT_PACKET', action: 'JOIN', slotIndex: 0, operatorName: 'Operator One', clientId: 'client-one',
  }, cookie);
  assert.equal(joinOne.status, 200);
  assert.equal((await joinOne.json()).locked, false);

  const joinTwo = await postJson(baseUrl, '/api/slave-action', {
    type: 'SLAVE_SLOT_PACKET', action: 'JOIN', slotIndex: 0, operatorName: 'Operator Two', clientId: 'client-two',
  }, cookie);
  assert.equal(joinTwo.status, 200);
  assert.equal((await joinTwo.json()).locked, true);

  const pilotResponse = await fetch(`${baseUrl}/api/pilots?since=0`, { headers: { Cookie: cookie } });
  const pilotData = await pilotResponse.json();
  assert.equal(pilotData.pilots[0].name, 'Operator One');
  assert.ok(pilotData.queue.some((item) => item.action === 'JOIN'));

  const wsUrl = `ws://127.0.0.1:${actualPort}/`;
  const ws1 = await openWebSocket(wsUrl, cookie, baseUrl);
  const ws2 = await openWebSocket(wsUrl, cookie, baseUrl);
  t.after(() => { ws1.close(); ws2.close(); });

  const stateUpdate = { slots: [{ reference: 'JUAN 3:16', words: ['Sapagkat', 'gayon'] }], displayMode: 1 };
  const stateReceived = nextMessage(ws2, (data) => Array.isArray(data.slots) && data.slots[0]?.reference === 'JUAN 3:16');
  ws1.send(JSON.stringify(stateUpdate));
  assert.equal((await stateReceived).slots[0].words.length, 2);

  const dualTransportAction = {
    type: 'SLAVE_SLOT_PACKET', action: 'TOGGLE_HIGHLIGHT', slotIndex: 1, wordIndex: 2,
    packetId: 'test-packet-id-0001',
  };
  ws1.send(JSON.stringify(dualTransportAction));
  await new Promise((resolve) => setTimeout(resolve, 100));
  let currentPilots = await (await fetch(`${baseUrl}/api/pilots?since=1`, { headers: { Cookie: cookie } })).json();
  assert.equal(currentPilots.queue.filter((item) => item.action === 'TOGGLE_HIGHLIGHT').length, 1);

  const actionOverHttp = await postJson(baseUrl, '/api/slave-action', dualTransportAction, cookie);
  assert.equal(actionOverHttp.status, 200);
  assert.equal((await actionOverHttp.json()).duplicate, true);
  currentPilots = await (await fetch(`${baseUrl}/api/pilots?since=1`, { headers: { Cookie: cookie } })).json();
  assert.equal(currentPilots.queue.filter((item) => item.action === 'TOGGLE_HIGHLIGHT').length, 1);

  const payloadString = JSON.stringify(stateUpdate);
  const saveSession = await postJson(baseUrl, '/api/live-session', {
    batch: { bible_live_payload: payloadString, bible_live_timestamp: String(Date.now()) },
  }, cookie);
  assert.equal(saveSession.status, 200);
  const stored = JSON.parse(await fs.readFile(sessionFile, 'utf8'));
  assert.equal(stored.localStorageBackup.bible_live_payload, payloadString);

  const outputBroadcast = await postJson(baseUrl, '/api/output-broadcast', {
    type: 'SET_SLOT_HIGHLIGHT', slotIndex: 0, wordIndex: 1, isHighlighted: true,
  }, cookie);
  assert.equal(outputBroadcast.status, 200);

  const outputStream = await fetch(`${baseUrl}/api/output-stream`, { headers: { Cookie: cookie } });
  assert.equal(outputStream.status, 200);
  const reader = outputStream.body.getReader();
  let initialOutput = '';
  while (!initialOutput.includes('SET_SLOT_HIGHLIGHT')) {
    const chunk = await reader.read();
    if (chunk.done) break;
    initialOutput += new TextDecoder().decode(chunk.value);
  }
  assert.match(initialOutput, /JUAN 3:16/);
  assert.match(initialOutput, /SET_SLOT_HIGHLIGHT/);
  await reader.cancel();

  const latestClient = await openWebSocket(wsUrl, cookie, baseUrl);
  const initialState = await nextMessage(latestClient, (data) => Array.isArray(data.slots));
  assert.equal(initialState.slots[0].reference, 'JUAN 3:16');
  latestClient.close();

  const externalWs = await new Promise((resolve) => {
    const ws = new WebSocket(wsUrl, { headers: { Cookie: cookie, Origin: 'https://attacker.example' } });
    ws.once('open', () => { ws.close(); resolve(false); });
    ws.once('error', () => resolve(true));
  });
  assert.equal(externalWs, true);
  assert.equal(stderr.includes('Request failed'), false, stderr);
});