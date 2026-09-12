# Guess Who: Stargate - NodeJS Server

## Interactive game simulator

With the server running, use the built-in simulator to create Alice and Bob,
start a session, join Bob, and play scripted rounds interactively:

```text
cd stargateguesswho
npm run simulate-game
```

The simulator pauses before every action. Press Enter to send the displayed
request, including both players choosing characters, asking questions with
`setDown` and `setUp`, submitting guesses, and reading the completed state.
After each round it pauses before player 1 starts the next round. The simulator
continues until it is stopped with `Ctrl+C`.

To use a different server or run a fixed number of rounds:

```text
set SERVER_URL=http://localhost:7001
set ROUNDS=2
npm run simulate-game
```

A server to manage the state and multiplayer synchronisation of a Stargate themed Guess Who game.

The Unity project with details about what the game is about can be found at: ([Github Link](https://github.com/Squirrelbear/StargateGuessWho))

## Example game requests

The server accepts URL query requests at `http://localhost:7000/`. Run these requests in order. The game requires two players. Replace each auth placeholder with the `playerAuth` returned by its create-player request, then replace `<SESSION_CODE>` with the `sessionCode` returned by the create-server request.

Create player 1 (normally run from first client):
```text
http://localhost:7000/?action=createPlayer&playerName=Alice
```

Example response:

```json
{"playerName":"Alice","playerAuth":"<PLAYER_AUTH>"}
```

Create server session ready for other to join (run from first client):

```text
http://localhost:7000/?action=createServer&playerAuth=<PLAYER_AUTH>
```

Example response:

```json
{"sessionCode":"<SESSION_CODE>"}
```

Create player 2 (normally run from second client):

```text
http://localhost:7000/?action=createPlayer&playerName=Bob
```

Example response:

```json
{"playerName":"Bob","playerAuth":"<SECOND_PLAYER_AUTH>"}
```

Player 2 join the server session created by player 1 (normally run from second client):
This starts a new round in the current server session.

```text
http://localhost:7000/?action=joinServer&playerAuth=<SECOND_PLAYER_AUTH>&sessionCode=<SESSION_CODE>
```

Example response:

```json
{"success":true,"characterCollection":"<CHARACTER_COLLECTION>"}
```

## Intended round flow

Each round follows the same flow:

1. Both players set their secret selected character with `characterAction=choose` and `characterID=<id>`.
2. During questioning, each player can toggle characters using `setUp` and `setDown` to reveal or hide candidate characters as they ask about the other player's secret choice.
3. Once each player has enough information, they lock in a guess with `characterAction=guess` and `characterID=<id>`.
4. The server does not resolve the winner itself. The client determines the round outcome by polling `getState` and reading the current `chosenID`, `guessID`, `lastChosenID`, and `lastGuessID` values for each player.
5. When both players have submitted guesses, the client can compare each `guessID` against the opponent's `chosenID` to decide whether it was a win, a loss, or a draw. The host can then start the next round by sending `startGame` again. This resets the state for the next round and repeats the cycle until players choose to stop.

The `getState` snapshot is the authoritative view of the current round state. It includes each player's `name`, `playerID`, `chosenID`, `guessID`, `lastChosenID`, `lastGuessID`, and the `characterStates` array, followed by the shared `characterCollection`.

Example request sequence for a full round:

```text
http://localhost:7000/?action=characterCommand&playerAuth=<PLAYER_AUTH>&sessionCode=<SESSION_CODE>&characterAction=choose&characterID=5
http://localhost:7000/?action=characterCommand&playerAuth=<SECOND_PLAYER_AUTH>&sessionCode=<SESSION_CODE>&characterAction=choose&characterID=9
http://localhost:7000/?action=characterCommand&playerAuth=<PLAYER_AUTH>&sessionCode=<SESSION_CODE>&characterAction=setDown&characterID=9
http://localhost:7000/?action=characterCommand&playerAuth=<SECOND_PLAYER_AUTH>&sessionCode=<SESSION_CODE>&characterAction=setUp&characterID=5
http://localhost:7000/?action=characterCommand&playerAuth=<PLAYER_AUTH>&sessionCode=<SESSION_CODE>&characterAction=guess&characterID=9
http://localhost:7000/?action=characterCommand&playerAuth=<SECOND_PLAYER_AUTH>&sessionCode=<SESSION_CODE>&characterAction=guess&characterID=2
http://localhost:7000/?action=getState&playerAuth=<PLAYER_AUTH>&sessionCode=<SESSION_CODE>
```

Example `getState` response:

```json
[
  {
    "name": "Alice",
    "playerID": 0,
    "lastChosenID": -1,
    "lastGuessID": -1,
    "chosenID": 5,
    "guessID": 9,
    "characterStates": [{"id":0,"isUp":true}, {"id":1,"isUp":false}]
  },
  {
    "name": "Bob",
    "playerID": 1,
    "lastChosenID": -1,
    "lastGuessID": -1,
    "chosenID": 9,
    "guessID": 2,
    "characterStates": [{"id":0,"isUp":true}, {"id":1,"isUp":true}]
  },
  {
    "characterCollection": "0E10142735393A3B414C4D54677C899CA0A2B3BA"
  }
]
```

A round is effectively complete once both players have a non-negative `guessID` value. The client can infer the outcome by checking whether each player's `guessID` matches the other player's `chosenID`:

- both players correct => draw
- one player correct => that player wins
- neither player correct => no winner, round still finished but no player guessed correctly

When the current round is completed, a new round can be started with: startGame

```text
http://localhost:7000/?action=startGame&playerAuth=<PLAYER_AUTH>&sessionCode=<SESSION_CODE>
```

Example response:

```json
{"success":true}
```

## Admin dashboard

Start the server with an admin token configured:

```powershell
$env:ADMIN_TOKEN = "use-a-long-random-value"
node app.js
```

Open `http://localhost:7000/admin` and enter the configured token. The dashboard is read-only and refreshes every 10 seconds. Session data is available only through the bearer-token-protected `/admin/api/sessions` endpoint.

## Server logs

The server writes one append-only JSON Lines file per server process to `stargateguesswho/logs`. Each event has an ISO 8601 `timestamp`, an `instanceID`, a category (`server`, `player`, or `session`), and event-specific identifiers. Set `LOG_DIR` to use a different storage directory. Set `PORT` to use a different HTTP port.

The Logs view in the admin dashboard can select the current or any previous server instance and filter by event category, player name or ID, and session code or ID. The protected API endpoints are `/admin/api/logs/instances` and `/admin/api/logs`; omitting filters from the latter returns all events for the selected instance.

