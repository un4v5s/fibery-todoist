const config = require(`./config`);
const ApiKeyAuthentication = {
    description: `Please provide notion authentication`,
    name: `Token`,
    id: `key`,
    fields: [
        {
            type: `password`,
            name: `Integration Token`,
            description: `Provide Notion API Integration Token`,
            id: `key`,
        },
        {
            type: `link`,
            value: `https://www.notion.so/help/create-integrations-with-the-notion-api`,
            description: `We need to have your Notion Integration Token to synchronize the data.`,
            id: `key-link`,
            name: `Read how to create integration, grant access and create token here...`,
        },
    ],
};
const OAuth2 = {
    id: 'oauth2',
    name: 'OAuth v2 Authentication',
    description: 'OAuth v2-based authentication and authorization for access to Notion',
    fields: [
        {
            title: 'callback_uri',
            description: 'OAuth post-auth redirect URI',
            type: 'oauth',
            id: 'callback_uri',
        },
    ],
};

const getAuthenticationStrategies = () => {
    return [OAuth2, ApiKeyAuthentication];
};

module.exports.connector = () => ({
    id: `notion-app`,
    name: `Notion`,
    version: config.version,
    website: `https://notion.com`,
    description: `More than a doc. Or a table. Customize Notion to work the way you do.`,
    authentication: getAuthenticationStrategies(),
    responsibleFor: {
        dataSynchronization: true,
    },
    sources: [],
});
