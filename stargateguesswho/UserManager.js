const randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function getRandomString(length) {
    let result = '';
    for ( let i = 0; i < length; i++ ) {
        result += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }
    return result;
}

/*
Manages a collection of users with a name and authentication.

@author: Peter Mitchell
@version: 2022.1
 */
class UserManager {
    users = []

    // Initialises with an empty set of users.
    constructor() {

    }

    // Adds a new user with the specified name and a random auth code that is returned.
    addUser(playerName) {
        let playerAuth = getRandomString(16);
        let user = {
            playerName : playerName,
            playerAuth : playerAuth
        };
        this.users.push(user);
        console.log(`Added user ${playerName} with auth: \"${playerAuth}\".`);
        return user;
    }

    // Gets a player based on the auth code provided if one exists.
    getUser(playerAuth) {
        let player = this.users.find(p => p.playerAuth === playerAuth);
        if(player === undefined) {
            return {error : "Could not found player matching those credentials."};
        } else {
            return player;
        }
    }
}

module.exports = UserManager;