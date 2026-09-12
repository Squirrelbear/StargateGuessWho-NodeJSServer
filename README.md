# Guess Who: Stargate - NodeJS Server

A server to manage the state and multiplayer synchronisation of a Stargate themed Guess Who game.

The Unity project with details about what the game is about can be found at: ([Github Link](https://github.com/Squirrelbear/StargateGuessWho))

## Example game requests

The server accepts URL query requests at `http://localhost:7000/`. Run these requests in order. The game requires two players. Replace each auth placeholder with the `playerAuth` returned by its create-player request, then replace `<SESSION_CODE>` with the `sessionCode` returned by the create-server request.

```text
http://localhost:7000/?action=createPlayer&playerName=Alice
```

Example response:

```json
{"playerName":"Alice","playerAuth":"<PLAYER_AUTH>"}
```

```text
http://localhost:7000/?action=createServer&playerAuth=<PLAYER_AUTH>
```

Example response:

```json
{"sessionCode":"<SESSION_CODE>"}
```

```text
http://localhost:7000/?action=createPlayer&playerName=Bob
```

Example response:

```json
{"playerName":"Bob","playerAuth":"<SECOND_PLAYER_AUTH>"}
```

```text
http://localhost:7000/?action=joinServer&playerAuth=<SECOND_PLAYER_AUTH>&sessionCode=<SESSION_CODE>
```

Example response:

```json
{"success":true,"characterCollection":"<CHARACTER_COLLECTION>"}
```

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

