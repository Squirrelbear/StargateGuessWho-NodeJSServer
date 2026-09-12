const test = require('node:test');
const assert = require('node:assert/strict');

const GameSessionManager = require('../stargateguesswho/GameSessionManager');
const GameSession = require('../stargateguesswho/GameSession');

const buildManager = () => new GameSessionManager({ write() {} });

test('createServer rejects a nonexistent player auth', () => {
  const manager = buildManager();

  const result = manager.handleAction({
    action: 'createServer',
    playerAuth: 'abcdefghijklmnop'
  });

  assert.deepEqual(result, { error: 'User does not exist.' });
});

test('startNextRound rejects a session with fewer than two players', () => {
  const session = new GameSession(0, 'AAAAA');
  session.addPlayer('Alice', 'auth-1');

  const result = session.startNextRound();

  assert.deepEqual(result, { error: 'A second player is required to start the game.' });
});
