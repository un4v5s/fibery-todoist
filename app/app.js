const express = require(`express`);
const bodyParser = require(`body-parser`);
const statusRoute = require(`./status`);
const path = require(`path`);
const {connector} = require(`./connector.config`);
const _ = require(`lodash`);
const notion = require(`./notion.api`);
const morgan = require('morgan');
const oauth = require('./oauth');

const sendError = function (res, error) {
    const err = error.response || error;
    let code = err.status || err.statusCode || (_.isNumber(err.code) ? err.code : null) || 500;
    code = code > 300 ? code : 500;
    let message = err.message || err.error || `Something goes wrong...`;
    if (!_.isEmpty(err.errors)) {
        const first = _.first(err.errors);
        message = first.message || `Something goes wrong...`;
    }
    res.status(code);
    res.json({code, message});
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
    app.use(morgan('tiny'));
    app.use(bodyParser.json({type: `*/*`}));
    app.use(express.static(path.join(__dirname, `public`)));
    app.post(`/validate`, (req, res) =>
        promiseToResponse(res, notion.validate(_.get(req, `body.fields`) || req.body)),
    );
    app.get(`/`, (req, res) => res.json(connector()));
    app.get(`/logo`, (req, res) => res.sendFile(path.resolve(__dirname, `logo.svg`)));
    app.post(`/api/v1/synchronizer/config`, (req, res) => {
        if (_.isEmpty(req.body.account)) {
            throw new Error(`account should be provided`);
        }
        promiseToResponse(res, notion.config(req.body));
    });
    app.post(`/api/v1/synchronizer/schema`, (req, res) => promiseToResponse(res, notion.schema(req.body)));
    app.post(`/api/v1/synchronizer/data`, (req, res) => promiseToResponse(res, notion.data(req.body)));
    app.post('/oauth2/v1/authorize', (req, res) => {
        try {
            const {callback_uri: callbackUri, state} = req.body;
            const redirectUri = oauth.getAuthorizeUrl(callbackUri, state);
            res.json({redirect_uri: redirectUri});
        } catch (err) {
            res.status(401).json({message: `Unauthorized`});
        }
    });
    app.post('/oauth2/v1/access_token', async (req, res) => {
        try {
            const tokens = await oauth.getAccessToken(req.body.code, req.body.fields.callback_uri);
            res.json(tokens);
        } catch (err) {
            res.status(401).json({message: 'Unauthorized'});
        }
    });
    app.get(`/status`, statusRoute);
    return app;
};
