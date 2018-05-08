let express = require('express');
let session = require('express-session');
let cookieParser = require('cookie-parser');
let handlebars = require('express-handlebars');
let crypto = require('crypto');
let qs = require('qs');
let requestPromise = require('request-promise');
let uuid = require('uuid/v1');
let dotenv = require('dotenv').config();

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const SHOPIFY_APP_SCOPES = 'read_products';
const NGROK_URL = 'https://7c80d85d.ngrok.io';

let app = express();

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

app.engine('hbs', handlebars({
  defaultLayout: 'embed',
  extname: 'hbs'
}));

app.set('view engine', 'hbs');

// Test install app NGROK_URL/shopify?shop=DEMO_SHOP
app.get('/shopify', (request, response) => {
  // Check if app is installed, if app is installed then access token is temporarily
  // stored in session. Remove app from shop admin to install it again.
  if (request.session.accessToken) {
    console.log(request.session.accessToken);

    if (request.query.shop) {
      return requestShopInfo(request.query.shop, request.session.accessToken)
        .then(info => {
          response.render('home', {
            accessToken: request.session.accessToken,
            info: JSON.stringify(info)
          });
        })
        .catch(error => {
          response.sendStatus(500);
        })
    } else {
      return response.render('home', {
        accessToken: request.session.accessToken
      });
    }
  }

  if (!request.query.shop)
    return response.status(400).send('Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request.');

  console.log('Received install request from ' + request.query.shop);

  let shop = request.query.shop,
    state = uuid(),
    redirectUri = `${NGROK_URL}/approved-oauth`,
    oauthUrl = `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${SHOPIFY_APP_SCOPES}&state=${state}&redirect_uri=${redirectUri}`;

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

app.get('/approved-oauth', (request, response) => {
  const { shop, hmac, code, state, timestamp } = request.query;

  console.log('Received OAuth request');

  if (state !== request.signedCookies.oauthState)
    return response.status(403).send('Request origin cannot be verified.');

  if (shop && hmac && code && timestamp) {
    if (!isHMACValid(SHOPIFY_API_SECRET, request.query))
      return response.status(400).send('HMAC validation failed.');

      // Exchange temporary code for a permanent access token.
      getAccessToken(shop, code, SHOPIFY_API_KEY, SHOPIFY_API_SECRET)
        .then(accessToken => {
          if (accessToken) {
            request.session.accessToken = accessToken;
            response.status(200).send(`Got an access token ${accessToken}, let's do something with it. Go to ${NGROK_URL}/shopify?shop=${shop} for more detail.`);
          }
          else
            response.status(200).send("Access token not found");
        })
        .catch(error => {
          response.status(500).send(error);
        });
  } else {
    response.status(400).send('Required parameters missing.');
  }
});

app.listen(8000, () => {
  console.log('Hello Shopify listening on port 8000.');
});

function isHMACValid(secret, { hmac, shop, code, timestamp }) {
  let input = qs.stringify({ code, shop, timestamp });
  let generatedHash = crypto.createHmac('sha256', secret).update(input).digest('hex');

  return generatedHash !== hmac;
}

async function getAccessToken(shop, code, apiKey, apiSecret) {
  let accessTokenRequestUrl = `https://${shop}/admin/oauth/access_token`;
  const accessTokenPayload = {
    client_id: apiKey,
    client_secret: apiSecret,
    code
  };

  let options = {
    method: 'POST',
    uri: accessTokenRequestUrl,
    body: accessTokenPayload,
    json: true // Automatically stringifies the body to JSON
  };

  try {
    let accessTokenResponse = await requestPromise(options);

    console.log('Access token: ', accessTokenResponse);

    if (accessTokenResponse.access_token)
      return accessTokenResponse.access_token;
    else
      return '';
  } catch (error) {
    console.log(error);
    return '';
  }
}

async function requestShopInfo(shop, accessToken) {
  const shopRequestUrl = 'https://' + shop + '/admin/shop.json';
  const shopRequestHeaders = {
    'X-Shopify-Access-Token': accessToken,
  };

  let options = {
    method: 'GET',
    uri: shopRequestUrl,
    headers: shopRequestHeaders,
    json: true // Automatically stringifies the body to JSON
  };

  try {
    let info = await requestPromise(options);
    console.log(info);
    return info;
  } catch (error) {
    console.log(error);
    return {};
  }
}
