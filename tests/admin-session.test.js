const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const GameSessionManager = require('../stargateguesswho/GameSessionManager');
const GameSession = require('../stargateguesswho/GameSession');

function buildKillSessionHandler() {
  const entries = [];
  const manager = Object.create(GameSessionManager.prototype);
  manager.sessions = [new GameSession(0, 'AAAAA'), new GameSession(7, 'GGGGG')];
  manager.logManager = { write(entry) { entries.push(entry); } };
  const routes = new Map();
  const app = {
    use() {},
    get() {},
    post(url, ...handlers) { routes.set(url, handlers.at(-1)); },
    listen() { return {}; }
  };
  const express = () => app;
  express.json = () => () => {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../stargateguesswho/app.js'), 'utf8'), {
    require(name) {
      if (name === 'express') return express;
      if (name === './GameSessionManager') return function () { return manager; };
      if (name === './LogManager') return function () { return manager.logManager; };
      return require(name);
    },
    __dirname: path.join(__dirname, '../stargateguesswho'),
    process: { env: {} },
    console: { log() {} }
  });
  return {
    manager,
    entries,
    request(body) {
      const response = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(data) { this.body = JSON.parse(JSON.stringify(data)); return this; }
      };
      routes.get('/admin/api/actions/kill-session')({ body }, response);
      return response;
    }
  };
}

for (const body of [{ sessionID: 7 }, { sessionID: '7' }, { sessionID: 0 }, { sessionID: '0' }, { sessionCode: 'GGGGG' }]) {
  test(`kill-session removes the matching session for ${JSON.stringify(body)}`, () => {
    const { request, manager, entries } = buildKillSessionHandler();
    const response = request(body);
    const sessionID = body.sessionID !== undefined ? Number(body.sessionID) : 7;
    const sessionCode = sessionID === 0 ? 'AAAAA' : 'GGGGG';
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, { success: true, sessionID, sessionCode });
    assert.equal(manager.sessions.length, 1);
    assert.ok(manager.sessions.every(session => session.sessionID !== sessionID));
    assert.equal(entries.at(-1).event, 'session.removedByAdmin');
    assert.equal(entries.at(-1).sessionID, sessionID);
    assert.equal(entries.at(-1).sessionCode, sessionCode);
    assert.equal(request(body).statusCode, 404);
  });
}

test('kill-session rejects malformed or ambiguous identifiers without removing sessions', () => {
  const { request, manager } = buildKillSessionHandler();
  const invalidBodies = [
    undefined, null, {}, { sessionID: '' }, { sessionID: ' ' },
    { sessionID: null }, { sessionID: false }, { sessionID: true },
    { sessionID: [] }, { sessionID: [0] }, { sessionID: {} },
    { sessionID: -1 }, { sessionID: 1.5 }, { sessionID: '1e0' },
    { sessionID: '0x0' }, { sessionID: Number.MAX_SAFE_INTEGER + 1 },
    { sessionCode: null }, { sessionCode: 0 }, { sessionCode: 'ggggg' },
    { sessionCode: 'GGGG' }, { sessionCode: 'GGGGGG' }, { sessionCode: '12345' },
    { sessionID: 0, sessionCode: 'GGGGG' }
  ];
  for (const body of invalidBodies) {
    const response = request(body);
    assert.equal(response.statusCode, 400, JSON.stringify(body));
    assert.match(response.body.error, /valid session ID/);
    assert.equal(manager.sessions.length, 2);
  }
});

test('kill-session reports missing sessions by either identifier', () => {
  const { request, manager } = buildKillSessionHandler();
  for (const body of [{ sessionID: 99 }, { sessionCode: 'ZZZZZ' }]) {
    const response = request(body);
    assert.equal(response.statusCode, 404);
    assert.deepEqual(response.body, { error: 'Game session not found.' });
    assert.equal(manager.sessions.length, 2);
  }
});

function buildDashboard(confirmResult = true) {
  const elements = new Map();
  const requests = [];
  const confirmations = [];
  const createElement = () => ({
    value: '',
    children: [],
    handlers: {},
    addEventListener(event, handler) { this.handlers[event] = handler; },
    replaceChildren() { this.children = []; },
    appendChild(child) { this.children.push(child); }
  });
  const context = {
    document: {
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, createElement());
        return elements.get(id);
      },
      querySelectorAll() { return []; },
      createElement
    },
    sessionStorage: { getItem() { return null; }, setItem() {} },
    window: { scrollY: 0, scrollTo() {} },
    confirm(message) { confirmations.push(message); return confirmResult; },
    async fetch(url, options) {
      requests.push({ url, options });
      return { ok: true, async json() { return { success: true, sessions: [] }; } };
    }
  };
  const html = fs.readFileSync(path.join(__dirname, '../stargateguesswho/admin.html'), 'utf8');
  vm.createContext(context);
  vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
  return { context, elements, requests, confirmations, html };
}

test('Sessions titles include both code and ID, including ID zero', () => {
  const { context, elements, html } = buildDashboard();
  assert.match(html, /aria-label="Session ID or code"/);
  assert.doesNotMatch(html, /id="game-id" inputmode="numeric"/);
  context.renderSessions([{
    sessionID: 0, sessionCode: 'AAAAA', playerCount: 0, playerLimit: 2,
    players: [], round: 0, secondsSinceActivity: 0
  }]);
  assert.match(elements.get('sessions').children[0].innerHTML, /<h2>Session AAAAA \(ID: 0\)<\/h2>/);
});

test('kill-session form submits IDs and normalized codes and refreshes sessions', async () => {
  for (const [input, expected] of [['0', { sessionID: '0' }], ['7', { sessionID: '7' }], [' ggggg ', { sessionCode: 'GGGGG' }]]) {
    const { context, elements, requests, confirmations } = buildDashboard();
    context.document.getElementById('game-id').value = input;
    await elements.get('kill-session-form').handlers.submit({ preventDefault() {} });
    assert.deepEqual(JSON.parse(requests[0].options.body), expected);
    assert.equal(requests[0].url, '/admin/api/actions/kill-session');
    assert.equal(requests[0].options.method, 'POST');
    assert.equal(requests[1].url, '/admin/api/sessions');
    assert.equal(confirmations.length, 1);
  }
});

test('cancelling kill-session confirmation does not send a request', async () => {
  const { context, elements, requests } = buildDashboard(false);
  context.document.getElementById('game-id').value = 'GGGGG';
  await elements.get('kill-session-form').handlers.submit({ preventDefault() {} });
  assert.equal(requests.length, 0);
});
