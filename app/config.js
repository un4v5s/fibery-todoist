require(`dotenv`).config();
const { envInt } = require(`./getEnvVariable`);

const config = {
  version: require(`../package`).version,
  port: () => envInt(`PORT`, 8080),
  waitBeforeServerClose: envInt(`WAIT_BEFORE_SERVER_CLOSE`, 0) * 1000,
};

module.exports = config;
