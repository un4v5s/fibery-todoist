module.exports = {
    env(key, defaultValue) {
        return process.env[key] || defaultValue;
    },
    envInt(key, defaultValue = 0) {
        const value = parseInt(process.env[key], 10);
        // eslint-disable-next-line no-restricted-globals
        return isNaN(value) ? defaultValue : value;
    },
    envRequired(key) {
        const value = process.env[key];
        if (!value) {
            throw new Error(`Environment variable ${key} required, but not provided`);
        }
        return value;
    },
};
