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
app.get('/volunteer/qav_request', volunteer.qavRequest);

app.get('/conversation/begin', qav.beginConversation);
app.get('/conversation/end', qav.endConversation);
app.get('/conversations/:id', qav.conversation);
app.get('/conversations', qav.conversations);

app.get('/charge/begin', qav.beginCharge);
app.get('/charge/end', qav.endCharge);
app.get('/charge/update', qav.updateCharge);
app.get('/charge/confirm', qav.confirmCharge);

app.get('/conversation/user_feedback', qav.user_feedback);
app.get('/conversation/translator_feedback', qav.translator_feedback);
app.get('/feedbacks', qav.feedbacks);

var server = app.listen(config.app_port, function() {
  logger.debug('Listening on port %d', server.address().port);
});
