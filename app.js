var crypto = require('crypto');
var config = require('./config.js').config;
var user = require('./dao/user.js');
var qav = require('./dao/qav.js');
var logger = require('log4js').getLogger('app');

var express = require('express');
var bodyParser = require('body-parser');

var app = express();

app.use(bodyParser.urlencoded({
  extended : true
}));
app.use(bodyParser.json());

app.all('/', function(req, res) {
  res.json({});
});

app.get('/online', user.online);
app.get('/offline', user.offline);
app.get('/onlines', user.onlines);
app.get('/conversation', qav.conversation);
app.get('/charge', qav.charge);

var server = app.listen(config.app_port, function() {
  logger.debug('Listening on port %d', server.address().port);
});