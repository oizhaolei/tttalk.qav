var crypto = require('crypto');
var config = require('./config.js').config;
var volunteer = require('./dao/volunteer.js');
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

//volunteer
app.get('/volunteer/online', volunteer.online);
app.get('/volunteer/offline', volunteer.offline);
app.get('/volunteer/qav_request', volunteer.onlines);

app.get('/conversation', qav.conversation);

app.get('/charge', qav.charge);
app.get('/feedback', qav.feedback);
app.get('/feedbacks', qav.feedbacks);

var server = app.listen(config.app_port, function() {
  logger.debug('Listening on port %d', server.address().port);
});
