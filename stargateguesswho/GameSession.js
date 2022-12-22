/*
This class handles the state of a single game session.

@author: Peter Mitchell
@version: 2022.1
 */
class GameSession 
{
    players = [];
    playerID = 0;
    playerLimit = 2;

    // Initialises a server with no players with a unique sessionCode.
    constructor(sessionID, sessionCode) 
    {
        this.sessionID = sessionID;
        this.sessionCode = sessionCode;
        this.lastActivityTime = new Date();
    }

    // Adds the specified player to the game, player name must be unique.
    addPlayer(playerName, playerAuth) 
    {
        if (this.players.length >= this.playerLimit) 
        {
            return {error : "This session is already full."}
        }

        this.lastActivityTime = new Date();
        let found = false;
        this.players.forEach(player => {
            if (player.name === playerName) 
            {
                found = true;
            }
        });

        if (found) 
        {
            return {error : "Found existing player name."};
        }

        let player = {
            gameNum : 0,
            name : playerName,
            playerID : this.playerID,
            playerAuth : playerAuth,
            lastChosenID : -1,
            lastGuessID : -1,
            chosenID : -1,
            guessID : -1,
            characterStates : []
        };

        for (let i = 0; i < 20; i++) 
        {
            player.characterStates.push({ id : i, isUp : true})
        }

        this.playerID++;
        this.players.push(player);

        return {playerID : player.playerID};
    }

    // starts a new round by clearing all the state information back to default and shifts the guess to previous data.
    startNextRound()
    {
        this.lastActivityTime = new Date();

        // This will trigger when the round is already started used for moving to the next round.
        if (this.players[0].guessID === -1 && this.players[1].guessID === -1) 
        {
            let newGameNum = this.players[0].gameNum + 1;

            this.players.forEach(player => {
                player.gameNum = newGameNum;
            });

            console.log(this.sessionID + " started new round: " + newGameNum);

            return;
        }

        this.players.forEach(player => {
            player.lastChosenID = player.chosenID;
            player.lastGuessID = player.guessID;
            player.guessID = -1;
            player.chosenID = -1;
            player.characterStates.forEach(c => c.isUp = true);
        });
    }

    applyCharacterCommand(actionQuery)
    {
        // caller should have already validated that this exists, so no validation needed
        let player = this.getPlayerWithAuth(actionQuery.playerAuth);

        if (actionQuery.characterAction === 'guess')
        {
            player.guessID = actionQuery.characterID;
        } 
        else if (actionQuery.characterAction === 'choose') 
        {
            player.chosenID = actionQuery.characterID;
        } 
        else if (actionQuery.characterAction === 'setUp') 
        {
            let character = player.characterStates.find(c => c.id === actionQuery.characterID);
            if (character === undefined) 
            {
                return {error : "Character does not exist."};
            } 
            else 
            {
                character.isUp = true;
            }
        } 
        else if (actionQuery.characterAction === 'setDown')
        {
            let character = player.characterStates.find(c => c.id === actionQuery.characterID);
            if (character === undefined) 
            {
                return {error : "Character does not exist."};
            } 
            else 
            {
                character.isUp = false;
            }
        } 
        else 
        {
            return {error : "Invalid character command."};
        }

        return {success : true};
    }

    // Gets the full state of the game session.
    getDataForState()
    {
        this.lastActivityTime = new Date();

        // Sends all data except the auth.
        let result = [];
        this.players.forEach(player => {
            result.push({
                name : player.name,
                playerID : player.playerID,
                lastChosenID : player.lastChosenID,
                lastGuessID : player.lastGuessID,
                chosenID : player.chosenID,
                guessID : player.guessID,
                characterStates : player.characterStates
            });
        });

        return result;
    }

    // Gets the difference between the current time and last time an action was attempted for this session.
    getTimeSinceLastInteraction()
    {
        let endTime = new Date();
        let timeDiff = endTime - this.lastActivityTime;
        // convert from ms to seconds
        timeDiff /= 1000;

        return Math.round(timeDiff);
    }

    // Returns any player that has the specified auth code within this session.
    getPlayerWithAuth(playerAuth)
    {
        return this.players.find(p => p.playerAuth === playerAuth);
    }
}

module.exports = GameSession;