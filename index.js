let express = require('express');
let session = require('express-session');
let cookieParser = require('cookie-parser');
let handlebars = require('express-handlebars');
let uuid = require('uuid/v1');
let dotenv = require('dotenv').config();
let debug = require('debug')('app');
let shopify = require('./shopify');

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const SHOPIFY_APP_SCOPES = 'read_products';
const NGROK_URL = 'https://0fbc3ece.ngrok.io';

let app = express();

app.engine('hbs', handlebars({
  defaultLayout: 'embed',
  extname: 'hbs'
}));

app.set('view engine', 'hbs');

app.use(cookieParser('cookiesecret'));

app.use(session({
  name: 'SID',
  secret: 'cookiesecret',
  cookie: {
    maxAge: 15 * 60 * 1000,
    secure: 'development' !== process.env.NODE_ENV
  },
  rolling: true,
  resave: true,
  saveUninitialized: true
}));

// Test install app NGROK_URL/shopify?shop=DEMO_SHOP
app.get('/shopify', async (request, response) => {
  // Check if app is installed, if app is installed then access token is temporarily
  // stored in session. Remove app from shop admin to install it again.
  if (request.session.accessToken) {
    debug('You are granted access to this shop with token: ' + request.session.accessToken);

    if (request.query.shop) {
      try {
        let info = await shopify.requestShopInfo(request.query.shop, request.session.accessToken);

        return response.render('home', {
          accessToken: request.session.accessToken,
          info: JSON.stringify(info)
        });
      } catch(error) {
        return response.sendStatus(500);
      }
    } else {
      return response.render('home', {
        accessToken: request.session.accessToken
      });
    }
  }

  if (!request.query.shop)
    return response.status(400).send('Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request.');

  debug('Received install request from ' + request.query.shop);

  let shop = request.query.shop;
  let state = uuid();
  let redirectUri = `${NGROK_URL}/approved-oauth`;
  let oauthUrl = `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${SHOPIFY_APP_SCOPES}&state=${state}&redirect_uri=${redirectUri}`;

  response.cookie('oauthState', state, {
    maxAge: 60000,
    httpOnly: true,
    secure: 'development' !== process.env.NODE_ENV,
    signed: true
  });

  response.render('escape-iframe', {
    layout: false,
    oauthUrl,
    shop
  });
});

app.get('/approved-oauth', async (request, response) => {
  let { shop, hmac, code, state, timestamp } = request.query;

  debug('Received OAuth request');

  if (state !== request.signedCookies.oauthState)
    return response.status(403).send('Request origin cannot be verified.');

  if (shop && hmac && code && timestamp) {
    if (!shopify.isHMACValid(SHOPIFY_API_SECRET, request.query))
      return response.status(400).send('HMAC validation failed.');

    // Exchange temporary code for a permanent access token.
    try {
      let accessToken = await shopify.getAccessToken(shop, code, SHOPIFY_API_KEY, SHOPIFY_API_SECRET)

      if (accessToken) {
        request.session.accessToken = accessToken;
        response.status(200).send(`Got an access token ${accessToken}, let's do something with it. Go to ${NGROK_URL}/shopify?shop=${shop} for more detail.`);
      } else {
        response.status(200).send('Access token not found');
      }
    } catch (error) {
      response.status(500).send(error);
    }
  } else {
    response.status(400).send('Required parameters missing.');
  }
});

app.listen(8000, () => {
  debug('Hello Shopify listening on port 8000...');
});
