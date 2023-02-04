const {registerShutdownHandlers} = require('./app/shutdown');
const {waitBeforeServerClose} = require('./app/config');
const {startServer} = require('./app/server');

const shutdownHandler = registerShutdownHandlers({
    waitBeforeServerClose,
});

startServer({shutdownHandler});
