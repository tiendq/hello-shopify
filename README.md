# Hello Shopify

[![Build Status](https://travis-ci.com/Tiendq/hello-shopify.svg?branch=master)](https://travis-ci.com/Tiendq/hello-shopify)

Demo steps to build a Shopify public app, for more detail and documentation visit [Developer resources](https://help.shopify.com/api/getting-started).

1. Register a developer account
2. Create a development store
3. Create a public app
4. Install [ngrok](https://ngrok.com/download), Shopify will send requests to the app in your local machine then `ngrok` will help here.

5. Run
- `yarn start` to start app - Express server.
- `yarn proxy` to start `ngrok`
- Update your Shopify app (in Apps admin area) with `ngrok` HTTPS url.

Tien Do (tiendq@gmail.com)
