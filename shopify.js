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

module.exports = {
  getAccessToken,
  requestShopInfo,
  isHMACValid
}
