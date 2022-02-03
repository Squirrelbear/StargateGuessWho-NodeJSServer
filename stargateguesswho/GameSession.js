/*
This class handles the state of a single game session.

@author: Peter Mitchell
@version: 2022.1
 */
class GameSession {
    players = [];
    playerID = 0;

    // Initialises a server with no players with a unique sessionCode.
    constructor(sessionID, sessionCode) {
        this.sessionID = sessionID;
        this.sessionCode = sessionCode;
        this.lastActivityTime = new Date();
    }

    // Adds the specified player to the game, player name must be unique.
    addPlayer(playerName, playerAuth) {
        this.lastActivityTime = new Date();
        let found = false;
        this.players.forEach(player => {
            if(player.name === playerName) {
                found = true;
            }
        });

        if(found) {
            return {error : "Found existing player name."};
        }

        this.players.push({
            name : playerName,
            playerID : this.playerID,
            playerAuth : playerAuth
        });
        this.playerID++;
        return {playerID : this.playerID-1};
    }

    startNextRound() {
        this.lastActivityTime = new Date();


    }

    // Gets the full state of the game session.
    getDataForState() {
        this.lastActivityTime = new Date();

        return {error : "TODO"};
    }

    // Gets the difference between the current time and last time an action was attempted for this session.
    getTimeSinceLastInteraction() {
        let endTime = new Date();
        let timeDiff = endTime - this.lastActivityTime;
        // convert from ms to seconds
        timeDiff /= 1000;

        return Math.round(timeDiff);
    }

    // Returns any player that has the specified auth code within this session.
    getPlayerWithAuth(playerAuth) {
        return this.players.find(p => p.playerAuth === playerAuth);
    }
}

module.exports = GameSession;