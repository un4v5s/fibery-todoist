const app = require(`./app`);
const config = require(`./config`);

module.exports = {
    startServer({shutdownHandler}) {
        const server = app().listen(config.port(), (err) => {
            if (err) {
                return console.log(err.message);
            }
        });
        shutdownHandler.setServer(server);
    },
};
