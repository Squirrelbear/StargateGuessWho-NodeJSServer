/*
Stargate Guess Who: NodeJS Server
This project is designed to work alongside a Unity client communicating over HTTP.

@author: Peter Mitchell
@version 2022.1
 */

const express = require('express');
const path = require('path');
const GameSessionManager = require('./GameSessionManager');

const gameSessionManager = new GameSessionManager();
const app = express();

function requireAdminToken(req, res, next)
{
    const configuredToken = process.env.ADMIN_TOKEN;
    const authorization = req.get('authorization') || '';

    if (!configuredToken)
    {
        return res.status(503).json({error : 'Admin dashboard is not configured.'});
    }

    if (authorization !== `Bearer ${configuredToken}`)
    {
        return res.status(401).json({error : 'Missing or invalid admin token.'});
    }

    next();
}

app.get('/', (req,res)=>{
    res.json(gameSessionManager.handleAction(req.query, res));
});

app.get('/admin', (req,res)=>{
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/admin/api/sessions', requireAdminToken, (req,res)=>{
    res.json({sessions : gameSessionManager.getAdminSummaries()});
});

app.listen(7000);
console.log("Server ready.");