let router = require('express').Router();
let bodyParser = require('body-parser');
let { handleUninstalledEvent } = require('./shopify');

router.all('*', (request, response, next) => {
  response.set({
    'Access-Control-Allow-Origin': '*'
  });

  next();
});

router.post('/uninstall', bodyParser.text({ type: 'application/json' }), handleUninstalledEvent);

module.exports = router;
