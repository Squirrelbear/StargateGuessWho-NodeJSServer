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
app.use(express.json());

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
    console.log("Admin dashboard accessed from " + req.ip);
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

app.post('/admin/api/actions/clear-logs', requireAdminToken, (req,res)=>{
    logManager.clearLogs();
    console.log("Admin requested to clear logs. Logs cleared.");
    res.json({success : true});
});

app.post('/admin/api/actions/kill-session', requireAdminToken, (req,res)=>{
    console.log("Admin requested to kill session with ID: " + req.body.sessionID);
    const sessionID = req.body && req.body.sessionID;
    if (sessionID === undefined || sessionID === '' || !Number.isInteger(Number(sessionID)))
    {
        console.log("Admin requested to kill session with invalid ID: " + sessionID);
        return res.status(400).json({error : 'A valid game ID is required.'});
    }

    const session = gameSessionManager.removeSessionByID(sessionID);
    if (!session)
    {
        console.log("Admin requested to kill session with ID: " + sessionID + " but no session was found.");
        return res.status(404).json({error : 'Game session not found.'});
    }

    console.log("Admin successfully killed session with ID: " + sessionID);
    res.json({success : true, sessionID : session.sessionID, sessionCode : session.sessionCode});
});

app.post('/admin/api/actions/kill-server', requireAdminToken, (req,res)=>{
    res.json({success : true});
    console.log("Admin requested server shutdown. Closing server...");
    setImmediate(() => server.close(() => process.exit(0)));
});

const port = process.env.PORT || 7000;
const server = app.listen(port);
logManager.write({category : 'server', event : 'server.listening', details : {port}});
console.log("Server ready. Listening on port " + port);
console.log("Admin dashboard available at /admin (requires ADMIN_TOKEN environment variable to be set).");
console.log("Admin token set to: " + (process.env.ADMIN_TOKEN || 'ERROR: NOT SET'));