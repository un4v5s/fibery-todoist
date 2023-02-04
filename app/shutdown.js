const {promisify} = require('util');
const sleep = promisify(setTimeout);

function registerShutdownHandlers({waitBeforeServerClose}) {
    let server;
    let isShuttingDown = false;

    function createShutdownCallback(signal, exitCode = 0) {
        const logLevel = exitCode === 0 ? `info` : `error`;
        return async (error) => {
            if (isShuttingDown) {
                return;
            }
            isShuttingDown = true;

            console.log(logLevel, `Application exit by reason ${error}`);
            if (error && error.stack) {
                console.log(logLevel, `Application exist by reason (stack)`, error);
            }
            console.log(logLevel, `stop app due to ${signal}`);

            if (exitCode === 0) {
                await sleep(waitBeforeServerClose);
            }

            if (server) {
                try {
                    console.log(`closing server`);
                    await new Promise((resolve) => server.close(resolve));
                    console.log(`server is closed`);
                } catch (err) {
                    console.log(`unable to close server`, err);
                }
            }

            // eslint-disable-next-line no-process-exit
            process.exit(exitCode);
        };
    }

    process.on(`SIGTERM`, createShutdownCallback(`SIGTERM`, 0));
    process.on(`SIGINT`, createShutdownCallback(`SIGINT`, 0));
    process.on(`uncaughtException`, createShutdownCallback(`uncaughtException`, 1));
    process.on(`unhandledRejection`, createShutdownCallback(`unhandledRejection`, 1));

    return {
        setServer: (s) => {
            server = s;
        },
    };
}

module.exports = {
    registerShutdownHandlers,
};
