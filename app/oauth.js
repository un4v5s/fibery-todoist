const got = require(`got`);
const CLIENT_ID = process.env.ENV_CLIENT_ID;
const CLIENT_SECRET = process.env.ENV_CLIENT_SECRET;

module.exports = {
    getAuthorizeUrl: (callbackUri, state) => {
        const queryParams = {
            state,
            redirect_uri: callbackUri,
            response_type: 'code',
            client_id: CLIENT_ID,
            owner: `user`,
        };
        const queryParamsStr = Object.keys(queryParams)
            .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
            .join(`&`);
        return `https://api.notion.com/v1/oauth/authorize?${queryParamsStr}`;
    },
    getAccessToken: async (code, callbackUri) => {
        const tokens = await got.post(`https://api.notion.com/v1/oauth/token`, {
            resolveBodyOnly: true,
            headers: {
                "Authorization": `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
            },
            json: {
                code,
                redirect_uri: callbackUri,
                grant_type: `authorization_code`,
            },
        }).json();
        return {access_token: tokens.access_token};
    },
};
