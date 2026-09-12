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

test('getDataForState exposes the round snapshot needed to infer win, loss, and draw states', () => {
  const session = new GameSession(0, 'AAAAA');
  session.addPlayer('Alice', 'auth-1');
  session.addPlayer('Bob', 'auth-2');
  session.startNextRound();

  session.applyCharacterCommand({ playerAuth: 'auth-1', characterAction: 'choose', characterID: 5 });
  session.applyCharacterCommand({ playerAuth: 'auth-2', characterAction: 'choose', characterID: 7 });

  session.applyCharacterCommand({ playerAuth: 'auth-1', characterAction: 'setDown', characterID: 7 });
  session.applyCharacterCommand({ playerAuth: 'auth-2', characterAction: 'setUp', characterID: 5 });

  session.applyCharacterCommand({ playerAuth: 'auth-1', characterAction: 'guess', characterID: 7 });
  session.applyCharacterCommand({ playerAuth: 'auth-2', characterAction: 'guess', characterID: 5 });

  const state = session.getDataForState();
  const alice = state[0];
  const bob = state[1];

  assert.equal(alice.chosenID, 5);
  assert.equal(bob.chosenID, 7);
  assert.equal(alice.guessID, 7);
  assert.equal(bob.guessID, 5);
  assert.equal(alice.characterStates[7].isUp, false);
  assert.equal(bob.characterStates[5].isUp, true);
  assert.equal(state[2].characterCollection, '0E10142735393A3B414C4D54677C899CA0A2B3BA');

  const bothHaveGuessed = state.slice(0, 2).every(player => player.guessID !== -1);
  const correctGuesses = state.slice(0, 2).filter(player => player.guessID === (player.playerID === 0 ? bob.chosenID : alice.chosenID)).length;

  assert.equal(bothHaveGuessed, true);
  assert.equal(correctGuesses, 2);
  assert.equal(correctGuesses === 2 ? 'draw' : correctGuesses === 1 ? 'winner' : 'no winner', 'draw');
});

test('round state preserves last round data when the host advances to the next round', () => {
  const session = new GameSession(0, 'BBBBB');
  session.addPlayer('Alice', 'auth-1');
  session.addPlayer('Bob', 'auth-2');
  session.startNextRound();

  session.applyCharacterCommand({ playerAuth: 'auth-1', characterAction: 'choose', characterID: 3 });
  session.applyCharacterCommand({ playerAuth: 'auth-2', characterAction: 'choose', characterID: 9 });
  session.applyCharacterCommand({ playerAuth: 'auth-1', characterAction: 'guess', characterID: 9 });
  session.applyCharacterCommand({ playerAuth: 'auth-2', characterAction: 'guess', characterID: 2 });

  const beforeAdvance = session.getDataForState();
  const advanceResult = session.startNextRound();
  const afterAdvance = session.getDataForState();

  assert.deepEqual(advanceResult, { success: true });
  assert.equal(beforeAdvance[0].lastChosenID, -1);
  assert.equal(beforeAdvance[1].lastGuessID, -1);
  assert.equal(afterAdvance[0].chosenID, -1);
  assert.equal(afterAdvance[0].guessID, -1);
  assert.equal(afterAdvance[1].chosenID, -1);
  assert.equal(afterAdvance[1].guessID, -1);
});

test('admin summaries do not reset the active timer for the session', () => {
  const manager = buildManager();
  const session = new GameSession(0, 'CCCCC');
  session.addPlayer('Alice', 'auth-1');
  session.addPlayer('Bob', 'auth-2');
  manager.sessions.push(session);

  const before = new Date(Date.now() - 60_000);
  session.lastActivityTime = before;
  const summary = manager.getAdminSummaries();
  const after = session.lastActivityTime.getTime();

  assert.equal(summary.length, 1);
  assert.equal(after, before.getTime());
});

test('character command logs include the command and resulting state change', () => {
  const entries = [];
  const manager = new GameSessionManager({ write(entry) { entries.push(entry); } });
  const session = new GameSession(0, 'DDDDD');
  const alice = manager.handleAction({action : 'createPlayer', playerName : 'Alice'});
  const bob = manager.handleAction({action : 'createPlayer', playerName : 'Bob'});
  session.addPlayer(alice.playerName, alice.playerAuth);
  session.addPlayer(bob.playerName, bob.playerAuth);

  manager.sessions.push(session);

  const result = manager.handleAction({
    action: 'characterCommand',
    sessionCode: 'DDDDD',
    playerAuth: alice.playerAuth,
    characterAction: 'setDown',
    characterID: 3
  });

  assert.deepEqual(result, { success: true });

  const commandLog = entries.find(entry => entry.category === 'session' && entry.event === 'session.characterCommand');
  assert.ok(commandLog, 'Expected a character command log entry');
  assert.equal(commandLog.details.characterAction, 'setDown');
  assert.equal(commandLog.details.previousState.characterStates[3].isUp, true);
  assert.equal(commandLog.details.updatedState.characterStates[3].isUp, false);

  const playerCommandLog = entries.find(entry => entry.category === 'player' && entry.event === 'player.characterCommand');
  assert.deepEqual(playerCommandLog.details, {
    action : 'characterCommand',
    characterAction : 'setDown',
    characterID : 3
  });
});
