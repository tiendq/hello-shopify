let debug = require('debug')('shopify');
let requestPromise = require('request-promise');
let qs = require('qs');
let crypto = require('crypto');

async function getAccessToken(shop, code, apiKey, apiSecret) {
  let url = `https://${shop}/admin/oauth/access_token`;
  let payload = {
    client_id: apiKey,
    client_secret: apiSecret,
    code
  };

  let options = {
    method: 'POST',
    uri: url,
    body: payload,
    json: true // Automatically stringifies the body to JSON
  };

  try {
    let response = await requestPromise(options);

    debug('Got access token: ', response);

    if (response.access_token)
      return response.access_token;
    else
      return '';
  } catch (error) {
    console.log(error);
    return '';
  }
}

async function requestShopInfo(shop, accessToken) {
  let url = `https://${shop}/admin/shop.json`;
  let headers = {
    'X-Shopify-Access-Token': accessToken,
  };

  let options = {
    method: 'GET',
    uri: url,
    headers: headers,
    json: true // Automatically stringifies the body to JSON
  };

  try {
    debug('Requesting shop information...');

    let info = await requestPromise(options);
    return info;
  } catch (error) {
    console.log(error);
    return {};
  }
}

function isHMACValid(secret, { hmac, shop, code, timestamp }) {
  let input = qs.stringify({ code, shop, timestamp });
  let generatedHash = crypto.createHmac('sha256', secret).update(input).digest('hex');

  return generatedHash !== hmac;
}

// eslint-disable-next-line no-unused-vars
function handleUninstalledEvent(request, response, next) {
  let topic = request.get('X-Shopify-Topic');
  let hmac = request.get('X-Shopify-Hmac-Sha256');
  let shop = request.get('X-Shopify-Shop-Domain');

  // Quickly acknowledge received event first and defer all further processing.
  setTimeout(processUninstalledEvent, 0, topic, hmac, shop, request.body);
  response.sendStatus(200);
}

function processUninstalledEvent(topic, hmac, shop, body) {
  debug(`Received ${topic} event from ${shop}`);

  if (!topic ||!hmac || !shop) {
    debug('Missing required header information');
    return false;
  }

  if (hmac !== getWebhookHMAC(process.env.SHOPIFY_API_SECRET, body)) {
    debug('HMAC is invalid');
    return false;
  }

  debug(`Hello Shopify has been removed from ${shop}`);
}

function getWebhookHMAC(secret, body) {
  let generatedHash = crypto.createHmac('sha256', secret).update(Buffer.from(body)).digest('base64');
  return generatedHash;
}

module.exports = {
  getAccessToken,
  requestShopInfo,
  isHMACValid,
  handleUninstalledEvent
}
