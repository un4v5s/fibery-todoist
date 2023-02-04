const config = require(`./config`);
const getMbSize = function (n) {
    return Math.round(n / 1024 / 1024) + ` Mb`;
};

module.exports = [
    (req, res) => {
        const memoryUsage = process.memoryUsage();
        res.json({
            id: process.pid || 0,
            version: config.version,
            memory: {
                rss: getMbSize(memoryUsage.rss),
                heapUsed: getMbSize(memoryUsage.heapUsed),
                heapTotal: getMbSize(memoryUsage.heapTotal),
            },
        });
    },
];
