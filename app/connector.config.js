const config = require(`./config`);

const OAuth2 = {
  id: "oauth2",
  name: "OAuth v2 Authentication",
  description:
    "OAuth v2-based authentication and authorization for access to Todoist",
  fields: [
    {
      title: "callback_uri",
      description: "OAuth post-auth redirect URI",
      type: "oauth",
      id: "callback_uri",
    },
    {
      type: `text`,
      name: `Your Domain`,
      description: `Provide Your Fibery Account Domain`,
      id: "domain",
    },
    {
      type: `password`,
      name: `API Token`,
      description: `Provide Fibery API Token`,
      id: `api_key`,
    },
    {
      type: "link",
      id: "link",
      name: "Get API Token from below url.",
      value: "https://ooooo.fibery.io/api/tokens",
    },
  ],
};

const getAuthenticationStrategies = () => {
  return [OAuth2];
};

module.exports.connector = () => ({
  id: `todoist-app`,
  name: `Todoist`,
  version: config.version,
  website: `https://todoist.com`,
  description: `More than a doc. Or a table. Customize Todoist to work the way you do.`,
  authentication: getAuthenticationStrategies(),
  responsibleFor: {
    dataSynchronization: true,
  },
  sources: [],
});
