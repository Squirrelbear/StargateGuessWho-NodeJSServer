/*
Stargate Guess Who: NodeJS Server
This project is designed to work alongside a Unity client communicating over HTTP.

@author: Peter Mitchell
@version 2022.1
 */

const express = require('express');
const GameSessionManager = require('./GameSessionManager');

const gameSessionManager = new GameSessionManager();
const app = express();

app.get('/', (req,res)=>{
    res.json(gameSessionManager.handleAction(req.query, res));
});

app.listen(3000);
console.log("Server ready.");