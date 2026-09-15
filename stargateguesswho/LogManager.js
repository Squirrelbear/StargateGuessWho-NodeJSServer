const fs = require('fs');
const path = require('path');

class LogManager
{
    constructor(logDirectory = process.env.LOG_DIR || path.join(__dirname, 'logs'))
    {
        this.logDirectory = logDirectory;
        fs.mkdirSync(this.logDirectory, {recursive : true});

        this.instanceID = `${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`;
        this.logFile = path.join(this.logDirectory, `${this.instanceID}.jsonl`);
        this.write({category : 'server', event : 'server.started', details : {processID : process.pid}});
    }

    write(event)
    {
        const entry = {
            timestamp : new Date().toISOString(),
            instanceID : this.instanceID,
            ...event
        };

        fs.appendFileSync(this.logFile, `${JSON.stringify(entry)}\n`, 'utf8');
        return entry;
    }

    getInstances()
    {
        return fs.readdirSync(this.logDirectory)
            .filter(file => file.endsWith('.jsonl'))
            .map(file => {
                const instanceID = file.slice(0, -'.jsonl'.length);
                const filePath = path.join(this.logDirectory, file);
                const stats = fs.statSync(filePath);
                return {instanceID, startedAt : this.getFirstTimestamp(filePath), updatedAt : stats.mtime.toISOString()};
            })
            .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
    }

    getFirstTimestamp(filePath)
    {
        const firstLine = fs.readFileSync(filePath, 'utf8').split('\n').find(line => line.trim());
        if (!firstLine)
        {
            return new Date(fs.statSync(filePath).birthtimeMs).toISOString();
        }
        return JSON.parse(firstLine).timestamp;
    }

    getLogs(filters = {})
    {
        const instanceID = filters.instanceID || this.instanceID;
        const safeInstanceID = path.basename(instanceID);
        const filePath = path.join(this.logDirectory, `${safeInstanceID}.jsonl`);
        if (safeInstanceID !== instanceID || !fs.existsSync(filePath))
        {
            return [];
        }

        return fs.readFileSync(filePath, 'utf8')
            .split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line))
            .filter(entry => !filters.category || entry.category === filters.category)
            .filter(entry => !filters.player || entry.playerName === filters.player || entry.playerID === filters.player)
            .filter(entry => !filters.session || entry.sessionCode === filters.session || String(entry.sessionID) === filters.session)
            .reverse();
    }

    clearLogs()
    {
        fs.readdirSync(this.logDirectory)
            .filter(file => file.endsWith('.jsonl'))
            .forEach(file => fs.unlinkSync(path.join(this.logDirectory, file)));
    }
}

module.exports = LogManager;