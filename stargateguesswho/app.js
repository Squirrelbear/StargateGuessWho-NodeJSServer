/*
Stargate Guess Who: NodeJS Server
This project is designed to work alongside a Unity client communicating over HTTP.

@author: Peter Mitchell
@version 2022.1
 */

const express = require('express');
const path = require('path');
const GameSessionManager = require('./GameSessionManager');
const LogManager = require('./LogManager');

const logManager = new LogManager();
const gameSessionManager = new GameSessionManager(logManager);
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

app.get('/admin/api/logs/instances', requireAdminToken, (req,res)=>{
    res.json({instances : logManager.getInstances(), currentInstanceID : logManager.instanceID});
});

app.get('/admin/api/logs', requireAdminToken, (req,res)=>{
    res.json({
        instanceID : req.query.instanceID || logManager.instanceID,
        logs : logManager.getLogs({
            instanceID : req.query.instanceID,
            category : req.query.category,
            player : req.query.player,
            session : req.query.session
        })
    });
});

const port = process.env.PORT || 7000;
app.listen(port);
logManager.write({category : 'server', event : 'server.listening', details : {port}});
console.log("Server ready.");