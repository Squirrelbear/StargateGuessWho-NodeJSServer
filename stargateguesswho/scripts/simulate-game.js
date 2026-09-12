const readline = require('readline');

const baseUrl = (process.env.SERVER_URL || 'http://localhost:7000').replace(/\/$/, '');
const roundsToPlay = Number.parseInt(process.env.ROUNDS || '0', 10);

const input = readline.createInterface({
    input : process.stdin,
    output : process.stdout
});

function waitForKeypress(message)
{
    if (!process.stdin.isTTY)
    {
        return new Promise(resolve => input.question(`${message} `, () => resolve()));
    }

    return new Promise(resolve => {
        process.stdout.write(`${message} `);
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.once('data', key => {
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdout.write('\n');

            if (key[0] === 3)
            {
                process.exit(0);
            }

            resolve();
        });
    });
}

async function request(action, parameters = {})
{
    const query = new URLSearchParams({action, ...parameters});
    const url = `${baseUrl}/?${query}`;
    console.log(`\nGET ${url}`);

    const response = await fetch(url);
    const body = await response.json();
    console.log(JSON.stringify(body, null, 2));

    if (!response.ok || body.error)
    {
        throw new Error(`Request failed: ${body.error || response.statusText}`);
    }

    return body;
}

async function createPlayer(playerName)
{
    return request('createPlayer', {playerName});
}

async function runRound(roundNumber, playerOne, playerTwo, sessionCode)
{
    console.log(`\n=== Round ${roundNumber} ===`);

    const actions = [
        {
            player : playerOne,
            characterAction : 'choose',
            characterID : 5,
            label : 'Alice chooses character 5'
        },
        {
            player : playerTwo,
            characterAction : 'choose',
            characterID : 9,
            label : 'Bob chooses character 9'
        },
        {
            player : playerOne,
            characterAction : 'setDown',
            characterID : 9,
            label : 'Alice sets character 9 down'
        },
        {
            player : playerTwo,
            characterAction : 'setUp',
            characterID : 5,
            label : 'Bob sets character 5 up'
        },
        {
            player : playerOne,
            characterAction : 'guess',
            characterID : 9,
            label : 'Alice guesses character 9'
        },
        {
            player : playerTwo,
            characterAction : 'guess',
            characterID : 5,
            label : 'Bob guesses character 5'
        }
    ];

    for (const action of actions)
    {
        await waitForKeypress(`Press Enter to ${action.label}...`);
        await request('characterCommand', {
            playerAuth : action.player.playerAuth,
            sessionCode,
            characterAction : action.characterAction,
            characterID : String(action.characterID)
        });
    }

    await waitForKeypress('Press Enter to read the completed round state...');
    await request('getState', {
        playerAuth : playerOne.playerAuth,
        sessionCode
    });
}

async function main()
{
    console.log(`Using server: ${baseUrl}`);
    console.log('This script pauses before every action. Press Ctrl+C to stop.');

    const playerOne = await createPlayer('Alice');
    const server = await request('createServer', {playerAuth : playerOne.playerAuth});
    const playerTwo = await createPlayer('Bob');
    await request('joinServer', {
        playerAuth : playerTwo.playerAuth,
        sessionCode : server.sessionCode
    });

    console.log(`\nPlayers are ready in session ${server.sessionCode}.`);
    await waitForKeypress('Press Enter to begin the first round...');

    let roundNumber = 1;
    while (roundsToPlay === 0 || roundNumber <= roundsToPlay)
    {
        await runRound(roundNumber, playerOne, playerTwo, server.sessionCode);
        roundNumber++;

        if (roundsToPlay !== 0 && roundNumber > roundsToPlay)
        {
            break;
        }

        await waitForKeypress('Press Enter to start the next round...');
        await request('startGame', {
            playerAuth : playerOne.playerAuth,
            sessionCode : server.sessionCode
        });
    }

    console.log('\nSimulation complete.');
}

main()
    .catch(error => {
        console.error(`\nSimulation stopped: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(() => input.close());
