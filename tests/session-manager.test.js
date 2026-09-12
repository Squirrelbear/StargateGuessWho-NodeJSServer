const test = require('node:test');
const assert = require('node:assert/strict');

const GameSessionManager = require('../stargateguesswho/GameSessionManager');

const buildManager = () => new GameSessionManager({ write() {} });

test('createServer rejects a nonexistent player auth', () => {
  const manager = buildManager();

  const result = manager.handleAction({
    action: 'createServer',
    playerAuth: 'abcdefghijklmnop'
  });

  assert.deepEqual(result, { error: 'User does not exist.' });
});
