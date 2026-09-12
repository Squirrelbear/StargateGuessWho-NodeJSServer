const GameSession = require('./GameSession');
const UserManager = require('./UserManager');
const GameQueryValidator = require('./GameQueryValidator');

const userManager = new UserManager();
const randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function getRandomString(length)
{
    let result = '';
    for (let i = 0; i < length; i++) {
        result += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }
    return result;
}

/*
Manages the collection of all active sessions with automatic timeouts to remove inactive sessions.

@author: Peter Mitchell
@version: 2022.1
 */
class GameSessionManager
{
    sessions = [];
    sessionCounter = 0;
    timeoutDuration = 60 * 30; // time in seconds

    // Initialises the default state and starts the 1-second interval validation of sessions for removal.
    constructor(logManager)
    {
        this.logManager = logManager;
        setInterval(this.updateSessions.bind(this), 1000);
        console.log("Game Session Manager Loaded.");
    }

    // Starts a new session and adds the specified user to the session. A unique session code is generated to identify it.
    startSession(user)
    {
        // Get a unique session code
        let sessionCode = getRandomString(5);
        while (this.sessions.find(s => s.sessionCode === sessionCode) !== undefined)
        {
            sessionCode = getRandomString(5);
        }

        let session = new GameSession(this.sessionCounter, sessionCode);
        this.sessionCounter++;
        session.addPlayer(user.playerName, user.playerAuth);
        this.sessions.push(session);

        this.logManager.write({category : 'session', event : 'session.created', sessionID : session.sessionID, sessionCode : session.sessionCode, playerName : user.playerName, details : {playerID : session.players[0].playerID}});

        console.log(user.playerName + " started a new session with id " + session.sessionID + " and code " + session.sessionCode + ".");

        return session;
    }

    // Searches the sessions and returns a session matching the sessionCode if one exists.
    getSessionByCode(sessionCode)
    {
        return this.sessions.find(s => s.sessionCode === sessionCode);
    }

    // Gets a list of session codes that the player exists in. Useful for recovering games if the player has to restart.
    getAllSessionsForPlayer(playerAuth)
    {
        let currentSessions = [];
        this.sessions.forEach(session => {
            if (session.getPlayerWithAuth(playerAuth) !== undefined)
            {
                currentSessions.push(session.sessionCode);
            }
        });
        return currentSessions;
    }

    getAdminSummaries()
    {
        return this.sessions.map(session => ({
            sessionID : session.sessionID,
            sessionCode : session.sessionCode,
            playerCount : session.players.length,
            playerLimit : session.playerLimit,
            players : session.players.map(player => ({
                name : player.name,
                playerID : player.playerID,
                gameNum : player.gameNum,
                chosenID : player.chosenID,
                guessID : player.guessID,
                lastChosenID : player.lastChosenID,
                lastGuessID : player.lastGuessID
            })),
            round : session.players.length > 0 ? session.players[0].gameNum : 0,
            secondsSinceActivity : session.getTimeSinceLastInteraction(),
            state : session.getDataForState(false)
        }));
    }

    // Updates all sessions to remove sessions that have had no updates for timeoutDuration or longer.
    updateSessions()
    {
        let sessionCount = this.sessions.length;
        this.sessions = this.sessions.filter(session => session.getTimeSinceLastInteraction() < this.timeoutDuration);
        if (sessionCount !== this.sessions.length)
        {
            this.logManager.write({category : 'session', event : 'session.expired', details : {removed : sessionCount - this.sessions.length, active : this.sessions.length}});
            console.log("Removed " + (sessionCount - this.sessions.length) + " session(s) for no activity over " + this.timeoutDuration + "s. Active: " + this.sessions.length);
        }
    }

    // Validates the raw query data dependent on the action and then calls an appropriate method to handle the query.
    handleAction(rawData)
    {
        let {error, value} = GameQueryValidator.validate(rawData);
        if (error)
        {
            console.log(error);
            return {error : "Failed validation.", errorData : error};
        }
        
        let actionQuery = value;
        const user = actionQuery.playerAuth ? userManager.getUser(actionQuery.playerAuth) : undefined;
        const session = actionQuery.sessionCode ? this.getSessionByCode(actionQuery.sessionCode) : undefined;
        const sessionPlayer = session && user && !user.error ? session.getPlayerWithAuth(actionQuery.playerAuth) : undefined;
        const eventDetails = {action : actionQuery.action};
        const actionDetails = {action : actionQuery.action};
        if (actionQuery.action === 'characterCommand')
        {
            eventDetails.characterAction = actionQuery.characterAction;
            eventDetails.characterID = actionQuery.characterID;
            actionDetails.characterAction = actionQuery.characterAction;
            actionDetails.characterID = actionQuery.characterID;
        }
        if (user && !user.error)
        {
            eventDetails.playerName = user.playerName;
        }
        this.logManager.write({category : 'server', event : 'request.received', details : eventDetails});
        if (user && !user.error)
        {
            this.logManager.write({category : 'player', event : `player.${actionQuery.action}`, playerName : user.playerName, playerID : sessionPlayer && sessionPlayer.playerID, sessionID : session && session.sessionID, sessionCode : actionQuery.sessionCode, details : actionDetails});
        }
        else if (actionQuery.action === 'createPlayer')
        {
            this.logManager.write({category : 'player', event : 'player.created', playerName : actionQuery.playerName});
        }
        if (session)
        {
            this.logManager.write({category : 'session', event : `session.${actionQuery.action}`, sessionID : session.sessionID, sessionCode : session.sessionCode, playerName : user && !user.error ? user.playerName : undefined, playerID : sessionPlayer && sessionPlayer.playerID, details : actionDetails});
        }

        if (actionQuery.action === 'createServer')
        {
            const user = userManager.getUser(actionQuery.playerAuth);
            if (user && user.error)
            {
                return {error : 'User does not exist.'};
            }

            let session = this.startSession(user);
            return {sessionCode : session.sessionCode};
        }
        else if (actionQuery.action === 'createPlayer')
        {
            return userManager.addUser(actionQuery.playerName);
        }
        else if (actionQuery.action === 'startGame')
        {
            return this.handleStartGame(actionQuery);
        }
        else if (actionQuery.action === 'getState')
        {
            return this.handleGetState(actionQuery);
        }
        else if (actionQuery.action === 'characterCommand')
        {
            return this.handleCharacterCommand(actionQuery);
        }
        else if (actionQuery.action === 'joinServer')
        {
            return this.handleJoinSession(actionQuery);
        }
        else if (actionQuery.action === 'setCharacterCollection')
        {
            return this.handleSetCharacterCollection(actionQuery);
        }
        else if (actionQuery.action === 'testconnection')
        {
            return {success : true};
        }
        else
        {
            return {error : "Unknown action command."};
        }
    }

    // Starts the next round of a game based on a session code and is authenticated that the player is allowed to start it.
    handleStartGame(actionQuery)
    {
        let session = this.getSessionByCode(actionQuery.sessionCode);
        if (session === undefined)
        {
            return {error : "Server not found. May have expired or incorrect code."};
        }

        if (session.players.length < session.playerLimit)
        {
            return {error : "A second player is required to start the game."};
        }

        let userInGame = session.getPlayerWithAuth(actionQuery.playerAuth);
        if (userInGame === undefined)
        {
            return {error : "Missing authentication."};
        }
        else
        {
            session.startNextRound();
            return {success : true};
        }
    }

    handleJoinSession(actionQuery)
    {
        let session = this.getSessionByCode(actionQuery.sessionCode);
        if (session === undefined)
        {
            return {error : "Server not found. May have expired or incorrect code."};
        }

        let user = userManager.getUser(actionQuery.playerAuth);
        if (user.error)
        {
            return {error : "User does not exist."};
        }

        let addResult = session.addPlayer(user.playerName, user.playerAuth);
        if (addResult.error)
        {
            return {error : addResult.error};
        }

        // Begin the game with the first round immediately.
        session.startNextRound();

        return {success : true, characterCollection : session.characterCollection};
    }

    // Returns the JSON representing the current state of the session.
    handleGetState(actionQuery)
    {
        let session = this.getSessionByCode(actionQuery.sessionCode);
        if (session === undefined)
        {
            return {error : "Server not found. May have expired or incorrect code."};
        }

        let userInGame = session.getPlayerWithAuth(actionQuery.playerAuth);
        if (userInGame === undefined)
        {
            return {error : "Missing authentication."};
        }
        else
        {
            return session.getDataForState();
        }
    }

    // Handles any type of command related to a character
    handleCharacterCommand(actionQuery)
    {
        let session = this.getSessionByCode(actionQuery.sessionCode);
        if (session === undefined)
        {
            return {error : "Server not found. May have expired or incorrect code."};
        }

        let userInGame = session.getPlayerWithAuth(actionQuery.playerAuth);
        if (userInGame === undefined)
        {
            return {error : "Missing authentication."};
        }
        else
        {
            const previousState = session.getDataForState(false);
            const result = session.applyCharacterCommand(actionQuery);

            if (result && result.success)
            {
                const updatedState = session.getDataForState(false);
                this.logManager.write({
                    category : 'session',
                    event : 'session.characterCommand',
                    sessionID : session.sessionID,
                    sessionCode : session.sessionCode,
                    playerName : userInGame.name,
                    playerID : userInGame.playerID,
                    details : {
                        action : actionQuery.action,
                        characterAction : actionQuery.characterAction,
                        characterID : actionQuery.characterID,
                        previousState,
                        updatedState
                    }
                });
            }

            return result;
        }
    }

    handleSetCharacterCollection(actionQuery)
    {
        let session = this.getSessionByCode(actionQuery.sessionCode);
        if (session === undefined)
        {
            return {error : "Server not found. May have expired or incorrect code."};
        }

        let userInGame = session.getPlayerWithAuth(actionQuery.playerAuth);
        if (userInGame === undefined)
        {
            return {error : "Missing authentication."};
        }
        else
        {
            return session.setCharacterCollection(actionQuery);
        }
    }
}

module.exports = GameSessionManager;