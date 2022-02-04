const GameSession = require('./GameSession');
const UserManager = require('./UserManager');
const GameQueryValidator = require('./GameQueryValidator');

const userManager = new UserManager();
const randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function getRandomString(length) {
    let result = '';
    for ( let i = 0; i < length; i++ ) {
        result += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }
    return result;
}

/*
Manages the collection of all active sessions with automatic timeouts to remove inactive sessions.

@author: Peter Mitchell
@version: 2022.1
 */
class GameSessionManager {
    sessions = [];
    sessionCounter = 0;
    timeoutDuration = 60 * 30; // time in seconds

    // Initialises the default state and starts the 1-second interval validation of sessions for removal.
    constructor() {
        setInterval(this.updateSessions.bind(this), 1000);
        console.log("Game Session Manager Loaded.");
    }

    // Starts a new session and adds the specified user to the session. A unique session code is generated to identify it.
    startSession(user) {
        // Get a unique session code
        let sessionCode = getRandomString(5);
        while(this.sessions.find(s => s.sessionCode === sessionCode) !== undefined) {
            sessionCode = getRandomString(5);
        }

        let session = new GameSession(this.sessionCounter, sessionCode);
        this.sessionCounter++;
        session.addPlayer(user.playerName, user.playerAuth);
        this.sessions.push(session);
        console.log(user.playerName + " started a new session with id " + session.sessionID + " and code " + session.sessionCode + ".");
        return session;
    }

    // Searches the sessions and returns a session matching the sessionCode if one exists.
    getSessionByCode(sessionCode) {
        return this.sessions.find(s => s.sessionCode === sessionCode);
    }

    // Gets a list of session codes that the player exists in. Useful for recovering games if the player has to restart.
    getAllSessionsForPlayer(playerAuth) {
        let currentSessions = [];
        this.sessions.forEach(session => {
            if(session.getPlayerWithAuth(playerAuth) !== undefined) {
                currentSessions.push(session.sessionCode);
            }
        });
        return currentSessions;
    }

    // Updates all sessions to remove sessions that have had no updates for timeoutDuration or longer.
    updateSessions() {
        let sessionCount = this.sessions.length;
        this.sessions = this.sessions.filter(session => session.getTimeSinceLastInteraction() < this.timeoutDuration);
        if(sessionCount !== this.sessions.length) {
            console.log("Removed " + (sessionCount - this.sessions.length) + " session(s) for no activity over " + this.timeoutDuration + "s. Active: " + this.sessions.length);
        }
    }

    // Validates the raw query data dependent on the action and then calls an appropriate method to handle the query.
    handleAction(rawData) {
        let {error, value} = GameQueryValidator.validate(rawData);
        if(error) {
            console.log(error);
            return {error : "Failed validation.", errorData : error};
        }
        let actionQuery = value;

        if(actionQuery.action === 'createServer') {
            let session = this.startSession(userManager.getUser(actionQuery.playerAuth));
            return {sessionCode : session.sessionCode};
        } else if(actionQuery.action === 'createPlayer') {
            return userManager.addUser(actionQuery.playerName);
        } else if(actionQuery.action === 'startGame') {
            return this.handleStartGame(actionQuery);
        } else if(actionQuery.action === 'getState') {
            return this.handleGetState(actionQuery);
        } else if(actionQuery.action === 'characterCommand') {
            return this.handleCharacterCommand(actionQuery);
        }
    }

    // Starts the game based on a session code and is authenticated that the player is allowed to start it.
    handleStartGame(actionQuery) {
        let session = this.getSessionByCode(actionQuery.sessionCode);
        if(session === undefined) {
            return {error : "Server not found. May have expired or incorrect code."};
        }
        let userInGame = session.getPlayerWithAuth(actionQuery.playerAuth);
        if(userInGame === undefined) {
            return {error : "Missing authentication."};
        } else {
            session.startNextRound();
            return {success : true};
        }
    }

    // Returns the JSON representing the current state of the session.
    handleGetState(actionQuery) {
        let session = this.getSessionByCode(actionQuery.sessionCode);
        if(session === undefined) {
            return {error : "Server not found. May have expired or incorrect code."};
        }
        let userInGame = session.getPlayerWithAuth(actionQuery.playerAuth);
        if(userInGame === undefined) {
            return {error : "Missing authentication."};
        } else {
            return session.getDataForState();
        }
    }

    // Handles any type of command related to a character
    handleCharacterCommand(actionQuery) {
        let session = this.getSessionByCode(actionQuery.sessionCode);
        if(session === undefined) {
            return {error : "Server not found. May have expired or incorrect code."};
        }
        let userInGame = session.getPlayerWithAuth(actionQuery.playerAuth);
        if(userInGame === undefined) {
            return {error : "Missing authentication."};
        } else {
            return session.applyCharacterCommand(actionQuery);
        }
    }
}

module.exports = GameSessionManager;