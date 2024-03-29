const express = require(`express`);
const bodyParser = require(`body-parser`);
const statusRoute = require(`./status`);
const path = require(`path`);
const { connector } = require(`./connector.config`);
const _ = require(`lodash`);
const todoist = require(`./api/todoist.api`);
const got = require(`got`);
const morgan = require("morgan");
const oauth = require("./oauth");

const sendError = function (res, error) {
  const err = error.response || error;
  let code =
    err.status ||
    err.statusCode ||
    (_.isNumber(err.code) ? err.code : null) ||
    500;
  code = code > 300 ? code : 500;
  let message = err.message || err.error || `Something goes wrong...`;
  if (!_.isEmpty(err.errors)) {
    const first = _.first(err.errors);
    message = first.message || `Something goes wrong...`;
  }
  res.status(code);
  res.json({ code, message });
};

const promiseToResponse = (res, promise) => {
  promise
    .then((r) => res.json(r))
    .catch((err) => {
      sendError(res, err);
    });
};

module.exports = function () {
  const app = express();
  app.use(morgan("tiny"));
  app.use(bodyParser.json({ type: `*/*` }));
  app.use(express.static(path.join(__dirname, `public`)));
  // todoist.applyTodoistApiEndpoints(app);

  app.post(`/validate`, (req, res) =>
    promiseToResponse(
      res,
      todoist.validate(_.get(req, `body.fields`) || req.body)
    )
  );

  // root
  app.get(`/`, (req, res) => {
    res.json(connector());
  });
  app.get(`/logo`, (req, res) =>
    res.sendFile(path.resolve(__dirname, `logo.svg`))
  );

  // setup endpoints
  app.post(`/api/v1/synchronizer/config`, (req, res) => {
    console.log("/api/v1/synchronizer/config");
    // console.log("req: ", req.body);
    if (_.isEmpty(req.body.account)) {
      throw new Error(`account should be provided`);
    }

    // process
    promiseToResponse(res, todoist.config(req.body));
  });
  app.post(`/api/v1/synchronizer/schema`, (req, res) => {
    console.log("/api/v1/synchronizer/schema");
    // console.log("req: ", req.body);
    promiseToResponse(res, todoist.schema(req.body));
  });

  app.post(`/api/v1/synchronizer/datalist`, async (req, res) => {
    const timezones = await got.get("http://worldtimeapi.org/api/timezone").json();
    // console.log("timezones: ", timezones);
    // const items = timezones.map((row) => ({title: row, value: row}));

    const user = await todoist.getUser(req.body.account);
    console.log("user: ", user);
    const user_timezone = user.tz_info.timezone;
    const user_tz = {title: user_timezone + "(Todoist user timezone)", value: user_timezone};

    // timezones.default from timezones-list library
    const timezones_collection = timezones.map((e) => ({title: e, value: e}));
    const items = [user_tz, ...timezones_collection];

    // console.log("items: ", items);
    res.json({items})
  });


  // data endpoint
  app.post(`/api/v1/synchronizer/data`, (req, res) => {
    console.log("/api/v1/synchronizer/data");
    // promiseToResponse(res, notion.data(req.body))
    promiseToResponse(res, todoist.data(req.body));
  });

  // oauth2 endpoints
  app.post("/oauth2/v1/authorize", (req, res) => {
    console.log("POST /oauth2/v1/authorize req.body: ", req.body);
    try {
      const { callback_uri: callbackUri, state } = req.body;
      const redirectUri = oauth.getAuthorizeUrl(callbackUri, state);
      res.json({ redirect_uri: redirectUri });
    } catch (err) {
      res.status(401).json({ message: `Unauthorizeda` });
    }
  });
  app.post("/oauth2/v1/access_token", async (req, res) => {
    console.log("POST /oauth2/v1/access_token");
    try {
      const tokens = await oauth.getAccessToken(
        req.body.code,
        req.body.fields.callback_uri
      );
      res.json(tokens);
    } catch (err) {
      res.status(401).json({ message: "Unauthorizedb" });
    }
  });

  app.get(`/status`, statusRoute);
  return app;
};


